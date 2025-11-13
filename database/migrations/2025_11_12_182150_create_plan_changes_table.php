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
        Schema::create('plan_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('old_plan_id')->constrained('payment_plans')->onDelete('restrict');
            $table->foreignId('new_plan_id')->constrained('payment_plans')->onDelete('restrict');
            $table->date('change_date');
            $table->foreignId('changed_by')->nullable()->constrained('users')->onDelete('set null'); // Usuario que aprobó el cambio (admin/cajero)
            $table->text('reason')->nullable(); // Razón del cambio
            $table->integer('old_installments_count')->default(0); // Cuántas cuotas tenía el plan anterior
            $table->integer('new_installments_count')->default(0); // Cuántas cuotas tiene el nuevo plan
            $table->decimal('old_total_amount', 10, 2)->default(0); // Monto total del plan anterior
            $table->decimal('new_total_amount', 10, 2)->default(0); // Monto total del nuevo plan
            $table->timestamps();
            
            // Índices para búsquedas rápidas
            $table->index('student_id');
            $table->index('change_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plan_changes');
    }
};
