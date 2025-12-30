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
     * Cambia de is_regular_student (boolean) a student_type (enum)
     * - 'regular': Sistema actual (1 hora anticipación, próximo slot)
     * - 'daily': Puede elegir cualquier hora del día actual
     * - 'weekly': Puede elegir cualquier hora de cualquier día de la semana
     */
    public function up(): void
    {
        // Primero agregar la nueva columna
        Schema::table('students', function (Blueprint $table) {
            $table->enum('student_type', ['regular', 'daily', 'weekly'])
                ->default('regular')
                ->after('enrollment_verified');
        });

        // Migrar datos existentes
        DB::table('students')
            ->where('is_regular_student', true)
            ->update(['student_type' => 'regular']);
        
        DB::table('students')
            ->where('is_regular_student', false)
            ->update(['student_type' => 'weekly']); // Los "especiales" anteriores pasan a "weekly"

        // Eliminar la columna antigua
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('is_regular_student');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Agregar la columna antigua
        Schema::table('students', function (Blueprint $table) {
            $table->boolean('is_regular_student')->default(true)->after('enrollment_verified');
        });

        // Migrar datos de vuelta
        DB::table('students')
            ->where('student_type', 'regular')
            ->update(['is_regular_student' => true]);
        
        DB::table('students')
            ->whereIn('student_type', ['daily', 'weekly'])
            ->update(['is_regular_student' => false]);

        // Eliminar la columna nueva
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('student_type');
        });
    }
};
