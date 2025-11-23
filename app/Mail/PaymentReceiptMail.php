<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public $voucher;
    public $receiptPath;
    public $emailContent;

    /**
     * Create a new message instance.
     */
    public function __construct($voucher, $receiptPath)
    {
        $this->voucher = $voucher;
        $this->receiptPath = $receiptPath;

        // Fetch email template from settings
        $template = \App\Models\Setting::where('key', 'payment_receipt_email')->value('content');

        if (!$template) {
            $template = '<h1>Pago Recibido</h1><p>Gracias por tu pago de S/ {{monto_pagado}}.</p>';
        }

        // Prepare variables
        $variables = [
            '{{nombre_estudiante}}' => $voucher->installment->enrollment->student->user->name,
            '{{monto_pagado}}' => number_format($voucher->verified_amount ?? $voucher->declared_amount, 2),
            '{{fecha_pago}}' => $voucher->payment_date->format('d/m/Y'),
            '{{numero_cuota}}' => $voucher->installment->installment_number,
            '{{codigo_operacion}}' => $voucher->transaction_reference ?? 'N/A',
            '{{metodo_pago}}' => ucfirst($voucher->payment_method),
            '{{url_plataforma}}' => config('app.url'),
            '{{concepto}}' => "Pago de Cuota #{$voucher->installment->installment_number}",
        ];

        // Replace variables
        $this->emailContent = str_replace(array_keys($variables), array_values($variables), $template);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Comprobante de Pago - ' . config('app.name'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.payment_receipt',
            with: ['content' => $this->emailContent],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [
            \Illuminate\Mail\Mailables\Attachment::fromStorageDisk('public', $this->receiptPath)
                ->as('Comprobante_Pago.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
