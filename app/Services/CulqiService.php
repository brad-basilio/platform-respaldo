<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Setting;

class CulqiService
{
    private string $secretKey;
    private string $publicKey;
    private string $apiUrl;

    public function __construct()
    {
        // Cargar credenciales desde la tabla settings
        $this->publicKey = Setting::get('culqi_public_key', config('services.culqi.public_key', ''));
        $this->secretKey = Setting::get('culqi_api_key', config('services.culqi.secret_key', ''));
        $this->apiUrl = Setting::get('culqi_api_url', 'https://api.culqi.com');
    }

    /**
     * Crear un cargo único con un token de tarjeta
     * 
     * @param string $tokenId Token ID devuelto por Culqi Checkout (tkn_xxx)
     * @param float $amount Monto en soles (ej: 100.50)
     * @param string $currency Código de moneda (PEN, USD)
     * @param string $email Email del cliente
     * @param array $metadata Metadata adicional
     * @return array Respuesta de Culqi
     */
    public function createCharge(string $tokenId, float $amount, string $currency, string $email, array $metadata = []): array
    {
        try {
            // Convertir monto a centavos (Culqi espera enteros)
            $amountInCents = (int) ($amount * 100);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl . '/v2/charges', [
                'amount' => $amountInCents,
                'currency_code' => $currency,
                'email' => $email,
                'source_id' => $tokenId, // Token ID del frontend
                'description' => $metadata['description'] ?? 'Pago de curso',
                'metadata' => $metadata,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                // Verificar si requiere 3DS (action_code = REVIEW)
                $actionCode = $data['action_code'] ?? null;
                $outcomeType = $data['outcome']['type'] ?? null;
                
                if ($actionCode === 'REVIEW' || $outcomeType === 'venta_review') {
                    Log::info('Culqi requires 3DS authentication', [
                        'action_code' => $actionCode,
                        'outcome_type' => $outcomeType,
                    ]);
                    return [
                        'success' => false,
                        'requires_3ds' => true,
                        'data' => $data,
                        'error' => 'Esta tarjeta requiere verificación 3D Secure. Por favor, usa otra tarjeta o contacta a tu banco.',
                    ];
                }
                
                Log::info('Culqi charge created successfully', ['charge_id' => $data['id'] ?? null]);
                return [
                    'success' => true,
                    'data' => $data,
                ];
            } else {
                $error = $response->json();
                Log::error('Culqi charge failed', [
                    'status' => $response->status(),
                    'error' => $error,
                ]);
                return [
                    'success' => false,
                    'error' => $error['merchant_message'] ?? $error['user_message'] ?? 'Error al procesar el pago',
                    'code' => $error['code'] ?? 'unknown',
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception creating Culqi charge', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'success' => false,
                'error' => 'Error al conectar con Culqi: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Crear un cargo con autenticación 3D Secure
     * Se llama después de que el usuario completa la verificación 3DS en el frontend
     * 
     * @param string $tokenId Token ID devuelto por Culqi Checkout
     * @param float $amount Monto en soles
     * @param string $currency Código de moneda
     * @param string $email Email del cliente
     * @param array $parameters3DS Parámetros 3DS del frontend
     * @param array $metadata Metadata adicional
     * @return array Respuesta de Culqi
     */
    public function createChargeWith3DS(string $tokenId, float $amount, string $currency, string $email, array $parameters3DS, array $metadata = []): array
    {
        try {
            $amountInCents = (int) ($amount * 100);

            $chargeData = [
                'amount' => $amountInCents,
                'currency_code' => $currency,
                'email' => $email,
                'source_id' => $tokenId,
                'description' => $metadata['description'] ?? 'Pago de curso',
                'metadata' => $metadata,
                'authentication_3DS' => $parameters3DS, // Parámetros 3DS
            ];

            Log::info('Creating charge with 3DS', [
                'token_id' => $tokenId,
                'amount' => $amountInCents,
                'has_3ds_params' => !empty($parameters3DS),
            ]);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl . '/v2/charges', $chargeData);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('Culqi charge with 3DS created successfully', ['charge_id' => $data['id'] ?? null]);
                return [
                    'success' => true,
                    'data' => $data,
                ];
            } else {
                $error = $response->json();
                Log::error('Culqi charge with 3DS failed', [
                    'status' => $response->status(),
                    'error' => $error,
                ]);
                return [
                    'success' => false,
                    'error' => $error['merchant_message'] ?? $error['user_message'] ?? 'Error al procesar el pago con 3DS',
                    'code' => $error['code'] ?? 'unknown',
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception creating Culqi charge with 3DS', [
                'message' => $e->getMessage(),
            ]);
            return [
                'success' => false,
                'error' => 'Error al conectar con Culqi: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Crear un cliente en Culqi
     * 
     * @param string $email Email del cliente
     * @param string $firstName Nombre
     * @param string $lastName Apellido
     * @return array Respuesta de Culqi
     */
    public function createCustomer(string $email, string $firstName, string $lastName, ?string $address = null, ?string $phone = null): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl . '/v2/customers', [
                'email' => $email,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'address' => $address ?: 'Dirección no especificada', // Culqi requiere 5-100 caracteres
                'address_city' => 'Lima',
                'country_code' => 'PE',
                'phone_number' => $phone ?: '999999999',
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            } else {
                return [
                    'success' => false,
                    'error' => $response->json(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception creating Culqi customer', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Buscar un cliente por email en Culqi
     * 
     * @param string $email Email del cliente
     * @return array Respuesta con el cliente si existe
     */
    public function findCustomerByEmail(string $email): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
                'Content-Type' => 'application/json',
            ])->get($this->apiUrl . '/v2/customers', [
                'email' => $email,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                // La API devuelve un array 'data' con los customers
                if (!empty($data['data']) && count($data['data']) > 0) {
                    return [
                        'success' => true,
                        'found' => true,
                        'data' => $data['data'][0], // Primer customer encontrado
                    ];
                }
                return [
                    'success' => true,
                    'found' => false,
                    'data' => null,
                ];
            } else {
                return [
                    'success' => false,
                    'error' => $response->json(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception finding Culqi customer', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Crear una tarjeta guardada para un cliente (para pagos recurrentes)
     * 
     * @param string $customerId ID del cliente en Culqi (cus_xxx)
     * @param string $tokenId Token ID de la tarjeta (tkn_xxx)
     * @return array Respuesta de Culqi
     */
    public function createCard(string $customerId, string $tokenId): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl . '/v2/cards', [
                'customer_id' => $customerId,
                'token_id' => $tokenId,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            } else {
                return [
                    'success' => false,
                    'error' => $response->json(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception creating Culqi card', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Crear un cargo con una tarjeta guardada (para pagos recurrentes/autopago)
     * 
     * @param string $cardId ID de la tarjeta guardada (crd_xxx)
     * @param float $amount Monto en soles
     * @param string $currency Código de moneda
     * @param string $email Email del cliente
     * @param array $metadata Metadata adicional
     * @return array Respuesta de Culqi
     */
    public function createChargeWithCard(string $cardId, float $amount, string $currency, string $email, array $metadata = []): array
    {
        try {
            $amountInCents = (int) ($amount * 100);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl . '/v2/charges', [
                'amount' => $amountInCents,
                'currency_code' => $currency,
                'email' => $email,
                'source_id' => $cardId, // Card ID en lugar de token
                'description' => $metadata['description'] ?? 'Pago recurrente de curso',
                'metadata' => $metadata,
            ]);

            $responseData = $response->json();
            
            Log::info('Culqi charge with card response', [
                'status' => $response->status(),
                'successful' => $response->successful(),
                'response' => $responseData,
            ]);

            if ($response->successful()) {
                // Verificar si requiere 3DS (algunas tarjetas guardadas pueden requerirlo)
                $actionCode = $responseData['action_code'] ?? null;
                if ($actionCode === 'REVIEW' || ($responseData['outcome']['type'] ?? null) === 'review') {
                    Log::info('Culqi card charge requires 3DS', [
                        'action_code' => $actionCode,
                        'outcome' => $responseData['outcome'] ?? null,
                    ]);
                    return [
                        'success' => false,
                        'requires_3ds' => true,
                        'error' => 'Esta tarjeta requiere verificación 3D Secure. Por favor usa "Pagar con nueva tarjeta".',
                        'data' => $responseData,
                    ];
                }
                
                return [
                    'success' => true,
                    'data' => $responseData,
                ];
            } else {
                $error = $responseData;
                return [
                    'success' => false,
                    'error' => $error['merchant_message'] ?? $error['user_message'] ?? 'Error al procesar el pago',
                    'code' => $error['code'] ?? 'unknown',
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception creating charge with card', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Crear un cargo con tarjeta guardada + parámetros 3DS
     * 
     * @param string $cardId ID de la tarjeta guardada (crd_xxx)
     * @param float $amount Monto en soles
     * @param string $currency Código de moneda
     * @param string $email Email del cliente
     * @param array $parameters3DS Parámetros 3DS (eci, xid, cavv, etc)
     * @param array $metadata Metadata adicional
     * @return array Respuesta de Culqi
     */
    public function createChargeWithCardAnd3DS(string $cardId, float $amount, string $currency, string $email, array $parameters3DS, array $metadata = []): array
    {
        try {
            $amountInCents = (int) ($amount * 100);

            $payload = [
                'amount' => $amountInCents,
                'currency_code' => $currency,
                'email' => $email,
                'source_id' => $cardId,
                'description' => $metadata['description'] ?? 'Pago recurrente de curso',
                'metadata' => $metadata,
            ];

            // Agregar parámetros 3DS
            if (!empty($parameters3DS)) {
                $payload['authentication_3DS'] = [
                    'eci' => $parameters3DS['eci'] ?? '',
                    'xid' => $parameters3DS['xid'] ?? '',
                    'cavv' => $parameters3DS['cavv'] ?? '',
                    'protocolVersion' => $parameters3DS['protocolVersion'] ?? $parameters3DS['version'] ?? '2.0',
                    'directoryServerTransactionId' => $parameters3DS['directoryServerTransactionId'] ?? $parameters3DS['dsTransId'] ?? '',
                ];
            }

            Log::info('Creating charge with card + 3DS', [
                'card_id' => $cardId,
                'amount' => $amountInCents,
                'has_3ds' => !empty($parameters3DS),
            ]);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl . '/v2/charges', $payload);

            $responseData = $response->json();
            
            Log::info('Culqi charge with card + 3DS response', [
                'status' => $response->status(),
                'successful' => $response->successful(),
                'response_id' => $responseData['id'] ?? null,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $responseData,
                ];
            } else {
                $error = $responseData;
                return [
                    'success' => false,
                    'error' => $error['merchant_message'] ?? $error['user_message'] ?? 'Error al procesar el pago',
                    'code' => $error['code'] ?? 'unknown',
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception creating charge with card + 3DS', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Eliminar una tarjeta guardada
     * 
     * @param string $cardId ID de la tarjeta (crd_xxx)
     * @return array Respuesta de Culqi
     */
    public function deleteCard(string $cardId): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
            ])->delete($this->apiUrl . '/v2/cards/' . $cardId);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            } else {
                return [
                    'success' => false,
                    'error' => $response->json(),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception deleting Culqi card', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Obtener la clave pública (para usarla en el frontend)
     * 
     * @return string Clave pública de Culqi
     */
    public function getPublicKey(): string
    {
        return $this->publicKey;
    }
}
