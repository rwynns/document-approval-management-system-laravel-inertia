# Digital Signature Management System

## Overview

Sistem manajemen tanda tangan digital yang terintegrasi dengan halaman Profile, memungkinkan semua role user (User, Admin, Super Admin) untuk mengelola tanda tangan digital mereka yang akan digunakan dalam proses approval dokumen.

## Features

### 1. **Multi-Method Signature Creation**

- **Draw Signature**: Menggambar tanda tangan langsung di canvas dengan mouse atau touch
- **Upload Signature**: Upload file gambar tanda tangan (PNG, JPG, JPEG)

### 2. **Signature Management**

- Multiple signatures per user
- Set default signature
- Delete signatures
- View all saved signatures

### 3. **Storage & Security**

- File storage: `storage/app/public/signatures/user_{id}/`
- Authorized access only (user_id validation)
- Soft delete with automatic file cleanup
- File size limit: 2MB
- Supported formats: PNG, JPG, JPEG

## Database Structure

### Table: `signatures`

```sql
id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
user_id             BIGINT UNSIGNED (FK to users.id, CASCADE DELETE)
signature_path      VARCHAR(255) - Path to signature file
signature_type      VARCHAR(255) - 'manual' (canvas) or 'uploaded' (file)
is_default          BOOLEAN - Only one default per user
created_at          TIMESTAMP
updated_at          TIMESTAMP
deleted_at          TIMESTAMP (soft delete)

INDEXES:
- user_id
- user_id, is_default (composite)
```

## Backend Architecture

### Model: `app/Models/Signature.php`

**Mass Assignable:**

- `user_id`
- `signature_path`
- `signature_type`
- `is_default`

**Relationships:**

```php
belongsTo(User::class)
```

**Accessors:**

```php
signature_url    // Returns Storage::url($signature_path)
full_path        // Returns Storage::path($signature_path)
```

**Methods:**

```php
setAsDefault()   // Unsets other signatures, sets current as default
```

**Query Scopes:**

```php
default()        // Get default signature
byUser($userId)  // Get signatures by user ID
```

**Features:**

- Soft deletes enabled
- Auto-delete file on model deletion (boot event)
- Automatic default management

### Controller: `app/Http/Controllers/SignatureController.php`

**Endpoints:**

#### 1. GET `/signatures` (index)

```php
Returns: { signatures: Signature[] }
Order: is_default DESC, created_at DESC
Auth: Required
```

#### 2. POST `/signatures` (store)

```php
Request:
{
    signature: string (base64 data URL),
    signature_type: 'manual',
    is_default: boolean
}

Process:
1. Decode base64 string
2. Extract image data from data:image/png;base64,{data}
3. Generate filename: signature_{timestamp}_{random}.png
4. Store in: signatures/user_{auth_id}/filename
5. Create Signature record
6. Auto-call setAsDefault() if is_default=true

Response: 201 { signature: Signature }
```

#### 3. POST `/signatures/upload` (upload)

```php
Request (FormData):
{
    signature_file: File,
    signature_type: 'uploaded',
    is_default: boolean
}

Validation:
- image|mimes:png,jpg,jpeg|max:2048

Process:
1. Validate file
2. Generate filename: uploaded_{timestamp}_{random}.{ext}
3. Store via storeAs()
4. Create Signature record
5. Auto-call setAsDefault() if is_default=true

Response: 201 { signature: Signature }
```

#### 4. POST `/signatures/{signature}/set-default` (setDefault)

```php
Authorization: signature->user_id === Auth::id()

Process:
1. Check authorization
2. Call $signature->setAsDefault()

Response: 200 { signature: Signature }
```

#### 5. DELETE `/signatures/{signature}` (destroy)

```php
Authorization: signature->user_id === Auth::id()

Process:
1. Check authorization
2. If deleting default, auto-reassign another as default
3. Soft delete (file auto-deleted via model event)

Response: 200 { message: 'success' }
```

## Frontend Architecture

### Component: `resources/js/components/signature-manager.tsx`

**Features:**

