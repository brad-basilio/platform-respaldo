<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Group;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function index(): Response
    {
        $students = Student::with(['user', 'groups', 'badges'])->get()->map(function ($student) {
            return array_merge($student->toArray(), [
                'name' => $student->user->name,
                'email' => $student->user->email,
                'role' => 'student',
                'enrolledGroups' => $student->groups->pluck('id')->toArray(),
                'assignedGroupId' => $student->groups->first()?->id,
            ]);
        });

        $groups = Group::with('teacher.user')->get();

        return Inertia::render('Admin/StudentManagement', [
            'students' => $students,
            'groups' => $groups,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string',
            'paternal_last_name' => 'required|string',
            'maternal_last_name' => 'nullable|string',
            'email' => 'required|email|unique:users',
            'phone_number' => 'required|string',
            'gender' => 'required|string',
            'birth_date' => 'required|date',
            'document_type' => 'required|string',
            'document_number' => 'required|string|unique:students',
            'education_level' => 'required|string',
            'level' => 'required|in:basic,intermediate,advanced',
            'class_type' => 'required|in:theoretical,practical',
        ]);

        // Create user
        $user = \App\Models\User::create([
            'name' => trim("{$validated['first_name']} {$validated['paternal_last_name']} {$validated['maternal_last_name']}"),
            'email' => $validated['email'],
            'password' => bcrypt('password'), // Default password
            'role' => 'student',
        ]);

        // Create student profile
        $student = Student::create(array_merge($validated, [
            'user_id' => $user->id,
            'registration_date' => now(),
            'status' => 'active',
        ]));

        return redirect()->back()->with('success', 'Prospecto creado exitosamente');
    }

    public function update(Request $request, Student $student)
    {
        $validated = $request->validate([
            'first_name' => 'required|string',
            'paternal_last_name' => 'required|string',
            'maternal_last_name' => 'nullable|string',
            'phone_number' => 'required|string',
            'gender' => 'required|string',
            'birth_date' => 'required|date',
            'document_type' => 'required|string',
            'document_number' => 'required|string|unique:students,document_number,' . $student->id,
            'education_level' => 'required|string',
            'email' => 'required|email|unique:users,email,' . $student->user_id,
            'payment_date' => 'nullable|date',
            'enrollment_date' => 'nullable|date',
            'enrollment_code' => 'nullable|string',
            'level' => 'required|in:basic,intermediate,advanced',
            'contracted_plan' => 'nullable|string',
            'payment_verified' => 'boolean',
            'has_placement_test' => 'boolean',
            'test_date' => 'nullable|date',
            'test_score' => 'nullable|numeric',
            'guardian_name' => 'nullable|string',
            'guardian_document_number' => 'nullable|string',
            'guardian_email' => 'nullable|email',
            'guardian_birth_date' => 'nullable|date',
            'guardian_phone' => 'nullable|string',
            'guardian_address' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        // Update user
        $student->user->update([
            'name' => trim("{$validated['first_name']} {$validated['paternal_last_name']} {$validated['maternal_last_name']}"),
            'email' => $validated['email'],
        ]);

        // Update student
        $student->update($validated);

        // Update prospect status if enrollment date is set
        if ($validated['enrollment_date']) {
            $student->update(['prospect_status' => 'matriculado']);
        }

        return redirect()->back()->with('success', 'Prospecto actualizado exitosamente');
    }

    public function destroy(Student $student)
    {
        $student->user->delete(); // This will cascade delete the student
        return redirect()->back()->with('success', 'Prospecto eliminado exitosamente');
    }

    public function updateProspectStatus(Request $request, Student $student)
    {
        $validated = $request->validate([
            'prospect_status' => 'required|in:registrado,propuesta_enviada,verificacion_pago,matriculado',
        ]);

        $student->update($validated);

        return redirect()->back()->with('success', 'Estado actualizado exitosamente');
    }
}
