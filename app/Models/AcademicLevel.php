<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AcademicLevel extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'order',
        'color',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
    ];

    /**
     * Relación con planes de pago
     */
    public function paymentPlans(): HasMany
    {
        return $this->hasMany(PaymentPlan::class);
    }

    /**
     * Planes activos de este nivel
     */
    public function activePaymentPlans()
    {
        return $this->hasMany(PaymentPlan::class)->where('is_active', true);
    }

    /**
     * Scope para niveles activos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('order');
    }
}
