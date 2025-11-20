<?php

namespace App\Jobs;

use App\Models\Student;
use App\Models\ContractAcceptance;
use App\Services\ContractGeneratorService;
use App\Mail\ContractMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class GenerateAndSendContractJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 300; // 5 minutos

    protected $studentId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $studentId)
    {
        $this->studentId = $studentId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // Cargar el estudiante con sus relaciones
            $student = Student::with(['academicLevel', 'paymentPlan', 'user'])->find($this->studentId);

            if (!$student) {
                Log::error('Estudiante no encontrado para generar contrato', [
                    'student_id' => $this->studentId,
                ]);
                return;
            }

            Log::info('Iniciando generación de contrato en background', [
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

            Log::info('PDF generado exitosamente en background', [
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

            Log::info('Contrato PDF generado y enviado exitosamente', [
                'student_id' => $student->id,
                'student_email' => $student->user->email,
                'token' => $token,
                'pdf_path' => $pdfPath,
            ]);

        } catch (\Exception $e) {
            Log::error('Error en Job de generación de contrato', [
                'student_id' => $this->studentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Lanzar excepción para que el job se reintente
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Job de contrato falló después de todos los intentos', [
            'student_id' => $this->studentId,
            'error' => $exception->getMessage(),
        ]);
    }
}
