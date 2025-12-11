<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TemplateQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'class_template_id',
        'question',
        'type',
        'options',
        'explanation',
        'points',
        'is_active',
    ];

    protected $casts = [
        'options' => 'array',
        'is_active' => 'boolean',
        'points' => 'integer',
    ];

    /**
     * Plantilla a la que pertenece
     */
    public function classTemplate(): BelongsTo
    {
        return $this->belongsTo(ClassTemplate::class);
    }

    /**
     * Obtener la respuesta correcta
     */
    public function getCorrectAnswer(): ?array
    {
        if (!$this->options) {
            return null;
        }

        foreach ($this->options as $option) {
            if ($option['is_correct'] ?? false) {
                return $option;
            }
        }

        return null;
    }

    /**
     * Verificar si una respuesta es correcta
     */
    public function isCorrectAnswer(string $answer): bool
    {
        $correctAnswer = $this->getCorrectAnswer();
        return $correctAnswer && ($correctAnswer['text'] ?? '') === $answer;
    }

    /**
     * Scope para preguntas activas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para tipo de pregunta
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
