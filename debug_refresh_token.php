<?php

require_once 'vendor/autoload.php';

// Load Laravel app
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== GOOGLE OAUTH REFRESH TOKEN DEBUGGER ===\n\n";

// Check current OAuth URL generation
echo "1. CHECKING OAUTH URL PARAMETERS\n";
echo "--------------------------------\n";

$clientId = config('services.google.client_id');
$redirectUri = config('services.google.redirect');

$params = [
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
    'scope' => 'openid profile email',
    'response_type' => 'code',
    'access_type' => 'offline',
    'prompt' => 'consent',
    'state' => 'test_state_' . time()
];

$url = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);

echo "Generated OAuth URL:\n";
echo $url . "\n\n";

echo "Parameters check:\n";
echo "✓ access_type=offline: " . (strpos($url, 'access_type=offline') !== false ? "✅ Present" : "❌ Missing") . "\n";
echo "✓ prompt=consent: " . (strpos($url, 'prompt=consent') !== false ? "✅ Present" : "❌ Missing") . "\n";
echo "✓ scope includes profile: " . (strpos($url, 'profile') !== false ? "✅ Present" : "❌ Missing") . "\n\n";

// Check database configuration
echo "2. CHECKING DATABASE SETUP\n";
echo "--------------------------\n";

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

    // Check if google_refresh_token column exists
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $hasRefreshTokenColumn = false;
    foreach ($columns as $column) {
        if ($column['Field'] === 'google_refresh_token') {
            $hasRefreshTokenColumn = true;
            echo "✓ google_refresh_token column: ✅ Exists (type: {$column['Type']})\n";
            break;
        }
    }

    if (!$hasRefreshTokenColumn) {
        echo "✗ google_refresh_token column: ❌ Missing\n";
        echo "  Run: php artisan migrate to add the column\n";
    }

    // Check for Google users
    $googleUserCount = 0;
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE google_id IS NOT NULL");
        $googleUserCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        echo "✓ Google users in database: {$googleUserCount}\n";
    } catch (Exception $e) {
        echo "✗ Cannot count Google users: " . $e->getMessage() . "\n";
    }

    if ($googleUserCount > 0) {
        $stmt = $pdo->query("
            SELECT 
                name,
                email,
                google_id,
                CASE 
                    WHEN google_token IS NOT NULL THEN 'Present' 
                    ELSE 'Missing' 
                END as access_token_status,
                CASE 
                    WHEN google_refresh_token IS NOT NULL THEN 'Present' 
                    ELSE 'Missing' 
                END as refresh_token_status,
                created_at
            FROM users 
            WHERE google_id IS NOT NULL 
            ORDER BY created_at DESC
        ");

        echo "\nGoogle Users Token Status:\n";
        while ($user = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "  • {$user['name']} ({$user['email']})\n";
            echo "    Access Token: {$user['access_token_status']}\n";
            echo "    Refresh Token: {$user['refresh_token_status']}\n";
            echo "    Created: {$user['created_at']}\n\n";
        }
    }
} catch (Exception $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
    $googleUserCount = 0;
}

// Check environment variables
echo "3. CHECKING ENVIRONMENT CONFIGURATION\n";
echo "------------------------------------\n";

$requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI'
];

foreach ($requiredEnvVars as $var) {
    $value = env($var);
    if ($value) {
        $masked = $var === 'GOOGLE_CLIENT_SECRET' ? substr($value, 0, 10) . '...' : $value;
        echo "✓ {$var}: ✅ Present ({$masked})\n";
    } else {
        echo "✗ {$var}: ❌ Missing\n";
    }
}

echo "\n4. TESTING RECOMMENDATIONS\n";
echo "-------------------------\n";

if ($googleUserCount > 0) {
    echo "⚠️  You have existing Google users. For refresh token testing:\n";
    echo "\n";
    echo "Option 1 - Clear existing consent:\n";
    echo "  1. Go to https://myaccount.google.com/permissions\n";
    echo "  2. Remove 'Document Approval Management System' access\n";
    echo "  3. Clear browser cookies for accounts.google.com\n";
    echo "  4. Login again with same account\n\n";

    echo "Option 2 - Test with new Google account:\n";
    echo "  1. Create/use different Google account\n";
    echo "  2. Login with that account\n";
    echo "  3. Should get refresh token on first consent\n\n";

    echo "Option 3 - Force re-consent:\n";
    echo "  1. Add 'approval_prompt=force' to OAuth URL\n";
    echo "  2. This may override existing consent\n\n";
} else {
    echo "✅ No existing Google users - perfect for testing!\n";
    echo "   Next login should definitely get refresh token.\n\n";
}

echo "5. MANUAL TEST URL\n";
echo "-----------------\n";
echo "Test this URL directly in browser:\n";
echo $url . "\n\n";

echo "Expected flow:\n";
echo "1. Redirects to Google login\n";
echo "2. Shows consent screen (MUST appear for refresh token)\n";
echo "3. Redirects back to /auth/google/callback\n";
echo "4. User should be logged in\n";
echo "5. Check database for refresh token\n\n";

echo "=== END DEBUGGING ===\n";
