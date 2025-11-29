<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Group;
use App\Models\AcademicLevel;
use App\Models\PaymentPlan;
use App\Models\Enrollment;
use App\Models\ContractAcceptance;
use App\Mail\ProspectWelcomeMail;
use App\Mail\StudentEnrolledMail;
use App\Mail\ContractMail;
use App\Services\ContractGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;  // ✅ NUEVO: Para manejar archivos
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function enrolledStudents(): Response
    {
        $user = auth()->user();
        
        // Query base: estudiantes matriculados
        $query = Student::with([
            'user', 
            'groups', 
            'badges', 
            'registeredBy', 
            'verifiedPaymentBy', 
            'verifiedEnrollmentBy', 
            'academicLevel', 
            'paymentPlan',
            'contractAcceptances' => function ($query) {
                $query->orderBy('created_at', 'desc')->limit(1);
            }
        ])
            ->where('prospect_status', 'matriculado');
        
        // Lógica según rol
        if ($user->role === 'admin') {
            // Admin: Ver TODOS (verificados y no verificados)
            // No se aplica filtro adicional
        } elseif ($user->role === 'verifier') {
            // Verifier: Ver los que YO he verificado + los NO VERIFICADOS (para poder verificarlos)
            $query->where(function ($q) use ($user) {
                $q->where(function ($subQ) use ($user) {
                    // Los que YO he verificado
                    $subQ->where('enrollment_verified', true)
                         ->where('verified_enrollment_by', $user->id);
                })->orWhere('enrollment_verified', false); // O los NO VERIFICADOS
            });
        } else {
            // Sales Advisor y otros: Ver solo NO VERIFICADOS (pendientes de verificación)
            $query->where('enrollment_verified', false);
        }
        
        $students = $query->orderBy('enrollment_date', 'desc')
            ->get()
            ->map(function ($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->user->name ?? '',
                    'avatar' => $student->user->avatar ?? null,
                    'firstName' => $student->first_name,
                    'paternalLastName' => $student->paternal_last_name,
                    'maternalLastName' => $student->maternal_last_name,
                    'email' => $student->user->email ?? '',
                    'phoneNumber' => $student->phone_number,
                    'gender' => $student->gender,
                    'birthDate' => $student->birth_date?->format('Y-m-d'),
                    'documentType' => $student->document_type,
                    'documentNumber' => $student->document_number,
                    'educationLevel' => $student->education_level,
                    'role' => 'student',
                    'status' => $student->status ?? 'active',
                    'level' => $student->academicLevel?->code ?? null,
                    'points' => $student->points ?? 0,
                    'prospectStatus' => $student->prospect_status,
                    'paymentDate' => $student->payment_date?->format('Y-m-d'),
                    'enrollmentDate' => $student->enrollment_date?->format('Y-m-d'),
                    'enrollmentCode' => $student->enrollment_code,
                    'registrationDate' => $student->registration_date?->format('Y-m-d'),
                    'contractedPlan' => $student->paymentPlan?->name ?? null,
                    'contractFileName' => $student->contract_file_name,
                    'contractFilePath' => $student->contract_file_path,
                    'paymentVoucherUrl' => $student->payment_voucher_url,
                    'paymentVoucherFileName' => $student->payment_voucher_file_name,
                    'paymentVerified' => $student->payment_verified ?? false,
                    'hasPlacementTest' => $student->has_placement_test ?? false,
                    'testDate' => $student->test_date?->format('Y-m-d'),
                    'testScore' => $student->test_score,
                    'classType' => $student->class_type,
                    'guardianName' => $student->guardian_name,
                    'guardianDocumentNumber' => $student->guardian_document_number,
                    'guardianEmail' => $student->guardian_email,
                    'guardianBirthDate' => $student->guardian_birth_date?->format('Y-m-d'),
                    'guardianPhone' => $student->guardian_phone,
                    'guardianAddress' => $student->guardian_address,
                    'registeredBy' => $student->registeredBy ? [
                        'id' => $student->registeredBy->id,
                        'name' => $student->registeredBy->name,
                        'email' => $student->registeredBy->email,
                        'avatar' => $student->registeredBy->avatar,
                    ] : null,
                    'verifiedPaymentBy' => $student->verifiedPaymentBy ? [
                        'id' => $student->verifiedPaymentBy->id,
                        'name' => $student->verifiedPaymentBy->name,
                        'email' => $student->verifiedPaymentBy->email,
                    ] : null,
                    'paymentVerifiedAt' => $student->payment_verified_at?->toISOString(),
                    'verifiedEnrollmentBy' => $student->verifiedEnrollmentBy ? [
                        'id' => $student->verifiedEnrollmentBy->id,
                        'name' => $student->verifiedEnrollmentBy->name,
                        'email' => $student->verifiedEnrollmentBy->email,
                    ] : null,
                    'enrollmentVerifiedAt' => $student->enrollment_verified_at?->toISOString(),
                    'enrollmentVerified' => $student->enrollment_verified ?? false,
                    'createdAt' => $student->created_at->toISOString(),
                    'enrolledGroups' => $student->groups->pluck('id')->toArray(),
                    'assignedGroupId' => $student->groups->first()?->id,
                    // ✅ Información del contrato
                    'contract' => $student->contractAcceptances->first() ? [
                        'id' => $student->contractAcceptances->first()->id,
                        'pdf_url' => $student->contractAcceptances->first()->pdf_path 
                            ? asset('storage/' . $student->contractAcceptances->first()->pdf_path) 
                            : null,
                        'accepted' => $student->contractAcceptances->first()->isAccepted(),
                        'accepted_at' => $student->contractAcceptances->first()->accepted_at?->format('Y-m-d H:i:s'),
                        'token' => $student->contractAcceptances->first()->token,
                    ] : null,
                ];
            });

        $groups = Group::with('teacher.user')->get();

        return Inertia::render('Admin/EnrolledStudents', [
            'students' => $students,
            'groups' => $groups,
            'userRole' => auth()->user()->role ?? 'admin',
        ]);
    }

    public function salesAdvisorEnrolledStudents(): Response
    {
        $user = auth()->user();
        
        // Solo mostrar estudiantes matriculados y verificados del asesor
        $students = Student::with(['user', 'verifiedEnrollmentBy', 'academicLevel', 'paymentPlan'])
            ->where('prospect_status', 'matriculado')
            ->where('enrollment_verified', true)
            ->where('registered_by', $user->id)
            ->orderBy('enrollment_date', 'desc')
            ->get()
            ->map(function ($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->user->name ?? '',
                    'avatar' => $student->user->avatar ?? null,
                    'firstName' => $student->first_name,
                    'paternalLastName' => $student->paternal_last_name,
                    'maternalLastName' => $student->maternal_last_name,
                    'email' => $student->user->email ?? '',
                    'phoneNumber' => $student->phone_number,
                    'enrollmentDate' => $student->enrollment_date?->format('Y-m-d'),
                    'enrollmentCode' => $student->enrollment_code,
                    'academicLevel' => $student->academicLevel ? [
                        'id' => $student->academicLevel->id,
                        'name' => $student->academicLevel->name,
                        'code' => $student->academicLevel->code,
                    ] : null,
                    'paymentPlan' => $student->paymentPlan ? [
                        'id' => $student->paymentPlan->id,
                        'name' => $student->paymentPlan->name,
                        'installments_count' => $student->paymentPlan->installments_count,
                    ] : null,
                    'enrollmentVerified' => $student->enrollment_verified ?? false,
                    'verifiedEnrollmentBy' => $student->verifiedEnrollmentBy ? [
                        'id' => $student->verifiedEnrollmentBy->id,
                        'name' => $student->verifiedEnrollmentBy->name,
                        'email' => $student->verifiedEnrollmentBy->email,
                    ] : null,
                    'enrollmentVerifiedAt' => $student->enrollment_verified_at?->toISOString(),
                ];
            });

        return Inertia::render('SalesAdvisor/MyEnrolledStudents', [
            'students' => $students,
        ]);
    }

    public function salesAdvisorArchivedStudents(): Response
    {
        $user = auth()->user();
        
        // Solo mostrar estudiantes archivados del asesor
        $students = Student::with(['user', 'academicLevel', 'paymentPlan'])
            ->where('archived', true)
            ->where('registered_by', $user->id)
            ->orderBy('archived_at', 'desc')
            ->get()
            ->map(function ($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->user->name ?? '',
                    'avatar' => $student->user->avatar ?? null,
                    'firstName' => $student->first_name,
                    'paternalLastName' => $student->paternal_last_name,
                    'maternalLastName' => $student->maternal_last_name,
                    'email' => $student->user->email ?? '',
                    'phoneNumber' => $student->phone_number,
                    'prospectStatus' => $student->prospect_status,
                    'archived' => $student->archived,
                    'archivedAt' => $student->archived_at?->toISOString(),
                    'archivedReason' => $student->archived_reason,
                    'academicLevel' => $student->academicLevel ? [
                        'id' => $student->academicLevel->id,
                        'name' => $student->academicLevel->name,
                        'code' => $student->academicLevel->code,
                    ] : null,
                    'paymentPlan' => $student->paymentPlan ? [
                        'id' => $student->paymentPlan->id,
                        'name' => $student->paymentPlan->name,
                        'installments_count' => $student->paymentPlan->installments_count,
                    ] : null,
                ];
            });

        return Inertia::render('SalesAdvisor/ArchivedStudents', [
            'archivedStudents' => $students,
        ]);
    }

    public function index(): Response
    {
        $user = auth()->user();
        
        // Construir query base con relaciones de academic_level y payment_plan
        $query = Student::with([
            'user', 
            'groups', 
            'badges', 
            'registeredBy', 
            'verifiedPaymentBy', 
            'verifiedEnrollmentBy',
            'academicLevel',  // ✅ Nuevo
            'paymentPlan',     // ✅ Nuevo
            'referredByStudent', // ✅ Nuevo: relación con el estudiante que refirió
            'contractAcceptances' // ✅ Nuevo: historial de contratos
        ]);
        
        // ✅ EXCLUIR MATRICULADOS VERIFICADOS (ya están en enrolled-students)
        // Filtrar: NO (matriculado Y verificado)
        $query->whereNot(function($q) {
            $q->where('prospect_status', 'matriculado')
              ->where('enrollment_verified', 1);
        });
        
        // ✅ EXCLUIR ARCHIVADOS (ya están en archived-students)
        $query->where('archived', false);
        
        // Filtrar según el rol
        if ($user->role === 'sales_advisor') {
            // Asesor de ventas solo ve sus prospectos
            $query->where('registered_by', $user->id);
        }
        // Admin, cashier y otros roles ven todo
        
        // DEBUG: Log the SQL query
        \Log::info('StudentController@index SQL:', [
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings()
        ]);
        
        $students = $query->orderBy('created_at', 'desc')
            ->get();
        
        // DEBUG: Log students count
        \Log::info('StudentController@index Results:', [
            'total_students' => $students->count(),
            'student_names' => $students->pluck('first_name', 'id')->toArray(),
            'verified_status' => $students->mapWithKeys(function($s) {
                return [$s->id => ['name' => $s->first_name . ' ' . $s->paternal_last_name, 'verified' => $s->enrollment_verified, 'status' => $s->prospect_status]];
            })->toArray()
        ]);
        
        $students = $students->map(function ($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->user->name ?? '',
                    'firstName' => $student->first_name,
                    'paternalLastName' => $student->paternal_last_name,
                    'maternalLastName' => $student->maternal_last_name,
                    'email' => $student->user->email ?? '',
                    'phoneNumber' => $student->phone_number,
                    'gender' => $student->gender,
                    'birthDate' => $student->birth_date?->format('Y-m-d'),
                    'documentType' => $student->document_type,
                    'documentNumber' => $student->document_number,
                    'educationLevel' => $student->education_level,
                    'role' => 'student',
                    'status' => $student->status ?? 'active',
                    'academicLevelId' => $student->academic_level_id,  // ✅ Nuevo
                    'academicLevel' => $student->academicLevel ? [     // ✅ Nuevo
                        'id' => $student->academicLevel->id,
                        'name' => $student->academicLevel->name,
                        'code' => $student->academicLevel->code,
                        'color' => $student->academicLevel->color,
                    ] : null,
                    'points' => $student->points ?? 0,
                    'prospectStatus' => $student->prospect_status,
                    'paymentDate' => $student->payment_date?->format('Y-m-d'),
                    'enrollmentDate' => $student->enrollment_date?->format('Y-m-d'),
                    'enrollmentCode' => $student->enrollment_code,
                    'registrationDate' => $student->registration_date?->format('Y-m-d'),
                    'paymentPlanId' => $student->payment_plan_id,       // ✅ Nuevo
                    'paymentPlan' => $student->paymentPlan ? [          // ✅ Nuevo
                        'id' => $student->paymentPlan->id,
                        'name' => $student->paymentPlan->name,
                        'installments_count' => $student->paymentPlan->installments_count,
                        'monthly_amount' => $student->paymentPlan->monthly_amount,
                        'total_amount' => $student->paymentPlan->total_amount,
                    ] : null,
                    'contractFileName' => $student->contract_file_name,
                    'contractFilePath' => $student->contract_file_path,
                    'paymentVoucherUrl' => $student->payment_voucher_url,
                    'paymentVoucherFileName' => $student->payment_voucher_file_name,
                    'paymentVerified' => $student->payment_verified ?? false,
                    'hasPlacementTest' => $student->has_placement_test ?? false,
                    'testDate' => $student->test_date?->format('Y-m-d'),
                    'testScore' => $student->test_score,
                    'guardianName' => $student->guardian_name,
                    'guardianDocumentNumber' => $student->guardian_document_number,
                    'guardianEmail' => $student->guardian_email,
                    'guardianBirthDate' => $student->guardian_birth_date?->format('Y-m-d'),
                    'guardianPhone' => $student->guardian_phone,
                    'guardianAddress' => $student->guardian_address,
                    'source' => $student->source,  // ✅ Nuevo: origen del prospecto
                    'referredBy' => $student->referred_by,  // ✅ Nuevo: ID del estudiante que refirió
                    'referredByStudent' => $student->referredByStudent ? [  // ✅ Nuevo: datos del estudiante que refirió
                        'id' => $student->referredByStudent->id,
                        'name' => $student->referredByStudent->first_name . ' ' . $student->referredByStudent->paternal_last_name,
                        'email' => $student->referredByStudent->user->email ?? '',
                    ] : null,
                    'registeredBy' => $student->registeredBy ? [
                        'id' => $student->registeredBy->id,
                        'name' => $student->registeredBy->name,
                        'email' => $student->registeredBy->email,
                        'avatar' => $student->registeredBy->avatar,
                    ] : null,
                    'verifiedPaymentBy' => $student->verifiedPaymentBy ? [
                        'id' => $student->verifiedPaymentBy->id,
                        'name' => $student->verifiedPaymentBy->name,
                        'email' => $student->verifiedPaymentBy->email,
                    ] : null,
                    'paymentVerifiedAt' => $student->payment_verified_at?->toISOString(),
                    'verifiedEnrollmentBy' => $student->verifiedEnrollmentBy ? [
                        'id' => $student->verifiedEnrollmentBy->id,
                        'name' => $student->verifiedEnrollmentBy->name,
                        'email' => $student->verifiedEnrollmentBy->email,
                    ] : null,
                    'enrollmentVerifiedAt' => $student->enrollment_verified_at?->toISOString(),
                    'createdAt' => $student->created_at->toISOString(),
                    'enrolledGroups' => $student->groups->pluck('id')->toArray(),
                    'assignedGroupId' => $student->groups->first()?->id,
                    'hadDemoClass' => $student->had_demo_class ?? false,  // ✅ Nuevo: si tuvo clase modelo
                    'archived' => $student->archived ?? false,  // ✅ Nuevo: si fue archivado
                    'archivedAt' => $student->archived_at?->toISOString(),  // ✅ Nuevo: cuándo fue archivado
                    'archivedReason' => $student->archived_reason,  // ✅ Nuevo: razón del archivo
                    'latestContractAcceptance' => $student->contractAcceptances->sortByDesc('created_at')->first() ? [
                        'id' => $student->contractAcceptances->sortByDesc('created_at')->first()->id,
                        'pdf_path' => $student->contractAcceptances->sortByDesc('created_at')->first()->pdf_path,
                        'accepted_at' => $student->contractAcceptances->sortByDesc('created_at')->first()->accepted_at,
                        'advisor_approved' => $student->contractAcceptances->sortByDesc('created_at')->first()->advisor_approved,
                    ] : null,
                ];
            });

        $groups = Group::with('teacher.user')->get();
        
        // ✅ Cargar Academic Levels y Payment Plans
        $academicLevels = AcademicLevel::where('is_active', true)
            ->orderBy('order')
            ->get();
            
        $paymentPlans = PaymentPlan::with('academicLevel')
            ->where('is_active', true)
            ->orderBy('academic_level_id')
            ->orderBy('installments_count')
            ->get();

        return Inertia::render('Admin/StudentManagement', [
            'students' => $students,
            'groups' => $groups,
            'academicLevels' => $academicLevels,  // ✅ Nuevo
            'paymentPlans' => $paymentPlans,      // ✅ Nuevo
            'userRole' => auth()->user()->role ?? 'admin',
        ]);
    }

    /**
     * Obtener estudiantes en formato JSON para actualizaciones en tiempo real
     */
    public function getStudentsJson()
    {
        $user = auth()->user();
        
        // Construir query base (misma lógica que index) con relaciones
        $query = Student::with([
            'user', 
            'groups', 
            'badges', 
            'registeredBy', 
            'verifiedPaymentBy', 
            'verifiedEnrollmentBy',
            'academicLevel',  // ✅ Nuevo
            'paymentPlan',     // ✅ Nuevo
            'referredByStudent', // ✅ Nuevo: relación con el estudiante que refirió
            'contractAcceptances' // ✅ Nuevo: historial de contratos
        ]);
        
        // ✅ IMPORTANTE: Excluir estudiantes matriculados y verificados (ya están en enrolled-students)
        $query->whereNot(function($q) {
            $q->where('prospect_status', 'matriculado')
              ->where('enrollment_verified', 1);
        });
        
        // ✅ EXCLUIR ARCHIVADOS (ya están en archived-students)
        $query->where('archived', false);
        
        // Filtrar según el rol
        if ($user->role === 'sales_advisor') {
            // Asesor de ventas solo ve sus prospectos
            $query->where('registered_by', $user->id);
        }
        // Admin, cashier y otros roles ven todo
        
        $students = $query->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->user->name ?? '',
                    'firstName' => $student->first_name,
                    'paternalLastName' => $student->paternal_last_name,
                    'maternalLastName' => $student->maternal_last_name,
                    'email' => $student->user->email ?? '',
                    'phoneNumber' => $student->phone_number,
                    'gender' => $student->gender,
                    'birthDate' => $student->birth_date?->format('Y-m-d'),
                    'documentType' => $student->document_type,
                    'documentNumber' => $student->document_number,
                    'educationLevel' => $student->education_level,
                    'role' => 'student',
                    'status' => $student->status ?? 'active',
                    'academicLevelId' => $student->academic_level_id,  // ✅ Nuevo
                    'academicLevel' => $student->academicLevel ? [     // ✅ Nuevo
                        'id' => $student->academicLevel->id,
                        'name' => $student->academicLevel->name,
                        'code' => $student->academicLevel->code,
                        'color' => $student->academicLevel->color,
                    ] : null,
                    'points' => $student->points ?? 0,
                    'prospectStatus' => $student->prospect_status,
                    'paymentDate' => $student->payment_date?->format('Y-m-d'),
                    'enrollmentDate' => $student->enrollment_date?->format('Y-m-d'),
                    'enrollmentCode' => $student->enrollment_code,
                    'registrationDate' => $student->registration_date?->format('Y-m-d'),
                    'paymentPlanId' => $student->payment_plan_id,       // ✅ Nuevo
                    'paymentPlan' => $student->paymentPlan ? [          // ✅ Nuevo
                        'id' => $student->paymentPlan->id,
                        'name' => $student->paymentPlan->name,
                        'installments_count' => $student->paymentPlan->installments_count,
                        'monthly_amount' => $student->paymentPlan->monthly_amount,
                        'total_amount' => $student->paymentPlan->total_amount,
                    ] : null,
                    'contractFileName' => $student->contract_file_name,
                    'contractFilePath' => $student->contract_file_path,
                    'paymentVoucherUrl' => $student->payment_voucher_url,
                    'paymentVoucherFileName' => $student->payment_voucher_file_name,
                    'paymentVerified' => $student->payment_verified ?? false,
                    'hasPlacementTest' => $student->has_placement_test ?? false,
                    'testDate' => $student->test_date?->format('Y-m-d'),
                    'testScore' => $student->test_score,
                    'guardianName' => $student->guardian_name,
                    'guardianDocumentNumber' => $student->guardian_document_number,
                    'guardianEmail' => $student->guardian_email,
                    'guardianBirthDate' => $student->guardian_birth_date?->format('Y-m-d'),
                    'guardianPhone' => $student->guardian_phone,
                    'guardianAddress' => $student->guardian_address,
                    'source' => $student->source,  // ✅ Nuevo: origen del prospecto
                    'referredBy' => $student->referred_by,  // ✅ Nuevo: ID del estudiante que refirió
                    'referredByStudent' => $student->referredByStudent ? [  // ✅ Nuevo: datos del estudiante que refirió
                        'id' => $student->referredByStudent->id,
                        'name' => $student->referredByStudent->first_name . ' ' . $student->referredByStudent->paternal_last_name,
                        'email' => $student->referredByStudent->user->email ?? '',
                    ] : null,
                    'registeredBy' => $student->registeredBy ? [
                        'id' => $student->registeredBy->id,
                        'name' => $student->registeredBy->name,
                        'email' => $student->registeredBy->email,
                        'avatar' => $student->registeredBy->avatar,
                    ] : null,
                    'verifiedPaymentBy' => $student->verifiedPaymentBy ? [
                        'id' => $student->verifiedPaymentBy->id,
                        'name' => $student->verifiedPaymentBy->name,
                        'email' => $student->verifiedPaymentBy->email,
                    ] : null,
                    'paymentVerifiedAt' => $student->payment_verified_at?->toISOString(),
                    'verifiedEnrollmentBy' => $student->verifiedEnrollmentBy ? [
                        'id' => $student->verifiedEnrollmentBy->id,
                        'name' => $student->verifiedEnrollmentBy->name,
                        'email' => $student->verifiedEnrollmentBy->email,
                    ] : null,
                    'enrollmentVerifiedAt' => $student->enrollment_verified_at?->toISOString(),
                    'createdAt' => $student->created_at->toISOString(),
                    'enrolledGroups' => $student->groups->pluck('id')->toArray(),
                    'assignedGroupId' => $student->groups->first()?->id,
                    'hadDemoClass' => $student->had_demo_class ?? false,  // ✅ Nuevo: si tuvo clase modelo
                    'archived' => $student->archived ?? false,  // ✅ Nuevo: si fue archivado
                    'archivedAt' => $student->archived_at?->toISOString(),  // ✅ Nuevo: cuándo fue archivado
                    'archivedReason' => $student->archived_reason,  // ✅ Nuevo: razón del archivo
                    'latestContractAcceptance' => $student->contractAcceptances->sortByDesc('created_at')->first() ? [
                        'id' => $student->contractAcceptances->sortByDesc('created_at')->first()->id,
                        'pdf_path' => $student->contractAcceptances->sortByDesc('created_at')->first()->pdf_path,
                        'accepted_at' => $student->contractAcceptances->sortByDesc('created_at')->first()->accepted_at,
                        'advisor_approved' => $student->contractAcceptances->sortByDesc('created_at')->first()->advisor_approved,
                    ] : null,
                ];
            });

        return response()->json($students);
    }

    public function store(Request $request)
    {
        // Solo admin y sales_advisor pueden crear prospectos
        if (!in_array(auth()->user()->role, ['admin', 'sales_advisor', 'verifier'])) {
            abort(403, 'No tienes permiso para crear prospectos.');
        }

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
            'academic_level_id' => 'nullable|exists:academic_levels,id',
            'class_type' => 'required|in:theoretical,practical',
            // Examen de categorización
            'has_placement_test' => 'nullable|boolean',
            'test_date' => 'nullable|date',
            'test_score' => 'nullable|numeric',
            // Datos del apoderado
            'guardian_name' => 'nullable|string',
            'guardian_document_number' => 'nullable|string',
            'guardian_email' => 'nullable|email',
            'guardian_birth_date' => 'nullable|date',
            'guardian_phone' => 'nullable|string',
            'guardian_address' => 'nullable|string',
            // Origen y referencia
            'source' => 'required|in:frio,referido,lead',
            'referred_by' => 'nullable|exists:students,id|required_if:source,referido',
            // Clase modelo y archivado
            'had_demo_class' => 'nullable|boolean',
            'archived' => 'nullable|boolean',
            'archived_reason' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            // Create user
            $user = \App\Models\User::create([
                'name' => trim("{$validated['first_name']} {$validated['paternal_last_name']} {$validated['maternal_last_name']}"),
                'email' => $validated['email'],
                'password' => bcrypt($validated['email']), // Default password
                'role' => 'student',
            ]);

            // Create student profile
            $student = Student::create(array_merge($validated, [
                'user_id' => $user->id,
                'registered_by' => auth()->id(),
                'registration_date' => now(),
                'status' => 'active',
                'prospect_status' => 'registrado',
            ]));

            DB::commit();

            // 📧 Enviar email de bienvenida al prospecto
            try {
                $salesAdvisor = auth()->user();
                Mail::to($user->email)->send(new ProspectWelcomeMail($student, $salesAdvisor));
                
                Log::info('Email de bienvenida enviado', [
                    'student_id' => $student->id,
                    'student_email' => $user->email,
                    'advisor_id' => $salesAdvisor->id,
                ]);
            } catch (\Exception $e) {
                // Log el error pero no fallar la creación del prospecto
                Log::error('Error al enviar email de bienvenida', [
                    'student_id' => $student->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return redirect()->back()->with('success', 'Prospecto creado exitosamente y email de bienvenida enviado');
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear prospecto:', ['error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['error' => 'Error al crear el prospecto'])->withInput();
        }
    }

    public function update(Request $request, Student $student)
    {
        $user = auth()->user();
        
        // Cajero: solo puede editar datos de matrícula/pago
        if ($user->role === 'cashier') {
            Log::info('Cajero intentando actualizar estudiante:', [
                'user_id' => $user->id,
                'student_id' => $student->id,
                'prospect_status' => $student->prospect_status,
                'request_data' => $request->all()
            ]);

            // Solo puede editar prospectos en estado pago_por_verificar
            if ($student->prospect_status !== 'pago_por_verificar') {
                abort(403, 'Solo puedes editar prospectos en estado "Pago Por Verificar".');
            }

            // Cajero simplemente verifica el pago y el sistema matricula automáticamente
            $validated = $request->validate([
                'payment_verified' => 'required',
                'payment_method' => 'nullable|string',
                'verified_amount' => 'nullable|numeric',
            ]);

            // Convertir a booleano si viene como string
            $paymentVerified = filter_var($validated['payment_verified'], FILTER_VALIDATE_BOOLEAN);

            Log::info('Valor de payment_verified:', [
                'original' => $validated['payment_verified'],
                'converted' => $paymentVerified,
                'type' => gettype($paymentVerified)
            ]);

            // Si marca payment_verified, cambiar directamente a matriculado
            if ($paymentVerified === true && $student->prospect_status !== 'matriculado') {
                $student->update([
                    'prospect_status' => 'matriculado',
                    'verified_payment_by' => $user->id,
                    'payment_verified_at' => now(),
                    'payment_verified' => true,
                ]);
                
                Log::info('Cajero verificó pago y matriculó estudiante:', [
                    'student_id' => $student->id,
                    'cashier_id' => $user->id,
                ]);
                
                // 🆕 Enviar email con credenciales
                $this->sendEnrollmentCredentials($student);
                
                // 🆕 El enrollment ya debería existir (creado cuando cambió a pago_por_verificar)
                // Ahora solo verificamos la primera cuota si tiene voucher pendiente
                $existingEnrollment = $student->enrollments()->where('status', 'active')->first();
                
                if ($existingEnrollment) {
                    // Buscar la primera cuota que esté en estado "paid" (con voucher pendiente) o "pending"
                    $firstInstallment = $existingEnrollment->installments()
                        ->orderBy('installment_number', 'asc')
                        ->first();
                    
                    if ($firstInstallment) {
                        // Verificar la primera cuota
                        $firstInstallment->update([
                            'status' => 'verified',
                            'verified_by' => $user->id, // El cajero que verificó el pago
                            'verified_at' => now(),
                        ]);
                        
                        // Buscar o crear voucher
                        $voucher = $firstInstallment->vouchers()->first();
                        
                        if (!$voucher) {
                            // Crear voucher si no existe (pago presencial sin subida previa)
                            $voucher = \App\Models\InstallmentVoucher::create([
                                'installment_id' => $firstInstallment->id,
                                'uploaded_by' => $user->id, // Cajero lo sube/genera
                                'voucher_path' => 'generated', // Placeholder
                                'declared_amount' => $validated['verified_amount'] ?? $firstInstallment->amount,
                                'verified_amount' => $validated['verified_amount'] ?? $firstInstallment->amount,
                                'payment_date' => $student->payment_date ?? now(), // Usar la fecha del estudiante o now()
                                'payment_method' => $validated['payment_method'] ?? 'cash',
                                'transaction_reference' => null, // Se generará después de crear
                                'status' => 'approved',
                                'reviewed_by' => $user->id,
                                'reviewed_at' => now(),
                            ]);
                            
                            // Generar código de operación único
                            $voucher->update([
                                'transaction_reference' => $this->generateTransactionReference($voucher->id)
                            ]);
                        } else {
                            // Actualizar voucher existente
                            $voucher->update([
                                'status' => 'approved',
                                'verified_amount' => $validated['verified_amount'] ?? $voucher->declared_amount,
                                'payment_method' => $validated['payment_method'] ?? $voucher->payment_method,
                                'payment_date' => $student->payment_date ?? $voucher->payment_date, // Actualizar con la fecha del estudiante
                                'reviewed_by' => $user->id,
                                'reviewed_at' => now(),
                            ]);
                            
                            // Generar código de operación si no existe
                            if (!$voucher->transaction_reference) {
                                $voucher->update([
                                    'transaction_reference' => $this->generateTransactionReference($voucher->id)
                                ]);
                            }
                        }

                        // Generar Recibo PDF
                        try {
                            $receiptService = new \App\Services\ReceiptGeneratorService();
                            $receiptPath = $receiptService->generate($voucher);
                            
                            $voucher->update(['receipt_path' => $receiptPath]);
                            
                            // Enviar email con recibo
                            Mail::to($student->user->email)->send(new \App\Mail\PaymentReceiptMail($voucher, $receiptPath));
                            
                            Log::info('Recibo generado y enviado', ['voucher_id' => $voucher->id]);
                        } catch (\Exception $e) {
                            Log::error('Error generando recibo:', ['error' => $e->getMessage()]);
                        }
                        
                        Log::info('Primera cuota verificada por cajero', [
                            'student_id' => $student->id,
                            'installment_id' => $firstInstallment->id,
                            'verified_by' => $user->id,
                        ]);
                    } else {
                        Log::warning('No se encontró cuota para verificar', [
                            'student_id' => $student->id,
                            'enrollment_id' => $existingEnrollment->id,
                        ]);
                    }
                } else {
                    Log::error('No se encontró enrollment activo para estudiante matriculado', [
                        'student_id' => $student->id,
                    ]);
                }
            }

            // Recargar el estudiante con relaciones para devolver datos actualizados
            $student->load(['user', 'groups', 'badges', 'registeredBy', 'verifiedPaymentBy', 'verifiedEnrollmentBy']);

            return response()->json([
                'message' => 'Pago verificado y estudiante matriculado exitosamente',
                'student' => [
                    'id' => $student->id,
                    'name' => $student->user->name ?? '',
                    'firstName' => $student->first_name,
                    'paternalLastName' => $student->paternal_last_name,
                    'maternalLastName' => $student->maternal_last_name,
                    'email' => $student->user->email ?? '',
                    'phoneNumber' => $student->phone_number,
                    'gender' => $student->gender,
                    'birthDate' => $student->birth_date?->format('Y-m-d'),
                    'documentType' => $student->document_type,
                    'documentNumber' => $student->document_number,
                    'educationLevel' => $student->education_level,
                    'role' => 'student',
                    'status' => $student->status ?? 'active',
                    'level' => $student->level,
                    'points' => $student->points ?? 0,
                    'prospectStatus' => $student->prospect_status,
                    'paymentDate' => $student->payment_date?->format('Y-m-d'),
                    'enrollmentDate' => $student->enrollment_date?->format('Y-m-d'),
                    'enrollmentCode' => $student->enrollment_code,
                    'registrationDate' => $student->registration_date?->format('Y-m-d'),
                    'contractedPlan' => $student->contracted_plan,
                    'contractFileName' => $student->contract_file_name,
                    'contractFilePath' => $student->contract_file_path,
                    'paymentVoucherUrl' => $student->payment_voucher_url,
                    'paymentVoucherFileName' => $student->payment_voucher_file_name,
                    'paymentVerified' => $student->payment_verified ?? false,
                    'hasPlacementTest' => $student->has_placement_test ?? false,
                    'testDate' => $student->test_date?->format('Y-m-d'),
                    'testScore' => $student->test_score,
                    'guardianName' => $student->guardian_name,
                    'guardianDocumentNumber' => $student->guardian_document_number,
                    'guardianEmail' => $student->guardian_email,
                    'guardianBirthDate' => $student->guardian_birth_date?->format('Y-m-d'),
                    'guardianPhone' => $student->guardian_phone,
                    'guardianAddress' => $student->guardian_address,
                    'registeredBy' => $student->registeredBy ? [
                        'id' => $student->registeredBy->id,
                        'name' => $student->registeredBy->name,
                        'email' => $student->registeredBy->email,
                    ] : null,
                    'verifiedPaymentBy' => $student->verifiedPaymentBy ? [
                        'id' => $student->verifiedPaymentBy->id,
                        'name' => $student->verifiedPaymentBy->name,
                        'email' => $student->verifiedPaymentBy->email,
                    ] : null,
                    'paymentVerifiedAt' => $student->payment_verified_at?->toISOString(),
                    'verifiedEnrollmentBy' => $student->verifiedEnrollmentBy ? [
                        'id' => $student->verifiedEnrollmentBy->id,
                        'name' => $student->verifiedEnrollmentBy->name,
                        'email' => $student->verifiedEnrollmentBy->email,
                    ] : null,
                    'enrollmentVerifiedAt' => $student->enrollment_verified_at?->toISOString(),
                    'createdAt' => $student->created_at->toISOString(),
                    'enrolledGroups' => $student->groups->pluck('id')->toArray(),
                    'assignedGroupId' => $student->groups->first()?->id,
                ]
            ], 200);
        }

        // Sales advisor solo puede editar sus propios prospectos
        if ($user->role === 'sales_advisor' && (int)$student->registered_by !== $user->id) {
            abort(403, 'Solo puedes editar tus propios prospectos.');
        }

        // Admin y sales_advisor pueden editar todos los campos
        $validated = $request->validate([
            'first_name' => 'sometimes|required|string',
            'paternal_last_name' => 'sometimes|required|string',
            'maternal_last_name' => 'nullable|string',
            'phone_number' => 'sometimes|required|string',
            'gender' => 'sometimes|required|string',
            'birth_date' => 'sometimes|required|date',
            'document_type' => 'sometimes|required|string',
            'document_number' => 'sometimes|required|string|unique:students,document_number,' . $student->id,
            'education_level' => 'sometimes|required|string',
            'email' => 'sometimes|required|email|unique:users,email,' . $student->user_id,
            'payment_date' => 'nullable|date',
            'enrollment_date' => 'nullable|date',
            'enrollment_code' => 'nullable|string',
            'academic_level_id' => 'nullable|exists:academic_levels,id',  // ✅ Cambiado de 'level'
            'payment_plan_id' => 'nullable|exists:payment_plans,id',     // ✅ Cambiado de 'contracted_plan'
            'contract_file' => 'nullable|file|mimes:pdf|max:10240', // Máximo 10MB
            'payment_voucher_file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120', // ✅ NUEVO: Máximo 5MB
            'payment_verified' => 'nullable|boolean',
            'has_placement_test' => 'nullable|boolean',
            'test_date' => 'nullable|date',
            'test_score' => 'nullable|numeric',
            'guardian_name' => 'nullable|string',
            'guardian_document_number' => 'nullable|string',
            'guardian_email' => 'nullable|email',
            'guardian_birth_date' => 'nullable|date',
            'guardian_phone' => 'nullable|string',
            'guardian_address' => 'nullable|string',
            'status' => 'sometimes|required|in:active,inactive',
            'source' => 'nullable|in:frio,referido,lead',
            'referred_by' => 'nullable|exists:students,id',
            // Clase modelo y archivado
            'had_demo_class' => 'nullable|boolean',
            'archived' => 'nullable|boolean',
            'archived_reason' => 'nullable|string',
        ]);

        // Manejar subida del archivo PDF del contrato
        if ($request->hasFile('contract_file')) {
            $file = $request->file('contract_file');
            
            // Crear nombre único para el archivo
            $fileName = 'contract_' . $student->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            
            // Guardar en storage/app/private/contracts
            // Como el disco 'local' ya tiene root en 'storage/app/private', solo necesitamos 'contracts'
            $path = $file->storeAs('contracts', $fileName, 'local');
            
            // Guardar la ruta en la base de datos (con prefijo 'private/' para compatibilidad con downloadContract)
            $validated['contract_file_path'] = 'private/' . $path;
            $validated['contract_file_name'] = $file->getClientOriginalName();
            
            Log::info('Archivo de contrato subido:', [
                'student_id' => $student->id,
                'file_path' => $validated['contract_file_path'],
                'file_name' => $file->getClientOriginalName(),
                'absolute_path' => storage_path('app/' . $validated['contract_file_path']),
            ]);
        }

        // ✅ NUEVO: Manejar subida del voucher de pago
        if ($request->hasFile('payment_voucher_file')) {
            $file = $request->file('payment_voucher_file');
            
            // Crear nombre único para el archivo
            $fileName = 'voucher_' . $student->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            
            // Guardar en storage/app/public/payment_vouchers
            $path = $file->storeAs('payment_vouchers', $fileName, 'public');
            
            // Guardar la URL pública y el nombre del archivo normalizado
            $validated['payment_voucher_url'] = Storage::url($path);
            $validated['payment_voucher_file_name'] = $fileName;
            
            Log::info('Voucher de pago subido:', [
                'student_id' => $student->id,
                'file_url' => $validated['payment_voucher_url'],
                'file_name' => $file->getClientOriginalName(),
            ]);
        }

        // Update user solo si se proporcionan los campos de nombre y email
        if (isset($validated['first_name']) && isset($validated['paternal_last_name']) && isset($validated['email'])) {
            $student->user->update([
                'name' => trim("{$validated['first_name']} {$validated['paternal_last_name']} {$validated['maternal_last_name']}"),
                'email' => $validated['email'],
            ]);
        }

        // Log para debug
        Log::info('Updating student with validated data:', $validated);

        // ✅ VERIFICAR SI SE ESTÁ ARCHIVANDO ANTES DE ACTUALIZAR
        $isBeingArchived = isset($validated['archived']) && $validated['archived'] && !$student->archived;
        
        if ($isBeingArchived) {
            // Agregar campos de archivo a los datos validados
            $validated['archived_at'] = now();
            $validated['prospect_status'] = 'registrado'; // Volver a registrado para que no aparezca en columnas avanzadas
            
            Log::info('Estudiante siendo archivado:', [
                'student_id' => $student->id,
                'archived_by' => auth()->id(),
                'reason' => $validated['archived_reason'] ?? 'Sin razón especificada',
                'archived_at' => $validated['archived_at'],
            ]);
        }

        // Update student con todos los datos (incluido archived_at si aplica)
        $student->update($validated);

        // Lógica de cambio de estado automático para Sales Advisor Y Admin
        if ($user->role === 'sales_advisor' || $user->role === 'admin') {
            // Si completa fecha de pago, nivel académico y plan de pago, cambiar a pago_por_verificar y generar contrato
            if (!empty($validated['payment_date']) && 
                !empty($validated['academic_level_id']) &&  // ✅ Cambiado de 'level'
                !empty($validated['payment_plan_id']) &&    // ✅ Cambiado de 'contracted_plan'
                $student->prospect_status === 'propuesta_enviada') {
                
                Log::info('Cambiando automáticamente a pago_por_verificar', [
                    'student_id' => $student->id,
                    'user_role' => $user->role,
                    'has_payment_date' => !empty($validated['payment_date']),
                    'has_academic_level' => !empty($validated['academic_level_id']),
                    'has_payment_plan' => !empty($validated['payment_plan_id']),
                ]);
                
                // ✅ CAMBIAR AUTOMÁTICAMENTE A "pago_por_verificar" cuando el advisor/admin completa los datos
                $student->update(['prospect_status' => 'pago_por_verificar']);
                
                // 🆕 CREAR ENROLLMENT automáticamente (necesario para el contrato)
                $this->createEnrollmentForStudent($student);
                
                // 📄 GENERAR Y ENVIAR CONTRATO para que el estudiante lo firme (DESPUÉS de enviar respuesta HTTP)
                dispatch(function() use ($student) {
                    try {
                        Log::info('Iniciando generación de contrato después de respuesta HTTP (update)', [
                            'student_id' => $student->id,
                        ]);
                        
                        $this->generateAndSendContract($student);
                    } catch (\Exception $e) {
                        Log::error('Error generando contrato en background (update)', [
                            'student_id' => $student->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                })->afterResponse();
            }
        }

        return redirect()->back()->with('success', 'Prospecto actualizado exitosamente');
    }

    public function destroy(Student $student)
    {
        // Solo admin y sales_advisor pueden eliminar
        // Sales advisor solo puede eliminar sus propios prospectos
        $user = auth()->user();
        if ($user->role === 'cashier') {
            abort(403, 'No tienes permiso para eliminar prospectos.');
        }
        if ($user->role === 'sales_advisor' && (int)$student->registered_by !== $user->id) {
            abort(403, 'Solo puedes eliminar tus propios prospectos.');
        }

        $student->user->delete(); // This will cascade delete the student
        return redirect()->back()->with('success', 'Prospecto eliminado exitosamente');
    }

    public function updateProspectStatus(Request $request, Student $student)
    {
        $validated = $request->validate([
            'prospect_status' => 'required|in:registrado,propuesta_enviada,pago_por_verificar,matriculado',
        ]);

        $userRole = Auth::user()->role;
        $currentStatus = $student->prospect_status;
        $newStatus = $validated['prospect_status'];

        // Log para debug
        Log::info('Cambio de estado prospecto', [
            'user_role' => $userRole,
            'student_id' => $student->id,
            'current_status' => $currentStatus,
            'new_status' => $newStatus,
            'registered_by' => $student->registered_by,
            'current_user' => Auth::id()
        ]);

        // Admin puede hacer cualquier cambio
        if ($userRole === 'admin') {
            // Admin tiene permisos totales, no validar transiciones
        } elseif ($userRole === 'sales_advisor') {
            // Asesor de Ventas: puede mover registrado -> propuesta_enviada -> pago_por_verificar
            $allowedTransitions = [
                $currentStatus === 'registrado' && $newStatus === 'propuesta_enviada',
                $currentStatus === 'propuesta_enviada' && $newStatus === 'pago_por_verificar',
                $currentStatus === 'propuesta_enviada' && $newStatus === 'registrado', // Permitir retroceso
            ];
            
            if (!in_array(true, $allowedTransitions, true)) {
                return response()->json([
                    'message' => 'Transición no permitida',
                    'error' => 'Solo puedes mover: Registrado ↔ Propuesta Enviada → Pago Por Verificar'
                ], 422);
            }

            // Validar que tenga fecha de pago, nivel académico y plan SOLO antes de pasar a pago_por_verificar
            if ($newStatus === 'pago_por_verificar') {
                if (!$student->payment_date || !$student->academic_level_id || !$student->payment_plan_id) {  // ✅ Actualizado
                    return response()->json([
                        'message' => 'Datos incompletos',
                        'error' => 'Debe completar fecha de pago, nivel académico y plan de pago antes de marcar como "Pago Por Verificar"'
                    ], 422);
                }
            }

            // Validar que el asesor solo pueda editar sus propios prospectos
            if ($student->registered_by !== Auth::id()) {
                return response()->json([
                    'message' => 'No autorizado',
                    'error' => 'Solo puedes modificar prospectos que tú registraste'
                ], 403);
            }

        } elseif ($userRole === 'cashier') {
            // Cajero: puede mover pago_por_verificar -> matriculado
            $allowedTransitions = [
                $currentStatus === 'pago_por_verificar' && $newStatus === 'matriculado'
            ];
            
            if (!in_array(true, $allowedTransitions, true)) {
                return response()->json([
                    'message' => 'Transición no permitida',
                    'error' => 'Solo puedes verificar pagos en estado "Pago Por Verificar"'
                ], 422);
            }
            
            // Auto-generar código de matrícula y fecha si no existen
            if ($newStatus === 'matriculado') {
                if (!$student->enrollment_code) {
                    $student->enrollment_code = $this->generateEnrollmentCode();
                }
                if (!$student->enrollment_date) {
                    $student->enrollment_date = $student->payment_date;
                }
                
                // 🆕 Enviar email con credenciales cuando pasa a matriculado
                $this->sendEnrollmentCredentials($student);
            }
        }

        $student->update(['prospect_status' => $newStatus]);
        
        // 🆕 CREAR MATRÍCULA (ENROLLMENT) automáticamente cuando pasa a "pago_por_verificar"
        if ($newStatus === 'pago_por_verificar') {
            $this->createEnrollmentForStudent($student);
            
            // 📄 GENERAR Y ENVIAR CONTRATO (DESPUÉS de enviar respuesta HTTP para evitar timeout)
            dispatch(function() use ($student) {
                try {
                    Log::info('Iniciando generación de contrato después de respuesta HTTP', [
                        'student_id' => $student->id,
                    ]);
                    
                    $this->generateAndSendContract($student);
                } catch (\Exception $e) {
                    Log::error('Error generando contrato en background', [
                        'student_id' => $student->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            })->afterResponse();
        }
        
        // Recargar el estudiante con sus relaciones
        $student->load(['user', 'registeredBy', 'verifiedPaymentBy']);

        return response()->json([
            'message' => 'Estado actualizado exitosamente',
            'student' => $student
        ], 200);
    }

    /**
     * Generate unique enrollment code.
     */
    private function generateEnrollmentCode(): string
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        $random = str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        
        return "MAT-{$year}{$month}-{$random}";
    }

    /**
     * Enviar email con credenciales cuando el estudiante es matriculado
     */
    private function sendEnrollmentCredentials(Student $student): void
    {
        try {
            // Recargar el estudiante con relaciones necesarias
            $student->load(['user', 'academicLevel', 'paymentPlan']);
            
            // El usuario ya debe existir (se creó al registrar el prospecto)
            $user = $student->user;
            
            if (!$user) {
                Log::error('Usuario no encontrado para estudiante matriculado', [
                    'student_id' => $student->id,
                ]);
                return;
            }

            // Usar el email como contraseña temporal
            $temporaryPassword = $user->email;
            
            // Actualizar la contraseña del usuario
            $user->update([
                'password' => bcrypt($temporaryPassword),
            ]);
            
            Log::info('Contraseña actualizada para estudiante matriculado', [
                'student_id' => $student->id,
                'user_id' => $user->id,
            ]);

            // Enviar el email con las credenciales
            Mail::to($user->email)->send(new StudentEnrolledMail($student, $user, $temporaryPassword));
            
            Log::info('Email de credenciales enviado exitosamente', [
                'student_id' => $student->id,
                'user_email' => $user->email,
            ]);
            
        } catch (\Exception $e) {
            // No fallar el proceso si el email no se envía
            Log::error('Error al enviar email de credenciales', [
                'student_id' => $student->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Crear enrollment automáticamente para un estudiante cuando cambia a pago_por_verificar
     */
    private function createEnrollmentForStudent(Student $student): void
    {
        // Verificar que no tenga ya una matrícula activa
        $existingEnrollment = $student->enrollments()->where('status', 'active')->first();
        
        if ($existingEnrollment) {
            Log::info('Estudiante ya tiene enrollment activo', [
                'student_id' => $student->id,
                'enrollment_id' => $existingEnrollment->id,
            ]);
            return;
        }

        if (!$student->payment_plan_id) {
            Log::warning('Estudiante sin plan de pago, no se puede crear enrollment', [
                'student_id' => $student->id,
                'prospect_status' => $student->prospect_status,
            ]);
            return;
        }

        DB::beginTransaction();
        try {
            $paymentPlan = PaymentPlan::find($student->payment_plan_id);
            
            if (!$paymentPlan) {
                Log::warning('Plan de pago no encontrado', [
                    'student_id' => $student->id,
                    'payment_plan_id' => $student->payment_plan_id,
                ]);
                return;
            }

            // Crear el enrollment
            $enrollment = Enrollment::create([
                'student_id' => $student->id,
                'payment_plan_id' => $paymentPlan->id,
                'enrollment_fee' => $paymentPlan->total_amount / $paymentPlan->installments_count,
                'enrollment_date' => now(),
                'status' => 'active',
                'notes' => 'Matrícula creada automáticamente al cambiar a pago por verificar',
            ]);
            
            // Generar cuotas automáticamente (usando fecha de pago del estudiante)
            $enrollment->generateInstallments();
            
            // 🆕 TRANSFERIR VOUCHER DEL PROSPECTO A LA PRIMERA CUOTA
            if ($student->payment_voucher_file_name) {
                $firstInstallment = $enrollment->installments()
                    ->orderBy('installment_number', 'asc')
                    ->first();
                
                if ($firstInstallment) {
                    // Copiar voucher a nueva estructura organizada por estudiante
                    $voucherFileName = $student->payment_voucher_file_name;
                    
                    // Buscar el archivo original en diferentes ubicaciones posibles
                    $possiblePaths = [
                        "payment_vouchers/{$voucherFileName}",
                        $voucherFileName, // Si ya incluye la ruta completa
                    ];
                    
                    $oldPath = null;
                    foreach ($possiblePaths as $testPath) {
                        if (Storage::disk('public')->exists($testPath)) {
                            $oldPath = $testPath;
                            break;
                        }
                    }
                    
                    if (!$oldPath) {
                        Log::error('Cannot find original voucher file', [
                            'student_id' => $student->id,
                            'voucher_filename' => $voucherFileName,
                            'tested_paths' => $possiblePaths,
                            'available_files' => array_slice(Storage::disk('public')->files('payment_vouchers'), 0, 10)
                        ]);
                        return; // Salir si no se encuentra el archivo original
                    }
                    
                    $extension = pathinfo($oldPath, PATHINFO_EXTENSION) ?: 'jpg';
                    $newFileName = 'installment_1_' . time() . '.' . $extension;
                    $newPath = "enrollment/{$student->id}/{$newFileName}";
                    
                    // Crear directorio del estudiante si no existe con permisos correctos
                    $studentDir = "enrollment/{$student->id}";
                    if (!Storage::disk('public')->exists($studentDir)) {
                        // Crear directorio con permisos 755 (legible y ejecutable para web)
                        Storage::disk('public')->makeDirectory($studentDir, 0755, true);
                        
                        // Verificar que se creó correctamente
                        if (Storage::disk('public')->exists($studentDir)) {
                            Log::info('Student directory created successfully', [
                                'student_id' => $student->id,
                                'directory' => $studentDir
                            ]);
                        } else {
                            Log::error('Failed to create student directory', [
                                'student_id' => $student->id,
                                'directory' => $studentDir
                            ]);
                        }
                    }
                    
                    // Copiar archivo a nueva ubicación
                    try {
                        $copyResult = Storage::disk('public')->copy($oldPath, $newPath);
                        
                        if ($copyResult && Storage::disk('public')->exists($newPath)) {
                            Log::info('Voucher file copied successfully', [
                                'student_id' => $student->id,
                                'old_path' => $oldPath,
                                'new_path' => $newPath,
                                'file_size' => Storage::disk('public')->size($newPath)
                            ]);
                        } else {
                            Log::error('Failed to copy voucher file', [
                                'student_id' => $student->id,
                                'old_path' => $oldPath,
                                'new_path' => $newPath,
                                'copy_result' => $copyResult,
                                'target_exists' => Storage::disk('public')->exists($newPath)
                            ]);
                            return; // No continuar si falló la copia
                        }
                    } catch (\Exception $e) {
                        Log::error('Exception copying voucher file', [
                            'student_id' => $student->id,
                            'old_path' => $oldPath,
                            'new_path' => $newPath,
                            'error' => $e->getMessage()
                        ]);
                        return; // No continuar si hubo excepción
                    }
                    
                    // Crear voucher en la primera cuota
                    \App\Models\InstallmentVoucher::create([
                        'installment_id' => $firstInstallment->id,
                        'uploaded_by' => $student->registered_by,
                        'voucher_path' => $newPath,
                        'declared_amount' => $firstInstallment->amount,
                        'payment_date' => $student->payment_date ?? now(),
                        'payment_method' => 'transfer',
                        'status' => 'pending', // Pendiente de verificación por cajero
                        'notes' => 'Voucher transferido automáticamente desde prospecto',
                    ]);
                    
                    // Actualizar estado de la primera cuota a "paid" (esperando verificación)
                    $firstInstallment->update([
                        'status' => 'paid',
                        'paid_amount' => $firstInstallment->amount,
                        'paid_date' => $student->payment_date ?? now(),
                    ]);
                    
                    Log::info('Voucher transferido a primera cuota', [
                        'student_id' => $student->id,
                        'installment_id' => $firstInstallment->id,
                        'voucher_path' => $student->payment_voucher_file_name,
                        'status' => 'paid',
                    ]);
                }
            }
            
            Log::info('Enrollment creado automáticamente', [
                'student_id' => $student->id,
                'enrollment_id' => $enrollment->id,
                'installments_count' => $paymentPlan->installments_count,
                'voucher_transferred' => $student->payment_voucher_file_name ? 'yes' : 'no',
            ]);
            
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear enrollment automático', [
                'student_id' => $student->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Download or view student contract PDF.
     */
    public function downloadContract(Student $student)
    {
        $user = Auth::user();
        
        // Verificar permisos según el rol
        if ($user->role === 'sales_advisor' && (int)$student->registered_by !== $user->id) {
            abort(403, 'No tienes permiso para ver este contrato.');
        }
        
        // Verificar que el contrato exista
        if (!$student->contract_file_path) {
            abort(404, 'No se encontró ningún contrato para este estudiante.');
        }
        
        $filePath = storage_path('app/' . $student->contract_file_path);
        
        if (!file_exists($filePath)) {
            Log::error('Archivo de contrato no encontrado:', [
                'student_id' => $student->id,
                'file_path' => $student->contract_file_path,
                'absolute_path' => $filePath
            ]);
            abort(404, 'El archivo del contrato no existe en el servidor.');
        }
        
        // Retornar el archivo para visualización en el navegador
        return response()->file($filePath, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . ($student->contract_file_name ?: 'contrato.pdf') . '"'
        ]);
    }

    /**
     * ✅ NUEVO: Ver el voucher de pago de un estudiante
     */
    public function viewPaymentVoucher(Student $student)
    {
        $user = Auth::user();
        
        // Verificar permisos según el rol
        if ($user->role === 'sales_advisor' && (int)$student->registered_by !== $user->id) {
            abort(403, 'No tienes permiso para ver este voucher.');
        }
        
        // Verificar que el voucher exista
        if (!$student->payment_voucher_url) {
            abort(404, 'No se encontró ningún voucher de pago para este estudiante.');
        }
        
        // Convertir la URL pública a ruta de archivo
        // La URL es como: /storage/payment_vouchers/voucher_123_456.jpg
        // Necesitamos: storage/app/public/payment_vouchers/voucher_123_456.jpg
        $relativePath = str_replace('/storage/', '', $student->payment_voucher_url);
        $filePath = storage_path('app/public/' . $relativePath);
        
        if (!file_exists($filePath)) {
            Log::error('Archivo de voucher no encontrado:', [
                'student_id' => $student->id,
                'voucher_url' => $student->payment_voucher_url,
                'absolute_path' => $filePath
            ]);
            abort(404, 'El archivo del voucher no existe en el servidor.');
        }
        
        // Determinar el tipo MIME según la extensión
        $extension = pathinfo($filePath, PATHINFO_EXTENSION);
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'pdf' => 'application/pdf',
        ];
        $mimeType = $mimeTypes[strtolower($extension)] ?? 'application/octet-stream';
        
        // Retornar el archivo para visualización en el navegador
        return response()->file($filePath, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . ($student->payment_voucher_file_name ?: 'voucher.' . $extension) . '"'
        ]);
    }

    /**
     * Verificar/Aprobar la matrícula de un estudiante
     * Solo matrículas verificadas cuentan para comisiones de asesores de venta
     */
    public function verifyEnrollment(Request $request, Student $student)
    {
        // Validar que solo admins y verifiers puedan verificar matrículas
        if (!auth()->user()->isAdminOrVerifier()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para verificar matrículas'
            ], 403);
        }

        // Validar que el estudiante esté matriculado
        if ($student->prospect_status !== 'matriculado') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden verificar estudiantes matriculados'
            ], 400);
        }

        // Validar documentos si se están subiendo
        // Obtener códigos válidos de tipos de documentos desde la base de datos
        $validDocumentTypes = \App\Models\DocumentType::where('is_active', true)
            ->pluck('code')
            ->join(',');
        
        $validatedData = $request->validate([
            'documents' => 'nullable|array',
            'documents.*.file' => 'required|file|mimes:pdf,doc,docx,png,jpg,jpeg|max:10240', // 10MB max
            'documents.*.document_type' => 'required|string|in:' . $validDocumentTypes,
            'documents.*.document_name' => 'required|string|max:255',
            'documents.*.description' => 'nullable|string',
            'documents.*.requires_signature' => 'required|boolean',
        ]);

        try {
            \DB::beginTransaction();

            // ❌ NO marcar como verificado todavía
            // El estudiante se marcará como verificado SOLO cuando confirme TODOS los documentos
            
            // Procesar y guardar documentos
            $uploadedDocuments = collect();
            
            if ($request->has('documents') && is_array($request->documents)) {
                foreach ($request->documents as $documentData) {
                    if (isset($documentData['file']) && $documentData['file'] instanceof \Illuminate\Http\UploadedFile) {
                        // Guardar archivo
                        $file = $documentData['file'];
                        $fileName = time() . '_' . $file->getClientOriginalName();
                        $filePath = $file->storeAs('enrollment_documents', $fileName, 'public');

                        // Crear registro en base de datos
                        $document = \App\Models\EnrollmentDocument::create([
                            'student_id' => $student->id,
                            'uploaded_by' => auth()->id(),
                            'document_type' => $documentData['document_type'],
                            'document_name' => $documentData['document_name'],
                            'file_path' => $filePath,
                            'file_name' => $fileName,
                            'description' => $documentData['description'] ?? null,
                            'requires_signature' => $documentData['requires_signature'] ?? true,
                            'student_confirmed' => false,
                        ]);

                        $uploadedDocuments->push($document);
                    }
                }
            }

            \DB::commit();

            Log::info('Documentos de matrícula enviados al estudiante', [
                'student_id' => $student->id,
                'student_name' => $student->user->name ?? 'N/A',
                'uploaded_by' => auth()->user()->name,
                'uploaded_at' => now(),
                'documents_count' => $uploadedDocuments->count()
            ]);

            // 🆕 VERIFICAR SI TODOS LOS DOCUMENTOS NO REQUIEREN FIRMA
            $allDocumentsNoSignature = $uploadedDocuments->every(function ($doc) {
                return !$doc->requires_signature;
            });

            // Si NINGÚN documento requiere firma O no hay documentos, marcar como verificado automáticamente
            if ($uploadedDocuments->isEmpty() || $allDocumentsNoSignature) {
                $student->update([
                    'enrollment_verified' => true,
                    'verified_enrollment_by' => auth()->id(),
                    'enrollment_verified_at' => now(),
                ]);

                Log::info('Matrícula verificada automáticamente', [
                    'student_id' => $student->id,
                    'verified_by' => auth()->user()->name,
                    'reason' => $uploadedDocuments->isEmpty() ? 'sin_documentos_adicionales' : 'sin_documentos_que_requieran_firma'
                ]);
            }

            // 📧 SIEMPRE enviar email con cronograma y comprobante (con o sin documentos adicionales)
            try {
                // Cargar relaciones necesarias
                $student->load(['user', 'academicLevel', 'paymentPlan']);
                
                \Mail::to($student->user->email)->send(
                    new \App\Mail\EnrollmentVerifiedMail(
                        $student,
                        $student->user,
                        auth()->user(),
                        $uploadedDocuments
                    )
                );

                Log::info('Email de verificación enviado exitosamente', [
                    'student_id' => $student->id,
                    'email' => $student->user->email,
                    'documents_attached' => $uploadedDocuments->count(),
                    'includes_payment_schedule' => true,
                    'includes_payment_receipt' => true
                ]);
            } catch (\Exception $e) {
                // No fallar si el email falla, pero registrar el error
                Log::error('Error al enviar email de verificación', [
                    'student_id' => $student->id,
                    'error' => $e->getMessage()
                ]);
            }

            // 🆕 ENVIAR COMPROBANTE DE PAGO AUTOMÁTICAMENTE
            try {
                // Buscar el enrollment activo del estudiante
                $enrollment = $student->enrollments()->where('status', 'active')->first();
                
                if ($enrollment) {
                    // Buscar la primera cuota
                    $firstInstallment = $enrollment->installments()
                        ->where('status', 'verified')
                        ->orderBy('installment_number', 'asc')
                        ->first();
                    
                    if ($firstInstallment) {
                        // Buscar el voucher de la primera cuota
                        $voucher = $firstInstallment->vouchers()->first();
                        
                        if ($voucher) {
                            // Generar el PDF del comprobante si no existe
                            if (!$voucher->receipt_path) {
                                $receiptService = new \App\Services\ReceiptGeneratorService();
                                $receiptPath = $receiptService->generate($voucher);
                                $voucher->update(['receipt_path' => $receiptPath]);
                                
                                Log::info('Comprobante de pago generado automáticamente', [
                                    'student_id' => $student->id,
                                    'voucher_id' => $voucher->id,
                                    'receipt_path' => $receiptPath
                                ]);
                            }
                            
                            // Enviar el comprobante por email
                            \Mail::to($student->user->email)->send(
                                new \App\Mail\PaymentReceiptMail($voucher, $voucher->receipt_path)
                            );
                            
                            Log::info('Comprobante de pago enviado automáticamente al verificar matrícula', [
                                'student_id' => $student->id,
                                'voucher_id' => $voucher->id,
                                'email' => $student->user->email
                            ]);
                        } else {
                            Log::warning('No se encontró voucher para la primera cuota', [
                                'student_id' => $student->id,
                                'installment_id' => $firstInstallment->id
                            ]);
                        }
                    } else {
                        Log::warning('No se encontró primera cuota verificada', [
                            'student_id' => $student->id,
                            'enrollment_id' => $enrollment->id
                        ]);
                    }
                } else {
                    Log::warning('No se encontró enrollment activo para enviar comprobante', [
                        'student_id' => $student->id
                    ]);
                }
            } catch (\Exception $e) {
                // No fallar el proceso si el comprobante no se puede enviar
                Log::error('Error al enviar comprobante de pago automáticamente', [
                    'student_id' => $student->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }


            // Recargar el estudiante para obtener el estado actualizado
            $student->refresh();

            // Generar mensaje apropiado según el caso
            if ($uploadedDocuments->isEmpty()) {
                $message = 'Matrícula verificada exitosamente. Se ha enviado el Comprobante de Pago y Cronograma de Pagos al estudiante.';
            } elseif ($allDocumentsNoSignature) {
                $message = 'Documentos enviados y matrícula verificada exitosamente. Se ha enviado el Comprobante de Pago, Cronograma de Pagos y documentos adicionales al estudiante.';
            } else {
                $message = 'Documentos enviados exitosamente. Se ha enviado el Comprobante de Pago, Cronograma de Pagos y documentos adicionales al estudiante. La matrícula se verificará cuando el estudiante confirme todos los documentos.';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'student' => [
                    'id' => $student->id,
                    'enrollmentVerified' => $student->enrollment_verified,
                    'enrollmentVerifiedAt' => $student->enrollment_verified_at,
                    'verifiedEnrollmentBy' => $student->verifiedEnrollmentBy,
                    'hasPendingDocuments' => $uploadedDocuments->isNotEmpty() && !$allDocumentsNoSignature,
                ],
                'documents_uploaded' => $uploadedDocuments->count(),
                'auto_verified' => $uploadedDocuments->isEmpty() || $allDocumentsNoSignature,
                'payment_schedule_sent' => true,
                'payment_receipt_sent' => true,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \DB::rollBack();
            Log::error('Error al verificar matrícula', [
                'student_id' => $student->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al verificar la matrícula: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remover verificación de matrícula
     */
    public function unverifyEnrollment(Request $request, Student $student)
    {
        // Validar que solo admins y verifiers puedan remover verificación
        if (!auth()->user()->isAdminOrVerifier()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para modificar verificaciones'
            ], 403);
        }

        try {
            // ✅ ELIMINAR TODOS LOS DOCUMENTOS DE MATRÍCULA ANTERIORES
            $deletedDocuments = $student->enrollmentDocuments()->count();
            $student->enrollmentDocuments()->delete();
            
            // Remover verificación
            $student->update([
                'enrollment_verified' => false,
                'enrollment_verified_at' => null,
                'verified_enrollment_by' => null,
            ]);

            Log::info('Verificación de matrícula removida', [
                'student_id' => $student->id,
                'student_name' => $student->user->name ?? 'N/A',
                'unverified_by' => auth()->user()->name,
                'documents_deleted' => $deletedDocuments,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Verificación removida exitosamente',
                'documents_deleted' => $deletedDocuments,
                'student' => [
                    'id' => $student->id,
                    'enrollmentVerified' => false,
                    'enrollmentVerifiedAt' => null,
                    'verifiedEnrollmentBy' => null
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error al remover verificación', [
                'student_id' => $student->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al remover la verificación'
            ], 500);
        }
    }

    /**
     * Obtener documentos de matrícula de un estudiante (para Admin/Verifier)
     */
    public function getEnrollmentDocuments(string $id)
    {
        try {
            $student = Student::findOrFail($id);
            $user = auth()->user();
            
            // Documentos del estudiante (contract y voucher)
            $studentDocuments = [];
            
            // Contrato
            if ($student->contract_file_path) {
                $studentDocuments[] = [
                    'id' => 'contract_' . $student->id,
                    'document_name' => 'Contrato de Matrícula',
                    'document_type' => 'contract',
                    'file_path' => $student->contract_file_path,
                    'description' => 'Contrato subido por el estudiante',
                    'requires_signature' => false,
                    'student_confirmed' => true, // Ya fue subido por el estudiante
                    'uploaded_at' => $student->enrollment_date ?? $student->created_at,
                    'confirmed_at' => $student->enrollment_date ?? $student->created_at,
                    'uploaded_by_name' => 'Estudiante',
                    'is_student_upload' => true,
                ];
            }
            
            // Voucher de pago
            if ($student->payment_voucher_url) {
                $studentDocuments[] = [
                    'id' => 'voucher_' . $student->id,
                    'document_name' => 'Voucher de Pago',
                    'document_type' => 'payment',
                    'file_path' => str_replace('/storage/', '', $student->payment_voucher_url),
                    'description' => 'Comprobante de pago subido por el estudiante',
                    'requires_signature' => false,
                    'student_confirmed' => true, // Ya fue subido por el estudiante
                    'uploaded_at' => $student->payment_date ?? $student->created_at,
                    'confirmed_at' => $student->payment_date ?? $student->created_at,
                    'uploaded_by_name' => 'Estudiante',
                    'is_student_upload' => true,
                ];
            }
            
            // Documentos enviados por verifiers/admins (EnrollmentDocument)
            $query = $student->enrollmentDocuments();
            
            // Si es verifier, solo ver los documentos que YO subí
            // Si es admin, ver todos
            if ($user->role === 'verifier') {
                $query->where('uploaded_by', $user->id);
            }
            
            $verifierDocuments = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($doc) {
                    return [
                        'id' => $doc->id,
                        'document_name' => $doc->document_name,
                        'document_type' => $doc->document_type,
                        'file_path' => $doc->file_path,
                        'description' => $doc->description,
                        'requires_signature' => $doc->requires_signature,
                        'student_confirmed' => $doc->student_confirmed,
                        'uploaded_at' => $doc->created_at,
                        'confirmed_at' => $doc->confirmed_at,
                        'uploaded_by_name' => $doc->uploadedBy->name ?? 'N/A',
                        'is_student_upload' => false,
                    ];
                })
                ->toArray();
            
            // 🆕 Obtener comprobantes de pago generados (receipts)
            $paymentReceipts = [];
            $enrollment = $student->enrollments()->where('status', 'active')->first();
            
            if ($enrollment) {
                $installments = $enrollment->installments()
                    ->where('status', 'verified')
                    ->with('vouchers')
                    ->orderBy('installment_number', 'asc')
                    ->get();
                
                foreach ($installments as $installment) {
                    $voucher = $installment->vouchers()->first();
                    if ($voucher && $voucher->receipt_path) {
                        $paymentReceipts[] = [
                            'id' => 'receipt_' . $voucher->id,
                            'document_name' => 'Comprobante de Pago - Cuota #' . $installment->installment_number,
                            'document_type' => 'payment_receipt',
                            'file_path' => $voucher->receipt_path,
                            'description' => 'Comprobante de pago de la cuota ' . $installment->installment_number . ' - S/ ' . number_format($voucher->verified_amount, 2),
                            'requires_signature' => false,
                            'student_confirmed' => true,
                            'uploaded_at' => $voucher->created_at,
                            'confirmed_at' => $voucher->created_at,
                            'uploaded_by_name' => 'Sistema',
                            'is_student_upload' => false,
                            'is_payment_receipt' => true,
                            'installment_number' => $installment->installment_number,
                            'amount' => $voucher->verified_amount,
                        ];
                    }
                }
            }
            
            // Combinar todos los tipos de documentos
            $allDocuments = array_merge($studentDocuments, $verifierDocuments, $paymentReceipts);
            
            // Verificar si hay documentos pendientes de confirmación
            // Solo los EnrollmentDocument pueden estar pendientes (los del estudiante ya están confirmados)
            $hasPendingDocuments = $student->enrollmentDocuments()
                ->where('requires_signature', true)
                ->where('student_confirmed', false)
                ->exists();
            
            return response()->json([
                'success' => true,
                'documents' => $allDocuments,
                'has_pending_documents' => $hasPendingDocuments,
                'student_documents_count' => count($studentDocuments),
                'verifier_documents_count' => count($verifierDocuments),
                'payment_receipts_count' => count($paymentReceipts),
            ]);
        } catch (\Exception $e) {
            Log::error('Error al obtener documentos de matrícula', [
                'student_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los documentos'
            ], 500);
        }
    }

    /**
     * Obtener documentos pendientes del estudiante
     */
    public function getPendingDocuments()
    {
        $user = auth()->user();
        
        if (!$user->student) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no es estudiante'
            ], 403);
        }

        $student = $user->student;
        
        // Obtener documentos pendientes de confirmación
        $pendingDocuments = \App\Models\EnrollmentDocument::where('student_id', $student->id)
            ->where('requires_signature', true)
            ->where('student_confirmed', false)
            ->with('uploadedBy:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'document_type' => $doc->document_type,
                    'document_name' => $doc->document_name,
                    'description' => $doc->description,
                    'file_path' => $doc->file_path,
                    'file_name' => $doc->file_name,
                    'file_url' => asset('storage/' . $doc->file_path),
                    'uploaded_by' => $doc->uploadedBy ? [
                        'name' => $doc->uploadedBy->name,
                        'email' => $doc->uploadedBy->email,
                    ] : null,
                    'uploaded_at' => $doc->created_at->toISOString(),
                ];
            });

        return response()->json([
            'success' => true,
            'pending_documents' => $pendingDocuments,
            'count' => $pendingDocuments->count()
        ]);
    }

    /**
     * Obtener TODOS los documentos del estudiante (pendientes y confirmados)
     * Incluye documentos de matrícula y comprobantes de pago
     */
    public function getAllDocuments()
    {
        $user = auth()->user();
        
        if (!$user->student) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no es estudiante'
            ], 403);
        }

        $student = $user->student;
        
        // Obtener documentos de matrícula (pendientes y confirmados)
        $enrollmentDocuments = \App\Models\EnrollmentDocument::where('student_id', $student->id)
            ->with('uploadedBy:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'type' => 'enrollment_document',
                    'document_type' => $doc->document_type,
                    'document_name' => $doc->document_name,
                    'description' => $doc->description,
                    'file_path' => $doc->file_path,
                    'file_name' => $doc->file_name,
                    'file_url' => asset('storage/' . $doc->file_path),
                    'uploaded_by' => $doc->uploadedBy ? [
                        'name' => $doc->uploadedBy->name,
                        'email' => $doc->uploadedBy->email,
                    ] : null,
                    'uploaded_at' => $doc->created_at->toISOString(),
                    'requires_signature' => $doc->requires_signature,
                    'student_confirmed' => $doc->student_confirmed,
                    'confirmed_at' => $doc->confirmed_at?->toISOString(),
                    'is_pending' => $doc->requires_signature && !$doc->student_confirmed,
                ];
            });

        // Obtener comprobantes de pago
        $paymentReceipts = collect();
        $enrollment = $student->enrollments()->where('status', 'active')->first();
        
        if ($enrollment) {
            $installments = $enrollment->installments()
                ->where('status', 'verified')
                ->with('vouchers')
                ->orderBy('installment_number', 'asc')
                ->get();
            
            foreach ($installments as $installment) {
                $voucher = $installment->vouchers()->first();
                if ($voucher && $voucher->receipt_path) {
                    $paymentReceipts->push([
                        'id' => 'receipt_' . $voucher->id,
                        'type' => 'payment_receipt',
                        'document_type' => 'payment_receipt',
                        'document_name' => 'Comprobante de Pago - Cuota #' . $installment->installment_number,
                        'description' => 'Comprobante de pago de la cuota ' . $installment->installment_number . ' - S/ ' . number_format($voucher->verified_amount, 2),
                        'file_path' => $voucher->receipt_path,
                        'file_name' => basename($voucher->receipt_path),
                        'file_url' => asset('storage/' . $voucher->receipt_path),
                        'uploaded_by' => null,
                        'uploaded_at' => $voucher->created_at->toISOString(),
                        'requires_signature' => false,
                        'student_confirmed' => true,
                        'confirmed_at' => $voucher->created_at->toISOString(),
                        'is_pending' => false,
                        'installment_number' => $installment->installment_number,
                        'amount' => $voucher->verified_amount,
                    ]);
                }
            }
        }

        // Combinar todos los documentos
        $allDocuments = $enrollmentDocuments->concat($paymentReceipts)
            ->sortByDesc('uploaded_at')
            ->values();

        // Separar pendientes y confirmados
        $pendingDocuments = $allDocuments->where('is_pending', true)->values();
        $confirmedDocuments = $allDocuments->where('is_pending', false)->values();

        return response()->json([
            'success' => true,
            'all_documents' => $allDocuments,
            'pending_documents' => $pendingDocuments,
            'confirmed_documents' => $confirmedDocuments,
            'total_count' => $allDocuments->count(),
            'pending_count' => $pendingDocuments->count(),
            'confirmed_count' => $confirmedDocuments->count(),
        ]);
    }


    /**
     * Confirmar documento (con o sin archivo firmado)
     */
    public function confirmDocument(Request $request, $documentId)
    {
        $user = auth()->user();
        
        if (!$user->student) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no es estudiante'
            ], 403);
        }

        $student = $user->student;

        // Buscar el documento
        $document = \App\Models\EnrollmentDocument::where('id', $documentId)
            ->where('student_id', $student->id)
            ->first();

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Documento no encontrado'
            ], 404);
        }

        if ($document->student_confirmed) {
            return response()->json([
                'success' => false,
                'message' => 'Este documento ya ha sido confirmado'
            ], 400);
        }

        // Validar archivo firmado si se está subiendo
        $validated = $request->validate([
            'signed_file' => 'nullable|file|mimes:pdf,png,jpg,jpeg|max:10240', // 10MB max
        ]);

        try {
            $signedFilePath = null;
            $signedFileName = null;

            // Si se subió un archivo firmado, guardarlo
            if ($request->hasFile('signed_file')) {
                $file = $request->file('signed_file');
                $fileName = time() . '_signed_' . $file->getClientOriginalName();
                $filePath = $file->storeAs('enrollment_documents/signed', $fileName, 'public');
                
                $signedFilePath = $filePath;
                $signedFileName = $fileName;
            }

            // Confirmar documento
            $document->confirm($signedFilePath, $signedFileName);

            Log::info('Documento confirmado por estudiante', [
                'document_id' => $document->id,
                'student_id' => $student->id,
                'document_name' => $document->document_name,
                'has_signed_file' => !is_null($signedFilePath)
            ]);

            // ✅ VERIFICAR SI TODOS LOS DOCUMENTOS HAN SIDO CONFIRMADOS
            $totalDocuments = \App\Models\EnrollmentDocument::where('student_id', $student->id)
                ->where('requires_signature', true)
                ->count();
            
            $confirmedDocuments = \App\Models\EnrollmentDocument::where('student_id', $student->id)
                ->where('requires_signature', true)
                ->where('student_confirmed', true)
                ->count();

            $allDocumentsConfirmed = ($totalDocuments > 0 && $totalDocuments === $confirmedDocuments);

            // Si todos los documentos están confirmados, marcar matrícula como verificada
            if ($allDocumentsConfirmed && !$student->enrollment_verified) {
                $student->update([
                    'enrollment_verified' => true,
                    'enrollment_verified_at' => now(),
                    'verified_enrollment_by' => $document->uploaded_by, // El que subió los documentos
                ]);

                Log::info('Matrícula verificada automáticamente - Todos los documentos confirmados', [
                    'student_id' => $student->id,
                    'student_name' => $student->user->name ?? 'N/A',
                    'total_documents' => $totalDocuments,
                    'verified_at' => now()
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Documento confirmado exitosamente',
                'document' => [
                    'id' => $document->id,
                    'confirmed' => true,
                    'confirmed_at' => $document->confirmed_at->toISOString(),
                    'has_signed_file' => !is_null($signedFilePath)
                ],
                'enrollment_verified' => $allDocumentsConfirmed, // Indicar si ya se verificó la matrícula
                'pending_documents' => $totalDocuments - $confirmedDocuments
            ]);
        } catch (\Exception $e) {
            Log::error('Error al confirmar documento', [
                'document_id' => $documentId,
                'student_id' => $student->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al confirmar el documento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reenviar correo con enlace para firmar el contrato
     */
    public function resendContractEmail(Student $student)
    {
        try {
            // Validar que solo admins y verifiers puedan reenviar
            if (!auth()->user()->isAdminOrVerifier()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para reenviar el correo'
                ], 403);
            }

            // Validar que el estudiante tenga un contrato generado
            $latestContract = $student->contractAcceptances()
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$latestContract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este estudiante no tiene un contrato generado'
                ], 400);
            }

            // Validar que el contrato no esté ya firmado
            if ($latestContract->isAccepted()) {
                return response()->json([
                    'success' => false,
                    'message' => 'El contrato ya ha sido firmado por el estudiante'
                ], 400);
            }

            // Cargar relaciones necesarias
            $student->load(['user', 'academicLevel', 'paymentPlan']);

            // Reenviar email con el token existente
            Mail::to($student->user->email)->send(
                new ContractMail($student, $latestContract->token, $latestContract->pdf_path)
            );

            Log::info('Correo de contrato reenviado', [
                'student_id' => $student->id,
                'student_email' => $student->user->email,
                'contract_id' => $latestContract->id,
                'resent_by' => auth()->user()->name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Correo reenviado exitosamente',
                'student_email' => $student->user->email,
            ]);

        } catch (\Exception $e) {
            Log::error('Error al reenviar correo de contrato', [
                'student_id' => $student->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al reenviar el correo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generar y descargar cronograma de pagos
     */
    public function downloadPaymentSchedule(Student $student)
    {
        try {
            $user = auth()->user();
            
            // Verificar permisos según el rol
            if ($user->role === 'sales_advisor' && (int)$student->registered_by !== $user->id) {
                abort(403, 'No tienes permiso para ver este cronograma.');
            }
            
            // Generar cronograma
            $scheduleService = new \App\Services\PaymentScheduleGeneratorService();
            $schedulePath = $scheduleService->generate($student);
            
            if (!$schedulePath) {
                abort(404, 'No se pudo generar el cronograma de pagos.');
            }
            
            $filePath = storage_path('app/public/' . $schedulePath);
            
            if (!file_exists($filePath)) {
                Log::error('Archivo de cronograma no encontrado:', [
                    'student_id' => $student->id,
                    'file_path' => $schedulePath,
                    'absolute_path' => $filePath
                ]);
                abort(404, 'El archivo del cronograma no existe en el servidor.');
            }
            
            // Retornar el archivo para visualización en el navegador
            return response()->file($filePath, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="Cronograma_Pagos_' . $student->enrollment_code . '.pdf"'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error al descargar cronograma de pagos', [
                'student_id' => $student->id,
                'error' => $e->getMessage()
            ]);
            abort(500, 'Error al generar el cronograma de pagos.');
        }
    }

    /**
     * Generar y enviar contrato cuando el prospecto pasa a "pago_por_verificar"
     */
    /**
     * Generar y enviar contrato con timeout extendido
     */
    private function generateAndSendContract(Student $student): void
    {
        try {
            // 🔥 Aumentar timeout temporalmente para esta operación
            set_time_limit(120); // 2 minutos para generar el contrato
            
            // Cargar relaciones necesarias
            $student->load(['academicLevel', 'paymentPlan', 'user']);

            Log::info('Iniciando generación de contrato', [
                'student_id' => $student->id,
                'has_academic_level' => $student->academicLevel !== null,
                'has_payment_plan' => $student->paymentPlan !== null,
                'has_user' => $student->user !== null,
            ]);

            // Generar PDF del contrato desde template
            $contractService = new ContractGeneratorService();
            $pdfPath = $contractService->generateContractPDF($student);
            $contractHTML = $contractService->generateContractHTML($student);

            if (!$pdfPath || !$contractHTML) {
                Log::warning('No se pudo generar contrato - Template no encontrado o datos incompletos', [
                    'student_id' => $student->id,
                    'pdf_generated' => $pdfPath !== null,
                    'html_generated' => $contractHTML !== null,
                ]);
                return;
            }

            Log::info('PDF generado exitosamente', [
                'student_id' => $student->id,
                'pdf_path' => $pdfPath,
            ]);

            // Generar token único
            $token = ContractAcceptance::generateToken();

            // Guardar en la tabla contract_acceptances
            ContractAcceptance::create([
                'student_id' => $student->id,
                'token' => $token,
                'contract_content' => $contractHTML,
                'pdf_path' => $pdfPath,
                'accepted_at' => null,
                'ip_address' => null,
            ]);

            Log::info('Registro de contrato creado en DB', [
                'student_id' => $student->id,
                'token' => $token,
            ]);

            // Enviar email con PDF adjunto y link para aceptar
            Mail::to($student->user->email)->send(new ContractMail($student, $token, $pdfPath));

            Log::info('Contrato PDF generado y enviado', [
                'student_id' => $student->id,
                'student_email' => $student->user->email,
                'token' => $token,
                'pdf_path' => $pdfPath,
            ]);

        } catch (\Exception $e) {
            Log::error('Error al generar y enviar contrato', [
                'student_id' => $student->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        } finally {
            // Restaurar timeout original
            set_time_limit(60);
        }
    }

    /**
     * Generar código de operación único para el voucher
     * Formato: OP-{AÑO}{MES}-{ID_VOUCHER}
     * Ejemplo: OP-202511-00000123
     */
    private function generateTransactionReference(int $voucherId): string
    {
        $year = date('Y');
        $month = str_pad(date('m'), 2, '0', STR_PAD_LEFT);
        $paddedId = str_pad($voucherId, 8, '0', STR_PAD_LEFT);
        
        return "OP-{$year}{$month}-{$paddedId}";
    }
}

