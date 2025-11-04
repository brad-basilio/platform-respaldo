<?php

require_once 'vendor/autoload.php';

// Configurar Laravel
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== VOUCHERS EN BASE DE DATOS ===\n\n";

$vouchers = DB::table('installment_vouchers')
    ->select('id', 'installment_id', 'voucher_path', 'status')
    ->get();

foreach ($vouchers as $voucher) {
    echo "ID: {$voucher->id} | Installment: {$voucher->installment_id} | Path: {$voucher->voucher_path} | Status: {$voucher->status}\n";
}

echo "\n=== INSTALLMENTS CON ENROLLMENT ===\n\n";

$installments = DB::table('installments')
    ->join('enrollments', 'installments.enrollment_id', '=', 'enrollments.id')
    ->select('installments.id', 'installments.enrollment_id', 'enrollments.student_id')
    ->get();

foreach ($installments as $inst) {
    echo "Installment ID: {$inst->id} | Enrollment: {$inst->enrollment_id} | Student: {$inst->student_id}\n";
}