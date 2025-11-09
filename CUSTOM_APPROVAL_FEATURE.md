# Custom Approval Feature - User Dokumen

## Overview

Fitur baru yang memungkinkan user memilih antara menggunakan Masterflow yang sudah ada atau membuat Custom Approval Flow dengan input email approver dan tingkatan secara manual.

## Perubahan yang Dilakukan

### 1. **Removed: Input Transaksi**

- Menghapus field `transaksi` dari form
- Sekarang hanya fokus pada Masterflow untuk approval flow

### 2. **New Feature: Masterflow Type Selection**

User sekarang bisa memilih 2 tipe approval:

#### A. **Existing Masterflow** (Default)

- Menggunakan masterflow yang sudah ada di sistem
- Otomatis mengambil approval steps dan jabatan dari masterflow
- User memilih approver berdasarkan jabatan yang sudah ditentukan

#### B. **Custom Approval**

- User bisa input email approver secara manual
- User bisa mengatur tingkatan/urutan approval sendiri
- Fleksibel untuk approval flow yang tidak standar
- Bisa menambah/mengurangi approver sesuai kebutuhan

## Interface Changes

### Updated FormData Interface

```typescript
interface CustomApprover {
    email: string; // Email approver
    order: number; // Tingkat/urutan approval (1, 2, 3, dst)
}

interface FormData {
    nomor_dokumen: string;
    judul_dokumen: string;
    masterflow_type: 'existing' | 'custom'; // NEW: Tipe masterflow
    masterflow_id: number | '';
    tgl_pengajuan: string;
    tgl_deadline: string;
    company: string;
    // REMOVED: transaksi: string;
    deskripsi: string;
    file: File | null;
    approvers: Record<number, number | ''>; // Untuk existing masterflow
    custom_approvers: CustomApprover[]; // NEW: Untuk custom approval
}
```

### Initial Form State

```typescript
const initialFormData: FormData = {
    nomor_dokumen: '',
    judul_dokumen: '',
    masterflow_type: 'existing', // Default ke existing masterflow
    masterflow_id: '',
    tgl_pengajuan: new Date().toISOString().split('T')[0],
    tgl_deadline: '',
    company: '',
    deskripsi: '',
    file: null,
    approvers: {},
    custom_approvers: [{ email: '', order: 1 }], // Default 1 approver
};
```

## New Functions

### 1. handleMasterflowTypeChange()

```typescript
const handleMasterflowTypeChange = (value: 'existing' | 'custom') => {
    setFormData((prev) => ({
        ...prev,
        masterflow_type: value,
        masterflow_id: '',
        approvers: {},
        custom_approvers: value === 'custom' ? [{ email: '', order: 1 }] : [],
    }));
    setSelectedMasterflow(null);
    setAvailableApprovers({});
};
```

- Mengubah tipe masterflow
- Reset approvers dan custom_approvers
- Clear selected masterflow

### 2. handleCustomApproverChange()

```typescript
const handleCustomApproverChange = (index: number, field: 'email' | 'order', value: string | number) => {
    setFormData((prev) => {
        const newCustomApprovers = [...prev.custom_approvers];
        newCustomApprovers[index] = {
            ...newCustomApprovers[index],
            [field]: value,
        };
        return {
            ...prev,
            custom_approvers: newCustomApprovers,
        };
    });
};
```

- Update email atau order dari custom approver
- Menggunakan array index untuk update specific approver

### 3. addCustomApprover()

```typescript
const addCustomApprover = () => {
    setFormData((prev) => ({
        ...prev,
        custom_approvers: [...prev.custom_approvers, { email: '', order: prev.custom_approvers.length + 1 }],
    }));
};
```

- Menambah approver baru ke list
- Auto increment order number

### 4. removeCustomApprover()

```typescript
const removeCustomApprover = (index: number) => {
    setFormData((prev) => ({
        ...prev,
        custom_approvers: prev.custom_approvers.filter((_, i) => i !== index).map((approver, idx) => ({ ...approver, order: idx + 1 })),
    }));
};
```

