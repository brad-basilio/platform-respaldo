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
            // Solo agregar columnas si no existen
            if (!Schema::hasColumn('installments', 'payment_type')) {
                $table->enum('payment_type', ['full', 'partial', 'combined'])->default('full')->after('status');
            }
            
            if (!Schema::hasColumn('installments', 'remaining_amount')) {
                $table->decimal('remaining_amount', 10, 2)->default(0)->after('paid_amount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('installments', function (Blueprint $table) {
            if (Schema::hasColumn('installments', 'payment_type')) {
                $table->dropColumn('payment_type');
            }
            if (Schema::hasColumn('installments', 'remaining_amount')) {
                $table->dropColumn('remaining_amount');
            }
        });
    }
};
