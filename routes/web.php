<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\GroupController;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Student/Prospect Management (accessible by admin, sales_advisor, cashier)
    Route::middleware('prospect.access')->group(function () {
        Route::get('/admin/students', [StudentController::class, 'index'])->name('admin.students');
        Route::post('/admin/students', [StudentController::class, 'store'])->name('admin.students.store');
        Route::put('/admin/students/{student}', [StudentController::class, 'update'])->name('admin.students.update');
        Route::delete('/admin/students/{student}', [StudentController::class, 'destroy'])->name('admin.students.destroy');
        Route::put('/admin/students/{student}/prospect-status', [StudentController::class, 'updateProspectStatus'])->name('admin.students.prospect-status');
    });
    
    // Admin-only routes
    Route::middleware('can:admin')->group(function () {
        // Enrolled Students
        Route::get('/admin/enrolled-students', function () {
            return inertia('Admin/EnrolledStudents');
        })->name('admin.enrolled-students');
        
        // Teacher Management
        Route::get('/admin/teachers', [TeacherController::class, 'index'])->name('admin.teachers');
        Route::post('/admin/teachers', [TeacherController::class, 'store'])->name('admin.teachers.store');
        Route::put('/admin/teachers/{teacher}', [TeacherController::class, 'update'])->name('admin.teachers.update');
        Route::delete('/admin/teachers/{teacher}', [TeacherController::class, 'destroy'])->name('admin.teachers.destroy');
        
        // Group Management
        Route::get('/admin/groups', [GroupController::class, 'index'])->name('admin.groups');
        Route::post('/admin/groups', [GroupController::class, 'store'])->name('admin.groups.store');
        Route::put('/admin/groups/{group}', [GroupController::class, 'update'])->name('admin.groups.update');
        Route::delete('/admin/groups/{group}', [GroupController::class, 'destroy'])->name('admin.groups.destroy');
        
        // Payments
        Route::get('/admin/payments', function () {
            return inertia('Admin/Payments');
        })->name('admin.payments');
        
        // Analytics
        Route::get('/admin/analytics', function () {
            return inertia('Admin/Analytics');
        })->name('admin.analytics');
    });
    
    // Settings
    Route::get('/settings', function () {
        return inertia('settings/index');
    })->name('settings');
});

require __DIR__.'/settings.php';