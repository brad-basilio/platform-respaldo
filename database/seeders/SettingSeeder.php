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
        <h1 style="color: white; margin: 0; font-size: 28px;">¡Bienvenido a UNCED! 🎓</h1>
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
            Gracias por confiar en <strong>UNCED</strong><br>
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
                Gracias por confiar en <strong style="color: #073372;">UNCED</strong>
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
                'type' => 'mail',
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
            <strong>Equipo de UNCED</strong>
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

            // ✅ Email for payment receipt
            [
                'key' => 'payment_receipt_email',
                'type' => 'mail',
                'content' => '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #073372 0%, #17BC91 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">💰 Pago Confirmado</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Hemos recibido tu pago exitosamente</p>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hola <strong>{{nombre_estudiante}}</strong>,</p>
        
        <p style="font-size: 15px; margin-bottom: 20px;">
            Te confirmamos que hemos recibido y verificado tu pago correctamente. 
            Adjunto a este correo encontrarás tu comprobante de pago.
        </p>
        
        <div style="background: #f0fdf4; border-left: 4px solid #17BC91; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #166534;">
                <strong>📋 Detalles del Pago:</strong>
            </p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #166534;">
                <li><strong>Monto:</strong> {{monto_pagado}}</li>
                <li><strong>Fecha:</strong> {{fecha_pago}}</li>
                <li><strong>Cuota:</strong> {{numero_cuota}}</li>
                <li><strong>Método:</strong> {{metodo_pago}}</li>
                <li><strong>Operación:</strong> {{codigo_operacion}}</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{url_plataforma}}" style="display: inline-block; background: linear-gradient(135deg, #073372 0%, #17BC91 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📱 Ver en la Plataforma
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Si tienes alguna duda sobre este pago, por favor contáctanos.
        </p>
        
        <p style="font-size: 14px; color: #666;">
            Saludos cordiales,<br>
            <strong>Equipo de UNCED</strong>
        </p>
    </div>
    
    <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
        <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
    </div>
</body>
</html>
                ',
                'description' => 'Email enviado al estudiante con el comprobante de pago adjunto',
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
            // ✅ Payment Schedule Template
            [
                'key' => 'payment_schedule_template',
                'type' => 'general',
                'content' => '<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
<!-- Contenedor principal -->
<div style="max-width: 800px; margin: 0 auto; padding: 25px; border: 1px solid #d1d5db;">

<!-- Encabezado -->
<table style="width: 100%; border-bottom: 3px solid #073372; padding-bottom: 20px; margin-bottom: 25px;" cellspacing="0" cellpadding="0">
<tr>
<td style="width: 70%; vertical-align: top;">
<img style="height: 60px; margin-bottom: 15px;" src="https://unced.online/logo.png" alt="UNCED">
<h1 style="font-size: 24px; font-weight: bold; color: #073372; margin: 8px 0 5px 0; text-transform: uppercase;">📅 CRONOGRAMA DE PAGOS</h1>
<p style="font-size: 14px; color: #666; margin: 5px 0; font-weight: bold;">Detalle completo de cuotas y estado de pagos</p>
</td>
<td style="width: 30%; vertical-align: top; text-align: right;">
<p style="font-size: 13px; color: #333; margin: 3px 0;"><strong>Fecha Generación:</strong> {{fecha_generacion}}</p>
<p style="font-size: 13px; color: #333; margin: 3px 0;"><strong>Código:</strong> {{codigo_cronograma}}</p>
<p style="font-size: 13px; color: #333; margin: 3px 0;"><strong>Versión:</strong> 1.0</p>
</td>
</tr>
</table>

<!-- Información del estudiante -->
<table style="width: 100%; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 4px; padding: 18px; margin-bottom: 25px;" cellspacing="0" cellpadding="0">
<tr>
<td style="width: 100%;">
<h3 style="color: #073372; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 1px solid #cbd5e1;">INFORMACIÓN DEL ESTUDIANTE</h3>
<table style="width: 100%;" cellspacing="0" cellpadding="0">
<tr>
<td style="width: 50%; vertical-align: top; padding-right: 10px;">
<p style="padding: 6px 0; font-size: 13px; margin: 0;"><strong style="color: #073372;">Estudiante:</strong> {{nombre_estudiante}}</p>
<p style="padding: 6px 0; font-size: 13px; margin: 0;"><strong style="color: #073372;">Código Matrícula:</strong> {{codigo_matricula}}</p>
<p style="padding: 6px 0; font-size: 13px; margin: 0;"><strong style="color: #073372;">Nivel Académico:</strong> {{nivel_academico}}</p>
</td>
<td style="width: 50%; vertical-align: top; padding-left: 10px;">
<p style="padding: 6px 0; font-size: 13px; margin: 0;"><strong style="color: #073372;">Plan de Pago:</strong> {{plan_pago}}</p>
<p style="padding: 6px 0; font-size: 13px; margin: 0;"><strong style="color: #073372;">Fecha Matrícula:</strong> {{fecha_matricula}}</p>
<p style="padding: 6px 0; font-size: 13px; margin: 0;"><strong style="color: #073372;">Asesor:</strong> {{nombre_asesor}}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- Resumen financiero -->
<table style="width: 100%; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 4px; padding: 18px; margin-bottom: 25px;" cellspacing="0" cellpadding="0">
<tr>
<td style="width: 100%;">
<h3 style="color: #073372; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 1px solid #cbd5e1;">RESUMEN FINANCIERO</h3>
<table style="width: 100%;" cellspacing="0" cellpadding="0">
<tr>
<td style="width: 33.33%; text-align: center; padding: 10px;">
<div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-top: 3px solid #073372;">
<div style="font-size: 12px; color: #073372; font-weight: bold; margin-bottom: 8px;">MONTO TOTAL</div>
<div style="font-size: 20px; color: #073372; font-weight: bold;">S/ {{monto_total}}</div>
</div>
</td>
<td style="width: 33.33%; text-align: center; padding: 10px;">
<div style="background: #f0fdf4; padding: 15px; border-radius: 6px; border-top: 3px solid #17BC91;">
<div style="font-size: 12px; color: #17bc91; font-weight: bold; margin-bottom: 8px;">TOTAL PAGADO</div>
<div style="font-size: 20px; color: #17bc91; font-weight: bold;">S/ {{total_pagado}}</div>
</div>
</td>
<td style="width: 33.33%; text-align: center; padding: 10px;">
<div style="background: #fff7ed; padding: 15px; border-radius: 6px; border-top: 3px solid #F98613;">
<div style="font-size: 12px; color: #f98613; font-weight: bold; margin-bottom: 8px;">TOTAL PENDIENTE</div>
<div style="font-size: 20px; color: #f98613; font-weight: bold;">S/ {{total_pendiente}}</div>
</div>
</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- Tabla de cuotas -->
<div style="width: 100%; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 25px; padding: 0;">
<h3 style="color: #073372; font-size: 16px; font-weight: bold; margin: 0; padding: 15px 18px; border-bottom: 1px solid #cbd5e1;">DETALLE DE CUOTAS</h3>
<table style="width: 100%; border-collapse: collapse;" cellspacing="0" cellpadding="0">
<thead>
<tr style="background: #f1f5f9;">
<th style="padding: 12px 10px; font-size: 12px; font-weight: bold; color: #073372; text-align: center; border-bottom: 2px solid #cbd5e1; width: 8%;">Cuota #</th>
<th style="padding: 12px 10px; font-size: 12px; font-weight: bold; color: #073372; text-align: left; border-bottom: 2px solid #cbd5e1; width: 20%;">Concepto</th>
<th style="padding: 12px 10px; font-size: 12px; font-weight: bold; color: #073372; text-align: right; border-bottom: 2px solid #cbd5e1; width: 12%;">Monto</th>
<th style="padding: 12px 10px; font-size: 12px; font-weight: bold; color: #073372; text-align: center; border-bottom: 2px solid #cbd5e1; width: 13%;">Fecha Venc.</th>
<th style="padding: 12px 10px; font-size: 12px; font-weight: bold; color: #073372; text-align: center; border-bottom: 2px solid #cbd5e1; width: 13%;">Fecha Pago</th>
<th style="padding: 12px 10px; font-size: 12px; font-weight: bold; color: #073372; text-align: right; border-bottom: 2px solid #cbd5e1; width: 12%;">Monto Pagado</th>
<th style="padding: 12px 10px; font-size: 12px; font-weight: bold; color: #073372; text-align: center; border-bottom: 2px solid #cbd5e1; width: 12%;">Estado</th>
</tr>
</thead>
<tbody>
<tr><td colspan="7">{{filas_cuotas}}</td></tr>
</tbody>
</table>
</div>

<!-- Información de pagos -->
<table style="width: 100%; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px; padding: 18px; margin-bottom: 25px;" cellspacing="0" cellpadding="0">
<tr>
<td style="width: 100%;">
<h3 style="color: #073372; font-size: 15px; font-weight: bold; margin: 0 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid #7dd3fc;">INFORMACIÓN PARA PAGOS</h3>
<table style="width: 100%;" cellspacing="0" cellpadding="0">
<tr>
<td style="width: 50%; vertical-align: top; padding-right: 15px;">
<p style="font-size: 13px; color: #073372; margin: 0 0 8px 0; font-weight: bold;">Métodos de Pago Disponibles:</p>
<ul style="font-size: 12px; color: #333; margin: 0; padding-left: 20px;">
<li>Transferencia Bancaria</li>
<li>Yape / Plin</li>
<li>Tarjeta de Crédito/Débito</li>
<li>Pago en efectivo (Oficina)</li>
</ul>
</td>
<td style="width: 50%; vertical-align: top; padding-left: 15px; border-left: 1px solid #7dd3fc;">
<p style="font-size: 13px; color: #073372; margin: 0 0 8px 0; font-weight: bold;">Datos Bancarios:</p>
<p style="font-size: 12px; color: #333; margin: 4px 0;"><strong>Banco:</strong> BCP</p>
<p style="font-size: 12px; color: #333; margin: 4px 0;"><strong>Cuenta:</strong> 123-456789-01-23</p>
<p style="font-size: 12px; color: #333; margin: 4px 0;"><strong>CCI:</strong> 00212300456789012345</p>
</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- Términos y condiciones -->
<table style="width: 100%; background: #fefce8; border: 1px solid #fde047; border-radius: 4px; padding: 15px; margin-bottom: 20px;" cellspacing="0" cellpadding="0">
<tr>
<td style="width: 100%;">
<p style="font-size: 11px; color: #713f12; margin: 0; text-align: center; line-height: 1.4;"><strong>IMPORTANTE:</strong> Este cronograma es informativo y está sujeto a cambios según las políticas de la institución. Los pagos vencidos generarán intereses moratorios del 1% mensual. Para consultas contactar a su asesor.</p>
</td>
</tr>
</table>

<!-- Pie de página -->
<table style="width: 100%; border-top: 2px solid #073372; padding-top: 15px;" cellspacing="0" cellpadding="0">
<tr>
<td style="text-align: center;">
<p style="font-size: 12px; color: #666; margin: 5px 0; line-height: 1.4;"><strong>UNCED ENGLISH ACADEMY</strong><br>Av. Ejemplo 123, San Isidro, Lima - Perú<br>Central: (01) 234-5678 | WhatsApp: +51 987 654 321<br>Email: pagos@unced.edu.pe | Web: www.unced.edu.pe</p>
<p style="font-size: 10px; color: #999; margin: 8px 0 0 0; font-style: italic; line-height: 1.4;">"Tu futuro habla inglés" - Documento generado automáticamente el {{fecha_generacion}}</p>
</td>
</tr>
</table>

</div>
</body>
</html>',
                'description' => 'Plantilla HTML para el cronograma de pagos de estudiantes',
            ],
            
            // ✅ PDF Receipt Template
            [
                'key' => 'payment_receipt_template',
                'type' => 'general',
                'content' => '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; line-height: 1.3; }
        .container { width: 100%; padding: 10px; }
        
        /* Header */
        .header-table { width: 100%; margin-bottom: 15px; }
        .logo-section { width: 60%; vertical-align: top; }
        .logo-section img { max-height: 70px; margin-bottom: 5px; }
        .company-name { font-size: 14px; font-weight: bold; color: #073372; }
        .company-address { font-size: 10px; color: #555; }
        
        /* RUC Box */
        .ruc-box { 
            width: 38%; 
            border: 1px solid #073372; 
            border-radius: 8px; 
            text-align: center; 
            padding: 10px 0; 
            background-color: #fff;
        }
        .ruc-number { font-size: 12px; font-weight: bold; margin-bottom: 3px; }
        .doc-type { 
            font-size: 14px; 
            font-weight: bold; 
            background-color: #073372; 
            color: #fff; 
            padding: 3px 0; 
            margin: 3px 0; 
            display: block;
        }
        .doc-number { font-size: 12px; font-weight: bold; margin-top: 3px; }
        
        /* Client Info */
        .client-info { 
            width: 100%; 
            border: 1px solid #ccc; 
            border-radius: 5px; 
            padding: 8px; 
            margin-bottom: 15px; 
        }
        .info-table { width: 100%; }
        .info-table td { padding: 2px 0; vertical-align: top; }
        .label { font-weight: bold; width: 110px; color: #444; }
        
        /* Items Table */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .items-table th { 
            background-color: #073372; 
            color: white; 
            padding: 5px; 
            text-align: center; 
            font-size: 10px;
            border: 1px solid #073372;
        }
        .items-table td { 
            padding: 5px; 
            border: 1px solid #ccc; 
            font-size: 10px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        /* Totals */
        .totals-table { width: 100%; margin-top: 5px; }
        .totals-table td { padding: 3px; }
        .total-label { font-weight: bold; text-align: right; padding-right: 10px; font-size: 10px; }
        .total-amount { font-weight: bold; text-align: right; width: 80px; border: 1px solid #ccc; padding: 3px; background: #eee; }
        
        /* Footer */
        .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 9px; color: #666; }
        .hash-box { margin-top: 10px; font-family: monospace; font-size: 9px; text-align: center; color: #555; }
        
        .qr-placeholder {
            width: 80px;
            height: 80px;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            color: #ccc;
            font-size: 9px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <table class="header-table">
            <tr>
                <td class="logo-section">
                    <img src="https://unced.online/logo.png" alt="UNCED Logo">
                    <div class="company-name">UNCED ENGLISH ACADEMY S.A.C.</div>
                    <div class="company-address">
                        Av. La Marina 1234, San Miguel, Lima<br>
                        Teléfono: (01) 555-1234 | Email: administracion@unced.edu.pe<br>
                        Web: www.unced.edu.pe
                    </div>
                </td>
                <td style="vertical-align: top; text-align: right;">
                    <div class="ruc-box">
                        <div class="ruc-number">R.U.C. 20601234567</div>
                        <div class="doc-type">BOLETA DE VENTA ELECTRÓNICA</div>
                        <div class="doc-number">{{numero_comprobante}}</div>
                    </div>
                </td>
            </tr>
        </table>
        
        <!-- Client Info -->
        <div class="client-info">
            <table class="info-table">
                <tr>
                    <td width="60%">
                        <table>
                            <tr><td class="label">Señor(es):</td><td>{{nombre_estudiante}}</td></tr>
                            <tr><td class="label">{{tipo_documento}}:</td><td>{{numero_documento}}</td></tr>
                            <tr><td class="label">Dirección:</td><td>{{direccion_cliente}}</td></tr>
                        </table>
                    </td>
                    <td width="40%">
                        <table>
                            <tr><td class="label">Fecha Emisión:</td><td>{{fecha_emision}}</td></tr>
                            <tr><td class="label">Moneda:</td><td>SOLES</td></tr>
                            <tr><td class="label">Forma de Pago:</td><td>{{metodo_pago}}</td></tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- Items -->
        <table class="items-table">
            <thead>
                <tr>
                    <th width="10%">CANT.</th>
                    <th width="10%">UNIDAD</th>
                    <th width="50%">DESCRIPCIÓN</th>
                    <th width="15%">V. UNITARIO</th>
                    <th width="15%">V. VENTA</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="text-center">1</td>
                    <td class="text-center">NIU</td>
                    <td>{{descripcion_servicio}}</td>
                    <td class="text-right">{{valor_venta}}</td>
                    <td class="text-right">{{valor_venta}}</td>
                </tr>
            </tbody>
        </table>
        
        <!-- Totals -->
        <table class="totals-table">
            <tr>
                <td width="65%" style="vertical-align: top; font-size: 10px; color: #555;">
                    <div style="border: 1px solid #eee; padding: 5px; background: #f9f9f9;">
                        <strong>SON:</strong> {{importe_total}} SOLES
                        <br><br>
                        <strong>Observaciones:</strong><br>
                        Operación: {{codigo_operacion}}<br>
                        Fecha Pago: {{fecha_pago}}
                    </div>
                    <div class="hash-box">
                        Resumen: {{hash_comprobante}}<br>
                        Autorización: {{fecha_autorizacion}}
                    </div>
                </td>
                <td width="35%">
                    <table width="100%">
                        <tr>
                            <td class="total-label">OP. GRAVADA:</td>
                            <td class="text-right">S/ {{op_gravada}}</td>
                        </tr>
                        <tr>
                            <td class="total-label">OP. EXONERADA:</td>
                            <td class="text-right">S/ 0.00</td>
                        </tr>
                        <tr>
                            <td class="total-label">I.G.V. (18%):</td>
                            <td class="text-right">S/ {{igv}}</td>
                        </tr>
                        <tr>
                            <td class="total-label" style="font-size: 12px; color: #073372;">IMPORTE TOTAL:</td>
                            <td class="total-amount" style="color: #073372;">S/ {{importe_total}}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <!-- Footer -->
        <div class="footer">
            <table width="100%">
                <tr>
                    <td width="80%" style="vertical-align: middle;">
                        Representación impresa de la BOLETA DE VENTA ELECTRÓNICA, generado desde el sistema de facturación de UNCED.<br>
                        Puede consultar este documento en www.unced.edu.pe/comprobantes<br>
                        Autorizado mediante Resolución de Intendencia N° 034-005-0005315
                    </td>
                    <td width="20%" align="center">
                        <!-- QR Placeholder -->
                        <div style="border: 1px solid #ccc; width: 60px; height: 60px; text-align: center; line-height: 60px; font-size: 8px;">QR CODE</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>
                ',
                'description' => 'Plantilla HTML profesional para generar el PDF del comprobante de pago (Estilo SUNAT)',
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
