# Guía Completa de Integración de Culqi con 3D Secure (3DS)

Esta documentación detalla paso a paso cómo integrar Culqi como procesador de pagos en una aplicación web Laravel + React/Inertia, incluyendo soporte completo para **3D Secure (3DS)** que es obligatorio para las regulaciones bancarias actuales.

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración en el Panel de Culqi](#configuración-en-el-panel-de-culqi)
3. [Instalación de Dependencias](#instalación-de-dependencias)
4. [Configuración del Backend (Laravel)](#configuración-del-backend-laravel)
5. [Configuración del Frontend (React/JavaScript)](#configuración-del-frontend-reactjavascript)
6. [Flujo de Pago Completo](#flujo-de-pago-completo)
7. [Manejo de 3D Secure](#manejo-de-3d-secure)
8. [Webhooks](#webhooks)
9. [Pruebas](#pruebas)
10. [Solución de Problemas](#solución-de-problemas)

---

## Requisitos Previos

- PHP 8.0+
- Laravel 9.x o superior
- Node.js 16+ y npm/yarn
- Cuenta en [Culqi](https://culqi.com) (sandbox para desarrollo, producción para live)
- SSL/HTTPS obligatorio (Culqi no funciona en HTTP)

---

## Configuración en el Panel de Culqi

### 1. Obtener las Claves de API

1. Ingresa a tu [Panel de Culqi](https://integ-panel.culqi.com) (sandbox) o [Panel Producción](https://panel.culqi.com)
2. Ve a **Desarrollo** > **Claves de API**
3. Copia las siguientes claves:
   - **Llave Pública** (`pk_test_...` o `pk_live_...`)
   - **Llave Secreta** (`sk_test_...` o `sk_live_...`)

### 2. Configurar Claves RSA (Opcional pero Recomendado)

Las claves RSA proporcionan una capa adicional de encriptación:

1. Ve a **Desarrollo** > **RSA Keys**
2. Genera un nuevo par de claves RSA (2048 bits obligatorio)
3. Copia:
   - **RSA ID** (formato UUID)
   - **RSA Public Key** (formato PEM)

> ⚠️ **IMPORTANTE**: Las claves RSA de 512 bits NO funcionan. Culqi requiere **2048 bits mínimo**.

### 3. Configurar Webhooks (Para pagos con Yape, Agentes, etc.)

1. Ve a **Desarrollo** > **Webhooks**
2. Configura la URL: `https://tudominio.com/api/culqi/webhook`
3. Selecciona los eventos a escuchar:
   - `order.status.changed`
   - `charge.creation.succeeded`
   - `subscription.charge.succeeded` (si usas suscripciones)

---

## Instalación de Dependencias

### Backend (Laravel)

```bash
composer require culqi/culqi-php
```

### Frontend

Los scripts de Culqi se cargan directamente desde CDN (no requieren npm):

```html
<!-- Culqi Checkout v4 -->
<script src="https://js.culqi.com/checkout-js"></script>

<!-- Culqi 3DS (para autenticación segura) -->
<script src="https://3ds.culqi.com"></script>
```

---

## Configuración del Backend (Laravel)

### 1. Variables de Entorno (.env)

```env
# Claves de Culqi
CULQI_PUBLIC_KEY=pk_test_xxxxxxxxxx
CULQI_PRIVATE_KEY=sk_test_xxxxxxxxxx
CULQI_API=https://api.culqi.com/v2

# RSA (opcional)
CULQI_RSA_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CULQI_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----"
```

### 2. Helper de Configuración (app/Helpers/CulqiConfig.php)

```php
<?php

namespace App\Helpers;

use App\Models\General;

class CulqiConfig
{
    /**
     * Obtiene la llave pública de Culqi
     * Prioriza la configuración en BD sobre .env
     */
    public static function getPublicKey()
    {
        try {
            $general = General::where('correlative', 'checkout_culqi_public_key')->first();
            return $general ? $general->description : env('CULQI_PUBLIC_KEY');
        } catch (\Throwable $th) {
            return env('CULQI_PUBLIC_KEY');
        }
    }

    /**
     * Obtiene la llave secreta de Culqi
     */
    public static function getSecretKey()
    {
        try {
            $general = General::where('correlative', 'checkout_culqi_private_key')->first();
            return $general ? $general->description : env('CULQI_PRIVATE_KEY');
        } catch (\Throwable $th) {
            return env('CULQI_PRIVATE_KEY');
        }
    }

    /**
     * Verifica si Culqi está habilitado
     */
    public static function isEnabled()
    {
        try {
            $general = General::where('correlative', 'checkout_culqi')->first();
            return $general ? filter_var($general->description, FILTER_VALIDATE_BOOLEAN) : false;
        } catch (\Throwable $th) {
            return false;
        }
    }

    /**
     * Obtiene el nombre comercial para mostrar en Culqi
     */
    public static function getName()
    {
        try {
            $general = General::where('correlative', 'checkout_culqi_name')->first();
            return $general ? $general->description : env('APP_NAME', 'Mi Tienda');
        } catch (\Throwable $th) {
            return env('APP_NAME', 'Mi Tienda');
        }
    }

    /**
     * Obtiene la URL base de la API de Culqi
     */
    public static function getApiUrl()
    {
        return env('CULQI_API', 'https://api.culqi.com/v2');
    }

    /**
     * Obtiene el RSA ID para encriptación adicional
     */
    public static function getRsaId()
    {
        try {
            $general = General::where('correlative', 'checkout_culqi_rsa_id')->first();
            return $general ? $general->description : env('CULQI_RSA_ID');
        } catch (\Throwable $th) {
            return env('CULQI_RSA_ID');
        }
    }

    /**
     * Obtiene la clave pública RSA
     */
    public static function getRsaPublicKey()
    {
        try {
            $general = General::where('correlative', 'checkout_culqi_rsa_public_key')->first();
            return $general ? $general->description : env('CULQI_RSA_PUBLIC_KEY');
        } catch (\Throwable $th) {
            return env('CULQI_RSA_PUBLIC_KEY');
        }
    }
}
```

### 3. Controlador Principal (app/Http/Controllers/PaymentController.php)

```php
<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SaleStatus;
use App\Models\Item;
use App\Models\Coupon;
use App\Helpers\CulqiConfig;
use Culqi\Culqi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * Procesa el cargo con tarjeta (pago inicial)
     * Este método crea el cargo en Culqi usando el token generado
     */
    public function charge(Request $request)
    {
        try {
            Log::info('PaymentController - Datos recibidos:', $request->all());

            // Convertir monto a céntimos (Culqi usa céntimos)
            $amountInSoles = round((float)$request->amount, 2);
            $amountInCents = round($amountInSoles * 100);

            // Inicializar Culqi con la llave secreta
            $culqi = new Culqi([
                'api_key' => CulqiConfig::getSecretKey(),
            ]);

            // Preparar datos del cargo
            $chargeData = [
                "amount" => $amountInCents,
                "currency_code" => "PEN", // o "USD" si tu cuenta lo soporta
                "email" => $request->email,
                "source_id" => $request->token // Token generado por Culqi Checkout
            ];
            
            // Agregar antifraud_details con Device Fingerprint (necesario para 3DS)
            if ($request->deviceFingerPrint) {
                $chargeData["antifraud_details"] = [
                    "first_name" => $request->name ?? '',
                    "last_name" => $request->lastname ?? '',
                    "phone_number" => $request->phone ?? '',
                    "device_finger_print_id" => $request->deviceFingerPrint
                ];
            }

            // Crear el cargo
            try {
                $charge = $culqi->Charges->create($chargeData);
                
                Log::info('Respuesta de Culqi:', [
                    'charge_id' => $charge->id ?? 'No ID',
                    'outcome' => $charge->outcome ?? 'No outcome'
                ]);
            } catch (\Exception $culqiException) {
                Log::error('Error en Culqi:', ['error' => $culqiException->getMessage()]);
                return response()->json([
                    'message' => 'Error del procesador de pagos: ' . $culqiException->getMessage(),
                    'status' => false
                ], 400);
            }

            // Validar resultado del cargo
            $outcomeType = $charge->outcome->type ?? '';
            $actionCode = $charge->action_code ?? $charge->outcome->action_code ?? '';
            
            // ⚠️ IMPORTANTE: Detectar si requiere 3DS
            if ($actionCode === 'REVIEW' || $outcomeType === 'review') {
                Log::warning('Pago requiere autenticación 3DS');
                return response()->json([
                    'message' => 'Este pago requiere autenticación adicional',
                    'status' => false,
                    'requires_3ds' => true, // 👈 Flag para el frontend
                    'error' => $charge->outcome->user_message ?? 'Autenticación requerida'
                ], 400);
            }
            
            // Validar cargo exitoso
            if (!isset($charge->id) || $outcomeType !== 'venta_exitosa') {
                return response()->json([
                    'message' => 'Pago fallido',
                    'status' => false,
                    'error' => $charge->outcome->user_message ?? 'Error desconocido'
                ], 400);
            }

            // ✅ PAGO EXITOSO - Crear la venta en BD
            $sale = $this->createSale($request, $charge->id);

            return response()->json([
                'message' => 'Pago exitoso',
                'status' => true,
                'culqi_charge_id' => $charge->id,
                'sale' => $request->cart,
                'code' => $request->orderNumber,
                'sale_id' => $sale->id
            ]);

        } catch (\Exception $e) {
            Log::error('Error completo:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error en el pago: ' . $e->getMessage(),
                'status' => false
            ], 400);
        }
    }

    /**
     * Procesa el cargo CON autenticación 3DS
     * Se llama después de que el usuario completa la verificación 3DS
     */
    public function charge3DS(Request $request)
    {
        try {
            Log::info('charge3DS - Datos recibidos:', $request->all());

            // Validar parámetros 3DS
            if (!$request->authentication_3DS) {
                return response()->json([
                    'message' => 'Parámetros de autenticación 3DS no proporcionados',
                    'status' => false
                ], 400);
            }

            $amountInSoles = round((float)$request->amount, 2);
            $amountInCents = round($amountInSoles * 100);

            $culqi = new Culqi([
                'api_key' => CulqiConfig::getSecretKey(),
            ]);

            // Crear cargo CON parámetros 3DS
            $chargeData = [
                "amount" => $amountInCents,
                "currency_code" => "PEN",
                "email" => $request->email,
                "source_id" => $request->token,
                // 👇 Parámetros 3DS obtenidos de la autenticación
                "authentication_3DS" => [
                    "eci" => $request->authentication_3DS['eci'] ?? '',
                    "xid" => $request->authentication_3DS['xid'] ?? '',
                    "cavv" => $request->authentication_3DS['cavv'] ?? '',
                    "protocolVersion" => $request->authentication_3DS['protocolVersion'] ?? '',
                    "directoryServerTransactionId" => $request->authentication_3DS['directoryServerTransactionId'] ?? ''
                ]
            ];

            // Agregar antifraud_details si existe
            if ($request->deviceFingerPrint) {
                $chargeData["antifraud_details"] = [
                    "first_name" => $request->name ?? '',
                    "last_name" => $request->lastname ?? '',
                    "phone_number" => $request->phone ?? '',
                    "device_finger_print_id" => $request->deviceFingerPrint
                ];
            }

            try {
                $charge = $culqi->Charges->create($chargeData);
                Log::info('Respuesta 3DS de Culqi:', ['charge_id' => $charge->id ?? 'No ID']);
            } catch (\Exception $culqiException) {
                Log::error('Error en Culqi 3DS:', ['error' => $culqiException->getMessage()]);
                return response()->json([
                    'message' => 'Error del procesador: ' . $culqiException->getMessage(),
                    'status' => false
                ], 400);
            }

            // Validar resultado
            $outcomeType = $charge->outcome->type ?? '';
            
            if (!isset($charge->id) || $outcomeType !== 'venta_exitosa') {
                return response()->json([
                    'message' => 'Pago fallido después de 3DS',
                    'status' => false,
                    'error' => $charge->outcome->user_message ?? 'Error desconocido'
                ], 400);
            }

            // ✅ PAGO 3DS EXITOSO
            $sale = $this->createSale($request, $charge->id);

            return response()->json([
                'message' => 'Pago exitoso con autenticación 3DS',
                'status' => true,
                'culqi_charge_id' => $charge->id,
                'sale_id' => $sale->id
            ]);

        } catch (\Exception $e) {
            Log::error('Error en charge3DS:', ['message' => $e->getMessage()]);
            return response()->json([
                'message' => 'Error al procesar el pago 3DS: ' . $e->getMessage(),
                'status' => false
            ], 400);
        }
    }

    /**
     * Procesa un cargo que Culqi completó automáticamente (3DS incluido)
     * Se usa cuando Culqi Checkout v4 devuelve un charge directamente
     */
    public function chargeCompleted(Request $request)
    {
        try {
            Log::info('chargeCompleted - Datos recibidos:', $request->all());

            $chargeData = $request->chargeData;
            $chargeId = $request->chargeId ?? $chargeData['id'] ?? null;

            if (!$chargeId) {
                return response()->json([
                    'message' => 'No se recibió el ID del cargo',
                    'status' => false
                ], 400);
            }

            // Verificar que el cargo fue exitoso
            $outcomeType = $chargeData['outcome']['type'] ?? '';
            if ($outcomeType !== 'venta_exitosa') {
                return response()->json([
                    'message' => 'El cargo no fue exitoso',
                    'status' => false,
                    'error' => $chargeData['outcome']['user_message'] ?? 'Error desconocido'
                ], 400);
            }

            // Crear la venta (el cargo ya existe en Culqi)
            $sale = $this->createSale($request, $chargeId);

            return response()->json([
                'message' => 'Pago exitoso (3DS completado)',
                'status' => true,
                'culqi_charge_id' => $chargeId,
                'sale_id' => $sale->id
            ]);

        } catch (\Exception $e) {
            Log::error('Error en chargeCompleted:', ['message' => $e->getMessage()]);
            return response()->json([
                'message' => 'Error al registrar el pago: ' . $e->getMessage(),
                'status' => false
            ], 400);
        }
    }

    /**
     * Método auxiliar para crear la venta en BD
     */
    private function createSale(Request $request, string $chargeId): Sale
    {
        $saleStatus = SaleStatus::getByName('Pagado');

        $sale = Sale::create([
            'code' => $request->orderNumber,
            'user_id' => $request->user_id,
            'name' => $request->name,
            'lastname' => $request->lastname,
            'email' => $request->email,
            'phone' => $request->phone,
            'address' => $request->address,
            'amount' => $request->amount,
            'delivery' => $request->delivery ?? 0,
            'culqi_charge_id' => $chargeId,
            'payment_status' => 'pagado',
            'status_id' => $saleStatus?->id,
            // ... otros campos
        ]);

        // Crear detalles de la venta
        foreach ($request->cart as $item) {
            $itemData = is_array($item) ? $item : (array) $item;
            
            SaleDetail::create([
                'sale_id' => $sale->id,
                'item_id' => $itemData['id'],
                'name' => $itemData['name'],
                'price' => $itemData['final_price'] ?? $itemData['price'],
                'quantity' => $itemData['quantity'],
            ]);

            // Actualizar stock
            Item::where('id', $itemData['id'])->decrement('stock', $itemData['quantity']);
        }

        return $sale;
    }
}
```

### 4. Controlador para Órdenes (app/Http/Controllers/CulqiController.php)

Este controlador maneja la creación de órdenes para habilitar métodos alternativos (Yape, PagoEfectivo, etc.):

```php
<?php

namespace App\Http\Controllers;

use App\Helpers\CulqiConfig;
use App\Models\General;
use Culqi\Culqi;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use SoDe\Extend\Response;
use SoDe\Extend\Math;

class CulqiController extends Controller
{
    private $culqi = null;
    private $url = null;

    public function __construct()
    {
        $secretKey = CulqiConfig::getSecretKey();
        $this->culqi = new Culqi(['api_key' => $secretKey]);
        $this->url = CulqiConfig::getApiUrl();
    }

    /**
     * Crea una orden de Culqi para habilitar métodos de pago adicionales
     * (Yape, bancaMovil, agente, billetera)
     */
    public function createCheckoutOrder(Request $request)
    {
        $response = Response::simpleTryCatch(function () use ($request) {
            $data = $request->all();
            
            if (!isset($data['amount']) || !isset($data['email'])) {
                throw new Exception('Faltan datos requeridos: amount, email');
            }
            
            $amount = floatval($data['amount']);
            $currency = 'PEN';
            $orderNumber = 'CHK-' . time() . '-' . Str::random(6);
            
            $config = [
                "amount" => Math::ceil(($amount * 100)), // Céntimos
                "currency_code" => $currency,
                "description" => "Compra en " . env('APP_NAME'),
                "order_number" => $orderNumber,
                "client_details" => [
                    "first_name" => $data['name'] ?? 'Cliente',
                    "last_name" => $data['lastname'] ?? '',
                    "email" => $data['email'],
                    "phone_number" => $data['phone'] ?? '',
                ],
                "expiration_date" => time() + (30 * 60), // 30 minutos
                "confirm" => false
            ];

            Log::info('Culqi createCheckoutOrder config:', $config);

            try {
                $order = $this->culqi->Orders->create($config);
            } catch (\Exception $culqiEx) {
                Log::error('Culqi createCheckoutOrder error:', ['message' => $culqiEx->getMessage()]);
                throw new Exception('Error de Culqi: ' . $culqiEx->getMessage());
            }

            // Manejar respuesta de error
            if (gettype($order) == 'string') {
                $errorData = @json_decode((string) $order, true);
                if ($errorData && isset($errorData['user_message'])) {
                    throw new Exception($errorData['user_message']);
                }
                throw new Exception('Error al crear orden: ' . substr((string) $order, 0, 200));
            }
            
            if (!$order || !isset($order->id)) {
                throw new Exception('Respuesta inválida de Culqi');
            }

            Log::info('Culqi order created:', ['order_id' => $order->id]);

            return [
                'order_id' => $order->id,
                'order_number' => $orderNumber,
                'amount' => $amount,
                'currency' => $currency,
            ];
        });

        return response($response->toArray(), $response->status);
    }

    /**
     * Webhook para procesar notificaciones de Culqi
     */
    public function webhook(Request $request)
    {
        $response = Response::simpleTryCatch(function () use ($request) {
            Log::info('Culqi webhook received:', $request->all());
            
            $data = json_decode($request->data, true);
            
            switch ($request->type) {
                case 'order.status.changed':
                    return $this->processOrderStatusChange($data);
                case 'charge.creation.succeeded':
                    return $this->processChargeSuccess($data);
                default:
                    Log::info('Webhook type not handled:', ['type' => $request->type]);
                    return ['status' => 'ignored'];
            }
        });

        return response($response->toArray(), $response->status);
    }

    private function processOrderStatusChange(array $data)
    {
        // Procesar cambio de estado de orden (Yape, PagoEfectivo, etc.)
        Log::info('Processing order status change:', $data);
        
        if ($data['state'] === 'paid') {
            // La orden fue pagada, actualizar la venta
            // ... tu lógica aquí
        }
        
        return ['status' => 'processed'];
    }

    private function processChargeSuccess(array $data)
    {
        // Cargo exitoso
        Log::info('Processing charge success:', $data);
        return ['status' => 'processed'];
    }
}
```

### 5. Rutas API (routes/api.php)

```php
<?php

use App\Http\Controllers\PaymentController;
use App\Http\Controllers\CulqiController;
use Illuminate\Support\Facades\Route;

// Rutas de pago con Culqi
Route::post('/pago', [PaymentController::class, 'charge']);
Route::post('/pago/3ds', [PaymentController::class, 'charge3DS']);
Route::post('/pago/charge-completed', [PaymentController::class, 'chargeCompleted']);
Route::get('/pago/{sale_id}', [PaymentController::class, 'getPaymentStatus']);

// Orden de Culqi (para habilitar Yape, etc.)
Route::post('/culqi/checkout-order', [CulqiController::class, 'createCheckoutOrder']);

// Webhook de Culqi
Route::post('/culqi/webhook', [CulqiController::class, 'webhook']);
```

---

## Configuración del Frontend (React/JavaScript)

### 1. Archivo de Configuración Global (resources/js/Utils/Global.js)

```javascript
class Global {
    static APP_URL = null;
    static APP_NAME = null;
    static APP_COLOR_PRIMARY = null;
    
    // Configuración de Culqi
    static CULQI_PUBLIC_KEY = null;
    static CULQI_ENABLED = null;
    static CULQI_NAME = null;
    static CULQI_RSA_ID = null;
    static CULQI_RSA_PUBLIC_KEY = null;
    static CULQI_SUPPORTS_USD = false;

    static set = (name, value) => {
        Global[name] = value;
    };

    static get = (name) => {
        return Global[name];
    };
}

export default Global;
```

### 2. Cargar Scripts en la Vista Blade (resources/views/public.blade.php)

```blade
<!DOCTYPE html>
<html lang="es">
<head>
    <!-- ... head content ... -->
</head>
<body>
    @inertia

    <!-- ✅ Culqi Custom Checkout v4 -->
    <script src="https://js.culqi.com/checkout-js"></script>
    
    <!-- ✅ Culqi 3DS para autenticación segura -->
    <script src="https://3ds.culqi.com" defer></script>

    <!-- Inicializar variables globales de Culqi -->
    <script>
        window.CULQI_PUBLIC_KEY = "{{ $generals->where('correlative', 'checkout_culqi_public_key')->first()?->description ?? '' }}";
        window.CULQI_ENABLED = {{ ($generals->where('correlative', 'checkout_culqi')->first()?->description === 'true') ? 'true' : 'false' }};
        window.CULQI_RSA_ID = "{{ $generals->where('correlative', 'checkout_culqi_rsa_id')->first()?->description ?? '' }}";
    </script>
    
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
</body>
</html>
```

### 3. Módulo de Pago Culqi (resources/js/Actions/culqiPayment.js)

```javascript
import { Fetch } from "sode-extend-react"; // O tu librería de fetch preferida
import Global from "../Utils/Global";
import { toast } from "sonner"; // O tu librería de notificaciones

/**
 * ============================================================================
 * CULQI 3DS - Módulo de autenticación 3D Secure
 * ============================================================================
 * Documentación oficial: https://docs.culqi.com/es/documentacion/culqi-3ds
 */
const Culqi3DSModule = {
    initialized: false,
    deviceFingerPrint: null,
    
    /**
     * Verifica si Culqi3DS está disponible
     */
    isAvailable() {
        return typeof window.Culqi3DS !== 'undefined';
    },
    
    /**
     * Inicializa Culqi3DS con la configuración necesaria
     */
    async init(config) {
        if (!this.isAvailable()) {
            console.warn("⚠️ Culqi3DS no está cargado");
            return false;
        }
        
        try {
            // Configurar llave pública
            window.Culqi3DS.publicKey = Global.CULQI_PUBLIC_KEY;
            
            // Configurar settings para el cargo
            window.Culqi3DS.settings = {
                charge: {
                    totalAmount: config.amount, // En céntimos
                    returnUrl: window.location.href,
                    currency: config.currency || 'PEN'
                },
                card: {
                    email: config.email
                }
            };
            
            // Opciones de personalización
            window.Culqi3DS.options = {
                showModal: true,
                showLoading: true,
                showIcon: true,
                closeModalAction: () => {
                    console.log("🔐 Modal 3DS cerrado");
                },
                style: {
                    btnColor: Global.APP_COLOR_PRIMARY || "#000000",
                    btnTextColor: "#FFFFFF"
                }
            };
            
            this.initialized = true;
            console.log("✅ Culqi3DS inicializado correctamente");
            return true;
        } catch (error) {
            console.error("❌ Error al inicializar Culqi3DS:", error);
            return false;
        }
    },
    
    /**
     * Genera el Device Fingerprint ID (necesario para antifraude)
     */
    async generateDeviceFingerPrint() {
        if (!this.isAvailable()) {
            console.warn("⚠️ Culqi3DS no disponible");
            return null;
        }
        
        try {
            this.deviceFingerPrint = await window.Culqi3DS.generateDevice();
            console.log("🔐 Device Fingerprint generado:", this.deviceFingerPrint);
            return this.deviceFingerPrint;
        } catch (error) {
            console.error("❌ Error al generar device fingerprint:", error);
            return null;
        }
    },
    
    /**
     * Inicia la autenticación 3DS
     * @param {string} tokenId - ID del token de Culqi
     * @returns {Promise<Object>} - Parámetros 3DS
     */
    initAuthentication(tokenId) {
        return new Promise((resolve, reject) => {
            if (!this.isAvailable()) {
                reject(new Error("Culqi3DS no está disponible"));
                return;
            }
            
            console.log("🔐 Iniciando autenticación 3DS para token:", tokenId);
            
            const handleMessage = (event) => {
                const response = event.data;
                
                if (!response || typeof response !== 'object') return;
                
                // Autenticación exitosa
                if (response.parameters3DS) {
                    console.log("✅ Autenticación 3DS exitosa:", response.parameters3DS);
                    window.removeEventListener("message", handleMessage);
                    resolve({
                        success: true,
                        parameters3DS: response.parameters3DS
                    });
                }
                
                // Error en autenticación
                if (response.error) {
                    console.error("❌ Error en 3DS:", response.error);
                    window.removeEventListener("message", handleMessage);
                    reject(new Error(response.error));
                }
            };
            
            window.addEventListener("message", handleMessage, false);
            
            try {
                window.Culqi3DS.initAuthentication(tokenId);
            } catch (error) {
                window.removeEventListener("message", handleMessage);
                reject(error);
            }
        });
    },
    
    /**
     * Resetea Culqi3DS para una nueva transacción
     */
    reset() {
        if (this.isAvailable() && typeof window.Culqi3DS.reset === 'function') {
            window.Culqi3DS.reset();
            this.deviceFingerPrint = null;
            this.initialized = false;
        }
    }
};

/**
 * API para crear órdenes en Culqi (necesario para Yape, etc.)
 */
const CulqiOrderAPI = {
    async createCheckoutOrder(data) {
        try {
            console.log("🔄 Creando orden de checkout en Culqi...", data);
            
            const { status, result } = await Fetch('/api/culqi/checkout-order', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (!status) {
                throw new Error(result?.message || 'Error al crear orden');
            }
            
            console.log("✅ Orden creada:", result);
            return result;
        } catch (error) {
            console.error("❌ Error al crear orden:", error);
            throw error;
        }
    }
};

/**
 * Genera un número de orden único
 */
function generateOrderNumber() {
    let orderNumber = "";
    for (let i = 0; i < 12; i++) {
        orderNumber += Math.floor(Math.random() * 10);
    }
    return orderNumber;
}

/**
 * Variable global para la instancia de CulqiCheckout
 */
let culqiInstance = null;

/**
 * ============================================================================
 * FUNCIÓN PRINCIPAL: Procesa el pago con Culqi Custom Checkout v4
 * ============================================================================
 * @param {Object} request - Datos del pedido
 * @param {Object} options - Opciones adicionales (orderId, etc.)
 * @returns {Promise} - Promesa con el resultado del pago
 */
export const processCulqiPayment = async (request, options = {}) => {
    // Si no hay orderId, intentar crear orden para habilitar Yape, etc.
    if (!options.orderId && !options.skipOrderCreation) {
        try {
            console.log("🔄 Creando orden de Culqi...");
            
            const orderResult = await CulqiOrderAPI.createCheckoutOrder({
                amount: request.amount,
                email: request.email,
                name: request.name,
                lastname: request.lastname,
                phone: request.phone
            });
            
            const orderData = orderResult?.data || orderResult;
            const orderId = orderData?.order_id;
            
            if (orderId) {
                console.log("✅ Orden creada:", orderId);
                options.orderId = orderId;
            }
        } catch (orderError) {
            console.warn("⚠️ Continuando solo con tarjeta:", orderError.message);
        }
    }

    return new Promise((resolve, reject) => {
        try {
            console.log("🔄 Iniciando Culqi Custom Checkout...");
            
            const { orderId } = options;
            const hasOrder = !!orderId;
            
            // Verificar configuración
            if (!Global.CULQI_ENABLED) {
                reject("Culqi está deshabilitado");
                return;
            }
            
            if (typeof window.CulqiCheckout === 'undefined') {
                console.error("❌ CulqiCheckout no está cargado");
                reject("Error: Script de Culqi no cargado");
                return;
            }
            
            if (!Global.CULQI_PUBLIC_KEY) {
                reject("Error: Clave pública de Culqi no configurada");
                return;
            }
            
            const orderNumber = generateOrderNumber();
            const currency = 'PEN';
            const amountInUnits = parseFloat(request.amount.toFixed(2));
            const amountInCents = Math.round(amountInUnits * 100);
            
            // Validar monto mínimo (S/ 3.00)
            if (amountInCents < 300) {
                reject("El monto mínimo para pago con tarjeta es S/ 3.00");
                return;
            }
            
            console.log("💰 Configuración:");
            console.log("   - Monto:", amountInUnits, currency);
            console.log("   - Monto en céntimos:", amountInCents);
            console.log("   - Email:", request.email);
            console.log("   - Tiene Order:", hasOrder);

            // ✅ Configuración del checkout
            const settings = {
                title: Global.CULQI_NAME || Global.APP_NAME || 'Pago',
                currency: currency,
                amount: amountInCents,
            };
            
            // Agregar Order ID si existe (habilita Yape, etc.)
            if (hasOrder) {
                settings.order = orderId;
                console.log("📦 Order ID agregado:", orderId);
            }

            // Cliente
            const client = {
                email: request.email || '',
            };

            // Métodos de pago
            const paymentMethods = hasOrder ? {
                tarjeta: true,
                yape: true,
                bancaMovil: true,
                agente: true,
                billetera: true,
                cuotealo: false,
            } : {
                tarjeta: true,
                yape: false,
                bancaMovil: false,
                agente: false,
                billetera: false,
                cuotealo: false,
            };

            // Opciones
            const checkoutOptions = {
                lang: 'auto',
                installments: false,
                modal: true,
                paymentMethods: paymentMethods,
                paymentMethodsSort: hasOrder 
                    ? ['tarjeta', 'yape', 'bancaMovil', 'billetera', 'agente'] 
                    : ['tarjeta'],
            };

            // Apariencia
            const appearance = {
                theme: 'default',
                hiddenCulqiLogo: false,
                hiddenBannerContent: false,
                menuType: 'sidebar',
                buttonCardPayText: 'Pagar',
                logo: Global.APP_URL + `/assets/resources/icon.png`,
                defaultStyle: {
                    bannerColor: Global.APP_COLOR_PRIMARY || '#000000',
                    buttonBackground: Global.APP_COLOR_PRIMARY || '#000000',
                    menuColor: Global.APP_COLOR_PRIMARY || '#000000',
                    linksColor: Global.APP_COLOR_PRIMARY || '#000000',
                    buttonTextColor: '#FFFFFF',
                    priceColor: Global.APP_COLOR_PRIMARY || '#000000',
                },
            };

            const config = {
                settings,
                client,
                options: checkoutOptions,
                appearance,
            };

            console.log("📋 Config:", config);

            // ✅ Crear instancia de CulqiCheckout
            try {
                culqiInstance = new window.CulqiCheckout(Global.CULQI_PUBLIC_KEY, config);
                console.log("✅ CulqiCheckout creado");
            } catch (error) {
                console.error("❌ Error al crear CulqiCheckout:", error);
                reject("Error en integración: " + error.message);
                return;
            }

            // ✅ Configurar callback
            culqiInstance.culqi = async function() {
                try {
                    console.log("📥 Callback de Culqi ejecutado");
                    console.log("   - token:", culqiInstance.token);
                    console.log("   - charge:", culqiInstance.charge);
                    console.log("   - error:", culqiInstance.error);
                    
                    // Error
                    if (culqiInstance.error) {
                        const errorMessage = culqiInstance.error.user_message || 
                                            culqiInstance.error.merchant_message || 
                                            "Error al procesar el pago";
                        
                        toast.error("Error en el pago", { description: errorMessage });
                        reject(errorMessage);
                        return;
                    }

                    // ✅ Cargo completado directamente (3DS manejado por Culqi)
                    if (culqiInstance.charge) {
                        const chargeData = culqiInstance.charge;
                        console.log("✅ Cargo completado por Culqi:", chargeData);
                        
                        const paymentRequest = { 
                            ...request, 
                            chargeId: chargeData.id,
                            orderNumber,
                            chargeData: chargeData,
                        };

                        const { status, result } = await Fetch("./api/pago/charge-completed", {
                            method: "POST",
                            body: JSON.stringify(paymentRequest),
                        });

                        try { culqiInstance.close(); } catch (e) {}

                        if (!status) {
                            reject(result?.message || "Error al registrar el pago");
                            return;
                        }

                        toast.success("¡Pago exitoso!");
                        resolve(result);
                        return;
                    }

                    // ✅ Token generado (pago con tarjeta)
                    if (culqiInstance.token) {
                        const token = culqiInstance.token.id;
                        const tokenData = culqiInstance.token;
                        console.log("✅ Token generado:", token);

                        // Generar Device Fingerprint para 3DS
                        let deviceFingerPrint = null;
                        if (Culqi3DSModule.isAvailable()) {
                            await Culqi3DSModule.init({
                                amount: amountInCents,
                                currency: currency,
                                email: request.email
                            });
                            deviceFingerPrint = await Culqi3DSModule.generateDeviceFingerPrint();
                        }

                        // Enviar al backend
                        const paymentRequest = { 
                            ...request, 
                            token, 
                            orderNumber,
                            tokenData,
                            deviceFingerPrint
                        };

                        let { status, result } = await Fetch("./api/pago", {
                            method: "POST",
                            body: JSON.stringify(paymentRequest),
                        });

                        // ============================================================
                        // 🔐 FLUJO 3DS: Si el backend indica que requiere 3DS
                        // ============================================================
                        if (!status && result?.requires_3ds) {
                            console.log("🔐 El pago requiere autenticación 3DS");
                            
                            // Cerrar modal de Culqi para mostrar el de 3DS
                            try { culqiInstance.close(); } catch (e) {}
                            
                            if (!Culqi3DSModule.isAvailable()) {
                                toast.error("Error", { description: "Servicio 3DS no disponible" });
                                reject("Servicio 3DS no disponible");
                                return;
                            }
                            
                            try {
                                toast.info("Autenticación requerida", {
                                    description: "Completa la verificación de seguridad de tu banco"
                                });
                                
                                // Pequeño delay para cerrar el modal
                                await new Promise(r => setTimeout(r, 300));
                                
                                // Iniciar autenticación 3DS
                                const auth3DSResult = await Culqi3DSModule.initAuthentication(token);
                                
                                if (auth3DSResult.success && auth3DSResult.parameters3DS) {
                                    console.log("✅ 3DS completado:", auth3DSResult.parameters3DS);
                                    
                                    // Enviar cargo CON parámetros 3DS
                                    const response3DS = await Fetch("./api/pago/3ds", {
                                        method: "POST",
                                        body: JSON.stringify({
                                            ...paymentRequest,
                                            authentication_3DS: auth3DSResult.parameters3DS
                                        }),
                                    });
                                    
                                    status = response3DS.status;
                                    result = response3DS.result;
                                    
                                    Culqi3DSModule.reset();
                                }
                            } catch (error3DS) {
                                console.error("❌ Error en 3DS:", error3DS);
                                Culqi3DSModule.reset();
                                toast.error("Error en autenticación", { description: error3DS.message });
                                reject(error3DS.message);
                                return;
                            }
                        }

                        // Manejar resultado final
                        if (!status) {
                            toast.error("Error en el pago", { description: result?.message });
                            reject(result?.message || "Error en el pago");
                            return;
                        }

                        try { culqiInstance.close(); } catch (e) {}
                        toast.success("¡Pago exitoso!");
                        resolve(result);
                        return;
                    }

                    // ✅ Orden creada (Yape, agentes, etc.)
                    if (culqiInstance.order) {
                        console.log("✅ Orden creada:", culqiInstance.order);
                        
                        const { status, result } = await Fetch("./api/pago/order", {
                            method: "POST",
                            body: JSON.stringify({
                                ...request,
                                orderId: culqiInstance.order.id,
                                orderNumber,
                            }),
                        });

                        try { culqiInstance.close(); } catch (e) {}

                        if (status) {
                            toast.success("¡Orden registrada!");
                            resolve(result);
                        } else {
                            reject(result?.message || "Error al procesar la orden");
                        }
                        return;
                    }

                    console.warn("⚠️ Callback sin token, orden ni error");
                    reject("No se recibió respuesta del procesador");

                } catch (error) {
                    console.error("❌ Error en callback:", error);
                    toast.error("Error en el Pago", { description: error.message });
                    reject(error.message);
                }
            };

            // ✅ Abrir el checkout
            console.log("🚀 Abriendo Culqi Checkout...");
            culqiInstance.open();

        } catch (error) {
            console.error("❌ Error general:", error);
            toast.error("Error en integración", { description: error.message });
            reject("Error: " + error.message);
        }
    });
};

/**
 * Cierra el modal de Culqi
 */
export const closeCulqiModal = () => {
    if (culqiInstance) {
        try {
            culqiInstance.close();
        } catch (error) {
            console.warn("Error al cerrar modal:", error);
        }
    }
};

/**
 * Verifica si Culqi está disponible
 */
export const checkCulqiAvailability = () => {
    return {
        sdkLoaded: typeof window.CulqiCheckout !== 'undefined',
        enabled: Global.CULQI_ENABLED,
        publicKeyConfigured: !!Global.CULQI_PUBLIC_KEY,
        ready: typeof window.CulqiCheckout !== 'undefined' && 
               Global.CULQI_ENABLED && 
               !!Global.CULQI_PUBLIC_KEY
    };
};
```

### 4. Uso en Componente React

```jsx
import { processCulqiPayment } from "../../Actions/culqiPayment";
import Global from "../../Utils/Global";

const CheckoutComponent = ({ cart, user }) => {
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        if (!Global.CULQI_ENABLED) {
            toast.error("Método de pago no disponible");
            return;
        }

        setLoading(true);

        try {
            const request = {
                user_id: user?.id,
                name: user?.name,
                lastname: user?.lastname,
                email: user?.email,
                phone: user?.phone,
                address: user?.address,
                amount: calculateTotal(cart), // Tu función para calcular el total
                cart: cart,
                // ... otros datos
            };

            const result = await processCulqiPayment(request);
            
            console.log("✅ Pago exitoso:", result);
            // Redirigir a página de éxito o actualizar UI
            
        } catch (error) {
            console.error("❌ Error en pago:", error);
            // El error ya fue mostrado por toast en culqiPayment.js
        } finally {
            setLoading(false);
        }
    };

    return (
        <button 
            onClick={handlePayment}
            disabled={loading || !Global.CULQI_ENABLED}
            className="btn-primary"
        >
            {loading ? "Procesando..." : "Pagar con Culqi"}
        </button>
    );
};
```

---

## Flujo de Pago Completo

### Diagrama de Secuencia

```
┌──────────┐     ┌─────────────┐     ┌────────────┐     ┌───────────┐
│  Usuario │     │   Frontend  │     │   Backend  │     │   Culqi   │
└────┬─────┘     └──────┬──────┘     └─────┬──────┘     └─────┬─────┘
     │                  │                   │                  │
     │ 1. Click "Pagar" │                   │                  │
     │─────────────────>│                   │                  │
     │                  │                   │                  │
     │                  │ 2. Crear Orden    │                  │
     │                  │   (opcional)      │                  │
     │                  │──────────────────>│                  │
     │                  │                   │ 3. API Orders    │
     │                  │                   │─────────────────>│
     │                  │                   │<─────────────────│
     │                  │<──────────────────│  Order ID        │
     │                  │                   │                  │
     │                  │ 4. Abrir Checkout │                  │
     │                  │   (con Order ID)  │                  │
     │                  │──────────────────────────────────────>
     │                  │                   │                  │
     │ 5. Ingresa datos │                   │                  │
     │   de tarjeta     │                   │                  │
     │─────────────────────────────────────────────────────────>
     │                  │                   │                  │
     │                  │                   │   6. Token       │
     │                  │<──────────────────────────────────────
     │                  │                   │                  │
     │                  │ 7. Enviar token   │                  │
     │                  │──────────────────>│                  │
     │                  │                   │ 8. Create Charge │
     │                  │                   │─────────────────>│
     │                  │                   │                  │
     │                  │                   │  ┌────────────┐  │
     │                  │                   │  │ ¿Requiere  │  │
     │                  │                   │  │    3DS?    │  │
     │                  │                   │  └─────┬──────┘  │
     │                  │                   │        │         │
     │                  │                   │   SÍ   │   NO    │
     │                  │                   │<───────┴────────>│
     │                  │                   │                  │
     │  [SI 3DS]        │ 9. requires_3ds   │                  │
     │                  │<──────────────────│                  │
     │                  │                   │                  │
     │                  │ 10. Abrir modal   │                  │
     │                  │     3DS           │                  │
     │                  │──────────────────────────────────────>
     │                  │                   │                  │
     │ 11. Verificación │                   │                  │
     │     del banco    │                   │                  │
     │<─────────────────────────────────────────────────────────
     │─────────────────────────────────────────────────────────>
     │                  │                   │                  │
     │                  │ 12. parameters3DS │                  │
     │                  │<──────────────────────────────────────
     │                  │                   │                  │
     │                  │ 13. Cargo con 3DS │                  │
     │                  │──────────────────>│                  │
     │                  │                   │ 14. Charge + 3DS │
     │                  │                   │─────────────────>│
     │                  │                   │<─────────────────│
     │                  │<──────────────────│  Cargo exitoso   │
     │                  │                   │                  │
     │  15. Pago OK     │                   │                  │
     │<─────────────────│                   │                  │
     │                  │                   │                  │
```

---

## Manejo de 3D Secure

### ¿Qué es 3D Secure?

3D Secure (3DS) es un protocolo de autenticación que agrega una capa adicional de seguridad para pagos con tarjeta en línea. Cuando se activa:

1. El usuario ingresa sus datos de tarjeta
2. El banco emisor verifica la identidad del tarjetahabiente
3. Se muestra un modal de verificación (OTP, app del banco, etc.)
4. Una vez verificado, se completa el pago

### Casos en que se activa 3DS

- Transacciones de alto valor
- Primera compra del cliente
- Tarjetas de ciertos bancos/países
- Configuración del comercio (puede ser obligatorio)

### Flujo de código para 3DS

```javascript
// 1. Enviar cargo inicial
const response = await fetch("/api/pago", {
    method: "POST",
    body: JSON.stringify({ token, amount, email, deviceFingerPrint })
});

const result = await response.json();

// 2. Detectar si requiere 3DS
if (!result.status && result.requires_3ds) {
    console.log("🔐 Se requiere autenticación 3DS");
    
    // 3. Inicializar Culqi3DS
    window.Culqi3DS.publicKey = CULQI_PUBLIC_KEY;
    window.Culqi3DS.settings = {
        charge: {
            totalAmount: amountInCents,
            returnUrl: window.location.href,
            currency: 'PEN'
        },
        card: { email }
    };
    
    // 4. Escuchar respuesta 3DS
    window.addEventListener("message", async (event) => {
        if (event.data.parameters3DS) {
            // 5. Enviar cargo con parámetros 3DS
            const response3DS = await fetch("/api/pago/3ds", {
                method: "POST",
                body: JSON.stringify({
                    token,
                    amount,
                    email,
                    authentication_3DS: event.data.parameters3DS
                })
            });
            
            // 6. Procesar resultado final
            const result3DS = await response3DS.json();
            if (result3DS.status) {
                console.log("✅ Pago exitoso con 3DS");
            }
        }
    });
    
    // 7. Iniciar autenticación
    window.Culqi3DS.initAuthentication(tokenId);
}
```

---

## Webhooks

Culqi envía notificaciones a tu servidor cuando ocurren eventos importantes. Esto es especialmente útil para:

- Pagos con Yape (el usuario paga desde su app)
- PagoEfectivo (el usuario paga en agente)
- Confirmación de cargos

### Configurar webhook en routes/api.php

```php
Route::post('/culqi/webhook', [CulqiController::class, 'webhook']);
```

### Manejar eventos en el controlador

```php
public function webhook(Request $request)
{
    Log::info('Webhook Culqi:', $request->all());
    
    // Verificar autenticidad del webhook (opcional pero recomendado)
    // Culqi no envía firma, pero puedes verificar contra tu API
    
    $eventType = $request->type;
    $data = json_decode($request->data, true);
    
    switch ($eventType) {
        case 'order.status.changed':
            if ($data['state'] === 'paid') {
                // La orden fue pagada (Yape, agente, etc.)
                $this->handleOrderPaid($data);
            } elseif ($data['state'] === 'expired') {
                // La orden expiró
                $this->handleOrderExpired($data);
            }
            break;
            
        case 'charge.creation.succeeded':
            // Cargo exitoso
            $this->handleChargeSuccess($data);
            break;
            
        case 'subscription.charge.succeeded':
            // Cargo de suscripción exitoso
            $this->handleSubscriptionCharge($data);
            break;
    }
    
    return response()->json(['status' => 'ok']);
}
```

---

## Pruebas

### Tarjetas de Prueba (Sandbox)

| Tarjeta | Número | CVV | Fecha | Resultado |
|---------|--------|-----|-------|-----------|
| Visa | 4111 1111 1111 1111 | 123 | Cualquier fecha futura | Éxito |
| Visa | 4000 0200 0000 0000 | 123 | Cualquier fecha futura | Requiere 3DS |
| Mastercard | 5111 1111 1111 1118 | 123 | Cualquier fecha futura | Éxito |
| Visa | 4000 0000 0000 0002 | 123 | Cualquier fecha futura | Rechazada |

### Probar el flujo completo

1. **Configurar ambiente de pruebas**:
   - Usa claves `pk_test_...` y `sk_test_...`
   - Asegúrate de tener HTTPS (puedes usar ngrok para desarrollo local)

2. **Realizar pago de prueba**:
   ```javascript
   // En la consola del navegador
   const result = await processCulqiPayment({
       amount: 10.00,
       email: "test@example.com",
       name: "Test",
       lastname: "User",
       phone: "999999999",
       cart: [{ id: 1, name: "Producto", price: 10.00, quantity: 1 }]
   });
   ```

3. **Verificar en panel de Culqi**:
   - Ve a Transacciones > Cargos
   - Deberías ver el cargo de prueba

---

## Solución de Problemas

### Error: "Ocurrieron problemas al desencriptar"

**Causa**: Claves RSA inválidas o de tamaño incorrecto.

**Solución**:
1. Ve al panel de Culqi > Desarrollo > RSA Keys
2. Genera nuevas claves de 2048 bits
3. Copia el RSA ID y RSA Public Key
4. Actualiza en tu BD/configuración

### Error: "CulqiCheckout is not defined"

**Causa**: El script de Culqi no se cargó correctamente.

**Solución**:
1. Verifica que el script esté en tu HTML:
   ```html
   <script src="https://js.culqi.com/checkout-js"></script>
   ```
2. Asegúrate de que se cargue ANTES de tu código JavaScript

### Error: "Token inválido" o "Source inválido"

**Causa**: El token expiró o es incorrecto.

**Solución**:
- Los tokens de Culqi expiran en minutos
- Asegúrate de usar el token inmediatamente después de generarlo
- Verifica que estés usando `request.token`, no el objeto completo

### Error: "Monto inválido"

**Causa**: El monto debe estar en céntimos y ser un entero.

**Solución**:
```php
// ✅ Correcto
$amountInCents = round($amountInSoles * 100);

// ❌ Incorrecto
$amountInCents = $amountInSoles * 100; // Puede ser decimal
```

### 3DS no se muestra

**Causa**: El script de 3DS no está cargado o la configuración es incorrecta.

**Solución**:
1. Verifica que el script esté cargado:
   ```html
   <script src="https://3ds.culqi.com" defer></script>
   ```
2. Verifica que `Culqi3DS.publicKey` esté configurado
3. Revisa los logs de consola para errores

### Webhook no recibe eventos

**Causa**: URL incorrecta o servidor no accesible.

**Solución**:
1. Verifica que la URL del webhook sea accesible desde internet
2. Revisa los logs del servidor
3. En el panel de Culqi, ve a Webhooks y verifica el historial de intentos

---

## Configuraciones en Base de Datos

Para mayor flexibilidad, las credenciales de Culqi se almacenan en la tabla `generals`:

| correlative | description | Descripción |
|-------------|-------------|-------------|
| checkout_culqi | true/false | Habilitar/deshabilitar Culqi |
| checkout_culqi_name | Mi Tienda | Nombre mostrado en checkout |
| checkout_culqi_public_key | pk_xxx... | Llave pública |
| checkout_culqi_private_key | sk_xxx... | Llave secreta |
| checkout_culqi_rsa_id | uuid | ID de clave RSA |
| checkout_culqi_rsa_public_key | -----BEGIN PUBLIC KEY----- | Clave pública RSA |
| checkout_culqi_commission | 3.5 | Comisión % (opcional) |
| checkout_culqi_supports_usd | true/false | Si soporta USD |

---

## Referencias

- [Documentación oficial de Culqi](https://docs.culqi.com/)
- [Culqi Checkout v4](https://docs.culqi.com/es/documentacion/culqi-checkout/)
- [Culqi 3DS](https://docs.culqi.com/es/documentacion/culqi-3ds/)
- [API de Culqi](https://apidocs.culqi.com/)
- [SDK PHP de Culqi](https://github.com/culqi/culqi-php)

---

## Autor

Documentación generada para el proyecto MBLens.
Última actualización: Enero 2026

---

## Changelog

### v1.0.0
- Integración inicial de Culqi Custom Checkout v4
- Soporte completo para 3D Secure (3DS)
- Soporte para métodos alternativos (Yape, PagoEfectivo) mediante Orders
- Webhooks para notificaciones de pago
- Configuración dinámica desde base de datos
