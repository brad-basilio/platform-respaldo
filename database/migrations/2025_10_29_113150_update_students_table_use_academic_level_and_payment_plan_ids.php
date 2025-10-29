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
            // 1. Eliminar la columna enum 'level' antigua
            $table->dropColumn('level');
            
            // 2. Eliminar la columna string 'contracted_plan' antigua
            $table->dropColumn('contracted_plan');
            
            // 3. Agregar foreign key al nivel académico (nullable porque puede no tener nivel asignado inicialmente)
            $table->foreignId('academic_level_id')
                  ->nullable()
                  ->after('education_level')
                  ->constrained('academic_levels')
                  ->onDelete('set null');
            
            // 4. Agregar foreign key al plan de pago (nullable porque puede no tener plan contratado)
            $table->foreignId('payment_plan_id')
                  ->nullable()
                  ->after('enrollment_code')
                  ->constrained('payment_plans')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Revertir cambios
            $table->dropForeign(['academic_level_id']);
            $table->dropColumn('academic_level_id');
            
            $table->dropForeign(['payment_plan_id']);
            $table->dropColumn('payment_plan_id');
            
            // Restaurar columnas antiguas
            $table->enum('level', ['basic', 'intermediate', 'advanced'])->default('basic')->after('class_type');
            $table->string('contracted_plan')->nullable()->after('enrollment_code');
        });
    }
};
