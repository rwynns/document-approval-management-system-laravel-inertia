<?php

// Helper functions untuk debug role management
// Simpan di app/Helpers/RoleHelper.php atau gunakan di tinker

class RoleHelper
{

    /**
     * Cek semua roles dari user
     */
    public static function checkUserRoles($userId)
    {
        $user = User::with(['userAuths.role', 'userAuths.company', 'userAuths.jabatan'])->find($userId);

        if (!$user) {
            echo "User dengan ID {$userId} tidak ditemukan\n";
            return;
        }

        echo "=== ROLES untuk {$user->name} ({$user->email}) ===\n";

        if ($user->userAuths->count() === 0) {
            echo "❌ User tidak memiliki role apapun\n";
            return;
        }

        foreach ($user->userAuths as $auth) {
            echo "✅ Role: " . $auth->role->role_name . "\n";
            echo "   Company: " . ($auth->company->name ?? 'Tidak ada') . "\n";
            echo "   Jabatan: " . ($auth->jabatan->name ?? 'Tidak ada') . "\n";
            echo "   Aplikasi ID: " . ($auth->aplikasi_id ?? 'Tidak ada') . "\n";
            echo "   ---\n";
        }
    }

    /**
     * Cek semua roles yang tersedia
     */
    public static function listAllRoles()
    {
        $roles = UserRole::all();

        echo "=== SEMUA ROLES DI SISTEM ===\n";
        foreach ($roles as $role) {
            echo "ID: {$role->id} | Name: {$role->role_name}\n";
        }
    }

    /**
     * Assign role ke user
     */
    public static function assignRole($userId, $roleName, $companyId = null, $jabatanId = null, $aplikasiId = null)
    {
        $user = User::find($userId);
        $role = UserRole::where('role_name', $roleName)->first();

        if (!$user) {
            echo "❌ User dengan ID {$userId} tidak ditemukan\n";
            return;
        }

        if (!$role) {
            echo "❌ Role '{$roleName}' tidak ditemukan\n";
            return;
        }

        // Cek apakah sudah ada role yang sama
        $existingAuth = UsersAuth::where('user_id', $userId)
            ->where('role_id', $role->id)
            ->where('company_id', $companyId)
            ->first();

        if ($existingAuth) {
            echo "⚠️ User sudah memiliki role '{$roleName}' di company yang sama\n";
            return;
        }

        UsersAuth::create([
            'user_id' => $userId,
            'role_id' => $role->id,
            'company_id' => $companyId,
            'jabatan_id' => $jabatanId,
            'aplikasi_id' => $aplikasiId,
        ]);

        echo "✅ Role '{$roleName}' berhasil di-assign ke user {$user->name}\n";
    }

    /**
     * Remove role dari user
     */
    public static function removeRole($userId, $roleName, $companyId = null)
    {
        $user = User::find($userId);
        $role = UserRole::where('role_name', $roleName)->first();

        if (!$user || !$role) {
            echo "❌ User atau role tidak ditemukan\n";
            return;
        }

        $deleted = UsersAuth::where('user_id', $userId)
            ->where('role_id', $role->id)
            ->where('company_id', $companyId)
            ->delete();

        if ($deleted) {
            echo "✅ Role '{$roleName}' berhasil dihapus dari user {$user->name}\n";
        } else {
            echo "❌ Role tidak ditemukan untuk dihapus\n";
        }
    }
}

// Cara pakai di tinker:
// RoleHelper::listAllRoles();
// RoleHelper::checkUserRoles(1);
// RoleHelper::assignRole(1, 'Admin', 1, 1, 1);
// RoleHelper::removeRole(1, 'User');