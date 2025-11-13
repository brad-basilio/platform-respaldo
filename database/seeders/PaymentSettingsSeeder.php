<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            // ✅ Configuración de cambio de plan
            [
                'key' => 'plan_change_deadline_days',
                'type' => 'payment',
                'content' => '7',
                'description' => 'Días límite desde la matrícula para que el estudiante pueda cambiar de plan de pago (por defecto 7 días)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            
            // ✅ Configuración de pagos parciales
            [
                'key' => 'allow_partial_payments',
                'type' => 'payment',
                'content' => 'true',
                'description' => 'Permitir que los estudiantes realicen pagos parciales de cualquier monto aplicados al total del plan (true/false)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($settings as $setting) {
            DB::table('settings')->updateOrInsert(
                ['key' => $setting['key']],
                $setting
            );
        }

        $this->command->info('✅ Configuraciones de pagos creadas/actualizadas correctamente');
    }
}
