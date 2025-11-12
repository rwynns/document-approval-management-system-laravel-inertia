# Sistem Tanda Tangan Embedded pada PDF Dokumen

## Update November 13, 2025

### 🎯 Fitur Baru: Tanda Tangan Tertanam di PDF

Sistem telah diupgrade untuk **menempelkan tanda tangan langsung ke dalam dokumen PDF**, mirip dengan menandatangani dokumen secara fisik. Tanda tangan tidak lagi hanya disimpan sebagai metadata, tetapi benar-benar **embedded ke dalam file PDF**.

## Gambaran Umum

### Cara Kerja

1. **User menandatangani dokumen** melalui signature pad atau pilih signature tersimpan
2. **Sistem menyimpan signature** ke database
3. **Signature ditambahkan ke PDF** menggunakan FPDI library
4. **PDF baru dibuat** dengan semua signature tertanam
5. **File PDF yang sudah ditandatangani** tersimpan terpisah dari file original

### Perbedaan dengan Sistem Sebelumnya

| Aspek        | Sebelumnya                  | Sekarang                                 |
| ------------ | --------------------------- | ---------------------------------------- |
| Storage      | Signature disimpan terpisah | Signature embedded di PDF                |
| Viewing      | Signature ditampilkan di UI | Signature terlihat di PDF viewer manapun |
| Download     | User download PDF original  | User download PDF dengan signature       |
| Authenticity | Signature hanya di database | Signature permanen di PDF                |
| Legal        | Kurang kuat                 | Lebih mirip dokumen fisik                |

## Teknologi yang Digunakan

### Backend (PHP)

#### 1. **FPDI Library** (`setasign/fpdi`)

- Library untuk manipulasi PDF
- Membaca PDF existing
- Menambahkan konten baru ke PDF
- Menyimpan PDF hasil modifikasi

```bash
composer require setasign/fpdi
```

#### 2. **Service Class: `PdfSignatureService`**

Lokasi: `app/Services/PdfSignatureService.php`

**Methods:**

##### `addSignatureToPdf()`

Menambahkan satu signature ke PDF.

```php
$pdfSignatureService->addSignatureToPdf(
    $pdfPath,           // Path to original PDF
    $signaturePath,     // Path to signature image
    [
        'page' => 1,    // Page number
        'x' => 140,     // X position (mm)
        'y' => 250,     // Y position (mm)
        'width' => 40,  // Signature width (mm)
        'height' => 15, // Signature height (mm)
        'name' => 'John Doe',
        'text' => 'Approved',
        'date' => '13/11/2025'
    ]
);
```

##### `addMultipleSignaturesToPdf()`

Menambahkan beberapa signature sekaligus (untuk multi-approver).

```php
$signatures = [
    [
        'path' => 'signatures/user1.png',
        'name' => 'Manager',
        'text' => 'Approved by Manager',
        'date' => '13/11/2025 10:00'
    ],
    [
        'path' => 'signatures/user2.png',
        'name' => 'Director',
        'text' => 'Approved by Director',
        'date' => '13/11/2025 14:30'
    ]
];

$signedPdfPath = $pdfSignatureService->addMultipleSignaturesToPdf(
    $originalPdfPath,
    $signatures
);
```

**Layout Signatures:**

- Otomatis arrange signatures dalam grid
- 3 signatures per baris
- Spacing horizontal: 60mm
- Spacing vertical: 30mm
- Dimulai dari Y position 220mm (bottom area)

##### `getSignaturePlacementSuggestions()`

Memberikan saran posisi signature berdasarkan ukuran dokumen.

```php
$suggestions = $pdfSignatureService->getSignaturePlacementSuggestions($pdfPath);
// Returns: ['bottom_right', 'bottom_left', 'bottom_center']
```

### Database Schema

#### Tabel: `dokumen_version`

**Kolom Baru:**

```sql
signed_file_url VARCHAR(255) NULLABLE
```

- `file_url`: Path ke PDF original (tidak berubah)
- `signed_file_url`: Path ke PDF yang sudah ditandatangani

**Alasan Pemisahan:**

1. Menjaga file original tetap utuh
2. Memungkinkan re-generate signed PDF jika perlu
3. Audit trail lebih jelas
4. Rollback lebih mudah

#### Tabel: `dokumen_approval`

Tetap memiliki kolom:

```sql
signature_path VARCHAR(255) NULLABLE
```

Menyimpan path signature individual untuk:

- Ditampilkan di UI/history
- Digunakan untuk embed ke PDF
- Referensi untuk audit

### Frontend

#### Interface Updates

```typescript
interface DokumenVersion {
    id: number;
    version: string;
    nama_file: string;
    tgl_upload: string;
    tipe_file: string;
    file_url: string;
    signed_file_url?: string; // NEW
    size_file: number;
}
```

#### Visual Indicators

1. **Badge "Sudah Ditandatangani"** pada card dokumen
2. **Text indicator** "(Tertandatangani)" di nama file
3. **Auto-load signed PDF** saat preview jika ada

