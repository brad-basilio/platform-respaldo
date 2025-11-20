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
    public string $emailContent;

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
        
        // Fallback: usar el view Blade
        return new Content(
            view: 'emails.contract',
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
