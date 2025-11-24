# User-Selected Group Approval Implementation

## Overview

This document describes the **user-driven dynamic group approval** feature that allows users to choose group approval settings during document upload instead of using pre-configured masterflow settings.

## Key Changes

### Previous Implementation (Phase 1)

- Group approval settings were **pre-configured** by admins in the masterflow
- Users saw group info but couldn't change it
- Group settings stored in `masterflow_steps` table (group_index, jenis_group, users_in_group)

### New Implementation (Phase 2)

- Users **dynamically select** group approval settings during upload
- Toggle between **single approver** and **group approver** modes per step
- Select **multiple approvers** and **group type** on-the-fly
- Group settings stored in `dokumen_approvals` table with user-selected data

---

## Frontend Changes

### 1. Updated Interfaces

#### New `StepApprovers` Interface

```typescript
interface StepApprovers {
    userIds: number[];
    jenisGroup: 'all_required' | 'any_one' | 'majority' | null;
}
```

#### Updated `FormData` Interface

```typescript
interface FormData {
    // ... existing fields
    approvers: Record<number, number | ''>; // Single approver per step
    step_approvers: Record<number, StepApprovers>; // Group approvers per step
}
```

### 2. State Management

```typescript
const [stepModes, setStepModes] = useState<Record<number, 'single' | 'group'>>({});
```

Tracks whether each step is in single or group mode.

### 3. Handler Functions

#### `toggleStepMode(stepId: number)`

- Switches between single and group modes
- Clears data for the previous mode to prevent conflicts

#### `handleMultipleApproverChange(stepId: number, userId: number, checked: boolean)`

- Adds/removes users from the group selection
- Updates `step_approvers[stepId].userIds` array

#### `handleJenisGroupChange(stepId: number, jenisGroup: string)`

- Sets the group type (all_required, any_one, majority)
- Updates `step_approvers[stepId].jenisGroup`

### 4. UI Components

#### Toggle Button

```tsx
<Button type="button" onClick={() => toggleStepMode(step.id)} className="h-6 px-2 text-xs">
    {stepModes[step.id] === 'group' ? '👤 Single' : '👥 Group'}
</Button>
```

#### Group Mode UI

When in group mode, users see:

1. **Group Type Selector** - Dropdown to choose validation logic
    - ✓ Semua Harus Approve (all_required)
    - 1️⃣ Salah Satu Saja (any_one)
    - 📊 Mayoritas > 50% (majority)

2. **Checkbox List** - Multi-select approvers from available users
3. **Selected Count Badge** - Shows number of selected approvers and group type

#### Single Mode UI

When in single mode (default):

- Standard dropdown to select one approver

### 5. Form Submission

Updated `handleSubmit` to serialize both modes:

```typescript
// Send step_approvers for group mode steps
Object.entries(formData.step_approvers).forEach(([stepId, stepApprover]) => {
    if (stepApprover.userIds.length > 0 && stepApprover.jenisGroup) {
        submitData.append(`step_approvers[${stepId}][jenis_group]`, stepApprover.jenisGroup);
        stepApprover.userIds.forEach((userId, index) => {
            submitData.append(`step_approvers[${stepId}][user_ids][${index}]`, userId.toString());
        });
    }
});

// Send single approvers for single mode steps
Object.entries(formData.approvers).forEach(([stepId, userId]) => {
    if (userId !== '' && !formData.step_approvers[Number(stepId)]) {
        submitData.append(`approvers[${stepId}]`, userId.toString());
    }
});
```

---

## Backend Changes

### 1. Updated Validation Rules

```php
// Accept both single approvers and group approvers
$rules['approvers'] = 'nullable|array';
$rules['approvers.*'] = 'nullable|exists:users,id';
$rules['step_approvers'] = 'nullable|array';
$rules['step_approvers.*.jenis_group'] = 'required|in:all_required,any_one,majority';
$rules['step_approvers.*.user_ids'] = 'required|array|min:1';
$rules['step_approvers.*.user_ids.*'] = 'required|exists:users,id';
```

### 2. Modified Approval Creation Logic

```php
foreach ($masterflow->steps as $step) {
    // Check if user selected group approval for this step
    if ($request->has("step_approvers.{$step->id}")) {
        $stepApprover = $request->input("step_approvers.{$step->id}");
        $groupIndex = 'user_selected_' . $dokumen->id . '_' . $step->id;

        // Create approval records for all selected users in the group
        foreach ($stepApprover['user_ids'] as $userId) {
            DokumenApproval::create([
                'dokumen_id' => $dokumen->id,
                'user_id' => $userId,
                'masterflow_step_id' => $step->id,
                'dokumen_version_id' => $version->id,
                'approval_status' => 'pending',
                'tgl_deadline' => $validated['tgl_deadline'],
                'group_index' => $groupIndex,
                'jenis_group' => $stepApprover['jenis_group'],
            ]);
        }
    } else {
        // Single approver selected by user
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
}
```

### 3. Group Index Format

For user-selected groups, the group_index follows this pattern:

```
user_selected_{dokumen_id}_{step_id}
```

Example: `user_selected_123_5`

This ensures unique group identifiers per document and step.

---

## Database Schema

The existing `dokumen_approvals` table already supports this feature:

