<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // Datos Personales Extendidos
            $table->string('first_name')->nullable();
            $table->string('paternal_last_name')->nullable();
            $table->string('maternal_last_name')->nullable();
            $table->string('phone_number')->nullable();
            $table->string('gender')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('document_type')->default('dni');
            $table->string('document_number')->unique()->nullable();
            $table->string('education_level')->nullable();
            
            // Estado y Tipo
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->enum('class_type', ['theoretical', 'practical'])->default('theoretical');
            $table->enum('level', ['basic', 'intermediate', 'advanced'])->default('basic');
            
            // Datos Académicos
            $table->date('payment_date')->nullable();
            $table->date('enrollment_date')->nullable();
            $table->date('registration_date')->nullable();
            $table->string('enrollment_code')->unique()->nullable();
            $table->string('contracted_plan')->nullable();
            $table->string('contract_url')->nullable();
            $table->string('contract_file_name')->nullable();
            $table->boolean('payment_verified')->default(false);
            
            // Examen de Categorización
            $table->boolean('has_placement_test')->default(false);
            $table->date('test_date')->nullable();
            $table->decimal('test_score', 4, 2)->nullable();
            
            // Datos del Apoderado/Titular
            $table->string('guardian_name')->nullable();
            $table->string('guardian_document_number')->nullable();
            $table->string('guardian_email')->nullable();
            $table->date('guardian_birth_date')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->text('guardian_address')->nullable();
            
            // Gamificación
            $table->integer('points')->default(0);
            
            // Estado del Prospecto
            $table->enum('prospect_status', ['registrado', 'propuesta_enviada', 'verificacion_pago', 'matriculado'])->default('registrado');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
