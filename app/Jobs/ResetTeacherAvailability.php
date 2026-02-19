<?php

namespace App\Jobs;

use App\Models\Teacher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ResetTeacherAvailability implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     * 
     * This job resets the not_available_today flag for all teachers.
     * It should be scheduled to run daily at midnight.
     */
    public function handle(): void
    {
        $updatedCount = Teacher::where('not_available_today', true)
            ->update(['not_available_today' => false]);

        Log::info("ResetTeacherAvailability: Reset {$updatedCount} teacher(s) availability flag to available.");
    }
}
