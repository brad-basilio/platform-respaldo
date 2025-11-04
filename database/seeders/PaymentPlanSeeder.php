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
        // Los planes de pago ahora son independientes del nivel académico
        // Se aplican al curso completo, no a un nivel específico
        
        // LÓGICA DE INTERESES:
        // - Pago al contado (1 cuota): SIN intereses - precio base S/ 1800
        // - Pago en 3 meses: Interés del 5% - S/ 1890
        // - Pago en 6 meses: Interés del 10% - S/ 1980
        // - Pago en 9 meses: Interés del 15% - S/ 2070
        // - Pago en 12 meses: Interés del 20% - S/ 2160

        $basePrice = 1800.00; // Precio base del curso sin intereses

        $plans = [
            // ========== PAGO AL CONTADO - SIN INTERESES ==========
            [
                'name' => 'Pago al Contado',
                'academic_level_id' => null,
                'installments_count' => 1,
                'monthly_amount' => $basePrice,
                'total_amount' => $basePrice,
                'discount_percentage' => 0, // Sin descuento, precio base
                'duration_months' => 1,
                'late_fee_percentage' => 0, // Sin mora (pago único)
                'grace_period_days' => 0,
                'is_active' => true,
                'description' => 'Pago único sin intereses. Precio base del curso.',
            ],
            
            // ========== PAGO EN 3 MESES - 5% INTERÉS ==========
            [
                'name' => 'Plan 3 Meses',
                'academic_level_id' => null,
                'installments_count' => 3,
                'monthly_amount' => 630.00, // 1890 / 3
                'total_amount' => 1890.00,  // 1800 + 5% = 1890
                'discount_percentage' => 0,  // Aquí representamos que tiene interés
                'duration_months' => 3,
                'late_fee_percentage' => 5.0, // 5% de mora mensual
                'grace_period_days' => 5,
                'is_active' => true,
                'description' => 'Pago en 3 cuotas mensuales. Incluye 5% de interés sobre el precio base.',
            ],
            
            // ========== PAGO EN 6 MESES - 10% INTERÉS ==========
            [
                'name' => 'Plan 6 Meses',
                'academic_level_id' => null,
                'installments_count' => 6,
                'monthly_amount' => 330.00, // 1980 / 6
                'total_amount' => 1980.00,  // 1800 + 10% = 1980
                'discount_percentage' => 0,
                'duration_months' => 6,
                'late_fee_percentage' => 5.0,
                'grace_period_days' => 5,
                'is_active' => true,
                'description' => 'Pago en 6 cuotas mensuales. Incluye 10% de interés sobre el precio base.',
            ],
            
            // ========== PAGO EN 9 MESES - 15% INTERÉS ==========
            [
                'name' => 'Plan 9 Meses',
                'academic_level_id' => null,
                'installments_count' => 9,
                'monthly_amount' => 230.00, // 2070 / 9
                'total_amount' => 2070.00,  // 1800 + 15% = 2070
                'discount_percentage' => 0,
                'duration_months' => 9,
                'late_fee_percentage' => 5.0,
                'grace_period_days' => 5,
                'is_active' => true,
                'description' => 'Pago en 9 cuotas mensuales. Incluye 15% de interés sobre el precio base.',
            ],
            
            // ========== PAGO EN 12 MESES - 20% INTERÉS ==========
            [
                'name' => 'Plan 12 Meses',
                'academic_level_id' => null,
                'installments_count' => 12,
                'monthly_amount' => 180.00, // 2160 / 12
                'total_amount' => 2160.00,  // 1800 + 20% = 2160
                'discount_percentage' => 0,
                'duration_months' => 12,
                'late_fee_percentage' => 5.0,
                'grace_period_days' => 5,
                'is_active' => true,
                'description' => 'Pago en 12 cuotas mensuales. Incluye 20% de interés sobre el precio base.',
            ],
        ];

        foreach ($plans as $plan) {
            PaymentPlan::create($plan);
        }
    }
}

