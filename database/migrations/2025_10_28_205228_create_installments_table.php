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
        Schema::create('installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('enrollments')->onDelete('cascade');
            $table->integer('installment_number'); // 1, 2, 3... (número de cuota)
            $table->date('due_date'); // Fecha de vencimiento
            $table->decimal('amount', 10, 2); // Monto original de la cuota
            $table->decimal('late_fee', 10, 2)->default(0); // Mora calculada
            $table->decimal('paid_amount', 10, 2)->default(0); // Monto pagado
            $table->date('paid_date')->nullable(); // Fecha de pago
            $table->enum('status', ['pending', 'paid', 'verified', 'overdue', 'cancelled'])->default('pending');
            $table->foreignId('verified_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Índices
            $table->index('enrollment_id');
            $table->index('status');
            $table->index('due_date');
            $table->index(['enrollment_id', 'installment_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('installments');
    }
};
