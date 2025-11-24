# 📋 Group Approval Implementation - Complete Guide

## 🎯 Overview

Sistem **Group Approval** memungkinkan Anda mengatur multiple approvers dalam satu step yang sama dengan 3 mode persetujuan berbeda:

1. **All Required** (✓ Semua Harus Approve) - Semua approver dalam group harus menyetujui
2. **Any One** (1️⃣ Salah Satu Saja) - Minimal 1 approver yang menyetujui sudah cukup
3. **Majority** (📊 Mayoritas) - Lebih dari 50% approver harus menyetujui

---

## 🗄️ Database Schema

### Migration: `masterflow_steps`

```sql
-- Tambahan kolom untuk group approval
group_index VARCHAR(255) NULL        -- Identifier untuk group (e.g., "step_1_group_A")
jenis_group ENUM(...) NULL           -- Tipe approval: 'all_required', 'any_one', 'majority'
users_in_group JSON NULL             -- Array user IDs dalam group [1, 2, 3]
```

### Migration: `dokumen_approval`

```sql
-- Kolom sudah ada untuk group tracking
group_index VARCHAR(255) NULL        -- Di-copy dari masterflow_step
jenis_group ENUM(...) NULL           -- Di-copy dari masterflow_step
```

---

## 🏗️ Architecture

### 1. Model Layer

#### **MasterflowStep.php**

```php
// Fillable fields
protected $fillable = [
    'group_index',
    'jenis_group',
    'users_in_group',
];

// Casts
protected $casts = [
    'users_in_group' => 'array',
];

// Helper methods
hasGroupApproval(): bool           // Cek apakah step ini punya group
getGroupUsers(): array             // Get array user IDs dalam group
hasUserInGroup(int $userId): bool  // Cek apakah user ada di group
scopeByGroup($query, $groupIndex)  // Query scope untuk filter by group
```

#### **DokumenApproval.php**

```php
// Already has group_index and jenis_group in fillable
protected $fillable = [
    'group_index',
    'jenis_group',
];
```

---

### 2. Service Layer

#### **ApprovalGroupValidator.php**

Service ini mengatur logika validasi group approval:

```php
// Main validation method
isGroupComplete(int $dokumenId, string $groupIndex): array

// Returns:
[
    'is_complete' => true|false,
    'status' => 'approved'|'rejected'|'pending',
    'details' => [
        'message' => 'Status description',
        'total' => 5,
        'approved' => 3,
        'rejected' => 1,
        'pending' => 1,
        'type' => 'majority',
        'majority_threshold' => 3  // Only for majority type
    ]
]
```

**Validation Logic:**

1. **All Required**
    - ❌ Rejected jika ADA 1 yang reject
    - ✅ Approved jika SEMUA approve
    - ⏳ Pending jika masih ada yang belum vote

2. **Any One**
    - ✅ Approved jika MINIMAL 1 approve
    - ❌ Rejected jika SEMUA reject
    - ⏳ Pending jika belum ada yang approve

3. **Majority**
    - ✅ Approved jika >50% approve
    - ❌ Rejected jika impossible to reach majority
    - ⏳ Pending jika masih bisa reach majority

**Additional Methods:**

```php
checkAllRequired(Collection $approvals): array
checkAnyOne(Collection $approvals): array
checkMajority(Collection $approvals): array
getDocumentGroups(int $dokumenId): Collection
checkAllGroups(int $dokumenId): array
```

---

### 3. Controller Layer

#### **MasterflowController.php**

Validasi input untuk group fields:

```php
$request->validate([
    'steps.*.group_index' => 'nullable|string|max:255',
    'steps.*.jenis_group' => 'nullable|in:all_required,any_one,majority',
    'steps.*.users_in_group' => 'nullable|array',
    'steps.*.users_in_group.*' => 'exists:users,id',
]);
```

Store/Update logic:

```php
MasterflowStep::create([
    'group_index' => $stepData['group_index'] ?? null,
    'jenis_group' => $stepData['jenis_group'] ?? null,
    'users_in_group' => $stepData['users_in_group'] ?? null,
]);
```

#### **DokumenController.php**

Saat dokumen dibuat, logic untuk create approval records:

