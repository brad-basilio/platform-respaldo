<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\CulqiTransaction;
use App\Models\Enrollment;
use App\Models\Installment;
use App\Models\InstallmentVoucher;
use App\Models\PaymentMethod;
use App\Models\Setting;
use App\Services\CulqiService;
use App\Services\PaymentReceiptService;
use App\Mail\PaymentReceiptMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class CulqiPaymentController extends Controller
{
    protected CulqiService $culqiService;

    public function __construct(CulqiService $culqiService)
    {
        $this->culqiService = $culqiService;
    }

    /**
     * Obtener la clave pública de Culqi para el frontend
     */
    public function getPublicKey()
    {
        return response()->json([
            'public_key' => $this->culqiService->getPublicKey(),
        ]);
    }

    /**
     * Procesar un pago con Culqi
     * 
     * Flujo:
     * 1. Frontend tokeniza tarjeta con Culqi Checkout → obtiene token ID
     * 2. Frontend envía token ID + datos al backend
     * 3. Backend crea cargo en Culqi
     * 4. Si requiere 3DS, devuelve requires_3ds=true con datos del cargo
     * 5. Frontend maneja 3DS y llama a processPaymentWith3DS
     * 6. Si es exitoso, crea voucher y actualiza installment
     */
    public function processPayment(Request $request)
    {
        $request->validate([
            'token_id' => 'required|string', // Token ID de Culqi (tkn_xxx)
            'installment_id' => 'nullable|exists:installments,id',
            'amount' => 'required|numeric|min:0.01',
            'save_card' => 'sometimes|boolean',
            'auto_payment' => 'sometimes|boolean',
            'is_partial_payment' => 'sometimes|boolean',
        ]);

        $student = Auth::user()->student;
        $isPartialPayment = $request->boolean('is_partial_payment');

        // Si es pago parcial, usar flujo especial
        if ($isPartialPayment) {
            return $this->processPartialPayment($request, $student);
        }

        // Flujo normal: pago de cuota específica
        if (!$request->installment_id) {
            return response()->json(['error' => 'Debes especificar una cuota'], 400);
        }

        $installment = Installment::findOrFail($request->installment_id);

        // Verificar que el installment pertenece al estudiante
        if ($installment->enrollment->student_id !== $student->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        DB::beginTransaction();
        try {
            // Obtener email del usuario (el email está en User, no en Student)
            $email = $student->user->email;
            
            if (!$email) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontró email del estudiante',
                ], 400);
            }

            // 1. Crear cargo en Culqi
            $chargeResult = $this->culqiService->createCharge(
                $request->token_id,
                $request->amount,
                'PEN',
                $email,
                [
                    'student_id' => $student->id,
                    'installment_id' => $installment->id,
                    'description' => "Pago cuota #{$installment->installment_number} - {$student->first_name} {$student->last_name}",
                ]
            );

            // Verificar si requiere 3DS - devolver información para que frontend maneje
            if (!$chargeResult['success'] && isset($chargeResult['requires_3ds']) && $chargeResult['requires_3ds']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'requires_3ds' => true,
                    'charge_data' => $chargeResult['data'] ?? null, // Datos del cargo para 3DS
                    'token_id' => $request->token_id,
                    'amount' => $request->amount,
                    'email' => $email,
                    'message' => 'Se requiere verificación 3D Secure',
                ], 200); // 200 porque no es error, es flujo normal
            }

            if (!$chargeResult['success']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => $chargeResult['error'],
                ], 400);
            }

            $chargeData = $chargeResult['data'];

            // Verificar que el cargo tenga ID (indica que fue exitoso)
            if (!isset($chargeData['id'])) {
                DB::rollBack();
                Log::error('Culqi charge response missing ID', ['data' => $chargeData]);
                return response()->json([
                    'success' => false,
                    'error' => 'Respuesta inesperada de Culqi. Por favor intenta de nuevo.',
                ], 400);
            }

            // 2. Guardar transacción en BD
            $transaction = CulqiTransaction::create([
                'student_id' => $student->id,
                'installment_id' => $installment->id,
                'culqi_charge_id' => $chargeData['id'],
                'culqi_token_id' => $request->token_id,
                'amount' => $request->amount,
                'currency' => 'PEN',
                'status' => 'succeeded',
                'culqi_response' => $chargeData,
                'card_brand' => $chargeData['source']['iin']['card_brand'] ?? null,
                'card_last4' => $chargeData['source']['card_number'] ?? null,
                'customer_email' => $email,
            ]);

            // 3. Crear voucher automático para registro del pago
            $voucher = InstallmentVoucher::create([
                'installment_id' => $installment->id,
                'uploaded_by' => $student->user->id, // Usuario que pagó
                'voucher_path' => 'culqi_payment', // Indicador de pago electrónico
                'declared_amount' => $request->amount,
                'payment_date' => now(),
                'payment_method' => 'tarjeta',
                'transaction_reference' => $chargeData['id'], // ID del cargo en Culqi
                'status' => 'approved', // Aprobado automáticamente
                'reviewed_by' => null, // Automático, no requiere verificación manual
                'reviewed_at' => now(),
                'notes' => 'Pago procesado automáticamente por Culqi',
                'payment_source' => 'culqi_card',
                'culqi_transaction_id' => $transaction->id,
            ]);

            // 4. Actualizar installment - Culqi es pago automático, va directo a 'verified'
            $installment->paid_amount += $request->amount;
            
            if ($installment->paid_amount >= $installment->amount) {
                $installment->status = 'verified'; // ✅ Culqi NO requiere verificación manual
                $installment->paid_date = now();
                $installment->verified_at = now();
            }
            
            $installment->save();

            // 5. Generar boleta de pago automáticamente para Culqi
            try {
                $receiptService = new PaymentReceiptService();
                $receiptPath = $receiptService->generate($voucher);
                
                $voucher->receipt_path = $receiptPath;
                $voucher->save();

                // Enviar boleta por email al estudiante
                $studentEmail = $student->user->email;
                if ($studentEmail) {
                    Mail::to($studentEmail)->queue(new PaymentReceiptMail($voucher, $receiptPath));
                    Log::info("Boleta Culqi enviada a {$studentEmail} para cuota #{$installment->installment_number}");
                }
            } catch (\Exception $e) {
                Log::error('Error generando boleta para pago Culqi: ' . $e->getMessage());
                // No fallar el pago si falla la boleta
            }

            // 6. Guardar tarjeta si lo solicita (para pagos futuros)
            $savedCard = null;
            if ($request->save_card) {
                $savedCard = $this->saveCard($student, $chargeData, $request->auto_payment ?? false);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => '¡Pago procesado exitosamente!',
                'transaction' => $transaction,
                'voucher' => $voucher,
                'installment' => $installment->fresh(),
                'saved_card' => $savedCard,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing Culqi payment', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al procesar el pago: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Procesar pago con autenticación 3D Secure
     * Se llama después de que el usuario completa la verificación 3DS en el frontend
     */
    public function processPaymentWith3DS(Request $request)
    {
        $request->validate([
            'token_id' => 'required|string',
            'installment_id' => 'nullable|exists:installments,id',
            'amount' => 'required|numeric|min:0.01',
            'parameters_3ds' => 'required|array', // Parámetros 3DS del frontend
            'save_card' => 'sometimes|boolean',
            'auto_payment' => 'sometimes|boolean',
            'is_partial_payment' => 'sometimes|boolean',
        ]);

        $student = Auth::user()->student;
        $isPartialPayment = $request->boolean('is_partial_payment');

        // Si es pago parcial, usar flujo especial
        if ($isPartialPayment) {
            return $this->processPartialPaymentWith3DS($request, $student);
        }

        // Flujo normal: pago de cuota específica
        if (!$request->installment_id) {
            return response()->json(['error' => 'Debes especificar una cuota'], 400);
        }

        $installment = Installment::findOrFail($request->installment_id);

        // Verificar que el installment pertenece al estudiante
        if ($installment->enrollment->student_id !== $student->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        DB::beginTransaction();
        try {
            $email = $student->user->email;
            
            if (!$email) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontró email del estudiante',
                ], 400);
            }

            // Crear cargo con parámetros 3DS
            $chargeResult = $this->culqiService->createChargeWith3DS(
                $request->token_id,
                $request->amount,
                'PEN',
                $email,
                $request->parameters_3ds,
                [
                    'student_id' => $student->id,
                    'installment_id' => $installment->id,
                    'description' => "Pago cuota #{$installment->installment_number} - {$student->first_name} {$student->last_name}",
                    '3ds_authenticated' => true,
                ]
            );

            if (!$chargeResult['success']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => $chargeResult['error'],
                ], 400);
            }

            $chargeData = $chargeResult['data'];

            if (!isset($chargeData['id'])) {
                DB::rollBack();
                Log::error('Culqi 3DS charge response missing ID', ['data' => $chargeData]);
                return response()->json([
                    'success' => false,
                    'error' => 'Respuesta inesperada de Culqi. Por favor intenta de nuevo.',
                ], 400);
            }

            // Guardar transacción en BD
            $transaction = CulqiTransaction::create([
                'student_id' => $student->id,
                'installment_id' => $installment->id,
                'culqi_charge_id' => $chargeData['id'],
                'culqi_token_id' => $request->token_id,
                'amount' => $request->amount,
                'currency' => 'PEN',
                'status' => 'succeeded',
                'culqi_response' => $chargeData,
                'card_brand' => $chargeData['source']['iin']['card_brand'] ?? null,
                'card_last4' => $chargeData['source']['card_number'] ?? null,
                'customer_email' => $email,
            ]);

            // Crear voucher automático
            $voucher = InstallmentVoucher::create([
                'installment_id' => $installment->id,
                'uploaded_by' => $student->user->id,
                'voucher_path' => 'culqi_payment_3ds',
                'declared_amount' => $request->amount,
                'payment_date' => now(),
                'payment_method' => 'tarjeta',
                'transaction_reference' => $chargeData['id'],
                'status' => 'approved',
                'reviewed_by' => null,
                'reviewed_at' => now(),
                'notes' => 'Pago procesado con autenticación 3D Secure',
                'payment_source' => 'culqi_card',
                'culqi_transaction_id' => $transaction->id,
            ]);

            // Actualizar installment - Culqi es pago automático, va directo a 'verified'
            $installment->paid_amount += $request->amount;
            
            if ($installment->paid_amount >= $installment->amount) {
                $installment->status = 'verified'; // ✅ Culqi NO requiere verificación manual
                $installment->paid_date = now();
                $installment->verified_at = now();
            }
            
            $installment->save();

            // Generar boleta de pago automáticamente para Culqi 3DS
            try {
                $receiptService = new PaymentReceiptService();
                $receiptPath = $receiptService->generate($voucher);
                
                $voucher->receipt_path = $receiptPath;
                $voucher->save();

                // Enviar boleta por email al estudiante
                $studentEmail = $student->user->email;
                if ($studentEmail) {
                    Mail::to($studentEmail)->queue(new PaymentReceiptMail($voucher, $receiptPath));
                    Log::info("Boleta Culqi 3DS enviada a {$studentEmail} para cuota #{$installment->installment_number}");
                }
            } catch (\Exception $e) {
                Log::error('Error generando boleta para pago Culqi 3DS: ' . $e->getMessage());
            }

            // Guardar tarjeta si lo solicita
            $savedCard = null;
            if ($request->save_card) {
                $savedCard = $this->saveCard($student, $chargeData, $request->auto_payment ?? false);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => '¡Pago procesado exitosamente con verificación 3D Secure!',
                'transaction' => $transaction,
                'voucher' => $voucher,
                'installment' => $installment->fresh(),
                'saved_card' => $savedCard,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing Culqi 3DS payment', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al procesar el pago con 3DS: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Procesar pago con tarjeta guardada
     */
    public function processPaymentWithSavedCard(Request $request)
    {
        $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'installment_id' => 'nullable|exists:installments,id',
            'amount' => 'required|numeric|min:0.01',
            'is_partial_payment' => 'sometimes|boolean',
        ]);

        $user = Auth::user();
        $student = $user->student;
        $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);
        $isPartialPayment = $request->boolean('is_partial_payment');

        // Si es pago parcial, usar flujo especial
        if ($isPartialPayment) {
            return $this->processPartialPaymentWithSavedCard($request, $student, $paymentMethod, $user);
        }

        // Flujo normal: pago de cuota específica
        if (!$request->installment_id) {
            return response()->json(['error' => 'Debes especificar una cuota'], 400);
        }

        $installment = Installment::findOrFail($request->installment_id);

        // Verificar ownership
        if ($paymentMethod->student_id !== $student->id) {
            return response()->json(['error' => 'No autorizado - tarjeta no pertenece al estudiante'], 403);
        }
        if ($installment->enrollment->student_id !== $student->id) {
            return response()->json(['error' => 'No autorizado - cuota no pertenece al estudiante'], 403);
        }

        // Verificar que la tarjeta tenga un ID de Culqi válido
        if (empty($paymentMethod->culqi_card_id)) {
            return response()->json([
                'success' => false,
                'error' => 'Esta tarjeta no está habilitada para pagos automáticos. Por favor usa "Pagar con nueva tarjeta" y marca la opción de guardar la tarjeta.',
            ], 400);
        }

        // Obtener email del usuario (no del estudiante)
        $userEmail = $user->email;
        $studentFullName = trim($student->first_name . ' ' . ($student->paternal_last_name ?? '') . ' ' . ($student->maternal_last_name ?? ''));

        DB::beginTransaction();
        try {
            // Crear cargo con tarjeta guardada
            $chargeResult = $this->culqiService->createChargeWithCard(
                $paymentMethod->culqi_card_id,
                $request->amount,
                'PEN',
                $userEmail,
                [
                    'student_id' => $student->id,
                    'installment_id' => $installment->id,
                    'payment_method_id' => $paymentMethod->id,
                    'description' => "Pago cuota #{$installment->installment_number} - {$studentFullName}",
                ]
            );

            // Verificar si requiere 3DS
            if (!$chargeResult['success'] && !empty($chargeResult['requires_3ds'])) {
                DB::rollBack();
                
                // Para tarjetas guardadas con 3DS, enviamos el card_id para que el frontend
                // pueda iniciar la autenticación 3DS directamente
                Log::info('Saved card requires 3DS', [
                    'payment_method_id' => $paymentMethod->id,
                    'card_id' => $paymentMethod->culqi_card_id,
                ]);
                
                return response()->json([
                    'success' => false,
                    'requires_3ds' => true,
                    'card_id' => $paymentMethod->culqi_card_id, // El frontend usará esto para 3DS
                    'payment_method_id' => $paymentMethod->id,
                    'email' => $userEmail,
                    'charge_data' => $chargeResult['data'] ?? null,
                ], 200); // 200 para que el frontend lo maneje como caso especial
            }

            if (!$chargeResult['success']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => $chargeResult['error'] ?? 'Error al procesar el pago',
                ], 400);
            }

            $chargeData = $chargeResult['data'];

            // Verificar que el cargo fue exitoso y tiene ID
            if (empty($chargeData['id'])) {
                DB::rollBack();
                Log::error('Charge response missing ID', ['chargeData' => $chargeData]);
                return response()->json([
                    'success' => false,
                    'error' => 'La respuesta del procesador de pago no es válida',
                ], 400);
            }

            // Guardar transacción
            $transaction = CulqiTransaction::create([
                'student_id' => $student->id,
                'installment_id' => $installment->id,
                'payment_method_id' => $paymentMethod->id,
                'culqi_charge_id' => $chargeData['id'],
                'amount' => $request->amount,
                'currency' => 'PEN',
                'status' => 'succeeded',
                'culqi_response' => $chargeData,
                'card_brand' => $paymentMethod->card_brand,
                'card_last4' => $paymentMethod->card_last4,
                'customer_email' => $userEmail,
            ]);

            // Crear voucher
            $voucher = InstallmentVoucher::create([
                'installment_id' => $installment->id,
                'uploaded_by' => $user->id,
                'voucher_path' => 'culqi_saved_card',
                'declared_amount' => $request->amount,
                'payment_date' => now(),
                'payment_method' => 'tarjeta',
                'transaction_reference' => $chargeData['id'],
                'status' => 'approved',
                'reviewed_by' => null,
                'reviewed_at' => now(),
                'notes' => 'Pago procesado con tarjeta guardada',
                'payment_source' => 'culqi_card',
                'culqi_transaction_id' => $transaction->id,
            ]);

            // Actualizar installment - Culqi es pago automático, va directo a 'verified'
            $installment->paid_amount += $request->amount;
            if ($installment->paid_amount >= $installment->amount) {
                $installment->status = 'verified'; // ✅ Culqi NO requiere verificación manual
                $installment->paid_date = now();
                $installment->verified_at = now();
            }
            $installment->save();

            // Generar boleta de pago automáticamente para tarjeta guardada
            try {
                $receiptService = new PaymentReceiptService();
                $receiptPath = $receiptService->generate($voucher);
                
                $voucher->receipt_path = $receiptPath;
                $voucher->save();

                // Enviar boleta por email al estudiante
                $studentEmail = $user->email;
                if ($studentEmail) {
                    Mail::to($studentEmail)->queue(new PaymentReceiptMail($voucher, $receiptPath));
                    Log::info("Boleta Culqi (tarjeta guardada) enviada a {$studentEmail} para cuota #{$installment->installment_number}");
                }
            } catch (\Exception $e) {
                Log::error('Error generando boleta para pago Culqi (tarjeta guardada): ' . $e->getMessage());
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => '¡Pago procesado exitosamente!',
                'transaction' => $transaction,
                'voucher' => $voucher,
                'installment' => $installment->fresh(),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing payment with saved card', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al procesar el pago',
            ], 500);
        }
    }

    /**
     * Procesar pago con tarjeta guardada + autenticación 3DS
     */
    public function processPaymentWithSavedCard3DS(Request $request)
    {
        $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'installment_id' => 'required|exists:installments,id',
            'amount' => 'required|numeric|min:1',
            'parameters_3ds' => 'required|array',
        ]);

        $user = Auth::user();
        $student = $user->student;
        $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);
        $installment = Installment::findOrFail($request->installment_id);

        // Verificar ownership
        if ($paymentMethod->student_id !== $student->id || $installment->enrollment->student_id !== $student->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        // Verificar que la tarjeta tenga un ID de Culqi válido
        if (empty($paymentMethod->culqi_card_id)) {
            return response()->json([
                'success' => false,
                'error' => 'Esta tarjeta no está habilitada para pagos.',
            ], 400);
        }

        // Obtener email del usuario
        $userEmail = $user->email;
        $studentFullName = trim($student->first_name . ' ' . ($student->paternal_last_name ?? '') . ' ' . ($student->maternal_last_name ?? ''));

        DB::beginTransaction();
        try {
            // Crear cargo con tarjeta guardada + parámetros 3DS
            $chargeResult = $this->culqiService->createChargeWithCardAnd3DS(
                $paymentMethod->culqi_card_id,
                $request->amount,
                'PEN',
                $userEmail,
                $request->parameters_3ds,
                [
                    'student_id' => $student->id,
                    'installment_id' => $installment->id,
                    'payment_method_id' => $paymentMethod->id,
                    'description' => "Pago cuota #{$installment->installment_number} - {$studentFullName}",
                ]
            );

            if (!$chargeResult['success']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => $chargeResult['error'] ?? 'Error al procesar el pago',
                ], 400);
            }

            $chargeData = $chargeResult['data'];

            // Verificar que el cargo fue exitoso y tiene ID
            if (empty($chargeData['id'])) {
                DB::rollBack();
                Log::error('Charge response missing ID', ['chargeData' => $chargeData]);
                return response()->json([
                    'success' => false,
                    'error' => 'La respuesta del procesador de pago no es válida',
                ], 400);
            }

            // Guardar transacción
            $transaction = CulqiTransaction::create([
                'student_id' => $student->id,
                'installment_id' => $installment->id,
                'payment_method_id' => $paymentMethod->id,
                'culqi_charge_id' => $chargeData['id'],
                'amount' => $request->amount,
                'currency' => 'PEN',
                'status' => 'succeeded',
                'culqi_response' => $chargeData,
                'card_brand' => $paymentMethod->card_brand,
                'card_last4' => $paymentMethod->card_last4,
                'customer_email' => $userEmail,
            ]);

            // Crear voucher
            $voucher = InstallmentVoucher::create([
                'installment_id' => $installment->id,
                'uploaded_by' => $user->id,
                'voucher_path' => 'culqi_saved_card_3ds',
                'declared_amount' => $request->amount,
                'payment_date' => now(),
                'payment_method' => 'tarjeta',
                'transaction_reference' => $chargeData['id'],
                'status' => 'approved',
                'reviewed_by' => null,
                'reviewed_at' => now(),
                'notes' => 'Pago procesado con tarjeta guardada + 3D Secure',
                'payment_source' => 'culqi_card',
                'culqi_transaction_id' => $transaction->id,
            ]);

            // Actualizar installment
            $installment->paid_amount += $request->amount;
            if ($installment->paid_amount >= $installment->amount) {
                $installment->status = 'verified'; // Culqi = pago automático, no requiere verificación manual
                $installment->paid_date = now();
                $installment->verified_at = now();
            }
            $installment->save();

            // Generar boleta de pago automáticamente para Culqi
            try {
                $receiptService = new PaymentReceiptService();
                $receiptPath = $receiptService->generate($voucher);
                
                $voucher->receipt_path = $receiptPath;
                $voucher->save();

                // Enviar boleta por email al estudiante
                $studentEmail = $student->user->email;
                if ($studentEmail) {
                    Mail::to($studentEmail)->queue(new PaymentReceiptMail($voucher, $receiptPath));
                    Log::info("Boleta Culqi (3DS+SavedCard) enviada a {$studentEmail} para cuota #{$installment->installment_number}");
                }
            } catch (\Exception $e) {
                Log::error('Error generando boleta para pago Culqi 3DS+SavedCard: ' . $e->getMessage());
                // No fallar el pago si falla la boleta
            }

            DB::commit();

            Log::info('Payment with saved card + 3DS successful', [
                'transaction_id' => $transaction->id,
                'student_id' => $student->id,
                'installment_id' => $installment->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => '¡Pago procesado exitosamente con verificación 3DS!',
                'transaction' => $transaction,
                'voucher' => $voucher,
                'installment' => $installment->fresh(),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing payment with saved card + 3DS', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al procesar el pago',
            ], 500);
        }
    }

    /**
     * Guardar tarjeta para pagos futuros
     */
    private function saveCard($student, $chargeData, bool $autoPayment = false)
    {
        try {
            // 1. Crear o obtener cliente en Culqi
            $customerResult = $this->culqiService->createCustomer(
                $student->email,
                $student->first_name,
                $student->last_name
            );

            if (!$customerResult['success']) {
                Log::warning('Could not create Culqi customer', ['error' => $customerResult['error']]);
                return null;
            }

            $customerId = $customerResult['data']['id'];

            // 2. Crear tarjeta en Culqi usando el token del cargo
            // Nota: Culqi ya tiene el token, necesitamos crear un nuevo token para guardar la tarjeta
            // En este caso, guardamos los datos básicos sin crear card object
            
            return PaymentMethod::create([
                'student_id' => $student->id,
                'type' => 'card',
                'provider' => 'culqi',
                'card_brand' => $chargeData['source']['iin']['card_brand'] ?? null,
                'card_last4' => substr($chargeData['source']['card_number'], -4),
                'card_exp_month' => $chargeData['source']['exp_month'] ?? null,
                'card_exp_year' => $chargeData['source']['exp_year'] ?? null,
                'culqi_customer_id' => $customerId,
                'is_default' => !$student->paymentMethods()->exists(),
                'auto_payment_enabled' => $autoPayment,
            ]);

        } catch (\Exception $e) {
            Log::error('Error saving card', ['message' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Procesar un pago parcial con Culqi
     * El pago se distribuye automáticamente a las cuotas más antiguas
     */
    private function processPartialPayment(Request $request, $student)
    {
        // Verificar si los pagos parciales están habilitados
        $allowPartialPayments = Setting::where('key', 'allow_partial_payments')
            ->where('type', 'payment')
            ->value('content') === 'true';

        if (!$allowPartialPayments) {
            return response()->json([
                'success' => false,
                'error' => 'Los pagos parciales no están habilitados en el sistema'
            ], 400);
        }

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
                'success' => false,
                'error' => 'No tienes una matrícula activa'
            ], 404);
        }

        // Validar que el monto no exceda el total pendiente
        $totalPending = $enrollment->total_pending;
        $amount = (float) $request->amount;
        
        if ($amount > $totalPending) {
            return response()->json([
                'success' => false,
                'error' => "El monto (S/ {$amount}) excede tu deuda pendiente (S/ {$totalPending})",
            ], 422);
        }

        $email = $student->user->email;
        if (!$email) {
            return response()->json([
                'success' => false,
                'error' => 'No se encontró email del estudiante',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // 1. Crear cargo en Culqi
            $chargeResult = $this->culqiService->createCharge(
                $request->token_id,
                $amount,
                'PEN',
                $email,
                [
                    'student_id' => $student->id,
                    'description' => "Pago parcial - {$student->first_name} {$student->last_name}",
                ]
            );

            // Verificar si requiere 3DS
            if (!$chargeResult['success'] && isset($chargeResult['requires_3ds']) && $chargeResult['requires_3ds']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'requires_3ds' => true,
                    'charge_data' => $chargeResult['data'] ?? null,
                    'token_id' => $request->token_id,
                    'amount' => $amount,
                    'email' => $email,
                    'is_partial_payment' => true,
                    'message' => 'Se requiere verificación 3D Secure',
                ], 200);
            }

            if (!$chargeResult['success']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => $chargeResult['error'],
                ], 400);
            }

            $chargeData = $chargeResult['data'];

            if (!isset($chargeData['id'])) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => 'Respuesta inesperada de Culqi. Por favor intenta de nuevo.',
                ], 400);
            }

            // 2. Guardar transacción en BD
            $transaction = CulqiTransaction::create([
                'student_id' => $student->id,
                'installment_id' => null, // Pago parcial no tiene cuota específica
                'charge_id' => $chargeData['id'],
                'amount' => $amount / 100,
                'currency' => 'PEN',
                'status' => 'successful',
                'card_brand' => $chargeData['source']['iin']['card_brand'] ?? null,
                'card_last4' => substr($chargeData['source']['card_number'] ?? '', -4),
                'response_data' => $chargeData,
            ]);

            // 3. Distribuir el pago a las cuotas más antiguas
            $amountRemaining = $amount / 100; // Convertir de centavos a soles
            $distributionDetails = [];
            $affectedInstallments = [];
            $vouchersCreated = [];

            foreach ($enrollment->installments as $installment) {
                if ($amountRemaining <= 0) {
                    break;
                }

                // Calcular mora actualizada
                $installment->calculateLateFee();
                $installment->refresh();

                $totalDue = $installment->total_due;
                $alreadyPaid = $installment->paid_amount;
                $pending = $totalDue - $alreadyPaid;

                if ($pending <= 0) {
                    continue;
                }

                $amountToApply = min($amountRemaining, $pending);

                // Crear voucher para esta cuota (pago Culqi = verificado automáticamente)
                $voucher = InstallmentVoucher::create([
                    'installment_id' => $installment->id,
                    'uploaded_by' => $student->user->id,
                    'voucher_path' => null,
                    'declared_amount' => $amountToApply,
                    'verified_amount' => $amountToApply,
                    'payment_date' => now(),
                    'payment_method' => 'tarjeta',
                    'status' => 'approved',
                    'payment_type' => ($amountToApply >= $pending) ? 'full' : 'partial',
                    'applied_to_total' => true,
                    'transaction_reference' => $chargeData['id'],
                    'culqi_transaction_id' => $transaction->id,
                    'payment_source' => 'culqi_card',
                    'notes' => 'Pago parcial con tarjeta (Culqi) - Distribuido automáticamente',
                    'reviewed_by' => null,
                    'reviewed_at' => now(),
                ]);

                $vouchersCreated[] = $voucher;

                // Actualizar la cuota
                $newPaidAmount = $alreadyPaid + $amountToApply;
                $isComplete = $newPaidAmount >= $totalDue;
                $remainingAmount = max(0, $totalDue - $newPaidAmount);
                
                // Determinar payment_type
                $currentPaymentType = $installment->payment_type;
                if ($isComplete) {
                    $paymentType = ($currentPaymentType === 'partial' || $alreadyPaid > 0) ? 'combined' : 'full';
                } else {
                    $paymentType = ($currentPaymentType === 'partial' || $alreadyPaid > 0) ? 'combined' : 'partial';
                }
                
                $installment->update([
                    'paid_amount' => $newPaidAmount,
                    'remaining_amount' => $remainingAmount,
                    'payment_type' => $paymentType,
                    'status' => $isComplete ? 'verified' : 'paid',
                    'paid_date' => now(),
                    'verified_by' => null, // Pago automático
                    'verified_at' => $isComplete ? now() : null,
                ]);

                $distributionDetails[] = [
                    'installment_number' => $installment->installment_number,
                    'amount_applied' => $amountToApply,
                    'was_completed' => $isComplete,
                ];

                $affectedInstallments[] = $installment->id;
                $amountRemaining -= $amountToApply;

                Log::info('Pago parcial Culqi aplicado a cuota:', [
                    'installment_id' => $installment->id,
                    'installment_number' => $installment->installment_number,
                    'amount_applied' => $amountToApply,
                ]);
            }

            // 4. Generar boletas para los vouchers creados (una por cada cuota afectada)
            foreach ($vouchersCreated as $index => $voucher) {
                try {
                    $receiptService = new PaymentReceiptService();
                    $receiptPath = $receiptService->generate($voucher);
                    
                    $voucher->receipt_path = $receiptPath;
                    $voucher->save();

                    // Enviar boleta por email para cada voucher
                    if ($email) {
                        Mail::to($email)->queue(new PaymentReceiptMail($voucher, $receiptPath));
                        Log::info("Boleta Culqi (pago parcial #{$index}) enviada a {$email} - Cuota #{$voucher->installment->installment_number}");
                    }
                } catch (\Exception $e) {
                    Log::error('Error generando boleta para pago parcial Culqi: ' . $e->getMessage());
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => '¡Pago parcial procesado exitosamente!',
                'transaction' => $transaction,
                'total_amount' => $amount / 100,
                'distribution_details' => $distributionDetails,
                'affected_installments' => count($affectedInstallments),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing partial payment with Culqi', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al procesar el pago: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Procesar un pago parcial con 3DS
     * El pago se distribuye automáticamente a las cuotas más antiguas
     */
    private function processPartialPaymentWith3DS(Request $request, $student)
    {
        // Verificar si los pagos parciales están habilitados
        $allowPartialPayments = Setting::where('key', 'allow_partial_payments')
            ->where('type', 'payment')
            ->value('content') === 'true';

        if (!$allowPartialPayments) {
            return response()->json([
                'success' => false,
                'error' => 'Los pagos parciales no están habilitados en el sistema'
            ], 400);
        }

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
                'success' => false,
                'error' => 'No tienes una matrícula activa'
            ], 404);
        }

        // Validar que el monto no exceda el total pendiente
        $totalPending = $enrollment->total_pending;
        $amount = (float) $request->amount;
        
        if ($amount > $totalPending) {
            return response()->json([
                'success' => false,
                'error' => "El monto (S/ {$amount}) excede tu deuda pendiente (S/ {$totalPending})",
            ], 422);
        }

        $email = $student->user->email;
        if (!$email) {
            return response()->json([
                'success' => false,
                'error' => 'No se encontró email del estudiante',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Crear cargo con parámetros 3DS
            $chargeResult = $this->culqiService->createChargeWith3DS(
                $request->token_id,
                $amount,
                'PEN',
                $email,
                $request->parameters_3ds,
                [
                    'student_id' => $student->id,
                    'description' => "Pago parcial 3DS - {$student->first_name} {$student->last_name}",
                    '3ds_authenticated' => true,
                ]
            );

            if (!$chargeResult['success']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => $chargeResult['error'],
                ], 400);
            }

            $chargeData = $chargeResult['data'];

            if (!isset($chargeData['id'])) {
                DB::rollBack();
                Log::error('Culqi 3DS charge response missing ID (partial)', ['data' => $chargeData]);
                return response()->json([
                    'success' => false,
                    'error' => 'Respuesta inesperada de Culqi. Por favor intenta de nuevo.',
                ], 400);
            }

            // Guardar transacción en BD
            $transaction = CulqiTransaction::create([
                'student_id' => $student->id,
                'installment_id' => null,
                'culqi_charge_id' => $chargeData['id'],
                'culqi_token_id' => $request->token_id,
                'amount' => $amount,
                'currency' => 'PEN',
                'status' => 'succeeded',
                'culqi_response' => $chargeData,
                'card_brand' => $chargeData['source']['iin']['card_brand'] ?? null,
                'card_last4' => $chargeData['source']['card_number'] ?? null,
                'customer_email' => $email,
            ]);

            // Distribuir el pago a las cuotas más antiguas
            $amountRemaining = $amount;
            $distributionDetails = [];
            $affectedInstallments = [];
            $vouchersCreated = [];

            foreach ($enrollment->installments as $installment) {
                if ($amountRemaining <= 0) {
                    break;
                }

                // Calcular mora actualizada
                $installment->calculateLateFee();
                $installment->refresh();

                $totalDue = $installment->total_due;
                $alreadyPaid = $installment->paid_amount;
                $pending = $totalDue - $alreadyPaid;

                if ($pending <= 0) {
                    continue;
                }

                $amountToApply = min($amountRemaining, $pending);

                // Crear voucher para esta cuota
                $voucher = InstallmentVoucher::create([
                    'installment_id' => $installment->id,
                    'uploaded_by' => $student->user->id,
                    'voucher_path' => 'culqi_payment_3ds',
                    'declared_amount' => $amountToApply,
                    'verified_amount' => $amountToApply,
                    'payment_date' => now(),
                    'payment_method' => 'tarjeta',
                    'status' => 'approved',
                    'payment_type' => ($amountToApply >= $pending) ? 'full' : 'partial',
                    'applied_to_total' => true,
                    'transaction_reference' => $chargeData['id'],
                    'culqi_transaction_id' => $transaction->id,
                    'payment_source' => 'culqi_card',
                    'notes' => 'Pago parcial 3DS con tarjeta (Culqi) - Distribuido automáticamente',
                    'reviewed_by' => null,
                    'reviewed_at' => now(),
                ]);

                $vouchersCreated[] = $voucher;

                // Actualizar la cuota
                $newPaidAmount = $alreadyPaid + $amountToApply;
                $isComplete = $newPaidAmount >= $totalDue;
                $remainingAmount = max(0, $totalDue - $newPaidAmount);
                
                // Determinar payment_type
                $currentPaymentType = $installment->payment_type;
                if ($isComplete) {
                    $paymentType = ($currentPaymentType === 'partial' || $alreadyPaid > 0) ? 'combined' : 'full';
                } else {
                    $paymentType = ($currentPaymentType === 'partial' || $alreadyPaid > 0) ? 'combined' : 'partial';
                }
                
                $installment->update([
                    'paid_amount' => $newPaidAmount,
                    'remaining_amount' => $remainingAmount,
                    'payment_type' => $paymentType,
                    'status' => $isComplete ? 'verified' : 'paid',
                    'paid_date' => now(),
                    'verified_by' => null,
                    'verified_at' => $isComplete ? now() : null,
                ]);

                $distributionDetails[] = [
                    'installment_number' => $installment->installment_number,
                    'amount_applied' => $amountToApply,
                    'was_completed' => $isComplete,
                ];

                $affectedInstallments[] = $installment->id;
                $amountRemaining -= $amountToApply;

                Log::info('Pago parcial Culqi 3DS aplicado a cuota:', [
                    'installment_id' => $installment->id,
                    'installment_number' => $installment->installment_number,
                    'amount_applied' => $amountToApply,
                ]);
            }

            // Generar boletas para los vouchers creados (una por cada cuota afectada)
            foreach ($vouchersCreated as $index => $voucher) {
                try {
                    $receiptService = new PaymentReceiptService();
                    $receiptPath = $receiptService->generate($voucher);
                    
                    $voucher->receipt_path = $receiptPath;
                    $voucher->save();

                    // Enviar boleta por email para cada voucher
                    if ($email) {
                        Mail::to($email)->queue(new PaymentReceiptMail($voucher, $receiptPath));
                        Log::info("Boleta Culqi 3DS (pago parcial #{$index}) enviada a {$email} - Cuota #{$voucher->installment->installment_number}");
                    }
                } catch (\Exception $e) {
                    Log::error('Error generando boleta para pago parcial Culqi 3DS: ' . $e->getMessage());
                }
            }

            // Guardar tarjeta si lo solicita
            $savedCard = null;
            if ($request->save_card) {
                $savedCard = $this->saveCard($student, $chargeData, $request->auto_payment ?? false);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => '¡Pago parcial procesado exitosamente con verificación 3D Secure!',
                'transaction' => $transaction,
                'total_amount' => $amount,
                'distribution_details' => $distributionDetails,
                'affected_installments' => count($affectedInstallments),
                'saved_card' => $savedCard,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing partial payment with Culqi 3DS', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al procesar el pago: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Procesar un pago parcial con tarjeta guardada
     * El pago se distribuye automáticamente a las cuotas más antiguas
     */
    private function processPartialPaymentWithSavedCard(Request $request, $student, $paymentMethod, $user)
    {
        // Verificar si los pagos parciales están habilitados
        $allowPartialPayments = Setting::where('key', 'allow_partial_payments')
            ->where('type', 'payment')
            ->value('content') === 'true';

        if (!$allowPartialPayments) {
            return response()->json([
                'success' => false,
                'error' => 'Los pagos parciales no están habilitados en el sistema'
            ], 400);
        }

        // Verificar ownership de la tarjeta
        if ($paymentMethod->student_id !== $student->id) {
            return response()->json(['error' => 'No autorizado - tarjeta no pertenece al estudiante'], 403);
        }

        // Verificar que la tarjeta tenga un ID de Culqi válido
        if (empty($paymentMethod->culqi_card_id)) {
            return response()->json([
                'success' => false,
                'error' => 'Esta tarjeta no está habilitada para pagos automáticos. Por favor usa "Pagar con nueva tarjeta" y marca la opción de guardar la tarjeta.',
            ], 400);
        }

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
                'success' => false,
                'error' => 'No tienes una matrícula activa'
            ], 404);
        }

        // Validar que el monto no exceda el total pendiente
        $totalPending = $enrollment->total_pending;
        $amount = (float) $request->amount;
        
        if ($amount > $totalPending) {
            return response()->json([
                'success' => false,
                'error' => "El monto (S/ {$amount}) excede tu deuda pendiente (S/ {$totalPending})",
            ], 422);
        }

        $email = $user->email;
        $studentFullName = trim($student->first_name . ' ' . ($student->paternal_last_name ?? '') . ' ' . ($student->maternal_last_name ?? ''));

        DB::beginTransaction();
        try {
            // 1. Crear cargo con tarjeta guardada
            $chargeResult = $this->culqiService->createChargeWithCard(
                $paymentMethod->culqi_card_id,
                $amount,
                'PEN',
                $email,
                [
                    'student_id' => $student->id,
                    'payment_method_id' => $paymentMethod->id,
                    'description' => "Pago parcial - {$studentFullName}",
                ]
            );

            // Verificar si requiere 3DS
            if (!$chargeResult['success'] && !empty($chargeResult['requires_3ds'])) {
                DB::rollBack();
                
                return response()->json([
                    'success' => false,
                    'requires_3ds' => true,
                    'card_id' => $paymentMethod->culqi_card_id,
                    'payment_method_id' => $paymentMethod->id,
                    'email' => $email,
                    'is_partial_payment' => true,
                    'charge_data' => $chargeResult['data'] ?? null,
                ], 200);
            }

            if (!$chargeResult['success']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => $chargeResult['error'] ?? 'Error al procesar el pago',
                ], 400);
            }

            $chargeData = $chargeResult['data'];

            if (empty($chargeData['id'])) {
                DB::rollBack();
                Log::error('Charge response missing ID (partial saved card)', ['chargeData' => $chargeData]);
                return response()->json([
                    'success' => false,
                    'error' => 'La respuesta del procesador de pago no es válida',
                ], 400);
            }

            // 2. Guardar transacción en BD
            $transaction = CulqiTransaction::create([
                'student_id' => $student->id,
                'installment_id' => null, // Pago parcial no tiene cuota específica
                'payment_method_id' => $paymentMethod->id,
                'culqi_charge_id' => $chargeData['id'],
                'amount' => $amount,
                'currency' => 'PEN',
                'status' => 'succeeded',
                'culqi_response' => $chargeData,
                'card_brand' => $paymentMethod->card_brand,
                'card_last4' => $paymentMethod->card_last4,
                'customer_email' => $email,
            ]);

            // 3. Distribuir el pago a las cuotas más antiguas
            $amountRemaining = $amount;
            $distributionDetails = [];
            $affectedInstallments = [];
            $vouchersCreated = [];

            foreach ($enrollment->installments as $installment) {
                if ($amountRemaining <= 0) {
                    break;
                }

                // Calcular mora actualizada
                $installment->calculateLateFee();
                $installment->refresh();

                $totalDue = $installment->total_due;
                $alreadyPaid = $installment->paid_amount;
                $pending = $totalDue - $alreadyPaid;

                if ($pending <= 0) {
                    continue;
                }

                $amountToApply = min($amountRemaining, $pending);

                // Crear voucher para esta cuota (pago Culqi = verificado automáticamente)
                $voucher = InstallmentVoucher::create([
                    'installment_id' => $installment->id,
                    'uploaded_by' => $user->id,
                    'voucher_path' => 'culqi_saved_card',
                    'declared_amount' => $amountToApply,
                    'verified_amount' => $amountToApply,
                    'payment_date' => now(),
                    'payment_method' => 'tarjeta',
                    'status' => 'approved',
                    'payment_type' => ($amountToApply >= $pending) ? 'full' : 'partial',
                    'applied_to_total' => true,
                    'transaction_reference' => $chargeData['id'],
                    'culqi_transaction_id' => $transaction->id,
                    'payment_source' => 'culqi_card',
                    'notes' => 'Pago parcial con tarjeta guardada (Culqi) - Distribuido automáticamente',
                    'reviewed_by' => null,
                    'reviewed_at' => now(),
                ]);

                $vouchersCreated[] = $voucher;

                // Actualizar la cuota
                $newPaidAmount = $alreadyPaid + $amountToApply;
                $isComplete = $newPaidAmount >= $totalDue;
                $remainingAmount = max(0, $totalDue - $newPaidAmount);
                
                // Determinar payment_type
                $currentPaymentType = $installment->payment_type;
                if ($isComplete) {
                    $paymentType = ($currentPaymentType === 'partial' || $alreadyPaid > 0) ? 'combined' : 'full';
                } else {
                    $paymentType = ($currentPaymentType === 'partial' || $alreadyPaid > 0) ? 'combined' : 'partial';
                }
                
                $installment->update([
                    'paid_amount' => $newPaidAmount,
                    'remaining_amount' => $remainingAmount,
                    'payment_type' => $paymentType,
                    'status' => $isComplete ? 'verified' : 'paid',
                    'paid_date' => now(),
                    'verified_by' => null,
                    'verified_at' => $isComplete ? now() : null,
                ]);

                $distributionDetails[] = [
                    'installment_number' => $installment->installment_number,
                    'amount_applied' => $amountToApply,
                    'was_completed' => $isComplete,
                ];

                $affectedInstallments[] = $installment->id;
                $amountRemaining -= $amountToApply;

                Log::info('Pago parcial Culqi (tarjeta guardada) aplicado a cuota:', [
                    'installment_id' => $installment->id,
                    'installment_number' => $installment->installment_number,
                    'amount_applied' => $amountToApply,
                ]);
            }

            // 4. Generar boletas para los vouchers creados (una por cada cuota afectada)
            foreach ($vouchersCreated as $index => $voucher) {
                try {
                    $receiptService = new PaymentReceiptService();
                    $receiptPath = $receiptService->generate($voucher);
                    
                    $voucher->receipt_path = $receiptPath;
                    $voucher->save();

                    // Enviar boleta por email para cada voucher
                    if ($email) {
                        Mail::to($email)->queue(new PaymentReceiptMail($voucher, $receiptPath));
                        Log::info("Boleta Culqi (tarjeta guardada #{$index}) enviada a {$email} - Cuota #{$voucher->installment->installment_number}");
                    }
                } catch (\Exception $e) {
                    Log::error('Error generando boleta para pago parcial Culqi (tarjeta guardada): ' . $e->getMessage());
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => '¡Pago parcial procesado exitosamente con tarjeta guardada!',
                'transaction' => $transaction,
                'total_amount' => $amount,
                'distribution_details' => $distributionDetails,
                'affected_installments' => count($affectedInstallments),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing partial payment with saved card', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al procesar el pago: ' . $e->getMessage(),
            ], 500);
        }
    }
}
