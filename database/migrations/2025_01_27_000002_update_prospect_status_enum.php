<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Primero, agregar temporalmente 'pago_por_verificar' al enum existente
        DB::statement("ALTER TABLE students MODIFY COLUMN prospect_status ENUM('registrado', 'propuesta_enviada', 'pago_reportado', 'verificacion_pago', 'pago_por_verificar', 'matriculado') DEFAULT 'registrado'");
        
        // Migrar datos existentes al nuevo flujo
        DB::statement("UPDATE students SET prospect_status = 'pago_por_verificar' WHERE prospect_status IN ('pago_reportado', 'verificacion_pago')");
        
        // Ahora eliminar los estados antiguos del enum
        DB::statement("ALTER TABLE students MODIFY COLUMN prospect_status ENUM('registrado', 'propuesta_enviada', 'pago_por_verificar', 'matriculado') DEFAULT 'registrado'");
    }

    public function down(): void
    {
        // Restaurar el enum anterior
        DB::statement("ALTER TABLE students MODIFY COLUMN prospect_status ENUM('registrado', 'propuesta_enviada', 'pago_reportado', 'verificacion_pago', 'matriculado') DEFAULT 'registrado'");
    }
};
