<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use App\Models\DokumenVersion;
use App\Models\DokumenApproval;
use App\Models\Masterflow;
use App\Models\Comment;
use App\Events\ApprovalCreated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class DokumenController extends Controller
{
    /**
     * API: Get list of documents (returns JSON).
     */
    public function apiIndex(Request $request)
    {
        $query = Dokumen::with(['user', 'masterflow', 'latestVersion', 'approvals.user'])
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }

        // Filter by current status
        if ($request->filled('status_current')) {
            $query->byCurrentStatus($request->status_current);
        }

        // Filter by user (for my documents)
        if ($request->filled('my_documents')) {
            $query->byUser(Auth::id());
        }

        // Search by title or description
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('judul_dokumen', 'like', '%' . $request->search . '%')
                    ->orWhere('deskripsi', 'like', '%' . $request->search . '%');
            });
        }

        $dokumen = $query->get();

        return response()->json([
            'data' => $dokumen,
            'success' => true,
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Dokumen::with(['user', 'masterflow', 'latestVersion', 'approvals.user'])
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }

        // Filter by current status
        if ($request->filled('status_current')) {
            $query->byCurrentStatus($request->status_current);
        }

        // Filter by user (for my documents)
        if ($request->filled('my_documents')) {
            $query->byUser(Auth::id());
        }

        // Search by title or description
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('judul_dokumen', 'like', '%' . $request->search . '%')
                    ->orWhere('deskripsi', 'like', '%' . $request->search . '%');
            });
        }

        $dokumen = $query->get();

        return response()->json([
            'data' => $dokumen,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $masterflows = Masterflow::where('is_active', true)->get();

        return Inertia::render('Dokumen/Create', [
            'masterflows' => $masterflows,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Get user's company and aplikasi from first user_auth
        $userAuth = Auth::user()->userAuths->first();
        if (!$userAuth) {
            return back()->withErrors(['error' => 'User tidak memiliki akses ke company atau aplikasi.']);
        }

        // Determine validation rules based on masterflow_id
        $rules = [
            'nomor_dokumen' => 'required|string|unique:dokumen,nomor_dokumen',
            'judul_dokumen' => 'required|string|max:255',
            'tgl_pengajuan' => 'required|date',
            'tgl_deadline' => 'required|date|after_or_equal:tgl_pengajuan',
            'deskripsi' => 'nullable|string',
            'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx|max:10240', // 10MB
            'submit_type' => 'required|in:draft,submit', // Validate submit type
        ];

        // Check if custom approval or existing masterflow
        if ($request->masterflow_id === 'custom') {
            $rules['custom_approvers'] = 'required|array|min:1';
            $rules['custom_approvers.*.email'] = 'required|email';
            $rules['custom_approvers.*.order'] = 'required|integer|min:1';
        } else {
            $rules['masterflow_id'] = 'required|exists:masterflows,id';
            // Accept both single approvers and group approvers
            $rules['approvers'] = 'nullable|array';
            $rules['approvers.*'] = 'nullable|exists:users,id';
            $rules['step_approvers'] = 'nullable|array';
            $rules['step_approvers.*.jenis_group'] = 'required|in:all_required,any_one,majority';
            $rules['step_approvers.*.user_ids'] = 'required|array|min:1';
            $rules['step_approvers.*.user_ids.*'] = 'required|exists:users,id';
        }

        $validated = $request->validate($rules);

        DB::beginTransaction();
        try {
            // Determine initial status based on submit_type
            $submitType = $validated['submit_type'];
            $status = $submitType === 'draft' ? 'draft' : 'submitted';
            $statusCurrent = $submitType === 'draft' ? 'draft' : 'waiting_approval_1';

            // Create document
            $dokumen = Dokumen::create([
                'nomor_dokumen' => $validated['nomor_dokumen'],
                'judul_dokumen' => $validated['judul_dokumen'],
                'user_id' => Auth::id(),
                'company_id' => $userAuth->company_id,
                'aplikasi_id' => $userAuth->aplikasi_id,
                'masterflow_id' => $request->masterflow_id === 'custom' ? null : $validated['masterflow_id'],
                'status' => $status,
                'tgl_pengajuan' => $validated['tgl_pengajuan'],
                'tgl_deadline' => $validated['tgl_deadline'],
                'deskripsi' => $validated['deskripsi'] ?? null,
                'status_current' => $statusCurrent,
            ]);

            // Store file and create first version
            if ($request->hasFile('file')) {
                $file = $request->file('file');

                // Create folder for this document based on nomor_dokumen
                $folderPath = 'dokumen/' . $validated['nomor_dokumen'];

                // Clean up judul for filename (remove special characters)
                $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $validated['judul_dokumen']);
                $cleanJudul = preg_replace('/_+/', '_', $cleanJudul); // Replace multiple underscores with single

                // Create filename: nomor_dokumen_judul_dokumen_v1.ext
                $extension = $file->getClientOriginalExtension();
                $filename = $validated['nomor_dokumen'] . '_' . $cleanJudul . '_v1.' . $extension;

                // Store file in document-specific folder
                $path = $file->storeAs($folderPath, $filename, 'public');

                $version = DokumenVersion::create([
                    'dokumen_id' => $dokumen->id,
                    'version' => '1.0',
                    'nama_file' => $file->getClientOriginalName(),
                    'tgl_upload' => now(),
                    'tipe_file' => $extension,
                    'file_url' => $path,
                    'size_file' => $file->getSize(),
                    'status' => 'active',
                ]);

                // Create approval records based on masterflow type
                if ($request->masterflow_id === 'custom') {
                    // Custom approval flow
                    foreach ($validated['custom_approvers'] as $approver) {
                        DokumenApproval::create([
                            'dokumen_id' => $dokumen->id,
                            'approver_email' => $approver['email'],
                            'approval_order' => $approver['order'],
                            'dokumen_version_id' => $version->id,
                            'approval_status' => 'pending',
                            'tgl_deadline' => $validated['tgl_deadline'],
                        ]);
                    }
                } else {
                    // Existing masterflow - create approvals from selected approvers
                    $masterflow = Masterflow::with('steps')->find($validated['masterflow_id']);

                    Log::info('Processing masterflow steps', [
                        'masterflow_id' => $masterflow->id,
                        'steps_count' => $masterflow->steps->count(),
                        'has_step_approvers' => $request->has('step_approvers'),
                        'step_approvers_keys' => $request->has('step_approvers') ? array_keys($request->input('step_approvers', [])) : [],
                    ]);

                    foreach ($masterflow->steps as $step) {
                        // Check if user selected group approval for this step
                        if ($request->has("step_approvers.{$step->id}")) {
                            $stepApprover = $request->input("step_approvers.{$step->id}");
                            $groupIndex = 'user_selected_' . $dokumen->id . '_' . $step->id;

                            Log::info('Creating group approval', [
                                'step_id' => $step->id,
                                'group_index' => $groupIndex,
                                'jenis_group' => $stepApprover['jenis_group'],
                                'user_ids' => $stepApprover['user_ids'],
                            ]);

                            // Create approval records for all selected users in the group
                            foreach ($stepApprover['user_ids'] as $userId) {
                                $approval = DokumenApproval::create([
                                    'dokumen_id' => $dokumen->id,
                                    'user_id' => $userId,
                                    'masterflow_step_id' => $step->id,
                                    'dokumen_version_id' => $version->id,
                                    'approval_status' => 'pending',
                                    'tgl_deadline' => $validated['tgl_deadline'],
                                    'group_index' => $groupIndex,
                                    'jenis_group' => $stepApprover['jenis_group'],
                                ]);

                                // Broadcast new approval event
                                Log::info('Broadcasting ApprovalCreated event', [
                                    'approval_id' => $approval->id,
                                    'user_id' => $userId,
                                    'dokumen_id' => $dokumen->id,
                                ]);
                                broadcast(new ApprovalCreated($approval))->toOthers();
                            }
                        } else {
                            // Single approver selected by user
                            if (isset($validated['approvers'][$step->id])) {
                                Log::info('Creating single approval', [
                                    'step_id' => $step->id,
                                    'user_id' => $validated['approvers'][$step->id],
                                ]);

                                $approval = DokumenApproval::create([
                                    'dokumen_id' => $dokumen->id,
                                    'user_id' => $validated['approvers'][$step->id],
                                    'masterflow_step_id' => $step->id,
                                    'dokumen_version_id' => $version->id,
                                    'approval_status' => 'pending',
                                    'tgl_deadline' => $validated['tgl_deadline'],
                                ]);

                                // Broadcast new approval event
                                Log::info('Broadcasting ApprovalCreated event', [
                                    'approval_id' => $approval->id,
                                    'user_id' => $validated['approvers'][$step->id],
                                    'dokumen_id' => $dokumen->id,
                                ]);
                                broadcast(new ApprovalCreated($approval))->toOthers();
                            }
                        }
                    }
                }
            }

            DB::commit();

            $message = $submitType === 'draft'
                ? 'Dokumen berhasil disimpan sebagai draft!'
                : 'Dokumen berhasil disubmit untuk approval!';

            // Return redirect back with success message (Inertia compatible)
            return back()->with([
                'success' => $message,
                'dokumen' => $dokumen->load(['user', 'masterflow', 'latestVersion', 'approvals.user']),
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error creating dokumen: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return back()->withErrors([
                'error' => 'Gagal membuat dokumen: ' . $e->getMessage(),
            ])->withInput();
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Dokumen $dokumen)
    {
        // Debug log
        Log::info('Show dokumen', [
            'dokumen_id' => $dokumen->id,
            'request_path' => $request->path(),
            'request_url' => $request->fullUrl(),
            'expects_json' => $request->expectsJson(),
        ]);

        $dokumen->load([
            'user',
            'company',
            'aplikasi',
            'masterflow.steps.jabatan',
            'versions' => function ($query) {
                $query->orderBy('created_at', 'desc');
            },
            'approvals' => function ($query) {
                $query->with(['user', 'masterflowStep.jabatan']);
            },
        ]);

        Log::info('Loaded dokumen data', [
            'dokumen' => $dokumen->toArray()
        ]);

        // If API request (AJAX/Fetch), return JSON
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json($dokumen);
        }

        // Return Inertia view
        return Inertia::render('dokumen/show', [
            'dokumen' => $dokumen,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Dokumen $dokumen)
    {
        // Only allow edit if document is draft or rejected
        if (!in_array($dokumen->status, ['draft', 'rejected'])) {
            return redirect()->route('dokumen.show', $dokumen->id)
                ->withErrors(['error' => 'Dokumen tidak dapat diedit dalam status ini.']);
        }

        $masterflows = Masterflow::where('is_active', true)->get();

        return Inertia::render('Dokumen/Edit', [
            'dokumen' => $dokumen,
            'masterflows' => $masterflows,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Dokumen $dokumen)
    {
        // Only allow update if document is draft or rejected
        if (!in_array($dokumen->status, ['draft', 'rejected'])) {
            return redirect()->route('dokumen.show', $dokumen->id)
                ->withErrors(['error' => 'Dokumen tidak dapat diupdate dalam status ini.']);
        }

        $validated = $request->validate([
            'judul_dokumen' => 'required|string|max:255',
            'tgl_deadline' => 'nullable|date',
            'deskripsi' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx|max:10240',
        ]);

        DB::beginTransaction();
        try {
            // Update dokumen
            $dokumen->update([
                'judul_dokumen' => $validated['judul_dokumen'],
                'tgl_deadline' => $validated['tgl_deadline'] ?? $dokumen->tgl_deadline,
                'deskripsi' => $validated['deskripsi'] ?? $dokumen->deskripsi,
            ]);

            // If new file uploaded, create new version
            if ($request->hasFile('file')) {
                $file = $request->file('file');

                // Use same folder as original document
                $folderPath = 'dokumen/' . $dokumen->nomor_dokumen;

                // Clean up judul for filename
                $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $dokumen->judul_dokumen);
                $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);

                // Get latest version number and increment
                $latestVersion = $dokumen->versions()->latest()->first();
                $versionParts = explode('.', $latestVersion->version);
                $newVersion = $versionParts[0] . '.' . ((int)$versionParts[1] + 1);

                // Create filename: nomor_dokumen_judul_dokumen_v{version}.ext
                $extension = $file->getClientOriginalExtension();
                $versionNumber = str_replace('.', '', $newVersion); // 1.0 -> 10, 1.1 -> 11
                $filename = $dokumen->nomor_dokumen . '_' . $cleanJudul . '_v' . $versionNumber . '.' . $extension;

                // Store file in document-specific folder
                $path = $file->storeAs($folderPath, $filename, 'public');

                // Set old versions to inactive
                $dokumen->versions()->update(['status' => 'inactive']);

                // Create new version
                DokumenVersion::create([
                    'dokumen_id' => $dokumen->id,
                    'version' => $newVersion,
                    'nama_file' => $file->getClientOriginalName(),
                    'tgl_upload' => now(),
                    'tipe_file' => $extension,
                    'file_url' => $path,
                    'size_file' => $file->getSize(),
                    'status' => 'active',
                ]);
            }

            DB::commit();

            return redirect()->back()
                ->with('success', 'Dokumen berhasil diupdate!');
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error updating dokumen: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Gagal mengupdate dokumen: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Dokumen $dokumen)
    {
        // Only allow delete if document is draft
        if ($dokumen->status !== 'draft') {
            return back()->withErrors(['error' => 'Hanya dokumen draft yang dapat dihapus.']);
        }

        // Delete associated files
        foreach ($dokumen->versions as $version) {
            if (Storage::disk('public')->exists($version->file_url)) {
                Storage::disk('public')->delete($version->file_url);
            }
        }

        $dokumen->delete();

        return redirect()->route('dokumen.index')
            ->with('success', 'Dokumen berhasil dihapus!');
    }

    /**
     * Submit document for approval.
     */
    public function submit(Dokumen $dokumen)
    {
        if ($dokumen->status !== 'draft') {
            return back()->withErrors(['error' => 'Hanya dokumen draft yang dapat diajukan.']);
        }

        DB::beginTransaction();
        try {
            // Delete old approvals if any (in case of resubmit)
            $dokumen->approvals()->delete();

            // Update document status
            $dokumen->update([
                'status' => 'submitted',
                'status_current' => 'waiting_approval',
            ]);

            // Create approval workflow
            $this->createApprovalWorkflow($dokumen);

            DB::commit();

            return redirect()->route('dokumen.show', $dokumen->id)
                ->with('success', 'Dokumen berhasil diajukan untuk approval!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal mengajukan dokumen: ' . $e->getMessage()]);
        }
    }

    /**
     * Create approval workflow for document.
     */
    private function createApprovalWorkflow(Dokumen $dokumen)
    {
        $masterflow = $dokumen->masterflow;
        $latestVersion = $dokumen->latestVersion;

        foreach ($masterflow->steps as $step) {
            // Find first user with required jabatan for this step
            $user = \App\Models\User::whereHas('userAuths', function ($query) use ($step) {
                $query->where('jabatan_id', $step->jabatan_id);
            })->first();

            if ($user) {
                DokumenApproval::create([
                    'dokumen_id' => $dokumen->id,
                    'user_id' => $user->id,
                    'dokumen_version_id' => $latestVersion->id,
                    'masterflow_step_id' => $step->id,
                    'approval_status' => 'pending',
                    'tgl_deadline' => now()->addDays(3), // 3 days deadline
                ]);
            }
        }
    }

    /**
     * Cancel document submission.
     */
    public function cancel(Dokumen $dokumen)
    {
        if (!in_array($dokumen->status, ['submitted', 'under_review'])) {
            return back()->withErrors(['error' => 'Dokumen tidak dapat dibatalkan dalam status ini.']);
        }

        DB::beginTransaction();
        try {
            // Update document status back to draft
            $dokumen->update([
                'status' => 'draft',
                'status_current' => 'draft',
            ]);

            // Delete pending approvals
            $dokumen->approvals()->where('approval_status', 'pending')->delete();

            DB::commit();

            return redirect()->route('dokumen.show', $dokumen->id)
                ->with('success', 'Pengajuan dokumen berhasil dibatalkan!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal membatalkan pengajuan: ' . $e->getMessage()]);
        }
    }

    /**
     * Download document file.
     */
    public function download(Dokumen $dokumen, $versionId = null)
    {
        $version = $versionId
            ? $dokumen->versions()->findOrFail($versionId)
            : $dokumen->latestVersion;

        if (!$version || !Storage::disk('public')->exists($version->file_url)) {
            return back()->withErrors(['error' => 'File tidak ditemukan.']);
        }

        $filePath = Storage::disk('public')->path($version->file_url);
        return response()->download($filePath, $version->nama_file);
    }
}
