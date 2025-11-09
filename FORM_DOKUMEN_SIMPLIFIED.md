# Form Dokumen Update - Simplified

## Perubahan Terbaru

### 1. **Removed: Input Company**

- Field `company` dihapus dari form
- Company akan **otomatis diambil dari user yang login** (auth.user.company)
- Backend akan mengisi `company_id` otomatis dari user session

### 2. **Removed: Dropdown "Tipe Approval"**

- Tidak ada lagi pemilihan terpisah untuk "Gunakan Masterflow" vs "Custom"
- Semuanya digabung dalam **satu dropdown Masterflow**

### 3. **Updated: Masterflow Dropdown**

Dropdown Masterflow sekarang berisi:

```
┌────────────────────────────────┐
│ Pilih masterflow              │
├────────────────────────────────┤
│ Masterflow Cuti               │
│ Masterflow Keuangan           │
│ Masterflow Pengadaan          │
├────────────────────────────────┤
│ ✨ Custom Approval  (primary) │
└────────────────────────────────┘
```

**Fitur:**

- Semua masterflow yang tersedia ditampilkan pertama
- Opsi **"✨ Custom Approval"** di bagian bawah dengan styling berbeda (text-primary, font-medium)
- Value untuk custom = `'custom'` (string literal)

## Interface Changes

### Updated FormData Interface

```typescript
interface FormData {
    nomor_dokumen: string;
    judul_dokumen: string;
    masterflow_id: number | '' | 'custom'; // UPDATED: bisa 'custom'
    tgl_pengajuan: string;
    tgl_deadline: string;
    // REMOVED: company: string;
    // REMOVED: masterflow_type: 'existing' | 'custom';
    deskripsi: string;
    file: File | null;
    approvers: Record<number, number | ''>;
    custom_approvers: CustomApprover[];
}
```

### Simplified Initial State

```typescript
const initialFormData: FormData = {
    nomor_dokumen: '',
    judul_dokumen: '',
    masterflow_id: '', // Bisa diisi dengan number ID atau 'custom'
    tgl_pengajuan: new Date().toISOString().split('T')[0],
    tgl_deadline: '',
    deskripsi: '',
    file: null,
    approvers: {},
    custom_approvers: [{ email: '', order: 1 }],
};
```

## Updated Functions

### handleMasterflowChange() - Single Handler

```typescript
const handleMasterflowChange = async (value: string) => {
    // Check if user selected 'custom'
    if (value === 'custom') {
        setFormData((prev) => ({
            ...prev,
            masterflow_id: 'custom',
            approvers: {},
            custom_approvers: [{ email: '', order: 1 }],
        }));
        setSelectedMasterflow(null);
        setAvailableApprovers({});
        return;
    }

    // Handle existing masterflow selection
    const masterflowId = Number(value);
    setFormData((prev) => ({
        ...prev,
        masterflow_id: masterflowId,
        approvers: {},
        custom_approvers: [], // Clear custom approvers
    }));

    // Fetch masterflow steps and available approvers...
};
```

**Logic:**

1. Cek apakah `value === 'custom'`
2. Jika custom: set `masterflow_id = 'custom'`, init custom_approvers, clear approvers
3. Jika bukan: convert ke number, fetch steps, fetch approvers, clear custom_approvers

### REMOVED: handleMasterflowTypeChange()

Tidak diperlukan lagi karena tidak ada dropdown terpisah untuk tipe.

## UI Components

### 1. Masterflow Dropdown (Updated)

```tsx
<Select value={formData.masterflow_id === '' ? '' : formData.masterflow_id.toString()} onValueChange={handleMasterflowChange}>
    <SelectTrigger className={errors.masterflow_id ? 'border-red-500 font-sans' : 'font-sans'}>
        <SelectValue placeholder="Pilih masterflow" />
    </SelectTrigger>
    <SelectContent>
        {/* Existing masterflows */}
        {masterflows.map((mf) => (
            <SelectItem key={mf.id} value={mf.id.toString()} className="font-sans">
                {mf.name}
            </SelectItem>
        ))}

        {/* Custom option with special styling */}
        <SelectItem value="custom" className="text-primary font-sans font-medium">
            ✨ Custom Approval
        </SelectItem>
    </SelectContent>
</Select>
```

