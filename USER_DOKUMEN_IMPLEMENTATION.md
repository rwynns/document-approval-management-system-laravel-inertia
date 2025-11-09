# User Dokumen Management - Implementation Guide

## 📋 Overview

Halaman **Dokumen Saya** untuk User telah dibuat dengan layout konsisten menggunakan SidebarProvider + SiteHeader architecture, sama seperti halaman admin dan super admin lainnya.

## 🎯 Features Implemented

### 1. **Document Listing**

- Menampilkan semua dokumen milik user yang sedang login
- Filter by status (Draft, Submitted, Approved, Rejected)
- Search by judul dokumen, deskripsi, atau masterflow
- Pagination support (backend ready)

### 2. **Create Document**

- Form dialog untuk buat dokumen baru
- Required fields:
    - **Judul Dokumen** (text, max 255 chars)
    - **Masterflow** (dropdown, dari masterflows available)
    - **File Upload** (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX - max 10MB)
- Optional fields:
    - **Deskripsi** (textarea)

### 3. **Document Actions**

- **View** (Eye icon): Lihat detail dokumen (route: `/dokumen/{id}`)
- **Edit** (Edit icon): Edit dokumen - hanya untuk status `draft`
- **Delete** (Trash icon): Hapus dokumen - hanya untuk status `draft`

### 4. **Statistics Cards**

- Total Dokumen
- Draft
- Menunggu Persetujuan (Submitted + Under Review)
- Disetujui (Approved)

## 📂 Files Created/Modified

### New Files:

1. **`resources/js/pages/user/dokumen.tsx`** - Main page component

### Modified Files:

1. **`routes/api.php`** - Added API routes:

    ```php
    // Dokumen API Routes
    Route::get('/dokumen', [DokumenController::class, 'apiIndex']);
    Route::delete('/dokumen/{dokumen}', [DokumenController::class, 'destroy']);

    // Masterflow API Routes (via UserDashboardController)
    Route::get('/masterflows', [UserDashboardController::class, 'getMasterflows']);
    ```

2. **`app/Http/Controllers/DokumenController.php`** - Added `apiIndex()` method:
    ```php
    public function apiIndex(Request $request)
    {
        // Returns JSON with user's documents
        // Supports filters: status, status_current, my_documents, search
    }
    ```

## 🔧 Technical Stack

### Frontend:

- **React** with TypeScript
- **Inertia.js** for routing
- **Shadcn/ui** components:
    - SidebarProvider, SidebarInset, SiteHeader
    - Card, Table, Dialog, Badge
    - Input, Select, Textarea, Button
