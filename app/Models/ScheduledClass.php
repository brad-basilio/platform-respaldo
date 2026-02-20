<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScheduledClass extends Model
{
    use HasFactory;

    protected $fillable = [
        'class_template_id',
        'type',
        'teacher_id',
        'group_id',
        'scheduled_at',
        'ended_at',
        'meet_url',
        'recording_url',
        'recording_thumbnail',
        'status',
        'notes',
        'max_students',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'ended_at' => 'datetime',
        'max_students' => 'integer',
    ];

    /**
     * Plantilla base de la clase
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(ClassTemplate::class, 'class_template_id');
    }

    /**
     * Profesor asignado
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Grupo de la clase
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * Inscripciones de estudiantes
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentClassEnrollment::class);
    }

    /**
     * Estudiantes inscritos a través de enrollments
     */
    public function students()
    {
        return $this->hasManyThrough(
            Student::class,
            StudentClassEnrollment::class,
            'scheduled_class_id',
            'id',
            'id',
            'student_id'
        );
    }

    /**
     * Obtener el video a mostrar (grabación si existe, sino intro)
     */
    public function getVideoUrlAttribute(): ?string
    {
        return $this->recording_url ?? $this->template?->intro_video_url;
    }

    /**
     * Obtener thumbnail del video
     */
    public function getVideoThumbnailAttribute(): ?string
    {
        return $this->recording_thumbnail ?? $this->template?->intro_video_thumbnail;
    }

    /**
     * Verificar si tiene espacio disponible
     */
    public function hasAvailableSpace(): bool
    {
        return $this->enrollments()->count() < $this->max_students;
    }

    /**
     * Obtener espacios disponibles
     */
    public function getAvailableSpotsAttribute(): int
    {
        return max(0, $this->max_students - $this->enrollments()->count());
    }

    /**
     * Verificar si la clase ya pasó
     */
    public function isPast(): bool
    {
        return $this->scheduled_at->isPast();
    }

    /**
     * Verificar si la clase está en curso
     */
    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }

    /**
     * Verificar si tiene grabación
     */
    public function hasRecording(): bool
    {
        return !empty($this->recording_url);
    }

    /**
     * Scope para clases programadas
     */
    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    /**
     * Scope para clases regulares
     */
    public function scopeRegular($query)
    {
        return $query->where('type', 'regular');
    }

    /**
     * Scope para prácticas
     */
    public function scopePractice($query)
    {
        return $query->where('type', 'practice');
    }

    /**
     * Verifica si es una práctica
     */
    public function isPractice(): bool
    {
        return $this->type === 'practice';
    }

    /**
     * Scope para clases completadas
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope para clases futuras
     */
    public function scopeUpcoming($query)
    {
        return $query->where('scheduled_at', '>', now())->where('status', 'scheduled');
    }

    /**
     * Scope para clases de hoy
     */
    public function scopeToday($query)
    {
        return $query->whereDate('scheduled_at', today());
    }
}
