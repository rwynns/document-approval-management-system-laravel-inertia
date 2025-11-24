# Real-time WebSocket Troubleshooting Guide

## ✅ **PERBAIKAN YANG SUDAH DILAKUKAN**

### 1. **Channel Registration di `routes/channels.php`**

**MASALAH:** Channel `user.{userId}.dokumen` dan `dokumen.{id}` belum terdaftar!

**SOLUSI:** Sudah ditambahkan di `routes/channels.php`:

```php
// Public channel for dokumen updates (detail page)
Broadcast::channel('dokumen.{id}', function ($user, $id) {
    return true; // Public channel
});

// Public channel for user-specific dokumen updates (list page)
Broadcast::channel('user.{userId}.dokumen', function ($user, $userId) {
    return true; // Public channel
});
```

### 2. **Echo Configuration dengan Debug Mode**

**SOLUSI:** Sudah ditambahkan debug logging di `resources/js/app.tsx`:

```javascript
window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: false, // http untuk development
    enabledTransports: ['ws', 'wss'],
    enableLogging: true, // ← TAMBAHAN
    logToConsole: true, // ← TAMBAHAN
});
```

### 3. **Connection Monitoring di Frontend**

**SOLUSI:** Sudah ditambahkan monitoring WebSocket connection:

```javascript
window.Echo.connector.pusher.connection.bind('connected', () => {
    console.log('✅ WebSocket connected successfully');
});

window.Echo.connector.pusher.connection.bind('error', (err) => {
    console.error('❌ WebSocket connection error:', err);
});
```

---

## 📋 **LANGKAH TESTING (HARUS DILAKUKAN SEKARANG)**

### **Step 1: Restart Semua Service**

```bash
# Terminal 1: Stop dan restart Reverb
php artisan reverb:start

# Terminal 2: Stop dan restart Vite (Ctrl+C dulu)
npm run dev

# Terminal 3: Restart Laravel dev server (optional)
php artisan serve
```

### **Step 2: Hard Refresh Browser**

Tekan `Ctrl + Shift + R` untuk clear cache JavaScript

### **Step 3: Buka Browser Console**

Setelah login dan buka `/dokumen`, harus melihat:

```
📡 Laravel Echo initialized with Reverb: {broadcaster: "reverb", wsHost: "localhost", ...}
✅ WebSocket connected successfully
📡 Setting up real-time listener for user dokumen: 4
📻 Subscribed to channel: user.4.dokumen
```

### **Step 4: Test Manual Broadcasting**

Di terminal baru, jalankan:

```bash
php test_broadcast.php
```

Output harus:

```
✅ Event broadcasted successfully!
```

**Browser Console** harus menerima:

```
📡 Real-time dokumen update received: {dokumen: {...}}
```

### **Step 5: Test Real Approval**

1. Login sebagai **User A** (pemilik dokumen) di browser 1
2. Buka halaman `/dokumen`
3. Login sebagai **Approver** di browser 2
4. Approve dokumen milik User A
5. **Browser 1** harus langsung update + toast muncul!

---

## ✅ Checklist untuk Real-time bekerja

### 1. **Server Reverb sudah berjalan**

```bash
php artisan reverb:start
```

Harus melihat output:

```
Starting server on 0.0.0.0:8080
```

### 2. **Vite Dev Server sudah restart**

Setelah mengubah `app.tsx`, **HARUS** restart Vite:

```bash
# Stop dengan Ctrl+C, lalu:
npm run dev
```

### 3. **Broadcasting Configuration benar**

File `.env`:

```env
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=local
REVERB_APP_KEY=local-key
REVERB_APP_SECRET=local-secret
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

### 4. **Browser Console Check**

Buka **Developer Tools → Console**, harus melihat:

```
📡 Laravel Echo initialized with Reverb: {wsHost: "localhost", wsPort: "8080", appKey: "local-key"}
📡 Setting up real-time listener for user dokumen: 1
```

Jika ada error seperti:

```
WebSocket connection to 'ws://localhost:8080/...' failed
```

→ Berarti server Reverb belum jalan!

---

## 🔍 Debugging Steps

### Step 1: Cek Reverb Server

```bash
php artisan reverb:start
```

Output harus:

```
  INFO  Server running...

  Local: http://0.0.0.0:8080
