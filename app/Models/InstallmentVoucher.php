<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstallmentVoucher extends Model
{
    use HasFactory;

    protected $fillable = [
        'installment_id',
        'uploaded_by',
        'voucher_path',
        'declared_amount',
        'payment_date',
        'payment_method',
        'transaction_reference',
        'status',
        'payment_type',
        'applied_to_total',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'notes',
        'receipt_path',
        'verified_amount',
    ];

    protected $casts = [
        'declared_amount' => 'float',
        'verified_amount' => 'float',
        'payment_date' => 'date',
        'reviewed_at' => 'datetime',
        'applied_to_total' => 'boolean',
    ];

    /**
     * Relación con la cuota
     */
    public function installment(): BelongsTo
    {
        return $this->belongsTo(Installment::class);
    }

    /**
     * Usuario que subió el voucher (asesor)
     */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Usuario que revisó el voucher (cajero)
     */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Scope para vouchers pendientes
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope para vouchers aprobados
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope para vouchers rechazados
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }
}
