<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentPlan;
use App\Models\AcademicLevel;

class PaymentPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener los IDs de los niveles académicos
        $basicLevel = AcademicLevel::where('code', 'basic')->first();
        $intermediateLevel = AcademicLevel::where('code', 'intermediate')->first();
        $advancedLevel = AcademicLevel::where('code', 'advanced')->first();

        $plans = [
            // ========== NIVEL BÁSICO ==========
            [
                'name' => 'Plan Premium - Pago al Contado',
                'academic_level_id' => $basicLevel->id,
                'installments_count' => 1,
                'monthly_amount' => 1000.00,
                'total_amount' => 1000.00,
                'discount_percentage' => 24.24, // Ahorro de S/ 320
                'duration_months' => 1,
                'late_fee_percentage' => 0, // Sin mora (pago único)
                'grace_period_days' => 0,
                'is_active' => true,
                'description' => 'Pago único con 24% de descuento. Ideal para quienes prefieren pagar todo al inicio.',
            ],
            [
                'name' => 'Plan Estándar - 3 Cuotas',
                'academic_level_id' => $basicLevel->id,
                'installments_count' => 3,
                'monthly_amount' => 400.00,
                'total_amount' => 1200.00,
                'discount_percentage' => 9.09, // Ahorro de S/ 120
                'duration_months' => 3,
                'late_fee_percentage' => 5.0, // 5% de mora mensual
                'grace_period_days' => 5,
                'is_active' => true,
                'description' => 'Pago en 3 cuotas mensuales con descuento moderado. 5 días de gracia.',
            ],
            [
                'name' => 'Plan Flexible - 6 Cuotas',
                'academic_level_id' => $basicLevel->id,
                'installments_count' => 6,
                'monthly_amount' => 220.00,
                'total_amount' => 1320.00,
                'discount_percentage' => 0,
                'duration_months' => 6,
                'late_fee_percentage' => 5.0,
                'grace_period_days' => 5,
                'is_active' => true,
                'description' => 'Cuotas más accesibles distribuidas en 6 meses. Sin descuento.',
            ],

            // ========== NIVEL INTERMEDIO ==========
            [
                'name' => 'Plan Premium - Pago al Contado',
                'academic_level_id' => $intermediateLevel->id,
                'installments_count' => 1,
                'monthly_amount' => 1400.00,
                'total_amount' => 1400.00,
                'discount_percentage' => 22.22,
                'duration_months' => 1,
                'late_fee_percentage' => 0,
                'grace_period_days' => 0,
                'is_active' => true,
                'description' => 'Pago único nivel intermedio con descuento especial.',
            ],
            [
                'name' => 'Plan Estándar - 3 Cuotas',
                'academic_level_id' => $intermediateLevel->id,
                'installments_count' => 3,
                'monthly_amount' => 550.00,
                'total_amount' => 1650.00,
                'discount_percentage' => 8.33,
                'duration_months' => 3,
                'late_fee_percentage' => 5.0,
                'grace_period_days' => 5,
                'is_active' => true,
                'description' => 'Plan de 3 meses para nivel intermedio.',
            ],
            [
                'name' => 'Plan Flexible - 6 Cuotas',
                'academic_level_id' => $intermediateLevel->id,
                'installments_count' => 6,
                'monthly_amount' => 300.00,
                'total_amount' => 1800.00,
                'discount_percentage' => 0,
                'duration_months' => 6,
                'late_fee_percentage' => 5.0,
                'grace_period_days' => 5,
                'is_active' => true,
                'description' => 'Cuotas mensuales accesibles para nivel intermedio.',
            ],

            // ========== NIVEL AVANZADO ==========
            [
                'name' => 'Plan Premium - Pago al Contado',
                'academic_level_id' => $advancedLevel->id,
                'installments_count' => 1,
                'monthly_amount' => 1800.00,
                'total_amount' => 1800.00,
                'discount_percentage' => 20.00,
                'duration_months' => 1,
                'late_fee_percentage' => 0,
                'grace_period_days' => 0,
                'is_active' => true,
                'description' => 'Pago único nivel avanzado con máximo descuento.',
            ],
            [
                'name' => 'Plan Estándar - 3 Cuotas',
                'academic_level_id' => $advancedLevel->id,
                'installments_count' => 3,
                'monthly_amount' => 700.00,
                'total_amount' => 2100.00,
                'discount_percentage' => 6.67,
                'duration_months' => 3,
                'late_fee_percentage' => 5.0,
                'grace_period_days' => 5,
                'is_active' => true,
                'description' => 'Plan de 3 meses para nivel avanzado.',
            ],
            [
                'name' => 'Plan Flexible - 6 Cuotas',
                'academic_level_id' => $advancedLevel->id,
                'installments_count' => 6,
                'monthly_amount' => 380.00,
                'total_amount' => 2280.00,
                'discount_percentage' => 0,
                'duration_months' => 6,
                'late_fee_percentage' => 5.0,
                'grace_period_days' => 5,
                'is_active' => true,
                'description' => 'Flexibilidad de pago para nivel avanzado.',
            ],
        ];

        foreach ($plans as $plan) {
            PaymentPlan::create($plan);
        }
    }
}

