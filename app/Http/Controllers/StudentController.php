<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Group;
use App\Models\AcademicLevel;
use App\Models\PaymentPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;  // ✅ NUEVO: Para manejar archivos
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function enrolledStudents(): Response
    {
        // Solo mostrar estudiantes matriculados
        $students = Student::with(['user', 'groups', 'badges', 'registeredBy', 'verifiedPaymentBy', 'verifiedEnrollmentBy'])
            ->where('prospect_status', 'matriculado')
            ->orderBy('enrollment_date', 'desc')
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
                ];
            });

        $groups = Group::with('teacher.user')->get();

        return Inertia::render('Admin/EnrolledStudents', [
            'students' => $students,
            'groups' => $groups,
            'userRole' => auth()->user()->role ?? 'admin',
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
            'paymentPlan'     // ✅ Nuevo
        ]);
        
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
            'paymentPlan'     // ✅ Nuevo
        ]);
        
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
                ];
            });

        return response()->json($students);
    }

    public function store(Request $request)
    {
        // Solo admin y sales_advisor pueden crear prospectos
        if (!in_array(auth()->user()->role, ['admin', 'sales_advisor'])) {
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
            'academic_level_id' => 'nullable|exists:academic_levels,id',  // ✅ Cambiado de 'level'
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
            'registered_by' => auth()->id(),
            'registration_date' => now(),
            'status' => 'active',
            'prospect_status' => 'registrado',
        ]));

        return redirect()->back()->with('success', 'Prospecto creado exitosamente');
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
            ]);

            // Convertir a booleano si viene como string
            $paymentVerified = filter_var($validated['payment_verified'], FILTER_VALIDATE_BOOLEAN);

            Log::info('Valor de payment_verified:', [
                'original' => $validated['payment_verified'],
                'converted' => $paymentVerified,
                'type' => gettype($paymentVerified)
            ]);

            // Si marca payment_verified, cambiar directamente a matriculado
            if ($paymentVerified === true) {
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
            
            // Guardar la URL pública y el nombre original
            $validated['payment_voucher_url'] = Storage::url($path);
            $validated['payment_voucher_file_name'] = $file->getClientOriginalName();
            
            Log::info('Voucher de pago subido:', [
                'student_id' => $student->id,
                'file_url' => $validated['payment_voucher_url'],
                'file_name' => $file->getClientOriginalName(),
            ]);
        }

        // Update user
        $student->user->update([
            'name' => trim("{$validated['first_name']} {$validated['paternal_last_name']} {$validated['maternal_last_name']}"),
            'email' => $validated['email'],
        ]);

        // Log para debug
        Log::info('Updating student with validated data:', $validated);

        // Update student
        $student->update($validated);

        // Lógica de cambio de estado automático para Sales Advisor
        if ($user->role === 'sales_advisor') {
            // Si completa fecha de pago, nivel académico y plan de pago, puede marcar como listo para verificar
            if (!empty($validated['payment_date']) && 
                !empty($validated['academic_level_id']) &&  // ✅ Cambiado de 'level'
                !empty($validated['payment_plan_id']) &&    // ✅ Cambiado de 'contracted_plan'
                $student->prospect_status === 'propuesta_enviada') {
                // Auto-cambiar a pago_por_verificar
                $student->update(['prospect_status' => 'pago_por_verificar']);
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
            }
        }

        $student->update(['prospect_status' => $newStatus]);
        
        // Recargar el estudiante con sus relaciones
        $student->load(['registeredBy', 'verifiedPaymentBy']);

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
        // Validar que solo admins puedan verificar matrículas
        if (!auth()->user()->isAdmin()) {
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

        try {
            // Marcar como verificado
            $student->update([
                'enrollment_verified' => true,
                'enrollment_verified_at' => now(),
                'verified_enrollment_by' => auth()->id(),
            ]);

            Log::info('Matrícula verificada por administrador', [
                'student_id' => $student->id,
                'student_name' => $student->user->name ?? 'N/A',
                'verified_by' => auth()->user()->name,
                'verified_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Matrícula verificada exitosamente',
                'student' => [
                    'id' => $student->id,
                    'enrollmentVerified' => true,
                    'enrollmentVerifiedAt' => $student->enrollment_verified_at->toISOString(),
                    'verifiedEnrollmentBy' => [
                        'id' => auth()->id(),
                        'name' => auth()->user()->name,
                        'email' => auth()->user()->email,
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error al verificar matrícula', [
                'student_id' => $student->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al verificar la matrícula'
            ], 500);
        }
    }

    /**
     * Remover verificación de matrícula
     */
    public function unverifyEnrollment(Request $request, Student $student)
    {
        // Validar que solo admins puedan remover verificación
        if (!auth()->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para modificar verificaciones'
            ], 403);
        }

        try {
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
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Verificación removida exitosamente',
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
}

