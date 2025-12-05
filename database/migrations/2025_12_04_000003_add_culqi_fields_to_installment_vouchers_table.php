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
        Schema::table('installment_vouchers', function (Blueprint $table) {
            // Agregar referencia a transacción Culqi si el pago fue con tarjeta
            $table->foreignId('culqi_transaction_id')->nullable()->after('receipt_path')->constrained('culqi_transactions')->onDelete('set null');

            // Agregar campo para identificar el origen del pago
            $table->enum('payment_source', ['manual', 'auto_payment', 'culqi_card'])->default('manual')->after('culqi_transaction_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('installment_vouchers', function (Blueprint $table) {
            $table->dropForeign(['culqi_transaction_id']);
            $table->dropColumn(['culqi_transaction_id', 'payment_source']);
        });
    }
};
