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
     * Crear un cliente en Culqi
     * 
     * @param string $email Email del cliente
     * @param string $firstName Nombre
     * @param string $lastName Apellido
     * @return array Respuesta de Culqi
     */
    public function createCustomer(string $email, string $firstName, string $lastName): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->secretKey,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl . '/v2/customers', [
                'email' => $email,
                'first_name' => $firstName,
                'last_name' => $lastName,
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

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            } else {
                $error = $response->json();
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
