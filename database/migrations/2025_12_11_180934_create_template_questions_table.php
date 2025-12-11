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
        Schema::create('template_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_template_id')->constrained()->onDelete('cascade');
            $table->text('question'); // Pregunta
            $table->enum('type', ['multiple_choice', 'true_false'])->default('multiple_choice');
            $table->json('options'); // Opciones de respuesta [{text: "...", is_correct: true/false}]
            $table->text('explanation')->nullable(); // Explicación de la respuesta correcta
            $table->integer('points')->default(1); // Puntos por respuesta correcta
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('template_questions');
    }
};
