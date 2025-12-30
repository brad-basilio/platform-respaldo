<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'academic_level_id',
        'created_by',
        'title',
        'session_number',
        'modality',
        'description',
        'content',
        'objectives',
        'intro_video_url',
        'intro_video_thumbnail',
        'duration_minutes',
        'order',
        'has_exam',
        'exam_questions_count',
        'exam_passing_score',
        'exam_max_attempts',
        'is_active',
    ];

    protected $casts = [
        'has_exam' => 'boolean',
        'is_active' => 'boolean',
        'duration_minutes' => 'integer',
        'order' => 'integer',
        'exam_questions_count' => 'integer',
        'exam_passing_score' => 'integer',
        'exam_max_attempts' => 'integer',
    ];

    /**
     * Nivel académico al que pertenece
     */
    public function academicLevel(): BelongsTo
    {
        return $this->belongsTo(AcademicLevel::class);
    }

    /**
     * Usuario que creó la plantilla
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Preguntas del examen
     */
    public function questions(): HasMany
    {
        return $this->hasMany(TemplateQuestion::class);
    }

    /**
     * Preguntas activas
     */
    public function activeQuestions(): HasMany
    {
        return $this->hasMany(TemplateQuestion::class)->where('is_active', true);
    }

    /**
     * Recursos descargables
     */
    public function resources(): HasMany
    {
        return $this->hasMany(TemplateResource::class);
    }

    /**
     * Recursos activos
     */
    public function activeResources(): HasMany
    {
        return $this->hasMany(TemplateResource::class)->where('is_active', true);
    }

    /**
     * Clases programadas basadas en esta plantilla
     */
    public function scheduledClasses(): HasMany
    {
        return $this->hasMany(ScheduledClass::class);
    }

    /**
     * Obtener preguntas aleatorias para el examen
     */
    public function getRandomQuestions(int $count = null): \Illuminate\Database\Eloquent\Collection
    {
        $count = $count ?? $this->exam_questions_count;
        return $this->activeQuestions()->inRandomOrder()->limit($count)->get();
    }

    /**
     * Scope para plantillas activas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para filtrar por nivel académico
     */
    public function scopeForLevel($query, $levelId)
    {
        return $query->where('academic_level_id', $levelId);
    }

    /**
     * Scope ordenado por sesión
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('order')->orderBy('session_number');
    }
}
