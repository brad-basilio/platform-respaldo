<?php

require_once 'vendor/autoload.php';

// Configurar Laravel
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\InstallmentVoucher;

echo "Actualizando voucher inválido...\n";

$voucher = InstallmentVoucher::find(5);
if ($voucher) {
    $voucher->voucher_path = 'enrollment/6/installment_1_test.jpg';
    $voucher->save();
    echo "✅ Voucher {$voucher->id} actualizado: {$voucher->voucher_path}\n";
} else {
    echo "❌ Voucher no encontrado\n";
}