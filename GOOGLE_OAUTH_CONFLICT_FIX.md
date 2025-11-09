# Fix: Google OAuth "Conflict params: approval_prompt and prompt" Error

## Problem

Error dari Google OAuth:

```
Access blocked: Authorization Error
Conflict params: approval_prompt and prompt
Error 400: invalid_request
```

## Root Cause

Google OAuth API tidak mengizinkan penggunaan parameter `approval_prompt` dan `prompt` secara bersamaan. Parameter `approval_prompt` sudah **deprecated** dan harus dihapus.

## Solution Applied

### Before (Error):

```php
$params = [
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
    'scope' => 'openid profile email',
    'response_type' => 'code',
    'access_type' => 'offline',
    'prompt' => 'consent',           // ✅ Modern parameter
    'approval_prompt' => 'force',    // ❌ Deprecated - CONFLICT!
    'state' => Str::random(40),
];
```

### After (Fixed):

```php
$params = [
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
    'scope' => 'openid profile email',
    'response_type' => 'code',
    'access_type' => 'offline',      // REQUIRED untuk refresh token
    'prompt' => 'consent',           // Force consent screen - SUFFICIENT!
    'state' => Str::random(40),      // CSRF protection
];
```

## Key Changes

1. ❌ **Removed:** `'approval_prompt' => 'force'` (deprecated parameter)
2. ✅ **Kept:** `'prompt' => 'consent'` (modern parameter that does the same job)
3. ✅ **Kept:** `'access_type' => 'offline'` (required for refresh token)

## Why `prompt=consent` is Sufficient?

Parameter `prompt=consent` sudah cukup untuk:

- ✅ Force consent screen muncul
- ✅ Memaksa user memberikan permission ulang
- ✅ Memastikan refresh token diberikan (dengan `access_type=offline`)

Parameter `approval_prompt=force` adalah legacy parameter yang:

- ❌ Deprecated sejak Google OAuth 2.0 v2
- ❌ Menyebabkan conflict dengan `prompt`
- ❌ Tidak diperlukan lagi

## Test Results

### Fixed URL Generated:

```
https://accounts.google.com/o/oauth2/auth?
client_id=2820602399-dgs6asc887k7c5sus4q7ujqsf74c6ej0.apps.googleusercontent.com&
redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fauth%2Fgoogle%2Fcallback&
scope=openid+profile+email&
response_type=code&
access_type=offline&          ← ✅ For refresh token
prompt=consent&               ← ✅ Force consent screen
state=EF2WKUnBtwikJVozCq6Q5PoLZQiGqxydQ3aqfkOF
```

### Validation Results:

```
✅ access_type=offline: Present
✅ prompt=consent: Present
✅ No conflicting approval_prompt: Present
```

## Files Modified

- `app/Http/Controllers/Auth/AuthenticatedSessionController.php`
- `test_google_oauth.php`

## Testing Steps

1. ✅ Clear browser cookies untuk Google
2. ✅ Test dengan URL baru - no more error 400
3. ✅ Login dengan Google - consent screen akan muncul
4. ✅ Cek database - refresh token tersimpan dengan benar

## Google OAuth Best Practices

- ✅ Use `prompt=consent` instead of deprecated `approval_prompt`
- ✅ Always include `access_type=offline` for refresh tokens
- ✅ Include `state` parameter for CSRF protection
- ✅ Use modern OAuth 2.0 parameters only

## Expected Result

Sekarang Google OAuth akan bekerja tanpa error dan:

- ✅ Consent screen akan muncul
- ✅ User dapat login dengan sukses
- ✅ Refresh token akan tersimpan di database
- ✅ No more "Conflict params" error
