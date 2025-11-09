# Google OAuth Role Assignment Fix

## Problem

User yang baru dibuat melalui Google OAuth tidak memiliki role, sehingga mendapat error:

```
403 - No role assigned to user.
```

## Solution

Updated `AuthenticatedSessionController::handleGoogleCallback()` method untuk:

### 1. User Baru (Create New User)

- Otomatis assign role "User" ke user baru yang register via Google
- Membuat entry di tabel `usersauth` dengan role_id untuk role "User"

### 2. User Existing (Link Google Account)

- Cek apakah user yang sudah ada memiliki role
- Jika belum ada role, otomatis assign role "User"

## Code Changes

### Import Models

```php
use App\Models\UserRole;
use App\Models\UsersAuth;
```

### Logic untuk User Baru

```php
// Create new user
$user = User::create([...]);

// Assign default "User" role to new user
$userRole = UserRole::where('role_name', 'User')->first();
if ($userRole) {
    UsersAuth::create([
        'user_id' => $user->id,
        'role_id' => $userRole->id,
        'company_id' => null, // Will be assigned later by admin if needed
        'jabatan_id' => null, // Will be assigned later by admin if needed
        'aplikasi_id' => null, // Will be assigned later by admin if needed
    ]);
}
```

### Logic untuk User Existing

```php
// Link Google account to existing user
$user->update([...]);

// Check if user has any role, if not assign default "User" role
if ($user->userAuths->count() === 0) {
    $userRole = UserRole::where('role_name', 'User')->first();
    if ($userRole) {
        UsersAuth::create([
            'user_id' => $user->id,
            'role_id' => $userRole->id,
            'company_id' => null,
            'jabatan_id' => null,
            'aplikasi_id' => null,
        ]);
    }
}
```

## Database Structure

- **usersroles**: Menyimpan daftar role (Super Admin, Admin, User)
- **usersauth**: Menghubungkan user dengan role, company, jabatan, dan aplikasi

## Expected Behavior

1. User baru yang login via Google → Otomatis mendapat role "User"
2. User existing yang link Google → Cek role, jika tidak ada assign role "User"
3. Setelah dapat role → Redirect ke dashboard sesuai role (user.dashboard)

## Test Steps

1. Hapus user dari database (jika ada)
2. Login dengan Google
3. User baru dibuat dengan role "User"
4. Redirect ke `route('user.dashboard')` tanpa error 403

## Notes

- Role "User" harus sudah ada di database (dari seeder `UsersRolesSeeder`)
- Fields company_id, jabatan_id, aplikasi_id di-set null (bisa diatur admin nanti)
- Logging ditambahkan untuk debugging
