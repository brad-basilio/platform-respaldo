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
        Schema::create('payment_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Ej: "Plan Premium", "Plan 3 Meses"
            $table->enum('academic_level', ['basic', 'intermediate', 'advanced']);
            $table->integer('installments_count'); // Número de cuotas: 1, 3, 6, etc
            $table->decimal('monthly_amount', 10, 2); // Monto por cuota
            $table->decimal('total_amount', 10, 2); // Total a pagar
            $table->decimal('discount_percentage', 5, 2)->default(0); // Porcentaje de descuento
            $table->integer('duration_months'); // Duración en meses
            $table->decimal('late_fee_percentage', 5, 2)->default(0); // Porcentaje de mora
            $table->integer('grace_period_days')->default(0); // Días de gracia antes de aplicar mora
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
            
            // Índices para búsquedas rápidas
            $table->index('academic_level');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_plans');
    }
};
