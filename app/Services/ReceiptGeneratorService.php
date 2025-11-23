<?php

namespace App\Services;

use App\Models\InstallmentVoucher;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ReceiptGeneratorService
{
    public function generate(InstallmentVoucher $voucher)
    {
        $installment = $voucher->installment;
        $enrollment = $installment->enrollment;
        $student = $enrollment->student;
        $user = $student->user;
        $paymentPlan = $enrollment->paymentPlan;

        // Obtener plantilla
        $template = Setting::where('key', 'payment_receipt_template')->value('content');

        if (!$template) {
            // Plantilla por defecto si no existe
            $template = '
                <h1>Comprobante de Pago</h1>
                <p>Estudiante: {{nombre_estudiante}}</p>
                <p>Monto: {{monto_pagado}}</p>
                <p>Fecha: {{fecha_pago}}</p>
                <p>Concepto: {{concepto}}</p>
            ';
        }

        // Cálculos para SUNAT
        $total = $voucher->verified_amount ?? $voucher->declared_amount;
        $op_gravada = $total / 1.18;
        $igv = $total - $op_gravada;

        // Preparar variables
        $variables = [
            // Datos del comprobante
            '{{fecha_emision}}' => now()->format('d/m/Y'),
            '{{numero_comprobante}}' => 'B001-' . str_pad($voucher->id, 8, '0', STR_PAD_LEFT),
            '{{fecha_autorizacion}}' => now()->format('d/m/Y H:i:s'),
            '{{hash_comprobante}}' => strtoupper(substr(md5($voucher->id . $voucher->created_at), 0, 24)),
            
            // Datos del cliente
            '{{nombre_estudiante}}' => $user->name,
            '{{tipo_documento}}' => strtoupper($student->document_type ?? 'DNI'),
            '{{documento_estudiante}}' => $student->document_number ?? 'N/A',
            '{{numero_documento}}' => $student->document_number ?? 'N/A',
            '{{direccion_cliente}}' => $student->guardian_address ?? 'Dirección no registrada',
            
            // Detalles del servicio
            '{{descripcion_servicio}}' => "Pago de Cuota #{$installment->installment_number} - " . ($paymentPlan->name ?? 'Plan Regular'),
            '{{concepto}}' => "Pago de Cuota #{$installment->installment_number}", // Mantener compatibilidad
            '{{precio_unitario}}' => number_format($op_gravada, 2),
            '{{valor_venta}}' => number_format($op_gravada, 2),
            
            // Información de pago
            '{{metodo_pago}}' => $this->formatPaymentMethod($voucher->payment_method),
            '{{codigo_operacion}}' => $voucher->transaction_reference ?? 'N/A',
            '{{fecha_pago}}' => $voucher->payment_date->format('d/m/Y H:i:s'),
            '{{monto_pagado}}' => number_format($total, 2), // Mantener compatibilidad
            
            // Totales
            '{{op_gravada}}' => number_format($op_gravada, 2),
            '{{igv}}' => number_format($igv, 2),
            '{{importe_total}}' => number_format($total, 2),
            
            // Otros
            '{{cajero}}' => auth()->user()->name ?? 'Sistema',
            '{{numero_cuota}}' => $installment->installment_number,
        ];

        // Reemplazar variables
        $content = str_replace(array_keys($variables), array_values($variables), $template);

        // Generar PDF con opciones para imágenes remotas
        $pdf = Pdf::loadHTML($content);
        $pdf->setOptions(['isRemoteEnabled' => true]);
        
        // Definir ruta
        $filename = 'receipt_' . $voucher->id . '_' . Str::random(10) . '.pdf';
        $path = 'receipts/' . $student->id . '/' . $filename;

        // Guardar PDF
        Storage::disk('public')->put($path, $pdf->output());

        return $path;
    }

    /**
     * Formatear método de pago para mostrar en el PDF
     */
    private function formatPaymentMethod(?string $method): string
    {
        if (!$method) {
            return 'N/A';
        }

        $methods = [
            'cash' => 'Efectivo',
            'credit_card' => 'Tarjeta de Crédito',
            'debit_card' => 'Tarjeta de Débito',
            'transfer' => 'Transferencia Bancaria',
            'yape' => 'Yape',
            'plin' => 'Plin',
        ];

        return $methods[$method] ?? ucfirst($method);
    }
}
