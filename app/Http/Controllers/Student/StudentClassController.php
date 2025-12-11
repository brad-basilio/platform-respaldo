<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\StudentClassEnrollment;
use App\Models\StudentExamAttempt;
use App\Models\TemplateQuestion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StudentClassController extends Controller
{
    /**
     * Display listing of student's enrolled classes.
     */
    public function index()
    {
        $user = Auth::user();
        $student = $user->student;
        
        if (!$student) {
            return redirect()->route('dashboard')->with('error', 'No tienes un perfil de estudiante asociado.');
        }

        $enrollments = StudentClassEnrollment::with([
            'scheduledClass.template.academicLevel',
            'scheduledClass.template'
        ])
            ->where('student_id', $student->id)
            ->whereHas('scheduledClass', function ($query) {
                $query->whereIn('status', ['scheduled', 'in_progress', 'completed']);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        $completedCount = $enrollments->filter(function ($enrollment) {
            $class = $enrollment->scheduledClass;
            return $class->status === 'completed' && 
                   $enrollment->attended && 
                   (!$class->template->has_exam || $enrollment->exam_completed);
        })->count();

        return Inertia::render('Student/MyClasses', [
            'enrollments' => $enrollments,
            'completedCount' => $completedCount,
            'totalCount' => $enrollments->count()
        ]);
    }

    /**
     * Display a specific class enrollment with content.
     */
    public function show(StudentClassEnrollment $enrollment)
    {
        $user = Auth::user();
        $student = $user->student;
        
        // Verify ownership
        if (!$student || $enrollment->student_id !== $student->id) {
            abort(403, 'No tienes acceso a esta clase.');
        }

        $enrollment->load([
            'scheduledClass.template.academicLevel',
            'scheduledClass.template.resources'
        ]);

        // Get exam questions if template has exam and exam not completed
        $examQuestions = null;
        if ($enrollment->scheduledClass->template->has_exam && !$enrollment->exam_completed) {
            $template = $enrollment->scheduledClass->template;
            
            // Get random questions from the question bank
            $examQuestions = TemplateQuestion::where('class_template_id', $template->id)
                ->where('is_active', true)
                ->inRandomOrder()
                ->limit($template->exam_questions_count)
                ->get()
                ->map(function ($question) {
                    // Shuffle options to randomize answer order
                    $options = collect($question->options)->shuffle()->values()->toArray();
                    return [
                        'id' => $question->id,
                        'question' => $question->question,
                        'type' => $question->type,
                        'options' => array_map(function ($opt) {
                            return ['text' => $opt['text']]; // Remove is_correct from client
                        }, $options),
                        'points' => $question->points
                    ];
                });
        }

        // Get latest exam attempt if exists
        $latestAttempt = StudentExamAttempt::where('student_class_enrollment_id', $enrollment->id)
            ->latest()
            ->first();

        if ($latestAttempt) {
            $enrollment->latest_exam_attempt = [
                'id' => $latestAttempt->id,
                'score' => $latestAttempt->score,
                'total_points' => $latestAttempt->total_points,
                'percentage' => round(($latestAttempt->score / $latestAttempt->total_points) * 100),
                'passed' => $latestAttempt->passed,
                'completed_at' => $latestAttempt->completed_at
            ];
        }

        return Inertia::render('Student/ClassView', [
            'enrollment' => $enrollment,
            'examQuestions' => $examQuestions
        ]);
    }

    /**
     * Submit exam answers.
     */
    public function submitExam(Request $request, StudentClassEnrollment $enrollment)
    {
        $user = Auth::user();
        $student = $user->student;
        
        // Verify ownership
        if (!$student || $enrollment->student_id !== $student->id) {
            abort(403, 'No tienes acceso a esta clase.');
        }

        $request->validate([
            'answers' => 'required|array'
        ]);

        $template = $enrollment->scheduledClass->template;
        $answers = $request->answers;
        
        // Get the questions used in this exam
        // For now, we'll get random questions again and match by order
        // In production, you might want to store the question IDs in the session
        $questions = TemplateQuestion::where('class_template_id', $template->id)
            ->where('is_active', true)
            ->inRandomOrder()
            ->limit($template->exam_questions_count)
            ->get();

        $totalPoints = 0;
        $earnedPoints = 0;
        $results = [];

        foreach ($questions as $index => $question) {
            $totalPoints += $question->points;
            $userAnswer = $answers[$index] ?? null;
            
            // Find if the answer is correct
            $isCorrect = false;
            foreach ($question->options as $option) {
                if ($option['text'] === $userAnswer && ($option['is_correct'] ?? false)) {
                    $isCorrect = true;
                    $earnedPoints += $question->points;
                    break;
                }
            }
            
            $results[] = [
                'question_id' => $question->id,
                'answer' => $userAnswer,
                'is_correct' => $isCorrect,
                'points_earned' => $isCorrect ? $question->points : 0
            ];
        }

        $percentage = $totalPoints > 0 ? round(($earnedPoints / $totalPoints) * 100) : 0;
        $passed = $percentage >= $template->exam_passing_score;

        // Create exam attempt
        $attempt = StudentExamAttempt::create([
            'student_class_enrollment_id' => $enrollment->id,
            'questions' => $questions->pluck('id')->toArray(),
            'answers' => $results,
            'score' => $earnedPoints,
            'total_points' => $totalPoints,
            'passed' => $passed,
            'started_at' => now(),
            'completed_at' => now()
        ]);

        // Update enrollment if passed
        if ($passed) {
            $enrollment->update([
                'exam_completed' => true,
                'exam_score' => $percentage
            ]);
        }

        return back()->with('success', $passed 
            ? '¡Felicitaciones! Has aprobado la evaluación.' 
            : 'No alcanzaste el puntaje mínimo. Puedes intentar de nuevo.');
    }
}
