# Default Admin Accounts

Setelah menjalankan seeder, sistem akan memiliki akun admin default berikut:

## Super Administrator

- **Email**: `superadmin@example.com`
- **Password**: `password123`
- **PIN**: `12345678`
- **Role**: Super Admin
- **Jabatan**: Super Administrator
- **Company**: PT. Document Management System
- **Aplikasi**: Document Approval System

## Administrator

- **Email**: `admin@example.com`
- **Password**: `password123`
- **PIN**: `87654321`
- **Role**: Admin
- **Jabatan**: Administrator
- **Company**: PT. Document Management System
- **Aplikasi**: Document Approval System

## Data Master yang Dibuat

### Roles (usersroles)

1. Super Admin
2. Admin
3. User

### Companies (companies)

1. PT. Document Management System

### Jabatans (jabatans)

1. Super Administrator
2. Administrator
3. Manager
4. Staff

### Aplikasis (aplikasis)

1. Document Approval System

## Cara Deploy

Untuk deploy dengan data admin:

```bash
php artisan migrate:fresh --seed
```

## Keamanan

⚠️ **PENTING**: Ubah password default setelah deploy ke production!

## Struktur Data

Setiap admin memiliki data lengkap di semua tabel:

- `users` - Data dasar login
- `usersprofiles` - Profil lengkap
- `usersauth` - Mapping ke role, company, jabatan, dan aplikasi
