<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use Carbon\Carbon;

class PracticeRotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'teacher_id',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public static function ensureRotationsExist(Carbon $startDate, int $days = 30)
    {
        $teachers = \App\Models\Teacher::where('status', 'active')
            ->has('user')
            ->orderBy('id')
            ->pluck('user_id')
            ->toArray();

        if (empty($teachers)) {
            return 0;
        }

        $count = count($teachers);
        $newCount = 0;

        // Encontrar la última rotación para saber quién sigue
        $lastRotation = self::orderBy('date', 'desc')->first();
        $startIndex = 0;

        if ($lastRotation) {
            $lastIndex = array_search($lastRotation->teacher_id, $teachers);
            if ($lastIndex !== false) {
                $startIndex = ($lastIndex + 1) % $count;
            }
        }

        for ($i = 0; $i < $days; $i++) {
            $dateObj = $startDate->copy()->addDays($i);
            $currentDate = $dateObj->toDateString();

            // Solo creamos si no existe
            if (!self::whereDate('date', $currentDate)->exists()) {
                self::create([
                    'date' => $currentDate,
                    'teacher_id' => $teachers[($startIndex + $i) % $count]
                ]);
                $newCount++;
            }
        }

        return $newCount;
    }
}
