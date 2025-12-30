<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ClassTemplate;
use App\Models\ScheduledClass;
use App\Models\StudentClassEnrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TeacherClassController extends Controller
{
    /**
     * Display listing of teacher's assigned classes.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $teacher = $user->teacher;

        if (!$teacher) {
            return redirect()->route('dashboard')->with('error', 'No tienes un perfil de profesor asociado.');
        }

        $query = ScheduledClass::with(['template.academicLevel', 'enrollments.student'])
            ->where('teacher_id', $user->id)
            ->withCount('enrollments');

        // Filtrar por estado
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filtrar por fecha
        if ($request->filled('date')) {
            $query->whereDate('scheduled_at', $request->date);
        }

        // Por defecto, ordenar por fecha más reciente primero
        $scheduledClasses = $query->orderBy('scheduled_at', 'desc')->paginate(20);

        // Estadísticas del profesor
        $stats = [
            'totalClasses' => ScheduledClass::where('teacher_id', $user->id)->count(),
            'scheduledClasses' => ScheduledClass::where('teacher_id', $user->id)->where('status', 'scheduled')->count(),
            'inProgressClasses' => ScheduledClass::where('teacher_id', $user->id)->where('status', 'in_progress')->count(),
            'completedClasses' => ScheduledClass::where('teacher_id', $user->id)->where('status', 'completed')->count(),
            'totalStudents' => StudentClassEnrollment::whereHas('scheduledClass', function ($q) use ($user) {
                $q->where('teacher_id', $user->id);
            })->distinct('student_id')->count('student_id'),
            'todayClasses' => ScheduledClass::where('teacher_id', $user->id)
                ->whereDate('scheduled_at', today())
                ->whereIn('status', ['scheduled', 'in_progress'])
                ->count(),
        ];

        return Inertia::render('Teacher/MyClasses', [
            'scheduledClasses' => $scheduledClasses,
            'stats' => $stats,
            'filters' => $request->only(['status', 'date'])
        ]);
    }

    /**
     * Display a specific scheduled class.
     */
    public function show(ScheduledClass $scheduledClass)
    {
        $user = Auth::user();

        // Verificar que la clase pertenece al profesor
        if ($scheduledClass->teacher_id !== $user->id) {
            abort(403, 'No tienes acceso a esta clase.');
        }

        $scheduledClass->load([
            'template.academicLevel',
            'template.resources',
            'template.questions',
            'enrollments.student',
        ]);

        return Inertia::render('Teacher/ClassDetail', [
            'scheduledClass' => $scheduledClass
        ]);
    }

    /**
     * Update class status.
     */
    public function updateStatus(Request $request, ScheduledClass $scheduledClass)
    {
        $user = Auth::user();

        if ($scheduledClass->teacher_id !== $user->id) {
            abort(403, 'No tienes acceso a esta clase.');
        }

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
     * Add recording URL.
     */
    public function addRecording(Request $request, ScheduledClass $scheduledClass)
    {
        $user = Auth::user();

        if ($scheduledClass->teacher_id !== $user->id) {
            abort(403, 'No tienes acceso a esta clase.');
        }

        $validated = $request->validate([
            'recording_url' => 'required|url|max:500',
            'recording_thumbnail' => 'nullable|string|max:500',
        ]);

        $scheduledClass->update($validated);

        return redirect()->back()->with('success', 'Grabación agregada exitosamente');
    }

    /**
     * Mark attendance for a student.
     */
    public function markAttendance(Request $request, ScheduledClass $scheduledClass, StudentClassEnrollment $enrollment)
    {
        $user = Auth::user();

        if ($scheduledClass->teacher_id !== $user->id) {
            abort(403, 'No tienes acceso a esta clase.');
        }

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
     * Display listing of teacher's students.
     */
    public function myStudents(Request $request)
    {
        $user = Auth::user();
        $teacher = $user->teacher;

        if (!$teacher) {
            return redirect()->route('dashboard')->with('error', 'No tienes un perfil de profesor asociado.');
        }

        // Obtener estudiantes únicos de las clases del profesor
        $students = StudentClassEnrollment::with(['student.academicLevel', 'scheduledClass.template'])
            ->whereHas('scheduledClass', function ($q) use ($user) {
                $q->where('teacher_id', $user->id);
            })
            ->get()
            ->groupBy('student_id')
            ->map(function ($enrollments) {
                $student = $enrollments->first()->student;
                $completedClasses = $enrollments->filter(function ($e) {
                    return $e->scheduledClass->status === 'completed' && $e->attended && $e->exam_completed;
                })->count();
                $totalClasses = $enrollments->count();

                return [
                    'id' => $student->id,
                    'first_name' => $student->first_name,
                    'last_name' => $student->paternal_last_name . ' ' . $student->maternal_last_name,
                    'email' => $student->email,
                    'phone' => $student->phone,
                    'academic_level' => $student->academicLevel?->name ?? 'Sin nivel',
                    'academic_level_color' => $student->academicLevel?->color ?? '#3B82F6',
                    'completed_classes' => $completedClasses,
                    'total_classes' => $totalClasses,
                    'progress' => $totalClasses > 0 ? round(($completedClasses / $totalClasses) * 100) : 0,
                    'enrollments' => $enrollments->map(function ($e) {
                        return [
                            'id' => $e->id,
                            'class_title' => $e->scheduledClass->template->title ?? 'Sin título',
                            'session_number' => $e->scheduledClass->template->session_number ?? '-',
                            'status' => $e->scheduledClass->status,
                            'attended' => $e->attended,
                            'exam_completed' => $e->exam_completed,
                            'scheduled_at' => $e->scheduledClass->scheduled_at,
                        ];
                    })->values(),
                ];
            })
            ->values();

        return Inertia::render('Teacher/MyStudents', [
            'students' => $students,
            'stats' => [
                'totalStudents' => $students->count(),
                'activeStudents' => $students->filter(fn($s) => $s['progress'] < 100)->count(),
                'graduatedStudents' => $students->filter(fn($s) => $s['progress'] === 100)->count(),
            ]
        ]);
    }

    /**
     * Display class templates (read only).
     */
    public function classTemplates(Request $request)
    {
        $templates = ClassTemplate::with('academicLevel')
            ->active()
            ->ordered()
            ->get();

        return Inertia::render('Teacher/ClassTemplates', [
            'templates' => $templates
        ]);
    }

    /**
     * Display a specific class template.
     */
    public function showTemplate(ClassTemplate $template)
    {
        $template->load(['academicLevel', 'resources', 'questions']);

        return Inertia::render('Teacher/ClassTemplateDetail', [
            'template' => $template
        ]);
    }
}
