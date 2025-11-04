<?php

require_once 'vendor/autoload.php';

use App\Models\Student;
use Illuminate\Support\Facades\Storage;

// Configurar Laravel
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "🧪 Testing voucher transfer for student 7...\n\n";

try {
    $student = Student::find(7);
    
    if (!$student) {
        echo "❌ Student 7 not found\n";
        exit(1);
    }
    
    echo "📋 Student info:\n";
    echo "   ID: {$student->id}\n";
    echo "   Name: {$student->name}\n";
    echo "   Status: {$student->prospect_status}\n";
    echo "   Voucher file: {$student->payment_voucher_file_name}\n\n";
    
    // Verificar si existe el archivo original
    $originalPath = "payment_vouchers/{$student->payment_voucher_file_name}";
    echo "🔍 Checking original voucher file...\n";
    echo "   Path: {$originalPath}\n";
    echo "   Exists: " . (Storage::disk('public')->exists($originalPath) ? "✅ YES" : "❌ NO") . "\n\n";
    
    if (Storage::disk('public')->exists($originalPath)) {
        // Crear estructura de prueba
        $studentDir = "enrollment/{$student->id}";
        $newFileName = 'test_transfer_' . time() . '.' . pathinfo($student->payment_voucher_file_name, PATHINFO_EXTENSION);
        $newPath = "{$studentDir}/{$newFileName}";
        
        echo "📁 Creating student directory...\n";
        if (!Storage::disk('public')->exists($studentDir)) {
            Storage::disk('public')->makeDirectory($studentDir);
            echo "   Created: {$studentDir}\n";
        } else {
            echo "   Already exists: {$studentDir}\n";
        }
        
        echo "📋 Copying file...\n";
        echo "   From: {$originalPath}\n";
        echo "   To: {$newPath}\n";
        
        if (Storage::disk('public')->copy($originalPath, $newPath)) {
            echo "✅ File copied successfully!\n";
            echo "   File exists: " . (Storage::disk('public')->exists($newPath) ? "YES" : "NO") . "\n";
            echo "   Public URL: " . Storage::url($newPath) . "\n\n";
            
            // Verificar acceso HTTP
            echo "🌐 Testing HTTP access...\n";
            $publicUrl = 'http://localhost:8000' . Storage::url($newPath);
            echo "   URL: {$publicUrl}\n";
            
        } else {
            echo "❌ Failed to copy file\n";
        }
    } else {
        echo "❌ Original voucher file not found. Available files:\n";
        $files = Storage::disk('public')->files('payment_vouchers');
        foreach ($files as $file) {
            echo "   - {$file}\n";
        }
    }
    
} catch (Exception $e) {
    echo "💥 Error: {$e->getMessage()}\n";
    echo "Stack trace:\n{$e->getTraceAsString()}\n";
}