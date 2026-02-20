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

// Asegurar que el cronograma de prácticas siempre tenga los próximos 30 días
Schedule::call(function () {
    \App\Models\PracticeRotation::ensureRotationsExist(now(), 30);
})->dailyAt('01:00')
    ->name('generate-practice-rotations')
    ->withoutOverlapping();
