<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'payment_plan_id',
        'enrollment_fee',
        'enrollment_date',
        'enrollment_voucher_path',
        'enrollment_fee_verified',
        'verified_by',
        'verified_at',
        'status',
        'notes',
    ];

    protected $casts = [
        'enrollment_fee' => 'decimal:2',
        'enrollment_date' => 'date',
        'enrollment_fee_verified' => 'boolean',
        'verified_at' => 'datetime',
    ];

    /**
     * Relación con el estudiante
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Relación con el plan de pago
     */
    public function paymentPlan(): BelongsTo
    {
        return $this->belongsTo(PaymentPlan::class);
    }

    /**
     * Usuario que verificó la matrícula
     */
    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Cuotas de esta matrícula
     */
    public function installments(): HasMany
    {
        return $this->hasMany(Installment::class);
    }

    /**
     * Generar cronograma de cuotas automáticamente
     */
    public function generateInstallments(): void
    {
        $plan = $this->paymentPlan;
        $startDate = Carbon::parse($this->enrollment_date);

        for ($i = 1; $i <= $plan->installments_count; $i++) {
            $dueDate = $startDate->copy()->addMonths($i);

            Installment::create([
                'enrollment_id' => $this->id,
                'installment_number' => $i,
                'due_date' => $dueDate,
                'amount' => $plan->monthly_amount,
                'status' => 'pending',
            ]);
        }
    }

    /**
     * Calcular progreso de pago (%)
     */
    public function getPaymentProgressAttribute(): float
    {
        $total = $this->installments()->count();
        if ($total === 0) return 0;

        $paid = $this->installments()->whereIn('status', ['paid', 'verified'])->count();
        return ($paid / $total) * 100;
    }

    /**
     * Total pagado hasta ahora
     */
    public function getTotalPaidAttribute(): float
    {
        return $this->installments()
            ->whereIn('status', ['paid', 'verified'])
            ->sum('paid_amount');
    }

    /**
     * Total pendiente
     */
    public function getTotalPendingAttribute(): float
    {
        return $this->installments()
            ->where('status', 'pending')
            ->sum('amount');
    }
}
