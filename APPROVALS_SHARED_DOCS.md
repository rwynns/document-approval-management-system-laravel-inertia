# Update: Halaman Approvals - Shared untuk Semua Role

## 📋 Perubahan yang Dilakukan

### 1. Struktur Folder

**Sebelum:**

```
resources/js/pages/
├── approver/          ← Khusus approver
│   ├── index.tsx
│   └── show.tsx
└── user/
    ├── dokumen.tsx
    └── dokumen-detail.tsx
```

**Sesudah:**

```
resources/js/pages/
├── approvals/         ← SHARED untuk semua role
│   ├── index.tsx     ← List dokumen yang perlu di-approve
│   └── show.tsx      ← Detail & approve/reject dokumen
└── user/
    ├── dokumen.tsx   ← Dokumen yang user upload sendiri
    └── dokumen-detail.tsx
```

### 2. Menu Sidebar untuk Semua Role

#### **User Menu:**

- Dashboard
- **Dokumen Saya** → Upload & manage dokumen sendiri
- **Approvals** → Approve dokumen orang lain

#### **Admin Menu:**

- Dashboard
- **Dokumen Saya** → Upload & manage dokumen sendiri
- **Approvals** → Approve dokumen orang lain
- Masterflow Management
- Dokumen (semua dokumen)

#### **Super Admin Menu:**

- Dashboard
- **Dokumen Saya** → Upload & manage dokumen sendiri
- **Approvals** → Approve dokumen orang lain
- Role Management
- Company Management
- Jabatan Management
- Aplikasi Management
- User Management

## 🎯 Konsep

### **Semua user bisa menjadi approver!**

Siapa yang menjadi approver ditentukan oleh:

1. **Masterflow-based Approval:**
    - Ditugaskan berdasarkan **Jabatan**
    - Contoh: "Semua user dengan jabatan 'Manager' di step 2"

2. **Custom Approval:**
    - Ditugaskan berdasarkan **Email**
    - Contoh: "john@example.com" sebagai approver 1

### **Role ≠ Approver**

- **Role (User/Admin/Super Admin)** = Hak akses menu management
- **Approver** = User yang ditugaskan approve dokumen tertentu

Jadi:

- User biasa bisa jadi approver ✅
- Admin bisa jadi approver ✅
- Super Admin bisa jadi approver ✅

## 🔄 Routes

Routes approvals sudah di middleware `auth`, bukan role-specific:

```php
// Available for ALL authenticated users
Route::middleware(['auth'])->group(function () {
    Route::get('approvals', [DokumenApprovalController::class, 'index'])
        ->name('approvals.index');

    Route::get('approvals/{approval}', [DokumenApprovalController::class, 'show'])
        ->name('approvals.show');

    Route::post('approvals/{approval}/approve', [DokumenApprovalController::class, 'approve'])
        ->name('approvals.approve');

    Route::post('approvals/{approval}/reject', [DokumenApprovalController::class, 'reject'])
        ->name('approvals.reject');
});
```

## 🎨 UI/UX

### **Halaman Approvals** (`/approvals`)

- Hanya menampilkan dokumen yang **ditugaskan ke user yang login**
- Filter by status: All, Pending, Approved, Rejected
- Search berdasarkan judul dokumen
- Statistics cards: Pending, Approved, Rejected, Overdue

### **Halaman Detail Approval** (`/approvals/{id}`)

- Info dokumen lengkap
- Preview PDF
- Approval workflow timeline
- Action buttons: Approve / Reject (jika pending)
- Komentar dan alasan reject dari approver lain

## 🔒 Authorization

Controller `DokumenApprovalController` sudah handle authorization:

```php
// Di method show()
if ($approval->user_id !== Auth::id()) {
    abort(403, 'Anda tidak memiliki akses ke approval ini.');
}

// Di method approve()
if ($approval->user_id !== Auth::id() || !$approval->isPending()) {
    return back()->withErrors(['error' => 'Anda tidak dapat melakukan approval ini.']);
}
```

Jadi:

- User hanya bisa lihat & approve dokumen yang **ditugaskan ke mereka**
- Tidak bisa approve dokumen yang bukan tugasnya
- Tidak bisa approve 2x (jika sudah approved/rejected)

## 📝 Cara Kerja

### **Flow untuk User yang Upload Dokumen:**

1. User upload dokumen di `/user/dokumen`
2. Pilih masterflow atau custom approver
3. Submit dokumen
4. Dokumen masuk ke queue approval

### **Flow untuk User yang Menjadi Approver:**

1. User dapat notifikasi (email/realtime) ada dokumen perlu di-approve
2. Buka `/approvals` → Lihat list dokumen pending
3. Klik "Lihat Detail"
4. Review dokumen, preview PDF
5. Approve atau Reject dengan komentar
6. Dokumen lanjut ke approver berikutnya atau selesai

## ✅ Testing Checklist

- [ ] Login sebagai **User** → Cek menu "Approvals" muncul
- [ ] Login sebagai **Admin** → Cek menu "Dokumen Saya" dan "Approvals" muncul
- [ ] Login sebagai **Super Admin** → Cek menu lengkap muncul
- [ ] Upload dokumen dengan masterflow → Approver dapat melihat di `/approvals`
- [ ] Upload dokumen dengan custom email → User dengan email tersebut dapat melihat
- [ ] Test approve dokumen → Status berubah, lanjut ke approver berikutnya
- [ ] Test reject dokumen → Status dokumen jadi rejected
- [ ] Test authorization → User tidak bisa approve dokumen yang bukan tugasnya

## 🚀 Next Steps

- [ ] **Real-time notifications** ketika ada approval baru
- [ ] **Email notifications** untuk approval pending
- [ ] **Badge counter** di menu "Approvals" (jumlah pending)
- [ ] **Push notifications** (browser notification)
- [ ] **Reminder system** untuk approval yang hampir deadline
