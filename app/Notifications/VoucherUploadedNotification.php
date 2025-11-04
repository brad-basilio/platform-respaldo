<?php

namespace App\Notifications;

use App\Models\InstallmentVoucher;
use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class VoucherUploadedNotification extends Notification
{
    use Queueable;

    public $voucher;
    public $student;
    public $action;

    public function __construct(InstallmentVoucher $voucher, Student $student, string $action)
    {
        $this->voucher = $voucher;
        $this->student = $student;
        $this->action = $action;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        $installment = $this->voucher->installment;
        
        return [
            'type' => 'voucher_uploaded',
            'voucher_id' => $this->voucher->id,
            'student_id' => $this->student->id,
            'student_name' => $this->student->user->name ?? 'Estudiante',
            'student_code' => $this->student->enrollment_code,
            'installment_id' => $installment->id,
            'installment_number' => $installment->installment_number,
            'declared_amount' => $this->voucher->declared_amount,
            'action' => $this->action,
            'message' => $this->action === 'replaced' 
                ? "{$this->student->user->name} reemplazó un voucher para la cuota #{$installment->installment_number}"
                : "{$this->student->user->name} subió un nuevo voucher para la cuota #{$installment->installment_number}",
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}