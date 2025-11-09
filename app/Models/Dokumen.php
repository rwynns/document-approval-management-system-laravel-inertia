<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dokumen extends Model
{
    use HasFactory;

    /**
     * Get the route key name for Laravel's route model binding.
     * This fixes the issue with Laravel's pluralization of "dokumen" to "dokuman"
     */
    public function getRouteKeyName()
    {
        return 'id';
    }

    /**
     * The table associated with the model.
     */
    protected $table = 'dokumen';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'nomor_dokumen',
        'judul_dokumen',
        'user_id',
        'company_id',
        'aplikasi_id',
        'masterflow_id',
        'comment_id',
        'status',
        'tgl_pengajuan',
        'tgl_deadline',
        'deskripsi',
        'status_current',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'tgl_pengajuan' => 'date',
        'tgl_deadline' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user who created this document.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the masterflow for this document.
     */
    public function masterflow(): BelongsTo
    {
        return $this->belongsTo(Masterflow::class);
    }

    /**
     * Get the company for this document.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the aplikasi for this document.
     */
    public function aplikasi(): BelongsTo
    {
        return $this->belongsTo(Aplikasi::class);
    }

    /**
     * Get the main comment for this document.
     */
    public function mainComment(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'comment_id');
    }

    /**
     * Get all versions of this document.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(DokumenVersion::class)->orderBy('created_at', 'desc');
    }

    /**
     * Get the latest version of this document.
     */
    public function latestVersion()
    {
        return $this->hasOne(DokumenVersion::class)->latest();
    }

    /**
     * Get all approvals for this document.
     */
    public function approvals(): HasMany
    {
        return $this->hasMany(DokumenApproval::class);
    }

    /**
     * Get all comments for this document.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->orderBy('created_at_custom', 'desc');
    }

    /**
     * Get pending approvals for this document.
     */
    public function pendingApprovals(): HasMany
    {
        return $this->hasMany(DokumenApproval::class)->where('approval_status', 'pending');
    }

    /**
     * Check if document is fully approved.
     */
    public function isFullyApproved(): bool
    {
        return $this->approvals()->where('approval_status', 'pending')->count() === 0 &&
            $this->approvals()->where('approval_status', 'approved')->count() > 0;
    }

    /**
     * Check if document has been rejected.
     */
    public function isRejected(): bool
    {
        return $this->approvals()->where('approval_status', 'rejected')->exists();
    }

    /**
     * Get approval progress percentage.
     */
    public function getApprovalProgress(): float
    {
        $totalApprovals = $this->approvals()->count();
        if ($totalApprovals === 0) return 0;

        $approvedCount = $this->approvals()->where('approval_status', 'approved')->count();
        return ($approvedCount / $totalApprovals) * 100;
    }

    /**
     * Scope to filter by status.
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter by current status.
     */
    public function scopeByCurrentStatus($query, $currentStatus)
    {
        return $query->where('status_current', $currentStatus);
    }

    /**
     * Scope to filter by user.
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}
