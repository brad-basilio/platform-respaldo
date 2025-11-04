<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Enrollment;
use App\Models\Installment;
use App\Models\InstallmentVoucher;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashierController extends Controller
{
    /**
     * Muestra el panel de control de pagos para cajeros
     */
    public function paymentControl(): Response
    {
        // Obtener solo estudiantes matriculados y verificados con sus enrollments
        $students = Student::where('prospect_status', 'matriculado')
            ->where('enrollment_verified', true)
            ->with([
                'user',
                'activeEnrollment.installments.vouchers.uploadedBy',
                'activeEnrollment.installments.verifiedBy',
                'activeEnrollment.paymentPlan'
            ])
            ->get()
            ->map(function ($student) {
                // Serializar estudiante a un array con keys camelCase para el frontend
                $payload = [
                    'id' => $student->id,
                    'name' => $student->user->name ?? '',
                    'email' => $student->user->email ?? '',
                    'enrollmentCode' => $student->enrollment_code,
                    'enrollmentVerified' => (bool) $student->enrollment_verified,
                    'paymentPlan' => $student->paymentPlan ? [
                        'id' => $student->paymentPlan->id ?? null,
                        'name' => $student->paymentPlan->name ?? null,
                    ] : null,
                    'enrollment' => null,
                ];

                if ($student->activeEnrollment) {
                    $en = $student->activeEnrollment;
                    // Build enrollment payload (keep many keys snake_case inside enrollment where existing frontend expects that)
                    $enrollmentPayload = $en->toArray();

                    // Add computed attributes used by frontend (camelCase)
                    $enrollmentPayload['paymentProgress'] = $en->paymentProgress;
                    $enrollmentPayload['totalPaid'] = $en->totalPaid;
                    $enrollmentPayload['totalPending'] = $en->totalPending;

                    // Normalize vouchers to include public URL (voucher_url)
                    if (!empty($enrollmentPayload['installments'])) {
                        foreach ($enrollmentPayload['installments'] as &$inst) {
                            if (!empty($inst['vouchers'])) {
                                foreach ($inst['vouchers'] as &$v) {
                                    // If voucher already has voucher_url keep it, otherwise try to build one
                                    if (empty($v['voucher_url']) && !empty($v['voucher_path'])) {
                                        try {
                                            $v['voucher_url'] = \Illuminate\Support\Facades\Storage::url($v['voucher_path']);
                                        } catch (\Throwable $e) {
                                            $v['voucher_url'] = null;
                                        }
                                    }
                                }
                            }
                        }
                        unset($inst);
                    }

                    $payload['enrollment'] = $enrollmentPayload;
                }

                return $payload;
            });

        return Inertia::render('Cashier/PaymentControl', [
            'students' => $students,
        ]);
    }

    /**
     * Obtiene el enrollment completo de un estudiante con todas sus cuotas
     */
    public function getStudentEnrollment(Request $request, string $studentId)
    {
        $student = Student::findOrFail($studentId);

        // Verificar que el estudiante esté matriculado y verificado
        if ($student->prospect_status !== 'matriculado' || !$student->enrollment_verified) {
            return response()->json([
                'success' => false,
                'message' => 'El estudiante no tiene una matrícula verificada'
            ], 403);
        }

        // Obtener el enrollment activo con todas las relaciones
        $enrollment = $student->activeEnrollment()
            ->with([
                'installments' => function ($q) { $q->orderBy('installment_number', 'asc'); },
                'installments.vouchers' => function ($q) { $q->orderBy('created_at', 'desc'); },
                'installments.vouchers.uploadedBy',
                'installments.vouchers.reviewedBy',
                'installments.verifiedBy',
                'paymentPlan',
                'verifiedBy'
            ])
            ->first();

        if (!$enrollment) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró una matrícula activa para este estudiante'
            ], 404);
        }

        // Serializar enrollment con estructura normalizada
        $enrollmentData = [
            'id' => $enrollment->id,
            'student_id' => $enrollment->student_id,
            'enrollment_fee' => $enrollment->enrollment_fee,
            'enrollment_date' => $enrollment->enrollment_date?->format('Y-m-d'),
            'status' => $enrollment->status,
            'paymentProgress' => $enrollment->paymentProgress,
            'totalPaid' => $enrollment->totalPaid,
            'totalPending' => $enrollment->totalPending,
            'paymentPlan' => $enrollment->paymentPlan ? [
                'id' => $enrollment->paymentPlan->id,
                'name' => $enrollment->paymentPlan->name,
                'totalAmount' => $enrollment->paymentPlan->total_amount,
                'installmentsCount' => $enrollment->paymentPlan->installments_count,
                'monthlyAmount' => $enrollment->paymentPlan->monthly_amount,
            ] : null,
            'installments' => $enrollment->installments->map(function ($installment) {
                return [
                    'id' => $installment->id,
                    'installment_number' => $installment->installment_number,
                    'due_date' => $installment->due_date->format('Y-m-d'),
                    'amount' => $installment->amount,
                    'paid_amount' => $installment->paid_amount,
                    'status' => $installment->status,
                    'verifiedBy' => $installment->verifiedBy ? [
                        'id' => $installment->verifiedBy->id,
                        'name' => $installment->verifiedBy->name,
                    ] : null,
                    'vouchers' => $installment->vouchers->map(function ($voucher) use ($installment) {
                        // Construir URL pública del voucher
                        $voucherUrl = null;
                        if ($voucher->voucher_path) {
                            try {
                                $voucherUrl = \Illuminate\Support\Facades\Storage::url($voucher->voucher_path);
                            } catch (\Exception $e) {
                                \Illuminate\Support\Facades\Log::error('Error building voucher URL', [
                                    'voucher_id' => $voucher->id,
                                    'path' => $voucher->voucher_path,
                                    'error' => $e->getMessage()
                                ]);
                            }
                        }
                        
                        return [
                            'id' => $voucher->id,
                            'voucher_path' => $voucher->voucher_path,
                            'voucher_url' => $voucherUrl,
                            'declared_amount' => $voucher->declared_amount,
                            'payment_date' => $voucher->payment_date?->format('Y-m-d'),
                            'payment_method' => $voucher->payment_method,
                            'status' => $voucher->status,
                            'uploadedBy' => $voucher->uploadedBy ? [
                                'id' => $voucher->uploadedBy->id,
                                'name' => $voucher->uploadedBy->name,
                            ] : null,
                        ];
                    }),
                ];
            }),
        ];

        return response()->json([
            'success' => true,
            'enrollment' => $enrollmentData
        ]);
    }

    /**
     * Verifica un voucher de pago y actualiza el estado de la cuota
     */
    public function verifyVoucher(Request $request, int $voucherId)
    {
        $request->validate([
            'action' => 'required|in:approve,reject',
            'rejection_reason' => 'required_if:action,reject|string|max:500'
        ]);

        // Cargar voucher con sus relaciones
        $voucher = InstallmentVoucher::with(['installment.enrollment.student'])->findOrFail($voucherId);
        
        $installment = $voucher->installment;
        $student = $installment->enrollment->student;

        // Verificar que el estudiante esté matriculado y verificado
        if ($student->prospect_status !== 'matriculado' || !$student->enrollment_verified) {
            return response()->json([
                'success' => false,
                'message' => 'El estudiante no tiene una matrícula verificada'
            ], 403);
        }

        // Verificar que el voucher esté pendiente
        if ($voucher->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'El voucher ya fue revisado anteriormente'
            ], 400);
        }

        if ($request->action === 'approve') {
            // Aprobar voucher
            $voucher->status = 'approved';
            $voucher->reviewed_by = $request->user()->id;
            $voucher->reviewed_at = now();
            $voucher->save();

            // Actualizar el monto pagado de la cuota
            $installment->paid_amount = $voucher->declared_amount;
            
            // Si el monto pagado cubre el total, marcar como verificado
            if ($installment->paid_amount >= $installment->amount) {
                $installment->status = 'verified';
                $installment->verified_by = $request->user()->id;
                $installment->verified_at = now();
            } else {
                // Si no cubre el total, marcar como pagado parcialmente
                $installment->status = 'paid';
            }
            
            $installment->save();

            $message = 'Voucher aprobado exitosamente';
        } else {
            // Rechazar voucher
            $voucher->status = 'rejected';
            $voucher->rejection_reason = $request->rejection_reason;
            $voucher->reviewed_by = $request->user()->id;
            $voucher->reviewed_at = now();
            $voucher->save();

            $message = 'Voucher rechazado';
        }

        // Recargar el enrollment con totales actualizados
        $enrollment = $installment->enrollment->fresh([
            'installments',
            'paymentPlan'
        ]);

        return response()->json([
            'success' => true,
            'message' => $message,
            'voucher' => $voucher->load('reviewedBy'),
            'installment' => $installment->load('verifiedBy'),
            'enrollment' => [
                'totalPaid' => $enrollment->totalPaid,
                'totalPending' => $enrollment->totalPending,
                'paymentProgress' => $enrollment->paymentProgress
            ]
        ]);
    }

    /**
     * Muestra la página de reportes de pagos
     */
    public function paymentReports(): Response
    {
        // TODO: Implementar reportes de pagos
        return Inertia::render('Cashier/PaymentReports', [
            'message' => 'Reportes de pagos - Próximamente'
        ]);
    }
}
