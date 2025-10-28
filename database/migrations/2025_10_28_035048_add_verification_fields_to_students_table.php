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
            // Campos de verificación de pago por cajero
            $table->foreignId('verified_payment_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('payment_verified_at')->nullable();
            
            // Campos de verificación de matrícula (para uso futuro)
            $table->foreignId('verified_enrollment_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('enrollment_verified_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropForeign(['verified_payment_by']);
            $table->dropColumn('verified_payment_by');
            $table->dropColumn('payment_verified_at');
            
            $table->dropForeign(['verified_enrollment_by']);
            $table->dropColumn('verified_enrollment_by');
            $table->dropColumn('enrollment_verified_at');
        });
    }
};
