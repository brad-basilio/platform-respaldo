<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Group extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'teacher_id',
        'max_capacity',
        'status',
        'level',
        'start_date',
        'end_date',
        'day_of_week',
        'start_time',
        'end_time',
        'duration',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'max_capacity' => 'integer',
        'duration' => 'integer',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'group_student')
            ->withTimestamps();
    }

    public function classes(): HasMany
    {
        return $this->hasMany(ClassModel::class);
    }

    public function workshops(): HasMany
    {
        return $this->hasMany(Workshop::class);
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    // Accessor for schedule as object
    public function getScheduleAttribute(): array
    {
        return [
            'dayOfWeek' => $this->day_of_week,
            'startTime' => $this->start_time,
            'endTime' => $this->end_time,
            'duration' => $this->duration,
        ];
    }
}
