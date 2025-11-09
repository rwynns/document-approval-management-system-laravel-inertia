<?php

require_once 'vendor/autoload.php';

// Load Laravel app
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== GOOGLE OAUTH REFRESH TOKEN SOLUTION ===\n\n";

echo "PROBLEM IDENTIFIED:\n";
echo "-------------------\n";
echo "✅ OAuth URL parameters are correct (access_type=offline, prompt=consent)\n";
echo "✅ Database column exists (google_refresh_token)\n";
echo "❌ All 3 Google users have access tokens but NO refresh tokens\n\n";

echo "ROOT CAUSE:\n";
echo "-----------\n";
echo "Google only provides refresh tokens on FIRST TIME consent.\n";
echo "Since users already gave consent before, Google won't give refresh tokens again.\n\n";

echo "SOLUTION OPTIONS:\n";
echo "-----------------\n\n";

echo "Option 1: REVOKE AND RE-CONSENT (Recommended)\n";
echo "----------------------------------------------\n";
echo "For each existing user, they need to:\n";
echo "1. Go to https://myaccount.google.com/permissions\n";
echo "2. Find and remove 'Document Approval Management System' access\n";
echo "3. Clear browser cookies for Google\n";
echo "4. Login again - should show consent screen\n";
echo "5. This time Google will provide refresh token\n\n";

echo "Option 2: FORCE REFRESH TOKEN VIA ADMIN REVOKE\n";
echo "-----------------------------------------------\n";
echo "Programmatically revoke existing tokens and force re-consent:\n\n";

try {
    $host = config('database.connections.mysql.host');
    $dbname = config('database.connections.mysql.database');
    $username = config('database.connections.mysql.username');
    $password = config('database.connections.mysql.password');
    $port = config('database.connections.mysql.port');

    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$dbname}",
        $username,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->query("
        SELECT id, name, email, google_token 
        FROM users 
        WHERE google_id IS NOT NULL AND google_token IS NOT NULL
    ");

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Users that need refresh tokens:\n";
    foreach ($users as $user) {
        echo "• {$user['name']} ({$user['email']})\n";

        // Try to revoke the token
        $accessToken = $user['google_token'];

        echo "  Attempting to revoke existing token...\n";

        // Make HTTP request to revoke token
        $revokeUrl = "https://oauth2.googleapis.com/revoke?token=" . urlencode($accessToken);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $revokeUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            echo "  ✅ Token revoked successfully\n";

            // Clear tokens from database
            $updateStmt = $pdo->prepare("
                UPDATE users 
                SET google_token = NULL, google_refresh_token = NULL 
                WHERE id = ?
            ");
            $updateStmt->execute([$user['id']]);
            echo "  ✅ Tokens cleared from database\n";
        } else {
            echo "  ❌ Failed to revoke token (HTTP {$httpCode})\n";
            echo "  Response: {$response}\n";
        }
        echo "\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\nOption 3: ADD ADDITIONAL OAUTH PARAMETERS\n";
echo "-----------------------------------------\n";
echo "Modify OAuth URL to force consent:\n";
echo "• include_granted_scopes=true\n";
echo "• approval_prompt=force (deprecated but sometimes works)\n\n";

echo "TESTING STEPS AFTER SOLUTION:\n";
echo "-----------------------------\n";
echo "1. Revoke tokens (use Option 2 above or manual Option 1)\n";
echo "2. Clear browser cookies\n";
echo "3. Login via Google OAuth\n";
echo "4. MUST see consent screen (critical!)\n";
echo "5. Accept permissions\n";
echo "6. Check database with: php check_tokens.php\n";
echo "7. Refresh token should now be present\n\n";

echo "VERIFICATION:\n";
echo "------------\n";
echo "Run this after implementing solution:\n";
echo "php check_tokens.php\n\n";

echo "Expected result:\n";
echo "• Access Token: Present ✅\n";
echo "• Refresh Token: Present ✅ (THIS IS THE GOAL)\n\n";

echo "=== END SOLUTION GUIDE ===\n";
