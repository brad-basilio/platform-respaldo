<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // MIGRACIÓN DESACTIVADA - Ya no se usa 'pago_reportado'
        // El nuevo flujo usa 'pago_por_verificar'
        // Esta migración se mantiene solo para compatibilidad histórica
        // Ver: 2025_11_05_000001_fix_prospect_status_enum_final.php
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // MIGRACIÓN DESACTIVADA - Ver up() method
    }
};
