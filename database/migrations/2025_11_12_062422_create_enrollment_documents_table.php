<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('enrollment_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade'); // Quien sube (verifier/admin)
            
            // Información del documento
            $table->string('document_type'); // 'contract', 'regulation', 'terms', 'other'
            $table->string('document_name'); // Nombre descriptivo del documento
            $table->string('file_path'); // Ruta del archivo original subido por verifier
            $table->string('file_name'); // Nombre del archivo original
            $table->text('description')->nullable(); // Descripción/instrucciones
            
            // Estado de confirmación del estudiante
            $table->boolean('requires_signature')->default(true); // Si requiere firma del estudiante
            $table->boolean('student_confirmed')->default(false); // Si el estudiante confirmó/firmó
            $table->timestamp('confirmed_at')->nullable(); // Cuándo confirmó
            
            // Archivo firmado por el estudiante (si aplica)
            $table->string('signed_file_path')->nullable(); // Documento firmado subido por estudiante
            $table->string('signed_file_name')->nullable();
            
            $table->timestamps();
            
            // Índices
            $table->index('student_id');
            $table->index('student_confirmed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollment_documents');
    }
};