**Styling:**

- Custom option: `font-medium text-primary` untuk highlight
- Icon ✨ untuk visual distinction
- Muncul di bawah semua masterflow

### 2. Conditional Rendering

#### Existing Masterflow UI

```tsx
{
    formData.masterflow_id !== '' &&
        formData.masterflow_id !== 'custom' &&
        selectedMasterflow &&
        selectedMasterflow.steps &&
        selectedMasterflow.steps.length > 0 && (
            <div className="border-border bg-muted/30 grid gap-4 rounded-lg border p-4">{/* Approval steps table */}</div>
        );
}
```

**Conditions:**

- `masterflow_id !== ''` - Ada yang dipilih
- `masterflow_id !== 'custom'` - Bukan custom
- `selectedMasterflow` exists
- Has steps

#### Custom Approval UI

```tsx
{
    formData.masterflow_id === 'custom' && (
        <div className="border-border bg-muted/30 grid gap-4 rounded-lg border p-4">{/* Custom approvers form */}</div>
    );
}
```

**Condition:**

- Hanya cek `masterflow_id === 'custom'`

## Form Layout (Simplified)

```
┌─────────────────────────────────────────────────────┐
│ Nomor Dokumen [auto]  │ Tanggal Pengajuan [date]   │
├─────────────────────────────────────────────────────┤
│ Judul Dokumen [text]                                │
├─────────────────────────────────────────────────────┤
│ Deadline [date]                                      │
├─────────────────────────────────────────────────────┤
│ Masterflow [dropdown] ▼                             │
│   - Masterflow Cuti                                 │
│   - Masterflow Keuangan                             │
│   - ✨ Custom Approval                              │
├─────────────────────────────────────────────────────┤
│ [Conditional: Approval Steps OR Custom Form]        │
├─────────────────────────────────────────────────────┤
│ Tambahkan Komentar [textarea]                       │
├─────────────────────────────────────────────────────┤
│ Upload File [file input]                            │
└─────────────────────────────────────────────────────┘
```

**Removed:**

- ❌ Company input
- ❌ Tipe Approval dropdown

**Simplified:**

- ✅ Single Masterflow dropdown dengan opsi Custom di dalamnya

## Backend Requirements

### 1. Company Auto-Fill

```php
// In DokumenController@store()
$companyId = auth()->user()->userAuths->first()->company_id;

// Or from middleware/session
$companyId = session('company_id');
```

### 2. Validation Based on masterflow_id

```php
public function store(Request $request)
{
    $rules = [
        'judul_dokumen' => 'required|string|max:255',
        'tgl_deadline' => 'required|date',
        'deskripsi' => 'nullable|string',
        'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx|max:10240',
    ];

    // Check if custom or existing masterflow
    if ($request->masterflow_id === 'custom') {
        $rules['custom_approvers'] = 'required|array|min:1';
        $rules['custom_approvers.*.email'] = 'required|email';
        $rules['custom_approvers.*.order'] = 'required|integer|min:1';
    } else {
        $rules['masterflow_id'] = 'required|exists:masterflows,id';
        $rules['approvers'] = 'required|array';
        $rules['approvers.*'] = 'required|exists:users,id';
    }

    $validated = $request->validate($rules);

    // Auto-fill company_id
    $companyId = auth()->user()->userAuths->first()->company_id;

    // Create dokumen...
}
```

### 3. Store Logic

