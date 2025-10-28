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
        Schema::create('academic_levels', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Ej: "Básico", "Intermedio", "Avanzado", "Profesional"
            $table->string('code')->unique(); // Ej: "basic", "intermediate", "advanced"
            $table->text('description')->nullable();
            $table->integer('order')->default(0); // Orden de visualización
            $table->string('color')->default('#3B82F6'); // Color para UI
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            // Índices
            $table->index('code');
            $table->index('is_active');
            $table->index('order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('academic_levels');
    }
};