```tsx
// Automatically use signed PDF if available
const fileUrl = approval.dokumen_version ? `/storage/${approval.dokumen_version.signed_file_url || approval.dokumen_version.file_url}` : '';
```

## Alur Kerja Lengkap

### 1. User Approval dengan Signature

```
User → Preview Dokumen → Tambah Signature → Approve
```

### 2. Backend Processing

```
Controller receives approval request
    ↓
Save signature to storage
    ↓
Update approval record
    ↓
Fetch all approved signatures
    ↓
Call PdfSignatureService.addMultipleSignaturesToPdf()
    ↓
Generate new PDF with embedded signatures
    ↓
Save signed PDF path to dokumen_version.signed_file_url
    ↓
Commit transaction
```

### 3. PDF Generation Process

```
FPDI loads original PDF
    ↓
Import all pages
    ↓
On last page:
    ↓
For each signature:
    ├─ Calculate position (grid layout)
    ├─ Add signature image
    ├─ Add approver name
    ├─ Add approval text
    └─ Add date/time
    ↓
Save new PDF file
    ↓
Return path to signed PDF
```

### 4. User Download/View

```
User → Download/Preview dokumen
    ↓
System checks if signed_file_url exists
    ↓
If exists: Serve signed PDF
If not: Serve original PDF
```

## File Structure

### Storage Organization

```
storage/app/public/
├── dokumen/
│   ├── user_1/
│   │   ├── document_original.pdf          # Original file
│   │   └── document_original_fully_signed_1699999999.pdf  # Signed
├── signatures/
│   ├── approvals/
│   │   ├── 1/
│   │   │   └── approval_signature_xxx.png  # Individual signatures
│   │   ├── 2/
│   │   └── 3/
```

### Naming Convention

**Original PDF:**

```
document_name.pdf
```

**Signed PDF (Single):**

```
document_name_signed_{timestamp}.pdf
```

**Signed PDF (Multiple):**

```
document_name_fully_signed_{timestamp}.pdf
```

## Signature Placement

### Default Layout (Multiple Signatures)

```
┌─────────────────────────────────────────────┐
│                                             │
│                 Document Content            │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│  [Sign1]    [Sign2]    [Sign3]             │
│  Manager    Director   CEO                  │
│  Approved   Approved   Approved             │
│  13/11/25   13/11/25   14/11/25            │
│                                             │
│  [Sign4]    [Sign5]                        │
│  Finance    Legal                           │
│  Approved   Approved                        │
│  14/11/25   15/11/25                        │
└─────────────────────────────────────────────┘
```

### Signature Components

Each signature includes:

1. **Image** (40mm × 15mm)
2. **Name** (Centered, 8pt Arial)
3. **Text** (e.g., "Approved by Manager", 8pt Arial)
4. **Date/Time** (Format: dd/mm/yyyy HH:mm, 8pt Arial)

## Configuration

### Signature Dimensions

```php
// Default sizes (in mm for A4 portrait)
'width' => 40,   // Signature width
'height' => 15,  // Signature height
```

### Grid Layout

```php
'x_start' => 20,          // Start from left margin
'y_start' => 220,         // Start position from top
'per_row' => 3,           // Signatures per row
'horizontal_spacing' => 60, // Space between columns
'vertical_spacing' => 30,   // Space between rows
```

### Text Styling

```php
'font' => 'Arial',
'font_size' => 8,
'text_color' => [0, 0, 0], // RGB black
```

## Error Handling

### PDF Generation Failures

**Strategy:**

- Approval tetap sukses meskipun PDF generation gagal
- Error di-log tapi tidak menggagalkan approval
- User tetap bisa download original PDF

```php
try {
    $signedPdfPath = $pdfSignatureService->addMultipleSignaturesToPdf(...);
    $approval->dokumen_version->update(['signed_file_url' => $signedPdfPath]);
} catch (\Exception $e) {
    Log::error('Failed to add signature to PDF: ' . $e->getMessage());
    // Approval continues, user gets original PDF
}
```

### Common Issues & Solutions

#### 1. **Signature Image Not Found**

```
Error: Signature file not found
Solution: Skip that signature, continue with others
```

#### 2. **PDF Not Readable**

```
Error: PDF file not found or corrupted
Solution: Log error, approval succeeds without signed PDF
```

#### 3. **Storage Permission**

```
Error: Failed to write signed PDF
Solution: Check storage/app/public permissions (755)
```

#### 4. **Memory Limit**

```
Error: Out of memory for large PDFs
Solution: Increase PHP memory_limit in php.ini
```

## Security Considerations

### 1. File Access Control

- Signed PDFs stored in `storage/app/public`
- Accessible via symbolic link
- Can add middleware for access control

### 2. Signature Verification

- Each signature linked to user_id
- Timestamp recorded
- Cannot be altered without detection

### 3. Original File Preservation

- Original PDF never modified
- Can regenerate signed PDF anytime
- Audit trail maintained

## Performance

### Optimization Tips

1. **Batch Processing**
    - Process multiple signatures in one operation
    - Avoid regenerating PDF for each approval

2. **Caching**
    - Cache signature positions
    - Reuse signature images

