<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Installment;

$installment = Installment::where('installment_number', 2)
    ->whereHas('enrollment', function($q) {
        $q->where('id', 15);
    })
    ->first();

if (!$installment) {
    echo "Installment not found\n";
    exit(1);
}

echo "📌 ANTES:\n";
echo "   Paid Amount: S/ {$installment->paid_amount}\n";
echo "   Remaining Amount: S/ " . ($installment->remaining_amount ?? 'NULL') . "\n";
echo "   Status: {$installment->status}\n";
echo "   Payment Type: " . ($installment->payment_type ?? 'NULL') . "\n\n";

// Calcular el total correcto
$totalApproved = $installment->vouchers()->where('status', 'approved')->sum('declared_amount');
$totalDue = $installment->amount + $installment->late_fee;
$remaining = $totalDue - $totalApproved;

echo "📊 CÁLCULO CORRECTO:\n";
echo "   Total Due: S/ {$totalDue}\n";
echo "   Total Approved Vouchers: S/ {$totalApproved}\n";
echo "   Remaining: S/ {$remaining}\n\n";

// Actualizar
if ($totalApproved >= $totalDue) {
    $installment->update([
        'status' => 'verified',
        'payment_type' => 'full',
        'paid_amount' => $totalApproved,
        'remaining_amount' => 0,
    ]);
    echo "✅ Cuota actualizada a VERIFIED\n";
} else {
    $installment->update([
        'status' => 'paid',
        'payment_type' => ($installment->vouchers()->where('status', 'approved')->count() > 1) ? 'combined' : 'partial',
        'paid_amount' => $totalApproved,
        'remaining_amount' => $remaining,
    ]);
    echo "✅ Cuota actualizada a PAID (parcial)\n";
}

$installment->refresh();

echo "\n📌 DESPUÉS:\n";
echo "   Paid Amount: S/ {$installment->paid_amount}\n";
echo "   Remaining Amount: S/ {$installment->remaining_amount}\n";
echo "   Status: {$installment->status}\n";
echo "   Payment Type: {$installment->payment_type}\n";
