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
        Schema::create('student_class_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scheduled_class_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->boolean('attended')->default(false); // Si asistió
            $table->datetime('joined_at')->nullable(); // Cuándo se unió
            $table->datetime('left_at')->nullable(); // Cuándo salió
            $table->integer('attendance_minutes')->default(0); // Minutos de asistencia
            $table->boolean('exam_completed')->default(false); // Si completó el examen
            $table->timestamps();
            
            $table->unique(['scheduled_class_id', 'student_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_class_enrollments');
    }
};
