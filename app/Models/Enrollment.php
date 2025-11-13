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
        'enrollment_fee' => 'float',
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
     * Generar cronograma de cuotas automáticamente basado en la fecha de pago del estudiante
     */
    public function generateInstallments(): void
    {
        $plan = $this->paymentPlan;
        $student = $this->student;
        
        // Usar la fecha de pago del estudiante como base, o enrollment_date si no existe
        $paymentDate = $student->payment_date ? Carbon::parse($student->payment_date) : Carbon::parse($this->enrollment_date);

        for ($i = 1; $i <= $plan->installments_count; $i++) {
            // ✅ Primera cuota vence el mismo mes del pago inicial
            // Cuota #1: mismo mes (0 meses después)
            // Cuota #2: 1 mes después
            // Cuota #3: 2 meses después, etc.
            // Ejemplo: pago el 2 de octubre → vence el 2 de octubre, luego 2 de noviembre, etc.
            $dueDate = $paymentDate->copy()->addMonths($i - 1);

            Installment::create([
                'enrollment_id' => $this->id,
                'installment_number' => $i,
                'due_date' => $dueDate,
                'amount' => $plan->monthly_amount,
                'late_fee' => 0, // Sin mora inicial
                'status' => 'pending',
            ]);
        }
    }

    /**
     * Calcular progreso de pago (%)
     */
    public function getPaymentProgressAttribute(): float
    {
        $totalAmount = $this->paymentPlan->total_amount;
        if ($totalAmount == 0) return 0;

        $totalPaid = $this->total_paid;
        return min(100, ($totalPaid / $totalAmount) * 100);
    }

    /**
     * Total pagado hasta ahora (suma de todos los paid_amount aprobados)
     */
    public function getTotalPaidAttribute(): float
    {
        // Sumar el paid_amount de todas las cuotas
        // (solo cuenta lo que realmente está aprobado/verificado)
        return $this->installments()
            ->whereIn('status', ['paid', 'verified'])
            ->sum('paid_amount');
    }

    /**
     * Total pendiente (considerando pagos parciales)
     */
    public function getTotalPendingAttribute(): float
    {
        $totalPlan = $this->paymentPlan->total_amount;
        $totalPaid = $this->total_paid;
        
        return max(0, $totalPlan - $totalPaid);
    }
}
