<?php

namespace App\Http\Controllers;

use App\Models\AcademicLevel;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AcademicLevelController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $academicLevels = AcademicLevel::withCount('paymentPlans')
            ->orderBy('order')
            ->get();

        return Inertia::render('AcademicLevels/Index', [
            'academicLevels' => $academicLevels
        ]);
    }

    /**
     * Get academic levels as JSON for API calls.
     */
    public function getAcademicLevelsJson()
    {
        $academicLevels = AcademicLevel::withCount('paymentPlans')
            ->orderBy('order')
            ->get();

        return response()->json($academicLevels);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50|unique:academic_levels,code',
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:7',
            'is_active' => 'boolean'
        ]);

        // Si no se proporciona order, usar el siguiente disponible
        if (!isset($validated['order'])) {
            $validated['order'] = AcademicLevel::max('order') + 1;
        }

        $academicLevel = AcademicLevel::create($validated);

        return redirect()->back()->with('success', 'Nivel académico creado exitosamente');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AcademicLevel $academicLevel)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50|unique:academic_levels,code,' . $academicLevel->id,
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:7',
            'is_active' => 'boolean'
        ]);

        $academicLevel->update($validated);

        return redirect()->back()->with('success', 'Nivel académico actualizado exitosamente');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AcademicLevel $academicLevel)
    {
        // Verificar si tiene planes de pago asociados
        if ($academicLevel->paymentPlans()->count() > 0) {
            return redirect()->back()->withErrors([
                'delete' => 'No se puede eliminar este nivel académico porque tiene planes de pago asociados'
            ]);
        }

        $academicLevel->delete();

        return redirect()->back()->with('success', 'Nivel académico eliminado exitosamente');
    }
}
