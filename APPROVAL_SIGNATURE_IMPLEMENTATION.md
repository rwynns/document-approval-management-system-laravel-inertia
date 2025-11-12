# Sistem Tanda Tangan pada Approval Dokumen

## Gambaran Umum

Sistem tanda tangan digital telah diimplementasikan pada halaman approval dokumen, memungkinkan approver untuk menandatangani dokumen saat menyetujuinya.

## Fitur Utama

### 1. Dua Metode Tanda Tangan

Approver dapat memilih salah satu dari dua metode tanda tangan:

#### A. Gambar Manual (Draw Signature)

- Approver menggambar tanda tangan langsung pada canvas
- Tanda tangan dapat dihapus dan digambar ulang sebelum disimpan
- Mendukung mouse dan touch events (untuk perangkat mobile)
- Canvas berukuran 600x200 piksel

#### B. Gunakan Tanda Tangan Tersimpan

- Approver dapat memilih dari tanda tangan yang sudah disimpan sebelumnya
- Menampilkan semua tanda tangan milik user yang login
- Otomatis memilih tanda tangan default jika ada
- Mendukung tanda tangan yang dibuat manual maupun yang diupload

### 2. Integrasi dengan Preview Dokumen

- Tanda tangan ditambahkan dalam modal yang sama dengan preview dokumen PDF
- Layout split-view:
    - Kiri: Preview dokumen PDF
    - Kanan: Panel tanda tangan dan approval
- Approver dapat melihat dokumen sambil menandatangani

### 3. Validasi

- Approval tidak dapat dilakukan tanpa tanda tangan
- Toast notification muncul jika user mencoba approve tanpa tanda tangan
- Signature wajib diisi sebelum tombol "Setujui Dokumen" dapat digunakan

## Struktur File

### Frontend Components

#### 1. `resources/js/components/signature-pad.tsx`

Komponen reusable untuk menangani tanda tangan:

- Canvas untuk menggambar tanda tangan
- Fetch dan display tanda tangan tersimpan
- Handling signature selection dan completion
- Props:
    - `onSignatureComplete`: Callback ketika signature siap digunakan
    - `onCancel`: Optional callback untuk cancel action

#### 2. `resources/js/pages/approvals/show.tsx`

Halaman detail approval yang sudah diupdate:

- State management untuk signature
- Preview modal dengan signature panel
- Integration dengan approval workflow
- Menampilkan tanda tangan pada history approval

### Backend

#### 1. Migration

```php
// database/migrations/2025_11_12_181611_add_signature_path_to_dokumen_approval_table.php
- Menambahkan kolom 'signature_path' pada tabel 'dokumen_approval'
```

#### 2. Model Updates

```php
// app/Models/DokumenApproval.php
- Menambahkan 'signature_path' ke $fillable
- Menambahkan accessor 'signature_url'
- Menambahkan 'signature_url' ke $appends
```

#### 3. Controller Updates

```php
// app/Http/Controllers/DokumenApprovalController.php
- Method approve() diupdate untuk menangani signature
- Validasi signature required
- Storage signature (base64 atau URL existing)
- Auto-generate filename untuk new signatures
```

## Alur Kerja

### 1. User Membuka Detail Approval

```
User → Lihat Detail → Klik "Preview" → Modal Terbuka
```

### 2. Menandatangani Dokumen

#### Opsi A: Gambar Manual

```
Preview Modal → Tab "Gambar Tanda Tangan" →
Draw on Canvas → Klik "Gunakan Tanda Tangan Ini" →
Signature Tersimpan di State
```

#### Opsi B: Gunakan Tersimpan

```
Preview Modal → Tab "Gunakan Tanda Tangan Tersimpan" →
Pilih Signature → Klik "Gunakan Tanda Tangan Ini" →
Signature Tersimpan di State
```

### 3. Approval Dokumen

```
Signature Ready → (Optional) Tambah Komentar →
Klik "Setujui Dokumen" → POST ke Backend →
Signature Disimpan → Approval Success
```

### 4. Lihat History Approval

```
Approval Workflow Section →
Lihat Status Approval →
Tanda Tangan Ditampilkan (jika approved)
```

## Storage

### Signature Data Format

#### Manual Signature (Baru)

