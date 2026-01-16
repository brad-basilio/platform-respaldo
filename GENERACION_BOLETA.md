# Generación de Boleta de Pago

## Descripción
Este documento describe el flujo de generación de boletas de pago (payment receipts) en el sistema.

## Flujo de Generación

### 1. Triggers de Generación

La boleta se genera automáticamente en dos casos:

#### A. Aprobación de Voucher por Cajero
Cuando el **cajero aprueba un voucher** de pago (Yape, transferencia, depósito).

#### B. Pago Automático con Culqi
Cuando el estudiante paga con **tarjeta de crédito/débito** via Culqi (no requiere verificación manual).

### 2. Ubicación del Código

#### Backend - CashierController.php (Pagos Manuales - Yape/Transferencia)
```php
// Ubicación: app/Http/Controllers/CashierController.php
// Función: verifyVoucher()

// Cuando el cajero aprueba el voucher, se genera la boleta:
try {
    $receiptService = new PaymentReceiptService();
    $receiptPath = $receiptService->generate($voucher);
    
    // Guardar la ruta de la boleta en el voucher
    $voucher->receipt_path = $receiptPath;
    $voucher->save();

    // Enviar correo con la boleta al estudiante (sincrónico para entrega inmediata)
    $studentEmail = $student->user->email;
    if ($studentEmail) {
        Mail::to($studentEmail)->send(new PaymentReceiptMail($voucher, $receiptPath));
    }
} catch (\Exception $e) {
    Log::error("Error generando/enviando boleta: " . $e->getMessage());
}
```

#### Backend - CulqiPaymentController.php (Pagos Automáticos con Tarjeta)
```php
// Ubicación: app/Http/Controllers/Student/CulqiPaymentController.php
// Métodos: processPayment(), processPaymentWith3DS(), processPaymentWithSavedCard(), etc.

// Después de un pago exitoso con Culqi (automático, sin verificación manual):
try {
    $receiptService = new PaymentReceiptService();
    $receiptPath = $receiptService->generate($voucher);
    
    $voucher->receipt_path = $receiptPath;
    $voucher->save();

    // Enviar boleta por email al estudiante (sincrónico para entrega inmediata)
    Mail::to($student->user->email)->send(new PaymentReceiptMail($voucher, $receiptPath));
} catch (\Exception $e) {
    Log::error('Error generando boleta para pago Culqi: ' . $e->getMessage());
}
```

### 3. Servicio de Generación

#### PaymentReceiptService.php
```php
// Ubicación: app/Services/PaymentReceiptService.php

class PaymentReceiptService
{
    public function generate(InstallmentVoucher $voucher): ?string
    {
        // Carga relaciones necesarias
        $voucher->load([
            'installment.enrollment.student.user',
            'installment.enrollment.paymentPlan.academicLevel',
            'reviewedBy'
        ]);
        
        // Usa template de BD (key: payment_receipt_template)
        // Si no existe, usa template por defecto
        // Retorna la ruta del archivo generado
    }
}
```

### 4. Descarga de Boleta

#### Endpoint para descargar
```php
// Ubicación: app/Http/Controllers/CashierController.php
// Función: downloadReceipt()

public function downloadReceipt(Request $request, int $voucherId)
{
    // Validar acceso según rol (admin, cashier, estudiante propio)
    // Si no existe la boleta, intentar generarla
    // Retornar el archivo PDF
}
```

### 5. Componentes Frontend que Muestran la Boleta

| Archivo | Uso |
|---------|-----|
| `resources/js/pages/Student/PaymentControl.tsx` | Botón "Ver Boleta" para estudiantes |
| `resources/js/pages/Student/Billing.tsx` | Sección de facturación del estudiante |
| `resources/js/pages/Cashier/PaymentControl.tsx` | Panel del cajero |
| `resources/js/pages/Admin/PaymentControl.tsx` | Panel de administración |
| `resources/js/pages/Admin/EnrolledStudents.tsx` | Modal de documentos (filtra por `is_payment_receipt`) |

### 6. Plantilla de Boleta

La plantilla HTML de la boleta se configura en:
- **Ubicación**: Admin → Settings → Tab "Comprobantes"
- **Key en BD**: `payment_receipt_template`

