<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            // Mail Templates
            [
                'key' => 'welcome_email',
                'type' => 'mail',
                'content' => '<h2>¡Bienvenido a UNCED English Academy!</h2><p>Estimado/a {nombre},</p><p>Gracias por unirte a nosotros. Estamos emocionados de ser parte de tu aprendizaje del inglés.</p><p>Tu cuenta ha sido creada exitosamente con el correo: <strong>{email}</strong></p><p>Fecha de registro: {fecha}</p><p>¡Comenzamos juntos este viaje!</p><br/><p>Saludos,<br/>El equipo de UNCED English Academy</p>',
                'description' => 'Template de email de bienvenida para nuevos usuarios',
            ],
            [
                'key' => 'payment_reminder',
                'type' => 'mail',
                'content' => '<h2>Recordatorio de Pago Pendiente</h2><p>Estimado/a {nombre},</p><p>Te recordamos que tienes un pago pendiente por el monto de: <strong>S/ {monto}</strong></p><p>Fecha de vencimiento: <strong>{fecha_vencimiento}</strong></p><p>Para continuar con tu programa de inglés sin interrupciones, por favor realiza tu pago a la brevedad posible.</p><br/><p>Si ya realizaste tu pago, por favor ignora este mensaje.</p><br/><p>Saludos,<br/>El equipo de UNCED English Academy</p>',
                'description' => 'Template de recordatorio de pago pendiente',
            ],
            [
                'key' => 'enrollment_confirmation',
                'type' => 'mail',
                'content' => '<h2>Confirmación de Matrícula</h2><p>Estimado/a {nombre},</p><p>¡Felicidades! Tu matrícula ha sido confirmada exitosamente.</p><p><strong>Detalles de tu matrícula:</strong></p><ul><li>Código de matrícula: <strong>{codigo_matricula}</strong></li><li>Nivel: <strong>{nivel}</strong></li><li>Plan contratado: <strong>{plan}</strong></li></ul><p>Pronto recibirás más información sobre el inicio de clases y tu horario.</p><br/><p>¡Bienvenido/a a UNCED English Academy!</p><br/><p>Saludos,<br/>El equipo de UNCED English Academy</p>',
                'description' => 'Template de confirmación de matrícula',
            ],
            
            // WhatsApp Configuration
            [
                'key' => 'whatsapp_number',
                'type' => 'whatsapp',
                'content' => '+51987654321',
                'description' => 'Número de WhatsApp para contacto',
            ],
            [
                'key' => 'whatsapp_message',
                'type' => 'whatsapp',
                'content' => 'Hola! Estoy interesado en información sobre los cursos de inglés. ¿Podrían brindarme más detalles sobre niveles, horarios y costos?',
                'description' => 'Mensaje predeterminado de WhatsApp',
            ],
            
            // General Configuration
            [
                'key' => 'site_name',
                'type' => 'general',
                'content' => 'UNCED English Academy',
                'description' => 'Nombre del sitio',
            ],
            [
                'key' => 'site_description',
                'type' => 'general',
                'content' => 'Plataforma de gestión de cursos de inglés profesional',
                'description' => 'Descripción del sitio',
            ],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