- Menghapus approver dari list
- Re-order approver setelah dihapus (1, 2, 3, ...)
- Minimal 1 approver harus ada

## UI Components

### 1. Masterflow Type Selector

```jsx
<Select value={formData.masterflow_type} onValueChange={handleMasterflowTypeChange}>
    <SelectTrigger className="font-sans">
        <SelectValue placeholder="Pilih tipe approval" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="existing">Gunakan Masterflow yang Ada</SelectItem>
        <SelectItem value="custom">Custom Approval</SelectItem>
    </SelectContent>
</Select>
```

### 2. Existing Masterflow UI (Conditional)

Muncul hanya jika `masterflow_type === 'existing'`:

- Dropdown untuk pilih masterflow
- Table approval steps dengan jabatan
- Dropdown untuk pilih approver per step
- Badge urutan approval

### 3. Custom Approval UI (Conditional)

Muncul hanya jika `masterflow_type === 'custom'`:

```
┌──────────────────────────────────────────────────────────────┐
│ Custom Approval Flow              [+ Tambah Approver]       │
├──────────────────────────────────────────────────────────────┤
│ [1] │ Email Approver: [input]      │ Tingkat: [1] │ [X]     │
│ [2] │ Email Approver: [input]      │ Tingkat: [2] │ [X]     │
│ [3] │ Email Approver: [input]      │ Tingkat: [3] │ [X]     │
└──────────────────────────────────────────────────────────────┘
* Masukkan email approver dan atur tingkat persetujuan
```

**Features:**

- **Step Number Badge**: Circular badge dengan nomor urut (1, 2, 3...)
- **Email Input**: Input field untuk email approver
- **Tingkat/Order Input**: Number input untuk mengatur urutan approval
- **Remove Button**: Button X merah untuk hapus approver (min 1 approver)
- **Add Button**: Button hijau di header untuk tambah approver baru

### Layout Details

#### Custom Approver Row Layout

```
Grid: [80px | 1fr | 100px | 40px]
      [Badge | Email Input | Order Input | Delete Btn]
```

- **80px**: Step number badge
- **1fr**: Email input (flexible width)
- **100px**: Order/tingkat input
- **40px**: Delete button (trash icon)

## Form Flow

### Flow 1: Existing Masterflow

1. User pilih "Gunakan Masterflow yang Ada"
2. Dropdown masterflow muncul
3. User pilih masterflow
4. System fetch approval steps
5. System fetch available approvers per jabatan
6. Table approval muncul dengan dropdown approvers
7. User pilih approver untuk setiap step
8. Submit

### Flow 2: Custom Approval

1. User pilih "Custom Approval"
2. Custom approver form muncul (default 1 approver)
3. User input email approver pertama
4. User set tingkat/order (default 1)
5. (Optional) User klik "Tambah Approver" untuk approver tambahan
6. User input email dan tingkat untuk setiap approver
7. (Optional) User hapus approver yang tidak diperlukan
8. Submit

## Validation Requirements (Backend)

### For Existing Masterflow:

```php
- masterflow_id: required|exists:masterflows,id
- approvers: required|array
- approvers.*: required|exists:users,id
- All masterflow steps must have assigned approvers
```

### For Custom Approval:

```php
- custom_approvers: required|array|min:1
- custom_approvers.*.email: required|email
- custom_approvers.*.order: required|integer|min:1
- Emails should be validated (exist in users table or valid format)
- Orders should be unique or handled sequentially
```

## Backend Implementation Needed

### 1. Update DokumenController@store()

