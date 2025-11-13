<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Student;

$email = 'basiliohinostroza2003bradneve@gmail.com';

$student = Student::whereHas('user', function($q) use ($email) {
    $q->where('email', $email);
})->with(['enrollments.installments.vouchers', 'enrollments.paymentPlan'])->first();

if (!$student) {
    echo "❌ Student not found\n";
    exit(1);
}

echo "✅ Student Found: {$student->first_name} {$student->last_name}\n";
echo "   Student ID: {$student->id}\n\n";

$enrollment = $student->enrollments->first();

if (!$enrollment) {
    echo "❌ No enrollment found\n";
    exit(1);
}

echo "📋 ENROLLMENT INFO:\n";
echo "   Enrollment ID: {$enrollment->id}\n";
echo "   Plan: {$enrollment->paymentPlan->name}\n";
echo "   Total Plan: S/ {$enrollment->paymentPlan->total_amount}\n";
echo "   Total Paid (calculated): S/ {$enrollment->total_paid}\n";
echo "   Total Pending (calculated): S/ {$enrollment->total_pending}\n";
echo "   Progress: {$enrollment->payment_progress}%\n\n";

echo "💰 INSTALLMENTS BREAKDOWN:\n";
echo str_repeat("=", 80) . "\n";

$totalPaidManual = 0;
$totalPendingManual = 0;

foreach ($enrollment->installments->sortBy('installment_number') as $inst) {
    echo "\n📌 Cuota #{$inst->installment_number}\n";
    echo "   Due Date: {$inst->due_date->format('Y-m-d')}\n";
    echo "   Amount: S/ {$inst->amount}\n";
    echo "   Late Fee: S/ {$inst->late_fee}\n";
    echo "   Total Due: S/ {$inst->total_due}\n";
    echo "   Paid Amount: S/ {$inst->paid_amount}\n";
    echo "   Remaining Amount: S/ " . ($inst->remaining_amount ?? 0) . "\n";
    echo "   Status: {$inst->status}\n";
    echo "   Payment Type: " . ($inst->payment_type ?? 'N/A') . "\n";
    
    // Calcular totales manuales
    if (in_array($inst->status, ['paid', 'verified'])) {
        $totalPaidManual += $inst->paid_amount;
    }
    
    if ($inst->status === 'paid' && $inst->remaining_amount > 0) {
        $totalPendingManual += $inst->remaining_amount;
    } elseif ($inst->status === 'pending') {
        $totalPendingManual += $inst->total_due;
    }
    
    if ($inst->vouchers->count() > 0) {
        echo "   Vouchers:\n";
        foreach ($inst->vouchers as $v) {
            echo "      - S/ {$v->declared_amount} ({$v->status})";
            if ($v->payment_type) {
                echo " [type: {$v->payment_type}]";
            }
            echo "\n";
        }
    }
    echo "   ---\n";
}

echo "\n" . str_repeat("=", 80) . "\n";
echo "📊 SUMMARY:\n";
echo "   Total Paid (manual calculation): S/ {$totalPaidManual}\n";
echo "   Total Pending (manual calculation): S/ {$totalPendingManual}\n";
echo "   Total (manual): S/ " . ($totalPaidManual + $totalPendingManual) . "\n";
echo "   Total Plan Amount: S/ {$enrollment->paymentPlan->total_amount}\n";
echo "\n";
echo "   Model total_paid: S/ {$enrollment->total_paid}\n";
echo "   Model total_pending: S/ {$enrollment->total_pending}\n";
echo "\n";

if (abs($totalPaidManual - $enrollment->total_paid) > 0.01) {
    echo "⚠️  WARNING: Discrepancy in total_paid!\n";
    echo "   Difference: S/ " . abs($totalPaidManual - $enrollment->total_paid) . "\n";
}

if (abs($totalPendingManual - $enrollment->total_pending) > 0.01) {
    echo "⚠️  WARNING: Discrepancy in total_pending!\n";
    echo "   Difference: S/ " . abs($totalPendingManual - $enrollment->total_pending) . "\n";
}
