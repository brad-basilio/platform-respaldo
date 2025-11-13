<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DocumentType;

class DocumentTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'name' => 'Contrato',
                'code' => 'contract',
                'description' => 'Contrato de servicios educativos',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Reglamento',
                'code' => 'regulation',
                'description' => 'Reglamento interno de la institución',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Términos y Condiciones',
                'code' => 'terms',
                'description' => 'Términos y condiciones del servicio',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Ficha de Matrícula',
                'code' => 'enrollment_form',
                'description' => 'Formulario de matrícula',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'Autorización de Uso de Imagen',
                'code' => 'image_authorization',
                'description' => 'Autorización para uso de imagen',
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'name' => 'Otro',
                'code' => 'other',
                'description' => 'Otros documentos',
                'is_active' => true,
                'sort_order' => 99,
            ],
        ];

        foreach ($types as $type) {
            DocumentType::updateOrCreate(
                ['code' => $type['code']],
                $type
            );
        }
    }
}
