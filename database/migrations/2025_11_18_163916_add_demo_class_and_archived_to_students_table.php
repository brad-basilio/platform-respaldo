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
        Schema::table('students', function (Blueprint $table) {
            // Campos para la etapa "Reunión Realizada"
            $table->boolean('had_demo_class')->default(false)->after('source'); // ¿Tuvo clase modelo?
            $table->boolean('archived')->default(false)->after('had_demo_class'); // ¿Fue archivado?
            $table->timestamp('archived_at')->nullable()->after('archived'); // Cuándo fue archivado
            $table->text('archived_reason')->nullable()->after('archived_at'); // Razón del archivo
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['had_demo_class', 'archived', 'archived_at', 'archived_reason']);
        });
    }
};
