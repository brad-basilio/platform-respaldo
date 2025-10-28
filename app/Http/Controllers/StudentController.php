<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function index(): Response
    {
        $user = auth()->user();
        
        // Construir query base
        $query = Student::with(['user', 'groups', 'badges', 'registeredBy', 'verifiedPaymentBy', 'verifiedEnrollmentBy']);
        
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

        return Inertia::render('Admin/StudentManagement', [
            'students' => $students,
            'groups' => $groups,
            'userRole' => auth()->user()->role ?? 'admin',
        ]);
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
            // Solo puede editar prospectos en estado pago_por_verificar
            if ($student->prospect_status !== 'pago_por_verificar') {
                abort(403, 'Solo puedes editar prospectos en estado "Pago Por Verificar".');
            }

            // Cajero simplemente verifica el pago y el sistema matricula automáticamente
            $validated = $request->validate([
                'payment_verified' => 'required|boolean',
            ]);

            // Si marca payment_verified, cambiar directamente a matriculado
            if ($validated['payment_verified'] === true) {
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

            return redirect()->back()->with('success', 'Pago verificado y estudiante matriculado exitosamente');
        }

        // Sales advisor solo puede editar sus propios prospectos
        if ($user->role === 'sales_advisor' && $student->registered_by !== $user->id) {
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
            'level' => 'sometimes|required|in:basic,intermediate,advanced',
            'contracted_plan' => 'nullable|string',
            'contract_file' => 'nullable|file|mimes:pdf|max:10240', // Máximo 10MB
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
            $path = $file->storeAs('private/contracts', $fileName);
            
            // Guardar la ruta en la base de datos
            $validated['contract_file_path'] = $path;
            $validated['contract_file_name'] = $file->getClientOriginalName();
            
            Log::info('Archivo de contrato subido:', [
                'student_id' => $student->id,
                'file_path' => $path,
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
            // Si completa fecha de pago, nivel y plan, puede marcar como listo para verificar
            if (!empty($validated['payment_date']) && 
                !empty($validated['level']) && 
                !empty($validated['contracted_plan']) &&
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
        if ($user->role === 'sales_advisor' && $student->registered_by !== $user->id) {
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

            // Validar que tenga fecha de pago, nivel y plan SOLO antes de pasar a pago_por_verificar
            if ($newStatus === 'pago_por_verificar') {
                if (!$student->payment_date || !$student->level || !$student->contracted_plan) {
                    return response()->json([
                        'message' => 'Datos incompletos',
                        'error' => 'Debe completar fecha de pago, nivel académico y plan contratado antes de marcar como "Pago Por Verificar"'
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
        if ($user->role === 'sales_advisor' && $student->registered_by !== $user->id) {
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
}

