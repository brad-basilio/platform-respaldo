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
        Schema::create('template_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_template_id')->constrained()->onDelete('cascade');
            $table->string('name'); // Nombre del recurso
            $table->string('file_path'); // Ruta del archivo
            $table->string('file_type'); // pdf, docx, xlsx, pptx, etc.
            $table->string('file_size')->nullable(); // Tamaño en bytes
            $table->text('description')->nullable();
            $table->integer('download_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('template_resources');
    }
};
