<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workshops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('scheduled_date');
            $table->string('meet_link')->nullable();
            $table->integer('max_participants')->default(8);
            $table->string('recording_url')->nullable();
            $table->boolean('is_live')->default(false);
            $table->timestamps();
        });
        
        // Pivot table for workshop participants
        Schema::create('student_workshop', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workshop_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['workshop_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_workshop');
        Schema::dropIfExists('workshops');
    }
};
