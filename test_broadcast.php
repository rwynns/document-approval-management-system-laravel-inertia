<?php

// Test manual broadcasting untuk debugging
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Dokumen;
use App\Events\UserDokumenUpdated;

echo "🧪 Testing Laravel Reverb Broadcasting\n";
echo "=====================================\n\n";

// Ambil dokumen pertama
$dokumen = Dokumen::with([
    'user',
    'company',
    'aplikasi',
    'masterflow.steps.jabatan',
    'versions',
    'approvals.user.profile',
    'approvals.masterflowStep.jabatan',
])->first();

if (!$dokumen) {
    echo "❌ No dokumen found in database!\n";
    exit(1);
}

echo "📄 Found dokumen:\n";
echo "   ID: {$dokumen->id}\n";
echo "   Judul: {$dokumen->judul_dokumen}\n";
echo "   User ID: {$dokumen->user_id}\n";
echo "   User: {$dokumen->user->name}\n\n";

echo "📡 Broadcasting UserDokumenUpdated event...\n";
echo "   Channel: user.{$dokumen->user_id}.dokumen\n";
echo "   Event: dokumen.updated\n\n";

try {
    broadcast(new UserDokumenUpdated($dokumen));
    echo "✅ Event broadcasted successfully!\n\n";

    echo "📋 Next steps:\n";
    echo "   1. Open browser console for user ID {$dokumen->user_id}\n";
    echo "   2. Navigate to /dokumen page\n";
    echo "   3. Check if toast notification appears\n";
    echo "   4. Check Reverb server console for broadcast log\n\n";

    echo "Expected in browser console:\n";
    echo "   📡 Real-time dokumen update received: {...}\n";
    echo "   📡 Dokumen \"{$dokumen->judul_dokumen}\" telah diupdate!\n";
} catch (Exception $e) {
    echo "❌ Broadcasting failed!\n";
    echo "Error: {$e->getMessage()}\n";
    echo "Trace: {$e->getTraceAsString()}\n";
    exit(1);
}

echo "\n✅ Test completed!\n";
