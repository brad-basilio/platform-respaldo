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
        Schema::create('class_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('class_template_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['pending', 'approved', 'rejected', 'scheduled'])->default('pending');
            $table->text('student_message')->nullable(); // Mensaje opcional del estudiante
            $table->text('admin_response')->nullable(); // Respuesta del admin
            $table->foreignId('scheduled_class_id')->nullable()->constrained()->nullOnDelete(); // Si se programó
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete(); // Admin que procesó
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            
            // Un estudiante solo puede tener una solicitud pendiente por plantilla
            $table->unique(['student_id', 'class_template_id', 'status'], 'unique_pending_request');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_requests');
    }
};
