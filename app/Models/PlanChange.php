<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanChange extends Model
{
    protected $fillable = [
        'student_id',
        'old_plan_id',
        'new_plan_id',
        'change_date',
        'changed_by',
        'reason',
        'old_installments_count',
        'new_installments_count',
        'old_total_amount',
        'new_total_amount',
    ];

    protected $casts = [
        'change_date' => 'date',
        'old_total_amount' => 'decimal:2',
        'new_total_amount' => 'decimal:2',
    ];

    /**
     * Relación con el estudiante que cambió de plan
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Relación con el plan de pago anterior
     */
    public function oldPlan(): BelongsTo
    {
        return $this->belongsTo(PaymentPlan::class, 'old_plan_id');
    }

    /**
     * Relación con el nuevo plan de pago
     */
    public function newPlan(): BelongsTo
    {
        return $this->belongsTo(PaymentPlan::class, 'new_plan_id');
    }

    /**
     * Relación con el usuario que aprobó el cambio
     */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    /**
     * Verificar si un estudiante puede cambiar de plan
     * 
     * @param int $studentId
     * @return array ['can_change' => bool, 'reason' => string|null]
     */
    public static function canStudentChangePlan(int $studentId): array
    {
        $student = Student::with(['enrollment.installments'])->findOrFail($studentId);
        
        if (!$student->enrollment) {
            return [
                'can_change' => false,
                'reason' => 'El estudiante no tiene matrícula activa'
            ];
        }

        // Obtener deadline desde settings
        $deadlineDays = (int) Setting::where('key', 'plan_change_deadline_days')
            ->where('type', 'payment')
            ->value('content') ?? 7;

        // Calcular días desde la matrícula
        $enrollmentDate = $student->enrollment->enrollment_date;
        $daysSinceEnrollment = now()->diffInDays($enrollmentDate, false);

        // Verificar si está dentro del plazo
        if ($daysSinceEnrollment > $deadlineDays) {
            return [
                'can_change' => false,
                'reason' => "El plazo para cambiar de plan ha vencido (máximo {$deadlineDays} días desde la matrícula)"
            ];
        }

        // Verificar si tiene cuotas pagadas o verificadas
        $paidInstallments = $student->enrollment->installments()
            ->whereIn('status', ['paid', 'verified'])
            ->count();

        if ($paidInstallments > 0) {
            return [
                'can_change' => false,
                'reason' => 'No se puede cambiar de plan porque ya tiene cuotas pagadas o verificadas'
            ];
        }

        return [
            'can_change' => true,
            'reason' => null,
            'days_remaining' => $deadlineDays - $daysSinceEnrollment
        ];
    }
}