- Format: Base64 encoded PNG
- Dikonversi dan disimpan di: `storage/app/public/signatures/approvals/{approval_id}/{filename}.png`
- Filename: `approval_signature_{timestamp}_{random}.png`

#### Existing Signature

- Referensi path dari tabel `signatures`
- Path sudah ada di storage: `storage/app/public/signatures/user_{user_id}/{filename}.png`

## Database Schema

### Tabel: `dokumen_approval`

```sql
- signature_path: VARCHAR(255) NULLABLE
  → Path relatif ke file signature
  → Contoh: signatures/approvals/123/approval_signature_1699999999_abc123.png
```

### Relationship

- Signature disimpan per approval (bukan per user)
- Setiap approval memiliki signature sendiri
- Signature dapat berupa file baru atau referensi ke signature existing user

## API Endpoints yang Digunakan

### 1. GET `/settings/signatures`

- Mengambil daftar tanda tangan user yang login
- Response: Array of signature objects

### 2. POST `/approvals/{id}/approve`

Request Body:

```json
{
    "signature": "base64_string atau URL",
    "comment": "Optional comment"
}
```

## UI/UX Features

### Preview Modal

- Ukuran: 90vh x 90vw (Fullscreen-like)
- Responsive layout
- Split view (70% PDF, 30% Signature Panel)

### Signature Panel

States:

1. **Empty State**: Tombol "Tambah Tanda Tangan"
2. **Drawing State**: Canvas dengan tools
3. **Selected State**: Preview signature dengan opsi ganti/hapus
4. **Approval Ready**: Form komentar + tombol approve

### Visual Indicators

- ✅ Toast success ketika signature ditambahkan
- ❌ Toast error jika approve tanpa signature
- 🖼️ Preview signature pada approval workflow
- 🎨 Highlight approval yang sedang aktif

## Keamanan

### Validasi

1. **Frontend**:
    - Check signature tidak kosong sebelum submit
    - Validasi canvas tidak blank (pixel checking)
2. **Backend**:
    - Required validation pada signature field
    - Validasi user ownership (user_id match)
    - Validasi approval status (harus pending)

### File Storage

- Signature disimpan di storage/public (symbolic link)
- Path relatif disimpan di database
- Akses melalui Storage facade dengan proper permissions

## Testing Checklist

- [ ] Draw signature manual - sukses
- [ ] Clear canvas - sukses
- [ ] Gunakan signature tersimpan - sukses
- [ ] Approve dengan signature manual - sukses
- [ ] Approve dengan signature tersimpan - sukses
- [ ] Validasi tanpa signature - error ditampilkan
- [ ] Preview signature di workflow - tampil
- [ ] Mobile responsive - berfungsi
- [ ] Touch events - berfungsi

## Potential Enhancements

### Future Features

1. **Signature dengan PIN/Password**: Tambah verifikasi PIN sebelum approve
2. **Multi-Page PDF Signing**: Tanda tangan di halaman spesifik PDF
3. **Watermark**: Embed signature langsung ke PDF
4. **Audit Trail**: Log setiap perubahan signature
5. **Signature Templates**: Predefined signature styles
6. **Digital Certificate**: Integration dengan digital certificate untuk legal compliance

### Optimizations

1. **Image Compression**: Compress signature sebelum save
2. **Lazy Loading**: Load signature tersimpan on-demand
3. **Caching**: Cache signature URLs
4. **CDN**: Serve signature dari CDN

## Troubleshooting

### Signature tidak muncul

- Check: `php artisan storage:link` sudah dijalankan
- Check: Permission folder storage/app/public
- Check: Signature path di database valid

### Canvas tidak bisa draw

- Check: Canvas initialized properly
- Check: Touch events enabled
- Check: Canvas size tidak 0x0

### Approval gagal

- Check: Signature data tidak null
- Check: User memiliki permission approve
- Check: Approval status = 'pending'

## Dokumentasi Terkait

- [SIGNATURE_MANAGEMENT_DOCS.md](./SIGNATURE_MANAGEMENT_DOCS.md)
- [APPROVAL_WORKFLOW_IMPLEMENTATION.md](./APPROVAL_WORKFLOW_IMPLEMENTATION.md)
- [USER_DOKUMEN_IMPLEMENTATION.md](./USER_DOKUMEN_IMPLEMENTATION.md)
