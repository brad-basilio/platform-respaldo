<?php

namespace App\Mail;

use App\Models\Student;
use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ContractMail extends Mailable
{
    use Queueable, SerializesModels;

    public Student $student;
    public string $token;
    public string $contractUrl;
    public string $pdfPath;
    public ?string $emailContent = null;

    /**
     * Create a new message instance.
     */
    public function __construct(Student $student, string $token, string $pdfPath)
    {
        $this->student = $student;
        $this->token = $token;
        $this->pdfPath = $pdfPath;
        $this->contractUrl = url("/contract/accept/{$token}");
        
        // Obtener el template de email desde la base de datos
        $template = Setting::where('type', 'mail')
            ->where('key', 'contract_email')
            ->first();
        
        // Si existe el template en la BD, usarlo; si no, usar el Blade por defecto
        if ($template && $template->content) {
            $this->emailContent = $this->replaceVariables($template->content);
        } else {
            // Fallback: usar el template Blade estático
            $this->emailContent = null;
        }
    }

    /**
     * Reemplazar variables en el template de email
     */
    private function replaceVariables(string $content): string
    {
        $variables = [
            '{{nombre_estudiante}}' => $this->student->first_name . ' ' . $this->student->paternal_last_name,
            '{{codigo_matricula}}' => $this->student->enrollment_code ?? 'N/A',
            '{{nivel_academico}}' => $this->student->academicLevel->name ?? 'N/A',
            '{{plan_pago}}' => $this->student->paymentPlan->name ?? 'N/A',
            '{{url_contrato}}' => $this->contractUrl,
            '{{fecha_actual}}' => date('d/m/Y'),
            '{{email}}' => $this->student->user->email ?? 'N/A',
            '{{contrasena}}' =>  $this->student->user->email ?? 'N/A',
        ];

        foreach ($variables as $key => $value) {
            $content = str_replace($key, $value, $content);
        }

        return $content;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '📄 Contrato de Matrícula - Plataforma de Inglés',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Si hay contenido desde la BD, usarlo como HTML directo
        if ($this->emailContent) {
            return new Content(
                htmlString: $this->emailContent,
            );
        }
        
        // Fallback: crear un template HTML básico inline
        $fallbackHtml = "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #073372;'>📄 Contrato de Matrícula</h2>
                <p>Hola <strong>{$this->student->first_name} {$this->student->paternal_last_name}</strong>,</p>
                
                <p>Hemos generado tu contrato de matrícula. Por favor, revísalo y acéptalo haciendo clic en el siguiente enlace:</p>
                
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{$this->contractUrl}' 
                       style='background-color: #17BC91; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;'>
                        Ver y Aceptar Contrato
                    </a>
                </div>
                
                <p><strong>Detalles de tu matrícula:</strong></p>
                <ul>
                    <li>Código de Matrícula: <strong>{$this->student->enrollment_code}</strong></li>
                    <li>Nivel Académico: <strong>" . ($this->student->academicLevel->name ?? 'N/A') . "</strong></li>
                    <li>Plan de Pago: <strong>" . ($this->student->paymentPlan->name ?? 'N/A') . "</strong></li>
                </ul>
                
                <p>El contrato también se encuentra adjunto como PDF en este correo.</p>
                
                <p style='color: #666; font-size: 12px; margin-top: 30px;'>
                    Este es un correo automático. Por favor, no respondas a este mensaje.
                </p>
            </div>
        ";
        
        return new Content(
            htmlString: $fallbackHtml,
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [
            Attachment::fromStorageDisk('public', $this->pdfPath)
                ->as('Contrato_Matricula.pdf')
                ->withMime('application/pdf')
        ];
    }
}
