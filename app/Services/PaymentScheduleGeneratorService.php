<?php

namespace App\Services;

use App\Models\Student;
use App\Models\Setting;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PaymentScheduleGeneratorService
{
    /**
     * Generate payment schedule PDF for a student
     */
    public function generate(Student $student): ?string
    {
        try {
            // Load enrollment with installments and payment plan
            $enrollment = $student->enrollments()
                ->where('status', 'active')
                ->with(['installments', 'paymentPlan.academicLevel'])
                ->first();

            if (!$enrollment) {
                Log::error('No active enrollment found for student', ['student_id' => $student->id]);
                return null;
            }

            // Get the template from database
            $template = Setting::where('key', 'payment_schedule_template')->first();
            
            if (!$template) {
                Log::error('Payment schedule template not found in settings');
                return null;
            }

            // Generate HTML from template with variable replacement
            $html = $this->replaceTemplateVariables($template->content, $student, $enrollment);

            // Configure Dompdf
            $options = new Options();
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isRemoteEnabled', true);
            $options->set('defaultFont', 'DejaVu Sans');

            $dompdf = new Dompdf($options);
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();

            // Save PDF to storage
            $filename = 'cronograma_pagos_' . $student->id . '_' . time() . '.pdf';
            $path = 'payment_schedules/' . $filename;
            
            Storage::disk('public')->put($path, $dompdf->output());

            Log::info('Payment schedule generated successfully', [
                'student_id' => $student->id,
                'path' => $path
            ]);

            return $path; // Retornar solo la ruta relativa

        } catch (\Exception $e) {
            Log::error('Error generating payment schedule', [
                'student_id' => $student->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Replace template variables with actual data
     */
    private function replaceTemplateVariables(string $template, Student $student, $enrollment): string
    {
        $installments = $enrollment->installments;

        // Calculate totals
        $totalAmount = $installments->sum('amount');
        $totalPaid = $installments
            ->where('status', 'verified')
            ->sum('paid_amount');
        $totalPending = $totalAmount - $totalPaid;

        // Generate installments table rows
        $tableRows = $this->generateInstallmentRows($installments);
        
        // Get advisor name
        $advisorName = $student->registeredBy ? $student->registeredBy->name : 'No asignado';
        
        // Get enrollment code (generate if not exists)
        $enrollmentCode = $this->getEnrollmentCode($enrollment, $student);
        
        // Get academic level name
        $academicLevel = $enrollment->paymentPlan && $enrollment->paymentPlan->academicLevel 
            ? $enrollment->paymentPlan->academicLevel->name 
            : 'No especificado';
        
        // Get payment plan name
        $paymentPlanName = $enrollment->paymentPlan 
            ? $enrollment->paymentPlan->name 
            : 'No especificado';

        // Replace variables
        $variables = [
            '{{nombre_estudiante}}' => $student->full_name,
            '{{codigo_matricula}}' => $enrollmentCode,
            '{{nivel_academico}}' => $academicLevel,
            '{{plan_pago}}' => $paymentPlanName,
            '{{fecha_matricula}}' => $enrollment->enrollment_date ? $enrollment->enrollment_date->format('d/m/Y') : 'N/A',
            '{{nombre_asesor}}' => $advisorName,
            '{{monto_total}}' => number_format($totalAmount, 2),
            '{{total_pagado}}' => number_format($totalPaid, 2),
            '{{total_pendiente}}' => number_format($totalPending, 2),
            '{{filas_cuotas}}' => $tableRows,
            '{{tabla_cuotas}}' => $tableRows, // Por compatibilidad
            '{{fecha_generacion}}' => now()->format('d/m/Y H:i:s'),
            '{{codigo_cronograma}}' => 'CRON-' . date('Y') . '-' . str_pad($student->id, 6, '0', STR_PAD_LEFT),
        ];

        return str_replace(array_keys($variables), array_values($variables), $template);
    }
    
    /**
     * Get or generate enrollment code
     */
    private function getEnrollmentCode($enrollment, Student $student): string
    {
        // Si existe un campo enrollment_code en la tabla, usarlo
        if (isset($enrollment->enrollment_code) && $enrollment->enrollment_code) {
            return $enrollment->enrollment_code;
        }
        
        // Generar código basado en ID y fecha
        $year = $enrollment->enrollment_date ? $enrollment->enrollment_date->format('Y') : date('Y');
        return 'MAT-' . $year . '-' . str_pad($enrollment->id, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Generate HTML table rows for installments
     */
    private function generateInstallmentRows($installments): string
    {
        $rows = '';

        foreach ($installments as $installment) {
            $statusLabel = $this->getStatusLabel($installment->status);
            $statusColor = $this->getStatusColor($installment->status);
            $rowBg = $installment->status === 'verified' ? 'background: #f0fdf4;' : '';
            
            // Concepto de la cuota
            $concepto = $installment->installment_number == 1 
                ? 'Matrícula + Primera Cuota' 
                : 'Cuota ' . $this->numberToText($installment->installment_number);
            
            $dueDate = $installment->due_date ? $installment->due_date->format('d/m/Y') : '-';
            $paymentDate = $installment->paid_date ? $installment->paid_date->format('d/m/Y') : '-';
            $paidAmount = $installment->paid_amount ? 'S/ ' . number_format($installment->paid_amount, 2) : 'S/ 0.00';
            
            // Color gris para fechas y montos no aplicables
            $paymentDateColor = $installment->paid_date ? '#333' : '#999';
            $paidAmountColor = $installment->paid_amount ? '#333' : '#999';

            $rows .= "
                <tr style='{$rowBg}'>
                    <td style='padding: 12px 10px; font-size: 12px; color: #333; text-align: center; border-bottom: 1px solid #e5e7eb;'>{$installment->installment_number}</td>
                    <td style='padding: 12px 10px; font-size: 12px; color: #333; text-align: left; border-bottom: 1px solid #e5e7eb;'>{$concepto}</td>
                    <td style='padding: 12px 10px; font-size: 12px; color: #333; text-align: right; border-bottom: 1px solid #e5e7eb;'>S/ " . number_format($installment->amount, 2) . "</td>
                    <td style='padding: 12px 10px; font-size: 12px; color: #333; text-align: center; border-bottom: 1px solid #e5e7eb;'>{$dueDate}</td>
                    <td style='padding: 12px 10px; font-size: 12px; color: {$paymentDateColor}; text-align: center; border-bottom: 1px solid #e5e7eb;'>{$paymentDate}</td>
                    <td style='padding: 12px 10px; font-size: 12px; color: {$paidAmountColor}; text-align: right; border-bottom: 1px solid #e5e7eb;'>{$paidAmount}</td>
                    <td style='padding: 12px 10px; font-size: 12px; color: {$statusColor}; font-weight: bold; text-align: center; border-bottom: 1px solid #e5e7eb;'>{$statusLabel}</td>
                </tr>
            ";
        }

        return $rows;
    }

    /**
     * Convert number to text in Spanish
     */
    private function numberToText(int $number): string
    {
        $text = [
            1 => 'Primera', 2 => 'Segunda', 3 => 'Tercera', 4 => 'Cuarta',
            5 => 'Quinta', 6 => 'Sexta', 7 => 'Séptima', 8 => 'Octava',
            9 => 'Novena', 10 => 'Décima', 11 => 'Undécima', 12 => 'Duodécima'
        ];

        return $text[$number] ?? $number . 'ª';
    }

    /**
     * Get status badge HTML (no longer needed, keeping for backwards compatibility)
     */
    private function getStatusBadge(string $status): string
    {
        $label = $this->getStatusLabel($status);
        $class = 'badge badge-' . $status;

        return "<span class='{$class}'>{$label}</span>";
    }

    /**
     * Get status label in Spanish
     */
    private function getStatusLabel(string $status): string
    {
        $labels = [
            'pending' => 'PENDIENTE',
            'paid' => 'PAGADO',
            'verified' => 'VERIFICADO',
            'overdue' => 'VENCIDO',
        ];

        return $labels[$status] ?? strtoupper($status);
    }

    /**
     * Get status color
     */
    private function getStatusColor(string $status): string
    {
        $colors = [
            'pending' => '#F98613',    // Naranja
            'paid' => '#3b82f6',       // Azul
            'verified' => '#17BC91',   // Verde
            'overdue' => '#ef4444',    // Rojo
        ];

        return $colors[$status] ?? '#6b7280';
    }
}
