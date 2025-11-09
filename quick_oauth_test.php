<?php

echo "=== QUICK GOOGLE OAUTH URL TEST ===\n\n";

// Generate exact same URL as controller
$clientId = '2820602399-dgs6asc887k7c5sus4q7ujqsf74c6ej0.apps.googleusercontent.com';
$redirectUri = 'http://localhost:8000/auth/google/callback';

$params = [
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
    'scope' => 'openid profile email',
    'response_type' => 'code',
    'access_type' => 'offline',
    'prompt' => 'consent',
    'state' => 'test_' . time()
];

$url = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);

echo "Generated OAuth URL:\n";
echo $url . "\n\n";

echo "INSTRUCTIONS:\n";
echo "1. Copy the URL above\n";
echo "2. Paste in browser\n";
echo "3. Complete Google login\n";
echo "4. You should be redirected to: {$redirectUri}\n";
echo "5. Check Laravel logs immediately after\n\n";

echo "If URL doesn't work:\n";
echo "- Check Google Cloud Console settings\n";
echo "- Verify client ID and redirect URI\n";
echo "- Ensure OAuth consent screen is configured\n\n";

echo "=== TEST READY ===\n";