1. **Canvas Drawing**
    - Size: 600x200 pixels
    - Touch & mouse support
    - Clear canvas function
    - Black stroke (#000000), 2px width
    - Round line cap & join

2. **File Upload**
    - File type validation (image/\*)
    - File size validation (max 2MB)
    - Preview selected file
    - Reset input after upload

3. **Signature List**
    - Grid layout (3 columns on desktop)
    - Badge: Type (Drawn/Uploaded)
    - Badge: Default marker
    - Signature preview image
    - Actions: Set Default, Delete

**State Management:**

```typescript
isDrawing: boolean         // Canvas drawing state
signatures: Signature[]    // All user signatures
loading: boolean           // API call loading state
uploadFile: File | null    // Selected file for upload
```

**API Integration:**

- Uses `fetch()` with route() helper
- CSRF token from meta tag
- Error handling with showToast
- Auto-refresh signatures after mutations

### Page Integration: `resources/js/pages/settings/profile.tsx`

**Structure:**

```tsx
<SettingsLayout>
    {/* Profile Information Section */}
    <div>
        <HeadingSmall title="Profile information" />
        <Form>...</Form>
    </div>

    {/* Digital Signature Section */}
    <div>
        <HeadingSmall title="Digital Signature" />
        <SignatureManager />
    </div>

    {/* Delete Account Section */}
    <DeleteUser />
</SettingsLayout>
```

## Routes

### Web Routes (routes/web.php)

```php
Route::middleware('auth')->group(function () {
    // Signatures
    Route::get('signatures', [SignatureController::class, 'index'])
        ->name('signatures.index');
    Route::post('signatures', [SignatureController::class, 'store'])
        ->name('signatures.store');
    Route::post('signatures/upload', [SignatureController::class, 'upload'])
        ->name('signatures.upload');
    Route::post('signatures/{signature}/set-default', [SignatureController::class, 'setDefault'])
        ->name('signatures.setDefault');
    Route::delete('signatures/{signature}', [SignatureController::class, 'destroy'])
        ->name('signatures.destroy');
});
```

## User Workflow

### Creating Signature (Canvas)

1. User navigates to Profile → Digital Signature
2. Tabs to "Draw Signature"
3. Draws signature on canvas
4. Clicks "Save Signature"
5. Signature saved with type='manual'
6. Canvas cleared
7. Signature appears in list

### Creating Signature (Upload)

1. User navigates to Profile → Digital Signature
2. Tabs to "Upload Signature"
3. Clicks file input
4. Selects image file (PNG/JPG/JPEG, max 2MB)
5. File preview shown
6. Clicks "Upload Signature"
7. Signature saved with type='uploaded'
8. File input reset
9. Signature appears in list

### Managing Signatures

1. **View All Signatures**: Displayed in grid with badges
2. **Set Default**: Click "Set as Default" button
    - Only non-default signatures show this button
    - Default badge appears on selected signature
3. **Delete Signature**: Click trash icon
    - Confirmation dialog shown
    - If deleting default, another signature auto-becomes default
    - File automatically deleted from storage

## Integration with Approval System

### Planned Usage

When approving a document:

1. User clicks "Approve" on document
2. System fetches user's default signature
3. Default signature applied to PDF document
4. Signed PDF stored as new version
5. Approval status updated

## Access Control

### Role-Based Access

- **User**: Can manage their own signatures ✅
- **Admin**: Can manage their own signatures ✅
- **Super Admin**: Can manage their own signatures ✅

### Authorization Rules

- All endpoints require authentication (`auth` middleware)
- Signature ownership checked in controller:
    ```php
    if ($signature->user_id !== Auth::id()) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }
    ```

## File Management

### Storage Configuration

```php
// config/filesystems.php
'public' => [
    'driver' => 'local',
    'root' => storage_path('app/public'),
    'url' => env('APP_URL').'/storage',
    'visibility' => 'public',
],
```

### Storage Link

```bash
php artisan storage:link
```

Creates symlink: `public/storage` → `storage/app/public`

### File Path Structure

```
storage/app/public/
└── signatures/
    ├── user_1/
    │   ├── signature_1234567890_abc123.png
    │   └── uploaded_1234567891_def456.jpg
    ├── user_2/
    │   └── signature_1234567892_ghi789.png
    └── user_3/
        └── uploaded_1234567893_jkl012.png
```

### Auto-Cleanup

File automatically deleted when:

- Signature model soft deleted
- Via `boot()` method in Signature model:
    ```php
    static::deleting(function ($signature) {
        Storage::disk('public')->delete($signature->signature_path);
    });
    ```

## Testing Checklist

### Backend Tests

- [ ] Create manual signature (base64)
- [ ] Upload signature file
- [ ] Set signature as default
- [ ] Delete signature
- [ ] Delete default signature (auto-reassign)
- [ ] Authorization checks (own signatures only)
- [ ] File validation (type, size)
- [ ] File cleanup on delete

### Frontend Tests

- [ ] Draw signature on canvas
- [ ] Clear canvas
- [ ] Upload file
- [ ] File type validation
- [ ] File size validation
- [ ] Display signatures list
- [ ] Set default badge
- [ ] Delete signature
- [ ] Toast notifications
- [ ] Responsive layout

### Integration Tests

- [ ] Profile page shows signature section
- [ ] All roles can access signature management
- [ ] Signature persists after page refresh
- [ ] Default signature loads correctly
- [ ] Multiple signatures per user

## Future Enhancements

1. **PDF Integration**
    - Apply signature to PDF documents
    - Signature positioning on PDF
    - Multi-signature documents

2. **Signature Templates**
    - Pre-designed signature styles
    - Font-based signatures
    - Signature editor

3. **Signature Verification**
    - Digital certificate integration
    - Timestamp verification
    - Signature metadata

4. **Advanced Features**
    - Signature expiration
    - Signature categories
    - Signature sharing (team signatures)
    - Audit trail for signature usage

## Troubleshooting

### Common Issues

1. **"Failed to save signature"**
    - Check storage disk is writable
    - Verify storage link exists
    - Check file permissions

2. **"File size too large"**
    - Max 2MB limit
    - Compress image before upload

3. **"Unauthorized" error**
    - User trying to modify another user's signature
    - Check authentication status

4. **Signature not showing**
    - Verify storage link: `php artisan storage:link`
    - Check APP_URL in .env
    - Clear browser cache

## Related Documentation

- See `SIGNATURE_MODEL_DOCS.md` for detailed model documentation
- See `APPROVAL_SYSTEM_DOCS.md` for approval workflow integration
- See migration file `database/migrations/2025_11_11_144222_create_signatures_table.php`
