<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ContractAcceptance extends Model
{
    protected $fillable = [
        'student_id',
        'token',
        'contract_content',
        'pdf_path',
        'accepted_at',
        'ip_address',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
    ];

    /**
     * Relación con Student
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Generar token único
     */
    public static function generateToken(): string
    {
        return Str::random(64);
    }

    /**
     * Verificar si el contrato ya fue aceptado
     */
    public function isAccepted(): bool
    {
        return !is_null($this->accepted_at);
    }

    /**
     * Marcar contrato como aceptado
     */
    public function markAsAccepted(string $ipAddress): void
    {
        $this->update([
            'accepted_at' => now(),
            'ip_address' => $ipAddress,
        ]);
    }
}
