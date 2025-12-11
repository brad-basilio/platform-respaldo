<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentExamAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_class_enrollment_id',
        'student_id',
        'class_template_id',
        'questions',
        'answers',
        'score',
        'total_points',
        'percentage',
        'passed',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'questions' => 'array',
        'answers' => 'array',
        'passed' => 'boolean',
        'score' => 'integer',
        'total_points' => 'integer',
        'percentage' => 'decimal:2',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Inscripción a la clase
     */
    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(StudentClassEnrollment::class, 'student_class_enrollment_id');
    }

    /**
     * Estudiante
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Plantilla de clase
     */
    public function classTemplate(): BelongsTo
    {
        return $this->belongsTo(ClassTemplate::class);
    }

    /**
     * Calcular y guardar resultados
     */
    public function calculateResults(): void
    {
        if (!$this->answers || !$this->questions) {
            return;
        }

        $score = 0;
        $totalPoints = 0;

        foreach ($this->questions as $index => $question) {
            $totalPoints += $question['points'] ?? 1;
            
            $answer = $this->answers[$index] ?? null;
            if ($answer) {
                // Verificar si la respuesta es correcta
                foreach ($question['options'] as $option) {
                    if (($option['is_correct'] ?? false) && $option['text'] === $answer) {
                        $score += $question['points'] ?? 1;
                        break;
                    }
                }
            }
        }

        $percentage = $totalPoints > 0 ? ($score / $totalPoints) * 100 : 0;
        $passingScore = $this->classTemplate?->exam_passing_score ?? 70;

        $this->update([
            'score' => $score,
            'total_points' => $totalPoints,
            'percentage' => round($percentage, 2),
            'passed' => $percentage >= $passingScore,
            'completed_at' => now(),
        ]);
    }

    /**
     * Verificar si el examen está en progreso
     */
    public function isInProgress(): bool
    {
        return $this->started_at && !$this->completed_at;
    }

    /**
     * Verificar si el examen está completado
     */
    public function isCompleted(): bool
    {
        return !is_null($this->completed_at);
    }

    /**
     * Scope para intentos completados
     */
    public function scopeCompleted($query)
    {
        return $query->whereNotNull('completed_at');
    }

    /**
     * Scope para intentos aprobados
     */
    public function scopePassed($query)
    {
        return $query->where('passed', true);
    }
}
