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
        // Validar firma
        $request->validate([
            'signature' => 'required|image|max:2048', // 2MB máximo
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

        // Guardar imagen de firma
        $signatureFile = $request->file('signature');
        $signatureFileName = 'signature_' . $contractAcceptance->student_id . '_' . time() . '.' . $signatureFile->extension();
        $signaturePath = $signatureFile->storeAs('signatures', $signatureFileName, 'public');

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
        $contractAcceptance->save();

        // Enviar email al estudiante con PDF firmado
        Mail::to($contractAcceptance->student->user->email)->send(
            new \App\Mail\ContractSignedStudentMail($contractAcceptance->student, $newPdfPath)
        );

        // Enviar email al admin
        // Buscar un usuario admin para enviar el email
        $adminUser = \App\Models\User::where('role', 'admin')->first();
        if ($adminUser) {
            Mail::to($adminUser->email)->send(
                new \App\Mail\ContractSignedAdminMail($contractAcceptance->student, $newPdfPath)
            );
        }

        // Enviar email al asesor si existe
        if ($contractAcceptance->student->registeredBy) {
            Mail::to($contractAcceptance->student->registeredBy->email)->send(
                new \App\Mail\ContractSignedAdvisorMail($contractAcceptance->student, $newPdfPath)
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Contrato firmado exitosamente',
            'accepted_at' => $contractAcceptance->accepted_at,
        ]);
    }
}

