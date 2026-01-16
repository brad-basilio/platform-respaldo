<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\Student;
use App\Services\CulqiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PaymentMethodController extends Controller
{
    protected CulqiService $culqiService;

    public function __construct(CulqiService $culqiService)
    {
        $this->culqiService = $culqiService;
    }

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
                    'canCharge' => !empty($method->culqi_card_id), // Si tiene culqi_card_id, se puede cobrar
                ];
            });

        return response()->json([
            'payment_methods' => $paymentMethods,
        ]);
    }

    /**
     * Guardar un nuevo método de pago con integración Culqi
     * 
     * Flujo:
     * 1. Frontend usa Culqi Checkout para obtener token (tkn_xxx)
     * 2. Backend crea Customer en Culqi (o usa existente)
     * 3. Backend crea Card en Culqi asociada al customer
     * 4. Se guarda en BD con culqi_card_id para cobros futuros
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'token_id' => 'required|string', // Token de Culqi Checkout (tkn_xxx)
            'card_brand' => 'nullable|string|max:50',
            'card_last4' => 'nullable|string|max:4',
            'card_exp_month' => 'nullable|string|max:2',
            'card_exp_year' => 'nullable|string|max:4',
            'cardholder_name' => 'nullable|string|max:255',
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
            // Obtener email del usuario (no del estudiante)
            $userEmail = $user->email;
            
            // Buscar si el estudiante ya tiene un customer_id de Culqi
            $existingMethod = PaymentMethod::where('student_id', $student->id)
                ->whereNotNull('culqi_customer_id')
                ->first();
            
            $customerId = $existingMethod?->culqi_customer_id;

            // Si no tiene customer guardado, buscar en Culqi o crear uno nuevo
            if (!$customerId) {
                // Primero buscar si ya existe un customer con este email en Culqi
                $searchResult = $this->culqiService->findCustomerByEmail($userEmail);
                
                if ($searchResult['success'] && $searchResult['found']) {
                    // Ya existe un customer en Culqi, usar ese ID
                    $customerId = $searchResult['data']['id'];
                    Log::info('Culqi customer found by email', [
                        'customer_id' => $customerId,
                        'email' => $userEmail,
                        'student_id' => $student->id,
                    ]);
                } else {
                    // No existe, crear uno nuevo
                    // Culqi requiere first_name y last_name no vacíos
                    $firstName = $student->first_name ?? $user->name ?? 'Usuario';
                    $lastName = trim(($student->paternal_last_name ?? '') . ' ' . ($student->maternal_last_name ?? ''));
                    
                    // Si no hay apellido, dividir el nombre del usuario o usar placeholder
                    if (empty(trim($lastName))) {
                        $nameParts = explode(' ', $user->name ?? 'Usuario');
                        if (count($nameParts) > 1) {
                            $firstName = $nameParts[0];
                            $lastName = implode(' ', array_slice($nameParts, 1));
                        } else {
                            $lastName = 'Estudiante'; // Placeholder requerido por Culqi
                        }
                    }
                    
                    $customerResult = $this->culqiService->createCustomer(
                        $userEmail,
                        $firstName,
                        $lastName,
                        null, // address - usará valor por defecto
                        $student->phone_number // teléfono del estudiante
                    );

                    if (!$customerResult['success']) {
                        Log::error('Error creating Culqi customer', [
                            'error' => $customerResult['error'],
                            'student_id' => $student->id,
                        ]);
                        return response()->json([
                            'message' => 'Error al registrar cliente en el sistema de pagos',
                            'error' => is_array($customerResult['error']) 
                                ? ($customerResult['error']['user_message'] ?? 'Error desconocido')
                                : $customerResult['error'],
                        ], 400);
                    }

                    $customerId = $customerResult['data']['id'];
                    Log::info('Culqi customer created', [
                        'customer_id' => $customerId,
                        'student_id' => $student->id,
                    ]);
                }
            }

            // Crear la tarjeta en Culqi
            $cardResult = $this->culqiService->createCard($customerId, $validated['token_id']);

            if (!$cardResult['success']) {
                Log::error('Error creating Culqi card', [
                    'error' => $cardResult['error'],
                    'customer_id' => $customerId,
                ]);
                return response()->json([
                    'message' => 'Error al registrar la tarjeta',
                    'error' => is_array($cardResult['error']) 
                        ? ($cardResult['error']['user_message'] ?? 'Error al guardar tarjeta')
                        : $cardResult['error'],
                ], 400);
            }

            $cardData = $cardResult['data'];
            $cardId = $cardData['id']; // crd_xxx

            Log::info('Culqi card created', [
                'card_id' => $cardId,
                'customer_id' => $customerId,
                'card_data' => $cardData, // Ver estructura completa
            ]);

            // Si es el primer método de pago, marcarlo como predeterminado
            $isFirstMethod = !PaymentMethod::where('student_id', $student->id)->exists();

            // Extraer información de la tarjeta desde la respuesta de Culqi (cardData)
            $cardInfo = $cardData['source'] ?? $cardData;
            
            // Construir nombre completo del titular
            $fullName = trim($student->first_name . ' ' . ($student->paternal_last_name ?? '') . ' ' . ($student->maternal_last_name ?? ''));
            
            $paymentMethod = PaymentMethod::create([
                'student_id' => $student->id,
                'type' => 'card',
                'provider' => 'culqi',
                'card_brand' => $cardInfo['iin']['card_brand'] ?? $validated['card_brand'] ?? 'unknown',
                'card_last4' => $cardInfo['last_four'] ?? $validated['card_last4'] ?? '****',
                'card_exp_month' => isset($cardInfo['expiration_month']) ? str_pad($cardInfo['expiration_month'], 2, '0', STR_PAD_LEFT) : ($validated['card_exp_month'] ?? '**'),
                'card_exp_year' => isset($cardInfo['expiration_year']) ? (string)$cardInfo['expiration_year'] : ($validated['card_exp_year'] ?? '****'),
                'cardholder_name' => $validated['cardholder_name'] ?? $fullName,
                'culqi_card_id' => $cardId, // ID de la tarjeta en Culqi (crd_xxx)
                'culqi_customer_id' => $customerId, // ID del cliente en Culqi (cus_xxx)
                'is_default' => $isFirstMethod ? true : ($validated['is_default'] ?? false),
                'auto_payment_enabled' => $validated['auto_payment_enabled'] ?? false,
            ]);

            // Si se marca como predeterminada, desmarcar las demás
            if ($paymentMethod->is_default) {
                $paymentMethod->setAsDefault();
            }

            return response()->json([
                'message' => 'Tarjeta guardada exitosamente',
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
                    'canCharge' => true,
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
