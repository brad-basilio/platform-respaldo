<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'type',
        'content',
        'description',
    ];

    /**
     * Obtener valor de configuración por key
     */
    public static function get(string $key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        return $setting ? $setting->content : $default;
    }

    /**
     * Establecer o actualizar valor de configuración
     */
    public static function set(string $key, string $content, string $type = 'general', ?string $description = null)
    {
        return self::updateOrCreate(
            ['key' => $key],
            [
                'content' => $content,
                'type' => $type,
                'description' => $description,
            ]
        );
    }

    /**
     * Obtener todas las configuraciones de un tipo
     */
    public static function getByType(string $type)
    {
        return self::where('type', $type)->get();
    }
}