<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Installment;

$installment = Installment::where('installment_number', 2)
    ->whereHas('enrollment', function($q) {
        $q->where('id', 15);
    })
    ->with('vouchers')
    ->first();

if (!$installment) {
    echo "Installment not found\n";
    exit(1);
}

echo "📌 Cuota #2 (ID: {$installment->id})\n";
echo "   Amount: S/ {$installment->amount}\n";
echo "   Late Fee: S/ {$installment->late_fee}\n";
echo "   Total Due: S/ {$installment->total_due}\n";
echo "   Paid Amount: S/ {$installment->paid_amount}\n";
echo "   Remaining Amount: S/ " . ($installment->remaining_amount ?? 'NULL') . "\n";
echo "   Status: {$installment->status}\n";
echo "   Payment Type: " . ($installment->payment_type ?? 'NULL') . "\n\n";

echo "Vouchers:\n";
$totalVouchers = 0;
foreach ($installment->vouchers as $v) {
    echo "   Voucher ID: {$v->id}\n";
    echo "      Declared Amount: S/ {$v->declared_amount}\n";
    echo "      Status: {$v->status}\n";
    echo "      Payment Type: " . ($v->payment_type ?? 'NULL') . "\n";
    echo "      Applied to Total: " . ($v->applied_to_total ? 'YES' : 'NO') . "\n";
    if ($v->status === 'approved') {
        $totalVouchers += $v->declared_amount;
    }
    echo "\n";
}

echo "Total de vouchers aprobados: S/ {$totalVouchers}\n";
echo "Debería ser paid_amount: S/ {$totalVouchers}\n";
echo "Remaining debería ser: S/ " . ($installment->total_due - $totalVouchers) . "\n";
