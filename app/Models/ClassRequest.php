<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'class_template_id',
        'status',
        'student_message',
        'admin_response',
        'scheduled_class_id',
        'processed_by',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
    ];

    // Relaciones
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ClassTemplate::class, 'class_template_id');
    }

    public function scheduledClass(): BelongsTo
    {
        return $this->belongsTo(ScheduledClass::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeForStudent($query, $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    // Helpers
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function approve(int $adminId, ?string $response = null): void
    {
        $this->update([
            'status' => 'approved',
            'admin_response' => $response,
            'processed_by' => $adminId,
            'processed_at' => now(),
        ]);
    }

    public function reject(int $adminId, ?string $response = null): void
    {
        $this->update([
            'status' => 'rejected',
            'admin_response' => $response,
            'processed_by' => $adminId,
            'processed_at' => now(),
        ]);
    }

    public function markAsScheduled(int $scheduledClassId, int $adminId): void
    {
        $this->update([
            'status' => 'scheduled',
            'scheduled_class_id' => $scheduledClassId,
            'processed_by' => $adminId,
            'processed_at' => now(),
        ]);
    }
}
