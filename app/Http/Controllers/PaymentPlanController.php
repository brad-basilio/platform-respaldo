<?php

namespace App\Http\Controllers;

use App\Models\PaymentPlan;
use App\Models\AcademicLevel;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PaymentPlanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $academicLevels = AcademicLevel::active()->orderBy('order')->get();
        
        $query = PaymentPlan::with('academicLevel');
        
        // Filtrar por nivel académico si se proporciona
        if ($request->has('academic_level_id')) {
            $query->where('academic_level_id', $request->academic_level_id);
        }
        
        $paymentPlans = $query->orderBy('academic_level_id')
            ->orderBy('installments_count')
            ->get();

        return Inertia::render('PaymentPlans/Index', [
            'paymentPlans' => $paymentPlans,
            'academicLevels' => $academicLevels,
            'selectedLevelId' => $request->academic_level_id
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'academic_level_id' => 'required|exists:academic_levels,id',
            'installments_count' => 'required|integer|min:1|max:12',
            'monthly_amount' => 'required|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'duration_months' => 'required|integer|min:1',
            'late_fee_percentage' => 'nullable|numeric|min:0|max:100',
            'grace_period_days' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'description' => 'nullable|string'
        ]);

        // Valores por defecto
        $validated['discount_percentage'] = $validated['discount_percentage'] ?? 0;
        $validated['late_fee_percentage'] = $validated['late_fee_percentage'] ?? 5;
        $validated['grace_period_days'] = $validated['grace_period_days'] ?? 5;

        $paymentPlan = PaymentPlan::create($validated);

        return redirect()->back()->with('success', 'Plan de pago creado exitosamente');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PaymentPlan $paymentPlan)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'academic_level_id' => 'required|exists:academic_levels,id',
            'installments_count' => 'required|integer|min:1|max:12',
            'monthly_amount' => 'required|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'duration_months' => 'required|integer|min:1',
            'late_fee_percentage' => 'nullable|numeric|min:0|max:100',
            'grace_period_days' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'description' => 'nullable|string'
        ]);

        $paymentPlan->update($validated);

        return redirect()->back()->with('success', 'Plan de pago actualizado exitosamente');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(PaymentPlan $paymentPlan)
    {
        // Verificar si tiene matrículas asociadas
        if ($paymentPlan->enrollments()->count() > 0) {
            return redirect()->back()->withErrors([
                'delete' => 'No se puede eliminar este plan de pago porque tiene estudiantes matriculados'
            ]);
        }

        $paymentPlan->delete();

        return redirect()->back()->with('success', 'Plan de pago eliminado exitosamente');
    }
}
