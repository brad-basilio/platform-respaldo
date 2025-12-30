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
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|integer|exists:template_questions,id',
            'answers.*.answer' => 'nullable|string'
        ]);

        $template = $enrollment->scheduledClass->template;
        $submittedAnswers = $request->answers;
        
        // Extract question IDs from submitted answers
        $questionIds = collect($submittedAnswers)->pluck('question_id')->toArray();
        
        // Get the actual questions by their IDs (preserving the order they were shown)
        $questions = TemplateQuestion::whereIn('id', $questionIds)
            ->where('class_template_id', $template->id)
            ->get()
            ->keyBy('id');

        $totalPoints = 0;
        $earnedPoints = 0;
        $results = [];

        foreach ($submittedAnswers as $submittedAnswer) {
            $questionId = $submittedAnswer['question_id'];
            $userAnswer = $submittedAnswer['answer'] ?? null;
            $question = $questions->get($questionId);
            
            if (!$question) continue;
            
            $totalPoints += $question->points;
            
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
            'student_id' => $student->id,
            'class_template_id' => $template->id,
            'student_class_enrollment_id' => $enrollment->id,
            'questions' => $questionIds,
            'answers' => $results,
            'score' => $earnedPoints,
            'total_points' => $totalPoints,
            'percentage' => $percentage,
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

        // Count total attempts for this enrollment
        $totalAttempts = StudentExamAttempt::where('student_class_enrollment_id', $enrollment->id)->count();

        // Return JSON response for AJAX requests
        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'score' => $earnedPoints,
                'total_points' => $totalPoints,
                'percentage' => $percentage,
                'passed' => $passed,
                'passing_score' => $template->exam_passing_score,
                'attempts' => $totalAttempts,
                'message' => $passed 
                    ? '¡Felicitaciones! Has aprobado la evaluación.' 
                    : 'No alcanzaste el puntaje mínimo. Puedes intentar de nuevo.'
            ]);
        }

        return back()->with('success', $passed 
            ? '¡Felicitaciones! Has aprobado la evaluación.' 
            : 'No alcanzaste el puntaje mínimo. Puedes intentar de nuevo.');
    }

    /**
     * Get exam questions for an enrollment (API).
     */
    public function getExamQuestions(StudentClassEnrollment $enrollment)
    {
        $user = Auth::user();
        $student = $user->student;
        
        // Verify ownership
        if (!$student || $enrollment->student_id !== $student->id) {
            return response()->json(['error' => 'No tienes acceso a esta clase.'], 403);
        }

        $template = $enrollment->scheduledClass->template;

        // Check if template has exam
        if (!$template->has_exam) {
            return response()->json(['error' => 'Esta clase no tiene examen.'], 400);
        }

        // Check if exam already completed
        if ($enrollment->exam_completed) {
            return response()->json(['error' => 'Ya completaste este examen.'], 400);
        }

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

        return response()->json([
            'questions' => $examQuestions,
            'passing_score' => $template->exam_passing_score
        ]);
    }

    /**
     * Get exam results for review (API).
     */
    public function getExamResults(StudentClassEnrollment $enrollment)
    {
        $user = Auth::user();
        $student = $user->student;
        
        // Verify ownership
        if (!$student || $enrollment->student_id !== $student->id) {
            return response()->json(['error' => 'No tienes acceso a esta clase.'], 403);
        }

        $template = $enrollment->scheduledClass->template;

        // Get the latest exam attempt
        $latestAttempt = StudentExamAttempt::where('student_class_enrollment_id', $enrollment->id)
            ->latest()
            ->first();

        if (!$latestAttempt) {
            return response()->json(['error' => 'No has realizado ningún intento de examen.'], 404);
        }

        // Count total attempts
        $totalAttempts = StudentExamAttempt::where('student_class_enrollment_id', $enrollment->id)->count();
        $maxAttempts = $template->exam_max_attempts ?? 3;
        $attemptsExhausted = $totalAttempts >= $maxAttempts;

        // Get the questions that were in this attempt
        $questionIds = $latestAttempt->questions;
        $questions = TemplateQuestion::whereIn('id', $questionIds)->get()->keyBy('id');

        // Build the review data
        $reviewData = [];
        foreach ($latestAttempt->answers as $answer) {
            $question = $questions->get($answer['question_id']);
            if (!$question) continue;

            $reviewItem = [
                'question' => $question->question,
                'student_answer' => $answer['answer'],
                'is_correct' => $answer['is_correct'],
                'points_earned' => $answer['points_earned'],
                'points_possible' => $question->points,
            ];

            // Only show correct answer if attempts are exhausted or exam is passed
            if ($attemptsExhausted || $enrollment->exam_completed) {
                $correctOption = collect($question->options)->firstWhere('is_correct', true);
                $reviewItem['correct_answer'] = $correctOption ? $correctOption['text'] : null;
            }

            $reviewData[] = $reviewItem;
        }

        return response()->json([
            'attempt' => [
                'score' => $latestAttempt->score,
                'total_points' => $latestAttempt->total_points,
                'percentage' => $latestAttempt->percentage ?? round(($latestAttempt->score / $latestAttempt->total_points) * 100),
                'passed' => $latestAttempt->passed,
                'completed_at' => $latestAttempt->completed_at,
            ],
            'questions' => $reviewData,
            'attempts_used' => $totalAttempts,
            'max_attempts' => $maxAttempts,
            'attempts_exhausted' => $attemptsExhausted,
            'show_correct_answers' => $attemptsExhausted || $enrollment->exam_completed,
            'passing_score' => $template->exam_passing_score,
        ]);
    }
}
