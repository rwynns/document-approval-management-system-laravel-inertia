<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Masterflow;
use App\Models\UsersAuth;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UserDashboardController extends Controller
{
    /**
     * Display the user dashboard.
     */
    public function index()
    {
        $user = Auth::user();

        // Load related data
        $userAuths = UsersAuth::where('user_id', $user->id)->with(['role', 'company', 'jabatan'])->get();
        $userProfile = $user->profile;

        // Get user's primary role name
        $roleName = 'User';
        $companyName = 'No Company Assigned';
        $jabatanName = 'No Position Assigned';

        if ($userAuths && $userAuths->count() > 0) {
            $primaryAuth = $userAuths->first();

            if ($primaryAuth->role) {
                $roleName = $primaryAuth->role->role_name;
            }

            if ($primaryAuth->company) {
                $companyName = $primaryAuth->company->name;
            }

            if ($primaryAuth->jabatan) {
                $jabatanName = $primaryAuth->jabatan->name;
            }
        }

        // Get available masterflows for user's company
        $availableMasterflows = collect();
        if ($userAuths && $userAuths->count() > 0) {
            $companyId = $userAuths->first()->company_id;
            if ($companyId) {
                $availableMasterflows = Masterflow::where('company_id', $companyId)
                    ->where('is_active', true)
                    ->with(['steps.jabatan', 'company'])
                    ->orderBy('name')
                    ->get();
            }
        }

        // Mock data for documents statistics - replace with actual document model when available
        $dashboardData = [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $roleName,
                'company' => $companyName,
                'jabatan' => $jabatanName,
                'profile' => $userProfile ? [
                    'phone' => $userProfile->no_hp,
                    'address' => $userProfile->alamat,
                ] : null
            ],
            'statistics' => [
                'pending_documents' => 5, // TODO: Replace with actual document count
                'approved_documents' => 18,
                'total_submitted' => 23,
                'rejected_documents' => 0
            ],
            'recent_documents' => [
                [
                    'id' => 1,
                    'name' => 'Laporan Keuangan Bulanan',
                    'status' => 'pending',
                    'submitted_at' => '2025-01-15',
                    'category' => 'Keuangan',
                    'size' => '2.4 MB'
                ],
                [
                    'id' => 2,
                    'name' => 'Proposal Kegiatan Q1',
                    'status' => 'approved',
                    'submitted_at' => '2025-01-14',
                    'category' => 'Operasional',
                    'size' => '1.8 MB'
                ],
                [
                    'id' => 3,
                    'name' => 'Dokumentasi Sistem',
                    'status' => 'pending',
                    'submitted_at' => '2025-01-13',
                    'category' => 'Teknis',
                    'size' => '3.2 MB'
                ]
            ],
            'available_masterflows' => $availableMasterflows->take(5)->map(function ($masterflow) {
                return [
                    'id' => $masterflow->id,
                    'name' => $masterflow->name,
                    'description' => $masterflow->description,
                    'steps_count' => $masterflow->steps ? $masterflow->steps->count() : 0,
                    'company' => $masterflow->company ? $masterflow->company->name : null
                ];
            })
        ];

        // Debug logging
        Log::info('UserDashboard Data:', [
            'user_id' => $user->id,
            'company_name' => $companyName,
            'jabatan_name' => $jabatanName,
            'user_data' => $dashboardData['user']
        ]);

        return Inertia::render('user/dashboard', $dashboardData);
    }

    /**
     * Get user dashboard statistics.
     */
    public function getStatistics()
    {
        $user = Auth::user();

        // TODO: Replace with actual document model queries when Document model is available
        // For now, return mock data that varies based on user
        $baseCount = $user->id * 3; // Simple variation based on user ID

        $statistics = [
            'pending_documents' => max(1, $baseCount % 8),
            'approved_documents' => max(5, ($baseCount * 2) % 25),
            'rejected_documents' => max(0, $baseCount % 3),
            'total_submitted' => 0 // Will be calculated below
        ];

        $statistics['total_submitted'] = $statistics['pending_documents'] +
            $statistics['approved_documents'] +
            $statistics['rejected_documents'];

        return response()->json($statistics);
    }

    /**
     * Get user's recent documents.
     */
    public function getRecentDocuments()
    {
        $user = Auth::user();

        // TODO: Replace with actual Document model query when available
        // For now, generate dynamic mock data based on user
        $statuses = ['pending', 'approved', 'rejected'];
        $categories = ['Keuangan', 'Operasional', 'Teknis', 'Administrasi', 'Pemasaran'];
        $priorities = ['high', 'medium', 'low'];

        $documentNames = [
            'Laporan Keuangan Bulanan',
            'Proposal Kegiatan Q1',
            'Dokumentasi Sistem',
            'Rencana Anggaran',
            'Laporan Progress',
            'Surat Permohonan',
            'Analisis Market',
            'Evaluasi Kinerja'
        ];

        $recentDocuments = [];

        for ($i = 1; $i <= 5; $i++) {
            $recentDocuments[] = [
                'id' => $user->id * 10 + $i,
                'name' => $documentNames[($user->id + $i - 1) % count($documentNames)],
                'status' => $statuses[($user->id + $i) % count($statuses)],
                'submitted_at' => now()->subDays($i)->format('Y-m-d'),
                'category' => $categories[($user->id + $i) % count($categories)],
                'size' => number_format(rand(100, 500) / 100, 1) . ' MB',
                'priority' => $priorities[$i % count($priorities)]
            ];
        }

        return response()->json($recentDocuments);
    }

    /**
     * Get user's available masterflows for document submission.
     */
    public function getMasterflows()
    {
        $user = Auth::user();

        // Get user's company ID
        $userAuths = UsersAuth::where('user_id', $user->id)->with(['company'])->get();
        $availableMasterflows = collect();

        if ($userAuths && $userAuths->count() > 0) {
            $companyId = $userAuths->first()->company_id;
            if ($companyId) {
                $availableMasterflows = Masterflow::where('company_id', $companyId)
                    ->where('is_active', true)
                    ->with(['steps.jabatan', 'company'])
                    ->orderBy('name')
                    ->get();
            }
        }

        return response()->json([
            'masterflows' => $availableMasterflows->map(function ($masterflow) {
                return [
                    'id' => $masterflow->id,
                    'name' => $masterflow->name,
                    'description' => $masterflow->description,
                    'steps_count' => $masterflow->steps ? $masterflow->steps->count() : 0,
                    'company' => $masterflow->company ? $masterflow->company->name : null,
                    'is_active' => $masterflow->is_active
                ];
            })
        ]);
    }
}
