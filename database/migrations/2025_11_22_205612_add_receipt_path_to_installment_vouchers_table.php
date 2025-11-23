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
            $table->string('receipt_path')->nullable()->after('voucher_path');
            $table->decimal('verified_amount', 10, 2)->nullable()->after('declared_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('installment_vouchers', function (Blueprint $table) {
            $table->dropColumn(['receipt_path', 'verified_amount']);
        });
    }
};
