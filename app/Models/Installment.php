<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Installment extends Model
{
    use HasFactory;

    protected $fillable = [
        'enrollment_id',
        'installment_number',
        'due_date',
        'amount',
        'late_fee',
        'paid_amount',
        'paid_date',
        'status',
        'verified_by',
        'verified_at',
        'notes',
    ];

    protected $casts = [
        'due_date' => 'date',
        'amount' => 'float',
        'late_fee' => 'float',
        'paid_amount' => 'float',
        'paid_date' => 'date',
        'verified_at' => 'datetime',
    ];

    /**
     * Relación con la matrícula
     */
    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    /**
     * Usuario que verificó el pago
     */
    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Vouchers de pago de esta cuota
     */
    public function vouchers(): HasMany
    {
        return $this->hasMany(InstallmentVoucher::class);
    }

    /**
     * Calcular mora automáticamente
     */
    public function calculateLateFee(): void
    {
        if ($this->status !== 'pending') {
            return;
        }

        $today = Carbon::today();
        $dueDate = Carbon::parse($this->due_date);
        $plan = $this->enrollment->paymentPlan;

        // Verificar si pasó la fecha de vencimiento + período de gracia
        $graceDeadline = $dueDate->copy()->addDays($plan->grace_period_days);

        if ($today->greaterThan($graceDeadline)) {
            // Calcular días de mora
            $daysLate = $graceDeadline->diffInDays($today);
            
            // Calcular mora: (monto * porcentaje_mora / 30) * días_mora
            $dailyLateFee = ($this->amount * ($plan->late_fee_percentage / 100)) / 30;
            $this->late_fee = round($dailyLateFee * $daysLate, 2);
            
            // Marcar como vencida
            if ($this->status === 'pending') {
                $this->status = 'overdue';
            }
            
            $this->save();
        }
    }

    /**
     * Total a pagar (monto + mora)
     */
    public function getTotalDueAttribute(): float
    {
        return $this->amount + $this->late_fee;
    }

    /**
     * Verificar si está vencida
     */
    public function getIsOverdueAttribute(): bool
    {
        if (in_array($this->status, ['paid', 'verified', 'cancelled'])) {
            return false;
        }

        $today = Carbon::today();
        $dueDate = Carbon::parse($this->due_date);
        $plan = $this->enrollment->paymentPlan;
        $graceDeadline = $dueDate->copy()->addDays($plan->grace_period_days);

        return $today->greaterThan($graceDeadline);
    }

    /**
     * Días de atraso
     */
    public function getDaysLateAttribute(): int
    {
        if (!$this->is_overdue) {
            return 0;
        }

        $dueDate = Carbon::parse($this->due_date);
        $plan = $this->enrollment->paymentPlan;
        $graceDeadline = $dueDate->copy()->addDays($plan->grace_period_days);

        return $graceDeadline->diffInDays(Carbon::today());
    }
}
