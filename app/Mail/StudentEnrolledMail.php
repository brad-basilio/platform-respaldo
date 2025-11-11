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

class StudentEnrolledMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Student $student,
        public User $user,
        public string $temporaryPassword
    ) {
        //
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '¡Felicidades! Ya puedes acceder al Aula Virtual 🎓',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Obtener template desde la base de datos
        $template = Setting::get('student_enrolled', '');
        
        /**
         * Variables disponibles para el template 'student_enrolled':
         * 
         * DATOS DEL ESTUDIANTE (Student model):
         * - $this->student->first_name            // string: Primer nombre
         * - $this->student->paternal_last_name    // string: Apellido paterno
         * - $this->student->maternal_last_name    // string|null: Apellido materno
         * - $this->student->enrollment_code       // string|null: Código de matrícula (ej: MAT-202411-1234)
         * - $this->student->phone_number          // string|null: Teléfono
         * - $this->student->document_number       // string|null: DNI/Documento
         * 
         * DATOS DEL USUARIO (User model):
         * - $this->user->email                    // string: Email (usado como usuario y contraseña)
         * - $this->user->name                     // string: Nombre completo del usuario
         * 
         * CONTRASEÑA TEMPORAL:
         * - $this->temporaryPassword              // string: Contraseña temporal (igual al email)
         * 
         * RELACIONES CARGADAS (deben estar loaded):
         * - $this->student->academicLevel         // AcademicLevel: Nivel académico
         * - $this->student->academicLevel->name   // string: Nombre del nivel (ej: "Básico 1", "Intermedio 2")
         * - $this->student->paymentPlan           // PaymentPlan: Plan de pago contratado
         * - $this->student->paymentPlan->name     // string: Nombre del plan (ej: "Plan Mensual", "Plan Trimestral")
         * 
         * CONFIGURACIÓN:
         * - config('app.url')                     // string: URL de la plataforma
         */
        
        // Reemplazar variables con valores reales
        $htmlContent = str_replace(
            [
                '{{nombre_estudiante}}',
                '{{codigo_matricula}}',
                '{{email}}',
                '{{contrasena}}',
                '{{url_plataforma}}',
                '{{nivel_academico}}',
                '{{plan_pago}}'
            ],
            [
                $this->student->first_name . ' ' . $this->student->paternal_last_name,
                $this->student->enrollment_code ?? 'Sin código',
                $this->user->email,
                $this->temporaryPassword,
                config('app.url'),
                $this->student->academicLevel->name ?? 'Sin nivel asignado',
                $this->student->paymentPlan->name ?? 'Sin plan asignado'
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
