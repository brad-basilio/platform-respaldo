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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique()->comment('Identificador único de la configuración');
            $table->string('type')->default('general')->comment('Tipo/categoría: mail, whatsapp, general, etc.');
            $table->longText('content')->nullable()->comment('Contenido de la configuración (puede ser HTML, JSON, texto, etc.)');
            $table->string('description')->nullable()->comment('Descripción de qué hace esta configuración');
            $table->timestamps();
            
            $table->index('type');
            $table->index('key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
