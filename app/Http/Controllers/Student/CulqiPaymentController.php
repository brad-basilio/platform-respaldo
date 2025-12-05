<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\CulqiTransaction;
use App\Models\Installment;
use App\Models\InstallmentVoucher;
use App\Models\PaymentMethod;
use App\Services\CulqiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
     * 4. Si es exitoso, crea voucher y actualiza installment
     */
    public function processPayment(Request $request)
    {
        $request->validate([
            'token_id' => 'required|string', // Token ID de Culqi (tkn_xxx)
            'installment_id' => 'required|exists:installments,id',
            'amount' => 'required|numeric|min:0.01',
            'save_card' => 'sometimes|boolean',
            'auto_payment' => 'sometimes|boolean',
        ]);

        $student = Auth::user()->student;
        $installment = Installment::findOrFail($request->installment_id);

        // Verificar que el installment pertenece al estudiante
        if ($installment->enrollment->student_id !== $student->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        DB::beginTransaction();
        try {
            // 1. Crear cargo en Culqi
            $chargeResult = $this->culqiService->createCharge(
                $request->token_id,
                $request->amount,
                'PEN',
                $student->email,
                [
                    'student_id' => $student->id,
                    'installment_id' => $installment->id,
                    'description' => "Pago cuota #{$installment->installment_number} - {$student->first_name} {$student->last_name}",
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
                'customer_email' => $student->email,
            ]);

            // 3. Crear voucher automático
            $voucher = InstallmentVoucher::create([
                'installment_id' => $installment->id,
                'voucher_path' => null, // No hay archivo, es pago con tarjeta
                'status' => 'approved', // Aprobado automáticamente
                'payment_method' => 'card',
                'paid_amount' => $request->amount,
                'paid_date' => now(),
                'payment_source' => 'culqi_card',
                'culqi_transaction_id' => $transaction->id,
                'verified_by' => null, // Automático, no requiere verificación manual
            ]);

            // 4. Actualizar installment
            $installment->paid_amount += $request->amount;
            
            if ($installment->paid_amount >= $installment->amount) {
                $installment->status = 'paid';
                $installment->paid_date = now();
            }
            
            $installment->save();

            // 5. Actualizar progreso del enrollment
            $installment->enrollment->updatePaymentProgress();

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
     * Procesar pago con tarjeta guardada
     */
    public function processPaymentWithSavedCard(Request $request)
    {
        $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'installment_id' => 'required|exists:installments,id',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $student = Auth::user()->student;
        $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);
        $installment = Installment::findOrFail($request->installment_id);

        // Verificar ownership
        if ($paymentMethod->student_id !== $student->id || $installment->enrollment->student_id !== $student->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        DB::beginTransaction();
        try {
            // Crear cargo con tarjeta guardada
            $chargeResult = $this->culqiService->createChargeWithCard(
                $paymentMethod->culqi_card_id,
                $request->amount,
                'PEN',
                $student->email,
                [
                    'student_id' => $student->id,
                    'installment_id' => $installment->id,
                    'payment_method_id' => $paymentMethod->id,
                    'description' => "Pago cuota #{$installment->installment_number} - {$student->first_name} {$student->last_name}",
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
                'customer_email' => $student->email,
            ]);

            // Crear voucher
            $voucher = InstallmentVoucher::create([
                'installment_id' => $installment->id,
                'status' => 'approved',
                'payment_method' => 'card',
                'paid_amount' => $request->amount,
                'paid_date' => now(),
                'payment_source' => 'culqi_card',
                'culqi_transaction_id' => $transaction->id,
            ]);

            // Actualizar installment
            $installment->paid_amount += $request->amount;
            if ($installment->paid_amount >= $installment->amount) {
                $installment->status = 'paid';
                $installment->paid_date = now();
            }
            $installment->save();

            // Actualizar progreso
            $installment->enrollment->updatePaymentProgress();

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
}
