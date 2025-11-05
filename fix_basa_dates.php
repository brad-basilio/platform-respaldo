<?php

/**
 * Script para cambiar las fechas de Basa Basa Vasa a partir del 29/09/2025
 * Ejecutar con: php fix_basa_dates.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Student;
use App\Models\Enrollment;
use Illuminate\Support\Facades\DB;

echo "🔧 Cambiando fechas de Basa Basa Vasa...\n\n";

DB::beginTransaction();

try {
    // Buscar al estudiante Basa Basa Vasa
    $student = Student::where('first_name', 'Basa')
        ->where('paternal_last_name', 'Basa')
        ->where('maternal_last_name', 'Vasa')
        ->first();
    
    if (!$student) {
        echo "❌ No se encontró al estudiante Basa Basa Vasa\n";
        exit(1);
    }
    
    echo "👤 Estudiante encontrado: {$student->first_name} {$student->paternal_last_name} {$student->maternal_last_name}\n";
    echo "   ID: {$student->id}\n\n";
    
    // Actualizar fecha de pago del estudiante
    $newPaymentDate = '2025-08-29';
    $student->update(['payment_date' => $newPaymentDate]);
    
    echo "📅 Fecha de pago actualizada: {$newPaymentDate}\n\n";
    
    // Obtener su enrollment
    $enrollment = Enrollment::where('student_id', $student->id)
        ->where('status', 'active')
        ->first();
    
    if (!$enrollment) {
        echo "❌ No se encontró enrollment activo\n";
        DB::rollBack();
        exit(1);
    }
    
    echo "📋 Enrollment encontrado: #{$enrollment->id}\n";
    echo "   Plan: {$enrollment->paymentPlan->name}\n\n";
    
    // Actualizar las cuotas
    $installments = $enrollment->installments()->orderBy('installment_number')->get();
    
    echo "🔄 Actualizando cuotas:\n\n";
    
    $baseDate = \Carbon\Carbon::parse($newPaymentDate);
    
    foreach ($installments as $index => $installment) {
        $newDate = $baseDate->copy()->addMonths($index);
        $oldDate = $installment->due_date;
        
        $installment->update([
            'due_date' => $newDate
        ]);
        
        echo "   Cuota #{$installment->installment_number}: {$oldDate} → {$newDate->format('Y-m-d')}\n";
    }
    
    DB::commit();
    
    echo "\n✅ Fechas actualizadas correctamente!\n";
    echo "\nNuevas fechas de vencimiento:\n";
    foreach ($installments->fresh() as $inst) {
        echo "   • Cuota #{$inst->installment_number}: {$inst->due_date}\n";
    }
    
} catch (\Exception $e) {
    DB::rollBack();
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
