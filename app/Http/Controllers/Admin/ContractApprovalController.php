<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContractAcceptance;
use App\Models\Student;
use App\Models\User;
use App\Services\ContractGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ContractApprovalController extends Controller
{
    /**
     * Mostrar detalles del contrato para revisión
     */
    public function show(ContractAcceptance $contractAcceptance)
    {
        $contractAcceptance->load('student.user', 'student.registeredBy', 'student.academicLevel', 'student.paymentPlan');

        return response()->json([
            'contract_acceptance' => $contractAcceptance,
            'student' => $contractAcceptance->student,
            'pdf_url' => Storage::url($contractAcceptance->pdf_path),
        ]);
    }

    /**
     * Aprobar el contrato y enviar emails
     */
    public function approve(ContractAcceptance $contractAcceptance)
    {
        // Verificar que el contrato fue aceptado por el estudiante
        if (!$contractAcceptance->isAccepted()) {
            return response()->json([
                'success' => false,
                'message' => 'El contrato no ha sido firmado por el estudiante',
            ], 400);
        }

        // Verificar que no esté ya aprobado
        if ($contractAcceptance->advisor_approved) {
            return response()->json([
                'success' => false,
                'message' => 'El contrato ya fue aprobado previamente',
            ], 400);
        }

        // Marcar como aprobado por el asesor
        $contractAcceptance->advisor_approved = true;
        $contractAcceptance->advisor_approved_at = now();
        $contractAcceptance->advisor_id = Auth::id();
        $contractAcceptance->save();

        // Cambiar estado del estudiante a "pago_por_verificar"
        // Cambiar estado del estudiante a "pago_por_verificar"
        $student = $contractAcceptance->student;
        $student->prospect_status = 'pago_por_verificar';
        $student->save();

        // Enviar emails
        try {
            $pdfPath = $contractAcceptance->pdf_path;

            // Email al estudiante
            Mail::to($student->user->email)->send(
                new \App\Mail\ContractSignedStudentMail($student, $pdfPath)
            );

            // Email al admin
            $adminUser = User::where('role', 'admin')->first();
            if ($adminUser) {
                Mail::to($adminUser->email)->send(
                    new \App\Mail\ContractSignedAdminMail($student, $pdfPath)
                );
            }

            // Email al asesor
            if ($student->registeredBy) {
                Mail::to($student->registeredBy->email)->send(
                    new \App\Mail\ContractSignedAdvisorMail($student, $pdfPath)
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error enviando emails de aprobación de contrato: ' . $e->getMessage());
            // No retornamos error para que el proceso de aprobación continúe
        }

        return response()->json([
            'success' => true,
            'message' => 'Contrato aprobado y emails enviados exitosamente',
        ]);
    }

    /**
     * Rechazar el contrato y reenviar email al estudiante
     */
    public function resend(ContractAcceptance $contractAcceptance)
    {
        // Verificar que el contrato fue aceptado
        if (!$contractAcceptance->isAccepted()) {
            return response()->json([
                'success' => false,
                'message' => 'El contrato no ha sido firmado',
            ], 400);
        }

        $student = $contractAcceptance->student;

        // Eliminar firma anterior
        if ($contractAcceptance->signature_path) {
            Storage::disk('public')->delete($contractAcceptance->signature_path);
        }

        // Eliminar PDF con firma
        if ($contractAcceptance->pdf_path) {
            Storage::disk('public')->delete($contractAcceptance->pdf_path);
        }

        // Resetear el registro de aceptación
        $contractAcceptance->accepted_at = null;
        $contractAcceptance->signature_path = null;
        
        // Regenerar PDF sin firma
        $contractService = new ContractGeneratorService();
        $newPdfPath = $contractService->generateContractPDF($student);
        $newContractHTML = $contractService->generateContractHTML($student);

        // Actualizar con nuevo PDF sin firma
        $contractAcceptance->pdf_path = $newPdfPath;
        $contractAcceptance->contract_content = $newContractHTML;
        $contractAcceptance->save();

        // Reenviar email al estudiante con el contrato para firmar nuevamente
        Mail::to($student->user->email)->send(
            new \App\Mail\ContractMail($student, $contractAcceptance->token, $newPdfPath)
        );

        return response()->json([
            'success' => true,
            'message' => 'Contrato rechazado y reenviado al estudiante para nueva firma',
        ]);
    }
}
