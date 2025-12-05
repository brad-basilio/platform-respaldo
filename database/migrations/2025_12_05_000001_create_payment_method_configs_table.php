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
        Schema::create('payment_method_configs', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['yape', 'transfer']); // Tipo de método de pago
            $table->string('name'); // Nombre descriptivo (ej: "Yape Principal", "BCP - Juan Pérez")
            $table->text('description')->nullable(); // Descripción adicional
            $table->boolean('is_active')->default(true); // Si está activo para mostrar a estudiantes
            $table->integer('display_order')->default(0); // Orden de visualización
            
            // Campos para YAPE
            $table->string('phone_number')->nullable(); // Número de Yape
            $table->string('qr_image_path')->nullable(); // Ruta de la imagen del QR de Yape
            
            // Campos para TRANSFERENCIA BANCARIA
            $table->string('bank_name')->nullable(); // Nombre del banco (BCP, Interbank, etc.)
            $table->string('bank_logo_path')->nullable(); // Ruta del logo del banco
            $table->string('account_holder')->nullable(); // Titular de la cuenta
            $table->string('account_number')->nullable(); // Número de cuenta
            $table->string('cci')->nullable(); // Código de Cuenta Interbancario
            $table->enum('account_type', ['ahorros', 'corriente'])->nullable(); // Tipo de cuenta
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['type', 'is_active']);
            $table->index('display_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_method_configs');
    }
};
