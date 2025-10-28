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
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('payment_plan_id')->constrained('payment_plans')->onDelete('restrict');
            $table->decimal('enrollment_fee', 10, 2)->default(0); // Costo de matrícula (puede ser 0)
            $table->date('enrollment_date');
            $table->string('enrollment_voucher_path')->nullable(); // Ruta del voucher de matrícula
            $table->boolean('enrollment_fee_verified')->default(false);
            $table->foreignId('verified_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable();
            $table->enum('status', ['pending', 'active', 'completed', 'cancelled'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Índices
            $table->index('student_id');
            $table->index('payment_plan_id');
            $table->index('status');
            $table->index('enrollment_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
