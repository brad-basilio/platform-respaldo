<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageUploadController extends Controller
{
    /**
     * Upload an image for the rich text editor.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
        ]);

        $file = $request->file('image');
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        
        // Store in public/uploads/editor-images
        $path = $file->storeAs('uploads/editor-images', $filename, 'public');

        return response()->json([
            'success' => true,
            'url' => Storage::url($path),
            'path' => $path,
        ]);
    }
}
