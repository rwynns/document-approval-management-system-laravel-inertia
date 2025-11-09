# Google OAuth Setup Guide

Panduan ini akan membantu Anda mengonfigurasi Google OAuth untuk sistem login dengan akun Google.

## Prerequisites

- Laravel Socialite sudah diinstall (✅ Sudah dilakukan)
- User model sudah memiliki field `google_id`, `google_token`, dan `google_refresh_token` (✅ Sudah ada)

## 1. Google Cloud Console Setup

### Langkah 1: Buka Google Cloud Console

1. Kunjungi [Google Cloud Console](https://console.cloud.google.com/)
2. Login dengan akun Google Anda

### Langkah 2: Buat atau Pilih Project

1. Buat project baru atau pilih project yang sudah ada
2. Catat nama project Anda

### Langkah 3: Enable Google+ API

1. Di sidebar, klik "APIs & Services" > "Library"
2. Cari "Google+ API" dan enable
3. Atau cari "Google Identity" dan enable "Google Identity Services API"

### Langkah 4: Buat OAuth 2.0 Credentials

1. Di sidebar, klik "APIs & Services" > "Credentials"
2. Klik "Create Credentials" > "OAuth 2.0 Client IDs"
3. Jika diminta, konfigurasi OAuth consent screen terlebih dahulu:
    - Pilih "External" untuk testing
    - Isi nama aplikasi, email support, dan developer contact
    - Tambahkan scope: `email`, `profile`, `openid`
    - Tambahkan test users jika diperlukan

### Langkah 5: Konfigurasi OAuth Client

1. Pilih Application type: "Web application"
2. Beri nama yang sesuai (contoh: "Document Approval System")
3. **Authorized JavaScript origins:**
    - `http://localhost:8000` (untuk development)
    - `https://yourdomain.com` (untuk production)
4. **Authorized redirect URIs:**
    - `http://localhost:8000/auth/google/callback` (untuk development)
    - `https://yourdomain.com/auth/google/callback` (untuk production)
5. Klik "Create"

### Langkah 6: Simpan Credentials

1. Copy **Client ID** dan **Client Secret**
2. Simpan dengan aman

## 2. Laravel Configuration

### Langkah 1: Update .env File

Tambahkan konfigurasi berikut ke file `.env` Anda:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_from_google_console
GOOGLE_CLIENT_SECRET=your_client_secret_from_google_console
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

**Penting:**

- Ganti `your_client_id_from_google_console` dengan Client ID dari Google Console
- Ganti `your_client_secret_from_google_console` dengan Client Secret dari Google Console
- Sesuaikan URL redirect dengan domain Anda

### Langkah 2: Clear Config Cache

Jalankan command berikut untuk clear cache konfigurasi:

```bash
php artisan config:clear
php artisan cache:clear
```

## 3. Testing

### Langkah 1: Jalankan Server

```bash
php artisan serve
```

### Langkah 2: Test Login

1. Buka browser dan kunjungi `http://localhost:8000/login`
2. Klik tombol "Login with Google"
3. Akan diredirect ke Google untuk otorisasi
4. Setelah berhasil, akan kembali ke aplikasi dan login otomatis

## 4. Cara Kerja System

### Flow Login Google OAuth:

1. User klik "Login with Google" → redirect ke `/auth/google`
2. System redirect ke Google OAuth dengan credentials
3. User authorize di Google
4. Google redirect kembali ke `/auth/google/callback` dengan auth code
5. System exchange auth code untuk access token dan user data
6. System cek apakah user sudah ada:
    - **Jika ada user dengan google_id sama:** Update token dan login
    - **Jika ada user dengan email sama:** Link Google account dan login
    - **Jika user belum ada:** Buat user baru dan login
7. Redirect ke dashboard sesuai role user

### Database Changes:

- Field `google_id` menyimpan unique Google user ID
- Field `google_token` menyimpan access token dari Google
- Field `google_refresh_token` menyimpan refresh token untuk perpanjang akses

## 5. Security Notes

### Penting untuk Production:

1. **NEVER** commit file `.env` ke Git
2. Gunakan HTTPS untuk production
3. Update authorized origins dan redirect URIs di Google Console untuk production domain
4. Consider menggunakan environment variables untuk deployment
5. Regularly rotate Google Client Secret

### User Management:

- User yang login dengan Google pertama kali akan otomatis dibuat
- Mereka akan mendapat password random (tidak bisa login dengan password)
- Jika user sudah ada dengan email sama, Google account akan di-link
- User bisa login dengan Google atau email/password (jika punya password)

## 6. Troubleshooting

### Error "redirect_uri_mismatch":

- Pastikan redirect URI di Google Console sama persis dengan yang di `.env`
- Cek tidak ada trailing slash atau typo
- Pastikan protokol (http/https) sesuai

### Error "invalid_client":

- Cek Client ID dan Client Secret di `.env`
- Pastikan Google+ API atau Google Identity API sudah di-enable
- Clear config cache: `php artisan config:clear`

### User tidak ter-redirect setelah login:

- Cek apakah user memiliki role di table `users_auth`
- Cek routes untuk dashboard sesuai role sudah ada
- Lihat log error di `storage/logs/laravel.log`

## 7. Next Steps

Setelah Google OAuth berhasil, Anda bisa:

1. Tambahkan provider OAuth lain (Facebook, GitHub, dll)
2. Implementasi logout yang proper untuk Google sessions
3. Tambahkan profile management untuk Google users
4. Setup email verification untuk user Google (opsional)

## Files yang Dimodifikasi:

✅ `composer.json` - Added Laravel Socialite
✅ `config/services.php` - Added Google OAuth config
✅ `routes/auth.php` - Added Google OAuth routes
✅ `app/Http/Controllers/Auth/AuthenticatedSessionController.php` - Added Google OAuth methods
✅ `resources/js/components/inertia-login-form.tsx` - Added Google login button
✅ `.env.example` - Added Google OAuth environment variables

Semua implementasi sudah selesai! Tinggal setup Google Cloud Console dan update file `.env` dengan credentials yang benar.
