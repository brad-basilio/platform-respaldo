<?php

namespace App\Notifications;

use App\Models\InstallmentVoucher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class VoucherStatusChanged extends Notification
{
    use Queueable;

    public $voucher;
    public $action; // 'approved' | 'rejected'
    public $rejectionReason;

    /**
     * Create a new notification instance.
     */
    public function __construct(InstallmentVoucher $voucher, string $action, ?string $rejectionReason = null)
    {
        $this->voucher = $voucher;
        $this->action = $action;
        $this->rejectionReason = $rejectionReason;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        $installment = $this->voucher->installment;
        
        return [
            'type' => 'voucher_status_changed',
            'voucher_id' => $this->voucher->id,
            'installment_id' => $installment->id,
            'installment_number' => $installment->installment_number,
            'action' => $this->action,
            'status' => $this->voucher->status,
            'rejection_reason' => $this->rejectionReason,
            'message' => $this->action === 'approved' 
                ? "Tu voucher para la cuota #{$installment->installment_number} fue aprobado" 
                : "Tu voucher para la cuota #{$installment->installment_number} fue rechazado",
            'reviewed_by' => $this->voucher->reviewedBy?->name,
            'reviewed_at' => $this->voucher->reviewed_at,
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}