```

### Step 2: Cek Browser Console Logs

Setelah login dan buka halaman `/dokumen`, console harus tampil:

```javascript
📡 Laravel Echo initialized with Reverb: ...
📡 Setting up real-time listener for user dokumen: [USER_ID]
```

### Step 3: Test Manual Broadcast

Buka **Laravel Tinker**:

```bash
php artisan tinker
```

Lalu jalankan:

```php
$dokumen = App\Models\Dokumen::first();
broadcast(new App\Events\UserDokumenUpdated($dokumen));
```

**Browser Console** harus menerima event:

```javascript
📡 Real-time dokumen update received: {dokumen: {...}, timestamp: "2024-..."}
```

### Step 4: Cek Reverb Console

Saat event di-broadcast, **Reverb console** harus tampil:

```
[2024-11-23 10:30:00] Broadcasting to channel: user.1.dokumen
```

### Step 5: Cek Network Tab

Buka **Developer Tools → Network → WS (WebSockets)**

Harus ada koneksi ke:

```
ws://localhost:8080/app/local-key?protocol=7&...
```

Status: `101 Switching Protocols` (hijau)

---

## 🚨 Common Issues

### Issue 1: "WebSocket connection failed"

**Penyebab:** Server Reverb tidak jalan

**Solusi:**

```bash
php artisan reverb:start
```

---

### Issue 2: "Echo is not defined" di browser console

**Penyebab:** Vite dev server belum di-restart setelah ubah `app.tsx`

**Solusi:**

```bash
# Stop Vite (Ctrl+C)
npm run dev
```

Hard refresh browser: `Ctrl + Shift + R`

---

### Issue 3: Event tidak diterima di halaman list dokumen

**Penyebab:** Channel name salah atau user_id tidak sesuai

**Debug:**

1. Cek browser console → Harus ada log: `📡 Setting up real-time listener for user dokumen: [USER_ID]`
2. Cek `user_id` di dokumen yang di-approve/reject
3. Pastikan channel name sama:
    - Backend: `user.{$dokumen->user_id}.dokumen`
    - Frontend: `user.${auth.user.id}.dokumen`

**Test:**

```javascript
// Di browser console:
console.log('Listening to channel:', `user.${window.auth?.user?.id}.dokumen`);
```

---

### Issue 4: Event diterima tapi halaman tidak refresh

**Penyebab:** `fetchDokumen()` tidak dipanggil atau error

**Debug:**

1. Tambahkan console.log di listener:

```javascript
window.Echo.channel(userChannelName).listen('.dokumen.updated', (event) => {
    console.log('🔥 Event received:', event); // ← Tambahkan ini
    fetchDokumen();
});
```

2. Cek apakah `fetchDokumen()` error di network tab

---

## 📡 Channel Structure

### Detail Page (show.tsx)

- **Channel:** `dokumen.{id}`
- **Event:** `.dokumen.updated`
- **Siapa yang dapat:** Semua orang yang buka detail dokumen tersebut

### List Page (index.tsx)

- **Channel:** `user.{user_id}.dokumen`
- **Event:** `.dokumen.updated`
- **Siapa yang dapat:** Hanya pemilik dokumen (user yang buat dokumen)

---

## 🧪 Manual Testing Flow

1. **Login sebagai User A** → Buat dokumen
2. **Login sebagai User B (Approver)** → Approve dokumen User A
3. **Browser User A** → Harus langsung update (tanpa refresh!)
4. **Console User A** → Harus tampil:
    ```
    📡 Real-time dokumen update received: {dokumen: {...}}
    📡 Dokumen "Judul Dokumen" telah diupdate!
    ```

---

## 🔧 File yang Terkait

### Backend:

- `app/Events/UserDokumenUpdated.php` - Event untuk broadcast ke pemilik dokumen
- `app/Events/DokumenUpdated.php` - Event untuk broadcast ke viewer detail page
- `app/Http/Controllers/DokumenApprovalController.php` - Trigger broadcast saat approve/reject

### Frontend:

- `resources/js/app.tsx` - Bootstrap Laravel Echo
- `resources/js/pages/dokumen/index.tsx` - Listen channel `user.{id}.dokumen`
- `resources/js/pages/dokumen/show.tsx` - Listen channel `dokumen.{id}`

---

## ✅ Success Indicators

Real-time bekerja dengan baik jika:

1. ✅ Reverb server console tampil log: `Broadcasting to channel: user.X.dokumen`
2. ✅ Browser console tampil: `📡 Real-time dokumen update received`
3. ✅ Toast notification muncul: `📡 Dokumen "..." telah diupdate!`
4. ✅ Tabel dokumen otomatis refresh (status berubah tanpa reload page)
5. ✅ Network tab tampil WS connection status: `OPEN`

---

## 📞 Contact

Jika masih ada masalah setelah ikuti semua step di atas, cek:

1. PHP version >= 8.2
2. Laravel version >= 11.x
3. Node.js version >= 18.x
4. Firewall tidak block port 8080
