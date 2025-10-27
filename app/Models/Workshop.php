<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Workshop extends Model
{
    use HasFactory;

    protected $fillable = [
        'group_id',
        'title',
        'description',
        'scheduled_date',
        'meet_link',
        'max_participants',
        'recording_url',
        'is_live',
    ];

    protected $casts = [
        'scheduled_date' => 'datetime',
        'is_live' => 'boolean',
        'max_participants' => 'integer',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'student_workshop')
            ->withTimestamps();
    }
}
