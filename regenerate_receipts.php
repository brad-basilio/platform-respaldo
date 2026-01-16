<?php
/**
 * Script para regenerar boletas de vouchers recientes con la nueva lógica de concepto
 * 
 * Uso: php regenerate_receipts.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\InstallmentVoucher;
use App\Services\PaymentReceiptService;
use Illuminate\Support\Facades\Log;

echo "=== Regeneración de Boletas ===\n\n";

// Obtener vouchers aprobados de hoy o ayer que tienen boleta generada
$vouchersRecientes = InstallmentVoucher::with([
        'installment.enrollment.student.user',
        'installment.enrollment.paymentPlan.academicLevel',
        'reviewedBy'
    ])
    ->where('status', 'approved')
    ->whereNotNull('receipt_path')
    ->where('reviewed_at', '>=', now()->subDays(2))
    ->orderBy('reviewed_at', 'desc')
    ->get();

echo "Vouchers encontrados: " . $vouchersRecientes->count() . "\n\n";

if ($vouchersRecientes->isEmpty()) {
    echo "No hay vouchers recientes para regenerar.\n";
    exit(0);
}

$receiptService = new PaymentReceiptService();
$regenerados = 0;

foreach ($vouchersRecientes as $voucher) {
    $installment = $voucher->installment;
    
    echo "Voucher ID: {$voucher->id}\n";
    echo "  Cuota #{$installment->installment_number}\n";
    echo "  Monto: S/ " . number_format($voucher->declared_amount, 2) . "\n";
    echo "  Boleta actual: {$voucher->receipt_path}\n";
    
    try {
        // Regenerar la boleta
        $newReceiptPath = $receiptService->generate($voucher);
        
        if ($newReceiptPath) {
            $voucher->receipt_path = $newReceiptPath;
            $voucher->save();
            
            echo "  ✅ Nueva boleta: {$newReceiptPath}\n\n";
            $regenerados++;
        } else {
            echo "  ⚠️ No se pudo regenerar\n\n";
        }
    } catch (\Exception $e) {
        echo "  ❌ Error: " . $e->getMessage() . "\n\n";
    }
}

echo "\n=== Total regeneradas: {$regenerados} boletas ===\n";
