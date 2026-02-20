<?php

namespace App\Services;

use App\Models\Teacher;
use App\Models\TimeSlot;
use App\Models\ScheduledClass;
use App\Models\ClassTemplate;
use App\Models\Student;
use App\Models\StudentClassEnrollment;
use App\Notifications\ClassAssignedNotification;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class TeacherAssignmentService
{
    /**
     * Map Spanish day names to Carbon day constants
     */
    protected array $dayMapping = [
        'Lunes' => Carbon::MONDAY,
        'Martes' => Carbon::TUESDAY,
        'Miércoles' => Carbon::WEDNESDAY,
        'Jueves' => Carbon::THURSDAY,
        'Viernes' => Carbon::FRIDAY,
        'Sábado' => Carbon::SATURDAY,
        'Domingo' => Carbon::SUNDAY,
    ];

    /**
     * Get the Spanish day name from a Carbon date
     */
    protected function getDayName(Carbon $date): string
    {
        $dayNumber = $date->dayOfWeek;
        $mapping = array_flip($this->dayMapping);
        return $mapping[$dayNumber] ?? 'Lunes';
    }

    /**
     * Find an available teacher for a specific datetime
     * 
     * @param Carbon $datetime The requested datetime
     * @param ClassTemplate|null $template Optional template to match specialization
     * @return Teacher|null
     */
    public function findAvailableTeacher(Carbon $datetime, ?ClassTemplate $template = null, string $type = 'regular'): ?Teacher
    {
        $dayName = $this->getDayName($datetime);
        $requestedTime = $datetime->format('H:i');
        $dateStr = $datetime->toDateString();

        // 1. Obtener el profesor asignado a PRÁCTICAS para hoy
        $practiceTeacherId = \App\Models\PracticeRotation::where('date', $dateStr)->value('teacher_id');

        // Find teachers who:
        // 1. Are active
        // 2. Have not_available_today = false
        // 3. Have a time_slot for this day that covers the requested time
        // 4. Match the template specialization (if provided)
        $query = Teacher::where('status', 'active')
            ->where(function ($q) {
                $q->where('not_available_today', false)
                    ->orWhereNull('not_available_today');
            })
            ->whereHas('timeSlots', function ($q) use ($dayName, $requestedTime) {
                $q->where('day_of_week', $dayName)
                    ->where('start_time', '<=', $requestedTime)
                    ->where('end_time', '>', $requestedTime);
            });

        // REGLA DE ROTACIÓN:
        if ($type === 'practice') {
            // Si es práctica, solo buscamos al profesor asignado para este día
            if ($practiceTeacherId) {
                $query->where('user_id', $practiceTeacherId);
            } else {
                // Si no hay nadie asignado hoy a prácticas, nadie está disponible para prácticas
                return null;
            }
        } else {
            // Si es regular (teoría), EXCLUIMOS al profesor de prácticas de hoy para que esté libre solo para su rotación
            if ($practiceTeacherId) {
                $query->where('user_id', '!=', $practiceTeacherId);
            }
        }

        // Filter by specialization if template is provided
        if ($template && $template->modality) {
            $query->where(function ($q) use ($template) {
                $q->where('specialization', $template->modality)
                    ->orWhere('specialization', 'both');
            });
        }

        // Get teachers with their user info
        $availableTeachers = $query->with('user')->get();

        if ($availableTeachers->isEmpty()) {
            return null;
        }

        // Filter out teachers who already have a class scheduled at this time
        $availableTeachers = $availableTeachers->filter(function ($teacher) use ($datetime) {
            $hasConflict = ScheduledClass::where('teacher_id', $teacher->user_id)
                ->where('scheduled_at', $datetime)
                ->where('status', 'scheduled')
                ->exists();
            return !$hasConflict;
        });

        if ($availableTeachers->isEmpty()) {
            return null;
        }

        // Return a random available teacher from the pool (esperamos solo 1 si es práctica)
        return $availableTeachers->random();
    }

    /**
     * Create a scheduled class and enroll the student
     * 
     * @param ClassTemplate $template
     * @param Carbon $datetime
     * @param Teacher $teacher
     * @param Student $student
     * @return ScheduledClass
     */
    public function createClassWithEnrollment(
        ClassTemplate $template,
        Carbon $datetime,
        Teacher $teacher,
        Student $student,
        string $type = 'regular'
    ): ScheduledClass {
        // Get max students from settings
        $settingKey = $type === 'practice' ? 'practice_max_students' : 'class_max_students';
        $maxStudents = (int) (\App\Models\Setting::where('key', $settingKey)->value('content') ?? ($type === 'practice' ? 10 : 6));

        // Create the scheduled class
        $scheduledClass = ScheduledClass::create([
            'class_template_id' => $template->id,
            'type' => $type,
            'teacher_id' => $teacher->user_id, // ScheduledClass uses user_id
            'scheduled_at' => $datetime,
            'status' => 'scheduled',
            'meet_url' => $teacher->meet_url,
            'max_students' => $maxStudents,
        ]);

        // Enroll the student
        StudentClassEnrollment::create([
            'student_id' => $student->id,
            'scheduled_class_id' => $scheduledClass->id,
        ]);

        // Notify the teacher
        if ($teacher->user) {
            $teacher->user->notify(new ClassAssignedNotification($scheduledClass, $student, $template));
        }

        return $scheduledClass;
    }

    /**
     * Get the next 5 available time slots with teachers
     * 
     * @param Carbon $fromDatetime Start searching from this datetime
     * @param ClassTemplate|null $template Optional template to match specialization
     * @param int $limit Number of slots to return
     * @return Collection
     */
    public function getAlternativeSlots(
        Carbon $fromDatetime,
        ?ClassTemplate $template = null,
        int $limit = 5,
        string $type = 'regular'
    ): Collection {
        $slots = collect();
        $currentDatetime = $fromDatetime->copy()->addHour()->startOfHour();
        $maxDatetime = $fromDatetime->copy()->addDays(7);

        // Get operation hours from settings
        $operationStart = (int) (\App\Models\Setting::where('key', 'class_operation_start_hour')->value('content') ?? 8);
        $operationEnd = (int) (\App\Models\Setting::where('key', 'class_operation_end_hour')->value('content') ?? 22);

        while ($slots->count() < $limit && $currentDatetime->lt($maxDatetime)) {
            // Check if within operation hours
            if ($currentDatetime->hour >= $operationStart && $currentDatetime->hour < $operationEnd) {
                $teacher = $this->findAvailableTeacher($currentDatetime, $template, $type);

                if ($teacher) {
                    $slots->push([
                        'datetime' => $currentDatetime->toISOString(),
                        'datetime_formatted' => $currentDatetime->format('l, d M Y \\a \\l\\a\\s H:i'),
                        'date' => $currentDatetime->format('Y-m-d'),
                        'time' => $currentDatetime->format('H:i'),
                        'day_name' => $this->getDayName($currentDatetime),
                        'teacher_id' => $teacher->id,
                        'teacher_name' => $teacher->user?->name ?? $teacher->first_name . ' ' . $teacher->paternal_last_name,
                    ]);
                }
            }

            // Move to next hour
            $currentDatetime->addHour();

            // Skip to next day's operation start if we're past operation hours
            if ($currentDatetime->hour >= $operationEnd) {
                $currentDatetime->addDay()->setHour($operationStart)->setMinute(0)->setSecond(0);
            }
        }

        return $slots;
    }
}
