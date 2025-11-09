<?php

// Debug Google OAuth URL with Socialite
require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Start session for Socialite
$app->make('session')->start();

use Laravel\Socialite\Facades\Socialite;

echo "=== SOCIALITE URL DEBUG ===\n\n";

try {
    // Get the standard Socialite redirect URL
    $socialiteUrl = Socialite::driver('google')->redirect()->getTargetUrl();

    echo "Original Socialite URL:\n";
    echo $socialiteUrl . "\n\n";

    // Parse the URL to add our parameters
    $parsedUrl = parse_url($socialiteUrl);
    parse_str($parsedUrl['query'] ?? '', $params);

    echo "Original parameters:\n";
    foreach ($params as $key => $value) {
        echo "- $key: $value\n";
    }
    echo "\n";

    // Add parameters required for refresh token
    $params['access_type'] = 'offline';
    $params['prompt'] = 'consent';

    // Rebuild the URL
    $finalUrl = $parsedUrl['scheme'] . '://' . $parsedUrl['host'] . $parsedUrl['path'] . '?' . http_build_query($params);

    echo "Final URL with refresh token params:\n";
    echo $finalUrl . "\n\n";

    echo "Key refresh token parameters:\n";
    echo "- access_type=offline: " . (strpos($finalUrl, 'access_type=offline') !== false ? '✅' : '❌') . "\n";
    echo "- prompt=consent: " . (strpos($finalUrl, 'prompt=consent') !== false ? '✅' : '❌') . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n=== DEBUG COMPLETE ===\n";
