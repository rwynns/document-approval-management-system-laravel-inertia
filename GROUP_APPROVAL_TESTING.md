# 🧪 Group Approval Testing Examples

## Test Case 1: All Required - Finance Team Approval

### Setup

```sql
-- Insert test masterflow
INSERT INTO masterflows (company_id, name, description, is_active, total_steps, created_at, updated_at)
VALUES (1, 'Budget Approval with Group', 'Test masterflow for group approval', 1, 1, NOW(), NOW());

-- Get masterflow_id (assume it's 10)

-- Insert step with group approval
INSERT INTO masterflow_steps (
    masterflow_id,
    jabatan_id,
    step_order,
    step_name,
    group_index,
    jenis_group,
    users_in_group,
    created_at,
    updated_at
) VALUES (
    10,
    3, -- Finance jabatan_id
    1,
    'Finance Leadership Approval',
    'step_1_group_finance',
    'all_required',
    '[5, 6]', -- CFO (5) and Finance Manager (6)
    NOW(),
    NOW()
);
```

### Test Scenario A: All Approve (Success)

```php
// 1. Upload dokumen dengan masterflow_id = 10
// System auto-creates 2 approval records:
// - user_id: 5 (CFO), group_index: 'step_1_group_finance', jenis_group: 'all_required'
// - user_id: 6 (Finance Manager), group_index: 'step_1_group_finance', jenis_group: 'all_required'

// 2. CFO approves
DokumenApproval::where('dokumen_id', 1)
    ->where('user_id', 5)
    ->update([
        'approval_status' => 'approved',
        'tgl_approve' => now(),
    ]);

// Check status
$validator = new ApprovalGroupValidator();
$result = $validator->isGroupComplete(1, 'step_1_group_finance');
/*
Expected Result:
[
    'is_complete' => false,
    'status' => 'pending',
    'details' => [
        'message' => 'Waiting for all approvers (1/2 approved)',
        'total' => 2,
        'approved' => 1,
        'rejected' => 0,
        'pending' => 1,
        'type' => 'all_required',
    ]
]
*/

// 3. Finance Manager approves
DokumenApproval::where('dokumen_id', 1)
    ->where('user_id', 6)
    ->update([
        'approval_status' => 'approved',
        'tgl_approve' => now(),
    ]);

$result = $validator->isGroupComplete(1, 'step_1_group_finance');
/*
Expected Result:
[
    'is_complete' => true,
    'status' => 'approved',
    'details' => [
        'message' => 'Group approved: All approvers approved',
        'total' => 2,
        'approved' => 2,
        'rejected' => 0,
        'pending' => 0,
        'type' => 'all_required',
    ]
]
*/
```

### Test Scenario B: One Rejects (Failure)

```php
// 1. CFO approves
DokumenApproval::where('dokumen_id', 2)
    ->where('user_id', 5)
    ->update(['approval_status' => 'approved', 'tgl_approve' => now()]);

// 2. Finance Manager rejects
DokumenApproval::where('dokumen_id', 2)
    ->where('user_id', 6)
    ->update([
        'approval_status' => 'rejected',
        'tgl_approve' => now(),
        'alasan_reject' => 'Budget too high',
    ]);

$result = $validator->isGroupComplete(2, 'step_1_group_finance');
/*
Expected Result:
[
    'is_complete' => true,
    'status' => 'rejected',
    'details' => [
        'message' => 'Group rejected: At least one approver rejected',
        'total' => 2,
        'approved' => 1,
        'rejected' => 1,
        'pending' => 0,
        'type' => 'all_required',
    ]
]
*/
```

---

## Test Case 2: Any One - Shift Manager Approval

### Setup

```sql
INSERT INTO masterflow_steps (
    masterflow_id,
    jabatan_id,
    step_order,
    step_name,
    group_index,
    jenis_group,
    users_in_group,
    created_at,
    updated_at
) VALUES (
    11,
    2, -- Manager jabatan_id
    1,
    'On-Duty Manager Approval',
    'step_1_group_managers',
    'any_one',
    '[10, 11, 12]', -- Manager A, B, C
    NOW(),
    NOW()
);
```

### Test Scenario A: First One Approves (Success)

