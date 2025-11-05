<?php

/**
 * Script para corregir las fechas de vencimiento de las cuotas
 * Ejecutar con: php fix_installment_dates.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Enrollment;
use App\Models\Installment;
use Illuminate\Support\Facades\DB;

echo "🔧 Iniciando corrección de fechas de cuotas...\n\n";

DB::beginTransaction();

try {
    // Obtener todos los enrollments activos
    $enrollments = Enrollment::with(['student', 'paymentPlan', 'installments'])
        ->where('status', 'active')
        ->get();
    
    echo "📊 Enrollments encontrados: " . $enrollments->count() . "\n\n";
    
    $updated = 0;
    $skipped = 0;
    
    foreach ($enrollments as $enrollment) {
        $student = $enrollment->student;
        $plan = $enrollment->paymentPlan;
        
        if (!$student || !$plan) {
            echo "⚠️  Enrollment #{$enrollment->id}: Sin estudiante o plan\n";
            $skipped++;
            continue;
        }
        
        // Usar la fecha de pago del estudiante como base
        $paymentDate = $student->payment_date 
            ? \Carbon\Carbon::parse($student->payment_date) 
            : \Carbon\Carbon::parse($enrollment->enrollment_date);
        
        echo "👤 {$student->first_name} {$student->paternal_last_name} {$student->maternal_last_name}\n";
        echo "   Fecha base: {$paymentDate->format('Y-m-d')}\n";
        echo "   Plan: {$plan->name} ({$plan->installments_count} cuotas)\n";
        
        // Obtener cuotas existentes ordenadas
        $installments = $enrollment->installments()->orderBy('installment_number')->get();
        
        if ($installments->isEmpty()) {
            echo "   ⚠️  Sin cuotas generadas, creando nuevas...\n";
            $enrollment->generateInstallments();
            $updated++;
            continue;
        }
        
        // Verificar si las fechas están correctas
        $needsUpdate = false;
        foreach ($installments as $index => $installment) {
            $expectedDate = $paymentDate->copy()->addMonths($index);
            $currentDate = \Carbon\Carbon::parse($installment->due_date);
            
            if (!$currentDate->isSameDay($expectedDate)) {
                $needsUpdate = true;
                break;
            }
        }
        
        if (!$needsUpdate) {
            echo "   ✅ Fechas correctas, no requiere actualización\n\n";
            $skipped++;
            continue;
        }
        
        echo "   🔄 Actualizando fechas de cuotas...\n";
        
        // Actualizar cada cuota con la fecha correcta
        foreach ($installments as $index => $installment) {
            $oldDate = $installment->due_date;
            $newDate = $paymentDate->copy()->addMonths($index);
            
            $installment->update([
                'due_date' => $newDate
            ]);
            
            echo "      Cuota #{$installment->installment_number}: {$oldDate} → {$newDate->format('Y-m-d')}\n";
        }
        
        echo "   ✅ Actualizado correctamente\n\n";
        $updated++;
    }
    
    DB::commit();
    
    echo "\n" . str_repeat("=", 60) . "\n";
    echo "✅ CORRECCIÓN COMPLETADA\n";
    echo "   • Enrollments actualizados: {$updated}\n";
    echo "   • Enrollments sin cambios: {$skipped}\n";
    echo "   • Total procesados: " . ($updated + $skipped) . "\n";
    echo str_repeat("=", 60) . "\n";
    
} catch (\Exception $e) {
    DB::rollBack();
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
