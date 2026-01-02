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
     * Esta migración arregla la foreign key de student_id en class_requests
     * para asegurar que tenga ON DELETE CASCADE correctamente configurado.
     */
    public function up(): void
    {
        // Verificar si la foreign key existe
        $foreignKeyExists = DB::select("
            SELECT COUNT(*) as count 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE CONSTRAINT_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'class_requests' 
            AND CONSTRAINT_NAME = 'class_requests_student_id_foreign'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        ");

        if ($foreignKeyExists[0]->count > 0) {
            // Eliminar la foreign key existente
            Schema::table('class_requests', function (Blueprint $table) {
                $table->dropForeign(['student_id']);
            });
        }

        // Verificar si hay un índice en student_id, si no, crearlo
        $indexExists = DB::select("
            SELECT COUNT(*) as count 
            FROM information_schema.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'class_requests' 
            AND COLUMN_NAME = 'student_id'
            AND INDEX_NAME != 'PRIMARY'
        ");

        // Recrear la foreign key con CASCADE correcto
        Schema::table('class_requests', function (Blueprint $table) {
            $table->foreign('student_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No es necesario revertir, ya que esto es una corrección
    }
};
