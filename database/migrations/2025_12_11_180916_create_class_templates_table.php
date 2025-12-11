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
        Schema::create('class_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_level_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->string('title'); // Ej: "Sesión 1 - Introducción al Inglés Básico"
            $table->string('session_number'); // Ej: "1", "2", "3"
            $table->enum('modality', ['theoretical', 'practical'])->default('theoretical');
            $table->text('description')->nullable(); // Descripción breve
            $table->longText('content')->nullable(); // Contenido rico (HTML del editor)
            $table->longText('objectives')->nullable(); // Objetivos de aprendizaje
            $table->string('intro_video_url')->nullable(); // Video de bienvenida/intro
            $table->string('intro_video_thumbnail')->nullable(); // Thumbnail del video
            $table->integer('duration_minutes')->default(60); // Duración estimada
            $table->integer('order')->default(0); // Orden dentro del nivel
            $table->boolean('has_exam')->default(true); // Si tiene examen
            $table->integer('exam_questions_count')->default(10); // Preguntas aleatorias
            $table->integer('exam_passing_score')->default(70); // % para aprobar
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->unique(['academic_level_id', 'session_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_templates');
    }
};
