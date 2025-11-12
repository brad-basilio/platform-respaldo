<?php

namespace App\Mail;

use App\Models\Student;
use App\Models\User;
use App\Models\Setting;
use App\Models\EnrollmentDocument;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class EnrollmentVerifiedMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Student $student,
        public User $user,
        public User $verifier,
        public Collection $documents
    ) {
        //
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '✅ ¡Tu Matrícula ha sido Verificada! - Documentos para Firma',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Obtener template desde la base de datos
        $template = Setting::get('enrollment_verified', $this->getDefaultTemplate());
        
        /**
         * Variables disponibles para el template 'enrollment_verified':
         * 
         * - {{nombre_estudiante}}      // Nombre completo del estudiante
         * - {{codigo_matricula}}       // Código de matrícula
         * - {{email}}                  // Email del estudiante
         * - {{verificado_por}}         // Nombre del verificador
         * - {{fecha_verificacion}}     // Fecha de verificación
         * - {{url_plataforma}}         // URL de la plataforma
         * - {{nivel_academico}}        // Nivel académico
         * - {{plan_pago}}              // Plan de pago
         * - {{cantidad_documentos}}    // Número de documentos adjuntos
         */
        
        // Reemplazar variables con valores reales
        $htmlContent = str_replace(
            [
                '{{nombre_estudiante}}',
                '{{codigo_matricula}}',
                '{{email}}',
                '{{verificado_por}}',
                '{{fecha_verificacion}}',
                '{{url_plataforma}}',
                '{{nivel_academico}}',
                '{{plan_pago}}',
                '{{cantidad_documentos}}'
            ],
            [
                $this->student->first_name . ' ' . $this->student->paternal_last_name,
                $this->student->enrollment_code ?? 'Sin código',
                $this->user->email,
                $this->verifier->name,
                now()->format('d/m/Y H:i'),
                config('app.url'),
                $this->student->academicLevel->name ?? 'Sin nivel asignado',
                $this->student->paymentPlan->name ?? 'Sin plan asignado',
                $this->documents->count()
            ],
            $template
        );
        
        return new Content(
            htmlString: $htmlContent,
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return $this->documents->map(function (EnrollmentDocument $document) {
            $filePath = storage_path('app/public/' . $document->file_path);
            
            return Attachment::fromPath($filePath)
                ->as($document->file_name)
                ->withMime('application/pdf'); // Asumimos PDFs, ajustar según necesidad
        })->toArray();
    }

    /**
     * Template por defecto si no existe en base de datos
     */
    private function getDefaultTemplate(): string
    {
        return '
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
        ';
    }
}
