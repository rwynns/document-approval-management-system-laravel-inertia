# Implementasi Real-Time WebSocket dengan Laravel Reverb

## Overview

Sistem real-time telah diimplementasikan untuk halaman detail dokumen menggunakan Laravel Reverb (WebSocket server) untuk mendapatkan update approval secara instant tanpa perlu polling.

## Fitur

- ✅ Real-time updates saat dokumen di-approve atau di-reject
- ✅ Toast notification saat ada update
- ✅ Tidak perlu refresh halaman atau polling interval
- ✅ WebSocket connection yang efisien

## Teknologi

- **Backend**: Laravel 11.x + Laravel Reverb
- **Frontend**: React + TypeScript + @laravel/echo-react
- **WebSocket**: Pusher protocol via Reverb
- **Notifications**: react-hot-toast

## File yang Diubah/Dibuat

### 1. Backend Event

**File**: `app/Events/DokumenUpdated.php`

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

### 2. Controller Broadcasting

**File**: `app/Http/Controllers/DokumenApprovalController.php`

Ditambahkan broadcast di method `approve()` dan `reject()`:

```php
use App\Events\DokumenUpdated;

// Di method approve() setelah checkAndUpdateDocumentStatus()
broadcast(new DokumenUpdated($approval->dokumen->fresh([
    'user', 'company', 'aplikasi',
    'masterflow.steps.jabatan',
    'versions', 'approvals.user.jabatan', 'approvals.groupIndex'
])))->toOthers();

// Di method reject() sebelum DB::commit()
broadcast(new DokumenUpdated($approval->dokumen->fresh([
    'user', 'company', 'aplikasi',
    'masterflow.steps.jabatan',
    'versions', 'approvals.user.jabatan', 'approvals.groupIndex'
])))->toOthers();
```

### 3. Frontend Real-Time Listener

**File**: `resources/js/pages/dokumen/show.tsx`

Menggunakan window.Echo untuk listen update:

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

### 3. Test Real-Time

1. Buka halaman detail dokumen di 2 browser/tab berbeda
2. Login sebagai approver yang berbeda di masing-masing tab
3. Approve dokumen di satu tab
4. Tab lainnya akan langsung mendapat update + toast notification tanpa refresh

## Channel Structure

- **Channel Name**: `dokumen.{id}` (public channel)
- **Event Name**: `.dokumen.updated`
- **Payload**:
    ```json
    {
      "dokumen": {
        "id": 1,
        "user": {...},
        "masterflow": {...},
        "approvals": [...],
        // ... semua relations
      },
      "timestamp": "2024-01-01 12:00:00"
    }
    ```

## Debugging

### Cek Reverb Server

```bash
# Pastikan Reverb berjalan
php artisan reverb:start --debug
```

### Cek Browser Console

Browser console akan menampilkan:

```
📡 Setting up real-time listener for dokumen: 1
📡 Real-time update received: {dokumen: {...}, timestamp: "..."}
🔌 Leaving channel: dokumen.1
```

### Cek Pusher Connection

Di browser console, cek:

```javascript
window.Echo.connector.pusher.connection.state;
// Should be: "connected"
```

## Best Practices

1. **Auto-cleanup**: Channel otomatis di-leave saat component unmount
2. **Efficient updates**: Hanya update state jika dokumen ID sama
3. **User feedback**: Toast notification memberi feedback visual
4. **No echo back**: Menggunakan `->toOthers()` agar user yang approve tidak mendapat broadcast sendiri

## Troubleshooting

### WebSocket tidak connect

1. Pastikan Reverb server running: `php artisan reverb:start`
2. Cek .env REVERB_PORT sesuai dengan yang dijalankan
3. Cek firewall tidak block port 8080

### Update tidak muncul

1. Cek browser console untuk error
2. Pastikan channel name benar: `dokumen.{id}`
3. Cek event name benar: `.dokumen.updated`
4. Verify broadcast event ter-trigger di controller

### Toast tidak muncul

1. Pastikan react-hot-toast sudah ter-install
2. Cek `showToast.success()` tersedia
3. Verify event.dokumen ada dan ID match

## Future Enhancements

1. Implementasi real-time di halaman list dokumen
2. Presence channel untuk show siapa yang sedang melihat dokumen
3. Typing indicator untuk catatan approval
4. Real-time notification counter di navbar