```sql
CREATE TABLE dokumen_approvals (
    id BIGSERIAL PRIMARY KEY,
    dokumen_id BIGINT NOT NULL,
    user_id BIGINT,
    approver_email VARCHAR(255),
    masterflow_step_id BIGINT,
    dokumen_version_id BIGINT NOT NULL,
    approval_order INTEGER,
    approval_status VARCHAR(50) NOT NULL,
    tgl_approve TIMESTAMP,
    tgl_deadline TIMESTAMP,
    catatan TEXT,
    group_index VARCHAR(255),           -- For group approval
    jenis_group VARCHAR(50),            -- all_required, any_one, majority
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## How It Works

### User Workflow

1. **Create Document** - User clicks "Buat Dokumen"
2. **Select Masterflow** - Choose from available masterflows
3. **For Each Step:**
    - **Default:** Single approver mode
    - **Toggle to Group:** Click "👥 Group" button
    - **Select Group Type:** Choose validation logic (all/any/majority)
    - **Select Approvers:** Check multiple users from the list
    - **See Summary:** Badge shows selected count and group type
4. **Submit** - Form sends both single and group approvers to backend
5. **Backend Processing:**
    - Validates all inputs
    - Creates approval records with appropriate group_index and jenis_group
    - Existing `ApprovalGroupValidator` service handles validation during approval process

### Approval Validation

The existing `ApprovalGroupValidator` service (from Phase 1) validates group approvals:

```php
use App\Services\ApprovalGroupValidator;

$validator = new ApprovalGroupValidator();
$result = $validator->isGroupComplete($dokumenId, $groupIndex);

if ($result['is_complete']) {
    // Group approval is complete, proceed to next step
}
```

Validation logic:

- **all_required:** All users in group must approve
- **any_one:** At least 1 user must approve
- **majority:** More than 50% must approve

---

## Benefits

### ✅ Maximum Flexibility

- Users choose group settings per-upload instead of fixed configuration
- Can mix single and group approvers in the same workflow

### ✅ Backward Compatibility

- Still supports single approver mode (default)
- Still supports custom approval flow
- Existing ApprovalGroupValidator service works without changes

### ✅ Better User Experience

- Clear toggle button to switch modes
- Visual feedback with badges and checkboxes
- Real-time count of selected approvers

### ✅ Clean Architecture

- Frontend handles UI state management
- Backend validates and stores data
- Reuses existing validation service

---

## Testing Guide

### Test Scenario 1: Single Approver Mode

1. Create document, select masterflow
2. Keep all steps in single mode (default)
3. Select one approver per step
4. Submit document
5. **Expected:** One approval record per step

### Test Scenario 2: Group Approver Mode

1. Create document, select masterflow
2. Toggle step to group mode
3. Select group type: "Semua Harus Approve"
4. Check 3 users
5. Submit document
6. **Expected:** 3 approval records with same group_index and jenis_group='all_required'

### Test Scenario 3: Mixed Mode

1. Create document with 3-step masterflow
2. Step 1: Single approver
3. Step 2: Group mode (any_one, 2 users)
4. Step 3: Group mode (majority, 5 users)
5. Submit document
6. **Expected:** 1 + 2 + 5 = 8 approval records total

### Test Scenario 4: Validation

1. Toggle to group mode
2. Select group type but don't select any users
3. Try to submit
4. **Expected:** Validation error (min:1 user required)

### Test Scenario 5: Approval Process

1. Create document with group approval (all_required, 3 users)
2. First user approves
3. **Expected:** Document still waiting (2 more needed)
4. Second user approves
5. **Expected:** Document still waiting (1 more needed)
6. Third user approves
7. **Expected:** Document proceeds to next step

---

## Files Modified

### Frontend

- `resources/js/pages/dokumen/index.tsx`
    - Added `StepApprovers` interface
    - Updated `FormData` interface
    - Added `stepModes` state
    - Implemented toggle, multi-select, and group type handlers
    - Updated UI with toggle button and checkbox list
    - Modified form submission logic

### Backend

- `app/Http/Controllers/DokumenController.php`
    - Updated validation rules to accept `step_approvers`
    - Modified approval creation logic to process user-selected groups
    - Generate unique `group_index` for user-selected groups

### Documentation

- `USER_SELECTED_GROUP_APPROVAL.md` (this file)

---

## Migration Notes

### From Phase 1 to Phase 2

**No database migration needed!** The existing schema already supports this feature.

**Existing Code Reused:**

- `ApprovalGroupValidator` service - No changes needed
- `dokumen_approvals` table - Already has group_index and jenis_group columns
- Model helper methods - Still work correctly

**New Code Added:**

- Frontend: UI components for dynamic selection
- Backend: Processing logic for user-selected groups

**Backward Compatibility:**

- Old documents with pre-configured groups still work
- New documents can use dynamic selection
- Both approaches coexist seamlessly

---

## Summary

✅ **Frontend Implementation Complete**

- Toggle between single/group modes
- Multi-select approvers with checkboxes
- Group type selector dropdown
- Visual feedback with badges

✅ **Backend Implementation Complete**

- Validation for step_approvers array
- Approval creation for user-selected groups
- Unique group_index generation

✅ **Service Layer Reused**

- ApprovalGroupValidator handles validation
- No changes needed to existing services

✅ **Database Schema Ready**

- No migration required
- Existing columns support new feature

**Status:** Ready for testing! 🎉

The feature allows users to dynamically choose between single and group approval modes during document upload, providing maximum flexibility while maintaining backward compatibility with existing code.
