<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Group;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user()->load(['student', 'teacher']);

        if ($user->role === 'student' && $user->student) {
            return $this->studentDashboard($user);
        } elseif ($user->role === 'teacher' && $user->teacher) {
            return $this->teacherDashboard($user);
        } elseif ($user->role === 'admin') {
            return $this->adminDashboard($user);
        } elseif ($user->role === 'sales_advisor') {
            return $this->salesAdvisorDashboard($user);
        } elseif ($user->role === 'cashier') {
            return $this->cashierDashboard($user);
        }

        return Inertia::render('Dashboard');
    }

    protected function studentDashboard($user): Response
    {
        $student = $user->student->load(['groups', 'badges', 'certificates']);

        $studentData = array_merge($student->toArray(), [
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'student',
            'enrolledGroups' => $student->groups->pluck('id')->toArray(),
        ]);

        return Inertia::render('Dashboard/Student', [
            'student' => $studentData,
        ]);
    }

    protected function teacherDashboard($user): Response
    {
        $teacher = $user->teacher->load(['groups']);

        $teacherData = array_merge($teacher->toArray(), [
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'teacher',
            'assignedGroups' => $teacher->groups->map(function ($group) {
                return [
                    'groupId' => $group->id,
                    'groupName' => $group->name,
                    'type' => $group->type,
                    'schedule' => $group->schedule,
                ];
            })->toArray(),
        ]);

        return Inertia::render('Dashboard/Teacher', [
            'teacher' => $teacherData,
        ]);
    }

    protected function adminDashboard($user): Response
    {
        $adminData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'admin',
            'createdAt' => $user->created_at,
        ];

        $stats = [
            'totalStudents' => Student::count(),
            'activeStudents' => Student::where('status', 'active')->count(),
            'totalTeachers' => Teacher::count(),
            'activeTeachers' => Teacher::where('status', 'active')->count(),
            'totalGroups' => Group::count(),
            'activeGroups' => Group::where('status', 'active')->count(),
        ];

        return Inertia::render('Dashboard/Admin', [
            'admin' => $adminData,
            'stats' => $stats,
        ]);
    }

    protected function salesAdvisorDashboard($user): Response
    {
        // Filtrar solo los prospectos registrados por este asesor de ventas
        $stats = [
            'totalProspects' => Student::where('registered_by', $user->id)->count(),
            'registrados' => Student::where('registered_by', $user->id)
                ->where('prospect_status', 'registrado')->count(),
            'propuestasEnviadas' => Student::where('registered_by', $user->id)
                ->where('prospect_status', 'propuesta_enviada')->count(),
            'pagosPorVerificar' => Student::where('registered_by', $user->id)
                ->where('prospect_status', 'pago_por_verificar')->count(),
            'matriculados' => Student::where('registered_by', $user->id)
                ->where('prospect_status', 'matriculado')->count(),
        ];

        return Inertia::render('Dashboard', [
            'stats' => $stats,
        ]);
    }

    protected function cashierDashboard($user): Response
    {
        $stats = [
            'pagosPendientes' => Student::where('prospect_status', 'pago_por_verificar')->count(),
            'verificadosHoy' => Student::where('prospect_status', 'matriculado')
                ->whereDate('updated_at', today())
                ->count(),
            'matriculasDelMes' => Student::where('prospect_status', 'matriculado')
                ->whereYear('updated_at', now()->year)
                ->whereMonth('updated_at', now()->month)
                ->count(),
        ];

        return Inertia::render('Dashboard', [
            'stats' => $stats,
        ]);
    }
}
