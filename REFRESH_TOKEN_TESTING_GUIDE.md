# Google OAuth Refresh Token - Complete Testing Guide

## Current Status

✅ Login berhasil
❌ Refresh token masih kosong di database

## Root Cause Analysis

Google hanya memberikan refresh token pada kondisi tertentu:

### 1. **First Time Consent**

Google hanya memberikan refresh token pada **consent pertama kali** untuk aplikasi tertentu.

### 2. **Required Parameters**

- `access_type=offline` ✅ (sudah ada)
- `prompt=consent` ✅ (sudah ada)

### 3. **User Must Re-consent**

Jika user sudah pernah memberikan consent sebelumnya, Google tidak akan memberikan refresh token lagi kecuali:

- User revoke akses aplikasi di Google Account
- User login dengan `prompt=consent` setelah revoke

## Testing Steps untuk Mendapatkan Refresh Token

### Step 1: Revoke Google App Access

1. Buka https://myaccount.google.com/permissions
2. Cari aplikasi "Document Approval Management System"
3. Klik "Remove Access" atau "Revoke"
4. Atau hapus semua "Third-party apps with account access"

### Step 2: Clear Browser Data

1. Clear cookies untuk `accounts.google.com`
2. Clear localStorage
3. Atau gunakan Incognito/Private mode

### Step 3: Test Login

1. Akses `/login`
2. Klik "Login with Google"
3. Pilih akun Google
4. **Consent screen harus muncul** (key indicator)
5. Accept permissions
6. Check database untuk refresh token

### Step 4: Verify Parameters

URL yang dihasilkan harus mengandung:

```
https://accounts.google.com/o/oauth2/v2/auth?
client_id=xxx&
redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fauth%2Fgoogle%2Fcallback&
scope=openid+profile+email&
response_type=code&
access_type=offline&          ← REQUIRED
prompt=consent&               ← REQUIRED
state=xxx
```

## Alternative Method: Force Re-consent

### Option 1: Add `approval_prompt=force` (if compatible)

```php
$params = [
    // ... other params
    'access_type' => 'offline',
    'prompt' => 'consent',
    'approval_prompt' => 'force', // Legacy but sometimes works
];
```

### Option 2: Use Google Admin SDK

```php
// Revoke token programmatically (requires admin SDK)
$client = new Google_Client();
$client->setAccessToken($user->google_token);
$client->revokeToken();
```

### Option 3: Manual URL with additional params

```php
$params = [
    // ... existing params
    'access_type' => 'offline',
    'prompt' => 'consent',
    'include_granted_scopes' => 'true',
];
```

## Debug Commands

### Check Token Status

```bash
php check_tokens.php
```

### Check Recent Logs

```bash
tail -20 storage/logs/laravel.log
```

### Test Current User

```bash
php debug_roles.php
```

## Expected Log Output (Success)

```
[2025-10-09] local.INFO: Google OAuth callback - User data received {
    "email": "user@gmail.com",
    "name": "User Name",
    "id": "123456789",
    "token": "Present",
    "refresh_token": "Present"  ← This should be Present!
}
```

## Troubleshooting

### If Refresh Token Still Missing:

1. **Verify Google Cloud Console Settings:**
    - OAuth consent screen configured
    - Scopes include: email, profile, openid
    - Application type: Web application

2. **Test with Brand New Google Account:**
    - Create new Google account
    - Never used with your app before
    - Should definitely get refresh token

3. **Check Google API Quotas:**
    - Go to Google Cloud Console
    - Check API quotas and limits
    - Ensure OAuth API is enabled

4. **Verify Environment:**
    ```bash
    # Check .env configuration
    echo $GOOGLE_CLIENT_ID
    echo $GOOGLE_CLIENT_SECRET
    echo $GOOGLE_REDIRECT_URI
    ```

## Manual Testing Checklist

- [ ] Revoke app access di Google Account
- [ ] Clear browser cookies & cache
- [ ] Access `/login`
- [ ] Click "Login with Google"
- [ ] **Consent screen appears** (critical!)
- [ ] Accept permissions
- [ ] Login successful
- [ ] Check `php check_tokens.php`
- [ ] Refresh token should be "Present ✅"

## Important Notes

🚨 **Google only gives refresh token on FIRST consent or after revoke**

✅ **Current code is correct** - issue is with user consent history

⚠️ **Test with different Google account** if refresh token still missing

🔄 **Refresh token is permanent** until user revokes access
