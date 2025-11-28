<?php

/**
 * Script para verificar y corregir fechas de pago en installments verificados
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Installment;
use Illuminate\Support\Facades\DB;

echo "🔍 Buscando installments verificados sin fecha de pago...\n\n";

$installments = Installment::where('status', 'verified')
    ->whereNull('paid_date')
    ->get();

echo "✅ Encontrados: " . $installments->count() . " installments\n\n";

if ($installments->count() > 0) {
    foreach ($installments as $installment) {
        echo "Installment ID: {$installment->id}\n";
        echo "  - Enrollment ID: {$installment->enrollment_id}\n";
        echo "  - Cuota #: {$installment->installment_number}\n";
        echo "  - Monto pagado: S/ {$installment->paid_amount}\n";
        echo "  - Verificado el: " . ($installment->verified_at ? $installment->verified_at->format('d/m/Y H:i') : 'N/A') . "\n";
        
        // Usar la fecha de verificación como fecha de pago si existe
        if ($installment->verified_at) {
            $installment->paid_date = $installment->verified_at->format('Y-m-d');
            $installment->save();
            echo "  ✅ Actualizado: paid_date = {$installment->paid_date->format('d/m/Y')}\n";
        }
        
        echo "\n";
    }
    
    echo "✨ Corrección completada!\n";
} else {
    echo "✅ Todos los installments verificados tienen fecha de pago.\n";
}

echo "\n📊 Resumen de installments por estado:\n";
$summary = Installment::select('status', DB::raw('count(*) as total'))
    ->groupBy('status')
    ->get();

foreach ($summary as $item) {
    echo "  - {$item->status}: {$item->total}\n";
}

echo "\n✅ Proceso completado!\n";
