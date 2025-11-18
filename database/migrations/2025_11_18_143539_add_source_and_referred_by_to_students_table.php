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
            // Origen del prospecto (Frío / Referido / Lead)
            $table->enum('source', ['frio', 'referido', 'lead'])->default('frio')->after('prospect_status');
            
            // ID del estudiante que lo refirió (solo si source es 'referido')
            $table->unsignedBigInteger('referred_by')->nullable()->after('source');
            
            // Foreign key para el estudiante referidor
            $table->foreign('referred_by')->references('id')->on('students')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropForeign(['referred_by']);
            $table->dropColumn(['source', 'referred_by']);
        });
    }
};
