<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\ClassRequest;
use App\Models\ClassTemplate;
use App\Models\StudentClassEnrollment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClassRequestController extends Controller
{
    /**
     * Mostrar todas las plantillas del nivel del estudiante
     */
    public function index()
    {
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

        // Obtener las clases en las que está inscrito el estudiante
        $enrollments = StudentClassEnrollment::where('student_id', $user->id)
            ->with(['scheduledClass.template.academicLevel'])
            ->get()
            ->keyBy(fn($e) => $e->scheduledClass->class_template_id);

        // Obtener las solicitudes pendientes del estudiante
        $myRequests = ClassRequest::where('student_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->get()
            ->keyBy('class_template_id');

        return Inertia::render('Student/MyClasses', [
            'templates' => $templates,
            'enrollments' => $enrollments,
            'myRequests' => $myRequests,
            'academicLevel' => $student->academicLevel,
        ]);
    }

    /**
     * Ver detalle de una plantilla (temario)
     */
    public function show(ClassTemplate $template)
    {
        $user = auth()->user();
        $student = $user->student;

        // Verificar que la plantilla sea del nivel del estudiante
        if (!$student || $template->academic_level_id !== $student->academic_level_id) {
            abort(403, 'No tienes acceso a esta plantilla.');
        }

        $template->load(['academicLevel', 'questions', 'resources']);

        // Verificar si ya tiene una inscripción o solicitud
        $enrollment = StudentClassEnrollment::where('student_id', $user->id)
            ->whereHas('scheduledClass', fn($q) => $q->where('class_template_id', $template->id))
            ->with('scheduledClass')
            ->first();

        $existingRequest = ClassRequest::where('student_id', $user->id)
            ->where('class_template_id', $template->id)
            ->whereIn('status', ['pending', 'approved'])
            ->first();

        return Inertia::render('Student/ClassTemplateView', [
            'template' => $template,
            'enrollment' => $enrollment,
            'existingRequest' => $existingRequest,
        ]);
    }

    /**
     * Solicitar una clase
     */
    public function store(Request $request)
    {
        $request->validate([
            'class_template_id' => 'required|exists:class_templates,id',
            'message' => 'nullable|string|max:500',
        ]);

        $user = auth()->user();
        $student = $user->student;
        $template = ClassTemplate::findOrFail($request->class_template_id);

        // Verificar que la plantilla sea del nivel del estudiante
        if (!$student || $template->academic_level_id !== $student->academic_level_id) {
            return back()->withErrors(['error' => 'No puedes solicitar clases de otro nivel.']);
        }

        // Verificar que no tenga una solicitud pendiente
        $existingRequest = ClassRequest::where('student_id', $user->id)
            ->where('class_template_id', $template->id)
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($existingRequest) {
            return back()->withErrors(['error' => 'Ya tienes una solicitud pendiente para esta clase.']);
        }

        // Verificar que no esté ya inscrito en una clase de esta plantilla
        $alreadyEnrolled = StudentClassEnrollment::where('student_id', $user->id)
            ->whereHas('scheduledClass', fn($q) => $q->where('class_template_id', $template->id))
            ->exists();

        if ($alreadyEnrolled) {
            return back()->withErrors(['error' => 'Ya estás inscrito en una clase de esta sesión.']);
        }

        // Crear la solicitud
        ClassRequest::create([
            'student_id' => $user->id,
            'class_template_id' => $template->id,
            'student_message' => $request->message,
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
