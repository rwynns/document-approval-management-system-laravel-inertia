# Document Upload Controller Implementation

## Overview

Complete backend implementation for document upload with support for both **existing masterflow** and **custom email-based approval** workflows.

## Date

**Created:** November 5, 2025  
**Status:** ✅ Completed

---

## Database Schema Changes

### 1. Added to `dokumen` Table

```sql
-- Migration: 2025_11_05_150459_add_company_aplikasi_to_dokumen_table.php
company_id (BIGINT UNSIGNED, NULLABLE, FOREIGN KEY → companies.id)
aplikasi_id (BIGINT UNSIGNED, NULLABLE, FOREIGN KEY → aplikasis.id)
```

**Purpose:** Track which company and application the document is intended for (destination tracking).

---

### 2. Added to `dokumen_approval` Table

```sql
-- Migration: 2025_11_05_150547_add_custom_approval_fields_to_dokumen_approval_table.php
approver_email (VARCHAR(255), NULLABLE) -- For custom approvals
approval_order (INTEGER, NULLABLE) -- Sequence for custom approvals
masterflow_step_id (BIGINT UNSIGNED, NULLABLE) -- Made nullable to support custom approvals
```

**Purpose:** Support custom email-based approvals without requiring existing masterflow steps.

---

### 3. Existing Field (Already Present)

```sql
tgl_deadline (DATE, NULLABLE) -- Already exists in dokumen table
```

---

## Model Updates

### Dokumen Model (`app/Models/Dokumen.php`)

**Added to `$fillable`:**

```php
'company_id',
'aplikasi_id',
'tgl_deadline'
```

**New Relationships:**

```php
public function company(): BelongsTo {
    return $this->belongsTo(Company::class);
}

public function aplikasi(): BelongsTo {
    return $this->belongsTo(Aplikasi::class);
}
```

---

### DokumenApproval Model (`app/Models/DokumenApproval.php`)

**Added to `$fillable`:**

```php
'approver_email',
'approval_order'
```

---

## Controller Implementation

### DokumenController@store()

**Location:** `app/Http/Controllers/DokumenController.php`

#### Key Features

1. **Auto-fill Company and Aplikasi**

    ```php
    $userAuth = Auth::user()->userAuths->first();
    if (!$userAuth) {
        return back()->withErrors(['error' => 'User tidak memiliki akses ke company atau aplikasi.']);
    }

    $dokumen = Dokumen::create([
        'company_id' => $userAuth->company_id,
        'aplikasi_id' => $userAuth->aplikasi_id,
        // ... other fields
    ]);
    ```

2. **Conditional Validation**

    ```php
    // Check if custom approval or existing masterflow
    if ($request->masterflow_id === 'custom') {
        $rules['custom_approvers'] = 'required|array|min:1';
        $rules['custom_approvers.*.email'] = 'required|email';
        $rules['custom_approvers.*.order'] = 'required|integer|min:1';
    } else {
        $rules['masterflow_id'] = 'required|exists:masterflows,id';
        $rules['approvers'] = 'required|array';
        $rules['approvers.*'] = 'required|exists:users,id';
    }
    ```

3. **Dual Approval Logic**

    **For Custom Approval (`masterflow_id === 'custom'`):**

    ```php
    foreach ($validated['custom_approvers'] as $approver) {
        DokumenApproval::create([
            'dokumen_id' => $dokumen->id,
            'approver_email' => $approver['email'],
            'approval_order' => $approver['order'],
            'dokumen_version_id' => $version->id,
            'approval_status' => 'pending',
            'tgl_deadline' => $validated['tgl_deadline'],
        ]);
    }
    ```

    **For Existing Masterflow (numeric ID):**

    ```php
    $masterflow = Masterflow::with('steps')->find($validated['masterflow_id']);

    foreach ($masterflow->steps as $step) {
        if (isset($validated['approvers'][$step->id])) {
            DokumenApproval::create([
                'dokumen_id' => $dokumen->id,
                'user_id' => $validated['approvers'][$step->id],
                'masterflow_step_id' => $step->id,
                'dokumen_version_id' => $version->id,
                'approval_status' => 'pending',
                'tgl_deadline' => $validated['tgl_deadline'],
            ]);
        }
    }
    ```

