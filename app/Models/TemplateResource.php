<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class TemplateResource extends Model
{
    use HasFactory;

    protected $fillable = [
        'class_template_id',
        'name',
        'file_path',
        'file_type',
        'file_size',
        'description',
        'download_count',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'download_count' => 'integer',
    ];

    /**
     * Plantilla a la que pertenece
     */
    public function classTemplate(): BelongsTo
    {
        return $this->belongsTo(ClassTemplate::class);
    }

    /**
     * Obtener URL de descarga
     */
    public function getDownloadUrlAttribute(): string
    {
        return Storage::url($this->file_path);
    }

    /**
     * Incrementar contador de descargas
     */
    public function incrementDownloadCount(): void
    {
        $this->increment('download_count');
    }

    /**
     * Obtener tamaño formateado
     */
    public function getFormattedSizeAttribute(): string
    {
        $bytes = (int) $this->file_size;
        
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        
        return $bytes . ' bytes';
    }

    /**
     * Obtener icono según tipo de archivo
     */
    public function getFileIconAttribute(): string
    {
        $icons = [
            'pdf' => 'file-pdf',
            'doc' => 'file-word',
            'docx' => 'file-word',
            'xls' => 'file-excel',
            'xlsx' => 'file-excel',
            'ppt' => 'file-powerpoint',
            'pptx' => 'file-powerpoint',
            'jpg' => 'file-image',
            'jpeg' => 'file-image',
            'png' => 'file-image',
            'gif' => 'file-image',
            'mp4' => 'file-video',
            'mp3' => 'file-audio',
            'zip' => 'file-archive',
            'rar' => 'file-archive',
        ];

        return $icons[$this->file_type] ?? 'file';
    }

    /**
     * Scope para recursos activos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
