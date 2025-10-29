<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'registered_by',
        'verified_payment_by',
        'payment_verified_at',
        'verified_enrollment_by',
        'enrollment_verified_at',
        'enrollment_verified',
        // Datos Personales
        'first_name',
        'paternal_last_name',
        'maternal_last_name',
        'phone_number',
        'gender',
        'birth_date',
        'document_type',
        'document_number',
        'education_level',
        // Estado y Tipo
        'status',
        'class_type',
        'academic_level_id',  // ✅ Cambiado de 'level'
        // Datos Académicos
        'payment_date',
        'enrollment_date',
        'registration_date',
        'enrollment_code',
        'payment_plan_id',  // ✅ Cambiado de 'contracted_plan'
        'contract_url',
        'contract_file_name',
        'contract_file_path',
        'payment_voucher_url',       // ✅ NUEVO: URL del voucher de pago
        'payment_voucher_file_name', // ✅ NUEVO: Nombre del archivo del voucher
        'payment_verified',
        // Examen de Categorización
        'has_placement_test',
        'test_date',
        'test_score',
        // Datos del Apoderado
        'guardian_name',
        'guardian_document_number',
        'guardian_email',
        'guardian_birth_date',
        'guardian_phone',
        'guardian_address',
        // Gamificación
        'points',
        // Estado del Prospecto
        'prospect_status',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'payment_date' => 'date',
        'enrollment_date' => 'date',
        'registration_date' => 'date',
        'payment_verified_at' => 'datetime',
        'enrollment_verified_at' => 'datetime',
        'enrollment_verified' => 'boolean',
        'test_date' => 'date',
        'guardian_birth_date' => 'date',
        'has_placement_test' => 'boolean',
        'payment_verified' => 'boolean',
        'test_score' => 'decimal:2',
        'points' => 'integer',
        'registered_by' => 'integer',
        'verified_payment_by' => 'integer',
        'verified_enrollment_by' => 'integer',
        'academic_level_id' => 'integer',  // ✅ Agregado
        'payment_plan_id' => 'integer',    // ✅ Agregado
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function verifiedPaymentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_payment_by');
    }

    public function verifiedEnrollmentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_enrollment_by');
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class, 'group_student')
            ->withTimestamps();
    }

    public function badges(): BelongsToMany
    {
        return $this->belongsToMany(Badge::class, 'badge_student')
            ->withTimestamps();
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function workshops(): BelongsToMany
    {
        return $this->belongsToMany(Workshop::class, 'student_workshop')
            ->withTimestamps();
    }

    /**
     * Relación con matrículas (nuevo sistema de pagos)
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * Matrícula activa actual
     */
    public function activeEnrollment()
    {
        return $this->hasOne(Enrollment::class)->where('status', 'active')->latest();
    }

    /**
     * Relación con Nivel Académico
     */
    public function academicLevel(): BelongsTo
    {
        return $this->belongsTo(AcademicLevel::class, 'academic_level_id');
    }

    /**
     * Relación con Plan de Pago
     */
    public function paymentPlan(): BelongsTo
    {
        return $this->belongsTo(PaymentPlan::class, 'payment_plan_id');
    }

    // Accessor for full name
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->paternal_last_name} {$this->maternal_last_name}");
    }

    // Accessor for contract file name (camelCase para frontend)
    public function getContractFileNameAttribute(): ?string
    {
        return $this->attributes['contract_file_name'] ?? null;
    }
}
