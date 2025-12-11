<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentClassEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'scheduled_class_id',
        'student_id',
        'attended',
        'joined_at',
        'left_at',
        'attendance_minutes',
        'exam_completed',
    ];

    protected $casts = [
        'attended' => 'boolean',
        'exam_completed' => 'boolean',
        'joined_at' => 'datetime',
        'left_at' => 'datetime',
        'attendance_minutes' => 'integer',
    ];

    /**
     * Clase programada
     */
    public function scheduledClass(): BelongsTo
    {
        return $this->belongsTo(ScheduledClass::class);
    }

    /**
     * Estudiante inscrito
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Intentos de examen
     */
    public function examAttempts(): HasMany
    {
        return $this->hasMany(StudentExamAttempt::class);
    }

    /**
     * Último intento de examen
     */
    public function latestExamAttempt()
    {
        return $this->hasOne(StudentExamAttempt::class)->latestOfMany();
    }

    /**
     * Marcar asistencia
     */
    public function markAttendance(): void
    {
        $this->update([
            'attended' => true,
            'joined_at' => now(),
        ]);
    }

    /**
     * Registrar salida
     */
    public function markExit(): void
    {
        $joinedAt = $this->joined_at ?? now();
        $minutes = $joinedAt->diffInMinutes(now());
        
        $this->update([
            'left_at' => now(),
            'attendance_minutes' => $minutes,
        ]);
    }

    /**
     * Scope para estudiantes que asistieron
     */
    public function scopeAttended($query)
    {
        return $query->where('attended', true);
    }

    /**
     * Scope para estudiantes que completaron examen
     */
    public function scopeExamCompleted($query)
    {
        return $query->where('exam_completed', true);
    }
}