```php
// Upload creates 3 approval records for users 10, 11, 12

// 1. Manager A approves
DokumenApproval::where('dokumen_id', 3)
    ->where('user_id', 10)
    ->update(['approval_status' => 'approved', 'tgl_approve' => now()]);

$result = $validator->isGroupComplete(3, 'step_1_group_managers');
/*
Expected Result:
[
    'is_complete' => true,  // ✅ DONE! Only need 1
    'status' => 'approved',
    'details' => [
        'message' => 'Group approved: At least one approver approved',
        'total' => 3,
        'approved' => 1,
        'rejected' => 0,
        'pending' => 2,
        'type' => 'any_one',
    ]
]
*/
```

### Test Scenario B: All Reject (Failure)

```php
// 1. Manager A rejects
DokumenApproval::where('dokumen_id', 4)->where('user_id', 10)
    ->update(['approval_status' => 'rejected']);

// 2. Manager B rejects
DokumenApproval::where('dokumen_id', 4)->where('user_id', 11)
    ->update(['approval_status' => 'rejected']);

// 3. Manager C rejects
DokumenApproval::where('dokumen_id', 4)->where('user_id', 12)
    ->update(['approval_status' => 'rejected']);

$result = $validator->isGroupComplete(4, 'step_1_group_managers');
/*
Expected Result:
[
    'is_complete' => true,
    'status' => 'rejected',
    'details' => [
        'message' => 'Group rejected: All approvers rejected',
        'total' => 3,
        'approved' => 0,
        'rejected' => 3,
        'pending' => 0,
        'type' => 'any_one',
    ]
]
*/
```

---

## Test Case 3: Majority - Committee Voting

### Setup

```sql
INSERT INTO masterflow_steps (
    masterflow_id,
    jabatan_id,
    step_order,
    step_name,
    group_index,
    jenis_group,
    users_in_group,
    created_at,
    updated_at
) VALUES (
    12,
    4, -- Committee jabatan_id
    1,
    'Committee Decision',
    'step_1_group_committee',
    'majority',
    '[20, 21, 22, 23, 24]', -- 5 committee members
    NOW(),
    NOW()
);
```

### Test Scenario A: Majority Approves (Success)

```php
// Upload creates 5 approval records

// 1. Member 1, 2, 3 approve (3/5 = 60%)
DokumenApproval::where('dokumen_id', 5)
    ->whereIn('user_id', [20, 21, 22])
    ->update(['approval_status' => 'approved', 'tgl_approve' => now()]);

$result = $validator->isGroupComplete(5, 'step_1_group_committee');
/*
Expected Result:
[
    'is_complete' => true,
    'status' => 'approved',
    'details' => [
        'message' => 'Group approved: Majority reached (3/5)',
        'total' => 5,
        'approved' => 3,
        'rejected' => 0,
        'pending' => 2,
        'majority_threshold' => 3,  // ceil(5/2) = 3
        'type' => 'majority',
    ]
]
*/
```

### Test Scenario B: Cannot Reach Majority (Failure)

```php
// 1. Member 1, 2 approve
DokumenApproval::where('dokumen_id', 6)
    ->whereIn('user_id', [20, 21])
    ->update(['approval_status' => 'approved']);

// 2. Member 3, 4, 5 reject
DokumenApproval::where('dokumen_id', 6)
    ->whereIn('user_id', [22, 23, 24])
    ->update(['approval_status' => 'rejected']);

$result = $validator->isGroupComplete(6, 'step_1_group_committee');
/*
Expected Result:
[
    'is_complete' => true,
    'status' => 'rejected',
    'details' => [
        'message' => 'Group rejected: Cannot reach majority (3 rejected, need 3)',
        'total' => 5,
        'approved' => 2,
        'rejected' => 3,
        'pending' => 0,
        'majority_threshold' => 3,
        'type' => 'majority',
    ]
]
*/
```

### Test Scenario C: Still Pending (Can Reach Majority)

```php
// 1. Member 1, 2 approve
DokumenApproval::where('dokumen_id', 7)
    ->whereIn('user_id', [20, 21])
    ->update(['approval_status' => 'approved']);

// 2. Member 3 rejects
DokumenApproval::where('dokumen_id', 7)
    ->where('user_id', 22)
    ->update(['approval_status' => 'rejected']);

// Members 4, 5 still pending

$result = $validator->isGroupComplete(7, 'step_1_group_committee');
/*
Expected Result:
[
    'is_complete' => false,  // Still can reach 4/5 = 80%
    'status' => 'pending',
    'details' => [
        'message' => 'Waiting for majority (2/3 approved)',
        'total' => 5,
        'approved' => 2,
        'rejected' => 1,
        'pending' => 2,
        'majority_threshold' => 3,
        'type' => 'majority',
    ]
]
*/
```

---

## Test Case 4: Multiple Groups in Same Document

### Setup

```sql
-- Step 1: Finance group (all_required)
INSERT INTO masterflow_steps (...) VALUES (
    13, 3, 1, 'Finance Review',
    'step_1_group_finance', 'all_required', '[5, 6]', NOW(), NOW()
);

-- Step 2: Committee group (majority)
INSERT INTO masterflow_steps (...) VALUES (
    13, 4, 2, 'Committee Decision',
    'step_2_group_committee', 'majority', '[20, 21, 22, 23, 24]', NOW(), NOW()
);
```

### Test All Groups

```php
$validator = new ApprovalGroupValidator();

// Check all groups for document
$results = $validator->checkAllGroups(8);

/*
Expected Result:
[
    'step_1_group_finance' => [
        'is_complete' => false,
        'status' => 'pending',
        'details' => [...]
    ],
    'step_2_group_committee' => [
        'is_complete' => false,
        'status' => 'pending',
        'details' => [...]
    ]
]
*/

// Approve finance group
DokumenApproval::where('dokumen_id', 8)
    ->where('group_index', 'step_1_group_finance')
    ->update(['approval_status' => 'approved', 'tgl_approve' => now()]);

// Approve majority in committee
DokumenApproval::where('dokumen_id', 8)
    ->where('group_index', 'step_2_group_committee')
    ->whereIn('user_id', [20, 21, 22])
    ->update(['approval_status' => 'approved', 'tgl_approve' => now()]);

$results = $validator->checkAllGroups(8);
// Both groups should be approved now
```

---

## Edge Cases

### Edge Case 1: Empty Group

```php
// If users_in_group is empty or null
$step = MasterflowStep::create([
    'users_in_group' => [],
    'jenis_group' => 'majority',
]);

// Should not create any approval records
// Document upload should skip this step or throw validation error
```

### Edge Case 2: Single User in Group

```php
// Only 1 user in "majority" group
$step = MasterflowStep::create([
    'users_in_group' => [5],
    'jenis_group' => 'majority',
]);

// Majority of 1 = ceil(1/2) = 1
// So 1 approval = 100% > 50% ✅
```

### Edge Case 3: Even Number Majority

```php
// 4 users in group
$step = MasterflowStep::create([
    'users_in_group' => [1, 2, 3, 4],
    'jenis_group' => 'majority',
]);

// Majority = ceil(4/2) = 2
// So need at least 2 approvals (50% is NOT enough, need >50%)
```

---

## Integration Test Script

```php
<?php

use App\Models\Dokumen;
use App\Models\DokumenApproval;
use App\Models\Masterflow;
use App\Models\MasterflowStep;
use App\Services\ApprovalGroupValidator;

// Create test masterflow
$masterflow = Masterflow::create([
    'company_id' => 1,
    'name' => 'Integration Test Flow',
    'is_active' => true,
    'total_steps' => 2,
]);

// Step 1: All Required (Finance)
MasterflowStep::create([
    'masterflow_id' => $masterflow->id,
    'jabatan_id' => 3,
    'step_order' => 1,
    'step_name' => 'Finance Approval',
    'group_index' => 'test_group_finance',
    'jenis_group' => 'all_required',
    'users_in_group' => [5, 6],
]);

// Step 2: Majority (Committee)
MasterflowStep::create([
    'masterflow_id' => $masterflow->id,
    'jabatan_id' => 4,
    'step_order' => 2,
    'step_name' => 'Committee Vote',
    'group_index' => 'test_group_committee',
    'jenis_group' => 'majority',
    'users_in_group' => [20, 21, 22, 23, 24],
]);

echo "✅ Test masterflow created: {$masterflow->id}\n";
echo "📝 Use this masterflow_id when uploading a test document\n";
echo "🧪 Expected behavior:\n";
echo "   - Should create 2 + 5 = 7 approval records\n";
echo "   - 2 for finance group (all_required)\n";
echo "   - 5 for committee group (majority)\n";
```

---

**Happy Testing! 🎉**
