# Fix: Google OAuth Role Assignment Issue

## Problem

User yang login melalui Google OAuth mendapat error:

```
403 - No role assigned to user.
```

Penyebab: Data hanya masuk ke tabel `users`, tidak ada entry di tabel `usersauth`.

## Root Cause

Tabel `usersauth` memiliki foreign key constraints yang NOT NULL:

- `company_id` → Required, tidak boleh NULL
- `jabatan_id` → Required, tidak boleh NULL
- `aplikasi_id` → Required, tidak boleh NULL

Code sebelumnya mencoba insert dengan nilai NULL, sehingga gagal.

## Solution Applied

### 1. Updated Controller Logic

File: `app/Http/Controllers/Auth/AuthenticatedSessionController.php`

**Added imports:**

```php
use App\Models\Company;
use App\Models\Jabatan;
use App\Models\Aplikasi;
```

**Updated new user creation:**

```php
// Get default values since they're required
$defaultCompany = Company::first();
$defaultJabatan = Jabatan::first();
$defaultAplikasi = Aplikasi::first();

if ($defaultCompany && $defaultJabatan && $defaultAplikasi) {
    $userAuth = UsersAuth::create([
        'user_id' => $user->id,
        'role_id' => $userRole->id,
        'company_id' => $defaultCompany->id,
        'jabatan_id' => $defaultJabatan->id,
        'aplikasi_id' => $defaultAplikasi->id,
    ]);
}
```

**Updated existing user role assignment:**

```php
// Same logic untuk existing user yang belum punya role
if ($user->userAuths->count() === 0) {
    // Assign role dengan default values
}
```

### 2. Enhanced Error Handling & Logging

- Added detailed logging untuk debugging
- Added validation sebelum login
- Added fallback jika role "User" tidak ada (auto-create)
- Added refresh user data sebelum redirect

### 3. Database Requirements

**Required default data:**

- Minimal 1 Company di tabel `companies`
- Minimal 1 Jabatan di tabel `jabatans`
- Minimal 1 Aplikasi di tabel `aplikasis`
- Role "User" di tabel `usersroles`

## Testing

1. ✅ Role "User" exists in database
2. ✅ Default company, jabatan, aplikasi exists
3. ✅ Google user created with proper role assignment
4. ✅ No more 403 errors

## Database State After Fix

```sql
-- Table: users
| id | name          | email                           | google_id           |
|----|---------------|---------------------------------|---------------------|
| 2  | Erwin Saputro | a710210033@student.ums.ac.id    | 100672207397142950419 |

-- Table: usersauth
| id | user_id | role_id | company_id | jabatan_id | aplikasi_id |
|----|---------|---------|------------|------------|-------------|
| 1  | 2       | 3       | 1          | 1          | 1           |

-- Result: User has role "User" and can access dashboard
```

## Next Steps

Admin dapat mengubah role, company, jabatan user sesuai kebutuhan melalui admin panel.

## Files Modified

- `app/Http/Controllers/Auth/AuthenticatedSessionController.php`
- Added debug script: `debug_roles.php`

## Test Command

```bash
php debug_roles.php
```

Hasil:

- ✅ All roles available
- ✅ Google users have proper role assignment
- ✅ Ready for login without 403 errors
