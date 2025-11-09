<?php

// Check Google users and their tokens
require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

echo "=== GOOGLE USERS TOKEN CHECK ===\n\n";

$googleUsers = User::whereNotNull('google_id')->get();

if ($googleUsers->count() === 0) {
    echo "No Google users found\n";
} else {
    foreach ($googleUsers as $user) {
        echo "User: {$user->name} ({$user->email})\n";
        echo "Google ID: {$user->google_id}\n";
        echo "Access Token: " . ($user->google_token ? 'Present ✅' : 'Missing ❌') . "\n";
        echo "Refresh Token: " . ($user->google_refresh_token ? 'Present ✅' : 'Missing ❌') . "\n";

        if ($user->google_token) {
            echo "Token length: " . strlen($user->google_token) . " chars\n";
        }

        if ($user->google_refresh_token) {
            echo "Refresh token length: " . strlen($user->google_refresh_token) . " chars\n";
            echo "Refresh token preview: " . substr($user->google_refresh_token, 0, 20) . "...\n";
        }

        echo "Created: {$user->created_at}\n";
        echo "Updated: {$user->updated_at}\n";
        echo "---\n";
    }
}

echo "\n=== CHECK COMPLETE ===\n";
