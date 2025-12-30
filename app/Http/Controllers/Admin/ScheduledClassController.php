<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassTemplate;
use App\Models\Group;
use App\Models\ScheduledClass;
use App\Models\Student;
use App\Models\StudentClassEnrollment;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ScheduledClassController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = ScheduledClass::with(['template.academicLevel', 'teacher', 'group'])
            ->withCount('enrollments');

        // Filtrar por estado
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filtrar por profesor
        if ($request->filled('teacher_id')) {
            $query->where('teacher_id', $request->teacher_id);
        }

        // Filtrar por fecha
        if ($request->filled('date')) {
            $query->whereDate('scheduled_at', $request->date);
        }

        // Filtrar por rango de fechas
        if ($request->filled('from_date')) {
            $query->whereDate('scheduled_at', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('scheduled_at', '<=', $request->to_date);
        }

        $scheduledClasses = $query->orderBy('scheduled_at', 'desc')->paginate(20);
        
        $templates = ClassTemplate::with('academicLevel')->active()->ordered()->get();
        $teachers = User::where('role', 'teacher')->get();
        $groups = Group::where('status', 'active')->get();

        return Inertia::render('Admin/ScheduledClasses/Index', [
            'scheduledClasses' => $scheduledClasses,
            'templates' => $templates,
            'teachers' => $teachers,
            'groups' => $groups,
            'filters' => $request->only(['status', 'teacher_id', 'date', 'from_date', 'to_date'])
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'class_template_id' => 'required|exists:class_templates,id',
            'teacher_id' => 'nullable|exists:users,id',
            'group_id' => 'nullable|exists:groups,id',
            'scheduled_at' => 'required|date|after:now',
            'meet_url' => 'nullable|url|max:500',
            'max_students' => 'integer|min:1|max:20',
            'notes' => 'nullable|string',
        ]);

        $scheduledClass = ScheduledClass::create($validated);

        return redirect()->back()->with('success', 'Clase programada exitosamente');
    }

    /**
     * Display the specified resource.
     */
    public function show(ScheduledClass $scheduledClass)
    {
        $scheduledClass->load([
            'template.academicLevel',
            'template.resources',
            'template.questions',
            'teacher',
            'group',
            'enrollments.student',
        ]);

        return Inertia::render('Admin/ScheduledClasses/Show', [
            'scheduledClass' => $scheduledClass
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ScheduledClass $scheduledClass)
    {
        $validated = $request->validate([
            'teacher_id' => 'nullable|exists:users,id',
            'group_id' => 'nullable|exists:groups,id',
            'scheduled_at' => 'required|date',
            'meet_url' => 'nullable|url|max:500',
            'recording_url' => 'nullable|url|max:500',
            'recording_thumbnail' => 'nullable|string|max:500',
            'status' => 'in:scheduled,in_progress,completed,cancelled',
            'max_students' => 'integer|min:1|max:20',
            'notes' => 'nullable|string',
        ]);

        $scheduledClass->update($validated);

        return redirect()->back()->with('success', 'Clase actualizada exitosamente');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ScheduledClass $scheduledClass)
    {
        if ($scheduledClass->enrollments()->count() > 0) {
            return redirect()->back()->withErrors([
                'delete' => 'No se puede eliminar esta clase porque tiene estudiantes inscritos'
            ]);
        }

        $scheduledClass->delete();

        return redirect()->back()->with('success', 'Clase eliminada exitosamente');
    }

    /**
     * Enroll a student to the class
     */
    public function enrollStudent(Request $request, ScheduledClass $scheduledClass)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
        ]);

        // Verificar capacidad
        if (!$scheduledClass->hasAvailableSpace()) {
            return redirect()->back()->withErrors([
                'enrollment' => 'La clase está llena, no hay espacio disponible'
            ]);
        }

        // Verificar si ya está inscrito
        $exists = $scheduledClass->enrollments()
            ->where('student_id', $validated['student_id'])
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'enrollment' => 'El estudiante ya está inscrito en esta clase'
            ]);
        }

        StudentClassEnrollment::create([
            'scheduled_class_id' => $scheduledClass->id,
            'student_id' => $validated['student_id'],
        ]);

        return redirect()->back()->with('success', 'Estudiante inscrito exitosamente');
    }

    /**
     * Remove student from class
     */
    public function unenrollStudent(ScheduledClass $scheduledClass, Student $student)
    {
        $scheduledClass->enrollments()
            ->where('student_id', $student->id)
            ->delete();

        return redirect()->back()->with('success', 'Estudiante removido de la clase');
    }

    /**
     * Update class status
     */
    public function updateStatus(Request $request, ScheduledClass $scheduledClass)
    {
        $validated = $request->validate([
            'status' => 'required|in:scheduled,in_progress,completed,cancelled',
        ]);

        $scheduledClass->update($validated);

        if ($validated['status'] === 'completed') {
            $scheduledClass->update(['ended_at' => now()]);
        }

        return redirect()->back()->with('success', 'Estado actualizado exitosamente');
    }

    /**
     * Add recording URL
     */
    public function addRecording(Request $request, ScheduledClass $scheduledClass)
    {
        $validated = $request->validate([
            'recording_url' => 'required|url|max:500',
            'recording_thumbnail' => 'nullable|string|max:500',
        ]);

        $scheduledClass->update($validated);

        return redirect()->back()->with('success', 'Grabación agregada exitosamente');
    }

    /**
     * Mark attendance for a student enrollment
     */
    public function markAttendance(Request $request, ScheduledClass $scheduledClass, StudentClassEnrollment $enrollment)
    {
        // Verificar que el enrollment pertenece a la clase
        if ($enrollment->scheduled_class_id !== $scheduledClass->id) {
            return redirect()->back()->withErrors([
                'attendance' => 'La inscripción no pertenece a esta clase'
            ]);
        }

        $validated = $request->validate([
            'attended' => 'required|boolean',
        ]);

        $enrollment->update([
            'attended' => $validated['attended'],
            'joined_at' => $validated['attended'] ? ($enrollment->joined_at ?? now()) : null,
        ]);

        $status = $validated['attended'] ? 'marcada como presente' : 'marcada como ausente';
        return redirect()->back()->with('success', "Asistencia {$status}");
    }

    /**
     * Get calendar data for scheduled classes
     */
    public function calendar(Request $request)
    {
        $start = $request->get('start', now()->startOfMonth());
        $end = $request->get('end', now()->endOfMonth());

        $classes = ScheduledClass::with(['template.academicLevel', 'teacher'])
            ->whereBetween('scheduled_at', [$start, $end])
            ->get()
            ->map(fn($class) => [
                'id' => $class->id,
                'title' => $class->template->title,
                'start' => $class->scheduled_at->toIso8601String(),
                'end' => $class->scheduled_at->addMinutes($class->template->duration_minutes)->toIso8601String(),
                'color' => $class->template->academicLevel->color ?? '#3788d8',
                'extendedProps' => [
                    'status' => $class->status,
                    'teacher' => $class->teacher?->name,
                    'level' => $class->template->academicLevel->name,
                ]
            ]);

        return response()->json($classes);
    }

    /**
     * Get available students for enrollment
     */
    public function getAvailableStudents(ScheduledClass $scheduledClass)
    {
        $enrolledIds = $scheduledClass->enrollments()->pluck('student_id');
        
        $students = Student::whereNotIn('id', $enrolledIds)
            ->where('status', 'enrolled')
            ->get(['id', 'first_name', 'last_name', 'email']);

        return response()->json($students);
    }
}
