<?php

use App\Jobs\ResetTeacherAvailability;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Reset teacher availability flag daily at midnight
Schedule::job(new ResetTeacherAvailability)->dailyAt('00:00')
    ->name('reset-teacher-availability')
    ->withoutOverlapping();