- **Tabler Icons** & **Lucide Icons**
- **Green Theme** consistency (#f4faf3, #4ba443, #234621)

### Backend:

- **Laravel 11**
- **Eloquent ORM** with relationships:
    - `Dokumen` model with User, Masterflow, Versions, Approvals
    - `DokumenVersion` for file versioning
    - `DokumenApproval` for approval workflow
- **File Storage**: `storage/app/public/dokumen`
- **Validation**: Server-side validation in DokumenController

## 📊 Database Schema

### `dokumen` table:

```sql
- id (bigint)
- judul_dokumen (string 255)
- user_id (FK to users)
- masterflow_id (FK to masterflows)
- comment_id (nullable FK to comments)
- status (string: draft, submitted, under_review, approved, rejected)
- tgl_pengajuan (date)
- deskripsi (text, nullable)
- status_current (string)
- created_at, updated_at
```

### `dokumen_version` table:

```sql
- id (bigint)
- dokumen_id (FK to dokumen)
- version (string)
- nama_file (string)
- tgl_upload (date)
- tipe_file (string)
- file_url (string)
- size_file (integer)
- status (string)
- created_at, updated_at
```

### `dokumen_approval` table:

```sql
- id (bigint)
- dokumen_id (FK to dokumen)
- user_id (FK to users - approver)
- dokumen_version_id (FK to dokumen_version)
- masterflow_step_id (FK to masterflow_steps)
- approval_status (string: pending, approved, rejected)
- tgl_approve (datetime)
- tgl_deadline (datetime)
- group_index (integer)
- jenis_group (string)
- alasan_reject (text)
- comment (text)
- created_at, updated_at
```

## 🔐 Security & Authorization

### Middleware:

- `auth` - Memastikan user sudah login
- Session-based authentication via Laravel Sanctum
- CSRF protection (sudah fixed dengan force refresh token)

### Authorization Rules:

- User hanya bisa melihat **dokumen milik sendiri** (`my_documents=true` filter)
- Edit/Delete hanya untuk dokumen dengan status `draft`
- Submit dokumen akan create approval workflow otomatis

## 🎨 Layout Consistency

### Structure:

```tsx
<SidebarProvider>
    <AppSidebar variant="inset" />
    <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2 p-6">
                <div className="space-y-8">
                    {/* Header Section */}
                    {/* Stats Cards */}
                    {/* Search and Filter */}
                    {/* Documents Table */}
                </div>
            </div>
        </div>
    </SidebarInset>
</SidebarProvider>
```

### Typography:

- **Headings**: `font-serif` (Crimson Text)
- **Body text**: `font-sans` (Inter)
- **Colors**: Semantic tokens (text-foreground, text-muted-foreground, border-border)

## 🚀 Usage Flow

### 1. Create New Document:

```
User clicks "Buat Dokumen"
→ Dialog opens with form
→ User fills: Judul, Masterflow, Deskripsi, File, Approvers
→ User chooses:
  A. "Simpan sebagai Draft" → Status: draft, status_current: draft
  B. "Submit untuk Approval" → Status: submitted, status_current: waiting_approval_1
→ Backend creates Dokumen + DokumenVersion (v1.0) + DokumenApproval records
→ Success toast shown
→ Table refreshes with new document
```

### 2. Submit Document for Approval:

```
User views document detail page
→ Clicks "Submit for Approval" button
→ Backend creates approval workflow:
  - Finds all users with required jabatan for each masterflow step
  - Creates DokumenApproval records for each approver
  - Status changes: draft → submitted
  - Status current: waiting_approval
→ Approvers receive notification (future feature)
```

### 3. Edit Document (Draft only):

```
User clicks Edit icon (green)
→ Redirects to /dokumen/{id}/edit
→ User can update: Judul, Masterflow, Deskripsi
→ Can NOT change file (need to upload new version)
→ Submit update
→ Document updated
```

### 4. Delete Document (Draft only):

```
User clicks Delete icon (red)
→ Confirmation dialog appears
→ User confirms
→ Backend deletes:
  - Associated file(s) from storage
  - DokumenVersion records
  - Dokumen record
→ Success toast shown
→ Table refreshes
```

## 📝 Status Badge Colors

| Status         | Badge Color | Meaning                                   |
| -------------- | ----------- | ----------------------------------------- |
| `draft`        | Gray        | Document belum disubmit                   |
| `submitted`    | Blue        | Document sudah disubmit, waiting approval |
| `under_review` | Yellow      | Document sedang direview                  |
| `approved`     | Green       | Document fully approved                   |
| `rejected`     | Red         | Document ditolak                          |

## 🎯 Status Dinamis untuk Submit

Ketika dokumen di-submit (bukan draft), status akan berubah menjadi:

- **Status**: `submitted`
- **Status Current**: `waiting_approval_1` (Menunggu approval tingkat 1)
- Status current akan berubah dinamis sesuai proses approval (waiting_approval_2, waiting_approval_3, dst.)

## 🔍 API Endpoints Used

### GET `/api/dokumen`

**Query Params:**

- `my_documents=true` - Filter by current user
- `status=draft` - Filter by status
- `status_current=waiting_approval` - Filter by current status
- `search=keyword` - Search by title/description

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "judul_dokumen": "...",
      "user": {...},
      "masterflow": {...},
      "latest_version": {...},
      "approvals": [...],
      ...
    }
  ],
  "success": true
}
```

### POST `/dokumen`

**Content-Type:** `multipart/form-data`

**Body:**

- `judul_dokumen` (required, string, max 255)
- `masterflow_id` (required, exists in masterflows)
- `deskripsi` (nullable, string)
- `file` (required, file, mimes: pdf,doc,docx,xls,xlsx,ppt,pptx, max 10MB)

**Response:** Redirect to `/dokumen/{id}` with success message

### DELETE `/api/dokumen/{id}`

**Authorization:** Must be document owner, status must be draft

**Response:**

```json
{
    "success": true,
    "message": "Dokumen berhasil dihapus"
}
```

### GET `/api/masterflows`

**Response:**

```json
{
    "masterflows": [
        {
            "id": 1,
            "name": "...",
            "description": "...",
            "steps_count": 3,
            "company": "..."
        }
    ]
}
```

## 🧪 Testing Checklist

- [ ] Navigate to `/user/dokumen` (assuming route added)
- [ ] Verify layout consistent with other admin pages
- [ ] Click "Buat Dokumen" button
- [ ] Fill form with valid data
- [ ] Upload file (PDF, DOC, etc.)
- [ ] Submit form
- [ ] ✅ Document should be created successfully
- [ ] ✅ Toast notification should appear
- [ ] ✅ Table should refresh with new document
- [ ] Search for document by title
- [ ] Filter by status (Draft, Submitted, etc.)
- [ ] Click View icon (Eye) - should redirect to detail page
- [ ] Click Edit icon (Pencil) - should redirect to edit page
- [ ] Click Delete icon (Trash) - should show confirmation dialog
- [ ] Confirm delete - document should be removed

## 🐛 Known Issues & TODOs

### Issues:

- None currently reported

### TODOs:

1. **Add route to web.php** for `/user/dokumen` if not exists
2. **Implement Document Detail Page** (`/dokumen/{id}`)
3. **Implement Document Edit Page** (`/dokumen/{id}/edit`)
4. **Add Submit for Approval button** on detail page
5. **Add Cancel Submission button** on detail page
6. **Implement File Download** functionality
7. **Add Version History** display on detail page
8. **Add Approval Timeline** on detail page
9. **Implement Pagination** on table (backend ready)
10. **Add Real-time Notifications** for approval updates

## 📚 Related Documentation

- `ADMIN_LAYOUT_CONSISTENCY.md` - Layout architecture guide
- `CSRF_TOKEN_FIX.md` - CSRF token handling
- `Dokumen.php` model - Eloquent relationships
- `DokumenVersion.php` model - File versioning
- `DokumenApproval.php` model - Approval workflow

---

**Created on**: January 14, 2025  
**Build Status**: ✅ Successful  
**Files Created**: 1  
**Files Modified**: 2  
**Lines of Code**: ~700+
