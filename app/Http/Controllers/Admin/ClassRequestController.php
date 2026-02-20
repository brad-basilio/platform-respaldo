<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassRequest;
use App\Models\ClassTemplate;
use App\Models\ScheduledClass;
use App\Models\StudentClassEnrollment;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClassRequestController extends Controller
{
    /**
     * Listar todas las solicitudes
     */
    public function index(Request $request)
    {
        $query = ClassRequest::with([
            'student.student.academicLevel',
            'template.academicLevel',
            'scheduledClass.teacher',
            'targetScheduledClass.teacher',
            'processedBy'
        ])->regular();

        // Filtro por estado
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filtro por nivel
        if ($request->filled('level_id')) {
            $query->whereHas('template', fn($q) => $q->where('academic_level_id', $request->level_id));
        }

        $requests = $query->latest()->paginate(20);

        // Para los filtros
        $academicLevels = \App\Models\AcademicLevel::orderBy('order')->get();
        $teachers = User::where('role', 'teacher')->orderBy('name')->get(['id', 'name', 'email']);

        // Obtener grupos activos (clases con cupo) por template
        $activeGroups = ScheduledClass::where('status', 'scheduled')
            ->where('scheduled_at', '>', now())
            ->withCount('enrollments')
            ->with('teacher:id,name')
            ->get()
            ->filter(fn($c) => $c->enrollments_count < $c->max_students)
            ->groupBy('class_template_id')
            ->map(function ($classes) {
                return $classes->map(fn($c) => [
                    'id' => $c->id,
                    'scheduled_at' => $c->scheduled_at,
                    'teacher_name' => $c->teacher?->name,
                    'enrollments_count' => $c->enrollments_count,
                    'max_students' => $c->max_students,
                    'available_slots' => $c->max_students - $c->enrollments_count,
                ]);
            });

        // Contadores para las tabs
        $counts = [
            'pending' => ClassRequest::where('status', 'pending')->count(),
            'approved' => ClassRequest::where('status', 'approved')->count(),
            'scheduled' => ClassRequest::where('status', 'scheduled')->count(),
            'rejected' => ClassRequest::where('status', 'rejected')->count(),
        ];

        return Inertia::render('Admin/ClassRequests/Index', [
            'requests' => $requests,
            'academicLevels' => $academicLevels,
            'teachers' => $teachers,
            'filters' => $request->only(['status', 'level_id']),
            'counts' => $counts,
            'activeGroups' => $activeGroups,
            'type' => 'regular',
        ]);
    }

    /**
     * Listar todas las solicitudes de práctica
     */
    public function indexPractices(Request $request)
    {
        $query = ClassRequest::with([
            'student.student.academicLevel',
            'template.academicLevel',
            'scheduledClass.teacher',
            'targetScheduledClass.teacher',
            'processedBy'
        ])->practice();

        // Filtro por estado
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filtro por nivel
        if ($request->filled('level_id')) {
            $query->whereHas('template', fn($q) => $q->where('academic_level_id', $request->level_id));
        }

        $requests = $query->latest()->paginate(20);

        // Para los filtros
        $academicLevels = \App\Models\AcademicLevel::orderBy('order')->get();
        $teachers = User::where('role', 'teacher')->orderBy('name')->get(['id', 'name', 'email']);

        // Obtener grupos activos por template
        $activeGroups = ScheduledClass::where('status', 'scheduled')
            ->practice()
            ->where('scheduled_at', '>', now())
            ->withCount('enrollments')
            ->with('teacher:id,name')
            ->get()
            ->filter(fn($c) => $c->enrollments_count < $c->max_students)
            ->groupBy('class_template_id')
            ->map(function ($classes) {
                return $classes->map(fn($c) => [
                    'id' => $c->id,
                    'scheduled_at' => $c->scheduled_at,
                    'teacher_name' => $c->teacher?->name,
                    'enrollments_count' => $c->enrollments_count,
                    'max_students' => $c->max_students,
                    'available_slots' => $c->max_students - $c->enrollments_count,
                ]);
            });

        // Contadores para las tabs
        $counts = [
            'pending' => ClassRequest::practice()->where('status', 'pending')->count(),
            'approved' => ClassRequest::practice()->where('status', 'approved')->count(),
            'scheduled' => ClassRequest::practice()->where('status', 'scheduled')->count(),
            'rejected' => ClassRequest::practice()->where('status', 'rejected')->count(),
        ];

        return Inertia::render('Admin/ClassRequests/Index', [
            'requests' => $requests,
            'academicLevels' => $academicLevels,
            'teachers' => $teachers,
            'filters' => $request->only(['status', 'level_id']),
            'counts' => $counts,
            'activeGroups' => $activeGroups,
            'type' => 'practice',
        ]);
    }

    /**
     * Aprobar solicitud (sin programar aún)
     */
    public function approve(ClassRequest $classRequest, Request $request)
    {
        if (!$classRequest->isPending()) {
            return back()->withErrors(['error' => 'Esta solicitud ya fue procesada.']);
        }

        $classRequest->approve(auth()->id(), $request->input('response'));

        return back()->with('success', 'Solicitud aprobada.');
    }

    /**
     * Rechazar solicitud
     */
    public function reject(ClassRequest $classRequest, Request $request)
    {
        $request->validate([
            'response' => 'required|string|max:500',
        ]);

        if (!$classRequest->isPending()) {
            return back()->withErrors(['error' => 'Esta solicitud ya fue procesada.']);
        }

        $classRequest->reject(auth()->id(), $request->response);

        return back()->with('success', 'Solicitud rechazada.');
    }

    /**
     * Programar clase desde la solicitud
     */
    public function schedule(ClassRequest $classRequest, Request $request)
    {
        $request->validate([
            'scheduled_at' => 'required|date|after:now',
            'teacher_id' => 'nullable|exists:users,id',
            'meet_url' => 'nullable|url',
            'max_students' => 'required|integer|min:1|max:20',
        ]);

        // Verificar que la solicitud esté pendiente o aprobada
        if (!in_array($classRequest->status, ['pending', 'approved'])) {
            return back()->withErrors(['error' => 'Esta solicitud ya fue procesada.']);
        }

        // Crear la clase programada
        $scheduledClass = ScheduledClass::create([
            'class_template_id' => $classRequest->class_template_id,
            'type' => $classRequest->type,
            'teacher_id' => $request->teacher_id,
            'scheduled_at' => $request->scheduled_at,
            'meet_url' => $request->meet_url,
            'max_students' => $request->max_students,
            'status' => 'scheduled',
        ]);

        // Obtener el student_id correcto (de la tabla students, no users)
        $studentUser = $classRequest->student;
        $student = $studentUser->student; // Relación User->Student

        if (!$student) {
            return back()->withErrors(['error' => 'El usuario no tiene un perfil de estudiante.']);
        }

        // Inscribir al estudiante automáticamente
        StudentClassEnrollment::create([
            'student_id' => $student->id,
            'scheduled_class_id' => $scheduledClass->id,
        ]);

        // Marcar la solicitud como programada
        $classRequest->markAsScheduled($scheduledClass->id, auth()->id());

        return back()->with('success', 'Clase programada y estudiante inscrito exitosamente.');
    }

    /**
     * Agregar estudiante a una clase existente
     */
    public function assignToExisting(ClassRequest $classRequest, Request $request)
    {
        $request->validate([
            'scheduled_class_id' => 'required|exists:scheduled_classes,id',
        ]);

        $scheduledClass = ScheduledClass::findOrFail($request->scheduled_class_id);

        // Verificar que la clase sea de la misma plantilla
        if ($scheduledClass->class_template_id !== $classRequest->class_template_id) {
            return back()->withErrors(['error' => 'La clase seleccionada no corresponde a la misma sesión.']);
        }

        // Verificar que haya cupo
        if ($scheduledClass->enrollments()->count() >= $scheduledClass->max_students) {
            return back()->withErrors(['error' => 'La clase seleccionada está llena.']);
        }

        // Verificar que el estudiante no esté ya inscrito
        $studentUser = $classRequest->student;
        $student = $studentUser->student; // Relación User->Student

        if (!$student) {
            return back()->withErrors(['error' => 'El usuario no tiene un perfil de estudiante.']);
        }

        $alreadyEnrolled = StudentClassEnrollment::where('student_id', $student->id)
            ->where('scheduled_class_id', $scheduledClass->id)
            ->exists();

        if ($alreadyEnrolled) {
            return back()->withErrors(['error' => 'El estudiante ya está inscrito en esta clase.']);
        }

        // Inscribir al estudiante
        StudentClassEnrollment::create([
            'student_id' => $student->id,
            'scheduled_class_id' => $scheduledClass->id,
        ]);

        // Marcar la solicitud como programada
        $classRequest->markAsScheduled($scheduledClass->id, auth()->id());

        return back()->with('success', 'Estudiante asignado a la clase exitosamente.');
    }

    /**
     * Obtener clases disponibles para una plantilla
     */
    public function getAvailableClasses(ClassTemplate $template)
    {
        $classes = ScheduledClass::where('class_template_id', $template->id)
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>', now())
            ->withCount('enrollments')
            ->with('teacher:id,name')
            ->get()
            ->filter(fn($c) => $c->enrollments_count < $c->max_students);

        return response()->json($classes);
    }
}
