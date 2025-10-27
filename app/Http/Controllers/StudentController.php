<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Group;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function index(): Response
    {
        $user = auth()->user();
        
        // Construir query base
        $query = Student::with(['user', 'groups', 'badges', 'registeredBy']);
        
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
                    'birthDate' => $student->birth_date,
                    'documentType' => $student->document_type,
                    'documentNumber' => $student->document_number,
                    'educationLevel' => $student->education_level,
                    'role' => 'student',
                    'status' => $student->status ?? 'active',
                    'level' => $student->level,
                    'points' => $student->points ?? 0,
                    'prospectStatus' => $student->prospect_status,
                    'paymentDate' => $student->payment_date,
                    'enrollmentDate' => $student->enrollment_date,
                    'enrollmentCode' => $student->enrollment_code,
                    'registrationDate' => $student->registration_date,
                    'contractedPlan' => $student->contracted_plan,
                    'paymentVerified' => $student->payment_verified ?? false,
                    'hasPlacementTest' => $student->has_placement_test ?? false,
                    'testDate' => $student->test_date,
                    'testScore' => $student->test_score,
                    'guardianName' => $student->guardian_name,
                    'guardianDocumentNumber' => $student->guardian_document_number,
                    'guardianEmail' => $student->guardian_email,
                    'guardianBirthDate' => $student->guardian_birth_date,
                    'guardianPhone' => $student->guardian_phone,
                    'guardianAddress' => $student->guardian_address,
                    'registeredBy' => $student->registeredBy ? [
                        'id' => $student->registeredBy->id,
                        'name' => $student->registeredBy->name,
                        'email' => $student->registeredBy->email,
                    ] : null,
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
        // Solo admin y sales_advisor pueden editar
        // Sales advisor solo puede editar sus propios prospectos
        $user = auth()->user();
        if ($user->role === 'cashier') {
            abort(403, 'No tienes permiso para editar prospectos.');
        }
        if ($user->role === 'sales_advisor' && $student->registered_by !== $user->id) {
            abort(403, 'Solo puedes editar tus propios prospectos.');
        }

        $validated = $request->validate([
            'first_name' => 'required|string',
            'paternal_last_name' => 'required|string',
            'maternal_last_name' => 'nullable|string',
            'phone_number' => 'required|string',
            'gender' => 'required|string',
            'birth_date' => 'required|date',
            'document_type' => 'required|string',
            'document_number' => 'required|string|unique:students,document_number,' . $student->id,
            'education_level' => 'required|string',
            'email' => 'required|email|unique:users,email,' . $student->user_id,
            'payment_date' => 'nullable|date',
            'enrollment_date' => 'nullable|date',
            'enrollment_code' => 'nullable|string',
            'level' => 'required|in:basic,intermediate,advanced',
            'contracted_plan' => 'nullable|string',
            'payment_verified' => 'boolean',
            'has_placement_test' => 'boolean',
            'test_date' => 'nullable|date',
            'test_score' => 'nullable|numeric',
            'guardian_name' => 'nullable|string',
            'guardian_document_number' => 'nullable|string',
            'guardian_email' => 'nullable|email',
            'guardian_birth_date' => 'nullable|date',
            'guardian_phone' => 'nullable|string',
            'guardian_address' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        // Update user
        $student->user->update([
            'name' => trim("{$validated['first_name']} {$validated['paternal_last_name']} {$validated['maternal_last_name']}"),
            'email' => $validated['email'],
        ]);

        // Update student
        $student->update($validated);

        // Update prospect status if enrollment date is set
        if (isset($validated['enrollment_date']) && $validated['enrollment_date']) {
            $student->update(['prospect_status' => 'matriculado']);
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
            'prospect_status' => 'required|in:registrado,propuesta_enviada,verificacion_pago,matriculado',
        ]);

        $userRole = auth()->user()->role;
        $currentStatus = $student->prospect_status;
        $newStatus = $validated['prospect_status'];

        // Validaciones según rol
        if ($userRole === 'sales_advisor') {
            // Asesor de Ventas: solo puede mover de registrado -> propuesta_enviada
            if (!($currentStatus === 'registrado' && $newStatus === 'propuesta_enviada')) {
                return redirect()->back()->withErrors(['error' => 'Solo puedes mover prospectos de Registrado a Propuesta Enviada']);
            }
        } elseif ($userRole === 'student') {
            // Estudiante/Prospecto: solo puede mover de propuesta_enviada -> verificacion_pago
            if (!($currentStatus === 'propuesta_enviada' && $newStatus === 'verificacion_pago')) {
                return redirect()->back()->withErrors(['error' => 'Solo puedes confirmar tu pago cuando tienes una propuesta']);
            }
        } elseif ($userRole === 'cashier') {
            // Cajero/Tesorero: solo puede mover de verificacion_pago -> matriculado
            if (!($currentStatus === 'verificacion_pago' && $newStatus === 'matriculado')) {
                return redirect()->back()->withErrors(['error' => 'Solo puedes matricular prospectos en Verificación de Pago']);
            }
            
            // Validar que tenga fecha de pago antes de matricular
            if ($newStatus === 'matriculado' && !$student->payment_date) {
                return redirect()->back()->withErrors(['error' => 'Debe registrar fecha de pago antes de matricular']);
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

        return redirect()->back()->with('success', 'Estado del prospecto actualizado exitosamente');
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
}
