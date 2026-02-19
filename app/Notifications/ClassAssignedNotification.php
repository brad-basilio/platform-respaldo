<?php

namespace App\Notifications;

use App\Models\ScheduledClass;
use App\Models\Student;
use App\Models\ClassTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Carbon\Carbon;

class ClassAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected ScheduledClass $scheduledClass;
    protected Student $student;
    protected ClassTemplate $template;

    /**
     * Create a new notification instance.
     */
    public function __construct(ScheduledClass $scheduledClass, Student $student, ClassTemplate $template)
    {
        $this->scheduledClass = $scheduledClass;
        $this->student = $student;
        $this->template = $template;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $scheduledAt = Carbon::parse($this->scheduledClass->scheduled_at);
        $studentName = $this->student->first_name . ' ' . $this->student->paternal_last_name;

        return (new MailMessage)
            ->subject('📚 Nueva clase asignada: ' . $this->template->title)
            ->greeting('¡Hola ' . $notifiable->name . '!')
            ->line('Se te ha asignado una nueva clase automáticamente.')
            ->line('')
            ->line('**Detalles de la clase:**')
            ->line('📖 **Clase:** ' . $this->template->title)
            ->line('📅 **Fecha:** ' . $scheduledAt->format('l, d \\d\\e F \\d\\e Y'))
            ->line('🕐 **Hora:** ' . $scheduledAt->format('h:i A'))
            ->line('👤 **Estudiante:** ' . $studentName)
            ->line('')
            ->action('Ver mis clases', url('/teacher/my-classes'))
            ->line('Recuerda tener tu link de Google Meet listo para la sesión.')
            ->salutation('¡Éxito en tu clase!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $scheduledAt = Carbon::parse($this->scheduledClass->scheduled_at);

        return [
            'type' => 'class_assigned',
            'scheduled_class_id' => $this->scheduledClass->id,
            'template_id' => $this->template->id,
            'template_title' => $this->template->title,
            'student_id' => $this->student->id,
            'student_name' => $this->student->first_name . ' ' . $this->student->paternal_last_name,
            'scheduled_at' => $scheduledAt->toISOString(),
            'scheduled_at_formatted' => $scheduledAt->format('d/m/Y H:i'),
            'message' => 'Nueva clase asignada: ' . $this->template->title . ' el ' . $scheduledAt->format('d/m/Y \\a \\l\\a\\s H:i'),
        ];
    }
}
