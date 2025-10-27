<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Handle login request
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        // Create token for API authentication
        $token = $user->createToken('auth-token')->plainTextToken;

        // Load relationships based on role
        switch ($user->role) {
            case 'student':
                $user->load('student.badges', 'student.groups');
                break;
            case 'teacher':
                $user->load('teacher.groups', 'teacher.timeSlots');
                break;
        }

        return response()->json([
            'user' => $user,
            'token' => $token,
            'message' => 'Inicio de sesión exitoso',
        ]);
    }

    /**
     * Handle logout request
     */
    public function logout(Request $request)
    {
        // Revoke current token
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Cierre de sesión exitoso',
        ]);
    }

    /**
     * Get authenticated user
     */
    public function user(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        // Load relationships based on role
        switch ($user->role) {
            case 'student':
                $user->load('student.badges', 'student.groups');
                break;
            case 'teacher':
                $user->load('teacher.groups', 'teacher.timeSlots');
                break;
        }

        return response()->json($user);
    }

    /**
     * Handle registration request
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:student,teacher',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        // Create token for API authentication
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'message' => 'Registro exitoso',
        ], 201);
    }
}
