<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PaymentMethodController extends Controller
{
    /**
     * Obtener todos los métodos de pago del estudiante
     */
    public function index()
    {
        $user = Auth::user();
        $student = $user->student;

        if (!$student) {
            return response()->json([
                'message' => 'No se encontró información de estudiante'
            ], 404);
        }

        $paymentMethods = PaymentMethod::where('student_id', $student->id)
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($method) {
                return [
                    'id' => $method->id,
                    'type' => $method->type,
                    'provider' => $method->provider,
                    'cardBrand' => $method->card_brand,
                    'cardLast4' => $method->card_last4,
                    'cardExpMonth' => $method->card_exp_month,
                    'cardExpYear' => $method->card_exp_year,
                    'cardholderName' => $method->cardholder_name,
                    'isDefault' => $method->is_default,
                    'autoPaymentEnabled' => $method->auto_payment_enabled,
                    'isExpired' => $method->isExpired(),
                    'formattedCardName' => $method->formatted_card_name,
                    'createdAt' => $method->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json([
            'payment_methods' => $paymentMethods,
        ]);
    }

    /**
     * Guardar un nuevo método de pago
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'kulki_card_token' => 'required|string',
            'kulki_customer_id' => 'required|string',
            'card_brand' => 'required|string',
            'card_last4' => 'required|string|size:4',
            'card_exp_month' => 'required|string|size:2',
            'card_exp_year' => 'required|string|size:4',
            'cardholder_name' => 'required|string|max:255',
            'is_default' => 'boolean',
            'auto_payment_enabled' => 'boolean',
        ]);

        $user = Auth::user();
        $student = $user->student;

        if (!$student) {
            return response()->json([
                'message' => 'No se encontró información de estudiante'
            ], 404);
        }

        try {
            // Si es el primer método de pago, marcarlo como predeterminado
            $isFirstMethod = !PaymentMethod::where('student_id', $student->id)->exists();

            $paymentMethod = PaymentMethod::create([
                'student_id' => $student->id,
                'type' => 'card',
                'provider' => 'kulki',
                'card_brand' => $validated['card_brand'],
                'card_last4' => $validated['card_last4'],
                'card_exp_month' => $validated['card_exp_month'],
                'card_exp_year' => $validated['card_exp_year'],
                'cardholder_name' => $validated['cardholder_name'],
                'kulki_card_token' => $validated['kulki_card_token'],
                'kulki_customer_id' => $validated['kulki_customer_id'],
                'is_default' => $isFirstMethod ? true : ($validated['is_default'] ?? false),
                'auto_payment_enabled' => $validated['auto_payment_enabled'] ?? false,
            ]);

            // Si se marca como predeterminada, desmarcar las demás
            if ($paymentMethod->is_default) {
                $paymentMethod->setAsDefault();
            }

            return response()->json([
                'message' => 'Método de pago guardado exitosamente',
                'payment_method' => [
                    'id' => $paymentMethod->id,
                    'type' => $paymentMethod->type,
                    'cardBrand' => $paymentMethod->card_brand,
                    'cardLast4' => $paymentMethod->card_last4,
                    'cardExpMonth' => $paymentMethod->card_exp_month,
                    'cardExpYear' => $paymentMethod->card_exp_year,
                    'cardholderName' => $paymentMethod->cardholder_name,
                    'isDefault' => $paymentMethod->is_default,
                    'autoPaymentEnabled' => $paymentMethod->auto_payment_enabled,
                    'formattedCardName' => $paymentMethod->formatted_card_name,
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error saving payment method', [
                'error' => $e->getMessage(),
                'student_id' => $student->id,
            ]);

            return response()->json([
                'message' => 'Error al guardar el método de pago',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar un método de pago
     */
    public function update(Request $request, PaymentMethod $paymentMethod)
    {
        $user = Auth::user();
        $student = $user->student;

        // Verificar que el método de pago pertenezca al estudiante
        if ($paymentMethod->student_id !== $student->id) {
            return response()->json([
                'message' => 'No autorizado'
            ], 403);
        }

        $validated = $request->validate([
            'is_default' => 'boolean',
            'auto_payment_enabled' => 'boolean',
        ]);

        try {
            if (isset($validated['is_default']) && $validated['is_default']) {
                $paymentMethod->setAsDefault();
            } else {
                $paymentMethod->update($validated);
            }

            return response()->json([
                'message' => 'Método de pago actualizado exitosamente',
                'payment_method' => [
                    'id' => $paymentMethod->id,
                    'isDefault' => $paymentMethod->is_default,
                    'autoPaymentEnabled' => $paymentMethod->auto_payment_enabled,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating payment method', [
                'error' => $e->getMessage(),
                'payment_method_id' => $paymentMethod->id,
            ]);

            return response()->json([
                'message' => 'Error al actualizar el método de pago'
            ], 500);
        }
    }

    /**
     * Eliminar un método de pago
     */
    public function destroy(PaymentMethod $paymentMethod)
    {
        $user = Auth::user();
        $student = $user->student;

        // Verificar que el método de pago pertenezca al estudiante
        if ($paymentMethod->student_id !== $student->id) {
            return response()->json([
                'message' => 'No autorizado'
            ], 403);
        }

        try {
            $wasDefault = $paymentMethod->is_default;
            $paymentMethod->delete();

            // Si era la tarjeta predeterminada, marcar otra como predeterminada
            if ($wasDefault) {
                $nextMethod = PaymentMethod::where('student_id', $student->id)->first();
                if ($nextMethod) {
                    $nextMethod->setAsDefault();
                }
            }

            return response()->json([
                'message' => 'Método de pago eliminado exitosamente',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting payment method', [
                'error' => $e->getMessage(),
                'payment_method_id' => $paymentMethod->id,
            ]);

            return response()->json([
                'message' => 'Error al eliminar el método de pago'
            ], 500);
        }
    }
}