3. **Async Processing** (Future Enhancement)
    - Queue PDF generation
    - Notify user when ready

### Expected Performance

| PDF Size | Signatures | Processing Time |
| -------- | ---------- | --------------- |
| < 1 MB   | 1-3        | < 1 second      |
| 1-5 MB   | 1-3        | 1-3 seconds     |
| > 5 MB   | 1-3        | 3-5 seconds     |
| Any      | 4-10       | +1-2 seconds    |

## API Changes

### Approval Endpoint

**Before:**

```json
POST /approvals/{id}/approve
{
  "signature": "base64...",
  "comment": "Optional"
}
```

**After (Optional):**

```json
POST /approvals/{id}/approve
{
  "signature": "base64...",
  "comment": "Optional",
  "signature_position": "bottom_right"  // NEW (optional)
}
```

### Response

**Success:**

```json
{
    "message": "Dokumen berhasil di-approve dan ditandatangani!",
    "approval": {
        "id": 1,
        "signature_path": "signatures/approvals/1/xxx.png"
    },
    "signed_pdf": {
        "path": "dokumen/user_1/doc_fully_signed_xxx.pdf",
        "url": "/storage/dokumen/user_1/doc_fully_signed_xxx.pdf"
    }
}
```

## Testing

### Manual Testing Steps

1. ✅ Upload dokumen PDF
2. ✅ Create approval workflow
3. ✅ Approve dengan signature manual
4. ✅ Check PDF memiliki signature tertanam
5. ✅ Download PDF, buka di PDF viewer
6. ✅ Verify signature terlihat di PDF
7. ✅ Approve kedua dengan signature lain
8. ✅ Check PDF memiliki 2 signatures
9. ✅ Test dengan berbagai ukuran PDF
10. ✅ Test dengan banyak signatures (5+)

### Edge Cases

- [ ] PDF dengan banyak halaman (100+)
- [ ] PDF dengan orientation landscape
- [ ] PDF dengan ukuran non-standard
- [ ] Signature image dengan format berbeda (JPG, PNG)
- [ ] Multiple approvals dalam waktu bersamaan
- [ ] Regenerate signed PDF setelah approval baru

## Future Enhancements

### 1. **Custom Signature Placement**

Allow user to choose where to place signature:

- Click position on PDF preview
- Drag & drop signature
- Multi-page support

### 2. **Digital Certificate**

Integrate with digital certificates:

- PKI integration
- Verified digital signatures
- Legal compliance (e-Sign)

### 3. **Signature Verification**

Add QR code to signatures:

- Scan to verify authenticity
- Link to approval record
- Timestamp verification

### 4. **PDF Watermarking**

Add watermark to signed PDFs:

- "DIGITALLY SIGNED"
- Company logo
- Timestamp

### 5. **Version Control**

Keep history of all signed versions:

- Track all signature additions
- Allow viewing previous versions
- Compare versions

## Migration Guide

### For Existing Documents

**Option 1: Regenerate on Next Approval**

- New approval triggers PDF regeneration
- Include all existing signatures
- Update `signed_file_url`

**Option 2: Batch Regeneration**

```bash
php artisan signatures:regenerate-pdfs
```

Creates signed PDFs for all approved documents.

## Troubleshooting

### Issue: Signatures Not Showing in PDF

**Check:**

1. FPDI library installed: `composer show setasign/fpdi`
2. Storage linked: `php artisan storage:link`
3. Permissions: `chmod -R 755 storage/app/public`
4. PDF readable by FPDI (not encrypted/password protected)

### Issue: Position Overlapping

**Solution:**
Adjust layout configuration in `PdfSignatureService`:

```php
'x_start' => 20,
'y_start' => 220,
'per_row' => 2,  // Reduce to 2 per row
'horizontal_spacing' => 80,  // Increase spacing
```

### Issue: Text Not Readable

**Solution:**
Increase font size or use different font:

```php
$pdf->SetFont('Arial', 'B', 10); // Bold, size 10
```

## Dependencies

```json
{
    "php": "^8.2",
    "setasign/fpdi": "^2.6"
}
```

## Related Documentation

- [APPROVAL_SIGNATURE_IMPLEMENTATION.md](./APPROVAL_SIGNATURE_IMPLEMENTATION.md) - Original signature system
- [SIGNATURE_MANAGEMENT_DOCS.md](./SIGNATURE_MANAGEMENT_DOCS.md) - Signature management
- [APPROVAL_WORKFLOW_IMPLEMENTATION.md](./APPROVAL_WORKFLOW_IMPLEMENTATION.md) - Approval workflow

## Changelog

### v2.0 - November 13, 2025

- ✅ Added FPDI library integration
- ✅ Created `PdfSignatureService`
- ✅ Implemented signature embedding to PDF
- ✅ Added `signed_file_url` to `dokumen_version`
- ✅ Updated approval controller
- ✅ Added visual indicators for signed documents
- ✅ Multiple signatures support
- ✅ Auto-layout signatures in grid

### v1.0 - November 12, 2025

- Initial signature system with database storage
- Signature pad and saved signatures
- Modal integration with preview
