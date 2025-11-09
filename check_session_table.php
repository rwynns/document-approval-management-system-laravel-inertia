<?php

require_once 'vendor/autoload.php';

// Load Laravel app
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== DATABASE SESSION TABLE CHECK ===\n\n";

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

    // Check if sessions table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'sessions'");
    $sessionTableExists = $stmt->rowCount() > 0;

    echo "Sessions table: " . ($sessionTableExists ? "✅ Exists" : "❌ Missing") . "\n";

    if (!$sessionTableExists) {
        echo "\nCreating sessions table...\n";

        $createSessionTable = "
        CREATE TABLE sessions (
            id VARCHAR(255) PRIMARY KEY,
            user_id BIGINT UNSIGNED NULL,
            ip_address VARCHAR(45) NULL,
            user_agent TEXT NULL,
            payload LONGTEXT NOT NULL,
            last_activity INT NOT NULL,
            INDEX sessions_user_id_index (user_id),
            INDEX sessions_last_activity_index (last_activity)
        )";

        $pdo->exec($createSessionTable);
        echo "✅ Sessions table created successfully\n";
    } else {
        // Check sessions table structure
        $stmt = $pdo->query("DESCRIBE sessions");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "\nSessions table structure:\n";
        foreach ($columns as $column) {
            echo "  • {$column['Field']} ({$column['Type']})\n";
        }
    }

    // Check if cache table exists (used for session storage)
    $stmt = $pdo->query("SHOW TABLES LIKE 'cache'");
    $cacheTableExists = $stmt->rowCount() > 0;

    echo "\nCache table: " . ($cacheTableExists ? "✅ Exists" : "❌ Missing") . "\n";

    if ($cacheTableExists) {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM cache");
        $cacheCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        echo "Cache entries: {$cacheCount}\n";
    }

    // Test session configuration
    echo "\n=== SESSION CONFIGURATION ===\n";
    echo "Driver: " . config('session.driver') . "\n";
    echo "Lifetime: " . config('session.lifetime') . " minutes\n";
    echo "Database connection: " . config('session.connection') . "\n";
    echo "Table: " . config('session.table', 'sessions') . "\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n=== CHECK COMPLETE ===\n";
