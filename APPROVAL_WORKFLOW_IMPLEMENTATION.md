# Approval Workflow Implementation

## Overview

Enhanced the document submission form with a dynamic approval workflow system that automatically populates approval steps based on the selected masterflow.

## Features Implemented

### 1. Enhanced Form Fields

The document submission form now includes:

- **Nomor Dokumen**: Auto-generated document number in format `YYYYMMXXXX` (year + month + random 4 digits)
- **Tanggal Pengajuan**: Date picker for submission date (defaults to today)
- **Judul Dokumen**: Document title (required)
- **Deadline**: Date picker for deadline (required)
- **Company**: Company name input field
- **Transaksi**: Transaction type input field
- **Masterflow**: Select masterflow to determine approval flow (required)
- **Approval Flow**: Dynamic approval steps table (appears when masterflow is selected)
- **Komentar**: Comments/description textarea
- **Upload File**: File upload for document (required)

### 2. Dynamic Approval Flow

When a user selects a masterflow:

1. The system fetches all approval steps for that masterflow via API
2. For each step, it fetches available users with the required jabatan (position)
3. Displays an approval flow table with:
    - **Step Order**: Visual step number (1, 2, 3, etc.)
    - **Jabatan**: The position/role required for approval
    - **Nama Approval**: Dropdown to select specific approver from available users
    - **Urutan**: Badge showing approval sequence

### 3. UI Components

#### Approval Flow Display

```
┌─────────────────────────────────────────────────────────┐
│ Alur Persetujuan                        3 tahap persetujuan │
├─────────────────────────────────────────────────────────┤
│ [1] │ Jabatan: Sekertaris   │ [Select User ▼] │ 1      │
│ [2] │ Jabatan: Bendahara    │ [Select User ▼] │ 2      │
│ [3] │ Jabatan: Kepala Bidang│ [Select User ▼] │ 3      │
└─────────────────────────────────────────────────────────┘
```

- Professional card layout with muted background
- Step numbers in circular badges with primary color
- Clear hierarchy with labeled sections
- Dropdown selects for choosing specific approvers

## Backend Implementation

### 1. API Routes Added (`routes/api.php`)

```php
Route::get('/masterflows/{masterflow}/steps', [MasterflowController::class, 'getSteps']);
Route::get('/users-by-jabatan/{jabatan}', [UserController::class, 'getByJabatan']);
```

### 2. Controller Methods

#### MasterflowController::getSteps()

```php
public function getSteps(Masterflow $masterflow)
{
    $steps = $masterflow->steps()
        ->with('jabatan:id,name')
        ->orderBy('step_order', 'asc')
        ->get(['id', 'masterflow_id', 'step_order', 'step_name', 'jabatan_id']);

    return response()->json(['steps' => $steps]);
}
```

#### UserController::getByJabatan()

```php
public function getByJabatan($jabatan_id)
{
    $users = User::whereHas('userAuths', function($query) use ($jabatan_id) {
        $query->where('jabatan_id', $jabatan_id);
    })
    ->select('id', 'name', 'email')
    ->orderBy('name')
    ->get();

    return response()->json($users);
}
```

## Frontend Implementation

### 1. Enhanced FormData Interface

```typescript
interface FormData {
    nomor_dokumen: string; // Auto-generated YYYYMMXXXX
    judul_dokumen: string;
    masterflow_id: number | '';
    tgl_pengajuan: string; // ISO date string
    tgl_deadline: string; // ISO date string
    company: string;
    transaksi: string;
    deskripsi: string;
    file: File | null;
    approvers: Record<number, number | ''>; // stepId -> userId mapping
}
```

### 2. New State Variables

```typescript
const [selectedMasterflow, setSelectedMasterflow] = useState<Masterflow | null>(null);
const [availableApprovers, setAvailableApprovers] = useState<Record<number, UserOption[]>>({});
```

### 3. Key Functions

#### generateDocumentNumber()

