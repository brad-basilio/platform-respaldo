<?php

namespace App\Mail;

use App\Models\Student;
use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContractSignedStudentMail extends Mailable
{
    use Queueable, SerializesModels;

    public Student $student;
    public string $pdfPath;
    private ?string $emailContent = null;

    /**
     * Create a new message instance.
     */
    public function __construct(Student $student, string $pdfPath)
    {
        $this->student = $student;
        $this->pdfPath = $pdfPath;

        // Cargar template de email desde settings
        $template = Setting::where('type', 'mail')
            ->where('key', 'contract_signed_student')
            ->first();

        if ($template && $template->content) {
            $this->emailContent = $this->replaceVariables($template->content);
        }
    }

    private function replaceVariables(string $content): string
    {
        $variables = [
            '{{nombre_estudiante}}' => $this->student->first_name . ' ' . $this->student->paternal_last_name,
            '{{codigo_matricula}}' => $this->student->enrollment_code ?? 'N/A',
            '{{nivel_academico}}' => $this->student->academicLevel->name ?? 'N/A',
            '{{plan_pago}}' => $this->student->paymentPlan->name ?? 'N/A',
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
            subject: '✅ Contrato Firmado - Matrícula Confirmada',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        if ($this->emailContent) {
            return new Content(htmlString: $this->emailContent);
        }

        return new Content(view: 'emails.contract-signed-student');
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [
            Attachment::fromStorageDisk('public', $this->pdfPath)
                ->as('Contrato_Firmado.pdf')
                ->withMime('application/pdf')
        ];
    }
}
