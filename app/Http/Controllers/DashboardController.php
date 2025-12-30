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
        } elseif ($user->role === 'verifier') {
            return $this->verifierDashboard($user);
        }

        return Inertia::render('Dashboard');
    }

    protected function studentDashboard($user): Response
    {
        $student = $user->student->load([
            'groups', 
            'badges', 
            'certificates',
            'activeEnrollment.paymentPlan',
            'activeEnrollment.installments.vouchers',
            'activeEnrollment.verifiedBy',
            'verifiedEnrollmentBy',
            'academicLevel', // ✅ Cargar nivel académico del estudiante
            'contractAcceptances' // ✅ Cargar contratos
        ]);

        // ✅ VALIDACIÓN: Si el estudiante está matriculado pero NO ha firmado el contrato, redirigir
        if ($student->prospect_status === 'matriculado') {
            // Obtener el último contrato generado para este estudiante
            $latestContract = $student->contractAcceptances()
                ->orderBy('created_at', 'desc')
                ->first();

            // Si hay contrato pero no está firmado, redirigir a firma
            if ($latestContract && !$latestContract->isAccepted()) {
                return Inertia::render('Student/ContractView', [
                    'contract' => [
                        'id' => $latestContract->id,
                        'pdf_url' => $latestContract->pdf_path ? asset('storage/' . $latestContract->pdf_path) : null,
                        'accepted' => false,
                        'accepted_at' => null,
                        'token' => $latestContract->token,
                    ],
                    'student' => [
                        'name' => $student->first_name . ' ' . $student->paternal_last_name,
                        'email' => $user->email,
                        'academic_level' => $student->academicLevel?->name ?? 'Sin nivel',
                        'payment_plan' => $student->activeEnrollment?->paymentPlan?->name ?? 'Sin plan',
                        // ✅ Incluir información del contrato para el layout
                        'contract' => [
                            'id' => $latestContract->id,
                            'pdf_url' => $latestContract->pdf_path ? asset('storage/' . $latestContract->pdf_path) : null,
                            'accepted' => false,
                            'accepted_at' => null,
                            'token' => $latestContract->token,
                        ]
                    ]
                ]);
            }
        }

        // Rename activeEnrollment to enrollment for frontend consistency
        if ($student->activeEnrollment) {
            $student->enrollment = $student->activeEnrollment;
        }

        // Obtener datos de pagos usando la misma lógica que StudentPaymentController
        $paymentStats = [];
        if ($student->activeEnrollment) {
            $enrollment = $student->activeEnrollment;
            
            // ✅ Calcular mora automáticamente para todas las cuotas pendientes
            foreach ($enrollment->installments as $installment) {
                if ($installment->status === 'pending') {
                    $installment->calculateLateFee();
                }
            }
            
            // Refrescar las cuotas después de calcular la mora
            $enrollment->load('installments');
            
            // Contar cuotas verificadas (status = 'verified')
            $verifiedInstallments = $enrollment->installments->where('status', 'verified')->count();
            
            // Contar cuotas en verificación (status = 'paid' pero no 'verified')
            $inVerificationInstallments = $enrollment->installments->where('status', 'paid')->count();
            
            // Total de cuotas pagadas (verified + paid)
            $paidInstallments = $verifiedInstallments + $inVerificationInstallments;
            
            // Cuotas pendientes
            $pendingInstallments = $enrollment->installments->where('status', 'pending')->count();
            
            // Total de cuotas
            $totalInstallments = $enrollment->installments->count();
            
            // Cuotas vencidas (con mora aplicada)
            $overdueInstallments = $enrollment->installments->filter(function ($installment) {
                return $installment->status === 'pending' && $installment->is_overdue;
            })->count();
            
            // Próximo pago pendiente
            $nextPayment = $enrollment->installments
                ->where('status', 'pending')
                ->sortBy('due_date')
                ->first();
            
            // Usar los valores calculados del enrollment (incluyen mora)
            $totalAmount = (float) $enrollment->paymentPlan->total_amount;
            $paidAmount = (float) $enrollment->total_paid;
            $pendingAmount = (float) $enrollment->total_pending;
            
            // ✅ Calcular días hasta vencimiento y período de gracia para el próximo pago
            $nextPaymentData = null;
            if ($nextPayment) {
                $today = \Carbon\Carbon::today();
                $dueDate = $nextPayment->due_date;
                $gracePeriodDays = $enrollment->paymentPlan->grace_period_days ?? 0;
                
                // Calcular días hasta vencimiento (positivo = futuro, negativo = pasado)
                $daysUntilDue = $today->diffInDays($dueDate, false);
                
                // Calcular fecha límite con período de gracia
                $graceLimit = $dueDate->copy()->addDays($gracePeriodDays);
                $daysUntilGraceLimit = $today->diffInDays($graceLimit, false);
                
                // Determinar si está en período de gracia
                $isInGracePeriod = $daysUntilDue < 0 && $daysUntilGraceLimit >= 0 && $gracePeriodDays > 0;
                
                $nextPaymentData = [
                    'amount' => (float) $nextPayment->total_due, // ✅ Usar total_due que incluye mora
                    'due_date' => $nextPayment->due_date->format('Y-m-d'),
                    'installment_number' => $nextPayment->installment_number,
                    'has_late_fee' => $nextPayment->late_fee > 0,
                    'late_fee' => (float) $nextPayment->late_fee,
                    'days_until_due' => $daysUntilDue,
                    'days_until_grace_limit' => $daysUntilGraceLimit,
                    'grace_period_days' => $gracePeriodDays,
                    'is_in_grace_period' => $isInGracePeriod,
                    'is_overdue' => $nextPayment->is_overdue,
                ];
            }

            $paymentStats = [
                'totalInstallments' => $totalInstallments,
                'paidInstallments' => $paidInstallments,
                'verifiedInstallments' => $verifiedInstallments,
                'inVerificationInstallments' => $inVerificationInstallments,
                'pendingInstallments' => $pendingInstallments,
                'overdueInstallments' => $overdueInstallments,
                'totalAmount' => $totalAmount,
                'paidAmount' => $paidAmount,
                'pendingAmount' => $pendingAmount,
                'nextPayment' => $nextPaymentData,
                'paymentProgress' => (float) $enrollment->payment_progress,
            ];
        }

        // Verificar si tiene documentos pendientes de confirmar
        $hasPendingDocuments = \App\Models\EnrollmentDocument::where('student_id', $student->id)
            ->where('requires_signature', true)
            ->where('student_confirmed', false)
            ->exists();

        // ✅ Obtener información del contrato para el frontend
        $latestContract = $student->contractAcceptances()
            ->orderBy('created_at', 'desc')
            ->first();

        $contractData = null;
        if ($latestContract) {
            $contractData = [
                'id' => $latestContract->id,
                'pdf_url' => $latestContract->pdf_path ? asset('storage/' . $latestContract->pdf_path) : null,
                'accepted' => $latestContract->isAccepted(),
                'accepted_at' => $latestContract->accepted_at?->format('Y-m-d H:i:s'),
                'token' => $latestContract->token,
            ];
        }

        $studentData = array_merge($student->toArray(), [
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'student',
            'enrolledGroups' => $student->groups->pluck('id')->toArray(),
            'paymentStats' => $paymentStats,
            'hasPendingDocuments' => $hasPendingDocuments,
            'contract' => $contractData, // ✅ Información del contrato
            // Asegurar que los campos de verificación estén en camelCase
            'enrollmentVerified' => $student->enrollment_verified,
            'enrollmentVerifiedAt' => $student->enrollment_verified_at,
            'verifiedEnrollmentBy' => $student->verifiedEnrollmentBy,
            'prospectStatus' => $student->prospect_status,
            'enrollmentDate' => $student->enrollment_date,
        ]);

        return Inertia::render('Dashboard/Student', [
            'student' => $studentData,
        ]);
    }

    protected function teacherDashboard($user): Response
    {
        $teacher = $user->teacher->load(['groups']);

        // Obtener estadísticas reales de clases del profesor
        $stats = [
            'totalClasses' => \App\Models\ScheduledClass::where('teacher_id', $user->id)->count(),
            'scheduledClasses' => \App\Models\ScheduledClass::where('teacher_id', $user->id)->where('status', 'scheduled')->count(),
            'inProgressClasses' => \App\Models\ScheduledClass::where('teacher_id', $user->id)->where('status', 'in_progress')->count(),
            'completedClasses' => \App\Models\ScheduledClass::where('teacher_id', $user->id)->where('status', 'completed')->count(),
            'totalStudents' => \App\Models\StudentClassEnrollment::whereHas('scheduledClass', function ($q) use ($user) {
                $q->where('teacher_id', $user->id);
            })->distinct('student_id')->count('student_id'),
            'todayClasses' => \App\Models\ScheduledClass::where('teacher_id', $user->id)
                ->whereDate('scheduled_at', today())
                ->whereIn('status', ['scheduled', 'in_progress'])
                ->count(),
            'pendingEvaluations' => \App\Models\StudentClassEnrollment::whereHas('scheduledClass', function ($q) use ($user) {
                $q->where('teacher_id', $user->id)->where('status', 'completed');
            })->where('attended', true)->where('exam_completed', false)->count(),
        ];

        // Clases de hoy
        $todayClasses = \App\Models\ScheduledClass::with(['template.academicLevel', 'enrollments'])
            ->where('teacher_id', $user->id)
            ->whereDate('scheduled_at', today())
            ->whereIn('status', ['scheduled', 'in_progress'])
            ->orderBy('scheduled_at')
            ->get()
            ->map(function ($class) {
                return [
                    'id' => $class->id,
                    'title' => $class->template->title,
                    'session_number' => $class->template->session_number,
                    'level' => $class->template->academicLevel->name ?? 'Sin nivel',
                    'level_color' => $class->template->academicLevel->color ?? '#3B82F6',
                    'time' => $class->scheduled_at->format('h:i A'),
                    'students' => $class->enrollments->count(),
                    'status' => $class->status,
                    'meet_url' => $class->meet_url,
                ];
            });

        // Próximas clases (siguientes 7 días)
        $upcomingClasses = \App\Models\ScheduledClass::with(['template.academicLevel', 'enrollments'])
            ->where('teacher_id', $user->id)
            ->where('scheduled_at', '>', now())
            ->where('scheduled_at', '<=', now()->addDays(7))
            ->where('status', 'scheduled')
            ->orderBy('scheduled_at')
            ->limit(5)
            ->get()
            ->map(function ($class) {
                return [
                    'id' => $class->id,
                    'title' => $class->template->title,
                    'session_number' => $class->template->session_number,
                    'level' => $class->template->academicLevel->name ?? 'Sin nivel',
                    'level_color' => $class->template->academicLevel->color ?? '#3B82F6',
                    'date' => $class->scheduled_at->format('d M'),
                    'time' => $class->scheduled_at->format('h:i A'),
                    'students' => $class->enrollments->count(),
                ];
            });

        // Clases recientes completadas
        $recentClasses = \App\Models\ScheduledClass::with(['template.academicLevel', 'enrollments'])
            ->where('teacher_id', $user->id)
            ->where('status', 'completed')
            ->orderBy('ended_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($class) {
                $attendedCount = $class->enrollments->where('attended', true)->count();
                return [
                    'id' => $class->id,
                    'title' => $class->template->title,
                    'session_number' => $class->template->session_number,
                    'level' => $class->template->academicLevel->name ?? 'Sin nivel',
                    'level_color' => $class->template->academicLevel->color ?? '#3B82F6',
                    'date' => $class->ended_at ? $class->ended_at->format('d M') : $class->scheduled_at->format('d M'),
                    'total_students' => $class->enrollments->count(),
                    'attended_students' => $attendedCount,
                    'has_recording' => !empty($class->recording_url),
                ];
            });

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
            'stats' => $stats,
            'todayClasses' => $todayClasses,
            'upcomingClasses' => $upcomingClasses,
            'recentClasses' => $recentClasses,
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

    protected function verifierDashboard($user): Response
    {
        $verifierData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'verifier',
            'createdAt' => $user->created_at,
        ];

        // Stats generales - FILTRADO POR VERIFICADOR
        $stats = [
            'totalStudents' => Student::count(),
            'activeStudents' => Student::where('status', 'active')->count(),
            
            // Stats de prospectos - Solo los que YO verifiqué
            'totalProspects' => Student::count(),
            'registrados' => Student::where('prospect_status', 'registrado')->count(),
            'propuestasEnviadas' => Student::where('prospect_status', 'propuesta_enviada')->count(),
            'pagosPorVerificar' => Student::where('prospect_status', 'pago_por_verificar')->count(),
            'matriculados' => Student::where('prospect_status', 'matriculado')->count(),
            
            // Verificados POR MÍ - Esta es la métrica clave para el verifier
            'verificados' => Student::where('prospect_status', 'matriculado')
                ->where('enrollment_verified', true)
                ->where('verified_enrollment_by', $user->id)
                ->count(),
            
            // KPIs de hoy
            'prospectosHoy' => Student::whereDate('created_at', today())->count(),
            
            // Verificados HOY por MÍ
            'verificadosHoy' => Student::where('prospect_status', 'matriculado')
                ->where('enrollment_verified', true)
                ->where('verified_enrollment_by', $user->id)
                ->whereDate('enrollment_verified_at', today())->count(),
                
            'enProceso' => Student::whereIn('prospect_status', ['propuesta_enviada', 'pago_por_verificar'])->count(),
            
            // Stats de usuarios del sistema
            'totalUsers' => User::count(),
            'admins' => User::where('role', 'admin')->count(),
            'salesAdvisors' => User::where('role', 'sales_advisor')->count(),
            'cashiers' => User::where('role', 'cashier')->count(),
            'verifiers' => User::where('role', 'verifier')->count(),
        ];

        // Datos para gráficos - Prospectos vs Verificados POR MÍ (últimos 30 días)
        $dailyStudents = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dailyStudents[] = [
                'date' => $date->format('d M'),
                'prospectos' => Student::whereDate('created_at', $date->toDateString())->count(),
                'verificados' => Student::where('prospect_status', 'matriculado')
                    ->where('enrollment_verified', true)
                    ->where('verified_enrollment_by', $user->id)
                    ->whereDate('enrollment_verified_at', $date->toDateString())->count(),
            ];
        }

        // Distribución de prospectos por estado (general, no filtrado)
        $prospectDistribution = [
            ['name' => 'Registrado', 'value' => $stats['registrados'], 'color' => '#073372'],
            ['name' => 'Propuesta Enviada', 'value' => $stats['propuestasEnviadas'], 'color' => '#F98613'],
            ['name' => 'Pago Por Verificar', 'value' => $stats['pagosPorVerificar'], 'color' => '#FFA726'],
            ['name' => 'Matriculado', 'value' => $stats['matriculados'], 'color' => '#17BC91'],
        ];

        // Top verificadores (comparación entre verificadores)
        $topVerifiers = Student::selectRaw('verified_enrollment_by, COUNT(*) as total')
            ->where('prospect_status', 'matriculado')
            ->where('enrollment_verified', true)
            ->whereNotNull('verified_enrollment_by')
            ->groupBy('verified_enrollment_by')
            ->orderByDesc('total')
            ->limit(5)
            ->with('verifiedEnrollmentBy:id,name')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->verifiedEnrollmentBy->name ?? 'Desconocido',
                    'total' => $item->total,
                ];
            });

        return Inertia::render('Dashboard/Verifier', [
            'admin' => $verifierData, // Usamos 'admin' para mantener consistencia con los tipos
            'stats' => $stats,
            'dailyStudents' => $dailyStudents,
            'prospectDistribution' => $prospectDistribution,
            'topSalesAdvisors' => $topVerifiers, // Reutilizamos el mismo slot para mostrar top verificadores
        ]);
    }
}
