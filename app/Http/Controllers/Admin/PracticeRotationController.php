<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PracticeRotation;
use App\Models\Teacher;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class PracticeRotationController extends Controller
{
    public function index()
    {
        $teachers = Teacher::where('status', 'active')
            ->with('user:id,name')
            ->get()
            ->map(fn($t) => [
                'id' => $t->user_id,
                'name' => $t->user ? $t->user->name : $t->first_name . ' ' . $t->paternal_last_name
            ]);

        return Inertia::render('Admin/PracticeRotation', [
            'teachers' => $teachers
        ]);
    }

    public function getRotations(Request $request)
    {
        $month = $request->input('month', now()->month);
        $year = $request->input('year', now()->year);

        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();

        // Si estamos viendo el mes actual o futuro y no hay rotaciones, generarlas automáticamente
        $rotationsCount = PracticeRotation::whereBetween('date', [$startOfMonth, $endOfMonth])->count();
        if ($rotationsCount === 0 && $startOfMonth->copy()->endOfMonth()->isFuture()) {
            PracticeRotation::ensureRotationsExist($startOfMonth, $startOfMonth->daysInMonth);
        }

        $rotations = PracticeRotation::whereBetween('date', [$startOfMonth, $endOfMonth])
            ->with('teacher:id,name')
            ->get();

        return response()->json($rotations);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'teacher_id' => 'required|exists:users,id',
        ]);

        $rotation = PracticeRotation::updateOrCreate(
            ['date' => $validated['date']],
            ['teacher_id' => $validated['teacher_id']]
        );

        return response()->json([
            'success' => true,
            'message' => 'Turno guardado correctamente',
            'rotation' => $rotation->load('teacher:id,name')
        ]);
    }

    public function generate(Request $request)
    {
        $startDate = Carbon::parse($request->input('start_date', now()->toDateString()));
        $days = $request->input('days', 30);

        try {
            $newCount = PracticeRotation::ensureRotationsExist($startDate, $days);

            return response()->json([
                'success' => true,
                'message' => "Se generaron $newCount nuevos días de cronograma.",
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error al generar cronograma: ' . $e->getMessage()], 500);
        }
    }
}
