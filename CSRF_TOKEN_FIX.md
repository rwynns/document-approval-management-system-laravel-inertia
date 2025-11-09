# CSRF Token Mismatch Fix - User Management

## 🐛 Problem

Ketika mencoba membuat user baru di halaman **User Management** (Super Admin), muncul error:

```
419 - CSRF Token Mismatch
```

Error ini terjadi terutama ketika:

- Memasukkan PIN yang sudah ada sebelumnya
- Session sudah cukup lama (idle)
- CSRF token tidak ter-refresh sebelum submit form

## ✅ Solution Implemented

### 1. **Force Refresh CSRF Token Before Submit**

Di `user-management.tsx`, function `handleSubmit` sekarang:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
        // ✨ FORCE REFRESH CSRF TOKEN BEFORE SUBMITTING
        console.log('Refreshing CSRF token before form submission...');
        await fetch('/sanctum/csrf-cookie', {
            credentials: 'include',
        });

        // Wait a bit to ensure cookie is set
        await new Promise((resolve) => setTimeout(resolve, 100));

        // ... rest of the submit logic
    } catch (error: any) {
        // Special handling for CSRF errors
        if (error.response?.status === 419) {
            showToast.error('❌ Session expired. Please refresh the page and try again.');
        }
        // ... error handling
    }
};
```

### 2. **Refresh CSRF Token When Opening Dialog**

Functions `handleCreate` dan `handleEdit` sekarang async dan refresh CSRF token:

```typescript
const handleCreate = async () => {
    // ✨ REFRESH CSRF TOKEN WHEN OPENING DIALOG
    try {
        await fetch('/sanctum/csrf-cookie', {
            credentials: 'include',
        });
    } catch (error) {
        console.warn('Failed to refresh CSRF token:', error);
    }

    setEditingUser(null);
    setFormData(initialFormData);
    setErrors({});
    setIsDialogOpen(true);
};
```

### 3. **Better CSRF Token Header Detection**

Di `api.ts`, interceptor sekarang prioritaskan `X-XSRF-TOKEN` dari cookie:

```typescript
api.interceptors.request.use(async (config) => {
    await initializeCSRF();

    // ✨ PRIORITIZE X-XSRF-TOKEN FROM COOKIE (Laravel Sanctum preferred method)
    const xsrfMatches = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (xsrfMatches) {
        const xsrfToken = decodeURIComponent(xsrfMatches[1]);
        config.headers['X-XSRF-TOKEN'] = xsrfToken;
        console.log('Using X-XSRF-TOKEN from cookie');
    } else {
        // Fallback to X-CSRF-TOKEN from meta tag
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            config.headers['X-CSRF-TOKEN'] = csrfToken;
            console.log('Using X-CSRF-TOKEN from meta tag');
        }
    }

    return config;
});
```

## 🔧 Technical Details

### CSRF Protection Flow

1. **Laravel Sanctum** menggunakan cookie-based CSRF protection
2. Cookie `XSRF-TOKEN` di-set oleh endpoint `/sanctum/csrf-cookie`
3. Frontend harus kirim token ini via header `X-XSRF-TOKEN`
4. Laravel akan validasi bahwa token di header match dengan cookie

### Why It Was Failing Before

- CSRF token tidak di-refresh sebelum submit
- Token mungkin expired setelah beberapa waktu idle
- Cookie `XSRF-TOKEN` tidak ter-update

### How The Fix Works

1. **Before Opening Dialog**: Refresh CSRF token dari server
2. **Before Submitting Form**: Refresh lagi untuk memastikan token fresh
3. **In API Interceptor**: Gunakan `X-XSRF-TOKEN` dari cookie (preferred by Laravel Sanctum)
4. **Error Handling**: Deteksi 419 error dan beri pesan yang jelas ke user

## 📝 Testing Checklist

- [x] Build successful tanpa error
- [ ] Buka halaman User Management
- [ ] Klik "Tambah User"
- [ ] Isi form dengan PIN yang sudah ada sebelumnya
- [ ] Submit form
- [ ] ✅ Harusnya **tidak ada error CSRF lagi**
- [ ] User baru berhasil dibuat
- [ ] Toast notification muncul

## 🔍 Debug Console Logs

Setelah fix, di browser console akan muncul:

```
Refreshing CSRF token before form submission...
Using X-XSRF-TOKEN from cookie
API Request headers: {...}
```

## 🚀 Next Steps

Jika masih ada error CSRF setelah fix ini:

1. **Clear Browser Cache & Cookies** (Ctrl+Shift+Delete)
2. **Hard Refresh** page (Ctrl+F5)
3. **Check `.env` file**:
    ```env
    SESSION_DRIVER=database
    SESSION_LIFETIME=120
    SESSION_DOMAIN=null
    SESSION_SECURE_COOKIE=false  # set true only if using HTTPS
    SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1,127.0.0.1:8000
    ```
4. **Check Database Sessions Table**: Pastikan sessions table ada dan accessible

## 📚 References

- Laravel Sanctum CSRF Protection: https://laravel.com/docs/11.x/sanctum#csrf-protection
- Session Configuration: https://laravel.com/docs/11.x/session

---

**Fixed on**: January 14, 2025  
**Affected Files**:

- `resources/js/pages/super-admin/user-management.tsx`
- `resources/js/lib/api.ts`
