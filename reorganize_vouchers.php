<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use App\Models\InstallmentVoucher;

// Configurar Laravel
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "🚀 Iniciando reorganización de vouchers por estudiante...\n\n";

try {
    // Obtener todos los vouchers que necesitan reorganización
    $vouchers = InstallmentVoucher::with(['installment.enrollment.student'])
        ->whereNotNull('voucher_path')
        ->whereHas('installment.enrollment.student') // Solo vouchers con relaciones válidas
        ->get();

    $reorganized = 0;
    $errors = 0;

    foreach ($vouchers as $voucher) {
        try {
            $student = $voucher->installment->enrollment->student;
            $oldPath = $voucher->voucher_path;
            
            // Saltar si ya está en la nueva estructura
            if (str_starts_with($oldPath, 'enrollment/')) {
                echo "✅ Voucher {$voucher->id} already in new structure\n";
                continue;
            }

            // Determinar el archivo original
            $originalFile = null;
            if (str_starts_with($oldPath, 'payment_vouchers/') || str_starts_with($oldPath, 'installment_vouchers/')) {
                $originalFile = $oldPath;
            } else {
                // Buscar en payment_vouchers primero
                $testPath = "payment_vouchers/{$oldPath}";
                if (Storage::disk('public')->exists($testPath)) {
                    $originalFile = $testPath;
                } else {
                    // Buscar en installment_vouchers
                    $testPath = "installment_vouchers/{$oldPath}";
                    if (Storage::disk('public')->exists($testPath)) {
                        $originalFile = $testPath;
                    }
                }
            }

            if (!$originalFile || !Storage::disk('public')->exists($originalFile)) {
                echo "❌ File not found for voucher {$voucher->id}: {$oldPath}\n";
                $errors++;
                continue;
            }

            // Crear nueva ruta
            $fileExtension = pathinfo($originalFile, PATHINFO_EXTENSION);
            $newFileName = 'installment_' . $voucher->installment->installment_number . '_' . time() . '.' . $fileExtension;
            $newPath = "enrollment/{$student->id}/{$newFileName}";

            // Crear directorio si no existe
            $studentDir = "enrollment/{$student->id}";
            if (!Storage::disk('public')->exists($studentDir)) {
                Storage::disk('public')->makeDirectory($studentDir);
            }

            // Copiar archivo a nueva ubicación
            if (Storage::disk('public')->copy($originalFile, $newPath)) {
                // Actualizar base de datos
                $voucher->update(['voucher_path' => $newPath]);
                
                echo "✅ Reorganized voucher {$voucher->id} for student {$student->id}\n";
                echo "   Old: {$originalFile}\n";
                echo "   New: {$newPath}\n\n";
                
                $reorganized++;
                
                // Opcional: eliminar archivo original si está en installment_vouchers
                if (str_starts_with($originalFile, 'installment_vouchers/')) {
                    Storage::disk('public')->delete($originalFile);
                    echo "   🗑️ Deleted old file: {$originalFile}\n\n";
                }
            } else {
                echo "❌ Failed to copy voucher {$voucher->id}\n";
                $errors++;
            }

        } catch (Exception $e) {
            echo "❌ Error processing voucher {$voucher->id}: {$e->getMessage()}\n";
            $errors++;
        }
    }

    echo "\n🎉 Reorganización completada!\n";
    echo "📊 Vouchers reorganizados: {$reorganized}\n";
    echo "❌ Errores: {$errors}\n";

} catch (Exception $e) {
    echo "💥 Error fatal: {$e->getMessage()}\n";
    exit(1);
}