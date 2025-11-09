<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MasterflowStep extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'masterflow_id',
        'jabatan_id',
        'step_order',
        'step_name',
        'description',
        'is_required',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'step_order' => 'integer',
        'is_required' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the masterflow that owns this step.
     */
    public function masterflow(): BelongsTo
    {
        return $this->belongsTo(Masterflow::class);
    }

    /**
     * Get the jabatan (position) for this step.
     */
    public function jabatan(): BelongsTo
    {
        return $this->belongsTo(Jabatan::class);
    }

    /**
     * Scope a query to only include required steps.
     */
    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }

    /**
     * Scope a query to order by step order.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('step_order');
    }

    /**
     * Get the previous step in the workflow.
     */
    public function previousStep()
    {
        return self::where('masterflow_id', $this->masterflow_id)
            ->where('step_order', '<', $this->step_order)
            ->orderBy('step_order', 'desc')
            ->first();
    }

    /**
     * Get the next step in the workflow.
     */
    public function nextStep()
    {
        return self::where('masterflow_id', $this->masterflow_id)
            ->where('step_order', '>', $this->step_order)
            ->orderBy('step_order')
            ->first();
    }

    /**
     * Check if this is the first step.
     */
    public function isFirstStep(): bool
    {
        return $this->step_order === 1;
    }

    /**
     * Check if this is the last step.
     */
    public function isLastStep(): bool
    {
        $maxOrder = self::where('masterflow_id', $this->masterflow_id)->max('step_order');
        return $this->step_order === $maxOrder;
    }
}
