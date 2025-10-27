<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\Teacher;
use App\Models\Student;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GroupController extends Controller
{
    public function index(): Response
    {
        $groups = Group::with(['teacher.user', 'students'])->get()->map(function ($group) {
            return array_merge($group->toArray(), [
                'teacherName' => $group->teacher?->user->name,
                'studentIds' => $group->students->pluck('id')->toArray(),
                'schedule' => $group->schedule,
            ]);
        });

        $teachers = Teacher::with(['user', 'timeSlots'])->where('status', 'active')->get()->map(function ($teacher) {
            return array_merge($teacher->toArray(), [
                'name' => $teacher->user->name,
                'availableSchedule' => $teacher->timeSlots->toArray(),
            ]);
        });

        $students = Student::with('user')->where('status', 'active')->get()->map(function ($student) {
            return array_merge($student->toArray(), [
                'name' => $student->user->name,
                'email' => $student->user->email,
            ]);
        });

        return Inertia::render('Admin/GroupManagement', [
            'groups' => $groups,
            'teachers' => $teachers,
            'students' => $students,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'type' => 'required|in:theoretical,practical',
            'level' => 'required|in:basic,intermediate,advanced',
            'teacher_id' => 'nullable|exists:teachers,id',
            'student_ids' => 'nullable|array',
            'student_ids.*' => 'exists:students,id',
            'schedule.dayOfWeek' => 'required|string',
            'schedule.startTime' => 'required|string',
            'schedule.endTime' => 'required|string',
            'schedule.duration' => 'required|integer',
            'status' => 'required|in:active,closed',
            'start_date' => 'required|date',
            'end_date' => 'required|date',
        ]);

        $maxCapacity = $validated['type'] === 'theoretical' ? 4 : 6;

        $group = Group::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'teacher_id' => $validated['teacher_id'] ?? null,
            'max_capacity' => $maxCapacity,
            'status' => $validated['status'],
            'level' => $validated['level'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'day_of_week' => $validated['schedule']['dayOfWeek'],
            'start_time' => $validated['schedule']['startTime'],
            'end_time' => $validated['schedule']['endTime'],
            'duration' => $validated['schedule']['duration'],
        ]);

        // Attach students
        if (isset($validated['student_ids'])) {
            $group->students()->attach($validated['student_ids']);
        }

        return redirect()->back()->with('success', 'Grupo creado exitosamente');
    }

    public function update(Request $request, Group $group)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'type' => 'required|in:theoretical,practical',
            'level' => 'required|in:basic,intermediate,advanced',
            'teacher_id' => 'nullable|exists:teachers,id',
            'student_ids' => 'nullable|array',
            'student_ids.*' => 'exists:students,id',
            'schedule.dayOfWeek' => 'required|string',
            'schedule.startTime' => 'required|string',
            'schedule.endTime' => 'required|string',
            'schedule.duration' => 'required|integer',
            'status' => 'required|in:active,closed',
            'start_date' => 'required|date',
            'end_date' => 'required|date',
        ]);

        $maxCapacity = $validated['type'] === 'theoretical' ? 4 : 6;

        $group->update([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'teacher_id' => $validated['teacher_id'] ?? null,
            'max_capacity' => $maxCapacity,
            'status' => $validated['status'],
            'level' => $validated['level'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'day_of_week' => $validated['schedule']['dayOfWeek'],
            'start_time' => $validated['schedule']['startTime'],
            'end_time' => $validated['schedule']['endTime'],
            'duration' => $validated['schedule']['duration'],
        ]);

        // Sync students
        if (isset($validated['student_ids'])) {
            $group->students()->sync($validated['student_ids']);
        } else {
            $group->students()->detach();
        }

        return redirect()->back()->with('success', 'Grupo actualizado exitosamente');
    }

    public function destroy(Group $group)
    {
        if ($group->students()->count() > 0) {
            return redirect()->back()->withErrors(['error' => 'No se puede eliminar un grupo con estudiantes inscritos']);
        }

        $group->delete();
        return redirect()->back()->with('success', 'Grupo eliminado exitosamente');
    }
}
