<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Solo agregamos los campos de verificación que faltan
            // registered_by ya existe en migración anterior
            $table->foreignId('verified_payment_by')->nullable()->constrained('users')->onDelete('set null')->after('payment_verified');
            $table->timestamp('payment_verified_at')->nullable()->after('verified_payment_by');
            $table->foreignId('verified_enrollment_by')->nullable()->constrained('users')->onDelete('set null')->after('payment_verified_at');
            $table->timestamp('enrollment_verified_at')->nullable()->after('verified_enrollment_by');
        });

        // Actualizar el enum de prospect_status para incluir 'pago_reportado'
        DB::statement("ALTER TABLE students MODIFY COLUMN prospect_status ENUM('registrado', 'propuesta_enviada', 'pago_reportado', 'verificacion_pago', 'matriculado') DEFAULT 'registrado'");
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Solo eliminamos los campos que agregamos en esta migración
            $table->dropForeign(['verified_payment_by']);
            $table->dropForeign(['verified_enrollment_by']);
            $table->dropColumn(['verified_payment_by', 'payment_verified_at', 'verified_enrollment_by', 'enrollment_verified_at']);
        });

        // Restaurar el enum original
        DB::statement("ALTER TABLE students MODIFY COLUMN prospect_status ENUM('registrado', 'propuesta_enviada', 'verificacion_pago', 'matriculado') DEFAULT 'registrado'");
    }
};
