<?php

namespace App\Http\Controllers;

use App\Models\DokumenApproval;
use App\Models\Dokumen;
use App\Services\PdfSignatureService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class DokumenApprovalController extends Controller
{
    /**
     * Display a listing of approvals for current user.
     */
    public function index(Request $request)
    {
        $query = DokumenApproval::with([
            'dokumen.user',
            'dokumen.latestVersion',
            'masterflowStep.jabatan',
            'dokumenVersion'
        ])
            ->byUser(Auth::id())
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }

        // Filter overdue
        if ($request->filled('overdue') && $request->overdue) {
            $query->overdue();
        }

        // Search by document title
        if ($request->filled('search')) {
            $query->whereHas('dokumen', function ($q) use ($request) {
                $q->where('judul_dokumen', 'like', '%' . $request->search . '%');
            });
        }

        $approvals = $query->paginate(15)->withQueryString();

        // Get statistics
        $stats = [
            'pending' => DokumenApproval::byUser(Auth::id())->pending()->count(),
            'approved' => DokumenApproval::byUser(Auth::id())->approved()->count(),
            'rejected' => DokumenApproval::byUser(Auth::id())->rejected()->count(),
            'overdue' => DokumenApproval::byUser(Auth::id())->overdue()->count(),
        ];

        return Inertia::render('approvals/index', [
            'approvals' => $approvals,
            'stats' => $stats,
            'filters' => $request->only(['status', 'overdue', 'search']),
        ]);
    }

    /**
     * Display the specified approval.
     */
    public function show(DokumenApproval $approval)
    {
        // Ensure user can access this approval
        if ($approval->user_id !== Auth::id()) {
            abort(403, 'Anda tidak memiliki akses ke approval ini.');
        }

        $approval->load([
            'dokumen.user.profile',
            'dokumen.masterflow.steps.jabatan',
            'dokumen.comments.user',
            'dokumenVersion',
            'masterflowStep.jabatan',
        ]);

        // Get all approvals for this document to show workflow progress
        $allApprovals = DokumenApproval::where('dokumen_id', $approval->dokumen_id)
            ->with(['user.profile', 'masterflowStep.jabatan'])
            ->orderBy('masterflow_step_id')
            ->get();

        return Inertia::render('approvals/show', [
            'approval' => $approval,
            'allApprovals' => $allApprovals,
            'canApprove' => $approval->isPending(),
        ]);
    }

    /**
     * Approve the document.
     */
    public function approve(Request $request, DokumenApproval $approval, PdfSignatureService $pdfSignatureService)
    {
        // Ensure user can approve this
        if ($approval->user_id !== Auth::id() || !$approval->isPending()) {
            return back()->withErrors(['error' => 'Anda tidak dapat melakukan approval ini.']);
        }

        // Load dokumen_version if not already loaded
        if (!$approval->relationLoaded('dokumenVersion')) {
            $approval->load('dokumenVersion');
        }

        $validated = $request->validate([
            'comment' => 'nullable|string|max:1000',
            'signature' => 'required|string',
            'signature_position' => 'nullable|string|in:bottom_right,bottom_left,bottom_center',
        ]);

        DB::beginTransaction();
        try {
            // Handle signature storage
            $signaturePath = null;
            $signatureData = $validated['signature'];

            if (str_starts_with($signatureData, 'data:image')) {
                // New manual signature - decode and save
                $image = str_replace('data:image/png;base64,', '', $signatureData);
                $image = str_replace(' ', '+', $image);
                $imageData = base64_decode($image);

                $filename = 'approval_signature_' . time() . '_' . \Illuminate\Support\Str::random(10) . '.png';
                $path = 'signatures/approvals/' . $approval->id . '/' . $filename;

                \Illuminate\Support\Facades\Storage::disk('public')->put($path, $imageData);
                $signaturePath = $path;
            } elseif (str_starts_with($signatureData, 'http') || str_starts_with($signatureData, '/storage')) {
                // Existing signature URL - extract path
                $signaturePath = str_replace('/storage/', '', parse_url($signatureData, PHP_URL_PATH));
            }

            // Approve this approval with signature
            $approval->update([
                'approval_status' => 'approved',
                'tgl_approve' => now(),
                'comment' => $validated['comment'],
                'signature_path' => $signaturePath,
            ]);

            // Add signature to PDF document
            Log::info('Checking if signature should be embedded', [
                'signature_path' => $signaturePath,
                'has_dokumen_version' => !is_null($approval->dokumenVersion),
                'dokumen_version' => $approval->dokumenVersion,
            ]);

            if ($signaturePath && $approval->dokumenVersion) {
                try {
                    $originalPdfPath = $approval->dokumenVersion->file_url;
                    Log::info('Starting PDF signature embedding', [
                        'original_pdf' => $originalPdfPath,
                        'signature_path' => $signaturePath,
                        'approval_id' => $approval->id
                    ]);

                    // Get all approved signatures for this document
                    $allApprovedApprovals = DokumenApproval::where('dokumen_id', $approval->dokumen_id)
                        ->where('approval_status', 'approved')
                        ->whereNotNull('signature_path')
                        ->with(['user', 'masterflowStep'])
                        ->get();

                    // Prepare signatures array
                    $signatures = [];
                    foreach ($allApprovedApprovals as $approvedApproval) {
                        $signatures[] = [
                            'path' => $approvedApproval->signature_path,
                            'name' => $approvedApproval->user->name ?? '',
                            'text' => $approvedApproval->masterflowStep?->step_name ?? 'Approved',
                            'date' => $approvedApproval->tgl_approve?->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i'),
                        ];
                    }

                    Log::info('Signatures prepared for PDF', [
                        'count' => count($signatures),
                        'signatures' => $signatures
                    ]);

                    // Add all signatures to PDF
                    $signedPdfPath = $pdfSignatureService->addMultipleSignaturesToPdf(
                        $originalPdfPath,
                        $signatures
                    );

                    Log::info('PDF signature embedding completed', [
                        'signed_pdf_path' => $signedPdfPath
                    ]);

                    // Update dokumen version with signed PDF path (keep original file_url intact)
                    $approval->dokumenVersion->update([
                        'signed_file_url' => $signedPdfPath,
                    ]);

                    Log::info('Updated dokumen version with signed PDF');
                } catch (\Exception $e) {
                    // Log error but don't fail the approval
                    Log::error('Failed to add signature to PDF: ' . $e->getMessage(), [
                        'exception' => $e,
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            }

            // Add comment if provided
            if ($validated['comment']) {
                \App\Models\Comment::create([
                    'dokumen_id' => $approval->dokumen_id,
                    'content' => 'Approved: ' . $validated['comment'],
                    'user_id' => Auth::id(),
                    'created_at_custom' => now(),
                ]);
            }

            // Check if all approvals are complete
            $this->checkAndUpdateDocumentStatus($approval->dokumen);

            DB::commit();

            return redirect()->route('approvals.index')
                ->with('success', 'Dokumen berhasil di-approve dan ditandatangani!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal melakukan approval: ' . $e->getMessage()]);
        }
    }

    /**
     * Reject the document.
     */
    public function reject(Request $request, DokumenApproval $approval)
    {
        // Ensure user can reject this
        if ($approval->user_id !== Auth::id() || !$approval->isPending()) {
            return back()->withErrors(['error' => 'Anda tidak dapat melakukan rejection ini.']);
        }

        $validated = $request->validate([
            'alasan_reject' => 'required|string|max:1000',
            'comment' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            // Reject this approval
            $approval->reject($validated['alasan_reject'], $validated['comment']);

            // Update document status to rejected
            $approval->dokumen->update([
                'status' => 'rejected',
                'status_current' => 'rejected',
            ]);

            // Add comment
            \App\Models\Comment::create([
                'dokumen_id' => $approval->dokumen_id,
                'content' => 'Rejected: ' . $validated['alasan_reject'],
                'user_id' => Auth::id(),
                'created_at_custom' => now(),
            ]);

            DB::commit();

            return redirect()->route('approvals.index')
                ->with('success', 'Dokumen berhasil di-reject!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal melakukan rejection: ' . $e->getMessage()]);
        }
    }

    /**
     * Skip approval (if allowed).
     */
    public function skip(Request $request, DokumenApproval $approval)
    {
        // Ensure user can skip this and step is not required
        if (
            $approval->user_id !== Auth::id() ||
            !$approval->isPending() ||
            $approval->masterflowStep->is_required
        ) {
            return back()->withErrors(['error' => 'Approval ini tidak dapat di-skip.']);
        }

        $validated = $request->validate([
            'comment' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            // Skip this approval
            $approval->update([
                'approval_status' => 'skipped',
                'tgl_approve' => now(),
                'comment' => $validated['comment'],
            ]);

            // Add comment if provided
            if ($validated['comment']) {
                \App\Models\Comment::create([
                    'dokumen_id' => $approval->dokumen_id,
                    'content' => 'Skipped: ' . $validated['comment'],
                    'user_id' => Auth::id(),
                    'created_at_custom' => now(),
                ]);
            }

            // Check if all approvals are complete
            $this->checkAndUpdateDocumentStatus($approval->dokumen);

            DB::commit();

            return redirect()->route('approval.index')
                ->with('success', 'Approval berhasil di-skip!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal melakukan skip: ' . $e->getMessage()]);
        }
    }

    /**
     * Delegate approval to another user.
     */
    public function delegate(Request $request, DokumenApproval $approval)
    {
        // Ensure user can delegate this
        if ($approval->user_id !== Auth::id() || !$approval->isPending()) {
            return back()->withErrors(['error' => 'Anda tidak dapat mendelegasikan approval ini.']);
        }

        $validated = $request->validate([
            'delegate_to' => 'required|exists:users,id',
            'comment' => 'nullable|string|max:1000',
        ]);

        // Ensure delegate target has same jabatan
        $targetUser = \App\Models\User::with('profile')->find($validated['delegate_to']);
        if (
            !$targetUser ||
            $targetUser->profile->jabatan_id !== $approval->masterflowStep->jabatan_id
        ) {
            return back()->withErrors(['error' => 'User yang dipilih tidak memiliki jabatan yang sesuai.']);
        }

        DB::beginTransaction();
        try {
            // Update approval user
            $approval->update([
                'user_id' => $validated['delegate_to'],
            ]);

            // Add comment about delegation
            \App\Models\Comment::create([
                'dokumen_id' => $approval->dokumen_id,
                'content' => 'Approval didelegasikan kepada ' . $targetUser->name .
                    ($validated['comment'] ? ': ' . $validated['comment'] : ''),
                'user_id' => Auth::id(),
                'created_at_custom' => now(),
            ]);

            DB::commit();

            return redirect()->route('approval.index')
                ->with('success', 'Approval berhasil didelegasikan!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal mendelegasikan approval: ' . $e->getMessage()]);
        }
    }

    /**
     * Get approval history for a document.
     */
    public function history(Dokumen $dokumen)
    {
        $approvals = DokumenApproval::where('dokumen_id', $dokumen->id)
            ->with([
                'user.profile',
                'masterflowStep.jabatan',
                'dokumenVersion'
            ])
            ->orderBy('created_at')
            ->get();

        return Inertia::render('DokumenApproval/History', [
            'dokumen' => $dokumen->load(['user', 'masterflow']),
            'approvals' => $approvals,
        ]);
    }

    /**
     * Dashboard for approval statistics.
     */
    public function dashboard()
    {
        $userId = Auth::id();

        // Get statistics
        $stats = [
            'pending' => DokumenApproval::byUser($userId)->pending()->count(),
            'approved_today' => DokumenApproval::byUser($userId)
                ->approved()
                ->whereDate('tgl_approve', today())
                ->count(),
            'overdue' => DokumenApproval::byUser($userId)->overdue()->count(),
            'this_week' => DokumenApproval::byUser($userId)
                ->where('created_at', '>=', now()->startOfWeek())
                ->count(),
        ];

        // Get recent approvals
        $recentApprovals = DokumenApproval::byUser($userId)
            ->with(['dokumen.user', 'masterflowStep.jabatan'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Get overdue approvals
        $overdueApprovals = DokumenApproval::byUser($userId)
            ->overdue()
            ->with(['dokumen.user', 'masterflowStep.jabatan'])
            ->orderBy('tgl_deadline')
            ->limit(5)
            ->get();

        return Inertia::render('DokumenApproval/Dashboard', [
            'stats' => $stats,
            'recentApprovals' => $recentApprovals,
            'overdueApprovals' => $overdueApprovals,
        ]);
    }

    /**
     * Check and update document status based on approvals.
     */
    private function checkAndUpdateDocumentStatus(Dokumen $dokumen)
    {
        $allApprovals = $dokumen->approvals;

        // Check if any approval is rejected
        if ($allApprovals->contains('approval_status', 'rejected')) {
            $dokumen->update([
                'status' => 'rejected',
                'status_current' => 'rejected',
            ]);
            return;
        }

        // Check if all required approvals are complete
        $requiredApprovals = $allApprovals->filter(function ($approval) {
            return $approval->masterflowStep->is_required;
        });

        $completedRequired = $requiredApprovals->filter(function ($approval) {
            return in_array($approval->approval_status, ['approved', 'skipped']);
        });

        if ($requiredApprovals->count() === $completedRequired->count()) {
            // All required approvals are complete
            $dokumen->update([
                'status' => 'approved',
                'status_current' => 'fully_approved',
            ]);
        } else {
            // Still waiting for approvals
            $dokumen->update([
                'status' => 'under_review',
                'status_current' => 'waiting_approval',
            ]);
        }
    }
}
