<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Teacher extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        // Datos Personales
        'first_name',
        'paternal_last_name',
        'maternal_last_name',
        'phone_number',
        'gender',
        'age',
        'birth_date',
        'document_type',
        'document_number',
        'education_level',
        // Datos Laborales
        'status',
        'specialization',
        'start_date',
        'bank_account',
        'bank',
        'work_modality',
        'language_level',
        'contract_status',
        'contract_period',
        'contract_modality',
        // Datos de Contacto
        'current_address',
        'emergency_contact_number',
        'emergency_contact_relationship',
        'emergency_contact_name',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'start_date' => 'date',
        'age' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function groups(): HasMany
    {
        return $this->hasMany(Group::class);
    }

    public function timeSlots(): HasMany
    {
        return $this->hasMany(TimeSlot::class);
    }

    // Accessor for full name
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->paternal_last_name} {$this->maternal_last_name}");
    }
}
