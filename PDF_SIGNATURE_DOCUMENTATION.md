# 📝 Dokumentasi Sistem Tanda Tangan PDF

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Library yang Digunakan](#library-yang-digunakan)
3. [Cara Kerja Sistem](#cara-kerja-sistem)
4. [Konfigurasi Posisi Tanda Tangan](#konfigurasi-posisi-tanda-tangan)
5. [Struktur File](#struktur-file)
6. [Flow Proses](#flow-proses)
7. [Cara Mengatur Layout](#cara-mengatur-layout)
8. [Troubleshooting](#troubleshooting)
9. [Contoh Penggunaan](#contoh-penggunaan)

---

## Overview

Sistem tanda tangan digital ini memungkinkan approver untuk menandatangani dokumen PDF secara digital. Tanda tangan akan **tertempel langsung di file PDF** seperti tanda tangan fisik, bukan hanya tersimpan di database.

### Fitur Utama:

- ✅ Tanda tangan tertempel langsung di PDF
- ✅ Mendukung multiple signatures (banyak approver)
- ✅ Layout otomatis dalam bentuk grid
- ✅ Menyimpan nama approver, jabatan, dan tanggal
- ✅ File PDF original tetap aman (signed PDF disimpan terpisah)
- ✅ Support untuk tanda tangan manual (draw) dan saved signature

---

## Library yang Digunakan

### FPDI (Free PDF Document Importer)

**Package:** `setasign/fpdi`  
**Version:** `v2.6`  
**License:** MIT  
**Repository:** https://github.com/Setasign/FPDI

#### Instalasi:

```bash
composer require setasign/fpdi
```

#### Kenapa FPDI?

- ✅ Gratis dan open source
- ✅ Dapat membaca PDF yang sudah ada
- ✅ Dapat menambahkan elemen (gambar, teks) ke PDF
- ✅ Support berbagai format PDF
- ✅ Dokumentasi lengkap
- ✅ Aktif di-maintain

#### Dependensi:

FPDI extends dari **FPDF** library, jadi otomatis terinstall:

```json
{
    "require": {
        "setasign/fpdi": "^2.6"
    }
}
```

---

## Cara Kerja Sistem

### 1. **Capture Signature** (Frontend)

User menggambar tanda tangan atau memilih saved signature di modal approval:

```typescript
// resources/js/components/signature-pad.tsx
const SignaturePad = () => {
    // Canvas untuk menggambar
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Simpan sebagai base64 PNG
    const saveSignature = () => {
        const canvas = canvasRef.current;
        const dataURL = canvas.toDataURL('image/png');
        return dataURL; // "data:image/png;base64,iVBORw0KG..."
    };
};
```

### 2. **Save Signature** (Backend)

Controller menerima signature data dan menyimpannya:

```php
// app/Http/Controllers/DokumenApprovalController.php
public function approve(Request $request, DokumenApproval $approval)
{
    $validated = $request->validate([
        'signature' => 'required|string', // Base64 atau URL
    ]);

    // Decode base64 dan simpan sebagai file PNG
    $signaturePath = $this->saveSignatureFile($validated['signature']);

    // Simpan path ke database
    $approval->update([
        'signature_path' => $signaturePath,
        'approval_status' => 'approved',
    ]);
}
```

### 3. **Embed to PDF** (PdfSignatureService)

Service mengambil semua signature dan menempelkannya ke PDF:

```php
// app/Services/PdfSignatureService.php
public function addMultipleSignaturesToPdf(string $pdfPath, array $signatures)
{
    $pdf = new Fpdi();

    // 1. Load PDF original
    $pageCount = $pdf->setSourceFile($originalPdfPath);

    // 2. Import semua halaman
    for ($i = 1; $i <= $pageCount; $i++) {
        $pdf->AddPage();
        $tplIdx = $pdf->importPage($i);
        $pdf->useTemplate($tplIdx);

        // 3. Tambahkan signatures di halaman terakhir
        if ($i == $pageCount) {
            $this->addSignaturesToPage($pdf, $signatures);
        }
    }

    // 4. Save sebagai PDF baru
    $pdf->Output('F', $signedPdfPath);

    return $signedPdfPath;
}
```

### 4. **Update Database**

Path PDF yang sudah ditandatangani disimpan:

```php
$dokumenVersion->update([
    'signed_file_url' => $signedPdfPath,
]);
```

---

## Konfigurasi Posisi Tanda Tangan

### Lokasi Konfigurasi

File: `app/Services/PdfSignatureService.php`  
Method: `addMultipleSignaturesToPdf()`  
Line: ~160-180

### Parameter Layout

```php
// ===== KONFIGURASI LAYOUT =====
$signaturesPerRow = 3;      // Jumlah tanda tangan per baris
$signatureWidth = 35;        // Lebar tanda tangan (mm)
$signatureHeight = 13;       // Tinggi tanda tangan (mm)
$horizontalSpacing = 60;     // Jarak horizontal antar tanda tangan (mm)
$verticalSpacing = 30;       // Jarak vertical antar baris (mm)
$startXPosition = 20;        // Posisi X awal (mm dari kiri)
$startYPosition = 220;       // Posisi Y awal (mm dari atas)
// ===== END KONFIGURASI =====
```

### Sistem Koordinat PDF

```
(0,0) ← Top-Left
  ↓
  Y

  X →

Contoh kertas A4:
- Width: 210mm
- Height: 297mm

Koordinat tanda tangan:
- X: 20mm = 20mm dari kiri
- Y: 220mm = 220mm dari atas (dekat bawah)
```

### Perhitungan Grid Otomatis

```php
// Hitung row dan column untuk setiap signature
foreach ($signatures as $index => $signature) {
    $row = floor($index / $signaturesPerRow);
    $col = $index % $signaturesPerRow;

    // Hitung posisi X dan Y
    $x = $startXPosition + ($col * $horizontalSpacing);
    $y = $startYPosition + ($row * $verticalSpacing);

    // Tambahkan signature di posisi (x, y)
    $pdf->Image($signaturePath, $x, $y, $signatureWidth, $signatureHeight);
}
```

### Contoh Layout: 3 Tanda Tangan per Baris

```
Page (210mm x 297mm)
┌─────────────────────────────────────┐
│                                     │
│  [Konten PDF Original]              │
│                                     │
│                                     │
│                                     │
│                                     │
│  ┌─────┐  ┌─────┐  ┌─────┐        │ ← Row 1
│  │ TTD1│  │ TTD2│  │ TTD3│        │
│  │Name │  │Name │  │Name │        │
│  │Date │  │Date │  │Date │        │
│  └─────┘  └─────┘  └─────┘        │
│                                     │
│  ┌─────┐  ┌─────┐                  │ ← Row 2
│  │ TTD4│  │ TTD5│                  │
│  │Name │  │Name │                  │
│  │Date │  │Date │                  │
│  └─────┘  └─────┘                  │
└─────────────────────────────────────┘
```

---

## Struktur File

### Database Schema

```sql
-- Tabel: dokumen_approval
CREATE TABLE dokumen_approval (
    id BIGINT PRIMARY KEY,
    dokumen_id BIGINT,
    user_id BIGINT,
    signature_path VARCHAR(255), -- Path ke file signature PNG
    approval_status ENUM('pending', 'approved', 'rejected'),
    tgl_approve DATETIME,
    -- ... kolom lainnya
);

-- Tabel: dokumen_version
CREATE TABLE dokumen_version (
    id BIGINT PRIMARY KEY,
    dokumen_id BIGINT,
    file_url VARCHAR(255),        -- PDF original
    signed_file_url VARCHAR(255), -- PDF yang sudah ditandatangani
    -- ... kolom lainnya
);
```

### Storage Structure

```
storage/app/public/
├── signatures/
│   ├── approvals/
│   │   ├── 1/
│   │   │   └── approval_signature_1234567890_xxx.png
│   │   ├── 2/
│   │   │   └── approval_signature_1234567891_yyy.png
│   │   └── ...
│   └── user_2/
│       ├── drawn_1234567890_xxx.png
│       └── uploaded_1234567891_yyy.png
│
└── dokumen/
    ├── 2025110930/
    │   ├── 2025110930_Izin_Cuti_v1.pdf              ← Original
    │   └── 2025110930_Izin_Cuti_v1_signed_xxx.pdf   ← Signed
    └── ...
```

### File Structure

```
app/
├── Http/
│   └── Controllers/
│       └── DokumenApprovalController.php  ← Handle approval & signature
├── Services/
│   └── PdfSignatureService.php            ← Embed signature ke PDF
└── Models/
    ├── DokumenApproval.php                ← Model approval
    └── DokumenVersion.php                 ← Model dokumen version

resources/js/
├── components/
│   └── signature-pad.tsx                  ← Component untuk draw signature
└── pages/
    └── approvals/
        └── show.tsx                        ← Page approval dengan signature panel

database/migrations/
├── xxxx_add_signature_path_to_dokumen_approval_table.php
└── xxxx_add_signed_file_url_to_dokumen_version_table.php
```

---

## Flow Proses

### 1. User Opens Approval Page

```
User Login → /approvals/{id} → Load approval data
                                    ↓
                    Show PDF preview + Signature Panel
```

### 2. User Draws or Selects Signature

```typescript
// Option 1: Draw signature
<canvas ref={canvasRef} />
signatureData = canvas.toDataURL('image/png');

// Option 2: Use saved signature
<img src={savedSignature.url} />
signatureData = savedSignature.url;
```

### 3. User Clicks "Approve"

```javascript
const handleApprove = async () => {
    const response = await fetch(`/approvals/${approvalId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
            signature: signatureData, // Base64 atau URL
            comment: comment,
        }),
    });
};
```

### 4. Backend Process

```php
// DokumenApprovalController.php
public function approve(Request $request, DokumenApproval $approval)
{
    DB::beginTransaction();

    try {
        // 1. Save signature file
        $signaturePath = $this->saveSignatureFile($request->signature);

        // 2. Update approval status
        $approval->update([
            'approval_status' => 'approved',
            'signature_path' => $signaturePath,
            'tgl_approve' => now(),
        ]);

        // 3. Get all approved signatures for this document
        $allSignatures = DokumenApproval::where('dokumen_id', $approval->dokumen_id)
            ->where('approval_status', 'approved')
            ->get();

        // 4. Embed signatures to PDF
        $signedPdfPath = $pdfSignatureService->addMultipleSignaturesToPdf(
            $originalPdfPath,
            $allSignatures
        );

        // 5. Update dokumen version
        $approval->dokumenVersion->update([
            'signed_file_url' => $signedPdfPath,
        ]);

        DB::commit();

        return redirect()->route('approvals.index')
            ->with('success', 'Dokumen berhasil di-approve!');

    } catch (\Exception $e) {
        DB::rollback();
        Log::error('Failed to approve: ' . $e->getMessage());
        return back()->withErrors(['error' => $e->getMessage()]);
    }
}
```

### 5. PdfSignatureService Process

```php
// PdfSignatureService.php
public function addMultipleSignaturesToPdf($pdfPath, $signatures)
{
    $pdf = new Fpdi();

    // Load original PDF
    $fullPdfPath = Storage::disk('public')->path($pdfPath);
    $pageCount = $pdf->setSourceFile($fullPdfPath);

    // Import all pages
    for ($i = 1; $i <= $pageCount; $i++) {
        $pdf->AddPage();
        $tplIdx = $pdf->importPage($i);
        $pdf->useTemplate($tplIdx);

        // Add signatures on last page
        if ($i == $pageCount) {
            foreach ($signatures as $index => $sig) {
                // Calculate position
                $row = floor($index / $signaturesPerRow);
                $col = $index % $signaturesPerRow;
                $x = $startX + ($col * $spacing);
                $y = $startY + ($row * $verticalSpacing);

                // Add signature image
                $sigPath = Storage::disk('public')->path($sig['path']);
                $pdf->Image($sigPath, $x, $y, $width, $height, 'PNG');

                // Add text (name, role, date)
                $pdf->SetFont('Arial', '', 8);
                $pdf->SetXY($x, $y + $height + 2);
                $pdf->Cell($width, 4, $sig['name'], 0, 0, 'C');
                $pdf->SetXY($x, $y + $height + 6);
                $pdf->Cell($width, 4, $sig['role'], 0, 0, 'C');
                $pdf->SetXY($x, $y + $height + 10);
                $pdf->Cell($width, 4, $sig['date'], 0, 0, 'C');
            }
        }
    }

    // Generate new filename
    $signedPath = str_replace('.pdf', '_signed_' . time() . '.pdf', $pdfPath);
    $fullSignedPath = Storage::disk('public')->path($signedPath);

    // Save signed PDF
    $pdf->Output('F', $fullSignedPath);

    return $signedPath;
}
```

---

## Cara Mengatur Layout

### Metode 1: Edit Langsung di Service (Quick)

Edit file `app/Services/PdfSignatureService.php`:

```php
public function addMultipleSignaturesToPdf(string $pdfPath, array $signatures): string
{
    // ...existing code...

    // ===== UBAH NILAI DI SINI =====
    $signaturesPerRow = 3;    // Ganti angka ini
    $signatureWidth = 35;      // Ganti angka ini
    $signatureHeight = 13;     // Ganti angka ini
    $horizontalSpacing = 60;   // Ganti angka ini
    $verticalSpacing = 30;     // Ganti angka ini
    $startXPosition = 20;      // Ganti angka ini
    $startYPosition = 220;     // Ganti angka ini
    // ===== END =====

    // ...existing code...
}
```

**Kelebihan:**

- ✅ Cepat dan mudah
- ✅ Langsung terlihat hasilnya

**Kekurangan:**

- ❌ Harus edit kode
- ❌ Tidak flexible

### Metode 2: Menggunakan Config File (Recommended)

#### Step 1: Buat Config File

Buat file `config/pdf_signature.php`:

```php
<?php

return [
    'layout' => [
        'signatures_per_row' => env('PDF_SIGNATURE_PER_ROW', 3),
        'width' => env('PDF_SIGNATURE_WIDTH', 35),
        'height' => env('PDF_SIGNATURE_HEIGHT', 13),
        'horizontal_spacing' => env('PDF_SIGNATURE_H_SPACING', 60),
        'vertical_spacing' => env('PDF_SIGNATURE_V_SPACING', 30),
        'start_x' => env('PDF_SIGNATURE_START_X', 20),
        'start_y' => env('PDF_SIGNATURE_START_Y', 220),
    ],

    'text' => [
        'name_font_size' => 9,
        'role_font_size' => 8,
        'date_font_size' => 7,
    ],
];
```

#### Step 2: Update Service

Update `app/Services/PdfSignatureService.php`:

```php
public function addMultipleSignaturesToPdf(string $pdfPath, array $signatures): string
{
    // Load configuration
    $layout = config('pdf_signature.layout');

    $signaturesPerRow = $layout['signatures_per_row'];
    $signatureWidth = $layout['width'];
    $signatureHeight = $layout['height'];
    $horizontalSpacing = $layout['horizontal_spacing'];
    $verticalSpacing = $layout['vertical_spacing'];
    $startXPosition = $layout['start_x'];
    $startYPosition = $layout['start_y'];

    // ...existing code...
}
```

#### Step 3: Set di .env File

Edit file `.env`:

```env
PDF_SIGNATURE_PER_ROW=3
PDF_SIGNATURE_WIDTH=35
PDF_SIGNATURE_HEIGHT=13
PDF_SIGNATURE_H_SPACING=60
PDF_SIGNATURE_V_SPACING=30
PDF_SIGNATURE_START_X=20
PDF_SIGNATURE_START_Y=220
```

#### Step 4: Clear Config Cache

```bash
php artisan config:clear
php artisan config:cache
```

**Kelebihan:**

- ✅ Tidak perlu edit kode
- ✅ Bisa diubah via .env
- ✅ Konsisten di seluruh aplikasi
- ✅ Easy to maintain

**Kekurangan:**

- ❌ Perlu setup awal

### Metode 3: Dynamic via Database (Advanced)

Untuk aplikasi yang memerlukan user bisa mengatur posisi dari UI.

#### Step 1: Migration

```bash
php artisan make:migration create_signature_settings_table
```

```php
public function up(): void
{
    Schema::create('signature_settings', function (Blueprint $table) {
        $table->id();
        $table->integer('signatures_per_row')->default(3);
        $table->integer('width')->default(35);
        $table->integer('height')->default(13);
        $table->integer('horizontal_spacing')->default(60);
        $table->integer('vertical_spacing')->default(30);
        $table->integer('start_x')->default(20);
        $table->integer('start_y')->default(220);
        $table->timestamps();
    });

    // Insert default
    DB::table('signature_settings')->insert([
        'signatures_per_row' => 3,
        'width' => 35,
        'height' => 13,
        'horizontal_spacing' => 60,
        'vertical_spacing' => 30,
        'start_x' => 20,
        'start_y' => 220,
    ]);
}
```

#### Step 2: Model

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SignatureSetting extends Model
{
    protected $fillable = [
        'signatures_per_row',
        'width',
        'height',
        'horizontal_spacing',
        'vertical_spacing',
        'start_x',
        'start_y',
    ];

    public static function get()
    {
        return static::first() ?? new static();
    }
}
```

#### Step 3: Update Service

```php
public function addMultipleSignaturesToPdf(string $pdfPath, array $signatures): string
{
    // Load from database
    $settings = SignatureSetting::get();

    $signaturesPerRow = $settings->signatures_per_row;
    $signatureWidth = $settings->width;
    // ... dst

    // ...existing code...
}
```

#### Step 4: Admin UI (Optional)

Buat halaman admin untuk mengatur settings.

---

## Troubleshooting

### 1. Tanda Tangan Tidak Muncul di PDF

**Penyebab:**

- File signature tidak ditemukan
- Path signature salah
- Permission storage tidak tepat

**Solusi:**

```bash
# Cek permission
php artisan storage:link
chmod -R 775 storage/app/public

# Cek log
tail -f storage/logs/laravel.log
```

### 2. PDF Rusak Setelah Ditandatangani

**Penyebab:**

- PDF original menggunakan encoding khusus
- FPDI tidak support PDF version

**Solusi:**

```php
// Coba convert PDF ke version yang lebih lama dulu
// Gunakan Ghostscript atau pdf2pdf
```

### 3. Posisi Tanda Tangan Terpotong

**Penyebab:**

- Koordinat Y terlalu besar (keluar dari halaman)
- Ukuran signature terlalu besar

**Solusi:**

```php
// Adjust startYPosition
$startYPosition = 220; // Ubah jadi lebih kecil
// Atau adjust signature height
$signatureHeight = 10; // Ubah jadi lebih kecil
```

### 4. Text Tanda Tangan Overlapping

**Penyebab:**

- horizontalSpacing terlalu kecil
- signatureWidth terlalu besar

**Solusi:**

```php
// Increase spacing
$horizontalSpacing = 70; // Dari 60 → 70
// Atau decrease width
$signatureWidth = 30; // Dari 35 → 30
```

### 5. Signature Blur/Pecah

**Penyebab:**

- Canvas resolution terlalu kecil
- Kompresi PNG terlalu tinggi

**Solusi:**

```typescript
// Di signature-pad.tsx
const canvas = canvasRef.current;
canvas.width = 600; // Increase width
canvas.height = 300; // Increase height

// Save dengan quality tinggi
const dataURL = canvas.toDataURL('image/png', 1.0);
```

---

## Contoh Penggunaan

### Skenario 1: Dokumen dengan 2 Approver

**Input:**

- Manager: Approved dengan signature
- Kepala Divisi: Approved dengan signature

**Output PDF:**

```
┌─────────────────────────────┐
│  [PDF Content]              │
│                             │
│  ┌─────┐  ┌─────┐          │
│  │ Sig1│  │ Sig2│          │
│  │Mgr  │  │Kadiv│          │
│  │Date │  │Date │          │
│  └─────┘  └─────┘          │
└─────────────────────────────┘
```

### Skenario 2: Dokumen dengan 5 Approver

**Input:**

- 5 approver sudah approve dengan signature

**Output PDF:**

```
┌─────────────────────────────┐
│  [PDF Content]              │
│                             │
│  ┌───┐ ┌───┐ ┌───┐         │ Row 1
│  │Sg1│ │Sg2│ │Sg3│         │
│  └───┘ └───┘ └───┘         │
│                             │
│  ┌───┐ ┌───┐               │ Row 2
│  │Sg4│ │Sg5│               │
│  └───┘ └───┘               │
└─────────────────────────────┘
```

### Skenario 3: Custom Layout - Vertical Stack

```php
// Set: signaturesPerRow = 1
$signaturesPerRow = 1;
$signatureWidth = 80;
$signatureHeight = 40;
```

**Output:**

```
┌─────────────────────────────┐
│  [PDF Content]              │
│                             │
│  ┌───────────┐              │
│  │ Signature1│              │
│  │   Name    │              │
│  │   Date    │              │
│  └───────────┘              │
│  ┌───────────┐              │
│  │ Signature2│              │
│  │   Name    │              │
│  │   Date    │              │
│  └───────────┘              │
└─────────────────────────────┘
```

---

## Tips & Best Practices

### 1. **Signature Quality**

```typescript
// Use high resolution canvas
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 300;

// Save without compression
canvas.toDataURL('image/png', 1.0);
```

### 2. **File Naming Convention**

```php
// Clear and descriptive
$filename = $docNumber . '_signed_' . time() . '.pdf';
// Example: 2025110930_signed_1699876543.pdf
```

### 3. **Error Handling**

```php
try {
    $signedPath = $pdfService->addMultipleSignaturesToPdf(...);
} catch (\Exception $e) {
    Log::error('PDF Signature Error: ' . $e->getMessage());
    // Don't fail the whole approval
    // Just log and continue
}
```

### 4. **Storage Organization**

```
storage/app/public/
├── signatures/       ← Temporary signatures
│   └── approvals/
└── dokumen/          ← Final signed PDFs
    └── {doc_number}/
```

### 5. **Testing Different Layouts**

```php
// Test dengan 1 signature
// Test dengan 3 signatures
// Test dengan 6 signatures (2 rows)
// Test dengan 10 signatures
```

---

## Referensi

### Documentation

- FPDI Official: https://www.setasign.com/products/fpdi/manual/
- FPDF Manual: http://www.fpdf.org/
- PHP GD Library: https://www.php.net/manual/en/book.image.php

### Alternatif Library

1. **DomPDF** - Generate PDF from HTML
2. **TCPDF** - Advanced PDF features
3. **mPDF** - HTML to PDF converter
4. **PDFtk** - Command line PDF toolkit

### Useful Commands

```bash
# Clear config
php artisan config:clear

# Clear cache
php artisan cache:clear

# Check storage permissions
ls -la storage/app/public

# Create storage link
php artisan storage:link

# View logs
tail -f storage/logs/laravel.log

# Check installed packages
composer show setasign/fpdi
```

---

## Changelog

### Version 1.0 (2025-11-13)

- ✅ Initial implementation
- ✅ Multiple signatures support
- ✅ Grid layout automatic
- ✅ Signature with text (name, role, date)
- ✅ Support manual draw & saved signature

### Future Enhancements

- [ ] Custom position per signature
- [ ] QR Code signature verification
- [ ] Signature validation
- [ ] Watermark support
- [ ] Multiple pages signature
- [ ] Drag & drop signature position (UI)
- [ ] Signature template presets

---

## Support

Jika ada pertanyaan atau issue:

1. Cek log: `storage/logs/laravel.log`
2. Cek dokumentasi FPDI
3. Test dengan PDF sederhana dulu
4. Pastikan storage permission benar

---

**Dokumentasi ini dibuat pada:** 13 November 2025  
**Versi:** 1.0  
**Maintainer:** Development Team
