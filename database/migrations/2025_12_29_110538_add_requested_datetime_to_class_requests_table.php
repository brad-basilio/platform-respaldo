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
        Schema::table('class_requests', function (Blueprint $table) {
            // Hora solicitada por estudiantes regulares
            $table->dateTime('requested_datetime')->nullable()->after('student_message');
            
            // ID de clase existente cuando solicitan unirse a un grupo
            $table->foreignId('target_scheduled_class_id')->nullable()->after('requested_datetime')
                  ->constrained('scheduled_classes')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class_requests', function (Blueprint $table) {
            $table->dropForeign(['target_scheduled_class_id']);
            $table->dropColumn(['requested_datetime', 'target_scheduled_class_id']);
        });
    }
};
