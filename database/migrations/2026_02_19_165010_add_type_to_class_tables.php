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
        Schema::table('scheduled_classes', function (Blueprint $table) {
            $table->enum('type', ['regular', 'practice'])->default('regular')->after('class_template_id');
        });

        Schema::table('class_requests', function (Blueprint $table) {
            $table->enum('type', ['regular', 'practice'])->default('regular')->after('class_template_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('scheduled_classes', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        Schema::table('class_requests', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