```typescript
const generateDocumentNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${year}${month}${random}`;
};
```

#### handleMasterflowChange() - Async

```typescript
const handleMasterflowChange = async (value: string) => {
    const mfId = Number(value);
    setFormData((prev) => ({ ...prev, masterflow_id: mfId }));

    if (!mfId) {
        setSelectedMasterflow(null);
        return;
    }

    // Fetch masterflow steps
    const stepsResponse = await api.get(`/masterflows/${mfId}/steps`);
    const steps = stepsResponse.data.steps;

    // Fetch users for each step's jabatan
    const approversMap: Record<number, UserOption[]> = {};
    for (const step of steps) {
        const usersResponse = await api.get(`/users-by-jabatan/${step.jabatan_id}`);
        approversMap[step.id] = usersResponse.data;
    }

    setSelectedMasterflow({ ...masterflow, steps });
    setAvailableApprovers(approversMap);

    // Initialize approvers mapping
    const initialApprovers: Record<number, number | ''> = {};
    steps.forEach((step: any) => {
        initialApprovers[step.id] = '';
    });
    setFormData((prev) => ({ ...prev, approvers: initialApprovers }));
};
```

#### handleApproverChange()

```typescript
const handleApproverChange = (stepId: number, userId: string) => {
    setFormData((prev) => ({
        ...prev,
        approvers: {
            ...prev.approvers,
            [stepId]: userId === '' ? '' : Number(userId),
        },
    }));
};
```

## Form Layout

The form uses a responsive 2-column grid layout (800px max width):

- Full-width fields: Judul Dokumen, Deadline, Masterflow, Approval Flow, Komentar, File Upload
- 2-column fields: Nomor Dokumen + Tanggal Pengajuan, Company + Transaksi

## Styling

### Theme Colors

- Background: `#f4faf3` (light green)
- Primary: `#4ba443` (green)
- Foreground: `#234621` (dark green)
- Muted background: `bg-muted/30` for approval flow card

### Typography

- Body text: `font-sans` (Inter)
- Headings: `font-serif` (Crimson Text)
- Document number: `font-mono` for code-like appearance

## Validation

Required fields:

- ✅ Judul Dokumen
- ✅ Masterflow
- ✅ Deadline
- ✅ File Upload

Backend validation will enforce:

- Approval steps must have assigned approvers before submission
- File format and size restrictions
- Date validations (deadline after submission date)

## Next Steps

1. **Backend Dokumen Store Method**: Update `DokumenController@store()` to:
    - Accept new form fields (nomor_dokumen, tgl_pengajuan, tgl_deadline, company, transaksi)
    - Store approvers mapping as related `DokumenApproval` records
    - Validate all required fields and approver selections

2. **Form Validation**: Add client-side validation to ensure:
    - All approval steps have selected approvers
    - Deadline is after submission date
    - File is selected and meets requirements

3. **Testing**: Test the complete flow:
    - Create document with different masterflows
    - Verify approval steps populate correctly
    - Verify approver dropdowns show correct users per jabatan
    - Test form submission with all new fields

## Files Modified

### Frontend

- `resources/js/pages/user/dokumen.tsx` - Enhanced form UI and logic

### Backend

- `routes/api.php` - Added API routes for steps and users
- `app/Http/Controllers/Admin/MasterflowController.php` - Added getSteps() method
- `app/Http/Controllers/UserController.php` - Added getByJabatan() method

## Testing URLs

- **User Dokumen Page**: `http://localhost/user/dokumen`
- **API Endpoints**:
    - `GET /api/masterflows/{id}/steps` - Get approval steps
    - `GET /api/users-by-jabatan/{id}` - Get users by position

## Design Match

✅ Matches Figma design requirements:

- Auto-generated document number display
- Date pickers for Tanggal Pengajuan and Deadline
- Company and Transaksi fields
- Dynamic approval flow table with 3 columns (Jabatan, Nama Approval, Urutan)
- Professional styling with green theme
- Clear visual hierarchy

## Build Status

✅ **Build Successful** - 12.34s

- No compilation errors
- All TypeScript types valid
- All imports resolved correctly
