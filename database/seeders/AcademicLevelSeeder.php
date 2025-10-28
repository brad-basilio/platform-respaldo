<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AcademicLevel;

class AcademicLevelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $levels = [
            [
                'name' => 'Básico',
                'code' => 'basic',
                'description' => 'Nivel inicial para principiantes. Fundamentos del inglés.',
                'order' => 1,
                'color' => '#10B981', // Verde
                'is_active' => true,
            ],
            [
                'name' => 'Intermedio',
                'code' => 'intermediate',
                'description' => 'Nivel medio para estudiantes con conocimientos previos.',
                'order' => 2,
                'color' => '#F59E0B', // Naranja
                'is_active' => true,
            ],
            [
                'name' => 'Avanzado',
                'code' => 'advanced',
                'description' => 'Nivel avanzado para dominio del idioma.',
                'order' => 3,
                'color' => '#EF4444', // Rojo
                'is_active' => true,
            ],
        ];

        foreach ($levels as $level) {
            AcademicLevel::create($level);
        }
    }
}

