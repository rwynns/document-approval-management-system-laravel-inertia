# Halaman Approver - Dokumentasi

## Overview

Halaman approver dirancang untuk user yang bertugas menyetujui atau menolak dokumen yang diajukan.

## Fitur Utama

### 1. Dashboard Approval (`/approvals`)

Halaman utama untuk melihat semua dokumen yang memerlukan approval.

**Fitur:**

- **Statistics Cards**: Menampilkan jumlah dokumen:
    - Menunggu persetujuan (Pending)
    - Sudah disetujui (Approved)
    - Ditolak (Rejected)
    - Terlambat/Overdue (melewati deadline)

- **Search & Filter**:
    - Search berdasarkan judul dokumen
    - Filter berdasarkan status (All, Pending, Approved, Rejected)
    - Tab navigation untuk quick filtering

- **Document List**:
    - Card-based layout untuk setiap dokumen
    - Informasi ditampilkan:
        - Judul dan nomor dokumen
        - Nama pengaju
        - Tanggal pengajuan
        - Approval step saat ini
        - Status approval
        - Deadline (dengan warning jika overdue)
    - Button "Lihat Detail" untuk melihat detail lengkap

- **Pagination**: Navigasi antar halaman jika dokumen banyak

### 2. Detail Approval (`/approvals/{id}`)

Halaman detail untuk mereview dokumen dan melakukan approve/reject.

**Informasi Dokumen:**

- Judul dan nomor dokumen
- Informasi pengaju (nama, jabatan)
- Tanggal pengajuan
- Deadline approval
- Approval step saat ini
- Deskripsi dokumen

**Alert Overdue:**

- Notifikasi merah jika dokumen melewati deadline
- Hanya muncul untuk approval yang masih pending

**File Dokumen:**

- Preview PDF langsung dalam modal
- Download file dokumen
- Informasi versi file

**Alur Persetujuan (Approval Workflow):**

- Timeline menampilkan semua approver
- Status setiap step (Pending, Approved, Rejected, Waiting)
- Komentar dari approver sebelumnya
- Alasan penolakan (jika ada)
- Highlight approval saat ini

**Action Buttons:**

- **Setujui**:
    - Modal dialog untuk konfirmasi
    - Komentar opsional
    - Proses approve dokumen
- **Tolak**:
    - Modal dialog dengan form
    - Alasan penolakan wajib diisi
    - Komentar tambahan (opsional)
    - Proses reject dokumen

## Routes

```php
Route::get('approvals', [DokumenApprovalController::class, 'index'])->name('approvals.index');
Route::get('approvals/{approval}', [DokumenApprovalController::class, 'show'])->name('approvals.show');
Route::post('approvals/{approval}/approve', [DokumenApprovalController::class, 'approve'])->name('approvals.approve');
Route::post('approvals/{approval}/reject', [DokumenApprovalController::class, 'reject'])->name('approvals.reject');
```

## Controllers

**DokumenApprovalController.php**

- `index()`: Menampilkan daftar approval dengan statistik dan filter
- `show()`: Menampilkan detail approval dengan workflow
- `approve()`: Memproses persetujuan dokumen
- `reject()`: Memproses penolakan dokumen

## Frontend Components

**Pages:**

- `/resources/js/pages/approver/index.tsx` - Halaman daftar approval
- `/resources/js/pages/approver/show.tsx` - Halaman detail approval

**Reusable Components:**

- PDFViewer - Untuk preview PDF dalam modal
- Dialog - Untuk approve/reject confirmation
- Badge - Untuk status indicator
- Card - Untuk layout

## User Flow

### Approver Workflow:

1. User login sebagai approver
2. Akses halaman `/approvals`
3. Lihat statistik dan daftar dokumen yang perlu di-approve
4. Filter/search dokumen jika perlu
5. Klik "Lihat Detail" pada dokumen
6. Review informasi dokumen dan file
7. Lihat workflow dan status approver lainnya
8. Preview PDF jika perlu
9. Pilih action:
    - **Setujui**: Tambahkan komentar (opsional) → Approve
    - **Tolak**: Isi alasan penolakan → Reject
10. Redirect ke halaman index dengan notifikasi sukses

## Security & Authorization

- Hanya user yang ditugaskan sebagai approver yang bisa akses
- Validasi `user_id` pada setiap approval request
- Tidak bisa approve/reject dokumen yang bukan miliknya
- Tidak bisa approve/reject jika sudah approved/rejected

## Status Dokumen

Setelah approval/rejection:

- **Approved**: Jika ini approval terakhir, status dokumen berubah jadi "approved"
- **Rejected**: Status dokumen langsung berubah jadi "rejected" (approval lain dibatalkan)
- **Pending**: Masih menunggu approval selanjutnya

## Toast Notifications

- ✅ Success: "Dokumen berhasil disetujui!" / "Dokumen berhasil ditolak!"
- ❌ Error: "Gagal menyetujui dokumen" / "Gagal menolak dokumen"
- ❌ "Preview hanya tersedia untuk file PDF"

## Styling

- Menggunakan Tailwind CSS
- Card-based responsive layout
- Color coding untuk status:
    - Yellow: Pending
    - Green: Approved
    - Red: Rejected
    - Gray: Waiting
    - Orange: Overdue
- Icons dari Tabler Icons
- Font: Serif untuk heading, Sans untuk body, Mono untuk kode/nomor

## Next Steps / Future Enhancements

1. ✅ **Real-time notifications**: Notifikasi ketika ada dokumen baru yang perlu di-approve
2. ✅ **Email notifications**: Email reminder untuk approval yang pending
3. ✅ **Delegation**: Fitur untuk delegate approval ke user lain
4. ✅ **Bulk actions**: Approve/reject multiple dokumen sekaligus
5. ✅ **Advanced filters**: Filter by date range, approver, company, dll
6. ✅ **Export**: Export daftar approval ke Excel/PDF
7. ✅ **Comments thread**: Diskusi antar approver dalam dokumen
8. ✅ **Audit trail**: Log semua aktivitas approval
