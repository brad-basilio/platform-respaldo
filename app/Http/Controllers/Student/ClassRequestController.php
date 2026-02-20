<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\ClassRequest;
use App\Models\ClassTemplate;
use App\Models\ScheduledClass;
use App\Models\StudentClassEnrollment;
use App\Models\Setting;
use App\Services\TeacherAssignmentService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClassRequestController extends Controller
{
    /**
     * Get class configuration settings
     */
    public function getClassConfig()
    {
        return response()->json([
            'min_advance_hours' => (int) (Setting::where('key', 'class_request_min_advance_hours')->value('content') ?? 1),
            'max_advance_hours' => (int) (Setting::where('key', 'class_request_max_advance_hours')->value('content') ?? 2),
            'operation_start_hour' => (int) (Setting::where('key', 'class_operation_start_hour')->value('content') ?? 8),
            'operation_end_hour' => (int) (Setting::where('key', 'class_operation_end_hour')->value('content') ?? 22),
            'max_students' => (int) (Setting::where('key', 'class_max_students')->value('content') ?? 6),
            'practice_min_required' => (int) (Setting::where('key', 'practice_min_required')->value('content') ?? 2),
            'practice_max_allowed' => (int) (Setting::where('key', 'practice_max_allowed')->value('content') ?? 5),
            'practice_max_students' => (int) (Setting::where('key', 'practice_max_students')->value('content') ?? 10),
        ]);
    }

    /**
     * Get available scheduled classes for a template at a specific datetime
     */
    public function getAvailableClasses(ClassTemplate $template, Request $request)
    {
        $request->validate([
            'datetime' => 'required|date',
        ]);

        // The datetime from frontend already includes min_advance_hours + rounding to next full hour
        // We use this as the minimum time for available classes
        $calculatedSlot = Carbon::parse($request->datetime);

        // Find scheduled classes for this template on the same day
        // Only show classes that are >= the calculated slot (which respects min advance time)
        $classes = ScheduledClass::where('class_template_id', $template->id)
            ->where('status', 'scheduled')
            ->whereDate('scheduled_at', $calculatedSlot->toDateString())
            ->where('scheduled_at', '>=', $calculatedSlot) // Only classes from calculated slot onwards
            ->with(['teacher:id,name'])
            ->withCount(['enrollments as enrolled_count'])
            ->orderBy('scheduled_at')
            ->get()
            ->filter(fn($class) => $class->hasAvailableSpace())
            ->map(fn($class) => [
                'id' => $class->id,
                'scheduled_at' => $class->scheduled_at->toISOString(),
                'teacher' => $class->teacher ? ['id' => $class->teacher->id, 'name' => $class->teacher->name] : null,
                'enrolled_count' => $class->enrolled_count,
                'max_students' => $class->max_students,
                'available_spots' => $class->max_students - $class->enrolled_count,
            ])
            ->values();

        return response()->json([
            'classes' => $classes,
        ]);
    }

    /**
     * Mostrar todas las plantillas del nivel del estudiante
     */
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();
        $student = $user->student; // Relación correcta es 'student', no 'studentProfile'

        if (!$student || !$student->academic_level_id) {
            return Inertia::render('Student/MyClasses', [
                'templates' => [],
                'enrollments' => [],
                'myRequests' => [],
                'message' => 'No tienes un nivel académico asignado.',
            ]);
        }

        // Obtener todas las plantillas del nivel del estudiante
        $templates = ClassTemplate::where('academic_level_id', $student->academic_level_id)
            ->where('is_active', true)
            ->with(['academicLevel'])
            ->withCount(['questions', 'resources'])
            ->orderBy('order')
            ->orderBy('session_number')
            ->get();

        // Obtener todas las inscripciones (regulares y prácticas)
        $enrollments = StudentClassEnrollment::where('student_id', $student->id)
            ->with(['scheduledClass' => function ($q) {
                $q->select('id', 'class_template_id', 'type', 'status');
            }])
            ->get();

        // Agrupar datos por plantilla para facilitar el consumo en React
        $sessionStats = $templates->mapWithKeys(function ($template) use ($enrollments, $user) {
            $templateEnrollments = $enrollments->filter(fn($e) => $e->scheduledClass->class_template_id === $template->id);
            $regularEnrollment = $templateEnrollments->where('scheduledClass.type', 'regular')->first();

            return [$template->id => [
                'regular_enrolled' => $regularEnrollment !== null,
                'regular_completed' => $regularEnrollment && $regularEnrollment->scheduledClass->status === 'completed',
                'regular_status' => $regularEnrollment ? $regularEnrollment->scheduledClass->status : null,
                'practice_count' => $templateEnrollments->where('scheduledClass.type', 'practice')->count(),
                'practice_completed_count' => $templateEnrollments->where('scheduledClass.type', 'practice')->where('scheduledClass.status', 'completed')->count(),
                'pending_request' => ClassRequest::where('student_id', $user->id)
                    ->where('class_template_id', $template->id)
                    ->whereIn('status', ['pending', 'approved'])
                    ->first(),
            ]];
        });

        return Inertia::render('Student/MyClasses', [
            'templates' => $templates,
            'sessionStats' => $sessionStats,
            'academicLevel' => $student->academicLevel,
            'practiceSettings' => [
                'min_required' => (int) (Setting::where('key', 'practice_min_required')->value('content') ?? 2),
                'max_allowed' => (int) (Setting::where('key', 'practice_max_allowed')->value('content') ?? 5),
            ]
        ]);
    }

    /**
     * Ver detalle de una plantilla (temario)
     */
    public function show(ClassTemplate $template)
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();
        $student = $user->student;

        // Verificar que la plantilla sea del nivel del estudiante
        if (!$student || $template->academic_level_id !== $student->academic_level_id) {
            abort(403, 'No tienes acceso a esta plantilla.');
        }

        $template->load(['academicLevel', 'questions', 'resources']);

        // Verificar si ya tiene una inscripción o solicitud (CLASE REGULAR)
        $enrollment = StudentClassEnrollment::where('student_id', $student->id)
            ->whereHas('scheduledClass', function ($q) use ($template) {
                $q->where('class_template_id', $template->id)
                    ->where('type', 'regular');
            })
            ->with(['scheduledClass' => function ($q) {
                $q->select('id', 'class_template_id', 'teacher_id', 'status', 'scheduled_at', 'meet_url', 'recording_url', 'max_students', 'type');
            }, 'scheduledClass.teacher:id,name', 'latestExamAttempt'])
            ->withCount('examAttempts')
            ->first();

        // Obtener inscripciones de PRÁCTICAS
        $practiceEnrollments = StudentClassEnrollment::where('student_id', $student->id)
            ->whereHas('scheduledClass', function ($q) use ($template) {
                $q->where('class_template_id', $template->id)
                    ->where('type', 'practice');
            })
            ->with(['scheduledClass.teacher:id,name'])
            ->get();

        // Add latest exam attempt info to enrollment if exists
        if ($enrollment) {
            // Always include attempt count
            $enrollment->exam_attempts_count = $enrollment->exam_attempts_count ?? 0;

            if ($enrollment->latestExamAttempt) {
                $attempt = $enrollment->latestExamAttempt;
                $enrollment->latest_exam_score = $attempt->score;
                $enrollment->latest_exam_total_points = $attempt->total_points;
                $enrollment->latest_exam_percentage = $attempt->percentage ?? (
                    $attempt->total_points > 0
                    ? round(($attempt->score / $attempt->total_points) * 100)
                    : 0
                );
                $enrollment->latest_exam_passed = $attempt->passed;
            }
        }

        $existingRequest = ClassRequest::where('student_id', $user->id)
            ->where('class_template_id', $template->id)
            ->where('type', 'regular')
            ->whereIn('status', ['pending', 'approved', 'scheduled'])
            ->with('scheduledClass.teacher')
            ->first();

        $existingPracticeRequest = ClassRequest::where('student_id', $user->id)
            ->where('class_template_id', $template->id)
            ->where('type', 'practice')
            ->whereIn('status', ['pending', 'approved', 'scheduled'])
            ->with('scheduledClass.teacher')
            ->first();

        return Inertia::render('Student/ClassTemplateView', [
            'template' => $template,
            'enrollment' => $enrollment,
            'practiceEnrollments' => $practiceEnrollments,
            'existingRequest' => $existingRequest,
            'existingPracticeRequest' => $existingPracticeRequest,
            'studentInfo' => [
                'studentType' => $student->student_type ?? 'regular',
                'isVerified' => $student->enrollment_verified ?? false,
            ],
            'practiceSettings' => [
                'min_required' => (int) (Setting::where('key', 'practice_min_required')->value('content') ?? 2),
                'max_allowed' => (int) (Setting::where('key', 'practice_max_allowed')->value('content') ?? 5),
            ]
        ]);
    }

    /**
     * Solicitar una clase
     */
    public function store(Request $request)
    {
        $rules = [
            'class_template_id' => 'required|exists:class_templates,id',
            'type' => 'nullable|in:regular,practice',
            'message' => 'nullable|string|max:500',
            'requested_datetime' => 'nullable|date',
            'target_scheduled_class_id' => 'nullable|exists:scheduled_classes,id',
        ];

        $request->validate($rules);

        /** @var \App\Models\User $user */
        $user = auth()->user();
        $student = $user->student;
        $template = ClassTemplate::findOrFail($request->class_template_id);

        // Verificar que la plantilla sea del nivel del estudiante
        if (!$student || $template->academic_level_id !== $student->academic_level_id) {
            return back()->withErrors(['error' => 'No puedes solicitar clases de otro nivel.']);
        }

        $type = $request->input('type', 'regular');

        if ($type === 'regular') {
            // Verificar que no esté ya inscrito en clase REGULAR
            $alreadyEnrolledRegular = StudentClassEnrollment::where('student_id', $student->id)
                ->whereHas('scheduledClass', fn($q) => $q->where('class_template_id', $template->id)->where('type', 'regular'))
                ->exists();

            if ($alreadyEnrolledRegular) {
                return back()->withErrors(['error' => 'Ya estás inscrito en la sesión teórica de esta clase.']);
            }

            // Verificar solicitud pendiente REGULAR
            $hasPendingRegular = ClassRequest::where('student_id', $user->id)
                ->where('class_template_id', $template->id)
                ->where('type', 'regular')
                ->whereIn('status', ['pending', 'approved'])
                ->exists();

            if ($hasPendingRegular) {
                return back()->withErrors(['error' => 'Ya tienes una solicitud pendiente para la sesión teórica.']);
            }
        } else {
            // Para PRÁCTICAS: Verificar si ya tiene una práctica PROGRAMADA (sin completar)
            $hasActivePracticeEnrollment = StudentClassEnrollment::where('student_id', $student->id)
                ->whereHas('scheduledClass', function ($q) use ($template) {
                    $q->where('class_template_id', $template->id)
                        ->where('type', 'practice')
                        ->where('status', '!=', 'completed')
                        ->where('status', '!=', 'cancelled');
                })
                ->exists();

            if ($hasActivePracticeEnrollment) {
                return back()->withErrors(['error' => 'Ya tienes una práctica programada. Debes realizarla antes de solicitar otra.']);
            }

            // Verificar solicitud pendiente de PRÁCTICA
            $hasPendingPractice = ClassRequest::where('student_id', $user->id)
                ->where('class_template_id', $template->id)
                ->where('type', 'practice')
                ->whereIn('status', ['pending', 'approved'])
                ->exists();

            if ($hasPendingPractice) {
                return back()->withErrors(['error' => 'Ya tienes una solicitud de práctica en proceso.']);
            }
        }

        // VALIDACIÓN DE PROGRESIÓN (REGLAS DE PRÁCTICA)
        if ($type === 'regular') {
            // Verificar si la plantilla solicitada es la siguiente a una ya completada
            // Si es mayor a la primera, verificar que la anterior tenga las prácticas mínimas completadas
            $previousTemplate = ClassTemplate::where('academic_level_id', $template->academic_level_id)
                ->where('order', '<', $template->order)
                ->orderBy('order', 'desc')
                ->first();

            if ($previousTemplate) {
                $minPractices = (int) (Setting::where('key', 'practice_min_required')->value('content') ?? 2);

                $completedPractices = StudentClassEnrollment::where('student_id', $student->id)
                    ->whereHas('scheduledClass', function ($q) use ($previousTemplate) {
                        $q->where('class_template_id', $previousTemplate->id)
                            ->where('type', 'practice')
                            ->where('status', 'completed');
                    })
                    ->count();

                if ($completedPractices < $minPractices) {
                    return back()->withErrors(['error' => "No puedes solicitar esta sesión aún. Debes completar al menos {$minPractices} prácticas de la sesión anterior (llevas {$completedPractices})."]);
                }
            }
        } else {
            // Reglas para PRÁCTICAS
            // 1. Verificar que ya haya completado la Clase Regular de esta plantilla
            $regularCompleted = StudentClassEnrollment::where('student_id', $student->id)
                ->whereHas('scheduledClass', function ($q) use ($template) {
                    $q->where('class_template_id', $template->id)
                        ->where('type', 'regular')
                        ->where('status', 'completed');
                })
                ->exists();

            if (!$regularCompleted) {
                return back()->withErrors(['error' => 'Debes completar la sesión teórica antes de solicitar prácticas.']);
            }

            // 2. Verificar máximo de prácticas permitidas
            $maxPractices = (int) (Setting::where('key', 'practice_max_allowed')->value('content') ?? 5);
            $totalPractices = StudentClassEnrollment::where('student_id', $student->id)
                ->whereHas('scheduledClass', function ($q) use ($template) {
                    $q->where('class_template_id', $template->id)
                        ->where('type', 'practice');
                })
                ->count();

            $pendingPracticeRequests = ClassRequest::where('student_id', $user->id)
                ->where('class_template_id', $template->id)
                ->where('type', 'practice')
                ->whereIn('status', ['pending', 'approved'])
                ->count();

            if (($totalPractices + $pendingPracticeRequests) >= $maxPractices) {
                return back()->withErrors(['error' => "Ya has alcanzado el máximo de {$maxPractices} prácticas permitidas para esta sesión."]);
            }

            // 3. REGLA CRÍTICA: No 2 prácticas el mismo día
            if ($request->requested_datetime) {
                $requestedDate = Carbon::parse($request->requested_datetime)->toDateString();

                // Buscar en inscripciones
                $hasPracticeSameDay = StudentClassEnrollment::where('student_id', $student->id)
                    ->whereHas('scheduledClass', function ($q) use ($requestedDate) {
                        $q->where('type', 'practice')
                            ->whereDate('scheduled_at', $requestedDate);
                    })
                    ->exists();

                // Buscar en otras solicitudes
                $hasRequestSameDay = ClassRequest::where('student_id', $user->id)
                    ->where('type', 'practice')
                    ->whereIn('status', ['pending', 'approved'])
                    ->whereDate('requested_datetime', $requestedDate)
                    ->exists();

                if ($hasPracticeSameDay || $hasRequestSameDay) {
                    return back()->withErrors(['error' => 'No puedes realizar más de una práctica el mismo día.']);
                }
            }
        }

        // Si es estudiante regular verificado, validar el datetime
        $studentType = $student->student_type ?? 'regular';
        $isVerified = $student->enrollment_verified ?? false;

        $requestedDatetime = null;
        $targetScheduledClassId = null;

        if ($studentType === 'regular' && $isVerified) {
            // Flujo regular: validar horario estrictamente (1 hora anticipación, próximo slot)
            if (!$request->requested_datetime) {
                return back()->withErrors(['error' => 'Debes seleccionar un horario para tu clase.']);
            }

            $requestedDatetime = Carbon::parse($request->requested_datetime);
            $now = Carbon::now();

            // Obtener configuración
            $minAdvance = (int) (Setting::where('key', 'class_request_min_advance_hours')->value('content') ?? 1);
            $maxAdvance = (int) (Setting::where('key', 'class_request_max_advance_hours')->value('content') ?? 2);
            $operationStart = (int) (Setting::where('key', 'class_operation_start_hour')->value('content') ?? 8);
            $operationEnd = (int) (Setting::where('key', 'class_operation_end_hour')->value('content') ?? 22);

            // Validar que el horario esté dentro del rango de operación
            $requestedHour = $requestedDatetime->hour;
            if ($requestedHour < $operationStart || $requestedHour >= $operationEnd) {
                return back()->withErrors(['error' => "El horario debe estar entre las {$operationStart}:00 y las {$operationEnd}:00."]);
            }

            // Validar anticipación mínima
            $hoursUntilClass = $now->diffInHours($requestedDatetime, false);
            if ($hoursUntilClass < $minAdvance) {
                return back()->withErrors(['error' => "Debes solicitar con al menos {$minAdvance} hora(s) de anticipación."]);
            }

            // Si quiere unirse a una clase existente - INSCRIPCIÓN AUTOMÁTICA
            if ($request->target_scheduled_class_id) {
                $targetClass = ScheduledClass::find($request->target_scheduled_class_id);

                if (!$targetClass || !$targetClass->hasAvailableSpace()) {
                    return back()->withErrors(['error' => 'La clase seleccionada ya no tiene espacio disponible.']);
                }

                if ($targetClass->class_template_id !== $template->id) {
                    return back()->withErrors(['error' => 'La clase seleccionada no corresponde a esta sesión.']);
                }

                // Inscribir automáticamente al estudiante en el grupo existente
                StudentClassEnrollment::create([
                    'student_id' => $student->id,
                    'scheduled_class_id' => $targetClass->id,
                ]);

                // Crear solicitud marcada como scheduled directamente
                // Usar el horario del grupo, no el requested_datetime calculado
                ClassRequest::create([
                    'student_id' => $user->id,
                    'class_template_id' => $template->id,
                    'type' => $type,
                    'student_message' => $request->message,
                    'requested_datetime' => $targetClass->scheduled_at,
                    'target_scheduled_class_id' => $targetClass->id,
                    'scheduled_class_id' => $targetClass->id,
                    'status' => 'scheduled',
                    'processed_at' => now(),
                ]);

                return back()->with('success', '¡Te has inscrito exitosamente en el grupo!');
            }

            // AUTO-ASSIGNMENT: No existing class selected, try to create one with available teacher
            $assignmentService = app(TeacherAssignmentService::class);
            $teacher = $assignmentService->findAvailableTeacher($requestedDatetime, $template);

            if ($teacher) {
                // Create a new scheduled class with the available teacher
                $scheduledClass = $assignmentService->createClassWithEnrollment(
                    $template,
                    $requestedDatetime,
                    $teacher,
                    $student,
                    $type
                );

                // Create the class request marked as scheduled
                ClassRequest::create([
                    'student_id' => $user->id,
                    'class_template_id' => $template->id,
                    'type' => $type,
                    'student_message' => $request->message,
                    'requested_datetime' => $requestedDatetime,
                    'scheduled_class_id' => $scheduledClass->id,
                    'status' => 'scheduled',
                    'processed_at' => now(),
                ]);

                return back()->with('success', '¡Tu clase ha sido programada automáticamente con ' . ($teacher->user?->name ?? $teacher->first_name) . '!');
            } else {
                // No teacher available, return alternative slots
                $alternativeSlots = $assignmentService->getAlternativeSlots($requestedDatetime, $template, 5);

                return back()->with('alternative_slots', $alternativeSlots->toArray())
                    ->withErrors(['no_teacher' => 'No hay profesores disponibles en este horario.']);
            }
        } elseif ($studentType === 'daily' && $isVerified) {
            // Flujo diario: puede elegir cualquier hora del día actual
            if (!$request->requested_datetime) {
                return back()->withErrors(['error' => 'Debes seleccionar un horario para tu clase.']);
            }

            $requestedDatetime = Carbon::parse($request->requested_datetime);
            $now = Carbon::now();

            // Validar que sea del día actual
            if (!$requestedDatetime->isSameDay($now)) {
                return back()->withErrors(['error' => 'Como estudiante diario, solo puedes solicitar clases para hoy.']);
            }

            // Obtener configuración de horarios de operación
            $operationStart = (int) (Setting::where('key', 'class_operation_start_hour')->value('content') ?? 8);
            $operationEnd = (int) (Setting::where('key', 'class_operation_end_hour')->value('content') ?? 22);

            // Validar que el horario esté dentro del rango de operación
            $requestedHour = $requestedDatetime->hour;
            if ($requestedHour < $operationStart || $requestedHour >= $operationEnd) {
                return back()->withErrors(['error' => "El horario debe estar entre las {$operationStart}:00 y las {$operationEnd}:00."]);
            }

            // Validar que sea al menos 30 minutos en el futuro
            if ($requestedDatetime->diffInMinutes($now, false) > -30) {
                return back()->withErrors(['error' => 'Debes solicitar con al menos 30 minutos de anticipación.']);
            }

            // Si quiere unirse a una clase existente - INSCRIPCIÓN AUTOMÁTICA
            if ($request->target_scheduled_class_id) {
                $targetClass = ScheduledClass::find($request->target_scheduled_class_id);

                if (!$targetClass || !$targetClass->hasAvailableSpace()) {
                    return back()->withErrors(['error' => 'La clase seleccionada ya no tiene espacio disponible.']);
                }

                if ($targetClass->class_template_id !== $template->id) {
                    return back()->withErrors(['error' => 'La clase seleccionada no corresponde a esta sesión.']);
                }

                // Inscribir automáticamente al estudiante en el grupo existente
                StudentClassEnrollment::create([
                    'student_id' => $student->id,
                    'scheduled_class_id' => $targetClass->id,
                ]);

                // Crear solicitud marcada como scheduled directamente
                // Usar el horario del grupo, no el requested_datetime calculado
                ClassRequest::create([
                    'student_id' => $user->id,
                    'class_template_id' => $template->id,
                    'type' => $type,
                    'student_message' => $request->message,
                    'requested_datetime' => $targetClass->scheduled_at,
                    'target_scheduled_class_id' => $targetClass->id,
                    'scheduled_class_id' => $targetClass->id,
                    'status' => 'scheduled',
                    'processed_at' => now(),
                ]);

                return back()->with('success', '¡Te has inscrito exitosamente en el grupo!');
            }

            // AUTO-ASSIGNMENT for DAILY students: No existing class selected, try to create one with available teacher
            $assignmentService = app(TeacherAssignmentService::class);
            $teacher = $assignmentService->findAvailableTeacher($requestedDatetime, $template);

            if ($teacher) {
                // Create a new scheduled class with the available teacher
                $scheduledClass = $assignmentService->createClassWithEnrollment(
                    $template,
                    $requestedDatetime,
                    $teacher,
                    $student,
                    $type
                );

                // Create the class request marked as scheduled
                ClassRequest::create([
                    'student_id' => $user->id,
                    'class_template_id' => $template->id,
                    'type' => $type,
                    'student_message' => $request->message,
                    'requested_datetime' => $requestedDatetime,
                    'scheduled_class_id' => $scheduledClass->id,
                    'status' => 'scheduled',
                    'processed_at' => now(),
                ]);

                return back()->with('success', '¡Tu clase ha sido programada automáticamente con ' . ($teacher->user?->name ?? $teacher->first_name) . '!');
            } else {
                // No teacher available, return alternative slots
                $alternativeSlots = $assignmentService->getAlternativeSlots($requestedDatetime, $template, 5);

                return back()->with('alternative_slots', $alternativeSlots->toArray())
                    ->withErrors(['no_teacher' => 'No hay profesores disponibles en este horario.']);
            }
        } elseif ($studentType === 'weekly' && $isVerified) {
            // Flujo semanal: puede elegir cualquier hora de cualquier día de la semana
            if (!$request->requested_datetime) {
                return back()->withErrors(['error' => 'Debes seleccionar un horario para tu clase.']);
            }

            $requestedDatetime = Carbon::parse($request->requested_datetime);
            $now = Carbon::now();

            // Validar que sea dentro de los próximos 7 días
            $maxDate = $now->copy()->addDays(7)->endOfDay();
            if ($requestedDatetime->gt($maxDate)) {
                return back()->withErrors(['error' => 'Solo puedes solicitar clases para los próximos 7 días.']);
            }

            // Obtener configuración de horarios de operación
            $operationStart = (int) (Setting::where('key', 'class_operation_start_hour')->value('content') ?? 8);
            $operationEnd = (int) (Setting::where('key', 'class_operation_end_hour')->value('content') ?? 22);

            // Validar que el horario esté dentro del rango de operación
            $requestedHour = $requestedDatetime->hour;
            if ($requestedHour < $operationStart || $requestedHour >= $operationEnd) {
                return back()->withErrors(['error' => "El horario debe estar entre las {$operationStart}:00 y las {$operationEnd}:00."]);
            }

            // Validar que sea al menos 30 minutos en el futuro
            if ($requestedDatetime->diffInMinutes($now, false) > -30) {
                return back()->withErrors(['error' => 'Debes solicitar con al menos 30 minutos de anticipación.']);
            }

            // Si quiere unirse a una clase existente - INSCRIPCIÓN AUTOMÁTICA
            if ($request->target_scheduled_class_id) {
                $targetClass = ScheduledClass::find($request->target_scheduled_class_id);

                if (!$targetClass || !$targetClass->hasAvailableSpace()) {
                    return back()->withErrors(['error' => 'La clase seleccionada ya no tiene espacio disponible.']);
                }

                if ($targetClass->class_template_id !== $template->id) {
                    return back()->withErrors(['error' => 'La clase seleccionada no corresponde a esta sesión.']);
                }

                // Inscribir automáticamente al estudiante en el grupo existente
                StudentClassEnrollment::create([
                    'student_id' => $student->id,
                    'scheduled_class_id' => $targetClass->id,
                ]);

                // Crear solicitud marcada como scheduled directamente
                // Usar el horario del grupo, no el requested_datetime calculado
                ClassRequest::create([
                    'student_id' => $user->id,
                    'class_template_id' => $template->id,
                    'type' => $type,
                    'student_message' => $request->message,
                    'requested_datetime' => $targetClass->scheduled_at,
                    'target_scheduled_class_id' => $targetClass->id,
                    'scheduled_class_id' => $targetClass->id,
                    'status' => 'scheduled',
                    'processed_at' => now(),
                ]);

                return back()->with('success', '¡Te has inscrito exitosamente en el grupo!');
            }

            // AUTO-ASSIGNMENT for WEEKLY students: No existing class selected, try to create one with available teacher
            $assignmentService = app(TeacherAssignmentService::class);
            $teacher = $assignmentService->findAvailableTeacher($requestedDatetime, $template);

            if ($teacher) {
                // Create a new scheduled class with the available teacher
                $scheduledClass = $assignmentService->createClassWithEnrollment(
                    $template,
                    $requestedDatetime,
                    $teacher,
                    $student,
                    $type
                );

                // Create the class request marked as scheduled
                ClassRequest::create([
                    'student_id' => $user->id,
                    'class_template_id' => $template->id,
                    'type' => $type,
                    'student_message' => $request->message,
                    'requested_datetime' => $requestedDatetime,
                    'scheduled_class_id' => $scheduledClass->id,
                    'status' => 'scheduled',
                    'processed_at' => now(),
                ]);

                return back()->with('success', '¡Tu clase ha sido programada automáticamente con ' . ($teacher->user?->name ?? $teacher->first_name) . '!');
            } else {
                // No teacher available, return alternative slots
                $alternativeSlots = $assignmentService->getAlternativeSlots($requestedDatetime, $template, 5);

                return back()->with('alternative_slots', $alternativeSlots->toArray())
                    ->withErrors(['no_teacher' => 'No hay profesores disponibles en este horario.']);
            }
        } else {
            /** @var \App\Models\User $user */
            $user = auth()->user();
            // Flujo para no verificados: guardar la preferencia de horario sin validaciones estrictas
            if ($request->requested_datetime) {
                $requestedDatetime = Carbon::parse($request->requested_datetime);
            }
        }

        // Crear la solicitud
        ClassRequest::create([
            'student_id' => $user->id,
            'class_template_id' => $template->id,
            'type' => $type,
            'student_message' => $request->message,
            'requested_datetime' => $requestedDatetime,
            'target_scheduled_class_id' => $targetScheduledClassId,
            'status' => 'pending',
        ]);

        return back()->with('success', 'Solicitud enviada exitosamente. El administrador revisará tu solicitud.');
    }

    /**
     * Cancelar una solicitud pendiente
     */
    public function destroy(ClassRequest $classRequest)
    {
        $user = auth()->user();

        if ($classRequest->student_id !== $user->id) {
            abort(403);
        }

        if (!$classRequest->isPending()) {
            return back()->withErrors(['error' => 'Solo puedes cancelar solicitudes pendientes.']);
        }

        $classRequest->delete();

        return back()->with('success', 'Solicitud cancelada.');
    }
}