#### Variables Disponibles (Completas)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{numero_comprobante}}` | Número de boleta | BOL-202601-000123 |
| `{{numero_boleta}}` | Alias de numero_comprobante | BOL-202601-000123 |
| `{{fecha_emision}}` | Fecha de emisión | 16/01/2026 |
| `{{hora_emision}}` | Hora de emisión | 14:30:25 |
| `{{nombre_estudiante}}` | Nombre completo | Juan Pérez López |
| `{{email_estudiante}}` | Email del estudiante | juan@email.com |
| `{{telefono_estudiante}}` | Teléfono | 987654321 |
| `{{dni_estudiante}}` | DNI del estudiante | 12345678 |
| `{{tipo_documento}}` | Tipo de documento | DNI |
| `{{numero_documento}}` | Número de documento | 12345678 |
| `{{direccion_cliente}}` | Dirección (si existe) | - |
| `{{codigo_matricula}}` | Código de matrícula | MAT-2026-001 |
| `{{concepto}}` | Concepto del pago | Cuota Segunda |
| `{{descripcion_servicio}}` | Descripción para SUNAT | Servicio Educativo - Cuota Segunda - Plan 12 meses |
| `{{numero_cuota}}` | Número de cuota | 2 |
| `{{monto_cuota}}` | Monto base de la cuota | 350.00 |
| `{{mora}}` | Monto de mora si aplica | 15.00 |
| `{{monto_pagado}}` | Monto pagado | 365.00 |
| `{{monto_total}}` | Total pagado | 365.00 |
| `{{monto_palabras}}` | Monto en palabras | TRESCIENTOS SESENTA Y CINCO CON 00/100 SOLES |
| `{{precio_unitario}}` | Precio unitario | 365.00 |
| `{{valor_venta}}` | Valor de venta | 365.00 |
| `{{op_gravada}}` | Operación gravada (sin IGV) | 309.32 |
| `{{igv}}` | IGV (18%) | 55.68 |
| `{{importe_total}}` | Importe total | 365.00 |
| `{{metodo_pago}}` | Método de pago | Tarjeta de Crédito/Débito (Culqi) |
| `{{fecha_pago}}` | Fecha del pago | 16/01/2026 |
| `{{codigo_operacion}}` | Referencia/Código de operación | chr_live_abc123 |
| `{{referencia}}` | Alias de codigo_operacion | chr_live_abc123 |
| `{{cajero}}` | Quién verificó | Pago Automático (Culqi) |
| `{{plan_pago}}` | Nombre del plan | Plan 12 Meses |
| `{{nivel_academico}}` | Nivel académico | Intermedio |
| `{{fecha_autorizacion}}` | Fecha autorización SUNAT | 16/01/2026 |
| `{{hash_comprobante}}` | Hash del comprobante | A1B2C3D4E5F6G7H8I9J0 |

## Modelo de Datos

### InstallmentVoucher
```php
// Campos relevantes
$voucher->receipt_path      // Ruta del PDF generado en storage
$voucher->payment_source    // 'culqi_card' | 'yape' | 'transfer' | null
$voucher->status            // 'pending' | 'approved' | 'rejected'
```

## Diferencias por Tipo de Pago

| Tipo | Flujo | Cajero en Boleta |
|------|-------|-----------------|
| Yape/Transferencia | Estudiante sube voucher → Cajero aprueba → Boleta | Nombre del cajero |
| Culqi (tarjeta) | Estudiante paga → Aprobación automática → Boleta | "Pago Automático (Culqi)" |

## Reutilización

Para usar esta funcionalidad en otra parte del sistema:

```php
use App\Services\PaymentReceiptService;
use App\Mail\PaymentReceiptMail;
use Illuminate\Support\Facades\Mail;

// 1. Instanciar el servicio
$receiptService = new PaymentReceiptService();

// 2. Generar la boleta (requiere un voucher aprobado)
$receiptPath = $receiptService->generate($voucher);

// 3. Guardar la ruta
$voucher->receipt_path = $receiptPath;
$voucher->save();

// 4. Enviar por email (ambos parámetros son requeridos)
// Usar send() para envío inmediato (sincrónico)
Mail::to($email)->send(new PaymentReceiptMail($voucher, $receiptPath));
```

## Rutas Relacionadas

```php
// routes/web.php

// Ruta compartida para descargar boletas
Route::get('/payment-receipt/{voucher}/download', [CashierController::class, 'downloadReceipt'])
    ->name('payment.receipt.download');
```

## Notas Importantes

1. **La boleta se genera cuando el voucher es APROBADO** (status = 'approved')
2. **Pagos Culqi son aprobados automáticamente** y generan boleta instantáneamente
3. **Si falla la generación**, el pago NO falla (se loguea el error)
4. **Los estudiantes solo pueden descargar sus propias boletas**
5. **El email PaymentReceiptMail requiere 2 parámetros**: `$voucher` y `$receiptPath`
6. **El template usa variables con doble llave**: `{{variable}}`
