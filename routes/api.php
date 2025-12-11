<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ImageUploadController;
use App\Http\Controllers\Admin\ClassRequestController;

// Public auth routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Image upload for editor
    Route::post('/upload-image', [ImageUploadController::class, 'upload'])->name('api.upload-image');
});

// Admin API routes (web middleware for session auth)
Route::middleware(['web', 'auth'])->prefix('admin')->group(function () {
    Route::get('/class-templates/{template}/available-classes', [ClassRequestController::class, 'getAvailableClasses']);
});
