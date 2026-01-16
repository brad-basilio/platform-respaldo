<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentMethod extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'student_id',
        'type',
        'provider',
        'card_brand',
        'card_last4',
        'card_exp_month',
        'card_exp_year',
        'cardholder_name',
        'culqi_card_id',
        'culqi_customer_id',
        'is_default',
        'auto_payment_enabled',
        'metadata',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'auto_payment_enabled' => 'boolean',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relación con Student
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Relación con CulqiTransaction
     */
    public function culqiTransactions(): HasMany
    {
        return $this->hasMany(CulqiTransaction::class);
    }

    /**
     * Obtener el nombre formateado de la tarjeta
     */
    public function getFormattedCardNameAttribute(): string
    {
        if ($this->type !== 'card') {
            return ucfirst($this->type);
        }

        $brand = ucfirst($this->card_brand ?? 'Tarjeta');
        return "{$brand} •••• {$this->card_last4}";
    }

    /**
     * Verificar si la tarjeta está expirada
     */
    public function isExpired(): bool
    {
        // Verificar que tengamos valores numéricos válidos
        if (!$this->card_exp_month || !$this->card_exp_year) {
            return false;
        }

        // Verificar que sean valores numéricos (no placeholders como ** o ****)
        if (!is_numeric($this->card_exp_month) || !is_numeric($this->card_exp_year)) {
            return false;
        }

        try {
            $expDate = \Carbon\Carbon::createFromDate((int) $this->card_exp_year, (int) $this->card_exp_month, 1)->endOfMonth();
            return $expDate->isPast();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Marcar como predeterminada (desmarcando las demás del mismo estudiante)
     */
    public function setAsDefault(): void
    {
        // Desmarcar todas las demás tarjetas del estudiante
        static::where('student_id', $this->student_id)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);

        // Marcar esta como predeterminada
        $this->update(['is_default' => true]);
    }

    /**
     * Scope para obtener solo métodos de pago activos
     */
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }

    /**
     * Scope para obtener el método predeterminado
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }
}
