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
        $student = $user->student->load([
            'groups', 
            'badges', 
            'certificates',
            'activeEnrollment.verifiedBy'
        ]);

        // Rename activeEnrollment to enrollment for frontend consistency
        if ($student->activeEnrollment) {
            $student->enrollment = $student->activeEnrollment;
        }

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

        // Stats generales
        $stats = [
            'totalStudents' => Student::count(),
            'activeStudents' => Student::where('status', 'active')->count(),
            'totalTeachers' => Teacher::count(),
            'activeTeachers' => Teacher::where('status', 'active')->count(),
            'totalGroups' => Group::count(),
            'activeGroups' => Group::where('status', 'active')->count(),
            
            // Stats de prospectos
            'totalProspects' => Student::count(),
            'registrados' => Student::where('prospect_status', 'registrado')->count(),
            'propuestasEnviadas' => Student::where('prospect_status', 'propuesta_enviada')->count(),
            'pagosPorVerificar' => Student::where('prospect_status', 'pago_por_verificar')->count(),
            'matriculados' => Student::where('prospect_status', 'matriculado')->count(),
            'verificados' => Student::where('prospect_status', 'matriculado')
                ->where('enrollment_verified', true)->count(),
            
            // KPIs de hoy
            'prospectosHoy' => Student::whereDate('created_at', today())->count(),
            'verificadosHoy' => Student::where('prospect_status', 'matriculado')
                ->where('enrollment_verified', true)
                ->whereDate('enrollment_verified_at', today())->count(),
            'enProceso' => Student::whereIn('prospect_status', ['propuesta_enviada', 'pago_por_verificar'])->count(),
            
            // Stats de usuarios del sistema
            'totalUsers' => User::count(),
            'admins' => User::where('role', 'admin')->count(),
            'salesAdvisors' => User::where('role', 'sales_advisor')->count(),
            'cashiers' => User::where('role', 'cashier')->count(),
            'verifiers' => User::where('role', 'verifier')->count(),
        ];

        // Datos para gráficos - Prospectos vs Matriculados Verificados (últimos 30 días)
        $dailyStudents = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dailyStudents[] = [
                'date' => $date->format('d M'),
                'prospectos' => Student::whereDate('created_at', $date->toDateString())->count(),
                'verificados' => Student::where('prospect_status', 'matriculado')
                    ->where('enrollment_verified', true)
                    ->whereDate('enrollment_verified_at', $date->toDateString())->count(),
            ];
        }

        // Distribución de prospectos por estado
        $prospectDistribution = [
            ['name' => 'Registrado', 'value' => $stats['registrados'], 'color' => '#073372'],
            ['name' => 'Propuesta Enviada', 'value' => $stats['propuestasEnviadas'], 'color' => '#F98613'],
            ['name' => 'Pago Por Verificar', 'value' => $stats['pagosPorVerificar'], 'color' => '#FFA726'],
            ['name' => 'Matriculado', 'value' => $stats['matriculados'], 'color' => '#17BC91'],
        ];

        // Top asesores de ventas (por número de matriculados VERIFICADOS - solo cuentan para comisión)
        $topSalesAdvisors = Student::selectRaw('registered_by, COUNT(*) as total')
            ->where('prospect_status', 'matriculado')
            ->where('enrollment_verified', true)
            ->whereNotNull('registered_by')
            ->groupBy('registered_by')
            ->orderByDesc('total')
            ->limit(5)
            ->with('registeredBy:id,name')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->registeredBy->name ?? 'Desconocido',
                    'total' => $item->total,
                ];
            });

        return Inertia::render('Dashboard/Admin', [
            'admin' => $adminData,
            'stats' => $stats,
            'dailyStudents' => $dailyStudents,
            'prospectDistribution' => $prospectDistribution,
            'topSalesAdvisors' => $topSalesAdvisors,
        ]);
    }

    protected function salesAdvisorDashboard($user): Response
    {
        $salesAdvisorData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'sales_advisor',
        ];

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
            'verificados' => Student::where('registered_by', $user->id)
                ->where('prospect_status', 'matriculado')
                ->where('enrollment_verified', true)->count(),
            
            // KPIs de hoy
            'prospectosHoy' => Student::where('registered_by', $user->id)
                ->whereDate('created_at', today())->count(),
            'verificadosHoy' => Student::where('registered_by', $user->id)
                ->where('prospect_status', 'matriculado')
                ->where('enrollment_verified', true)
                ->whereDate('enrollment_verified_at', today())->count(),
            'enProceso' => Student::where('registered_by', $user->id)
                ->whereIn('prospect_status', ['propuesta_enviada', 'pago_por_verificar'])->count(),
        ];

        // Datos para gráficos - Prospectos vs Matriculados Verificados (últimos 30 días)
        $dailyStudents = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dailyStudents[] = [
                'date' => $date->format('d M'),
                'prospectos' => Student::where('registered_by', $user->id)
                    ->whereDate('created_at', $date->toDateString())->count(),
                'verificados' => Student::where('registered_by', $user->id)
                    ->where('prospect_status', 'matriculado')
                    ->where('enrollment_verified', true)
                    ->whereDate('enrollment_verified_at', $date->toDateString())->count(),
            ];
        }

        // Distribución de prospectos por estado
        $prospectDistribution = [
            ['name' => 'Registrado', 'value' => $stats['registrados'], 'color' => '#073372'],
            ['name' => 'Propuesta Enviada', 'value' => $stats['propuestasEnviadas'], 'color' => '#F98613'],
            ['name' => 'Pago Por Verificar', 'value' => $stats['pagosPorVerificar'], 'color' => '#FFA726'],
            ['name' => 'Matriculado', 'value' => $stats['matriculados'], 'color' => '#17BC91'],
        ];

        return Inertia::render('Dashboard', [
            'salesAdvisor' => $salesAdvisorData,
            'stats' => $stats,
            'dailyStudents' => $dailyStudents,
            'prospectDistribution' => $prospectDistribution,
        ]);
    }

    protected function cashierDashboard($user): Response
    {
        // Estudiantes verificados (matriculados y verificados)
        $verifiedStudents = Student::where('prospect_status', 'matriculado')
            ->where('enrollment_verified', true)
            ->with(['enrollment.installments'])
            ->get();

        // Contar estudiantes con pagos pendientes
        $pendingPayments = $verifiedStudents->filter(function ($student) {
            return $student->enrollment && ($student->enrollment->paymentProgress ?? 0) < 100;
        })->count();

        // Contar estudiantes con pagos completos
        $completedPayments = $verifiedStudents->filter(function ($student) {
            return $student->enrollment && $student->enrollment->paymentProgress == 100;
        })->count();

        // Contar vouchers pendientes de verificación
        $vouchersToVerify = 0;
        foreach ($verifiedStudents as $student) {
            if ($student->enrollment && $student->enrollment->installments) {
                $vouchersToVerify += $student->enrollment->installments->filter(function ($installment) {
                    return $installment->status === 'paid';
                })->count();
            }
        }

        // Estadísticas generales
        $stats = [
            'totalProspects' => Student::count(),
            'totalVerifiedStudents' => $verifiedStudents->count(),
            'pagosPendientes' => Student::where('prospect_status', 'pago_por_verificar')->count(),
            'verificadosHoy' => Student::where('prospect_status', 'matriculado')
                ->whereDate('updated_at', today())
                ->count(),
            'matriculasDelMes' => Student::where('prospect_status', 'matriculado')
                ->whereYear('updated_at', now()->year)
                ->whereMonth('updated_at', now()->month)
                ->count(),
            'totalMatriculados' => Student::where('prospect_status', 'matriculado')->count(),
            'enProceso' => Student::whereIn('prospect_status', ['propuesta_enviada', 'pago_por_verificar'])->count(),
            'pendingPayments' => $pendingPayments,
            'completedPayments' => $completedPayments,
            'vouchersToVerify' => $vouchersToVerify,
        ];

        // Prospectos verificados por día (últimos 30 días)
        $dailyVerifications = Student::selectRaw('DATE(updated_at) as date, COUNT(*) as total')
            ->where('prospect_status', 'matriculado')
            ->where('updated_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => \Carbon\Carbon::parse($item->date)->format('d/m'),
                    'verificados' => $item->total,
                ];
            });

        // Rellenar días sin datos
        $dailyData = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dateKey = $date->format('d/m');
            
            $existing = $dailyVerifications->firstWhere('date', $dateKey);
            
            $dailyData[] = [
                'date' => $dateKey,
                'verificados' => $existing ? $existing['verificados'] : 0,
            ];
        }

        // Distribución de estados de pago
        $paymentDistribution = [
            [
                'name' => 'Pago Por Verificar',
                'value' => Student::where('prospect_status', 'pago_por_verificar')->count(),
                'color' => '#F98613', // Beer Orange
            ],
            [
                'name' => 'Matriculado',
                'value' => Student::where('prospect_status', 'matriculado')->count(),
                'color' => '#17BC91', // Pradera
            ],
            [
                'name' => 'Propuesta Enviada',
                'value' => Student::where('prospect_status', 'propuesta_enviada')->count(),
                'color' => '#073372', // Catalina
            ],
        ];

        return Inertia::render('Dashboard', [
            'cashier' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'cashier',
            ],
            'stats' => $stats,
            'dailyVerifications' => $dailyData,
            'paymentDistribution' => $paymentDistribution,
        ]);
    }
}
