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
        'remaining_amount',
        'payment_type',
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
        'remaining_amount' => 'float',
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
            
            // ✅ No cambiar el status, solo actualizar la mora
            $this->save();
        } else {
            // ✅ Si aún no pasó el período de gracia, asegurar que no haya mora
            if ($this->late_fee > 0) {
                $this->late_fee = 0;
                $this->save();
            }
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

    /**
     * Aplicar un pago parcial a esta cuota
     * 
     * @param float $amount Monto a aplicar
     * @return array Resultado de la operación
     */
    public function applyPartialPayment(float $amount): array
    {
        // Calcular cuánto falta pagar (incluyendo mora si existe)
        $totalOwed = $this->total_due - $this->paid_amount;

        if ($amount <= 0) {
            return [
                'success' => false,
                'message' => 'El monto debe ser mayor a cero',
            ];
        }

        if ($amount > $totalOwed) {
            // El pago excede lo adeudado, devolver el excedente
            $this->paid_amount = $this->total_due;
            $this->remaining_amount = 0;
            $this->payment_type = 'full';
            $this->status = 'paid';
            $this->paid_date = now();
            $this->save();

            return [
                'success' => true,
                'message' => 'Cuota pagada completamente',
                'amount_applied' => $totalOwed,
                'amount_remaining' => $amount - $totalOwed,
            ];
        }

        // Pago parcial
        $this->paid_amount += $amount;
        $this->remaining_amount = $this->total_due - $this->paid_amount;
        
        if ($this->remaining_amount <= 0) {
            $this->payment_type = 'full';
            $this->status = 'paid';
            $this->remaining_amount = 0;
            $this->paid_date = now();
        } else {
            $this->payment_type = ($this->payment_type === 'partial' || $this->paid_amount > 0) ? 'combined' : 'partial';
            $this->status = 'pending'; // Aún está pendiente hasta completar el monto total
        }

        $this->save();

        return [
            'success' => true,
            'message' => 'Pago parcial aplicado correctamente',
            'amount_applied' => $amount,
            'amount_remaining' => 0,
            'installment_remaining' => $this->remaining_amount,
        ];
    }

    /**
     * Calcular monto restante por pagar
     */
    public function getRemainingAmountAttribute(): float
    {
        $remaining = $this->attributes['remaining_amount'] ?? 0;
        
        // Si remaining_amount no está actualizado, calcularlo
        if ($remaining == 0 && $this->status === 'pending') {
            $remaining = $this->total_due - $this->paid_amount;
        }

        return max(0, $remaining);
    }
}

