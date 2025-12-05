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
        Schema::create('culqi_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('installment_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('payment_method_id')->nullable()->constrained()->onDelete('set null');

            // Datos de la transacción Culqi
            $table->string('culqi_charge_id')->unique(); // ID de cargo en Culqi (chr_xxx)
            $table->string('culqi_token_id')->nullable(); // ID del token usado (tkn_xxx)
            $table->decimal('amount', 10, 2); // Monto en soles (pe: 100.50)
            $table->string('currency', 3)->default('PEN'); // Moneda

            // Estado de la transacción
            $table->enum('status', ['pending', 'succeeded', 'failed', 'refunded'])->default('pending');
            $table->string('failure_code')->nullable(); // Código de error si falla
            $table->text('failure_message')->nullable(); // Mensaje de error

            // Metadata
            $table->json('culqi_response')->nullable(); // Respuesta completa de Culqi
            $table->string('card_brand')->nullable(); // Visa, Mastercard, etc
            $table->string('card_last4')->nullable(); // Últimos 4 dígitos
            $table->string('customer_email')->nullable();

            $table->timestamps();

            // Índices para búsquedas rápidas
            $table->index('culqi_charge_id');
            $table->index('student_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('culqi_transactions');
    }
};
