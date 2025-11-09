# Cara Kerja Role Management di Sistem

## Konsep Dasar

Sistem ini menggunakan **role-based access control** dengan konteks yang lebih spesifik:

- **User** bisa memiliki **multiple roles**
- **Role** bisa dikaitkan dengan **company**, **jabatan**, dan **aplikasi** tertentu
- Satu user bisa punya role berbeda di company berbeda

## Contoh Skenario

### User dengan Single Role

```
John Doe (user_id: 1)
└── Role: User di PT. ABC (company_id: 1) sebagai Staff (jabatan_id: 2)
```

**Data di tabel usersauth:**

```sql
INSERT INTO usersauth VALUES (
    1,     -- id
    1,     -- user_id (John Doe)
    3,     -- role_id (User role)
    1,     -- company_id (PT. ABC)
    2,     -- jabatan_id (Staff)
    1      -- aplikasi_id (Document Approval System)
);
```

### User dengan Multiple Roles

```
Jane Smith (user_id: 2)
├── Role: Admin di PT. ABC (company_id: 1) sebagai Manager (jabatan_id: 1)
└── Role: User di PT. XYZ (company_id: 2) sebagai Staff (jabatan_id: 2)
```

**Data di tabel usersauth:**

```sql
INSERT INTO usersauth VALUES
(2, 2, 2, 1, 1, 1),  -- Admin di PT. ABC
(3, 2, 3, 2, 2, 1);  -- User di PT. XYZ
```

## Code Examples

### 1. Mendapatkan Role User

```php
// Ambil semua roles user
$user = User::find(1);
$userRoles = $user->userAuths; // Collection of UsersAuth

// Ambil role pertama (primary role)
$primaryRole = $user->userAuths->first();
if ($primaryRole) {
    echo $primaryRole->role->role_name; // "User", "Admin", "Super Admin"
    echo $primaryRole->company->name;   // "PT. ABC"
    echo $primaryRole->jabatan->name;   // "Staff"
}
```

### 2. Cek apakah User memiliki Role tertentu

```php
// Cek apakah user punya role "Admin"
$hasAdminRole = $user->userAuths()
    ->whereHas('role', function($query) {
        $query->where('role_name', 'Admin');
    })
    ->exists();

// Cek apakah user punya role "Admin" di company tertentu
$hasAdminInCompany = $user->userAuths()
    ->whereHas('role', function($query) {
        $query->where('role_name', 'Admin');
    })
    ->where('company_id', 1)
    ->exists();
```

### 3. Assign Role ke User

```php
// Assign role "User" ke user baru
$userRole = UserRole::where('role_name', 'User')->first();
UsersAuth::create([
    'user_id' => $user->id,
    'role_id' => $userRole->id,
    'company_id' => 1,      // PT. ABC
    'jabatan_id' => 2,      // Staff
    'aplikasi_id' => 1,     // Document Approval System
]);
```

### 4. Update Role User

```php
// Update role user dari "User" ke "Admin"
$adminRole = UserRole::where('role_name', 'Admin')->first();
$userAuth = UsersAuth::where('user_id', $user->id)->first();
$userAuth->update([
    'role_id' => $adminRole->id,
    'jabatan_id' => 1, // Promote to Manager
]);
```

### 5. Remove Role dari User

```php
// Hapus role tertentu
UsersAuth::where('user_id', $user->id)
    ->where('company_id', 1)
    ->delete();

// Hapus semua roles user
UsersAuth::where('user_id', $user->id)->delete();
```

## Query Examples

### Ambil semua Admin di company tertentu

```php
$admins = User::whereHas('userAuths', function($query) {
    $query->whereHas('role', function($roleQuery) {
        $roleQuery->where('role_name', 'Admin');
    })->where('company_id', 1);
})->get();
```

### Ambil semua user dengan role dan company info

```php
$usersWithRoles = User::with(['userAuths.role', 'userAuths.company', 'userAuths.jabatan'])
    ->get();

foreach ($usersWithRoles as $user) {
    echo $user->name . " roles:\n";
    foreach ($user->userAuths as $auth) {
        echo "- " . $auth->role->role_name .
             " at " . ($auth->company->name ?? 'No Company') .
             " as " . ($auth->jabatan->name ?? 'No Position') . "\n";
    }
}
```

## Migration Example

Jika perlu membuat migration untuk tabel usersauth:

```php
Schema::create('usersauth', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
    $table->foreignId('role_id')->constrained('usersroles')->onDelete('cascade');
    $table->foreignId('company_id')->nullable()->constrained('companies')->onDelete('set null');
    $table->foreignId('jabatan_id')->nullable()->constrained('jabatans')->onDelete('set null');
    $table->foreignId('aplikasi_id')->nullable()->constrained('aplikasis')->onDelete('set null');
    $table->timestamps();

    // Composite unique key untuk mencegah duplicate role assignment
    $table->unique(['user_id', 'role_id', 'company_id']);
});
```