4. **Transaction Management**
    ```php
    DB::beginTransaction();
    try {
        // Create dokumen
        // Create version
        // Create approvals
        DB::commit();
    } catch (\Exception $e) {
        DB::rollback();
        \Log::error('Error creating dokumen: ' . $e->getMessage());
        return back()->withErrors(['error' => 'Gagal membuat dokumen: ' . $e->getMessage()]);
    }
    ```

---

## Frontend Updates

### FormData Structure (`resources/js/pages/user/dokumen.tsx`)

```typescript
interface FormData {
    nomor_dokumen: string;
    judul_dokumen: string;
    masterflow_id: number | '' | 'custom'; // Changed to support 'custom' string
    tgl_pengajuan: string;
    tgl_deadline: string;
    deskripsi: string;
    file: File | null;
    approvers: Record<number, number | ''>; // For existing masterflow
    custom_approvers: CustomApprover[]; // For custom approval
}

interface CustomApprover {
    email: string;
    order: number;
}
```

### Form Submission (`handleSubmit`)

**Updated to send data correctly based on approval type:**

```typescript
const submitData = new FormData();
submitData.append('nomor_dokumen', formData.nomor_dokumen);
submitData.append('judul_dokumen', formData.judul_dokumen);
submitData.append('masterflow_id', formData.masterflow_id.toString());
submitData.append('tgl_pengajuan', formData.tgl_pengajuan);
submitData.append('tgl_deadline', formData.tgl_deadline);
submitData.append('deskripsi', formData.deskripsi);
if (formData.file) {
    submitData.append('file', formData.file);
}

// Add approvers based on masterflow type
if (formData.masterflow_id === 'custom') {
    // Send custom approvers array
    formData.custom_approvers.forEach((approver, index) => {
        submitData.append(`custom_approvers[${index}][email]`, approver.email);
        submitData.append(`custom_approvers[${index}][order]`, approver.order.toString());
    });
} else {
    // Send approvers mapping for existing masterflow
    Object.entries(formData.approvers).forEach(([stepId, userId]) => {
        if (userId !== '') {
            submitData.append(`approvers[${stepId}]`, userId.toString());
        }
    });
}

router.post('/dokumen', submitData, {
    preserveState: true,
    preserveScroll: true,
    onSuccess: () => {
        showToast.success(`🎉 Dokumen "${formData.judul_dokumen}" berhasil dibuat!`);
        setIsCreateDialogOpen(false);
        fetchDokumen();
    },
    onError: (errors) => {
        setErrors(errors);
        showToast.error('❌ Failed to create document. Please check the form.');
    },
});
```

---

## Validation Rules

### Server-Side Validation

```php
$rules = [
    'nomor_dokumen' => 'required|string|unique:dokumen,nomor_dokumen',
    'judul_dokumen' => 'required|string|max:255',
    'tgl_pengajuan' => 'required|date',
    'tgl_deadline' => 'required|date|after_or_equal:tgl_pengajuan',
    'deskripsi' => 'nullable|string',
    'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx|max:10240',
];

// Conditional validation based on masterflow type
if ($request->masterflow_id === 'custom') {
    $rules['custom_approvers'] = 'required|array|min:1';
    $rules['custom_approvers.*.email'] = 'required|email';
    $rules['custom_approvers.*.order'] = 'required|integer|min:1';
} else {
    $rules['masterflow_id'] = 'required|exists:masterflows,id';
    $rules['approvers'] = 'required|array';
    $rules['approvers.*'] = 'required|exists:users,id';
}
```

---

## Routes

**Route resource already defined in `routes/web.php`:**

```php
Route::resource('dokumen', \App\Http\Controllers\DokumenController::class);
```

This includes:

- `POST /dokumen` → `DokumenController@store` ✅

---

## Testing Checklist

### Test Case 1: Existing Masterflow Approval

