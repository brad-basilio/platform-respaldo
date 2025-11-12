<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Setting;

class SupportEmailSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Setting::updateOrCreate(
            ['key' => 'support_email'],
            [
                'content' => 'soporte@institutodeingles.edu.pe',
                'type' => 'contact',
                'description' => 'Email de soporte técnico para estudiantes',
            ]
        );

        $this->command->info('✅ Email de soporte agregado/actualizado correctamente.');
    }
}
