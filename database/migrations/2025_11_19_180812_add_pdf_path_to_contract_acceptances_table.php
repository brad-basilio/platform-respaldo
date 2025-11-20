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
        Schema::table('contract_acceptances', function (Blueprint $table) {
            $table->string('pdf_path')->nullable()->after('contract_content');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contract_acceptances', function (Blueprint $table) {
            $table->dropColumn('pdf_path');
        });
    }
};