```php
public function store(Request $request)
{
    // Validate based on masterflow_type
    if ($request->masterflow_type === 'existing') {
        $validated = $request->validate([
            'judul_dokumen' => 'required|string|max:255',
            'masterflow_id' => 'required|exists:masterflows,id',
            'tgl_deadline' => 'required|date',
            'approvers' => 'required|array',
            // ... other fields
        ]);

        // Create dokumen with existing masterflow
        // Create DokumenApproval records based on approvers mapping

    } else if ($request->masterflow_type === 'custom') {
        $validated = $request->validate([
            'judul_dokumen' => 'required|string|max:255',
            'tgl_deadline' => 'required|date',
            'custom_approvers' => 'required|array|min:1',
            'custom_approvers.*.email' => 'required|email',
            'custom_approvers.*.order' => 'required|integer|min:1',
            // ... other fields
        ]);

        // Create dokumen without masterflow_id (or with null)
        // Create DokumenApproval records based on custom_approvers
        // Look up user_id from email or create temporary approval records
    }
}
```

### 2. Database Schema Considerations

#### Option A: Store custom approvals in existing DokumenApproval table

```sql
dokumen_approvals:
- id
- dokumen_id
- user_id (nullable - for custom approvals by email)
- approver_email (new - for custom approvals)
- masterflow_step_id (nullable - only for existing masterflow)
- approval_order (new - for custom approval ordering)
- approval_status
- tgl_deadline
```

#### Option B: Create separate custom_approvals table

```sql
custom_approvals:
- id
- dokumen_id
- approver_email
- approval_order
- approval_status
- tgl_approve
- tgl_deadline
```

## Testing Checklist

### Existing Masterflow

- [ ] Select "Gunakan Masterflow yang Ada"
- [ ] Dropdown masterflow appears
- [ ] Select masterflow populates approval steps
- [ ] Approver dropdowns show correct users per jabatan
- [ ] Can select approvers for all steps
- [ ] Submit creates dokumen with approvals

### Custom Approval

- [ ] Select "Custom Approval"
- [ ] Custom form appears with 1 default approver
- [ ] Can input email for approver
- [ ] Can set order/tingkat
- [ ] Click "Tambah Approver" adds new row
- [ ] New approver has auto-incremented order
- [ ] Can remove approvers (min 1 remains)
- [ ] Order re-calculates after removal
- [ ] Submit creates dokumen with custom approvals

### Edge Cases

- [ ] Switch between types clears previous data
- [ ] Cannot submit without required fields
- [ ] Email validation works
- [ ] Order must be positive integer
- [ ] Cannot remove last approver
- [ ] Form resets correctly when dialog closes

## User Benefits

### 1. **Flexibility**

- Users tidak terikat dengan masterflow yang sudah ada
- Bisa membuat approval flow ad-hoc untuk kasus khusus

### 2. **Simplicity**

- Hanya perlu input email, tidak perlu create masterflow baru
- Cocok untuk dokumen yang jarang digunakan

### 3. **Speed**

- Tidak perlu koordinasi dengan admin untuk buat masterflow baru
- Langsung bisa assign approver by email

### 4. **Control**

- User punya kontrol penuh atas approval flow
- Bisa atur urutan sesuai kebutuhan spesifik dokumen

## Next Steps

1. **Backend Implementation**:
    - Update `DokumenController@store()` to handle both masterflow types
    - Add validation for custom_approvers
    - Create DokumenApproval records based on type
    - Handle email lookup for custom approvers

2. **Email Notification**:
    - Send approval request to custom approvers
    - Email should contain approval link or instructions

3. **Approval Page**:
    - Support approval via email link (for users not in system)
    - Or require custom approvers to have accounts

4. **Testing**:
    - Unit tests for both approval types
    - Integration tests for complete flow
    - UI tests for form interactions

5. **Documentation**:
    - Update user guide
    - Add examples of when to use each type
    - Admin documentation for monitoring custom approvals

## Files Modified

- `resources/js/pages/user/dokumen.tsx` - Main form component with custom approval UI

## Summary

Fitur ini memberikan fleksibilitas kepada user untuk memilih antara:

- **Existing Masterflow**: Proses approval standar dengan jabatan dan user yang sudah terdaftar
- **Custom Approval**: Proses approval fleksibel dengan input email dan tingkatan manual

User experience menjadi lebih baik karena tidak terbatas pada masterflow yang sudah ada, terutama untuk dokumen-dokumen yang memerlukan approval flow khusus atau satu kali pakai.
