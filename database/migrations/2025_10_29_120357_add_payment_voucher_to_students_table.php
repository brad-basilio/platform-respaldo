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
        Schema::table('students', function (Blueprint $table) {
            // Agregar campos para el voucher/comprobante de pago
            $table->string('payment_voucher_url')->nullable()->after('contract_file_name');
            $table->string('payment_voucher_file_name')->nullable()->after('payment_voucher_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Eliminar campos del voucher de pago
            $table->dropColumn(['payment_voucher_url', 'payment_voucher_file_name']);
        });
    }
};
