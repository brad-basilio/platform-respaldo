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
        Schema::table('student_class_enrollments', function (Blueprint $table) {
            $table->decimal('exam_score', 5, 2)->nullable()->after('exam_completed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_class_enrollments', function (Blueprint $table) {
            $table->dropColumn('exam_score');
        });
    }
};
