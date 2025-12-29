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
            // Estudiantes regulares (true) siguen flujo con restricción horaria
            // Estudiantes especiales (false) mantienen flujo actual sin restricciones
            $table->boolean('is_regular_student')->default(true)->after('enrollment_verified');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('is_regular_student');
        });
    }
};
