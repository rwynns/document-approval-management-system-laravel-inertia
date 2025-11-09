# Fix: Google OAuth Refresh Token Issue

## Problem

Field `google_refresh_token` di database selalu kosong/NULL setelah Google OAuth login.

## Root Cause

Google OAuth tidak memberikan refresh token secara default. Kita perlu menambahkan parameter khusus:

- `access_type=offline` - Memberitahu Google kita butuh offline access
- `prompt=consent` - Memaksa consent screen muncul
- `approval_prompt=force` - Fallback parameter untuk kompatibilitas

## Solution Applied

### 1. Updated redirectToGoogle() Method

File: `app/Http/Controllers/Auth/AuthenticatedSessionController.php`

**Sebelum:**

```php
public function redirectToGoogle(): RedirectResponse
{
    return Socialite::driver('google')->redirect();
}
```

**Sesudah:**

```php
public function redirectToGoogle(): RedirectResponse
{
    // Build Google OAuth URL manually to ensure we get refresh token
    $clientId = config('services.google.client_id');
    $redirectUri = config('services.google.redirect');

    $params = [
        'client_id' => $clientId,
        'redirect_uri' => $redirectUri,
        'scope' => 'openid profile email',
        'response_type' => 'code',
        'access_type' => 'offline',      // REQUIRED untuk refresh token
        'prompt' => 'consent',           // Force consent screen
        'approval_prompt' => 'force',    // Fallback parameter
        'state' => Str::random(40),      // CSRF protection
    ];

    // Store state in session for validation
    session(['google_oauth_state' => $params['state']]);

    $authUrl = 'https://accounts.google.com/o/oauth2/auth?' . http_build_query($params);

    return redirect($authUrl);
}
```

### 2. Added State Validation for Security

```php
public function handleGoogleCallback(): RedirectResponse
{
    try {
        // Validate state parameter for security
        $state = request('state');
        $sessionState = session('google_oauth_state');

        if (!$state || !$sessionState || $state !== $sessionState) {
            Log::error('Google OAuth - Invalid state parameter');
            return redirect()->route('login')->with('error', 'Invalid request. Please try again.');
        }

        // Clear state from session
        session()->forget('google_oauth_state');

        $googleUser = Socialite::driver('google')->user();
        // ... rest of the method
    }
}
```

### 3. Enhanced Logging

Added detailed logging untuk debug refresh token:

```php
Log::info('Google OAuth callback - Refresh Token: ' . ($googleUser->refreshToken ? 'Present' : 'Missing'));
Log::info('Google OAuth - Updated existing user tokens: ' . $user->email .
         ', Refresh Token: ' . ($googleUser->refreshToken ? 'Present' : 'Missing'));
```

## Why Manual URL Building?

Laravel Socialite v5.23.0 tidak memiliki method `.with()` atau `.scopes()` yang reliable untuk menambahkan parameter khusus. Manual URL building memastikan parameter yang diperlukan untuk refresh token selalu ada.

## Generated OAuth URL Example

```
https://accounts.google.com/o/oauth2/auth?
client_id=2820602399-dgs6asc887k7c5sus4q7ujqsf74c6ej0.apps.googleusercontent.com&
redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fauth%2Fgoogle%2Fcallback&
scope=openid+profile+email&
response_type=code&
access_type=offline&          ← KEY for refresh token
prompt=consent&               ← KEY for refresh token
approval_prompt=force&        ← KEY for refresh token
state=pyOcnX4kHiiRlmdR5Lz0kV9Icib0zpeX17gPor1j
```

## Testing

### 1. Test URL Generation

```bash
php test_google_oauth.php
```

Expected output:

```
✅ access_type=offline: Present
✅ prompt=consent: Present
✅ approval_prompt=force: Present
```

### 2. Test Login Flow

1. **Delete existing Google user** (opsional)
2. **Clear browser cookies** untuk Google
3. **Login dengan Google** - akan muncul consent screen
4. **Cek database** - `google_refresh_token` tidak boleh NULL
5. **Cek logs** - should show "Refresh Token: Present"

### 3. Verify in Database

```sql
SELECT name, email, google_id,
       CASE WHEN google_token IS NOT NULL THEN 'Present' ELSE 'Missing' END as access_token,
       CASE WHEN google_refresh_token IS NOT NULL THEN 'Present' ELSE 'Missing' END as refresh_token
FROM users
WHERE google_id IS NOT NULL;
```

Expected result:

```
| name          | email                        | access_token | refresh_token |
|---------------|------------------------------|--------------|---------------|
| Erwin Saputro | a710210033@student.ums.ac.id | Present      | Present       |
```

## Use Cases for Refresh Token

### 1. Auto-refresh Expired Tokens

```php
private function refreshGoogleAccessToken($refreshToken)
{
    $client = new \Google_Client();
    $client->setClientId(config('services.google.client_id'));
    $client->setClientSecret(config('services.google.client_secret'));
    $client->refreshToken($refreshToken);

    $newToken = $client->getAccessToken();
    return $newToken['access_token'];
}
```

### 2. Long-term API Access

```php
// Access Google APIs tanpa user login ulang
$calendar = new \Google_Service_Calendar($client);
$events = $calendar->events->listEvents('primary');
```

## Files Modified

- `app/Http/Controllers/Auth/AuthenticatedSessionController.php`
- Added test script: `test_google_oauth.php`

## Security Improvements

- ✅ CSRF protection dengan state parameter
- ✅ State validation di callback
- ✅ Session state cleanup
- ✅ Enhanced error handling dan logging

## Next Steps

Sekarang refresh token akan tersimpan dengan benar dan bisa digunakan untuk:

1. Auto-refresh expired access tokens
2. Long-term Google API access tanpa re-authentication
3. Background sync dengan Google services
