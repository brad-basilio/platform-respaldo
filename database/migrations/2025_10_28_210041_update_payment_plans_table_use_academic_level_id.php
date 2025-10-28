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
            // Eliminar la columna enum antigua
            $table->dropColumn('academic_level');
            
            // Agregar foreign key al nivel académico
            $table->foreignId('academic_level_id')
                  ->after('name')
                  ->constrained('academic_levels')
                  ->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_plans', function (Blueprint $table) {
            $table->dropForeign(['academic_level_id']);
            $table->dropColumn('academic_level_id');
            $table->enum('academic_level', ['basic', 'intermediate', 'advanced'])->after('name');
        });
    }
};
