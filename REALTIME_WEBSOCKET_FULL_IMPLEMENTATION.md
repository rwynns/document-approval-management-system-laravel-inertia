# Implementasi Real-Time WebSocket dengan Laravel Reverb

## Overview

Sistem real-time telah diimplementasikan untuk **halaman detail dokumen** dan **halaman list dokumen** menggunakan Laravel Reverb (WebSocket server) untuk mendapatkan update approval secara instant tanpa perlu polling.

## Fitur

- ✅ Real-time updates saat dokumen di-approve atau di-reject
- ✅ Toast notification saat ada update
- ✅ Tidak perlu refresh halaman atau polling interval
- ✅ WebSocket connection yang efisien
- ✅ **User-specific updates di halaman list dokumen**
- ✅ **Document-specific updates di halaman detail**

## Teknologi

- **Backend**: Laravel 11.x + Laravel Reverb
- **Frontend**: React + TypeScript + window.Echo
- **WebSocket**: Pusher protocol via Reverb
- **Notifications**: react-hot-toast

---

## File yang Diubah/Dibuat

### 1. Backend Events

#### A. DokumenUpdated (Detail Page)

**File**: `app/Events/DokumenUpdated.php`

Event ini untuk broadcast ke halaman detail dokumen.

```php
namespace App\Events;

use App\Models\Dokumen;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class DokumenUpdated implements ShouldBroadcast
{
    public function __construct(public Dokumen $dokumen) {}

    public function broadcastOn(): Channel
    {
        // Channel: dokumen.{id} - siapa saja yang melihat dokumen ini
        return new Channel('dokumen.' . $this->dokumen->id);
    }

    public function broadcastAs(): string
    {
        return 'dokumen.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'dokumen' => $this->dokumen,
            'timestamp' => now(),
        ];
    }
}
```

#### B. UserDokumenUpdated (List Page)

**File**: `app/Events/UserDokumenUpdated.php`

Event ini untuk broadcast ke halaman list dokumen milik user tertentu.

```php
namespace App\Events;

use App\Models\Dokumen;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class UserDokumenUpdated implements ShouldBroadcast
{
    public function __construct(public Dokumen $dokumen)
    {
        // Load all necessary relations
        $this->dokumen->load([
            'user',
            'company',
            'aplikasi',
            'masterflow.steps.jabatan',
            'versions',
            'approvals.user.jabatan',
            'approvals.groupIndex',
        ]);
    }

    public function broadcastOn(): Channel
    {
        // Channel: user.{userId}.dokumen - hanya owner dokumen
        return new Channel('user.' . $this->dokumen->user_id . '.dokumen');
    }

    public function broadcastAs(): string
    {
        return 'dokumen.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'dokumen' => $this->dokumen,
            'timestamp' => now(),
        ];
    }
}
```

---

### 2. Controller Broadcasting

**File**: `app/Http/Controllers/DokumenApprovalController.php`

Ditambahkan **dual broadcast** di method `approve()` dan `reject()`:

```php
use App\Events\DokumenUpdated;
use App\Events\UserDokumenUpdated;

// Di method approve() setelah checkAndUpdateDocumentStatus()
$freshDokumen = $approval->dokumen->fresh([
    'user', 'company', 'aplikasi',
    'masterflow.steps.jabatan',
    'versions', 'approvals.user', 'approvals.masterflowStep.jabatan'
]);

// Broadcast to detail page viewers
broadcast(new DokumenUpdated($freshDokumen))->toOthers();

// Broadcast to dokumen owner's list page
broadcast(new UserDokumenUpdated($freshDokumen))->toOthers();

// Di method reject() sebelum DB::commit() - sama seperti di atas
$freshDokumen = $approval->dokumen->fresh([...]);
broadcast(new DokumenUpdated($freshDokumen))->toOthers();
broadcast(new UserDokumenUpdated($freshDokumen))->toOthers();
```

**Kenapa Dual Broadcast?**

- `DokumenUpdated` → Update halaman detail yang sedang dibuka oleh approver
- `UserDokumenUpdated` → Update halaman list milik owner dokumen

---

### 3. Frontend Real-Time Listeners

#### A. Detail Page Listener

**File**: `resources/js/pages/dokumen/show.tsx`

Mendengarkan channel dokumen-specific:

```typescript
useEffect(() => {
    fetchMasterflows();

    // Real-time updates dengan Laravel Reverb
    if (typeof window !== 'undefined' && window.Echo && dokumen.id) {
        const channelName = `dokumen.${dokumen.id}`;

        window.Echo.channel(channelName).listen('.dokumen.updated', (event: any) => {
            if (event.dokumen && event.dokumen.id === dokumen.id) {
                setDokumen(event.dokumen);
                showToast.success('📡 Dokumen telah diupdate secara real-time!');
            }
        });

        return () => {
            window.Echo.leave(channelName);
        };
    }
}, [dokumen.id]);
```

#### B. List Page Listener

**File**: `resources/js/pages/dokumen/index.tsx`

Mendengarkan channel user-specific:

```typescript
useEffect(() => {
    if (!auth.user) {
        showToast.error('❌ Please login first to access Documents.');
        window.location.href = '/';
        return;
    }

    fetchDokumen();
    fetchMasterflows();

    // Real-time updates untuk user-specific dokumen
    if (typeof window !== 'undefined' && window.Echo && auth.user?.id) {
        const userChannelName = `user.${auth.user.id}.dokumen`;

        window.Echo.channel(userChannelName).listen('.dokumen.updated', (event: any) => {
            // Refresh dokumen list
            fetchDokumen();

            // Tampilkan notifikasi toast
            if (event.dokumen?.judul_dokumen) {
                showToast.success(`📡 Dokumen "${event.dokumen.judul_dokumen}" telah diupdate!`);
            } else {
                showToast.success('📡 Daftar dokumen telah diupdate secara real-time!');
            }
        });

        return () => {
            window.Echo.leave(userChannelName);
        };
    }
}, [auth.user]);
```

---

### 4. TypeScript Types

**File**: `resources/js/types/global.d.ts`

Ditambahkan type definition untuk window.Echo:

```typescript
import Echo from 'laravel-echo';

declare global {
    interface Window {
        Echo: Echo;
    }
}
```

---

## Konfigurasi .env

Broadcasting sudah dikonfigurasi dengan benar:

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

---

## Cara Menggunakan

### 1. Start Reverb Server

```bash
php artisan reverb:start
```

Server akan berjalan di `http://localhost:8080`

### 2. Start Development Server

```bash
npm run dev
# atau
php artisan serve
```

---

## Test Real-Time

### Skenario 1: Detail Page Real-Time

1. User A (Owner) buka detail dokumen di browser
2. User B (Approver) login dan buka detail dokumen yang sama
3. User B approve dokumen
4. **User A langsung melihat status berubah + toast notification**

### Skenario 2: List Page Real-Time

1. User A (Owner) buka halaman "Dokumen Saya" (list page)
2. User B (Approver) login dan approve dokumen milik User A
3. **User A langsung melihat list ter-refresh + toast notification dengan nama dokumen**

---

## Channel Structure

### Detail Page Channel

- **Channel Name**: `dokumen.{id}` (public channel)
- **Event Name**: `.dokumen.updated`
- **Who Listens**: Siapa saja yang membuka detail dokumen tersebut
- **Payload**:
    ```json
    {
      "dokumen": {
        "id": 1,
        "user": {...},
        "masterflow": {...},
        "approvals": [...]
      },
      "timestamp": "2024-01-01 12:00:00"
    }
    ```

### List Page Channel

- **Channel Name**: `user.{userId}.dokumen` (public channel)
- **Event Name**: `.dokumen.updated`
- **Who Listens**: Hanya owner dokumen (user yang buat dokumen)
- **Payload**:
    ```json
    {
      "dokumen": {
        "id": 1,
        "judul_dokumen": "Jurnal Besar",
        "user": {...},
        "masterflow": {...},
        "approvals": [...]
      },
      "timestamp": "2024-01-01 12:00:00"
    }
    ```

---

## Debugging

### Cek Reverb Server

```bash
# Pastikan Reverb berjalan dengan debug mode
php artisan reverb:start --debug
```

Output akan menampilkan:

```
[2024-01-01 12:00:00] New connection: socket-id
[2024-01-01 12:00:01] Subscribe: dokumen.1
[2024-01-01 12:00:02] Subscribe: user.5.dokumen
[2024-01-01 12:00:03] Message sent to dokumen.1
[2024-01-01 12:00:04] Message sent to user.5.dokumen
```

### Cek Browser Console (Detail Page)

```
📡 Setting up real-time listener for dokumen: 1
📡 Real-time update received: {dokumen: {...}, timestamp: "..."}
🔌 Leaving channel: dokumen.1
```

### Cek Browser Console (List Page)

```
📡 Setting up real-time listener for user dokumen: 5
📡 Real-time dokumen update received: {dokumen: {...}, timestamp: "..."}
🔌 Leaving channel: user.5.dokumen
```

### Cek Pusher Connection

Di browser console:

```javascript
window.Echo.connector.pusher.connection.state;
// Should be: "connected"
```

---

## Best Practices

### 1. Auto-cleanup

Channel otomatis di-leave saat component unmount untuk menghindari memory leak.

### 2. Efficient updates

- **Detail page**: Update state langsung dengan data baru
- **List page**: Re-fetch data untuk memastikan consistency

### 3. User feedback

Toast notification memberi feedback visual yang jelas:

- Detail page: "📡 Dokumen telah diupdate secara real-time!"
- List page: "📡 Dokumen 'Jurnal Besar' telah diupdate!"

### 4. No echo back

Menggunakan `->toOthers()` agar user yang approve tidak mendapat broadcast sendiri.

### 5. Dual Broadcasting Strategy

Setiap approval/rejection trigger **2 events**:

- Event 1: Update viewers di detail page
- Event 2: Update owner di list page

---

