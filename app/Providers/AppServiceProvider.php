<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Define Gates for authorization
        Gate::define('admin', function ($user) {
            return $user->role === 'admin';
        });

        Gate::define('teacher', function ($user) {
            return $user->role === 'teacher';
        });

        Gate::define('student', function ($user) {
            return $user->role === 'student';
        });
    }
}

