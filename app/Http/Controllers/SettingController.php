<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingController extends Controller
{
    /**
     * Display settings page
     */
    public function index()
    {
        $settings = Setting::all()->groupBy('type');
        
        return Inertia::render('Admin/Settings', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update or create multiple settings
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.content' => 'nullable|string',
            'settings.*.type' => 'required|string',
            'settings.*.description' => 'nullable|string',
        ]);

        foreach ($validated['settings'] as $settingData) {
            Setting::set(
                $settingData['key'],
                $settingData['content'] ?? '',
                $settingData['type'],
                $settingData['description'] ?? null
            );
        }

        return redirect()->back()->with('success', 'Configuraciones actualizadas exitosamente');
    }

    /**
     * Update single setting
     */
    public function updateSingle(Request $request)
    {
        $validated = $request->validate([
            'key' => 'required|string',
            'content' => 'nullable|string',
            'type' => 'required|string',
            'description' => 'nullable|string',
        ]);

        Setting::set(
            $validated['key'],
            $validated['content'] ?? '',
            $validated['type'],
            $validated['description'] ?? null
        );

        return redirect()->back()->with('success', 'Configuración actualizada exitosamente');
    }
}
