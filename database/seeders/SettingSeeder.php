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
                'key' => 'prospect_welcome',
                'type' => 'mail',
                'content' => '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(135deg, #073372 0%, #17BC91 100%); padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">¡Bienvenido a InglésProf! 🎓</h1>
    </div>
    
    <div style="background-color: white; padding: 30px; border-radius: 0 0 15px 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Hola <strong>{{nombre_estudiante}}</strong>,</p>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
            ¡Estamos muy felices de que hayas decidido iniciar tu proceso de inscripción con nosotros! Has dado el primer paso hacia el dominio del inglés.
        </p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #073372; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #073372; margin-top: 0;">👤 Tu Asesor Personal</h3>
            <p style="margin: 5px 0;"><strong>Nombre:</strong> {{nombre_asesor}}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> {{email_asesor}}</p>
            <p style="margin: 5px 0;"><strong>Teléfono:</strong> {{telefono_asesor}}</p>
        </div>
        
        <h3 style="color: #073372; margin-top: 30px;">📋 ¿Qué sigue ahora?</h3>
        <ol style="color: #333; line-height: 1.8;">
            <li><strong>Evaluación de Nivel:</strong> Tu asesor coordinará contigo para realizar una evaluación y determinar el mejor nivel para ti.</li>
            <li><strong>Propuesta Personalizada:</strong> Recibirás una propuesta con el plan de estudios más adecuado para tus objetivos.</li>
            <li><strong>Matrícula:</strong> Una vez que elijas tu plan, te guiaremos en el proceso de matrícula.</li>
        </ol>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
            <strong>Fecha de registro:</strong> {{fecha_registro}}
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{url_plataforma}}" style="background: linear-gradient(135deg, #073372 0%, #17BC91 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                Visita Nuestra Plataforma
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
            No dudes en contactar a tu asesor si tienes alguna pregunta. ¡Estamos aquí para ayudarte! 😊
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #999; text-align: center;">
            Gracias por confiar en <strong>InglésProf</strong><br>
            ¡Estamos emocionados de ser parte de tu viaje hacia el dominio del inglés!
        </p>
    </div>
</div>',
                'description' => 'Email de bienvenida para nuevos prospectos',
            ],
            [
                'key' => 'welcome_email',
                'type' => 'mail',
                'content' => '<h2>¡Bienvenido a UNCED English Academy!</h2><p>Estimado/a {{nombre}},</p><p>Gracias por unirte a nosotros. Estamos emocionados de ser parte de tu aprendizaje del inglés.</p><p>Tu cuenta ha sido creada exitosamente con el correo: <strong>{{email}}</strong></p><p>Fecha de registro: {{fecha}}</p><p>¡Comenzamos juntos este viaje!</p><br/><p>Saludos,<br/>El equipo de UNCED English Academy</p>',
                'description' => 'Template de email de bienvenida para nuevos usuarios',
            ],
            [
                'key' => 'payment_reminder',
                'type' => 'mail',
                'content' => '<h2>Recordatorio de Pago Pendiente</h2><p>Estimado/a {{nombre}},</p><p>Te recordamos que tienes un pago pendiente por el monto de: <strong>S/ {{monto}}</strong></p><p>Fecha de vencimiento: <strong>{{fecha_vencimiento}}</strong></p><p>Para continuar con tu programa de inglés sin interrupciones, por favor realiza tu pago a la brevedad posible.</p><br/><p>Si ya realizaste tu pago, por favor ignora este mensaje.</p><br/><p>Saludos,<br/>El equipo de UNCED English Academy</p>',
                'description' => 'Template de recordatorio de pago pendiente',
            ],
            [
                'key' => 'enrollment_confirmation',
                'type' => 'mail',
                'content' => '<h2>Confirmación de Matrícula</h2><p>Estimado/a {{nombre}},</p><p>¡Felicidades! Tu matrícula ha sido confirmada exitosamente.</p><p><strong>Detalles de tu matrícula:</strong></p><ul><li>Código de matrícula: <strong>{{codigo_matricula}}</strong></li><li>Nivel: <strong>{{nivel}}</strong></li><li>Plan contratado: <strong>{{plan}}</strong></li></ul><p>Pronto recibirás más información sobre el inicio de clases y tu horario.</p><br/><p>¡Bienvenido/a a UNCED English Academy!</p><br/><p>Saludos,<br/>El equipo de UNCED English Academy</p>',
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