```php
foreach ($masterflow->steps as $step) {
    if ($step->hasGroupApproval()) {
        // Create approval untuk SEMUA users dalam group
        $groupUsers = $step->getGroupUsers();

        foreach ($groupUsers as $userId) {
            DokumenApproval::create([
                'dokumen_id' => $dokumen->id,
                'user_id' => $userId,
                'masterflow_step_id' => $step->id,
                'dokumen_version_id' => $version->id,
                'approval_status' => 'pending',
                'group_index' => $step->group_index,
                'jenis_group' => $step->jenis_group,
            ]);
        }
    } else {
        // Regular approval - 1 approver selected by user
        DokumenApproval::create([...]);
    }
}
```

---

### 4. Frontend Layer

#### **resources/js/pages/dokumen/index.tsx**

**Interface Update:**

```typescript
interface MasterflowStep {
    id: number;
    step_order: number;
    step_name: string;
    jabatan_id: number;
    jabatan?: { id: number; name: string };
    group_index?: string | null;
    jenis_group?: 'all_required' | 'any_one' | 'majority' | null;
    users_in_group?: number[] | null;
}
```

**Display Logic:**

```tsx
{
    step.group_index && step.jenis_group ? (
        // Show group info
        <div className="rounded-md border border-blue-200 bg-blue-50">
            <Badge variant="outline">
                {step.jenis_group === 'all_required' && '✓ Semua Harus Approve'}
                {step.jenis_group === 'any_one' && '1️⃣ Salah Satu Saja'}
                {step.jenis_group === 'majority' && '📊 Mayoritas'}
            </Badge>
            <div className="mt-2 text-xs">{step.users_in_group?.length} approver dalam group</div>
        </div>
    ) : (
        // Show regular approver dropdown
        <Select onValueChange={(value) => handleApproverChange(step.id, value)}>...</Select>
    );
}
```

---

## 🎮 Usage Examples

### Example 1: Budget Approval dengan All Required

**Scenario:** Budget besar butuh approval dari CFO DAN Finance Manager

```json
{
    "step_order": 2,
    "step_name": "Finance Leadership Approval",
    "jabatan_id": 3,
    "group_index": "step_2_group_finance",
    "jenis_group": "all_required",
    "users_in_group": [5, 6] // [CFO, Finance Manager]
}
```

**Behavior:**

- User 5 (CFO) approve ✅
- User 6 (Finance Manager) pending ⏳
- **Status: PENDING** (butuh 2/2)

- User 5 approve ✅
- User 6 approve ✅
- **Status: APPROVED** ✅

- User 5 approve ✅
- User 6 reject ❌
- **Status: REJECTED** ❌ (1 rejection = group rejected)

---

### Example 2: On-Duty Manager dengan Any One

**Scenario:** Ada 3 shift manager, cukup 1 yang approve

```json
{
    "step_order": 1,
    "step_name": "Shift Manager Approval",
    "jabatan_id": 2,
    "group_index": "step_1_group_managers",
    "jenis_group": "any_one",
    "users_in_group": [10, 11, 12] // [Manager A, B, C]
}
```

**Behavior:**

- Manager A approve ✅
- **Status: APPROVED** ✅ (sudah cukup 1)
- Manager B & C tidak perlu approve lagi

- Semua reject ❌❌❌
- **Status: REJECTED** ❌

---

### Example 3: Committee Decision dengan Majority

**Scenario:** 5 committee members, butuh >50% approve

```json
{
    "step_order": 3,
    "step_name": "Committee Voting",
    "jabatan_id": 4,
    "group_index": "step_3_group_committee",
    "jenis_group": "majority",
    "users_in_group": [20, 21, 22, 23, 24] // 5 members
}
```

**Behavior:**

- Member 1, 2, 3 approve ✅✅✅
- **Status: APPROVED** ✅ (3/5 = 60% > 50%)

- Member 1, 2 approve ✅✅
- Member 3, 4, 5 reject ❌❌❌
- **Status: REJECTED** ❌ (2/5 = 40% < 50%, impossible to reach majority)

- Member 1, 2 approve ✅✅
- Member 3 reject ❌
- Member 4, 5 pending ⏳⏳
- **Status: PENDING** (masih bisa reach 4/5 = 80%)

---

## 🧪 Testing Guide

### 1. Test Data Setup