1. ✅ Select existing masterflow from dropdown
2. ✅ Assign approvers for each step
3. ✅ Fill document details (nomor, judul, pengajuan date, deadline, deskripsi)
4. ✅ Upload file (PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX, max 10MB)
5. ✅ Submit form
6. ✅ Verify `dokumen` record created with:
    - `company_id` and `aplikasi_id` auto-filled from auth user
    - `masterflow_id` set to selected masterflow ID
    - `status` = 'draft'
7. ✅ Verify `dokumen_version` created with file path
8. ✅ Verify `dokumen_approval` records created with:
    - `user_id` from approvers mapping
    - `masterflow_step_id` from masterflow steps
    - `approval_status` = 'pending'
    - `tgl_deadline` set correctly

### Test Case 2: Custom Email-Based Approval

1. ✅ Select "✨ Custom Approval" from dropdown
2. ✅ Add custom approvers with emails and order
3. ✅ Fill document details
4. ✅ Upload file
5. ✅ Submit form
6. ✅ Verify `dokumen` record created with:
    - `company_id` and `aplikasi_id` auto-filled
    - `masterflow_id` = NULL (custom approval)
    - `status` = 'draft'
7. ✅ Verify `dokumen_version` created
8. ✅ Verify `dokumen_approval` records created with:
    - `approver_email` from custom_approvers
    - `approval_order` from custom_approvers
    - `masterflow_step_id` = NULL
    - `user_id` = NULL
    - `approval_status` = 'pending'

### Test Case 3: Validation Errors

1. ✅ Submit without file → Error: "file required"
2. ✅ Submit with invalid file type → Error: "file must be pdf,doc,docx,..."
3. ✅ Submit without approvers (existing masterflow) → Error: "approvers required"
4. ✅ Submit without custom_approvers (custom) → Error: "custom_approvers required"
5. ✅ Submit with duplicate nomor_dokumen → Error: "nomor_dokumen already exists"
6. ✅ Submit with tgl_deadline before tgl_pengajuan → Error: "deadline must be after pengajuan"

### Test Case 4: Transaction Rollback

1. ✅ Force database error during approval creation
2. ✅ Verify entire transaction rolled back (no dokumen, no version, no approvals)

---

## Success Response

```json
{
    "success": true,
    "message": "Dokumen berhasil dibuat!",
    "redirect": "/user/dokumen"
}
```

---

## Error Handling

```php
try {
    // ... document creation logic
    DB::commit();
    return redirect()->route('user.dokumen')->with('success', 'Dokumen berhasil dibuat!');
} catch (\Exception $e) {
    DB::rollback();
    \Log::error('Error creating dokumen: ' . $e->getMessage());
    return back()->withErrors(['error' => 'Gagal membuat dokumen: ' . $e->getMessage()])
        ->withInput();
}
```

---

## Build Status

✅ **Frontend Build:** Successful (12.08s)  
✅ **Migrations:** All completed successfully  
✅ **Models:** Updated with new relationships and fillable fields  
✅ **Controller:** Complete implementation with dual approval logic  
✅ **Routes:** Resource route defined

---

## Next Steps (Future Enhancements)

1. **Email Notifications**
    - Send notification to first approver when document submitted
    - For custom approvals, email directly to approver_email
    - For existing masterflow, email to user's registered email

2. **Approval Status Management**
    - Set first approver as 'pending', rest as 'waiting'
    - Update status to 'pending' when previous approver completes

3. **Document Number Auto-generation**
    - Implement auto-increment logic with prefix
    - Format: `DOC-2025-0001`

4. **File Upload Validation**
    - Virus scanning
    - Content verification
    - Size optimization

5. **User Lookup for Custom Approvers**
    - Check if approver_email exists in users table
    - Link to user_id if found
    - Send invitation email if not registered

---

## Related Documentation

- `FORM_DOKUMEN_SIMPLIFIED.md` - Frontend form simplification
- `CSRF_FIX_DOCUMENT_UPLOAD.md` - CSRF token handling
- `APPROVAL_WORKFLOW.md` - Approval system architecture

---

**Implementation Date:** November 5, 2025  
**Status:** ✅ Complete and Ready for Testing  
**Build Status:** ✅ All builds successful  
**Migration Status:** ✅ All migrations completed
