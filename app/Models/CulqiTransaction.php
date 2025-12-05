<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CulqiTransaction extends Model
{
    protected $fillable = [
        'student_id',
        'installment_id',
        'payment_method_id',
        'culqi_charge_id',
        'culqi_token_id',
        'amount',
        'currency',
        'status',
        'failure_code',
        'failure_message',
        'culqi_response',
        'card_brand',
        'card_last4',
        'customer_email',
    ];

    protected $casts = [
        'culqi_response' => 'array',
        'amount' => 'decimal:2',
    ];

    /**
     * Relación con Student
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Relación con Installment
     */
    public function installment(): BelongsTo
    {
        return $this->belongsTo(Installment::class);
    }

    /**
     * Relación con PaymentMethod
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /**
     * Verificar si la transacción fue exitosa
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'succeeded';
    }

    /**
     * Verificar si la transacción falló
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }
}