```php
// Create masterflow with group approval
$masterflow = Masterflow::create([
    'name' => 'Budget Approval Flow',
    'company_id' => 1,
]);

MasterflowStep::create([
    'masterflow_id' => $masterflow->id,
    'step_order' => 1,
    'step_name' => 'Finance Team Approval',
    'jabatan_id' => 3,
    'group_index' => 'step_1_group_finance',
    'jenis_group' => 'majority',
    'users_in_group' => [1, 2, 3, 4, 5], // 5 users
]);
```

### 2. Create Document

Upload dokumen dengan masterflow tersebut. System akan auto-create 5 approval records dengan:

- Same `group_index`: "step_1_group_finance"
- Same `jenis_group`: "majority"
- Different `user_id`: 1, 2, 3, 4, 5

### 3. Test Approval Flow

```php
use App\Services\ApprovalGroupValidator;

$validator = new ApprovalGroupValidator();

// User 1 approve
DokumenApproval::where('dokumen_id', 1)->where('user_id', 1)
    ->update(['approval_status' => 'approved']);

// Check group status
$result = $validator->isGroupComplete(1, 'step_1_group_finance');
// Result: pending (need 3/5)

// User 2, 3 approve
DokumenApproval::whereIn('user_id', [2, 3])
    ->where('dokumen_id', 1)
    ->update(['approval_status' => 'approved']);

$result = $validator->isGroupComplete(1, 'step_1_group_finance');
// Result: approved (3/5 = 60% > 50%)
```

---

## 📊 Visual Flow Diagram

```
Document Upload
     |
     v
Load Masterflow Steps
     |
     v
For Each Step:
     |
     +-- Has Group? NO --> User selects 1 approver
     |                          |
     |                          v
     |                     Create 1 approval record
     |
     +-- Has Group? YES --> Get all users_in_group
                                 |
                                 v
                            Create N approval records
                            (with group_index & jenis_group)
                                 |
                                 v
                            When approver acts:
                                 |
                                 v
                            ApprovalGroupValidator
                            checks group completion
                                 |
                    +------------+------------+
                    |            |            |
                all_required  any_one    majority
                    |            |            |
                    v            v            v
                All must    1 is enough    >50% needed
                approve     to approve     to approve
```

---

## ⚡ Quick Start Checklist

- [x] Migration run `php artisan migrate:fresh --seed`
- [x] MasterflowStep model updated with group fields
- [x] DokumenApproval model has group_index & jenis_group
- [x] ApprovalGroupValidator service created
- [x] DokumenController handles group approval creation
- [x] MasterflowController validates group input
- [x] Frontend displays group info in dokumen form

---

## 🚀 Next Steps (Future Enhancements)

1. **Admin UI for Group Management**
    - Create/Edit masterflow with group configuration UI
    - Visual group builder with drag & drop

2. **Real-time Group Status**
    - WebSocket notifications when group status changes
    - Live progress indicator (3/5 approved)

3. **Advanced Group Features**
    - Weighted voting (some approvers have more weight)
    - Conditional groups (if X approves, skip Y)
    - Time-based auto-escalation

4. **Analytics Dashboard**
    - Group approval statistics
    - Average time per group type
    - Bottleneck detection

---

## 📝 Notes

- Group approval hanya untuk **existing masterflow**, bukan custom approval
- Field `users_in_group` di masterflow_steps harus berisi valid user IDs
- Jika step punya `group_index`, user TIDAK bisa pilih approver (sudah auto-assigned)
- Validasi group menggunakan `ApprovalGroupValidator` service
- Frontend auto-detect group dan tampilkan badge sesuai `jenis_group`

---

## 🐛 Troubleshooting

### Issue: "No approvals created for group"

**Solution:** Check if `users_in_group` in masterflow_step has valid user IDs:

```php
$step = MasterflowStep::find(1);
dd($step->users_in_group); // Should be array [1, 2, 3]
```

### Issue: "Group always pending"

**Solution:** Check approval records exist:

```php
DokumenApproval::where('group_index', 'step_1_group_A')->get();
```

### Issue: "Frontend not showing group badge"

**Solution:** Ensure API returns group fields:

```php
// In MasterflowController
return Masterflow::with('steps')->find($id); // Make sure steps loaded
```

---

**Implementation Date:** November 15, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready
