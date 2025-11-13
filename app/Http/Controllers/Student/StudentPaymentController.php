<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\InstallmentVoucher;
use App\Models\User;
use App\Models\PlanChange;
use App\Models\PaymentPlan;
use App\Models\Installment;
use App\Models\Setting;
use App\Events\VoucherUploaded;
use App\Notifications\VoucherUploadedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class StudentPaymentController extends Controller
{
    /**
     * Obtener el enrollment activo del estudiante autenticado
     */
    public function getEnrollment()
    {
        $user = Auth::user();
        
        // Obtener el estudiante asociado al usuario
        $student = $user->student;
        
        if (!$student) {
            return response()->json([
                'message' => 'No se encontró información de estudiante asociada a tu cuenta'
            ], 404);
        }
        
        // Obtener enrollment activo
        $enrollment = Enrollment::with([
            'paymentPlan',
            'installments.vouchers.uploadedBy',
            'installments.vouchers.reviewedBy',
            'student'
        ])
        ->where('student_id', $student->id)
        ->where('status', 'active')
        ->first();
        
        if (!$enrollment) {
            return response()->json([
                'message' => 'No tienes una matrícula activa',
                'enrollment' => null
            ], 200);
        }
        
        // ✅ Calcular mora automáticamente para todas las cuotas pendientes
        foreach ($enrollment->installments as $installment) {
            if ($installment->status === 'pending') {
                $installment->calculateLateFee();
            }
        }
        
        // Refrescar las cuotas después de calcular la mora
        $enrollment->load('installments');
        
        // Formatear datos del enrollment
        return response()->json([
            'enrollment' => [
                'id' => $enrollment->id,
                'studentId' => $enrollment->student_id,
                'enrollmentFee' => $enrollment->enrollment_fee,
                'enrollmentDate' => $enrollment->enrollment_date->format('Y-m-d'),
                'status' => $enrollment->status,
                'paymentProgress' => $enrollment->payment_progress,
                'totalPaid' => $enrollment->total_paid,
                'totalPending' => $enrollment->total_pending,
                'paymentPlan' => [
                    'id' => $enrollment->paymentPlan->id,
                    'name' => $enrollment->paymentPlan->name,
                    'totalAmount' => $enrollment->paymentPlan->total_amount,
                    'installmentsCount' => $enrollment->paymentPlan->installments_count,
                    'monthlyAmount' => $enrollment->paymentPlan->monthly_amount,
                    'gracePeriodDays' => $enrollment->paymentPlan->grace_period_days ?? 0, // ✅ Días de gracia del plan
                ],
                'installments' => $enrollment->installments->map(function ($installment) use ($enrollment) {
                    // Calcular días hasta vencimiento y hasta límite de gracia (con signo)
                    $today = \Carbon\Carbon::today();
                    $dueDate = $installment->due_date;
                    $plan = $enrollment->paymentPlan;
                    $gracePeriod = $plan->grace_period_days ?? 0;

                    // daysUntilDue: positive if due in future, negative if past
                    $daysUntilDue = $today->diffInDays($dueDate, false);

                    $graceLimit = $dueDate->copy()->addDays($gracePeriod);
                    // daysUntilGraceLimit: positive if grace limit in future, negative if past
                    $daysUntilGraceLimit = $today->diffInDays($graceLimit, false);

                    return [
                        'id' => $installment->id,
                        'installmentNumber' => $installment->installment_number,
                        'dueDate' => $installment->due_date->format('Y-m-d'),
                        'amount' => $installment->amount,
                        'lateFee' => $installment->late_fee,
                        'totalDue' => $installment->total_due,
                        'paidAmount' => $installment->paid_amount,
                        'remainingAmount' => $installment->remaining_amount,
                        'paymentType' => $installment->payment_type,
                        'paidDate' => $installment->paid_date?->format('Y-m-d'),
                        'status' => $installment->status,
                        'isOverdue' => $installment->is_overdue,
                        'daysLate' => $installment->days_late,
                        'daysUntilDue' => $daysUntilDue,
                        'daysUntilGraceLimit' => $daysUntilGraceLimit,
                        'gracePeriodDays' => $gracePeriod,
                        'notes' => $installment->notes,
                        'vouchers' => $installment->vouchers->map(function ($voucher) use ($enrollment) {
                            $raw = $voucher->voucher_path;
                            $studentId = $enrollment->student_id;

                            // Construir URL pública del voucher
                            try {
                                if ($raw && (str_starts_with($raw, '/storage') || str_starts_with($raw, 'http'))) {
                                    $publicUrl = $raw;
                                } elseif ($raw && str_starts_with($raw, 'enrollment/')) {
                                    $publicUrl = Storage::url($raw);
                                } elseif ($raw && str_starts_with($raw, 'payment_vouchers/')) {
                                    $publicUrl = Storage::url($raw);
                                } elseif ($raw && str_starts_with($raw, 'installment_vouchers/')) {
                                    $publicUrl = Storage::url($raw);
                                } elseif ($raw) {
                                    if (Storage::disk('public')->exists("enrollment/{$studentId}/{$raw}")) {
                                        $publicUrl = Storage::url("enrollment/{$studentId}/{$raw}");
                                    } else {
                                        $publicUrl = Storage::url('payment_vouchers/' . ltrim($raw, '/'));
                                    }
                                } else {
                                    $publicUrl = null;
                                }
                            } catch (\Exception $e) {
                                Log::error('Error construyendo voucher URL', ['raw' => $raw, 'error' => $e->getMessage()]);
                                $publicUrl = null;
                            }

                            return [
                                'id' => $voucher->id,
                                'voucherPath' => $voucher->voucher_path,
                                'voucherUrl' => $publicUrl,
                                'declaredAmount' => $voucher->declared_amount,
                                'paymentDate' => $voucher->payment_date?->format('Y-m-d'),
                                'paymentMethod' => $voucher->payment_method,
                                'status' => $voucher->status,
                                'rejectionReason' => $voucher->rejection_reason,
                                'uploadedBy' => $voucher->uploadedBy ? [
                                    'id' => $voucher->uploadedBy->id,
                                    'name' => $voucher->uploadedBy->name,
                                ] : null,
                                'reviewedBy' => $voucher->reviewedBy ? [
                                    'id' => $voucher->reviewedBy->id,
                                    'name' => $voucher->reviewedBy->name,
                                ] : null,
                                'reviewedAt' => $voucher->reviewed_at?->toISOString(),
                            ];
                        }),
                    ];
                }),
            ]
        ]);
    }

    /**
     * Procesar pago parcial distribuyendo automáticamente a cuotas pendientes
     */
    private function uploadPartialPayment(Request $request, array $validated, $student)
    {
        $user = Auth::user();
        
        // Obtener enrollment del estudiante
        $enrollment = Enrollment::with(['installments' => function($query) {
            $query->whereIn('status', ['pending', 'paid'])
                  ->orderBy('due_date', 'asc')
                  ->orderBy('installment_number', 'asc');
        }])->where('student_id', $student->id)
          ->where('status', 'active')
          ->first();

        if (!$enrollment) {
            return response()->json([
                'message' => 'No tienes una matrícula activa'
            ], 404);
        }

        // Validar que el monto no exceda el total pendiente
        $totalPending = $enrollment->total_pending;
        $declaredAmount = (float) $validated['declared_amount'];
        
        if ($declaredAmount > $totalPending) {
            return response()->json([
                'message' => 'El monto declarado excede tu deuda pendiente',
                'declared_amount' => $declaredAmount,
                'total_pending' => $totalPending,
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Subir archivo
            $file = $request->file('voucher_file');
            $fileName = 'partial_payment_' . time() . '.' . $file->getClientOriginalExtension();
            
            $studentDir = "enrollment/{$student->id}";
            if (!Storage::disk('public')->exists($studentDir)) {
                Storage::disk('public')->makeDirectory($studentDir, 0755, true);
            }
            
            $path = $file->storeAs($studentDir, $fileName, 'public');
            
            $amountRemaining = (float) $validated['declared_amount'];
            $distributionDetails = [];
            $affectedInstallments = [];

            // Distribuir el pago a las cuotas más antiguas primero
            foreach ($enrollment->installments as $installment) {
                if ($amountRemaining <= 0) {
                    break;
                }

                // Calcular mora actualizada
                $installment->calculateLateFee();
                $installment->refresh();

                // Calcular cuánto falta pagar en esta cuota
                $totalDue = $installment->total_due;
                $alreadyPaid = $installment->paid_amount;
                $pending = $totalDue - $alreadyPaid;

                if ($pending <= 0) {
                    continue; // Ya está pagada completamente
                }

                // Determinar cuánto aplicar a esta cuota
                $amountToApply = min($amountRemaining, $pending);

                // Crear voucher para esta cuota
                $voucher = InstallmentVoucher::create([
                    'installment_id' => $installment->id,
                    'uploaded_by' => $user->id,
                    'voucher_path' => $path,
                    'declared_amount' => $amountToApply,
                    'payment_date' => $validated['payment_date'],
                    'payment_method' => $validated['payment_method'] ?? 'transfer',
                    'status' => 'pending',
                    'payment_type' => ($amountToApply >= $pending) ? 'full' : 'partial',
                    'applied_to_total' => true,
                    'notes' => 'Pago parcial distribuido automáticamente - ' . ($validated['notes'] ?? 'Subido por el estudiante'),
                ]);

                // Aplicar el pago a la cuota
                $result = $installment->applyPartialPayment($amountToApply);

                $distributionDetails[] = [
                    'installment_number' => $installment->installment_number,
                    'amount_applied' => $amountToApply,
                    'was_completed' => $result['success'] && $installment->fresh()->status === 'paid',
                    'remaining_in_installment' => $installment->fresh()->remaining_amount,
                ];

                $affectedInstallments[] = $installment->id;
                $amountRemaining -= $amountToApply;

                Log::info('Pago parcial aplicado a cuota:', [
                    'installment_id' => $installment->id,
                    'installment_number' => $installment->installment_number,
                    'amount_applied' => $amountToApply,
                    'remaining_in_installment' => $installment->fresh()->remaining_amount,
                ]);
            }

            DB::commit();

            // Notificar a cajeros
            $cashiers = User::whereIn('role', ['cashier', 'admin'])->get();
            foreach ($cashiers as $cashier) {
                $cashier->notify(new VoucherUploadedNotification($voucher ?? null, $student, 'partial_payment'));
            }

            return response()->json([
                'message' => 'Pago parcial procesado exitosamente',
                'total_amount' => $validated['declared_amount'],
                'amount_distributed' => $validated['declared_amount'] - $amountRemaining,
                'amount_remaining' => $amountRemaining,
                'distribution_details' => $distributionDetails,
                'affected_installments' => count($affectedInstallments),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al procesar pago parcial:', [
                'error' => $e->getMessage(),
                'student_id' => $student->id,
                'amount' => $validated['declared_amount'],
            ]);

            return response()->json([
                'message' => 'Error al procesar el pago parcial',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Subir voucher de pago para una cuota
     */
    public function uploadVoucher(Request $request)
    {
        $user = Auth::user();
        $student = $user->student;
        
        if (!$student) {
            return response()->json([
                'message' => 'No se encontró información de estudiante'
            ], 404);
        }
        
        $validated = $request->validate([
            'installment_id' => 'nullable|exists:installments,id', // Ahora es opcional
            'voucher_file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'declared_amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|string|in:cash,transfer,deposit,card',
            'notes' => 'nullable|string',
            'is_partial_payment' => 'nullable|boolean', // Nueva bandera para pagos parciales
        ]);

        // Verificar si los pagos parciales están habilitados
        $allowPartialPayments = Setting::where('key', 'allow_partial_payments')
            ->where('type', 'payment')
            ->value('content') === 'true';

        // Si es pago parcial y está habilitado, distribuir automáticamente
        if ($validated['is_partial_payment'] ?? false) {
            if (!$allowPartialPayments) {
                return response()->json([
                    'message' => 'Los pagos parciales no están habilitados en el sistema'
                ], 400);
            }

            return $this->uploadPartialPayment($request, $validated, $student);
        }

        // Flujo normal: pago asociado a una cuota específica
        if (!isset($validated['installment_id'])) {
            return response()->json([
                'message' => 'Debes especificar una cuota o marcar como pago parcial'
            ], 400);
        }
        
        // Verificar que la cuota pertenece al estudiante
        $installment = Installment::with('enrollment')
            ->findOrFail($validated['installment_id']);
            
        if ($installment->enrollment->student_id !== $student->id) {
            return response()->json([
                'message' => 'No tienes permiso para subir vouchers a esta cuota'
            ], 403);
        }
        
        DB::beginTransaction();
        try {
            // Subir archivo con estructura organizada por estudiante
            $file = $request->file('voucher_file');
            $fileName = 'installment_' . $installment->installment_number . '_' . time() . '.' . $file->getClientOriginalExtension();
            
            // Asegurar que el directorio del estudiante existe con permisos correctos
            $studentDir = "enrollment/{$student->id}";
            if (!Storage::disk('public')->exists($studentDir)) {
                Storage::disk('public')->makeDirectory($studentDir, 0755, true);
            }
            
            $path = $file->storeAs($studentDir, $fileName, 'public');
            
            // Crear voucher
            $voucher = InstallmentVoucher::create([
                'installment_id' => $installment->id,
                'uploaded_by' => $user->id,
                'voucher_path' => $path,
                'declared_amount' => $validated['declared_amount'],
                'payment_date' => $validated['payment_date'],
                'payment_method' => $validated['payment_method'] ?? 'transfer',
                'status' => 'pending',
                'payment_type' => 'full',
                'applied_to_total' => false,
                'notes' => $validated['notes'] ?? 'Subido por el estudiante',
            ]);
            
            // Actualizar estado de la cuota a "paid" (pendiente de verificación)
            if ($installment->status === 'pending') {
                $installment->update([
                    'status' => 'paid',
                    'paid_amount' => $validated['declared_amount'],
                    'paid_date' => $validated['payment_date'],
                ]);
            }
            
            DB::commit();
            
            Log::info('Voucher subido por estudiante:', [
                'voucher_id' => $voucher->id,
                'student_id' => $student->id,
                'installment_id' => $installment->id,
            ]);
            
            // 🔔 Disparar evento para notificar a los cajeros
            Log::info('🔔 Disparando evento VoucherUploaded...');
            event(new VoucherUploaded($voucher, $student, 'uploaded'));
            Log::info('✅ Evento VoucherUploaded disparado correctamente');
            
            // 💾 Guardar notificación persistente para todos los cajeros
            $cashiers = User::whereIn('role', ['cashier', 'admin'])->get();
            foreach ($cashiers as $cashier) {
                $cashier->notify(new VoucherUploadedNotification($voucher, $student, 'uploaded'));
            }
            Log::info('✅ Notificación persistente enviada a ' . $cashiers->count() . ' cajeros');
            
            return response()->json([
                'message' => 'Voucher subido exitosamente',
                'voucher' => [
                    'id' => $voucher->id,
                    'voucherPath' => $voucher->voucher_path,
                    'voucherUrl' => Storage::url($path),
                    'status' => $voucher->status,
                ]
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al subir voucher:', [
                'error' => $e->getMessage(),
                'student_id' => $student->id,
            ]);
            
            return response()->json([
                'message' => 'Error al subir el voucher',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Reemplazar voucher pendiente con uno nuevo
     */
    public function replaceVoucher(Request $request, int $voucherId)
    {
        $user = Auth::user();
        $student = $user->student;
        
        if (!$student) {
            return response()->json([
                'message' => 'No se encontró información de estudiante'
            ], 404);
        }
        
        // Obtener el voucher con sus relaciones
        $voucher = InstallmentVoucher::with('installment.enrollment')->findOrFail($voucherId);
        
        // Verificar que el voucher pertenece al estudiante
        if ($voucher->installment->enrollment->student_id !== $student->id) {
            return response()->json([
                'message' => 'No tienes permiso para modificar este voucher'
            ], 403);
        }
        
        // Solo se pueden reemplazar vouchers pendientes
        if ($voucher->status !== 'pending') {
            return response()->json([
                'message' => 'Solo se pueden reemplazar vouchers pendientes. Este voucher ya fue ' . 
                            ($voucher->status === 'approved' ? 'aprobado' : 'rechazado')
            ], 400);
        }
        
        $validated = $request->validate([
            'voucher_file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'declared_amount' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|string|in:cash,transfer,deposit,card',
        ]);
        
        DB::beginTransaction();
        try {
            $installment = $voucher->installment;
            
            // Eliminar el archivo antiguo
            if ($voucher->voucher_path && Storage::disk('public')->exists($voucher->voucher_path)) {
                Storage::disk('public')->delete($voucher->voucher_path);
            }
            
            // Subir nuevo archivo
            $file = $request->file('voucher_file');
            $fileName = 'installment_' . $installment->installment_number . '_' . time() . '.' . $file->getClientOriginalExtension();
            
            $studentDir = "enrollment/{$student->id}";
            if (!Storage::disk('public')->exists($studentDir)) {
                Storage::disk('public')->makeDirectory($studentDir, 0755, true);
            }
            
            $path = $file->storeAs($studentDir, $fileName, 'public');
            
            // Actualizar el voucher existente
            $voucher->update([
                'voucher_path' => $path,
                'declared_amount' => $validated['declared_amount'],
                'payment_date' => $validated['payment_date'],
                'payment_method' => $validated['payment_method'] ?? $voucher->payment_method,
                'status' => 'pending', // Resetear a pendiente
                'reviewed_by' => null,
                'reviewed_at' => null,
                'rejection_reason' => null,
            ]);
            
            // Actualizar el monto pagado en la cuota
            $installment->update([
                'paid_amount' => $validated['declared_amount'],
                'paid_date' => $validated['payment_date'],
            ]);
            
            DB::commit();
            
            Log::info('Voucher reemplazado por estudiante:', [
                'voucher_id' => $voucher->id,
                'student_id' => $student->id,
                'installment_id' => $installment->id,
            ]);
            
            // 🔔 Disparar evento para notificar a los cajeros
            Log::info('🔔 Disparando evento VoucherUploaded (replaced)...');
            event(new VoucherUploaded($voucher->fresh(), $student, 'replaced'));
            Log::info('✅ Evento VoucherUploaded (replaced) disparado correctamente');
            
            // 💾 Guardar notificación persistente para todos los cajeros
            $cashiers = User::whereIn('role', ['cashier', 'admin'])->get();
            foreach ($cashiers as $cashier) {
                $cashier->notify(new VoucherUploadedNotification($voucher->fresh(), $student, 'replaced'));
            }
            Log::info('✅ Notificación persistente enviada a ' . $cashiers->count() . ' cajeros');
            
            return response()->json([
                'message' => 'Voucher reemplazado exitosamente',
                'voucher' => [
                    'id' => $voucher->id,
                    'voucherPath' => $voucher->voucher_path,
                    'voucherUrl' => Storage::url($path),
                    'status' => $voucher->status,
                ]
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al reemplazar voucher:', [
                'error' => $e->getMessage(),
                'voucher_id' => $voucherId,
                'student_id' => $student->id,
            ]);
            
            return response()->json([
                'message' => 'Error al reemplazar el voucher',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verificar si el estudiante puede cambiar de plan
     */
    public function canChangePlan()
    {
        $user = Auth::user();
        $student = $user->student;

        if (!$student) {
            return response()->json([
                'can_change' => false,
                'message' => 'No se encontró información de estudiante'
            ], 404);
        }

        $result = PlanChange::canStudentChangePlan($student->id);
        
        return response()->json($result);
    }

    /**
     * Cambiar el plan de pago del estudiante
     */
    public function changePlan(Request $request)
    {
        $validated = $request->validate([
            'new_plan_id' => 'required|exists:payment_plans,id',
            'reason' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();
        $student = $user->student;

        if (!$student) {
            return response()->json([
                'message' => 'No se encontró información de estudiante'
            ], 404);
        }

        // Verificar elegibilidad
        $canChange = PlanChange::canStudentChangePlan($student->id);
        if (!$canChange['can_change']) {
            return response()->json([
                'message' => $canChange['reason']
            ], 400);
        }

        try {
            DB::beginTransaction();

            $enrollment = $student->enrollment;
            $oldPlan = $enrollment->paymentPlan;
            $newPlan = PaymentPlan::findOrFail($validated['new_plan_id']);

            // Registrar el cambio
            PlanChange::create([
                'student_id' => $student->id,
                'old_plan_id' => $oldPlan->id,
                'new_plan_id' => $newPlan->id,
                'change_date' => now(),
                'changed_by' => $user->id, // El mismo estudiante hizo el cambio
                'reason' => $validated['reason'] ?? 'Cambio solicitado por el estudiante',
                'old_installments_count' => $oldPlan->installments_count,
                'new_installments_count' => $newPlan->installments_count,
                'old_total_amount' => $oldPlan->total_amount,
                'new_total_amount' => $newPlan->total_amount,
            ]);

            // Cancelar cuotas del plan anterior (solo las pendientes sin vouchers)
            Installment::where('enrollment_id', $enrollment->id)
                ->where('status', 'pending')
                ->whereDoesntHave('vouchers')
                ->update(['status' => 'cancelled']);

            // Actualizar el enrollment con el nuevo plan
            $enrollment->update([
                'payment_plan_id' => $newPlan->id,
            ]);

            // Generar nuevas cuotas según el nuevo plan
            $existingInstallments = Installment::where('enrollment_id', $enrollment->id)
                ->whereIn('status', ['paid', 'verified'])
                ->count();

            $installmentsToCreate = $newPlan->installments_count - $existingInstallments;

            for ($i = 1; $i <= $installmentsToCreate; $i++) {
                $installmentNumber = $existingInstallments + $i;
                $dueDate = now()->addMonths($installmentNumber - 1)->endOfMonth();

                Installment::create([
                    'enrollment_id' => $enrollment->id,
                    'installment_number' => $installmentNumber,
                    'due_date' => $dueDate,
                    'amount' => $newPlan->monthly_amount,
                    'late_fee' => 0,
                    'paid_amount' => 0,
                    'remaining_amount' => $newPlan->monthly_amount,
                    'payment_type' => 'full',
                    'status' => 'pending',
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Plan de pago cambiado exitosamente',
                'old_plan' => $oldPlan->name,
                'new_plan' => $newPlan->name,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al cambiar plan de pago:', [
                'error' => $e->getMessage(),
                'student_id' => $student->id,
                'new_plan_id' => $validated['new_plan_id'],
            ]);

            return response()->json([
                'message' => 'Error al cambiar el plan de pago',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener planes de pago disponibles
     */
    public function getAvailablePlans()
    {
        $user = Auth::user();
        $student = $user->student;

        if (!$student || !$student->enrollment) {
            return response()->json([
                'message' => 'No se encontró matrícula activa'
            ], 404);
        }

        $currentPlanId = $student->enrollment->payment_plan_id;
        $academicLevelId = $student->enrollment->paymentPlan->academic_level_id;

        // Obtener planes del mismo nivel académico, excluyendo el actual
        $plans = PaymentPlan::where('academic_level_id', $academicLevelId)
            ->where('id', '!=', $currentPlanId)
            ->where('is_active', true)
            ->select('id', 'name', 'total_amount', 'installments_count', 'monthly_amount')
            ->orderBy('installments_count', 'asc')
            ->get();

        return response()->json([
            'plans' => $plans
        ]);
    }
}

