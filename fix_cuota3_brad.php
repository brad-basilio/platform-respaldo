<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Installment;
use App\Models\InstallmentVoucher;

$email = 'basiliohinostroza2003bradneve@gmail.com';

// Buscar la cuota #3 del estudiante
$installment = Installment::where('installment_number', 3)
    ->whereHas('enrollment.student.user', function($q) use ($email) {
        $q->where('email', $email);
    })
    ->with('vouchers')
    ->first();

if (!$installment) {
    echo "❌ Cuota no encontrada\n";
    exit(1);
}

echo "📌 CUOTA #3 - Estado Actual:\n";
echo str_repeat("=", 70) . "\n";
echo "   Installment ID: {$installment->id}\n";
echo "   Amount: S/ {$installment->amount}\n";
echo "   Late Fee: S/ {$installment->late_fee}\n";
echo "   Total Due: S/ {$installment->total_due}\n";
echo "   Paid Amount: S/ {$installment->paid_amount}\n";
echo "   Remaining: S/ " . ($installment->remaining_amount ?? 'NULL') . "\n";
echo "   Status: {$installment->status}\n";
echo "   Payment Type: " . ($installment->payment_type ?? 'NULL') . "\n\n";

echo "📋 VOUCHERS:\n";
echo str_repeat("-", 70) . "\n";

$totalApproved = 0;
foreach ($installment->vouchers as $voucher) {
    echo "   Voucher ID: {$voucher->id}\n";
    echo "      Amount: S/ {$voucher->declared_amount}\n";
    echo "      Status: {$voucher->status}\n";
    echo "      Payment Type: " . ($voucher->payment_type ?? 'NULL') . "\n";
    
    if ($voucher->status === 'approved') {
        $totalApproved += $voucher->declared_amount;
    }
    echo "\n";
}

echo str_repeat("=", 70) . "\n";
echo "💰 CÁLCULO:\n";
echo "   Total Due: S/ {$installment->total_due}\n";
echo "   Total Approved Vouchers: S/ {$totalApproved}\n";
echo "   Remaining: S/ " . ($installment->total_due - $totalApproved) . "\n\n";

// Verificar si debe estar verificada
if ($totalApproved >= $installment->total_due) {
    echo "✅ La cuota DEBE estar VERIFIED (total pagado >= total debido)\n\n";
    
    if ($installment->status !== 'verified') {
        echo "🔧 CORRIGIENDO...\n";
        
        $installment->update([
            'status' => 'verified',
            'payment_type' => 'full',
            'paid_amount' => $totalApproved,
            'remaining_amount' => 0,
        ]);
        
        echo "✅ Cuota actualizada correctamente\n\n";
        
        $installment->refresh();
        
        echo "📌 Estado Actualizado:\n";
        echo "   Status: {$installment->status}\n";
        echo "   Payment Type: {$installment->payment_type}\n";
        echo "   Paid Amount: S/ {$installment->paid_amount}\n";
        echo "   Remaining: S/ {$installment->remaining_amount}\n";
    } else {
        echo "✅ La cuota ya está correctamente marcada como VERIFIED\n";
    }
} else {
    echo "⚠️  La cuota debe permanecer como PAID (parcial)\n";
    echo "   Falta por pagar: S/ " . ($installment->total_due - $totalApproved) . "\n";
}
