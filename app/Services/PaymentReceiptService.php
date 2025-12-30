<?php

namespace App\Services;

use App\Models\InstallmentVoucher;
use App\Models\Student;
use App\Models\Setting;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PaymentReceiptService
{
    /**
     * Generate payment receipt PDF for an approved voucher
     */
    public function generate(InstallmentVoucher $voucher): ?string
    {
        try {
            // Load relationships
            $voucher->load(['installment.enrollment.student', 'installment.enrollment.paymentPlan', 'reviewedBy']);
            
            $installment = $voucher->installment;
            $enrollment = $installment->enrollment;
            $student = $enrollment->student;

            // Get the template from database
            $template = Setting::where('key', 'payment_receipt_template')->first();
            
            if (!$template) {
                Log::warning('Payment receipt template not found, using default');
                $html = $this->getDefaultTemplate($voucher, $student, $installment, $enrollment);
            } else {
                // Generate HTML from template with variable replacement
                $html = $this->replaceTemplateVariables($template->content, $voucher, $student, $installment, $enrollment);
            }

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
            $receiptNumber = $this->generateReceiptNumber($voucher);
            $filename = 'boleta_' . $receiptNumber . '_' . time() . '.pdf';
            $path = 'payment_receipts/' . $student->id . '/' . $filename;
            
            Storage::disk('public')->put($path, $dompdf->output());

            Log::info('Payment receipt generated successfully', [
                'voucher_id' => $voucher->id,
                'student_id' => $student->id,
                'path' => $path
            ]);

            return $path;

        } catch (\Exception $e) {
            Log::error('Error generating payment receipt', [
                'voucher_id' => $voucher->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Generate a unique receipt number
     */
    private function generateReceiptNumber(InstallmentVoucher $voucher): string
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        return 'BOL-' . $year . $month . '-' . str_pad($voucher->id, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Replace template variables with actual data
     */
    private function replaceTemplateVariables(string $template, InstallmentVoucher $voucher, Student $student, $installment, $enrollment): string
    {
        $receiptNumber = $this->generateReceiptNumber($voucher);
        
        // Concepto de la cuota
        $concepto = $installment->installment_number == 1 
            ? 'Matrícula + Primera Cuota' 
            : 'Cuota ' . $this->numberToText($installment->installment_number);
        
        // Payment method label
        $paymentMethodLabel = $this->getPaymentMethodLabel($voucher->payment_method);
        
        // Cashier name
        $cashierName = $voucher->reviewedBy ? $voucher->reviewedBy->name : 'Sistema';

        // Replace variables
        $variables = [
            '{{numero_boleta}}' => $receiptNumber,
            '{{fecha_emision}}' => now()->format('d/m/Y'),
            '{{hora_emision}}' => now()->format('H:i:s'),
            '{{nombre_estudiante}}' => $student->full_name ?? $student->name,
            '{{email_estudiante}}' => $student->email,
            '{{telefono_estudiante}}' => $student->phone ?? '-',
            '{{dni_estudiante}}' => $student->document_number ?? '-',
            '{{codigo_matricula}}' => $this->getEnrollmentCode($enrollment, $student),
            '{{concepto}}' => $concepto,
            '{{numero_cuota}}' => $installment->installment_number,
            '{{monto_cuota}}' => number_format($installment->amount, 2),
            '{{mora}}' => number_format($installment->late_fee ?? 0, 2),
            '{{monto_pagado}}' => number_format($voucher->declared_amount, 2),
            '{{monto_total}}' => number_format($voucher->declared_amount, 2),
            '{{monto_palabras}}' => $this->numberToWords($voucher->declared_amount),
            '{{metodo_pago}}' => $paymentMethodLabel,
            '{{fecha_pago}}' => $voucher->payment_date ? $voucher->payment_date->format('d/m/Y') : '-',
            '{{referencia}}' => $voucher->transaction_reference ?? '-',
            '{{cajero}}' => $cashierName,
            '{{plan_pago}}' => $enrollment->paymentPlan->name ?? 'Plan de Pago',
            '{{nivel_academico}}' => $enrollment->paymentPlan->academicLevel->name ?? '-',
        ];

        return str_replace(array_keys($variables), array_values($variables), $template);
    }

    /**
     * Get default template if none exists in database
     */
    private function getDefaultTemplate(InstallmentVoucher $voucher, Student $student, $installment, $enrollment): string
    {
        $receiptNumber = $this->generateReceiptNumber($voucher);
        $concepto = $installment->installment_number == 1 
            ? 'Matrícula + Primera Cuota' 
            : 'Cuota ' . $this->numberToText($installment->installment_number);
        $paymentMethodLabel = $this->getPaymentMethodLabel($voucher->payment_method);
        $cashierName = $voucher->reviewedBy ? $voucher->reviewedBy->name : 'Sistema';
        $enrollmentCode = $this->getEnrollmentCode($enrollment, $student);
        
        return '
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Boleta de Pago - ' . $receiptNumber . '</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 12px; color: #333; background: #fff; }
                .container { max-width: 800px; margin: 0 auto; padding: 30px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #073372; padding-bottom: 20px; }
                .logo { font-size: 28px; font-weight: bold; color: #073372; margin-bottom: 5px; }
                .subtitle { color: #666; font-size: 14px; }
                .receipt-number { background: linear-gradient(135deg, #073372, #17BC91); color: white; padding: 10px 20px; display: inline-block; border-radius: 5px; font-size: 16px; font-weight: bold; margin-top: 15px; }
                .section { margin-bottom: 25px; }
                .section-title { font-size: 14px; font-weight: bold; color: #073372; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; }
                .info-grid { display: table; width: 100%; }
                .info-row { display: table-row; }
                .info-label { display: table-cell; padding: 8px 10px; background: #f8fafc; font-weight: 600; width: 35%; border: 1px solid #e5e7eb; }
                .info-value { display: table-cell; padding: 8px 10px; border: 1px solid #e5e7eb; }
                .amount-box { background: linear-gradient(135deg, #073372, #17BC91); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
                .amount-label { font-size: 14px; opacity: 0.9; margin-bottom: 5px; }
                .amount-value { font-size: 32px; font-weight: bold; }
                .amount-words { font-size: 11px; opacity: 0.8; margin-top: 5px; font-style: italic; }
                .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 10px; }
                .stamp { text-align: center; margin: 30px 0; }
                .stamp-box { display: inline-block; border: 2px solid #17BC91; padding: 15px 30px; border-radius: 5px; }
                .stamp-text { color: #17BC91; font-weight: bold; font-size: 14px; }
                .stamp-date { color: #666; font-size: 10px; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">UNCED</div>
                    <div class="subtitle">Centro de Idiomas</div>
                    <div class="receipt-number">BOLETA N° ' . $receiptNumber . '</div>
                </div>
                
                <div class="section">
                    <div class="section-title">📋 DATOS DEL ESTUDIANTE</div>
                    <div class="info-grid">
                        <div class="info-row">
                            <div class="info-label">Nombre Completo</div>
                            <div class="info-value">' . ($student->full_name ?? $student->name) . '</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Email</div>
                            <div class="info-value">' . $student->email . '</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">DNI</div>
                            <div class="info-value">' . ($student->document_number ?? '-') . '</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Código de Matrícula</div>
                            <div class="info-value">' . $enrollmentCode . '</div>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">💳 DETALLE DEL PAGO</div>
                    <div class="info-grid">
                        <div class="info-row">
                            <div class="info-label">Concepto</div>
                            <div class="info-value">' . $concepto . '</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Plan de Pago</div>
                            <div class="info-value">' . ($enrollment->paymentPlan->name ?? 'Plan de Pago') . '</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Método de Pago</div>
                            <div class="info-value">' . $paymentMethodLabel . '</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Fecha de Pago</div>
                            <div class="info-value">' . ($voucher->payment_date ? $voucher->payment_date->format('d/m/Y') : '-') . '</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Monto de Cuota</div>
                            <div class="info-value">S/ ' . number_format($installment->amount, 2) . '</div>
                        </div>
                        ' . ($installment->late_fee > 0 ? '
                        <div class="info-row">
                            <div class="info-label">Mora</div>
                            <div class="info-value" style="color: #dc2626;">S/ ' . number_format($installment->late_fee, 2) . '</div>
                        </div>
                        ' : '') . '
                    </div>
                </div>
                
                <div class="amount-box">
                    <div class="amount-label">MONTO TOTAL PAGADO</div>
                    <div class="amount-value">S/ ' . number_format($voucher->declared_amount, 2) . '</div>
                    <div class="amount-words">(' . $this->numberToWords($voucher->declared_amount) . ')</div>
                </div>
                
                <div class="stamp">
                    <div class="stamp-box">
                        <div class="stamp-text">✓ PAGO VERIFICADO</div>
                        <div class="stamp-date">Verificado por: ' . $cashierName . '</div>
                        <div class="stamp-date">' . now()->format('d/m/Y H:i:s') . '</div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Este documento es un comprobante de pago válido emitido por el sistema de UNCED.</p>
                    <p>Fecha de emisión: ' . now()->format('d/m/Y H:i:s') . '</p>
                    <p style="margin-top: 10px;">Para consultas: info@unced.edu.pe | +51 999 999 999</p>
                </div>
            </div>
        </body>
        </html>';
    }

    /**
     * Get enrollment code
     */
    private function getEnrollmentCode($enrollment, Student $student): string
    {
        if (isset($enrollment->enrollment_code) && $enrollment->enrollment_code) {
            return $enrollment->enrollment_code;
        }
        
        $year = $enrollment->enrollment_date ? $enrollment->enrollment_date->format('Y') : date('Y');
        return 'MAT-' . $year . '-' . str_pad($enrollment->id, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get payment method label
     */
    private function getPaymentMethodLabel(string $method): string
    {
        $methods = [
            'card' => 'Tarjeta de Crédito/Débito',
            'transfer' => 'Transferencia Bancaria',
            'cash' => 'Efectivo',
            'yape' => 'Yape',
            'deposit' => 'Depósito Bancario',
        ];
        
        return $methods[$method] ?? ucfirst($method);
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
     * Convert amount to words in Spanish
     */
    private function numberToWords(float $amount): string
    {
        $intPart = (int) $amount;
        $decPart = (int) round(($amount - $intPart) * 100);
        
        $units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
        $teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
        $tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
        $hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
        
        $result = '';
        
        if ($intPart >= 1000) {
            $thousands = (int) ($intPart / 1000);
            if ($thousands == 1) {
                $result .= 'mil ';
            } else {
                $result .= $this->convertHundreds($thousands, $units, $teens, $tens, $hundreds) . ' mil ';
            }
            $intPart = $intPart % 1000;
        }
        
        if ($intPart > 0) {
            $result .= $this->convertHundreds($intPart, $units, $teens, $tens, $hundreds);
        }
        
        $result = trim($result);
        
        if ($result === '') {
            $result = 'cero';
        }
        
        $result .= ' con ' . str_pad($decPart, 2, '0', STR_PAD_LEFT) . '/100 soles';
        
        return strtoupper($result);
    }
    
    private function convertHundreds(int $number, array $units, array $teens, array $tens, array $hundreds): string
    {
        $result = '';
        
        if ($number >= 100) {
            if ($number == 100) {
                return 'cien';
            }
            $result .= $hundreds[(int) ($number / 100)] . ' ';
            $number = $number % 100;
        }
        
        if ($number >= 10 && $number <= 19) {
            return trim($result . $teens[$number - 10]);
        }
        
        if ($number >= 20) {
            $ten = (int) ($number / 10);
            $unit = $number % 10;
            if ($unit == 0) {
                return trim($result . $tens[$ten]);
            }
            if ($ten == 2) {
                return trim($result . 'veinti' . $units[$unit]);
            }
            return trim($result . $tens[$ten] . ' y ' . $units[$unit]);
        }
        
        if ($number > 0) {
            return trim($result . $units[$number]);
        }
        
        return trim($result);
    }
}