```php
// Create dokumen
$dokumen = Dokumen::create([
    'nomor_dokumen' => $request->nomor_dokumen,
    'judul_dokumen' => $request->judul_dokumen,
    'user_id' => auth()->id(),
    'company_id' => $companyId,  // Auto-filled
    'masterflow_id' => $request->masterflow_id === 'custom' ? null : $request->masterflow_id,
    'tgl_pengajuan' => $request->tgl_pengajuan,
    'tgl_deadline' => $request->tgl_deadline,
    'deskripsi' => $request->deskripsi,
    'status' => 'draft',
]);

// Handle approvals based on type
if ($request->masterflow_id === 'custom') {
    // Create custom approvals
    foreach ($request->custom_approvers as $approver) {
        DokumenApproval::create([
            'dokumen_id' => $dokumen->id,
            'approver_email' => $approver['email'],
            'approval_order' => $approver['order'],
            'approval_status' => 'pending',
            'tgl_deadline' => $request->tgl_deadline,
        ]);
    }
} else {
    // Create standard approvals from masterflow
    foreach ($request->approvers as $stepId => $userId) {
        DokumenApproval::create([
            'dokumen_id' => $dokumen->id,
            'user_id' => $userId,
            'masterflow_step_id' => $stepId,
            'approval_status' => 'pending',
            'tgl_deadline' => $request->tgl_deadline,
        ]);
    }
}
```

## User Experience Flow

### Flow 1: Existing Masterflow

1. User open form dialog
2. User pilih masterflow dari dropdown (misal: "Masterflow Cuti")
3. System fetch approval steps untuk masterflow tersebut
4. System fetch available approvers per jabatan
5. Table approval muncul dengan dropdown approvers
6. User pilih approver untuk setiap step
7. User isi form lainnya
8. Submit

### Flow 2: Custom Approval

1. User open form dialog
2. User pilih **"✨ Custom Approval"** dari dropdown
3. Custom approver form muncul (default 1 approver)
4. User input email approver pertama
5. User set tingkat/order
6. (Optional) User klik "Tambah Approver" untuk approver ke-2, ke-3, dst
7. User isi form lainnya
8. Submit

## Benefits of Simplification

### 1. **Cleaner UI**

- 1 dropdown instead of 2
- Less visual clutter
- Clearer user intent

### 2. **Fewer Clicks**

- No need to select type first
- Direct selection of masterflow or custom
- Reduced steps to complete form

### 3. **Better UX**

- Custom option clearly visible in same context
- No confusion about "type" vs "masterflow"
- Natural flow: select masterflow → see approvers

### 4. **Easier Maintenance**

- Less state management (removed `masterflow_type`)
- Single handler function
- Simpler conditional logic

## Testing Checklist

### Basic Flow

- [ ] Form opens correctly
- [ ] Company field tidak muncul (removed)
- [ ] Tipe Approval dropdown tidak muncul (removed)
- [ ] Masterflow dropdown shows all masterflows + Custom option

### Existing Masterflow

- [ ] Select existing masterflow
- [ ] Approval steps table appears
- [ ] Approver dropdowns populated correctly
- [ ] Can select approvers
- [ ] Can submit successfully

### Custom Approval

- [ ] Select "✨ Custom Approval" option
- [ ] Custom form appears with 1 default approver
- [ ] Can input email
- [ ] Can set order/tingkat
- [ ] Can add more approvers
- [ ] Can remove approvers (min 1)
- [ ] Can submit successfully

### Switching

- [ ] Switch from masterflow to custom clears approvers
- [ ] Switch from custom to masterflow clears custom_approvers
- [ ] No errors when switching

### Backend

- [ ] Company_id auto-filled from auth user
- [ ] Custom approvals saved correctly
- [ ] Existing masterflow approvals saved correctly
- [ ] Email validation works for custom approvers

## Summary

Simplified form dengan menggabungkan pemilihan masterflow dan custom approval dalam satu dropdown. Company otomatis diambil dari user yang login. User experience lebih clean dan straightforward.

**Key Changes:**

- ❌ Removed: Company input
- ❌ Removed: Tipe Approval dropdown
- ✅ Updated: Masterflow dropdown includes Custom option
- ✅ Auto-fill: Company dari auth user
- ✅ Simplified: Single selection flow
