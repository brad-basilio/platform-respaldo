<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Setting;

class ContractSignedEmailTemplatesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Email para estudiante - confirmación
        $studentTemplate = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
<div style="background: linear-gradient(135deg, #073372 0%, #17BC91 100%); padding: 30px; text-align: center; color: white;">
<h1 style="margin: 0;">✅ ¡Contrato Firmado!</h1>
<p style="margin: 10px 0 0 0;">Tu matrícula ha sido confirmada</p>
</div>
<div style="padding: 30px;">
<p>Hola <strong>{{nombre_estudiante}}</strong>,</p>
<p>¡Felicitaciones! Has firmado exitosamente tu contrato de matrícula.</p>
<div style="background: #f0f9ff; border-left: 4px solid #073372; padding: 15px; margin: 20px 0;">
<strong>Detalles:</strong><br>
Código: {{codigo_matricula}}<br>
Nivel: {{nivel_academico}}<br>
Plan: {{plan_pago}}<br>
Fecha: {{fecha_actual}}
</div>
<p><strong>📎</strong> Contrato firmado adjunto en PDF.</p>
</div>
</div>';

        Setting::updateOrCreate(
            ['type' => 'mail', 'key' => 'contract_signed_student'],
            ['content' => $studentTemplate]
        );

        // 2. Email para admin
        $adminTemplate = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
<div style="background: linear-gradient(135deg, #073372 0%, #17BC91 100%); padding: 30px; text-align: center; color: white;">
<h1 style="margin: 0;">📝 Nuevo Contrato Firmado</h1>
<p style="margin: 10px 0 0 0;">Notificación Administrativa</p>
</div>
<div style="padding: 30px;">
<p>Hola Administrador,</p>
<p>Un estudiante ha firmado digitalmente su contrato.</p>
<div style="background: #f0f9ff; border-left: 4px solid #073372; padding: 15px; margin: 20px 0;">
<strong>Información:</strong><br>
Estudiante: {{nombre_estudiante}}<br>
Código: {{codigo_matricula}}<br>
Nivel: {{nivel_academico}}<br>
Plan: {{plan_pago}}<br>
Asesor: {{asesor}}<br>
Fecha Firma: {{fecha_firma}}
</div>
<p><strong>📎</strong> Contrato adjunto.</p>
</div>
</div>';

        Setting::updateOrCreate(
            ['type' => 'mail', 'key' => 'contract_signed_admin'],
            ['content' => $adminTemplate]
        );

        // 3. Email para asesor
        $advisorTemplate = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
<div style="background: linear-gradient(135deg, #17BC91 0%, #073372 100%); padding: 30px; text-align: center; color: white;">
<h1 style="margin: 0;">🎉 ¡Excelente Noticia!</h1>
<p style="margin: 10px 0 0 0;">Tu estudiante firmó el contrato</p>
</div>
<div style="padding: 30px;">
<p>Hola <strong>{{nombre_asesor}}</strong>,</p>
<p>¡Felicitaciones! Tu estudiante <strong>{{nombre_estudiante}}</strong> ha firmado su contrato de matrícula.</p>
<div style="background: #f0fdf4; border-left: 4px solid #17BC91; padding: 15px; margin: 20px 0;">
<strong>✅ Matrícula Completada:</strong><br>
Estudiante: {{nombre_estudiante}}<br>
Código: {{codigo_matricula}}<br>
Nivel: {{nivel_academico}}<br>
Plan: {{plan_pago}}<br>
Firmado: {{fecha_firma}}
</div>
<p><strong>📎</strong> Contrato firmado adjunto.</p>
</div>
</div>';

        Setting::updateOrCreate(
            ['type' => 'mail', 'key' => 'contract_signed_advisor'],
            ['content' => $advisorTemplate]
        );

        $this->command->info('✅ Templates de emails de contrato firmado creados exitosamente');
        $this->command->info('   - contract_signed_student (5 variables)');
        $this->command->info('   - contract_signed_admin (6 variables)');
        $this->command->info('   - contract_signed_advisor (6 variables)');
    }
}
