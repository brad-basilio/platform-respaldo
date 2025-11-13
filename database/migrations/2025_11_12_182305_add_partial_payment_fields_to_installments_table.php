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
        Schema::table('installments', function (Blueprint $table) {
            // Tipo de pago: 'full' (pago completo), 'partial' (pago parcial), 'combined' (varios pagos parciales)
            $table->enum('payment_type', ['full', 'partial', 'combined'])->default('full')->after('status');
            
            // Monto restante por pagar (amount - paid_amount)
            $table->decimal('remaining_amount', 10, 2)->default(0)->after('paid_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('installments', function (Blueprint $table) {
            $table->dropColumn(['payment_type', 'remaining_amount']);
        });
    }
};
