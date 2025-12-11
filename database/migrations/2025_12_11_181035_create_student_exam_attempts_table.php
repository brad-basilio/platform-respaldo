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
        Schema::create('student_exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_class_enrollment_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('class_template_id')->constrained()->onDelete('cascade');
            $table->json('questions'); // Preguntas presentadas (aleatorias)
            $table->json('answers')->nullable(); // Respuestas del estudiante
            $table->integer('score')->default(0); // Puntuación obtenida
            $table->integer('total_points')->default(0); // Total de puntos posibles
            $table->decimal('percentage', 5, 2)->default(0); // Porcentaje
            $table->boolean('passed')->default(false); // Si aprobó
            $table->datetime('started_at')->nullable();
            $table->datetime('completed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_exam_attempts');
    }
};
