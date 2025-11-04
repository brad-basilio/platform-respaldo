<?php

namespace App\Http\Controllers;

use App\Models\Installment;
use App\Models\Enrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class InstallmentController extends Controller
{
    /**
     * Listar cuotas de una matrícula
     */
    public function index(Enrollment $enrollment)
    {
        $user = Auth::user();

        // Verificar permisos
        if ($user->role === 'sales_advisor' && (int)$enrollment->student->registered_by !== $user->id) {
            abort(403, 'No tienes permiso para ver estas cuotas.');
        }

        $installments = $enrollment->installments()
            ->with(['vouchers.uploadedBy', 'vouchers.reviewedBy', 'verifiedBy'])
            ->orderBy('installment_number', 'asc')
            ->get();

        // Calcular moras actualizadas
        foreach ($installments as $installment) {
            if (in_array($installment->status, ['pending', 'overdue'])) {
                $installment->calculateLateFee();
            }
        }

        return response()->json([
            'installments' => $installments->map(function ($installment) {
                return [
                    'id' => $installment->id,
                    'enrollmentId' => $installment->enrollment_id,
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
                    'vouchersCount' => $installment->vouchers->count(),
                    'verifiedBy' => $installment->verifiedBy ? [
                        'id' => $installment->verifiedBy->id,
                        'name' => $installment->verifiedBy->name,
                    ] : null,
                    'verifiedAt' => $installment->verified_at?->toISOString(),
                ];
            })
        ], 200);
    }

    /**
     * Ver detalles de una cuota específica
     */
    public function show(Installment $installment)
    {
        $user = Auth::user();

        // Verificar permisos
        $student = $installment->enrollment->student;
        if ($user->role === 'sales_advisor' && (int)$student->registered_by !== $user->id) {
            abort(403, 'No tienes permiso para ver esta cuota.');
        }

        // Actualizar mora si está pendiente
        if (in_array($installment->status, ['pending', 'overdue'])) {
            $installment->calculateLateFee();
        }

        $installment->load(['vouchers.uploadedBy', 'vouchers.reviewedBy', 'verifiedBy']);

        return response()->json([
            'installment' => [
                'id' => $installment->id,
                'enrollmentId' => $installment->enrollment_id,
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
                'vouchers' => $installment->vouchers->map(function ($voucher) {
                    return [
                        'id' => $voucher->id,
                        'voucherPath' => $voucher->voucher_path,
                        'declaredAmount' => $voucher->declared_amount,
                        'paymentDate' => $voucher->payment_date->format('Y-m-d'),
                        'paymentMethod' => $voucher->payment_method,
                        'transactionReference' => $voucher->transaction_reference,
                        'status' => $voucher->status,
                        'rejectionReason' => $voucher->rejection_reason,
                        'uploadedBy' => [
                            'id' => $voucher->uploadedBy->id,
                            'name' => $voucher->uploadedBy->name,
                        ],
                        'reviewedBy' => $voucher->reviewedBy ? [
                            'id' => $voucher->reviewedBy->id,
                            'name' => $voucher->reviewedBy->name,
                        ] : null,
                        'reviewedAt' => $voucher->reviewed_at?->toISOString(),
                        'createdAt' => $voucher->created_at->toISOString(),
                    ];
                }),
                'verifiedBy' => $installment->verifiedBy ? [
                    'id' => $installment->verifiedBy->id,
                    'name' => $installment->verifiedBy->name,
                ] : null,
                'verifiedAt' => $installment->verified_at?->toISOString(),
            ]
        ], 200);
    }

    /**
     * Actualizar una cuota (principalmente para cajeros que verifican pagos)
     */
    public function update(Request $request, Installment $installment)
    {
        $user = Auth::user();

        // Solo admin y cajero pueden actualizar cuotas
        if (!in_array($user->role, ['admin', 'cashier'])) {
            abort(403, 'No tienes permiso para actualizar cuotas.');
        }

        $validated = $request->validate([
            'paid_amount' => 'nullable|numeric|min:0',
            'paid_date' => 'nullable|date',
            'status' => 'nullable|in:pending,paid,verified,overdue,cancelled',
            'notes' => 'nullable|string',
        ]);

        // Si se marca como verificada, registrar quién y cuándo
        if (isset($validated['status']) && $validated['status'] === 'verified') {
            $validated['verified_by'] = $user->id;
            $validated['verified_at'] = now();
        }

        $installment->update($validated);

        Log::info('Cuota actualizada:', [
            'installment_id' => $installment->id,
            'updated_by' => $user->id,
            'status' => $validated['status'] ?? $installment->status,
        ]);

        return response()->json([
            'message' => 'Cuota actualizada exitosamente',
            'installment' => [
                'id' => $installment->id,
                'status' => $installment->status,
                'paidAmount' => $installment->paid_amount,
                'paidDate' => $installment->paid_date?->format('Y-m-d'),
            ]
        ], 200);
    }

    /**
     * Recalcular moras de todas las cuotas vencidas
     */
    public function recalculateLateFees(Enrollment $enrollment)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['admin', 'cashier'])) {
            abort(403, 'No tienes permiso para realizar esta acción.');
        }

        $installments = $enrollment->installments()
            ->whereIn('status', ['pending', 'overdue'])
            ->get();

        $updated = 0;
        foreach ($installments as $installment) {
            $oldLateFee = $installment->late_fee;
            $installment->calculateLateFee();
            
            if ($installment->late_fee !== $oldLateFee) {
                $updated++;
            }
        }

        Log::info('Moras recalculadas:', [
            'enrollment_id' => $enrollment->id,
            'updated_count' => $updated,
            'recalculated_by' => $user->id,
        ]);

        return response()->json([
            'message' => "Moras recalculadas exitosamente ({$updated} cuotas actualizadas)",
            'updatedCount' => $updated,
        ], 200);
    }

    /**
     * Obtener resumen de cuotas vencidas (para dashboard)
     */
    public function overdueInstallments(Request $request)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['admin', 'cashier'])) {
            abort(403, 'No tienes permiso para ver esta información.');
        }

        $query = Installment::with(['enrollment.student.user', 'enrollment.paymentPlan'])
            ->where('status', 'overdue');

        // Filtrar por rango de fechas si se proporciona
        if ($request->has('from_date')) {
            $query->where('due_date', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $query->where('due_date', '<=', $request->to_date);
        }

        $installments = $query->orderBy('due_date', 'asc')->get();

        // Actualizar moras
        foreach ($installments as $installment) {
            $installment->calculateLateFee();
        }

        return response()->json([
            'overdueInstallments' => $installments->map(function ($installment) {
                return [
                    'id' => $installment->id,
                    'installmentNumber' => $installment->installment_number,
                    'dueDate' => $installment->due_date->format('Y-m-d'),
                    'amount' => $installment->amount,
                    'lateFee' => $installment->late_fee,
                    'totalDue' => $installment->total_due,
                    'daysLate' => $installment->days_late,
                    'student' => [
                        'id' => $installment->enrollment->student->id,
                        'name' => $installment->enrollment->student->user->name,
                        'email' => $installment->enrollment->student->user->email,
                    ],
                    'paymentPlan' => [
                        'name' => $installment->enrollment->paymentPlan->name,
                    ],
                ];
            }),
            'totalOverdue' => $installments->count(),
            'totalLateFees' => $installments->sum('late_fee'),
        ], 200);
    }

    /**
     * Verificar un pago (solo cajeros/admins)
     */
    public function verify(Request $request, Installment $installment)
    {
        $user = Auth::user();

        // Solo cajeros y admins pueden verificar
        if (!in_array($user->role, ['cashier', 'admin'])) {
            abort(403, 'No tienes permiso para verificar pagos.');
        }

        $request->validate([
            'verified' => 'required|boolean',
        ]);

        if ($request->verified) {
            // Verificar el pago
            $installment->status = 'verified';
            $installment->verified_by = $user->id;
            $installment->verified_at = now();
            $installment->paid_amount = $installment->total_due;
            $installment->paid_date = now();
        } else {
            // Rechazar verificación (volver a paid)
            $installment->status = 'paid';
            $installment->verified_by = null;
            $installment->verified_at = null;
        }

        $installment->save();

        return response()->json([
            'message' => $request->verified ? 'Pago verificado exitosamente' : 'Verificación cancelada',
            'installment' => [
                'id' => $installment->id,
                'status' => $installment->status,
                'verified_by' => $installment->verified_by,
                'verified_at' => $installment->verified_at?->format('Y-m-d H:i:s'),
            ],
        ], 200);
    }
}
