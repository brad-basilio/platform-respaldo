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
        Schema::table('payment_plans', function (Blueprint $table) {
            // Eliminar la foreign key constraint
            $table->dropForeign(['academic_level_id']);
            
            // Hacer la columna nullable
            $table->foreignId('academic_level_id')
                  ->nullable()
                  ->change();
            
            // Re-agregar la foreign key sin restrict (permite NULL)
            $table->foreign('academic_level_id')
                  ->references('id')
                  ->on('academic_levels')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_plans', function (Blueprint $table) {
            // Eliminar foreign key
            $table->dropForeign(['academic_level_id']);
            
            // Volver a NOT NULL
            $table->foreignId('academic_level_id')
                  ->nullable(false)
                  ->change();
            
            // Re-agregar constraint restrict
            $table->foreign('academic_level_id')
                  ->references('id')
                  ->on('academic_levels')
                  ->onDelete('restrict');
        });
    }
};
