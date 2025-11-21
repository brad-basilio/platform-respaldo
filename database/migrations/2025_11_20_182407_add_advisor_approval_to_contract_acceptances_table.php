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
            $table->boolean('advisor_approved')->default(false)->after('accepted_at');
            $table->timestamp('advisor_approved_at')->nullable()->after('advisor_approved');
            $table->unsignedBigInteger('advisor_id')->nullable()->after('advisor_approved_at');
            $table->foreign('advisor_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contract_acceptances', function (Blueprint $table) {
            $table->dropForeign(['advisor_id']);
            $table->dropColumn(['advisor_approved', 'advisor_approved_at', 'advisor_id']);
        });
    }
};
