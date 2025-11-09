<?php

// Quick debug script untuk cek role
// Jalankan dengan: php debug_roles.php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\UserRole;
use App\Models\UsersAuth;
use App\Models\User;

echo "=== DEBUGGING ROLES ===\n\n";

// 1. Cek roles yang ada
echo "1. Available Roles:\n";
$roles = UserRole::all();
if ($roles->count() === 0) {
    echo "   ❌ No roles found in database!\n";
    echo "   Creating User role...\n";
    UserRole::create(['role_name' => 'User']);
    echo "   ✅ User role created\n";
} else {
    foreach ($roles as $role) {
        echo "   - ID: {$role->id}, Name: {$role->role_name}\n";
    }
}

// 2. Cek role "User" specifically
echo "\n2. User Role Check:\n";
$userRole = UserRole::where('role_name', 'User')->first();
if ($userRole) {
    echo "   ✅ User role found - ID: {$userRole->id}\n";
} else {
    echo "   ❌ User role not found\n";
    echo "   Creating User role...\n";
    $userRole = UserRole::create(['role_name' => 'User']);
    echo "   ✅ User role created - ID: {$userRole->id}\n";
}

// 3. Cek users dengan Google ID
echo "\n3. Google Users:\n";
$googleUsers = User::whereNotNull('google_id')->get();
if ($googleUsers->count() === 0) {
    echo "   No Google users found\n";
} else {
    foreach ($googleUsers as $user) {
        echo "   - User: {$user->name} ({$user->email})\n";
        echo "     Google ID: {$user->google_id}\n";
        echo "     Roles: {$user->userAuths->count()}\n";

        foreach ($user->userAuths as $auth) {
            echo "       * Role: {$auth->role->role_name} (ID: {$auth->role_id})\n";
        }

        if ($user->userAuths->count() === 0) {
            echo "     ⚠️  No roles assigned!\n";

            if ($userRole) {
                // Get default company, jabatan, aplikasi
                $defaultCompany = \App\Models\Company::first();
                $defaultJabatan = \App\Models\Jabatan::first();
                $defaultAplikasi = \App\Models\Aplikasi::first();

                if (!$defaultCompany || !$defaultJabatan || !$defaultAplikasi) {
                    echo "     ❌ Missing required default data:\n";
                    echo "        Company: " . ($defaultCompany ? "✅" : "❌") . "\n";
                    echo "        Jabatan: " . ($defaultJabatan ? "✅" : "❌") . "\n";
                    echo "        Aplikasi: " . ($defaultAplikasi ? "✅" : "❌") . "\n";
                } else {
                    echo "     Assigning User role with defaults...\n";
                    UsersAuth::create([
                        'user_id' => $user->id,
                        'role_id' => $userRole->id,
                        'company_id' => $defaultCompany->id,
                        'jabatan_id' => $defaultJabatan->id,
                        'aplikasi_id' => $defaultAplikasi->id,
                    ]);
                    echo "     ✅ User role assigned\n";
                }
            }
        }
    }
}

echo "\n=== DEBUG COMPLETE ===\n";
