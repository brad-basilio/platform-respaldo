<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Esta migración consolida y corrige el ENUM de prospect_status
     * Valores finales: registrado, propuesta_enviada, pago_por_verificar, matriculado
     */
    public function up(): void
    {
        // Paso 1: Crear un enum temporal con TODOS los valores posibles (antiguos y nuevos)
        DB::statement("
            ALTER TABLE students 
            MODIFY COLUMN prospect_status 
            ENUM('registrado', 'propuesta_enviada', 'pago_reportado', 'verificacion_pago', 'pago_por_verificar', 'matriculado') 
            DEFAULT 'registrado'
        ");
        
        // Paso 2: Migrar todos los datos antiguos al nuevo flujo
        DB::statement("
            UPDATE students 
            SET prospect_status = 'pago_por_verificar' 
            WHERE prospect_status IN ('pago_reportado', 'verificacion_pago')
        ");
        
        // Paso 3: Establecer el enum final solo con los valores actuales
        DB::statement("
            ALTER TABLE students 
            MODIFY COLUMN prospect_status 
            ENUM('registrado', 'propuesta_enviada', 'pago_por_verificar', 'matriculado') 
            DEFAULT 'registrado'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restaurar a un estado anterior compatible
        DB::statement("
            ALTER TABLE students 
            MODIFY COLUMN prospect_status 
            ENUM('registrado', 'propuesta_enviada', 'pago_reportado', 'verificacion_pago', 'matriculado') 
            DEFAULT 'registrado'
        ");
    }
};
