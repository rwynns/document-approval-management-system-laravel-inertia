<?php

// Test Google OAuth URL generation
// Jalankan dengan: php test_google_oauth.php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Str;

echo "=== GOOGLE OAUTH URL TEST ===\n\n";

// Get config values
$clientId = config('services.google.client_id');
$redirectUri = config('services.google.redirect');

echo "Client ID: " . ($clientId ? 'Present' : 'Missing') . "\n";
echo "Redirect URI: " . $redirectUri . "\n\n";

// Build OAuth URL (same as controller)
$params = [
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
    'scope' => 'openid profile email',
    'response_type' => 'code',
    'access_type' => 'offline',      // REQUIRED untuk refresh token
    'prompt' => 'consent',           // Force consent screen untuk refresh token
    'state' => Str::random(40),      // CSRF protection
];

$authUrl = 'https://accounts.google.com/o/oauth2/auth?' . http_build_query($params);

echo "Generated OAuth URL:\n";
echo $authUrl . "\n\n";

echo "Key Parameters for Refresh Token:\n";
echo "- access_type=offline: " . (strpos($authUrl, 'access_type=offline') !== false ? '✅' : '❌') . "\n";
echo "- prompt=consent: " . (strpos($authUrl, 'prompt=consent') !== false ? '✅' : '❌') . "\n";
echo "- No conflicting approval_prompt: " . (strpos($authUrl, 'approval_prompt') === false ? '✅' : '❌') . "\n";

echo "\n=== TEST COMPLETE ===\n";
