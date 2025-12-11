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
        Schema::create('scheduled_classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_template_id')->constrained()->onDelete('cascade');
            $table->foreignId('teacher_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('group_id')->nullable()->constrained()->onDelete('set null');
            $table->datetime('scheduled_at'); // Fecha y hora programada
            $table->datetime('ended_at')->nullable(); // Fecha y hora de finalización
            $table->string('meet_url')->nullable(); // URL de Google Meet/Zoom
            $table->string('recording_url')->nullable(); // URL de grabación (reemplaza intro_video)
            $table->string('recording_thumbnail')->nullable(); // Thumbnail de grabación
            $table->enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])->default('scheduled');
            $table->text('notes')->nullable(); // Notas del profesor
            $table->integer('max_students')->default(6); // Máximo de alumnos
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scheduled_classes');
    }
};
