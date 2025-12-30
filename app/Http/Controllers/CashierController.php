<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Enrollment;
use App\Models\Installment;
use App\Models\InstallmentVoucher;
use App\Services\PaymentReceiptService;
use App\Mail\PaymentReceiptMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CashierController extends Controller
{
    /**
     * Muestra el panel de control de pagos para admins (solo visualización)
     */
    public function adminPaymentControl(): Response
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
                    $enrollmentPayload = $en->toArray();

                    $enrollmentPayload['paymentProgress'] = $en->paymentProgress;
                    $enrollmentPayload['totalPaid'] = $en->totalPaid;
                    $enrollmentPayload['totalPending'] = $en->totalPending;

                    if (!empty($enrollmentPayload['installments'])) {
                        foreach ($enrollmentPayload['installments'] as &$inst) {
                            if (!empty($inst['vouchers'])) {
                                foreach ($inst['vouchers'] as &$v) {
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

        return Inertia::render('Admin/PaymentControl', [
            'students' => $students,
        ]);
    }

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

        // ✅ Calcular mora automáticamente para todas las cuotas pendientes
        foreach ($enrollment->installments as $installment) {
            if ($installment->status === 'pending') {
                $installment->calculateLateFee();
            }
        }

        // Refrescar las cuotas después de calcular la mora
        $enrollment->load('installments');

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
                'grace_period_days' => $enrollment->paymentPlan->grace_period_days ?? 0, // ✅ Días de gracia
            ] : null,
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
                    'installment_number' => $installment->installment_number,
                    'due_date' => $installment->due_date->format('Y-m-d'),
                    'amount' => $installment->amount,
                    'late_fee' => $installment->late_fee, // ✅ Mora calculada
                    'total_due' => $installment->total_due, // ✅ Total con mora
                    'paid_amount' => $installment->paid_amount,
                    'status' => $installment->status,
                    'daysUntilDue' => $daysUntilDue, // ✅ Días hasta vencimiento
                    'daysUntilGraceLimit' => $daysUntilGraceLimit, // ✅ Días hasta fin de gracia
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
                            'receipt_url' => $voucher->status === 'approved' && $voucher->receipt_path
                                ? route('voucher.receipt', $voucher->id)
                                : null,
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
        $voucher = InstallmentVoucher::with(['installment.enrollment.student.user'])->findOrFail($voucherId);
        
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

            // Calcular el total pagado sumando TODOS los vouchers aprobados de esta cuota
            $totalPaid = $installment->vouchers()
                ->where('status', 'approved')
                ->sum('declared_amount');
            
            $installment->paid_amount = $totalPaid;
            
            // Si el monto pagado cubre el total (con mora si aplica), marcar como verificado
            $totalDue = $installment->total_due; // amount + late_fee
            if ($installment->paid_amount >= $totalDue) {
                $installment->status = 'verified';
                $installment->verified_by = $request->user()->id;
                $installment->verified_at = now();
            } else {
                // Si no cubre el total, marcar como pagado parcialmente
                $installment->status = 'paid';
            }
            
            $installment->save();

            // Generar boleta de pago
            try {
                $receiptService = new PaymentReceiptService();
                $receiptPath = $receiptService->generate($voucher);
                
                // Guardar la ruta de la boleta en el voucher
                $voucher->receipt_path = $receiptPath;
                $voucher->save();

                // Enviar correo con la boleta al estudiante
                $studentEmail = $student->user->email ?? $student->email;
                if ($studentEmail) {
                    Mail::to($studentEmail)->queue(new PaymentReceiptMail($voucher, $receiptPath));
                    Log::info("Boleta enviada a {$studentEmail} para voucher #{$voucherId}");
                }
            } catch (\Exception $e) {
                Log::error("Error generando/enviando boleta: " . $e->getMessage());
                // No fallar la aprobación si falla la boleta
            }

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

    /**
     * Descargar boleta de pago del voucher
     * Accesible por: admin, cashier, y estudiantes (solo sus propios vouchers)
     */
    public function downloadReceipt(Request $request, int $voucherId)
    {
        $user = $request->user();
        $voucher = InstallmentVoucher::with('installment.enrollment.student')->findOrFail($voucherId);

        // Validar acceso según rol
        if ($user->role === 'student') {
            // Los estudiantes solo pueden descargar sus propias boletas
            $student = $user->student;
            if (!$student || $voucher->installment->enrollment->student_id !== $student->id) {
                return response()->json([
                    'message' => 'No tienes permiso para acceder a esta boleta'
                ], 403);
            }
        } elseif (!in_array($user->role, ['admin', 'cashier'])) {
            return response()->json([
                'message' => 'No tienes permiso para acceder a esta boleta'
            ], 403);
        }

        if ($voucher->status !== 'approved') {
            return response()->json([
                'message' => 'El voucher no ha sido aprobado aún'
            ], 400);
        }

        if (!$voucher->receipt_path) {
            // Si no tiene boleta, intentar generarla
            try {
                $receiptService = new PaymentReceiptService();
                $receiptPath = $receiptService->generate($voucher);
                $voucher->receipt_path = $receiptPath;
                $voucher->save();
            } catch (\Exception $e) {
                Log::error('Error generando boleta: ' . $e->getMessage());
                return response()->json([
                    'message' => 'No se pudo generar la boleta de pago'
                ], 500);
            }
        }

        // Verificar que el archivo existe
        if (!Storage::disk('public')->exists($voucher->receipt_path)) {
            // Intentar regenerar
            try {
                $receiptService = new PaymentReceiptService();
                $receiptPath = $receiptService->generate($voucher);
                $voucher->receipt_path = $receiptPath;
                $voucher->save();
            } catch (\Exception $e) {
                Log::error('Error regenerando boleta: ' . $e->getMessage());
                return response()->json([
                    'message' => 'El archivo de boleta no existe'
                ], 404);
            }
        }

        // Generar nombre de archivo descriptivo
        $studentName = $voucher->installment->enrollment->student->user->name ?? 'estudiante';
        $installmentNumber = $voucher->installment->installment_number;
        $fileName = 'Boleta_Cuota' . $installmentNumber . '_' . str_replace(' ', '_', $studentName) . '.pdf';

        // Descargar el archivo (forzar descarga, no abrir en navegador)
        return Storage::disk('public')->download(
            $voucher->receipt_path,
            $fileName,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"'
            ]
        );
    }
}
