<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicLevel;
use App\Models\ClassTemplate;
use App\Models\TemplateQuestion;
use App\Models\TemplateResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ClassTemplateController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = ClassTemplate::with(['academicLevel', 'creator'])
            ->withCount(['questions', 'resources', 'scheduledClasses']);

        // Filtrar por nivel académico
        if ($request->filled('level_id')) {
            $query->where('academic_level_id', $request->level_id);
        }

        // Filtrar por modalidad
        if ($request->filled('modality')) {
            $query->where('modality', $request->modality);
        }

        // Filtrar por estado
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active === 'true');
        }

        $templates = $query->ordered()->get();
        $academicLevels = AcademicLevel::active()->get();

        return Inertia::render('Admin/ClassTemplates/Index', [
            'templates' => $templates,
            'academicLevels' => $academicLevels,
            'filters' => $request->only(['level_id', 'modality', 'is_active'])
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $academicLevels = AcademicLevel::active()->get();

        return Inertia::render('Admin/ClassTemplates/Create', [
            'academicLevels' => $academicLevels
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'academic_level_id' => 'required|exists:academic_levels,id',
            'title' => 'required|string|max:255',
            'session_number' => 'required|string|max:50',
            'modality' => 'required|in:theoretical,practical',
            'description' => 'nullable|string',
            'content' => 'nullable|string',
            'objectives' => 'nullable|string',
            'intro_video_url' => 'nullable|url|max:500',
            'intro_video_thumbnail' => 'nullable|string|max:500',
            'duration_minutes' => 'integer|min:1|max:480',
            'order' => 'nullable|integer|min:0',
            'has_exam' => 'boolean',
            'exam_questions_count' => 'integer|min:1|max:100',
            'exam_passing_score' => 'integer|min:1|max:100',
            'is_active' => 'boolean',
        ]);

        // Verificar unicidad de session_number dentro del nivel
        $exists = ClassTemplate::where('academic_level_id', $validated['academic_level_id'])
            ->where('session_number', $validated['session_number'])
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'session_number' => 'Ya existe una sesión con este número en este nivel académico'
            ]);
        }

        $validated['created_by'] = Auth::id();

        if (!isset($validated['order'])) {
            $validated['order'] = ClassTemplate::where('academic_level_id', $validated['academic_level_id'])->max('order') + 1;
        }

        $template = ClassTemplate::create($validated);

        return redirect()->route('admin.class-templates.edit', $template)
            ->with('success', 'Plantilla de clase creada exitosamente. Ahora puede agregar preguntas y recursos.');
    }

    /**
     * Display the specified resource.
     */
    public function show(ClassTemplate $classTemplate)
    {
        $classTemplate->load([
            'academicLevel',
            'creator',
            'questions' => fn($q) => $q->orderBy('created_at'),
            'resources' => fn($q) => $q->orderBy('created_at'),
        ]);

        return Inertia::render('Admin/ClassTemplates/Show', [
            'template' => $classTemplate
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(ClassTemplate $classTemplate)
    {
        $classTemplate->load([
            'academicLevel',
            'questions' => fn($q) => $q->orderBy('created_at'),
            'resources' => fn($q) => $q->orderBy('created_at'),
        ]);

        $academicLevels = AcademicLevel::active()->get();

        return Inertia::render('Admin/ClassTemplates/Edit', [
            'template' => $classTemplate,
            'academicLevels' => $academicLevels
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ClassTemplate $classTemplate)
    {
        $validated = $request->validate([
            'academic_level_id' => 'required|exists:academic_levels,id',
            'title' => 'required|string|max:255',
            'session_number' => 'required|string|max:50',
            'modality' => 'required|in:theoretical,practical',
            'description' => 'nullable|string',
            'content' => 'nullable|string',
            'objectives' => 'nullable|string',
            'intro_video_url' => 'nullable|url|max:500',
            'intro_video_thumbnail' => 'nullable|string|max:500',
            'duration_minutes' => 'integer|min:1|max:480',
            'order' => 'nullable|integer|min:0',
            'has_exam' => 'boolean',
            'exam_questions_count' => 'integer|min:1|max:100',
            'exam_passing_score' => 'integer|min:1|max:100',
            'is_active' => 'boolean',
        ]);

        // Verificar unicidad de session_number
        $exists = ClassTemplate::where('academic_level_id', $validated['academic_level_id'])
            ->where('session_number', $validated['session_number'])
            ->where('id', '!=', $classTemplate->id)
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'session_number' => 'Ya existe una sesión con este número en este nivel académico'
            ]);
        }

        $classTemplate->update($validated);

        return redirect()->back()->with('success', 'Plantilla actualizada exitosamente');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ClassTemplate $classTemplate)
    {
        // Verificar si tiene clases programadas
        if ($classTemplate->scheduledClasses()->count() > 0) {
            return redirect()->back()->withErrors([
                'delete' => 'No se puede eliminar esta plantilla porque tiene clases programadas'
            ]);
        }

        $classTemplate->delete();

        return redirect()->route('admin.class-templates.index')
            ->with('success', 'Plantilla eliminada exitosamente');
    }

    /**
     * Add a question to the template
     */
    public function addQuestion(Request $request, ClassTemplate $classTemplate)
    {
        $validated = $request->validate([
            'question' => 'required|string',
            'type' => 'required|in:multiple_choice,true_false',
            'options' => 'required|array|min:2',
            'options.*.text' => 'required|string',
            'options.*.is_correct' => 'required|boolean',
            'explanation' => 'nullable|string',
            'points' => 'integer|min:1|max:10',
        ]);

        // Verificar que haya al menos una respuesta correcta
        $hasCorrect = collect($validated['options'])->contains('is_correct', true);
        if (!$hasCorrect) {
            return redirect()->back()->withErrors([
                'options' => 'Debe haber al menos una respuesta correcta'
            ]);
        }

        $classTemplate->questions()->create($validated);

        return redirect()->back()->with('success', 'Pregunta agregada exitosamente');
    }

    /**
     * Update a question
     */
    public function updateQuestion(Request $request, ClassTemplate $classTemplate, TemplateQuestion $question)
    {
        $validated = $request->validate([
            'question' => 'required|string',
            'type' => 'required|in:multiple_choice,true_false',
            'options' => 'required|array|min:2',
            'options.*.text' => 'required|string',
            'options.*.is_correct' => 'required|boolean',
            'explanation' => 'nullable|string',
            'points' => 'integer|min:1|max:10',
            'is_active' => 'boolean',
        ]);

        $question->update($validated);

        return redirect()->back()->with('success', 'Pregunta actualizada exitosamente');
    }

    /**
     * Delete a question
     */
    public function deleteQuestion(ClassTemplate $classTemplate, TemplateQuestion $question)
    {
        $question->delete();

        return redirect()->back()->with('success', 'Pregunta eliminada exitosamente');
    }

    /**
     * Upload a resource
     */
    public function uploadResource(Request $request, ClassTemplate $classTemplate)
    {
        $validated = $request->validate([
            'file' => 'required|file|max:51200', // 50MB max
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $path = $file->store('class-resources/' . $classTemplate->id, 'public');

        $classTemplate->resources()->create([
            'name' => $validated['name'],
            'file_path' => $path,
            'file_type' => $file->getClientOriginalExtension(),
            'file_size' => $file->getSize(),
            'description' => $validated['description'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Recurso subido exitosamente');
    }

    /**
     * Delete a resource
     */
    public function deleteResource(ClassTemplate $classTemplate, TemplateResource $resource)
    {
        // Eliminar archivo físico
        if (Storage::disk('public')->exists($resource->file_path)) {
            Storage::disk('public')->delete($resource->file_path);
        }

        $resource->delete();

        return redirect()->back()->with('success', 'Recurso eliminado exitosamente');
    }

    /**
     * Duplicate a template
     */
    public function duplicate(ClassTemplate $classTemplate)
    {
        $newTemplate = $classTemplate->replicate();
        $newTemplate->title = $classTemplate->title . ' (Copia)';
        $newTemplate->session_number = $classTemplate->session_number . '-copy';
        $newTemplate->created_by = Auth::id();
        $newTemplate->save();

        // Duplicar preguntas
        foreach ($classTemplate->questions as $question) {
            $newQuestion = $question->replicate();
            $newQuestion->class_template_id = $newTemplate->id;
            $newQuestion->save();
        }

        // Duplicar recursos (referencias, no archivos físicos)
        foreach ($classTemplate->resources as $resource) {
            $newResource = $resource->replicate();
            $newResource->class_template_id = $newTemplate->id;
            $newResource->download_count = 0;
            $newResource->save();
        }

        return redirect()->route('admin.class-templates.edit', $newTemplate)
            ->with('success', 'Plantilla duplicada exitosamente');
    }

    /**
     * Get templates as JSON for API
     */
    public function getTemplatesJson(Request $request)
    {
        $query = ClassTemplate::with(['academicLevel'])
            ->withCount(['questions', 'resources']);

        if ($request->filled('level_id')) {
            $query->where('academic_level_id', $request->level_id);
        }

        if ($request->filled('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json($query->ordered()->get());
    }
}
