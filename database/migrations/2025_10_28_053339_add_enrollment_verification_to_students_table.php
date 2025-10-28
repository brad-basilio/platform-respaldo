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
            // Campo para verificar si la matrícula fue aprobada por el administrador
            // Esto previene fraudes en comisiones de asesores de venta
            // Los campos enrollment_verified_at y verified_enrollment_by ya existen
            $table->boolean('enrollment_verified')->default(false)->after('enrollment_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('enrollment_verified');
        });
    }
};
