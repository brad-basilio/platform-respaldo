<?php
/**
 * Script para enviar por correo las boletas que ya fueron generadas
 * pero no se enviaron (segunda boleta de pagos distribuidos)
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\InstallmentVoucher;
use App\Mail\PaymentReceiptMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

echo "=== Enviando boletas pendientes ===\n\n";

// Buscar vouchers recientes con boleta generada pero que probablemente no se envió
// (los que no son el primero de un grupo de pago distribuido)
$recentVouchers = InstallmentVoucher::with(['installment.enrollment.student.user', 'installment'])
    ->where('status', 'approved')
    ->whereNotNull('receipt_path')
    ->where('created_at', '>=', now()->subDays(1))
    ->orderBy('id', 'desc')
    ->get();

echo "Vouchers con boleta encontrados: " . $recentVouchers->count() . "\n\n";

$enviados = 0;

foreach ($recentVouchers as $voucher) {
    $student = $voucher->installment->enrollment->student;
    $email = $student->user->email ?? null;
    
    if (!$email) {
        echo "❌ Voucher ID: {$voucher->id} - Sin email de estudiante\n";
        continue;
    }
    
    $cuotaNum = $voucher->installment->installment_number;
    $monto = number_format($voucher->declared_amount, 2);
    
    echo "📧 Voucher ID: {$voucher->id} - Cuota #{$cuotaNum} - S/{$monto}\n";
    echo "   Email: {$email}\n";
    
    // Verificar que el archivo de boleta existe
    if (!Storage::disk('public')->exists($voucher->receipt_path)) {
        echo "   ⚠️ Archivo de boleta no existe: {$voucher->receipt_path}\n";
        continue;
    }
    
    try {
        // Enviar el correo
        Mail::to($email)->queue(new PaymentReceiptMail($voucher, $voucher->receipt_path));
        echo "   ✅ Correo encolado\n";
        $enviados++;
    } catch (\Exception $e) {
        echo "   ❌ Error: " . $e->getMessage() . "\n";
    }
    
    echo "\n";
}

echo "=== Total correos encolados: {$enviados} ===\n";
echo "\nEjecuta 'php artisan queue:work --once' para procesar cada correo.\n";
