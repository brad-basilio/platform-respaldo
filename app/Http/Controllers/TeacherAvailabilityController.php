<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class TeacherAvailabilityController extends Controller
{
    /**
     * Show the teacher's availability settings page.
     */
    public function index(): Response
    {
        $user = Auth::user();
        $teacher = Teacher::where('user_id', $user->id)->with('timeSlots')->firstOrFail();

        return Inertia::render('Teacher/Availability', [
            'teacher' => [
                'id' => $teacher->id,
                'name' => $user->name,
                'meet_url' => $teacher->meet_url,
                'not_available_today' => (bool) $teacher->not_available_today,
                'time_slots' => $teacher->timeSlots->map(function ($slot) {
                    return [
                        'id' => $slot->id,
                        'day_of_week' => $slot->day_of_week,
                        'start_time' => $slot->start_time,
                        'end_time' => $slot->end_time,
                    ];
                }),
            ],
            'settings' => [
                'operation_start_hour' => \App\Models\Setting::get('class_operation_start_hour', '08:00'),
                'operation_end_hour' => \App\Models\Setting::get('class_operation_end_hour', '22:00'),
            ],
        ]);
    }

    /**
     * Update the teacher's availability settings.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'meet_url' => 'nullable|url',
            'time_slots' => 'array',
            'time_slots.*.day_of_week' => 'required|string|in:Lunes,Martes,Miércoles,Jueves,Viernes,Sábado,Domingo',
            'time_slots.*.start_time' => 'required|date_format:H:i',
            'time_slots.*.end_time' => 'required|date_format:H:i|after:time_slots.*.start_time',
        ]);

        $user = Auth::user();
        $teacher = Teacher::where('user_id', $user->id)->firstOrFail();

        // Update meet_url
        $teacher->update([
            'meet_url' => $validated['meet_url'],
        ]);

        // Update time slots
        $teacher->timeSlots()->delete();

        foreach ($validated['time_slots'] ?? [] as $slot) {
            // Calculate duration in minutes
            $start = strtotime($slot['start_time']);
            $end = strtotime($slot['end_time']);
            $duration = ($end - $start) / 60;

            TimeSlot::create([
                'teacher_id' => $teacher->id,
                'day_of_week' => $slot['day_of_week'],
                'start_time' => $slot['start_time'],
                'end_time' => $slot['end_time'],
                'duration' => $duration,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Configuración guardada exitosamente',
        ]);
    }

    /**
     * Toggle the teacher's not_available_today flag.
     */
    public function toggleAvailability()
    {
        $user = Auth::user();
        $teacher = Teacher::where('user_id', $user->id)->firstOrFail();

        $teacher->update([
            'not_available_today' => !$teacher->not_available_today,
        ]);

        return response()->json([
            'success' => true,
            'not_available_today' => (bool) $teacher->not_available_today,
            'message' => $teacher->not_available_today
                ? 'Has marcado que no atiendes hoy'
                : 'Disponibilidad activada',
        ]);
    }
}
