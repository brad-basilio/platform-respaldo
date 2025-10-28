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
        Schema::create('installment_vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('installment_id')->constrained('installments')->onDelete('cascade');
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade'); // Asesor que sube
            $table->string('voucher_path'); // Ruta de la imagen del voucher
            $table->decimal('declared_amount', 10, 2); // Monto declarado en el voucher
            $table->date('payment_date'); // Fecha del pago según voucher
            $table->string('payment_method')->nullable(); // Efectivo, transferencia, etc
            $table->string('transaction_reference')->nullable(); // Número de operación
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Índices
            $table->index('installment_id');
            $table->index('status');
            $table->index('uploaded_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('installment_vouchers');
    }
};
