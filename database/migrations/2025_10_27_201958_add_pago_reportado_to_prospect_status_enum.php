<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modificar el enum para incluir 'pago_reportado'
        DB::statement("ALTER TABLE students MODIFY COLUMN prospect_status ENUM('registrado', 'propuesta_enviada', 'pago_reportado', 'verificacion_pago', 'matriculado') DEFAULT 'registrado'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir al enum original
        DB::statement("ALTER TABLE students MODIFY COLUMN prospect_status ENUM('registrado', 'propuesta_enviada', 'verificacion_pago', 'matriculado') DEFAULT 'registrado'");
    }
};
