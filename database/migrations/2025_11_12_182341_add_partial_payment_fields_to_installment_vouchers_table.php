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
            // Solo agregar columnas si no existen
            if (!Schema::hasColumn('installment_vouchers', 'payment_type')) {
                $table->enum('payment_type', ['full', 'partial'])->default('full')->after('status');
            }
            
            if (!Schema::hasColumn('installment_vouchers', 'applied_to_total')) {
                $table->boolean('applied_to_total')->default(false)->after('payment_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('installment_vouchers', function (Blueprint $table) {
            if (Schema::hasColumn('installment_vouchers', 'payment_type')) {
                $table->dropColumn('payment_type');
            }
            if (Schema::hasColumn('installment_vouchers', 'applied_to_total')) {
                $table->dropColumn('applied_to_total');
            }
        });
    }
};
