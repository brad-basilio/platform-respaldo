<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImageUploadController extends Controller
{
    /**
     * Handle image upload from TinyMCE editor
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|image|max:5120', // 5MB max
        ]);

        try {
            $file = $request->file('file');
            $fileName = 'editor_' . time() . '_' . uniqid() . '.' . $file->extension();
            
            // Guardar en storage/public/editor_images
            $path = $file->storeAs('editor_images', $fileName, 'public');
            
            // Retornar URL completa para TinyMCE
            return response()->json([
                'location' => asset('storage/' . $path)
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al subir imagen: ' . $e->getMessage()
            ], 500);
        }
    }
}
