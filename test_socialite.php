<?php

require_once 'vendor/autoload.php';

// Load Laravel app
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== GOOGLE OAUTH SOCIALITE TEST ===\n\n";

try {
    echo "1. TESTING SOCIALITE CONFIGURATION\n";
    echo "-----------------------------------\n";

    // Test configuration
    $clientId = config('services.google.client_id');
    $clientSecret = config('services.google.client_secret');
    $redirectUri = config('services.google.redirect');

    echo "Client ID: " . ($clientId ? "✅ Present" : "❌ Missing") . "\n";
    echo "Client Secret: " . ($clientSecret ? "✅ Present" : "❌ Missing") . "\n";
    echo "Redirect URI: " . ($redirectUri ? "✅ Present ({$redirectUri})" : "❌ Missing") . "\n\n";

    if (!$clientId || !$clientSecret || !$redirectUri) {
        echo "❌ Configuration missing! Check .env file\n";
        exit(1);
    }

    echo "2. TESTING SOCIALITE DRIVER INITIALIZATION\n";
    echo "------------------------------------------\n";

    // Test if we can initialize the driver
    $driver = Laravel\Socialite\Facades\Socialite::driver('google');
    echo "✅ Socialite Google driver initialized successfully\n\n";

    echo "3. TESTING REDIRECT URL GENERATION\n";
    echo "----------------------------------\n";

    // Test redirect URL generation (this should work without issues)
    $redirectUrl = $driver->redirect()->getTargetUrl();
    echo "✅ Redirect URL generated successfully\n";
    echo "URL: " . substr($redirectUrl, 0, 100) . "...\n\n";

    echo "4. SIMULATING CALLBACK (WITHOUT ACTUAL GOOGLE RESPONSE)\n";
    echo "-------------------------------------------------------\n";

    // This will fail but should show us the exact error
    try {
        // Set up a fake request to simulate callback
        $_GET['code'] = 'fake_test_code';
        $_GET['state'] = 'fake_test_state';

        echo "Attempting to call Socialite user() method...\n";
        $user = $driver->user();
        echo "✅ Unexpected success - this shouldn't work with fake code\n";
    } catch (Laravel\Socialite\Two\InvalidStateException $e) {
        echo "✅ Expected InvalidStateException: " . $e->getMessage() . "\n";
    } catch (GuzzleHttp\Exception\ClientException $e) {
        $response = $e->getResponse();
        $statusCode = $response->getStatusCode();
        $body = $response->getBody()->getContents();

        echo "✅ Expected ClientException (HTTP {$statusCode})\n";
        echo "Response body: " . substr($body, 0, 200) . "...\n";

        if ($statusCode === 400) {
            echo "✅ This is normal - Google rejected our fake code\n";
        }
    } catch (Exception $e) {
        echo "❌ Unexpected error: " . get_class($e) . "\n";
        echo "Message: " . $e->getMessage() . "\n";
        echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    }

    echo "\n5. DIAGNOSIS\n";
    echo "------------\n";

    echo "If you saw 'Expected ClientException (HTTP 400)' above,\n";
    echo "then Socialite is working correctly.\n\n";

    echo "The actual OAuth error in your logs is likely caused by:\n";
    echo "• Invalid authorization code from Google\n";
    echo "• Token exchange failure\n";
    echo "• Google API rate limiting\n";
    echo "• Network connectivity issues\n\n";

    echo "RECOMMENDATION:\n";
    echo "Try logging in again. The detailed error logging should\n";
    echo "now show the specific error message.\n\n";
} catch (Exception $e) {
    echo "❌ FATAL ERROR: " . get_class($e) . "\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n\n";

    echo "This indicates a configuration problem.\n";
    echo "Check your .env file and Composer dependencies.\n";
}

echo "=== TEST COMPLETE ===\n";
