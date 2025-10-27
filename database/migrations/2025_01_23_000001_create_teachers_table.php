<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teachers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // Datos Personales Extendidos
            $table->string('first_name')->nullable();
            $table->string('paternal_last_name')->nullable();
            $table->string('maternal_last_name')->nullable();
            $table->string('phone_number')->nullable();
            $table->enum('gender', ['M', 'F', 'Masculino', 'Femenino'])->nullable();
            $table->integer('age')->nullable();
            $table->date('birth_date')->nullable();
            $table->enum('document_type', ['DNI', 'CE'])->default('DNI');
            $table->string('document_number')->unique()->nullable();
            $table->string('education_level')->nullable();
            
            // Datos Laborales
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->enum('specialization', ['theoretical', 'practical', 'both'])->default('theoretical');
            $table->date('start_date')->nullable();
            $table->string('bank_account')->nullable();
            $table->string('bank')->nullable();
            $table->string('work_modality')->nullable();
            $table->string('language_level')->nullable();
            $table->enum('contract_status', ['contratado', 'en_proceso', 'finalizado'])->default('contratado');
            $table->string('contract_period')->nullable();
            $table->string('contract_modality')->nullable();
            
            // Datos de Contacto
            $table->text('current_address')->nullable();
            $table->string('emergency_contact_number')->nullable();
            $table->string('emergency_contact_relationship')->nullable();
            $table->string('emergency_contact_name')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teachers');
    }
};
