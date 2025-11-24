<?php

namespace App\Events;

use App\Models\Dokumen;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DokumenUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $dokumen;

    /**
     * Create a new event instance.
     */
    public function __construct(Dokumen $dokumen)
    {
        $this->dokumen = $dokumen->load([
            'user',
            'company',
            'aplikasi',
            'masterflow.steps.jabatan',
            'versions' => function ($query) {
                $query->orderBy('created_at', 'desc');
            },
            'approvals' => function ($query) {
                $query->with(['user', 'masterflowStep.jabatan']);
            },
        ]);
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {
        return new Channel('dokumen.' . $this->dokumen->id);
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'dokumen.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        Log::info('DokumenUpdated::broadcastWith called', [
            'dokumen_id' => $this->dokumen->id,
            'judul' => $this->dokumen->judul_dokumen,
            'status' => $this->dokumen->status
        ]);

        return [
            'dokumen' => $this->dokumen,
            'timestamp' => now()->toISOString(),
        ];
    }
}
