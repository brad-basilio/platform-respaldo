<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'academic_level',
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
        'monthly_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'late_fee_percentage' => 'decimal:2',
        'is_active' => 'boolean',
    ];

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
    public function scopeForLevel($query, string $level)
    {
        return $query->where('academic_level', $level);
    }

    /**
     * Scope para planes activos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Obtener label del nivel académico
     */
    public function getLevelLabelAttribute(): string
    {
        return match($this->academic_level) {
            'basic' => 'Básico',
            'intermediate' => 'Intermedio',
            'advanced' => 'Avanzado',
            default => 'Desconocido'
        };
    }
}
