<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('icon')->default('🏆');
            $table->integer('points')->default(0);
            $table->timestamps();
        });
        
        // Pivot table for student badges
        Schema::create('badge_student', function (Blueprint $table) {
            $table->id();
            $table->foreignId('badge_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->timestamp('earned_at')->nullable();
            $table->timestamps();
            
            $table->unique(['badge_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('badge_student');
        Schema::dropIfExists('badges');
    }
};
