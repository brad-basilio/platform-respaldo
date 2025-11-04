<?php

namespace App\Events;

use App\Models\InstallmentVoucher;
use App\Models\Student;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoucherUploaded implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $voucher;
    public $student;
    public $installment;
    public $action; // 'uploaded' | 'replaced'

    /**
     * Create a new event instance.
     */
    public function __construct(InstallmentVoucher $voucher, Student $student, $action = 'uploaded')
    {
        $this->voucher = $voucher;
        $this->student = $student;
        $this->installment = $voucher->installment;
        $this->action = $action;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        // Canal privado para todos los cajeros
        return [
            new PrivateChannel('cashiers'),
        ];
    }

    /**
     * Nombre del evento que se emitirá
     */
    public function broadcastAs(): string
    {
        return 'voucher.uploaded';
    }

    /**
     * Datos que se enviarán con el evento
     */
    public function broadcastWith(): array
    {
        return [
            'voucher_id' => $this->voucher->id,
            'student_id' => $this->student->id,
            'student_name' => $this->student->user->name ?? 'Estudiante',
            'student_code' => $this->student->enrollment_code,
            'installment_number' => $this->installment->installment_number,
            'declared_amount' => $this->voucher->declared_amount,
            'action' => $this->action,
            'message' => $this->action === 'replaced' 
                ? "{$this->student->user->name} reemplazó un voucher para la cuota #{$this->installment->installment_number}"
                : "{$this->student->user->name} subió un nuevo voucher para la cuota #{$this->installment->installment_number}",
            'timestamp' => now()->toISOString(),
        ];
    }
}
