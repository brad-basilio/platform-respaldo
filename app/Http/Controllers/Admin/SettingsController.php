<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Guardar configuración general (email templates, contract template, etc.)
     */
    public function saveGeneralSetting(Request $request)
    {
        $validated = $request->validate([
            'key' => 'required|string|max:255',
            'value' => 'required|string',
        ]);

        $setting = Setting::updateOrCreate(
            [
                'type' => 'general',
                'key' => $validated['key']
            ],
            [
                'content' => $validated['value']
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Configuración guardada exitosamente',
            'setting' => $setting
        ]);
    }

    /**
     * Obtener configuración por tipo y clave
     */
    public function getGeneralSetting(Request $request)
    {
        $key = $request->query('key');
        
        $setting = Setting::where('type', 'general')
            ->where('key', $key)
            ->first();

        return response()->json([
            'success' => true,
            'setting' => $setting
        ]);
    }
}
