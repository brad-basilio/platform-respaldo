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

class ContractSignedAdvisorMail extends Mailable
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
            ->where('key', 'contract_signed_advisor')
            ->first();

        if ($template && $template->content) {
            $this->emailContent = $this->replaceVariables($template->content);
        }
    }

    private function replaceVariables(string $content): string
    {
        $advisorName = 'Asesor';
        if ($this->student->registeredBy) {
            $advisorName = $this->student->registeredBy->name;
        }

        $variables = [
            '{{nombre_asesor}}' => $advisorName,
            '{{nombre_estudiante}}' => $this->student->first_name . ' ' . $this->student->paternal_last_name,
            '{{codigo_matricula}}' => $this->student->enrollment_code ?? 'N/A',
            '{{nivel_academico}}' => $this->student->academicLevel->name ?? 'N/A',
            '{{plan_pago}}' => $this->student->paymentPlan->name ?? 'N/A',
            '{{fecha_firma}}' => date('d/m/Y H:i'),
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
            subject: '🎉 Tu estudiante ha firmado el contrato',
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

        return new Content(view: 'emails.contract-signed-advisor');
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [
            Attachment::fromStorageDisk('public', $this->pdfPath)
                ->as('Contrato_' . $this->student->enrollment_code . '.pdf')
                ->withMime('application/pdf')
        ];
    }
}
