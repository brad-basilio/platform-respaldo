<?php

namespace App\Notifications;

use App\Models\ContractAcceptance;
use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class ContractSignedNotification extends Notification
{
    // use Queueable;

    public $contractAcceptance;
    public $student;

    public function __construct(ContractAcceptance $contractAcceptance, Student $student)
    {
        $this->contractAcceptance = $contractAcceptance;
        $this->student = $student;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'contract_signed',
            'contract_acceptance_id' => $this->contractAcceptance->id,
            'student_id' => $this->student->id,
            'student_name' => $this->student->user->name ?? 'Estudiante',
            'message' => "{$this->student->user->name} ha firmado su contrato. Pendiente de revisión.",
            'pdf_path' => $this->contractAcceptance->pdf_path,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
