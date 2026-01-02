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
        // Primero verificamos si el índice existe
        $indexExists = DB::select("
            SELECT COUNT(*) as count 
            FROM information_schema.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'class_requests' 
            AND INDEX_NAME = 'unique_pending_request'
        ");

        if ($indexExists[0]->count > 0) {
            // MySQL no permite eliminar un índice usado por una FK
            // Debemos primero eliminar la FK que usa ese índice, eliminar el índice,
            // y luego recrear la FK (que creará su propio índice)
            
            Schema::table('class_requests', function (Blueprint $table) {
                // Eliminar la foreign key de student_id que está usando el índice único
                $table->dropForeign(['student_id']);
            });

            Schema::table('class_requests', function (Blueprint $table) {
                // Ahora sí podemos eliminar el índice único
                $table->dropUnique('unique_pending_request');
            });

            Schema::table('class_requests', function (Blueprint $table) {
                // Recrear la foreign key (esto creará un índice simple automáticamente)
                $table->foreign('student_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }

        // Verificar si el nuevo índice ya existe antes de crearlo
        $newIndexExists = DB::select("
            SELECT COUNT(*) as count 
            FROM information_schema.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'class_requests' 
            AND INDEX_NAME = 'idx_student_template_status'
        ");

        if ($newIndexExists[0]->count == 0) {
            // Crear un índice para búsquedas rápidas (no único)
            Schema::table('class_requests', function (Blueprint $table) {
                $table->index(['student_id', 'class_template_id', 'status'], 'idx_student_template_status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Verificar si el índice existe antes de eliminarlo
        $indexExists = DB::select("
            SELECT COUNT(*) as count 
            FROM information_schema.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'class_requests' 
            AND INDEX_NAME = 'idx_student_template_status'
        ");

        if ($indexExists[0]->count > 0) {
            Schema::table('class_requests', function (Blueprint $table) {
                $table->dropIndex('idx_student_template_status');
            });
        }

        // Verificar si el índice único ya existe
        $uniqueExists = DB::select("
            SELECT COUNT(*) as count 
            FROM information_schema.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'class_requests' 
            AND INDEX_NAME = 'unique_pending_request'
        ");

        if ($uniqueExists[0]->count == 0) {
            // Eliminar la FK actual para poder recrear el índice único
            Schema::table('class_requests', function (Blueprint $table) {
                $table->dropForeign(['student_id']);
            });

            // Crear el índice único original
            Schema::table('class_requests', function (Blueprint $table) {
                $table->unique(['student_id', 'class_template_id', 'status'], 'unique_pending_request');
            });

            // Recrear la FK
            Schema::table('class_requests', function (Blueprint $table) {
                $table->foreign('student_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }
    }
};
