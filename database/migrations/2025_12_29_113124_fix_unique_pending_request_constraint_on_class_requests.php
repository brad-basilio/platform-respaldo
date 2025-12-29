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
     * El constraint anterior incluía status en la unicidad, lo que impedía
     * que un estudiante tomara la misma clase múltiples veces.
     * 
     * El nuevo enfoque: solo prevenir solicitudes duplicadas PENDIENTES
     * a nivel de aplicación (validación en el controlador).
     */
    public function up(): void
    {
        // Deshabilitar verificación de FK temporalmente
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        
        Schema::table('class_requests', function (Blueprint $table) {
            // Eliminar el constraint único anterior
            $table->dropUnique('unique_pending_request');
        });

        // Crear un índice para búsquedas rápidas (no único)
        Schema::table('class_requests', function (Blueprint $table) {
            $table->index(['student_id', 'class_template_id', 'status'], 'idx_student_template_status');
        });

        // Reactivar verificación de FK
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        
        Schema::table('class_requests', function (Blueprint $table) {
            $table->dropIndex('idx_student_template_status');
            $table->unique(['student_id', 'class_template_id', 'status'], 'unique_pending_request');
        });
        
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }
};
