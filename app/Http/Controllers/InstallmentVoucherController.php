<?php

namespace App\Http\Controllers;

use App\Models\InstallmentVoucher;
use App\Models\Installment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class InstallmentVoucherController extends Controller
{
    /**
     * Subir voucher de pago para una cuota (Sales Advisor)
     */
    public function store(Request $request, Installment $installment)
    {
        $user = Auth::user();

        // Verificar que el usuario tenga permiso
        $student = $installment->enrollment->student;
        if ($user->role === 'sales_advisor' && (int)$student->registered_by !== $user->id) {
            abort(403, 'Solo puedes subir vouchers para tus propios estudiantes.');
        }

        if (!in_array($user->role, ['admin', 'sales_advisor'])) {
            abort(403, 'No tienes permiso para subir vouchers.');
        }

        // Validar que la cuota no esté ya pagada/verificada
        if (in_array($installment->status, ['verified', 'cancelled'])) {
            return response()->json([
                'message' => 'No se puede subir voucher para una cuota con estado: ' . $installment->status,
            ], 422);
        }

        $validated = $request->validate([
            'voucher_file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120', // Max 5MB
            'declared_amount' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|string|in:cash,transfer,deposit,card',
            'transaction_reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Subir archivo con estructura organizada por estudiante
            $file = $request->file('voucher_file');
            $studentId = $installment->enrollment->student->id;
            $fileName = 'installment_' . $installment->installment_number . '_' . time() . '.' . $file->getClientOriginalExtension();
            
            // Asegurar que el directorio del estudiante existe con permisos correctos
            $studentDir = "enrollment/{$studentId}";
            if (!Storage::disk('public')->exists($studentDir)) {
                Storage::disk('public')->makeDirectory($studentDir, 0755, true);
                Log::info('Created student directory', ['directory' => $studentDir]);
            }
            
            $path = $file->storeAs($studentDir, $fileName, 'public');
            
            // Verificar que el archivo se guardó correctamente
            if ($path && Storage::disk('public')->exists($path)) {
                Log::info('Voucher file saved successfully', [
                    'student_id' => $studentId,
                    'installment_number' => $installment->installment_number,
                    'file_path' => $path,
                    'file_size' => Storage::disk('public')->size($path)
                ]);
            } else {
                Log::error('Failed to save voucher file', [
                    'student_id' => $studentId,
                    'installment_number' => $installment->installment_number,
                    'expected_path' => $path
                ]);
                throw new \Exception('No se pudo guardar el archivo del voucher');
            }

            // Crear voucher
            $voucher = InstallmentVoucher::create([
                'installment_id' => $installment->id,
                'uploaded_by' => $user->id,
                'voucher_path' => $path, // Guardar solo la ruta relativa, no la URL completa
                'declared_amount' => $validated['declared_amount'],
                'payment_date' => $validated['payment_date'],
                'payment_method' => $validated['payment_method'] ?? 'transfer',
                'transaction_reference' => $validated['transaction_reference'] ?? null,
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            // Actualizar estado de la cuota a "paid" (pendiente de verificación)
            if ($installment->status === 'pending' || $installment->status === 'overdue') {
                $installment->update([
                    'status' => 'paid',
                    'paid_amount' => $validated['declared_amount'],
                    'paid_date' => $validated['payment_date'],
                ]);
            }

            DB::commit();

            Log::info('Voucher de cuota subido:', [
                'voucher_id' => $voucher->id,
                'installment_id' => $installment->id,
                'uploaded_by' => $user->id,
                'amount' => $validated['declared_amount'],
            ]);

            $voucher->load(['uploadedBy']);

            return response()->json([
                'message' => 'Voucher subido exitosamente',
                'voucher' => [
                    'id' => $voucher->id,
                    'installmentId' => $voucher->installment_id,
                    'voucherPath' => $voucher->voucher_path,
                    'declaredAmount' => $voucher->declared_amount,
                    'paymentDate' => $voucher->payment_date->format('Y-m-d'),
                    'paymentMethod' => $voucher->payment_method,
                    'status' => $voucher->status,
                    'uploadedBy' => [
                        'id' => $voucher->uploadedBy->id,
                        'name' => $voucher->uploadedBy->name,
                    ],
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al subir voucher de cuota:', [
                'error' => $e->getMessage(),
                'installment_id' => $installment->id,
            ]);

            return response()->json([
                'message' => 'Error al subir el voucher',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Ver voucher (imagen/PDF)
     */
    public function show(InstallmentVoucher $voucher)
    {
        $user = Auth::user();

        // Verificar permisos
        $student = $voucher->installment->enrollment->student;
        if ($user->role === 'sales_advisor' && (int)$student->registered_by !== $user->id) {
            abort(403, 'No tienes permiso para ver este voucher.');
        }

        // Convertir URL pública a ruta de archivo
        $relativePath = str_replace('/storage/', '', $voucher->voucher_path);
        $filePath = storage_path('app/public/' . $relativePath);

        if (!file_exists($filePath)) {
            abort(404, 'El archivo del voucher no existe.');
        }

        // Determinar MIME type
        $extension = pathinfo($filePath, PATHINFO_EXTENSION);
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'pdf' => 'application/pdf',
        ];
        $mimeType = $mimeTypes[strtolower($extension)] ?? 'application/octet-stream';

        return response()->file($filePath, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="voucher_' . $voucher->id . '.' . $extension . '"'
        ]);
    }

    /**
     * Aprobar voucher (Cajero)
     */
    public function approve(Request $request, InstallmentVoucher $voucher)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['admin', 'cashier'])) {
            abort(403, 'Solo cajeros y administradores pueden aprobar vouchers.');
        }

        if ($voucher->status !== 'pending') {
            return response()->json([
                'message' => 'Solo se pueden aprobar vouchers con estado pendiente.',
            ], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Actualizar voucher
            $voucher->update([
                'status' => 'approved',
                'reviewed_by' => $user->id,
                'reviewed_at' => now(),
                'notes' => $validated['notes'] ?? $voucher->notes,
            ]);

            // Actualizar cuota a verificada
            $installment = $voucher->installment;
            $installment->update([
                'status' => 'verified',
                'verified_by' => $user->id,
                'verified_at' => now(),
            ]);

            DB::commit();

            Log::info('Voucher de cuota aprobado:', [
                'voucher_id' => $voucher->id,
                'installment_id' => $installment->id,
                'approved_by' => $user->id,
            ]);

            return response()->json([
                'message' => 'Voucher aprobado exitosamente',
                'voucher' => [
                    'id' => $voucher->id,
                    'status' => $voucher->status,
                    'reviewedAt' => $voucher->reviewed_at->toISOString(),
                ],
                'installment' => [
                    'id' => $installment->id,
                    'status' => $installment->status,
                ]
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al aprobar voucher:', [
                'error' => $e->getMessage(),
                'voucher_id' => $voucher->id,
            ]);

            return response()->json([
                'message' => 'Error al aprobar el voucher',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Rechazar voucher (Cajero)
     */
    public function reject(Request $request, InstallmentVoucher $voucher)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['admin', 'cashier'])) {
            abort(403, 'Solo cajeros y administradores pueden rechazar vouchers.');
        }

        if ($voucher->status !== 'pending') {
            return response()->json([
                'message' => 'Solo se pueden rechazar vouchers con estado pendiente.',
            ], 422);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            // Actualizar voucher
            $voucher->update([
                'status' => 'rejected',
                'reviewed_by' => $user->id,
                'reviewed_at' => now(),
                'rejection_reason' => $validated['rejection_reason'],
            ]);

            // Devolver cuota a estado pendiente/vencida
            $installment = $voucher->installment;
            $installment->calculateLateFee(); // Recalcular mora
            
            $newStatus = $installment->is_overdue ? 'overdue' : 'pending';
            $installment->update([
                'status' => $newStatus,
                'paid_amount' => 0,
                'paid_date' => null,
            ]);

            DB::commit();

            Log::info('Voucher de cuota rechazado:', [
                'voucher_id' => $voucher->id,
                'installment_id' => $installment->id,
                'rejected_by' => $user->id,
                'reason' => $validated['rejection_reason'],
            ]);

            return response()->json([
                'message' => 'Voucher rechazado',
                'voucher' => [
                    'id' => $voucher->id,
                    'status' => $voucher->status,
                    'rejectionReason' => $voucher->rejection_reason,
                    'reviewedAt' => $voucher->reviewed_at->toISOString(),
                ],
                'installment' => [
                    'id' => $installment->id,
                    'status' => $installment->status,
                ]
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al rechazar voucher:', [
                'error' => $e->getMessage(),
                'voucher_id' => $voucher->id,
            ]);

            return response()->json([
                'message' => 'Error al rechazar el voucher',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Listar vouchers pendientes (para cajero)
     */
    public function pending()
    {
        $user = Auth::user();

        if (!in_array($user->role, ['admin', 'cashier'])) {
            abort(403, 'No tienes permiso para ver esta información.');
        }

        $vouchers = InstallmentVoucher::with([
            'installment.enrollment.student.user',
            'installment.enrollment.paymentPlan',
            'uploadedBy'
        ])
            ->where('status', 'pending')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'pendingVouchers' => $vouchers->map(function ($voucher) {
                return [
                    'id' => $voucher->id,
                    'voucherPath' => $voucher->voucher_path,
                    'declaredAmount' => $voucher->declared_amount,
                    'paymentDate' => $voucher->payment_date->format('Y-m-d'),
                    'paymentMethod' => $voucher->payment_method,
                    'transactionReference' => $voucher->transaction_reference,
                    'status' => $voucher->status,
                    'createdAt' => $voucher->created_at->toISOString(),
                    'installment' => [
                        'id' => $voucher->installment->id,
                        'installmentNumber' => $voucher->installment->installment_number,
                        'dueDate' => $voucher->installment->due_date->format('Y-m-d'),
                        'amount' => $voucher->installment->amount,
                        'lateFee' => $voucher->installment->late_fee,
                    ],
                    'student' => [
                        'id' => $voucher->installment->enrollment->student->id,
                        'name' => $voucher->installment->enrollment->student->user->name,
                        'email' => $voucher->installment->enrollment->student->user->email,
                    ],
                    'paymentPlan' => [
                        'name' => $voucher->installment->enrollment->paymentPlan->name,
                    ],
                    'uploadedBy' => [
                        'id' => $voucher->uploadedBy->id,
                        'name' => $voucher->uploadedBy->name,
                    ],
                ];
            }),
            'totalPending' => $vouchers->count(),
        ], 200);
    }
}
