<?php

namespace App\Events;

use App\Models\ContractAcceptance;
use App\Models\Student;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ContractSignedByStudent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public ContractAcceptance $contractAcceptance;
    public Student $student;

    /**
     * Create a new event instance.
     */
    public function __construct(ContractAcceptance $contractAcceptance, Student $student)
    {
        $this->contractAcceptance = $contractAcceptance;
        $this->student = $student;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('advisor.' . $this->student->registered_by),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'contract_acceptance_id' => $this->contractAcceptance->id,
            'student_id' => $this->student->id,
            'student_name' => $this->student->user->name,
            'pdf_path' => $this->contractAcceptance->pdf_path,
            'signed_at' => $this->contractAcceptance->accepted_at,
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'contract.signed';
    }
}
