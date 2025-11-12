<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnrollmentDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'uploaded_by',
        'document_type',
        'document_name',
        'file_path',
        'file_name',
        'description',
        'requires_signature',
        'student_confirmed',
        'confirmed_at',
        'signed_file_path',
        'signed_file_name',
    ];

    protected $casts = [
        'requires_signature' => 'boolean',
        'student_confirmed' => 'boolean',
        'confirmed_at' => 'datetime',
    ];

    /**
     * Relación con el estudiante
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Usuario que subió el documento (verifier/admin)
     */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Confirmar documento (estudiante)
     */
    public function confirm(?string $signedFilePath = null, ?string $signedFileName = null): void
    {
        $this->update([
            'student_confirmed' => true,
            'confirmed_at' => now(),
            'signed_file_path' => $signedFilePath,
            'signed_file_name' => $signedFileName,
        ]);
    }

    /**
     * Verificar si el documento está pendiente de confirmación
     */
    public function isPending(): bool
    {
        return $this->requires_signature && !$this->student_confirmed;
    }

    /**
     * Scope para documentos pendientes
     */
    public function scopePending($query)
    {
        return $query->where('requires_signature', true)
                     ->where('student_confirmed', false);
    }

    /**
     * Scope para documentos confirmados
     */
    public function scopeConfirmed($query)
    {
        return $query->where('student_confirmed', true);
    }
}