## Troubleshooting

### WebSocket tidak connect

1. ✅ Pastikan Reverb server running: `php artisan reverb:start`
2. ✅ Cek .env REVERB_PORT = 8080
3. ✅ Cek firewall tidak block port 8080
4. ✅ Restart Vite dev server setelah ubah .env

### Update tidak muncul di detail page

1. ✅ Cek browser console untuk error
2. ✅ Pastikan channel name: `dokumen.{id}`
3. ✅ Cek event name: `.dokumen.updated`
4. ✅ Verify DokumenUpdated event ter-trigger

### Update tidak muncul di list page

1. ✅ Cek browser console untuk error
2. ✅ Pastikan channel name: `user.{userId}.dokumen`
3. ✅ Verify UserDokumenUpdated event ter-trigger
4. ✅ Pastikan user_id di event sama dengan auth.user.id

### Toast tidak muncul

1. ✅ Cek react-hot-toast ter-install
2. ✅ Verify `showToast.success()` tersedia
3. ✅ Cek event.dokumen ada dan ID match

### List tidak refresh otomatis

1. ✅ Pastikan `fetchDokumen()` dipanggil di event listener
2. ✅ Cek API `/dokumen` mengembalikan data terbaru
3. ✅ Verify useState `setDokumen()` ter-trigger

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Approval Flow                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          DokumenApprovalController::approve()               │
│          - Save approval to database                         │
│          - Update document status                            │
│          - Add PDF signature                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│  DokumenUpdated Event     │   │ UserDokumenUpdated Event  │
│  Channel: dokumen.{id}    │   │ Channel: user.{uid}.dok   │
│  Listeners: Detail viewers│   │ Listeners: Doc owner      │
└───────────────────────────┘   └───────────────────────────┘
                │                           │
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   Laravel Reverb Server   │   │   Laravel Reverb Server   │
│   Port: 8080              │   │   Port: 8080              │
└───────────────────────────┘   └───────────────────────────┘
                │                           │
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│  Detail Page (show.tsx)   │   │  List Page (index.tsx)    │
│  - Update dokumen state   │   │  - Re-fetch dokumen list  │
│  - Show toast             │   │  - Show toast w/ title    │
└───────────────────────────┘   └───────────────────────────┘
```

---

## Future Enhancements

### 1. ✨ Presence Channel

Tampilkan siapa saja yang sedang melihat dokumen:

```typescript
window.Echo.join(`dokumen.${id}`)
    .here((users) => {
        console.log('Currently viewing:', users);
    })
    .joining((user) => {
        showToast.info(`${user.name} is now viewing this document`);
    })
    .leaving((user) => {
        showToast.info(`${user.name} left`);
    });
```

### 2. ✨ Typing Indicator

Tampilkan ketika approver sedang mengetik catatan:

```typescript
window.Echo.channel(`dokumen.${id}`).listenForWhisper('typing', (e) => {
    console.log(`${e.user.name} is typing...`);
});
```

### 3. ✨ Real-time Notification Counter

Update badge counter di navbar ketika ada dokumen baru:

```typescript
window.Echo.channel(`user.${auth.user.id}.notifications`).listen('.notification.new', (event) => {
    updateNotificationCount(event.count);
});
```

### 4. ✨ Broadcast Document Creation

Notify admin ketika user submit dokumen baru:

```typescript
// Event: DokumenCreated
broadcast(new DokumenCreated($dokumen))->toOthers();

// Admin dashboard listening:
window.Echo.channel('admin.documents')
    .listen('.dokumen.created', (event) => {
        showToast.info(`New document: ${event.dokumen.judul_dokumen}`);
    });
```

---

## Performance Tips

### 1. Lazy Load Relations

Hanya load relations yang diperlukan untuk broadcast:

```php
$this->dokumen->load(['user', 'approvals']);
// Jangan load semua relations jika tidak perlu
```

### 2. Queue Broadcasting

Untuk production, gunakan queue:

```php
class DokumenUpdated implements ShouldBroadcast, ShouldQueue
{
    // Akan di-queue, tidak blocking
}
```

### 3. Throttle Updates

Jika ada banyak update beruntun, throttle di frontend:

```typescript
const debouncedFetch = debounce(fetchDokumen, 500);
window.Echo.channel(channelName).listen('.dokumen.updated', () => {
    debouncedFetch();
});
```

---

## Summary

✅ **2 Halaman dengan Real-Time:**

- Detail Page (`show.tsx`) - dokumen-specific updates
- List Page (`index.tsx`) - user-specific updates

✅ **2 Events untuk Dual Broadcasting:**

- `DokumenUpdated` - untuk viewers di detail page
- `UserDokumenUpdated` - untuk owner di list page

✅ **Zero Polling:**

- Tidak ada lagi `setInterval` yang membebani server
- WebSocket connection yang persistent dan efficient

✅ **Instant User Feedback:**

- Toast notifications dengan informasi spesifik
- Real-time state updates tanpa delay

🚀 **Sistem approval sekarang benar-benar real-time!**
