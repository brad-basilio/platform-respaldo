<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Student;
use App\Models\PaymentPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class EnrollmentController extends Controller
{
    /**
     * Obtener la matrícula activa de un estudiante con su cronograma
     */
    public function show(Student $student)
    {
        $user = Auth::user();

        // Verificar permisos: admin ve todo, sales_advisor solo sus prospectos
        if ($user->role === 'sales_advisor' && (int)$student->registered_by !== $user->id) {
            abort(403, 'No tienes permiso para ver esta matrícula.');
        }

        // Cargar matrícula activa con relaciones
        $enrollment = $student->enrollments()
            ->with([
                'paymentPlan',
                'installments' => function ($query) {
                    $query->orderBy('installment_number', 'asc');
                },
                'installments.vouchers' => function ($query) {
                    $query->orderBy('created_at', 'desc');
                },
                'installments.vouchers.uploadedBy',
                'installments.vouchers.reviewedBy',
                'verifiedBy'
            ])
            ->where('status', 'active')
            ->first();

        if (!$enrollment) {
            return response()->json([
                'message' => 'El estudiante no tiene una matrícula activa',
                'enrollment' => null,
            ], 404);
        }

        // Calcular moras para todas las cuotas pendientes
        foreach ($enrollment->installments as $installment) {
            if (in_array($installment->status, ['pending', 'overdue'])) {
                $installment->calculateLateFee();
            }
        }

        return response()->json([
            'enrollment' => [
                'id' => $enrollment->id,
                'studentId' => $enrollment->student_id,
                'paymentPlanId' => $enrollment->payment_plan_id,
                'enrollmentFee' => $enrollment->enrollment_fee,
                'enrollmentDate' => $enrollment->enrollment_date->format('Y-m-d'),
                'enrollmentVoucherPath' => $enrollment->enrollment_voucher_path,
                'enrollmentFeeVerified' => $enrollment->enrollment_fee_verified,
                'status' => $enrollment->status,
                'notes' => $enrollment->notes,
                'paymentProgress' => $enrollment->payment_progress,
                'totalPaid' => $enrollment->total_paid,
                'totalPending' => $enrollment->total_pending,
                'paymentPlan' => [
                    'id' => $enrollment->paymentPlan->id,
                    'name' => $enrollment->paymentPlan->name,
                    'totalAmount' => $enrollment->paymentPlan->total_amount,
                    'installmentsCount' => $enrollment->paymentPlan->installments_count,
                    'monthlyAmount' => $enrollment->paymentPlan->monthly_amount,
                    'gracePeriodDays' => $enrollment->paymentPlan->grace_period_days,
                    'lateFeePercentage' => $enrollment->paymentPlan->late_fee_percentage,
                ],
                'installments' => $enrollment->installments->map(function ($installment) use ($enrollment) {
                    return [
                        'id' => $installment->id,
                        'installmentNumber' => $installment->installment_number,
                        'dueDate' => $installment->due_date->format('Y-m-d'),
                        'amount' => $installment->amount,
                        'lateFee' => $installment->late_fee,
                        'totalDue' => $installment->total_due,
                        'paidAmount' => $installment->paid_amount,
                        'paidDate' => $installment->paid_date?->format('Y-m-d'),
                        'status' => $installment->status,
                        'isOverdue' => $installment->is_overdue,
                        'daysLate' => $installment->days_late,
                        'notes' => $installment->notes,
                        'vouchers' => $installment->vouchers->map(function ($voucher) use ($enrollment) {
                            // Normalizar ruta pública del voucher con nueva estructura por estudiante
                            $raw = $voucher->voucher_path;
                            $studentId = $enrollment->student_id;

                            // Intentar construir una URL pública usando Storage si es necesario
                            try {
                                // Si ya parece una URL pública o comienza con '/storage' o 'http', usarla tal cual
                                if ($raw && (str_starts_with($raw, '/storage') || str_starts_with($raw, 'http')) ) {
                                    $publicUrl = $raw;
                                } elseif ($raw && str_starts_with($raw, 'enrollment/')) {
                                    // Nueva estructura: enrollment/[student_id]/archivo.jpg
                                    $publicUrl = \Illuminate\Support\Facades\Storage::url($raw);
                                } elseif ($raw && str_starts_with($raw, 'payment_vouchers/')) {
                                    // Estructura anterior: payment_vouchers/archivo.jpg
                                    $publicUrl = \Illuminate\Support\Facades\Storage::url($raw);
                                } elseif ($raw && str_starts_with($raw, 'installment_vouchers/')) {
                                    // Estructura anterior: installment_vouchers/archivo.jpg
                                    $publicUrl = \Illuminate\Support\Facades\Storage::url($raw);
                                } elseif ($raw) {
                                    // Fallback: intentar en nueva estructura primero, luego en payment_vouchers
                                    if (\Illuminate\Support\Facades\Storage::disk('public')->exists("enrollment/{$studentId}/{$raw}")) {
                                        $publicUrl = \Illuminate\Support\Facades\Storage::url("enrollment/{$studentId}/{$raw}");
                                    } else {
                                        $publicUrl = \Illuminate\Support\Facades\Storage::url('payment_vouchers/' . ltrim($raw, '/'));
                                    }
                                } else {
                                    $publicUrl = null;
                                }
                            } catch (\Exception $e) {
                                // En caso de error con Storage, fallback a null
                                \Illuminate\Support\Facades\Log::error('Error construyendo voucher URL', ['raw' => $raw, 'error' => $e->getMessage()]);
                                $publicUrl = null;
                            }

                            return [
                                'id' => $voucher->id,
                                // Mantener la ruta original en caso de que se necesite
                                'voucher_path' => $voucher->voucher_path,
                                'voucherPath' => $voucher->voucher_path,
                                // URL pública lista para usar en el frontend
                                'voucher_url' => $publicUrl,
                                'voucherUrl' => $publicUrl,
                                'declaredAmount' => $voucher->declared_amount,
                                'paymentDate' => $voucher->payment_date?->format('Y-m-d'),
                                'paymentMethod' => $voucher->payment_method,
                                'transactionReference' => $voucher->transaction_reference,
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
                                'createdAt' => $voucher->created_at->toISOString(),
                            ];
                        }),
                    ];
                }),
                'verifiedBy' => $enrollment->verifiedBy ? [
                    'id' => $enrollment->verifiedBy->id,
                    'name' => $enrollment->verifiedBy->name,
                ] : null,
                'verifiedAt' => $enrollment->verified_at?->toISOString(),
                'createdAt' => $enrollment->created_at->toISOString(),
            ]
        ], 200);
    }

    /**
     * Crear una nueva matrícula y generar cronograma de cuotas
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // Validación
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'payment_plan_id' => 'required|exists:payment_plans,id',
            'enrollment_fee' => 'nullable|numeric|min:0',
            'enrollment_date' => 'required|date',
            'enrollment_voucher' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'notes' => 'nullable|string',
        ]);

        $student = Student::findOrFail($validated['student_id']);

        // Verificar permisos
        if ($user->role === 'sales_advisor' && (int)$student->registered_by !== $user->id) {
            abort(403, 'Solo puedes crear matrículas para tus propios prospectos.');
        }

        // Verificar que el estudiante no tenga ya una matrícula activa
        $hasActiveEnrollment = $student->enrollments()->where('status', 'active')->exists();
        if ($hasActiveEnrollment) {
            return response()->json([
                'message' => 'El estudiante ya tiene una matrícula activa',
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Crear matrícula
            $enrollment = Enrollment::create([
                'student_id' => $validated['student_id'],
                'payment_plan_id' => $validated['payment_plan_id'],
                'enrollment_fee' => $validated['enrollment_fee'] ?? 0,
                'enrollment_date' => $validated['enrollment_date'],
                'enrollment_fee_verified' => false,
                'status' => 'active',
                'notes' => $validated['notes'] ?? null,
            ]);

            // Subir voucher de matrícula si existe con estructura organizada por estudiante
            if ($request->hasFile('enrollment_voucher')) {
                $file = $request->file('enrollment_voucher');
                $studentId = $student->id;
                $fileName = 'enrollment_fee_' . time() . '.' . $file->getClientOriginalExtension();
                
                // Asegurar que el directorio del estudiante existe con permisos correctos
                $studentDir = "enrollment/{$studentId}";
                if (!Storage::disk('public')->exists($studentDir)) {
                    Storage::disk('public')->makeDirectory($studentDir, 0755, true);
                }
                
                $path = $file->storeAs($studentDir, $fileName, 'public');
                
                $enrollment->update([
                    'enrollment_voucher_path' => Storage::url($path),
                ]);
            }

            // Generar cronograma de cuotas automáticamente
            $enrollment->generateInstallments();

            DB::commit();

            Log::info('Matrícula creada exitosamente:', [
                'enrollment_id' => $enrollment->id,
                'student_id' => $student->id,
                'created_by' => $user->id,
            ]);

            // Recargar con relaciones
            $enrollment->load(['paymentPlan', 'installments']);

            return response()->json([
                'message' => 'Matrícula creada exitosamente',
                'enrollment' => [
                    'id' => $enrollment->id,
                    'studentId' => $enrollment->student_id,
                    'paymentPlanId' => $enrollment->payment_plan_id,
                    'enrollmentFee' => $enrollment->enrollment_fee,
                    'enrollmentDate' => $enrollment->enrollment_date->format('Y-m-d'),
                    'status' => $enrollment->status,
                    'installmentsCount' => $enrollment->installments->count(),
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear matrícula:', [
                'error' => $e->getMessage(),
                'student_id' => $validated['student_id'],
            ]);

            return response()->json([
                'message' => 'Error al crear la matrícula',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Actualizar una matrícula
     */
    public function update(Request $request, Enrollment $enrollment)
    {
        $user = Auth::user();

        // Verificar permisos
        if ($user->role === 'sales_advisor' && (int)$enrollment->student->registered_by !== $user->id) {
            abort(403, 'No tienes permiso para editar esta matrícula.');
        }

        $validated = $request->validate([
            'enrollment_fee' => 'nullable|numeric|min:0',
            'enrollment_fee_verified' => 'nullable|boolean',
            'status' => 'nullable|in:pending,active,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        // Solo cajero y admin pueden verificar la cuota de matrícula
        if (isset($validated['enrollment_fee_verified']) && !in_array($user->role, ['admin', 'cashier'])) {
            unset($validated['enrollment_fee_verified']);
        }

        // Si se verifica, registrar quién y cuándo
        if (isset($validated['enrollment_fee_verified']) && $validated['enrollment_fee_verified']) {
            $validated['verified_by'] = $user->id;
            $validated['verified_at'] = now();
        }

        $enrollment->update($validated);

        Log::info('Matrícula actualizada:', [
            'enrollment_id' => $enrollment->id,
            'updated_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'Matrícula actualizada exitosamente',
            'enrollment' => [
                'id' => $enrollment->id,
                'status' => $enrollment->status,
                'enrollmentFeeVerified' => $enrollment->enrollment_fee_verified,
            ]
        ], 200);
    }

    /**
     * Listar todas las matrículas (para admin)
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['admin', 'cashier'])) {
            abort(403, 'No tienes permiso para ver esta información.');
        }

        $query = Enrollment::with(['student.user', 'paymentPlan', 'installments']);

        // Filtros opcionales
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('pending_verification') && $request->pending_verification) {
            $query->where('enrollment_fee_verified', false)
                  ->where('enrollment_fee', '>', 0);
        }

        $enrollments = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($enrollments, 200);
    }
}
