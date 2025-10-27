<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeacherController extends Controller
{
    public function index(): Response
    {
        $teachers = Teacher::with(['user', 'groups', 'timeSlots'])->get()->map(function ($teacher) {
            return array_merge($teacher->toArray(), [
                'name' => $teacher->user->name,
                'email' => $teacher->user->email,
                'role' => 'teacher',
                'assignedGroups' => $teacher->groups->map(function ($group) {
                    return [
                        'groupId' => $group->id,
                        'groupName' => $group->name,
                        'type' => $group->type,
                        'schedule' => $group->schedule,
                    ];
                })->toArray(),
                'assignedGroupIds' => $teacher->groups->pluck('id')->toArray(),
                'availableSchedule' => $teacher->timeSlots->toArray(),
            ]);
        });

        return Inertia::render('Admin/TeacherManagement', [
            'teachers' => $teachers,
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
            'age' => 'nullable|integer',
            'birth_date' => 'required|date',
            'document_type' => 'required|in:DNI,CE',
            'document_number' => 'required|string|unique:teachers',
            'education_level' => 'required|string',
            'start_date' => 'required|date',
            'bank_account' => 'nullable|string',
            'bank' => 'nullable|string',
            'work_modality' => 'required|string',
            'language_level' => 'required|string',
            'contract_status' => 'required|in:contratado,en_proceso,finalizado',
            'contract_period' => 'nullable|string',
            'contract_modality' => 'nullable|string',
            'current_address' => 'nullable|string',
            'emergency_contact_number' => 'nullable|string',
            'emergency_contact_relationship' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'specialization' => 'required|in:theoretical,practical,both',
            'status' => 'required|in:active,inactive',
            'available_schedule' => 'required|array',
        ]);

        // Create user
        $user = \App\Models\User::create([
            'name' => trim("{$validated['first_name']} {$validated['paternal_last_name']} {$validated['maternal_last_name']}"),
            'email' => $validated['email'],
            'password' => bcrypt('password'), // Default password
            'role' => 'teacher',
        ]);

        // Create teacher profile
        $teacher = Teacher::create(array_merge($validated, [
            'user_id' => $user->id,
        ]));

        // Create time slots
        foreach ($validated['available_schedule'] as $slot) {
            TimeSlot::create([
                'teacher_id' => $teacher->id,
                'day_of_week' => $slot['dayOfWeek'],
                'start_time' => $slot['startTime'],
                'end_time' => $slot['endTime'],
                'duration' => $slot['duration'],
            ]);
        }

        return redirect()->back()->with('success', 'Profesor creado exitosamente');
    }

    public function update(Request $request, Teacher $teacher)
    {
        $validated = $request->validate([
            'first_name' => 'required|string',
            'paternal_last_name' => 'required|string',
            'maternal_last_name' => 'nullable|string',
            'phone_number' => 'required|string',
            'gender' => 'required|string',
            'age' => 'nullable|integer',
            'birth_date' => 'required|date',
            'document_type' => 'required|in:DNI,CE',
            'document_number' => 'required|string|unique:teachers,document_number,' . $teacher->id,
            'education_level' => 'required|string',
            'email' => 'required|email|unique:users,email,' . $teacher->user_id,
            'start_date' => 'required|date',
            'bank_account' => 'nullable|string',
            'bank' => 'nullable|string',
            'work_modality' => 'required|string',
            'language_level' => 'required|string',
            'contract_status' => 'required|in:contratado,en_proceso,finalizado',
            'contract_period' => 'nullable|string',
            'contract_modality' => 'nullable|string',
            'current_address' => 'nullable|string',
            'emergency_contact_number' => 'nullable|string',
            'emergency_contact_relationship' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'specialization' => 'required|in:theoretical,practical,both',
            'status' => 'required|in:active,inactive',
            'available_schedule' => 'required|array',
        ]);

        // Update user
        $teacher->user->update([
            'name' => trim("{$validated['first_name']} {$validated['paternal_last_name']} {$validated['maternal_last_name']}"),
            'email' => $validated['email'],
        ]);

        // Update teacher
        $teacher->update($validated);

        // Update time slots
        $teacher->timeSlots()->delete();
        foreach ($validated['available_schedule'] as $slot) {
            TimeSlot::create([
                'teacher_id' => $teacher->id,
                'day_of_week' => $slot['dayOfWeek'],
                'start_time' => $slot['startTime'],
                'end_time' => $slot['endTime'],
                'duration' => $slot['duration'],
            ]);
        }

        return redirect()->back()->with('success', 'Profesor actualizado exitosamente');
    }

    public function destroy(Teacher $teacher)
    {
        if ($teacher->groups()->count() > 0) {
            return redirect()->back()->withErrors(['error' => 'No se puede eliminar un profesor con grupos asignados']);
        }

        $teacher->user->delete(); // This will cascade delete the teacher
        return redirect()->back()->with('success', 'Profesor eliminado exitosamente');
    }
}
