<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'academic_level_id',
        'installments_count',
        'monthly_amount',
        'total_amount',
        'discount_percentage',
        'duration_months',
        'late_fee_percentage',
        'grace_period_days',
        'is_active',
        'description',
    ];

    protected $casts = [
        'installments_count' => 'integer',
        'monthly_amount' => 'float',
        'total_amount' => 'float',
        'discount_percentage' => 'float',
        'duration_months' => 'integer',
        'late_fee_percentage' => 'float',
        'grace_period_days' => 'integer',
        'is_active' => 'boolean',
        'academic_level_id' => 'integer',
    ];

    /**
     * Relación con nivel académico
     */
    public function academicLevel(): BelongsTo
    {
        return $this->belongsTo(AcademicLevel::class);
    }

    /**
     * Relación con matrículas
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * Scope para filtrar por nivel académico
     */
    public function scopeForLevel($query, int $levelId)
    {
        return $query->where('academic_level_id', $levelId);
    }

    /**
     * Scope para planes activos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
