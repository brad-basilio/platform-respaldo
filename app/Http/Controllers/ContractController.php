<?php

namespace App\Http\Controllers;

use App\Models\ContractAcceptance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class ContractController extends Controller
{
    /**
     * Mostrar página para aceptar contrato (PDF ya fue enviado por email)
     */
    public function view(string $token)
    {
        $contractAcceptance = ContractAcceptance::where('token', $token)
            ->with('student.academicLevel', 'student.paymentPlan', 'student.user')
            ->firstOrFail();

        // Verificar que el usuario autenticado es el estudiante del contrato
        if (!Auth::check() || Auth::user()->student->id !== $contractAcceptance->student_id) {
            return redirect()->route('login')->with('error', 'Debes iniciar sesión para aceptar el contrato');
        }

        $pdfUrl = $contractAcceptance->pdf_path 
            ? asset('storage/' . $contractAcceptance->pdf_path)
            : null;

        return Inertia::render('Student/ContractView', [
            'contract' => [
                'id' => $contractAcceptance->id,
                'pdf_url' => $pdfUrl,
                'accepted' => $contractAcceptance->isAccepted(),
                'accepted_at' => $contractAcceptance->accepted_at,
                'token' => $token,
            ],
            'student' => [
                'name' => $contractAcceptance->student->first_name . ' ' . $contractAcceptance->student->paternal_last_name . ' ' . ($contractAcceptance->student->maternal_last_name ?? ''),
                'email' => $contractAcceptance->student->user->email ?? 'N/A',
                'academic_level' => $contractAcceptance->student->academicLevel->name ?? 'N/A',
                'payment_plan' => $contractAcceptance->student->paymentPlan->name ?? 'N/A',
            ]
        ]);
    }

    /**
     * Aceptar contrato
     */
    public function accept(Request $request, string $token)
    {
        // Validar firma (opcional)
        $request->validate([
            'signature' => 'nullable|image|max:2048', // 2MB máximo
        ]);

        $contractAcceptance = ContractAcceptance::where('token', $token)
            ->with('student.academicLevel', 'student.paymentPlan', 'student.user', 'student.registeredBy')
            ->firstOrFail();

        // Verificar que el usuario autenticado es el estudiante del contrato
        if (!Auth::check() || Auth::user()->student->id !== $contractAcceptance->student_id) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado'
            ], 403);
        }

        // Verificar si ya fue aceptado
        if ($contractAcceptance->isAccepted()) {
            return response()->json([
                'success' => false,
                'message' => 'El contrato ya fue aceptado previamente'
            ], 400);
        }

        // Guardar imagen de firma (si existe)
        $signaturePath = null;
        if ($request->hasFile('signature')) {
            $signatureFile = $request->file('signature');
            $signatureFileName = 'signature_' . $contractAcceptance->student_id . '_' . time() . '.' . $signatureFile->extension();
            $signaturePath = $signatureFile->storeAs('signatures', $signatureFileName, 'public');
        }

        // Regenerar PDF con la firma
        $contractService = new \App\Services\ContractGeneratorService();
        $newPdfPath = $contractService->generateContractPDF($contractAcceptance->student, $signaturePath);
        $newContractHTML = $contractService->generateContractHTML($contractAcceptance->student, $signaturePath);

        // Actualizar registro
        $ipAddress = $request->ip();
        $contractAcceptance->markAsAccepted($ipAddress);
        $contractAcceptance->signature_path = $signaturePath;
        $contractAcceptance->pdf_path = $newPdfPath;
        $contractAcceptance->contract_content = $newContractHTML;
        
        // ✅ NUEVO FLUJO: Cuando el estudiante firma, pasar DIRECTAMENTE a "pago_por_verificar"
        // Ya no requiere revisión del advisor
        $contractAcceptance->advisor_approved = true;
        $contractAcceptance->advisor_approved_at = now();
        $contractAcceptance->advisor_id = $contractAcceptance->student->registered_by; // Quien registró al estudiante
        $contractAcceptance->save();

        // Cambiar estado del estudiante a "pago_por_verificar" automáticamente
        $student = $contractAcceptance->student;
        $student->prospect_status = 'pago_por_verificar';
        $student->save();

        // ⚠️ COMENTADO: Funcionalidad anterior de revisión del advisor
        // Este flujo requería que el advisor revisara y aprobara manualmente el contrato
        // Ahora el contrato pasa directamente a "pago_por_verificar" cuando el estudiante firma
        
        // // Disparar evento para notificar al asesor en tiempo real
        // \Illuminate\Support\Facades\Log::info('Disparando evento ContractSignedByStudent', [
        //     'student_id' => $contractAcceptance->student_id,
        //     'advisor_id' => $contractAcceptance->student->registered_by
        // ]);
        // event(new \App\Events\ContractSignedByStudent($contractAcceptance, $contractAcceptance->student));

        // // Notificar al asesor (Notificación persistente + Broadcast estándar)
        // if ($contractAcceptance->student->registeredBy) {
        //     $contractAcceptance->student->registeredBy->notify(
        //         new \App\Notifications\ContractSignedNotification($contractAcceptance, $contractAcceptance->student)
        //     );
        //     \Illuminate\Support\Facades\Log::info('Notificación enviada al asesor', [
        //         'advisor_id' => $contractAcceptance->student->registered_by
        //     ]);
        // }

        return response()->json([
            'success' => true,
            'message' => 'Contrato firmado exitosamente. Tu matrícula ha pasado a verificación de pago.',
            'accepted_at' => $contractAcceptance->accepted_at,
        ]);
    }
}

