<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Student;

$email = 'basiliohinostroza2003bradneve@gmail.com';

$student = Student::whereHas('user', function($q) use ($email) {
    $q->where('email', $email);
})->with(['enrollments.installments', 'enrollments.paymentPlan'])->first();

if (!$student) {
    echo "❌ Student not found\n";
    exit(1);
}

$enrollment = $student->enrollments->first();

echo "✅ Student: {$student->first_name} {$student->last_name}\n";
echo "   Plan: {$enrollment->paymentPlan->name}\n";
echo "   Total Plan: S/ {$enrollment->paymentPlan->total_amount}\n";
echo "   Total Paid: S/ {$enrollment->total_paid}\n";
echo "   Total Pending: S/ {$enrollment->total_pending}\n\n";

echo "📋 VALIDACIÓN DE MONTOS:\n";
echo str_repeat("=", 60) . "\n";

$testCases = [
    ['amount' => 100, 'should_pass' => true],
    ['amount' => 460, 'should_pass' => true],
    ['amount' => 500, 'should_pass' => false],
    ['amount' => 1000, 'should_pass' => false],
    ['amount' => 0, 'should_pass' => false],
    ['amount' => -50, 'should_pass' => false],
];

foreach ($testCases as $test) {
    $amount = $test['amount'];
    $shouldPass = $test['should_pass'];
    
    $isValid = $amount > 0 && $amount <= $enrollment->total_pending;
    $result = $isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO';
    $expected = $shouldPass ? '✅ DEBE PASAR' : '❌ DEBE FALLAR';
    
    $status = ($isValid === $shouldPass) ? '✔️  CORRECTO' : '❗ ERROR';
    
    echo "\n";
    echo "Monto: S/ {$amount}\n";
    echo "   Resultado: {$result}\n";
    echo "   Esperado: {$expected}\n";
    echo "   Estado: {$status}\n";
    
    if ($amount > $enrollment->total_pending) {
        echo "   Razón: Excede el pendiente (S/ {$enrollment->total_pending})\n";
    } elseif ($amount <= 0) {
        echo "   Razón: Monto debe ser mayor a 0\n";
    }
}

echo "\n" . str_repeat("=", 60) . "\n";
echo "✅ Validación completada\n";
