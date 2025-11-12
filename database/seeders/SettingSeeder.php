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
                'key' => 'student_enrolled',
                'type' => 'mail',
                'content' => '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(135deg, #073372 0%, #17BC91 100%); padding: 40px 30px; border-radius: 15px 15px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">¡Felicidades! 🎉</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0; font-size: 18px;">Ya tienes acceso al Aula Virtual</p>
    </div>
    
    <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <p style="font-size: 18px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            Hola <strong style="color: #073372;">{{nombre_estudiante}}</strong>,
        </p>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
            ¡Estamos muy emocionados de darte la bienvenida oficialmente! Tu matrícula ha sido procesada exitosamente y ya puedes acceder al aula virtual.
        </p>
        
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 5px solid #073372; padding: 25px; margin: 30px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(7, 51, 114, 0.1);">
            <h3 style="color: #073372; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
                <span style="background-color: #073372; color: white; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 20px;">🔐</span>
                Tus Credenciales de Acceso
            </h3>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-top: 15px;">
                <div style="margin-bottom: 15px;">
                    <p style="margin: 0 0 5px; color: #666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Usuario (Email)</p>
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #073372; font-family: monospace; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">{{email}}</p>
                </div>
                
                <div>
                    <p style="margin: 0 0 5px; color: #666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Contraseña Temporal</p>
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #17BC91; font-family: monospace; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">{{contrasena}}</p>
                </div>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 3px solid #f59e0b; padding: 15px; margin-top: 20px; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; color: #92400e; display: flex; align-items: start;">
                    <span style="font-size: 18px; margin-right: 10px; flex-shrink: 0;">⚠️</span>
                    <span><strong>Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.</span>
                </p>
            </div>
        </div>
        
        <div style="background-color: #f8fafc; border-radius: 10px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #073372; margin-top: 0; font-size: 18px;">📚 Información de tu Matrícula</h3>
            <div style="display: grid; gap: 10px;">
                <div style="display: flex; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                    <span style="color: #666; font-weight: 600; min-width: 140px;">Código:</span>
                    <span style="color: #073372; font-weight: bold;">{{codigo_matricula}}</span>
                </div>
                <div style="display: flex; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                    <span style="color: #666; font-weight: 600; min-width: 140px;">Nivel Académico:</span>
                    <span style="color: #333;">{{nivel_academico}}</span>
                </div>
                <div style="display: flex;">
                    <span style="color: #666; font-weight: 600; min-width: 140px;">Plan de Pago:</span>
                    <span style="color: #333;">{{plan_pago}}</span>
                </div>
            </div>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
            <a href="{{url_plataforma}}/login" style="background: linear-gradient(135deg, #073372 0%, #17BC91 100%); color: white; padding: 18px 50px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(7, 51, 114, 0.3); transition: all 0.3s ease;">
                🚀 Acceder al Aula Virtual
            </a>
        </div>
        
        <div style="background-color: #ecfdf5; border-left: 4px solid #17BC91; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h4 style="color: #065f46; margin-top: 0; font-size: 16px;">🎯 Próximos Pasos</h4>
            <ol style="color: #065f46; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Inicia sesión en el aula virtual con tus credenciales</li>
                <li>Completa tu perfil y cambia tu contraseña</li>
                <li>Revisa el material de tu nivel y el cronograma de clases</li>
                <li>Prepárate para comenzar tu aventura de aprendizaje</li>
            </ol>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #666; text-align: center; line-height: 1.6;">
            Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.<br>
            <strong style="color: #073372;">¡Estamos aquí para apoyarte en cada paso! 💪</strong>
        </p>
        
        <div style="text-align: center; margin-top: 30px;">
            <p style="font-size: 14px; color: #999; margin: 0;">
                Gracias por confiar en <strong style="color: #073372;">InglésProf</strong>
            </p>
            <p style="font-size: 13px; color: #999; margin: 10px 0 0; font-style: italic;">
                "Tu éxito es nuestro compromiso"
            </p>
        </div>
    </div>
</div>',
                'description' => 'Email de bienvenida con credenciales para estudiantes matriculados',
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

            // Contact Configuration
            [
                'key' => 'support_email',
                'type' => 'contact',
                'content' => 'soporte@institutodeingles.edu.pe',
                'description' => 'Email de soporte técnico para estudiantes',
            ],

            // ✅ Email when enrollment is verified (with documents)
            [
                'key' => 'enrollment_verified',
                'type' => 'email',
                'content' => '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #073372 0%, #17BC91 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">✅ ¡Matrícula Verificada!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tu inscripción ha sido aprobada</p>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hola <strong>{{nombre_estudiante}}</strong>,</p>
        
        <p style="font-size: 15px; margin-bottom: 20px;">
            ¡Excelentes noticias! Tu matrícula ha sido <strong style="color: #17BC91;">verificada exitosamente</strong> 
            por nuestro equipo administrativo.
        </p>
        
        <div style="background: #f0fdf4; border-left: 4px solid #17BC91; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #166534;">
                <strong>📋 Información de tu Matrícula:</strong>
            </p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #166534;">
                <li><strong>Código:</strong> {{codigo_matricula}}</li>
                <li><strong>Nivel:</strong> {{nivel_academico}}</li>
                <li><strong>Plan:</strong> {{plan_pago}}</li>
                <li><strong>Verificado por:</strong> {{verificado_por}}</li>
                <li><strong>Fecha:</strong> {{fecha_verificacion}}</li>
            </ul>
        </div>
        
        <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #9a3412;">
                <strong>⚠️ IMPORTANTE: Documentos Adjuntos</strong>
            </p>
            <p style="margin: 0; font-size: 14px; color: #9a3412;">
                Hemos adjuntado <strong>{{cantidad_documentos}} documento(s)</strong> que requieren tu atención. 
                Por favor:
            </p>
            <ol style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #9a3412;">
                <li>Descarga y revisa cada documento cuidadosamente</li>
                <li>Firma los documentos donde se indique</li>
                <li>Sube los documentos firmados a través de tu panel de estudiante</li>
            </ol>
        </div>
        
        <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #1e3a8a;">
                <strong>🔐 Recuerda tus credenciales de acceso:</strong>
            </p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #1e3a8a;">
                <li><strong>Usuario:</strong> {{email}}</li>
                <li><strong>Contraseña:</strong> {{email}}</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{url_plataforma}}" style="display: inline-block; background: linear-gradient(135deg, #073372 0%, #17BC91 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📤 Subir Documentos Firmados
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Si tienes alguna pregunta, no dudes en contactarnos.
        </p>
        
        <p style="font-size: 14px; color: #666;">
            Saludos cordiales,<br>
            <strong>Equipo de InglésProf</strong>
        </p>
    </div>
    
    <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
        <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
    </div>
</body>
</html>
                ',
                'description' => 'Email enviado cuando se verifica la matrícula del estudiante (con documentos adjuntos)',
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
            Setting::firstOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
