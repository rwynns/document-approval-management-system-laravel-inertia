# Model Signature - Dokumentasi

## 📋 Overview

Model `Signature` digunakan untuk menyimpan tanda tangan digital user yang dapat digunakan untuk approval dokumen.

## 🗄️ Database Schema

### Tabel: `signatures`

| Kolom            | Tipe                 | Keterangan                                              |
| ---------------- | -------------------- | ------------------------------------------------------- |
| `id`             | bigint (PK)          | Primary key                                             |
| `user_id`        | bigint (FK)          | Foreign key ke tabel `users`                            |
| `signature_path` | string               | Path file gambar tanda tangan                           |
| `signature_type` | string               | Tipe: `manual` (digambar) atau `uploaded` (upload file) |
| `is_default`     | boolean              | Apakah ini signature default user                       |
| `created_at`     | timestamp            | Waktu dibuat                                            |
| `updated_at`     | timestamp            | Waktu diupdate                                          |
| `deleted_at`     | timestamp (nullable) | Soft delete timestamp                                   |

**Indexes:**

- `user_id` - Index untuk query berdasarkan user
- `user_id, is_default` - Composite index untuk query signature default

**Foreign Keys:**

- `user_id` → `users.id` (ON DELETE CASCADE)

## 🔗 Relationships

### Signature Model

```php
// Belongs to User
$signature->user; // Get user yang memiliki signature ini
```

### User Model

```php
// Has many signatures
$user->signatures; // Get semua signature user

// Has one default signature
$user->defaultSignature; // Get signature default user
```

## 📝 Model Features

### 1. **Mass Assignment Protection**

```php
protected $fillable = [
    'user_id',
    'signature_path',
    'signature_type',
    'is_default',
];
```

### 2. **Soft Deletes**

Signature menggunakan soft delete untuk backup:

```php
use SoftDeletes;

// Soft delete signature
$signature->delete();

// Restore signature
$signature->restore();

// Permanent delete
$signature->forceDelete();
```

### 3. **Accessors**

#### Get Signature URL

```php
$signature->signature_url; // Returns: /storage/signatures/xxx.png
```

#### Get Full Path

```php
$signature->full_path; // Returns: full filesystem path
```

### 4. **Methods**

#### Set as Default

```php
$signature->setAsDefault();
// Akan:
// 1. Unset semua signature default lain untuk user ini
// 2. Set signature ini sebagai default
```

### 5. **Query Scopes**

#### Get Default Signature

```php
Signature::default()->get();
// atau
Signature::where('is_default', true)->get();
```

#### Get by User

```php
Signature::byUser($userId)->get();
// atau
Signature::where('user_id', $userId)->get();
```

### 6. **Auto Delete File on Delete**

Ketika signature dihapus, file gambar juga otomatis dihapus:

```php
// File akan otomatis dihapus dari storage
$signature->delete();
```

## 💾 Storage Structure

File signature disimpan di:

```
storage/app/public/signatures/
├── user_{id}/
│   ├── signature_1.png
│   ├── signature_2.png
│   └── signature_3.png
```

**Path format:**

```
signatures/user_{user_id}/signature_{timestamp}.{ext}
```

## 🎨 Signature Types

### 1. **Manual (Drawn)**

User menggambar tanda tangan di canvas HTML5:

```php
Signature::create([
    'user_id' => $userId,
    'signature_path' => 'signatures/user_1/signature_123.png',
    'signature_type' => 'manual',
    'is_default' => true,
]);
```

### 2. **Uploaded**

User upload file gambar tanda tangan:

```php
Signature::create([
    'user_id' => $userId,
    'signature_path' => 'signatures/user_1/uploaded_123.png',
    'signature_type' => 'uploaded',
    'is_default' => false,
]);
```

## 🔒 Usage Examples

### Create Signature

```php
use App\Models\Signature;

// Create manual signature
$signature = Signature::create([
    'user_id' => auth()->id(),
    'signature_path' => $path,
    'signature_type' => 'manual',
    'is_default' => true,
]);

// Set as default
$signature->setAsDefault();
```

### Get User's Signatures

```php
// Get all signatures
$signatures = auth()->user()->signatures;

// Get default signature only
$defaultSignature = auth()->user()->defaultSignature;

// Get with query
$signatures = Signature::byUser(auth()->id())->get();
```

### Update Default Signature

```php
// Find signature by ID
$signature = Signature::find($signatureId);

// Set as default (others will be unset automatically)
$signature->setAsDefault();
```

### Delete Signature

```php
$signature = Signature::find($signatureId);

// Soft delete (file juga dihapus)
$signature->delete();

// Permanent delete
$signature->forceDelete();
```

## 🚀 Future Use Cases

### 1. **Approval dengan Signature**

```php
// Saat approve dokumen, attach signature
$approval->update([
    'approval_status' => 'approved',
    'signature_id' => auth()->user()->defaultSignature->id,
    'tgl_approve' => now(),
]);
```

### 2. **Multiple Signatures**

User bisa punya beberapa signature:

- Signature formal (untuk dokumen resmi)
- Signature informal (untuk dokumen internal)
- Signature dengan paraf

```php
$formalSignature = Signature::create([...]);
$informalSignature = Signature::create([...]);
```

### 3. **Signature Validation**

```php
// Validate signature exists and belongs to user
if ($signature->user_id !== auth()->id()) {
    abort(403, 'Unauthorized');
}
```

## ✅ Validation Rules

```php
// Saat create/update signature
$validated = $request->validate([
    'signature' => 'required|image|mimes:png,jpg,jpeg|max:2048', // Max 2MB
    'signature_type' => 'required|in:manual,uploaded',
    'is_default' => 'boolean',
]);
```

## 📊 Database Queries

### Count Signatures by User

```php
$count = Signature::byUser($userId)->count();
```

### Check if User has Default Signature

```php
$hasDefault = Signature::byUser($userId)->default()->exists();
```

### Get Latest Signature

```php
$latest = Signature::byUser($userId)
    ->latest()
    ->first();
```

## 🔐 Security Notes

1. **File Validation**: Selalu validasi file signature (type, size, extension)
2. **Path Security**: Gunakan Storage facade untuk handle file
3. **User Authorization**: Pastikan user hanya bisa akses signature miliknya
4. **Soft Delete**: Gunakan soft delete untuk audit trail

## 📝 Next Steps

1. ✅ Create Controller: `SignatureController`
2. ✅ Create Routes: CRUD untuk signature
3. ✅ Create Frontend: Canvas untuk draw signature + upload form
4. ✅ Integration: Link signature ke approval process
5. ✅ PDF Stamping: Embed signature ke PDF dokumen
