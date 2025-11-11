<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class ProfileController extends Controller
{
    /**
     * Actualizar el avatar del usuario
     */
    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048', // 2MB max
        ]);

        $user = Auth::user();

        // Eliminar avatar anterior si existe
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        // Guardar nuevo avatar
        $path = $request->file('avatar')->store('avatars', 'public');

        // Actualizar usuario
        $user->avatar = $path;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Avatar actualizado exitosamente',
            'avatar_url' => Storage::url($path),
        ]);
    }
}
