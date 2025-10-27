<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['theoretical', 'practical']);
            $table->foreignId('teacher_id')->nullable()->constrained('teachers')->onDelete('set null');
            $table->integer('max_capacity');
            $table->enum('status', ['active', 'closed'])->default('active');
            $table->enum('level', ['basic', 'intermediate', 'advanced']);
            $table->date('start_date');
            $table->date('end_date');
            
            // Schedule (stored as JSON for flexibility)
            $table->string('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('duration'); // in minutes
            
            $table->timestamps();
        });
        
        // Pivot table for student-group relationship
        Schema::create('group_student', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->date('enrolled_at')->default(now());
            $table->timestamps();
            
            $table->unique(['group_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_student');
        Schema::dropIfExists('groups');
    }
};
