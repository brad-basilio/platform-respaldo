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
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->string('type')->default('card'); // card, yape, bank_account
            $table->string('provider')->default('culqi'); // culqi, niubiz, etc
            
            // Datos de la tarjeta (tokenizados/últimos 4 dígitos)
            $table->string('card_brand')->nullable(); // visa, mastercard, amex
            $table->string('card_last4')->nullable(); // Últimos 4 dígitos
            $table->string('card_exp_month')->nullable();
            $table->string('card_exp_year')->nullable();
            $table->string('cardholder_name')->nullable();
            
            // Token de la tarjeta (proveído por Culqi)
            $table->string('culqi_card_id')->nullable(); // ID de tarjeta guardada en Culqi (crd_xxx)
            $table->string('culqi_customer_id')->nullable(); // ID de cliente en Culqi (cus_xxx)
            
            // Configuraciones
            $table->boolean('is_default')->default(false); // Tarjeta predeterminada
            $table->boolean('auto_payment_enabled')->default(false); // Autopago habilitado
            
            // Metadata adicional
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            $table->softDeletes(); // Para eliminación lógica
            
            // Índices
            $table->index('student_id');
            $table->index('is_default');
            $table->index('auto_payment_enabled');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
