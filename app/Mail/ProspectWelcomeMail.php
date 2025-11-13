<?php

namespace App\Mail;

use App\Models\Student;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProspectWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Student $student,
        public User $salesAdvisor
    ) {
        //
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '¡Bienvenido a UNCED! 🎓 - Tu proceso de inscripción ha iniciado',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Obtener template desde la base de datos
        $template = Setting::get('prospect_welcome', '');
        
        // Reemplazar variables con valores reales
        $htmlContent = str_replace(
            [
                '{{nombre_estudiante}}',
                '{{nombre_asesor}}',
                '{{email_asesor}}',
                '{{telefono_asesor}}',
                '{{fecha_registro}}',
                '{{url_plataforma}}'
            ],
            [
                $this->student->firstName . ' ' . $this->student->paternalLastName,
                $this->salesAdvisor->name,
                $this->salesAdvisor->email,
                $this->salesAdvisor->phone ?? 'No especificado',
                \Carbon\Carbon::parse($this->student->registrationDate)->format('d/m/Y'),
                config('app.url')
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
        return [];
    }
}
