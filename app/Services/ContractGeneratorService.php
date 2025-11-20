<?php

namespace App\Services;

use App\Models\Student;
use App\Models\Setting;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;

class ContractGeneratorService
{
    /**
     * Generar contrato PDF desde template para un estudiante
     * Retorna la ruta del PDF generado
     */
    public function generateContractPDF(Student $student, ?string $signaturePath = null): ?string
    {
        // Obtener template del contrato desde settings
        $template = Setting::where('type', 'general')
            ->where('key', 'contract_template')
            ->first();

        if (!$template || !$template->content) {
            return null;
        }

        $contractHTML = $template->content;

        // Preparar los datos del estudiante
        $variables = $this->prepareVariables($student, $signaturePath);

        // Reemplazar variables en el template
        foreach ($variables as $key => $value) {
            $contractHTML = str_replace("{{" . $key . "}}", $value, $contractHTML);
        }

        // 🔥 NUEVO: Convertir URLs de imágenes a base64 para DomPDF
        $contractHTML = $this->convertImagesToBase64($contractHTML);

        // Generar PDF
        $pdf = Pdf::loadHTML($contractHTML);
        $pdf->setPaper('A4', 'portrait');

        // Nombre del archivo PDF
        $fileName = 'contract_' . $student->id . '_' . time() . '.pdf';
        $filePath = 'contracts/' . $fileName;

        // Guardar PDF en storage
        Storage::disk('public')->put($filePath, $pdf->output());

        return $filePath;
    }

    /**
     * Generar solo HTML del contrato (para preview)
     */
    public function generateContractHTML(Student $student, ?string $signaturePath = null): ?string
    {
        // Obtener template del contrato desde settings
        $template = Setting::where('type', 'general')
            ->where('key', 'contract_template')
            ->first();

        if (!$template || !$template->content) {
            return null;
        }

        $contractContent = $template->content;

        // Preparar los datos del estudiante
        $variables = $this->prepareVariables($student, $signaturePath);

        // Reemplazar variables en el template
        foreach ($variables as $key => $value) {
            $contractContent = str_replace("{{" . $key . "}}", $value, $contractContent);
        }

        return $contractContent;
    }

    /**
     * Preparar variables para reemplazo en el template
     */
    private function prepareVariables(Student $student, ?string $signaturePath = null): array
    {
        // Generar contraseña temporal
        $temporaryPassword = Str::random(10);
        
        // Guardar contraseña temporal en el estudiante si no tiene usuario
        if ($student->user) {
            // El usuario ya existe, no generar nueva contraseña
            $temporaryPassword = '[Usa tu contraseña actual]';
        }

        // Firma del estudiante - Si existe, convertir a base64 para DomPDF
        $firmaEstudiante = '';
        if ($signaturePath) {
            // DomPDF necesita base64 o ruta física del archivo
            $fullPath = Storage::disk('public')->path($signaturePath);
            if (file_exists($fullPath)) {
                $imageData = base64_encode(file_get_contents($fullPath));
                $mimeType = mime_content_type($fullPath);
                $base64Image = 'data:' . $mimeType . ';base64,' . $imageData;
                $firmaEstudiante = '<img src="' . $base64Image . '" style="max-height: 60px; max-width: 200px; display: block; margin: 0 auto;" alt="Firma del estudiante" />';
            }
        }

        return [
            'nombre_estudiante' => $student->first_name . ' ' . $student->paternal_last_name . ' ' . ($student->maternal_last_name ?? ''),
            'documento_estudiante' => $student->document_number ?? 'N/A',
            'email_estudiante' => $student->user->email ?? 'N/A',
            'telefono_estudiante' => $student->phone_number ?? 'N/A',
            'nivel_academico' => $student->academicLevel->name ?? 'N/A',
            'plan_pago' => $student->paymentPlan->name ?? 'N/A',
            'monto_total' => $student->paymentPlan ? 'S/ ' . number_format($student->paymentPlan->total_amount, 2) : 'N/A',
            'fecha_matricula' => $student->enrollment_date ? date('d/m/Y', strtotime($student->enrollment_date)) : 'N/A',
            'codigo_matricula' => $student->enrollment_code ?? 'N/A',
            'usuario' => $student->user->email ?? 'N/A',
            'contrasena' => $temporaryPassword,
            'nombre_apoderado' => $student->guardian_name ?? 'N/A',
            'documento_apoderado' => $student->guardian_document_number ?? 'N/A',
            'fecha_actual' => date('d/m/Y'),
            'firma_estudiante' => $firmaEstudiante,
        ];
    }

    /**
     * Obtener variables disponibles para el template
     */
    public static function getAvailableVariables(): array
    {
        return [
            'nombre_estudiante' => 'Nombre completo del estudiante',
            'documento_estudiante' => 'Número de documento del estudiante',
            'email_estudiante' => 'Correo electrónico del estudiante',
            'telefono_estudiante' => 'Teléfono del estudiante',
            'nivel_academico' => 'Nivel académico asignado',
            'plan_pago' => 'Nombre del plan de pago',
            'monto_total' => 'Monto total del plan',
            'fecha_matricula' => 'Fecha de matrícula',
            'codigo_matricula' => 'Código de matrícula',
            'usuario' => 'Usuario para login (email)',
            'contrasena' => 'Contraseña generada',
            'nombre_apoderado' => 'Nombre del apoderado',
            'documento_apoderado' => 'Documento del apoderado',
            'fecha_actual' => 'Fecha actual',
            'firma_estudiante' => 'Imagen de firma del estudiante (se muestra si existe)',
        ];
    }

    /**
     * Convertir URLs de imágenes a base64 para DomPDF
     * Esto se hace SOLO al generar PDF, no en el template guardado
     */
    private function convertImagesToBase64(string $html): string
    {
        // Buscar todas las etiquetas <img> con src que sean URLs (http:// o https://)
        $pattern = '/<img([^>]*)src=["\']https?:\/\/[^"\']+["\']([^>]*)>/i';
        
        $html = preg_replace_callback($pattern, function($matches) {
            $fullTag = $matches[0];
            
            // Extraer la URL
            preg_match('/src=["\']([^"\']+)["\']/i', $fullTag, $srcMatch);
            if (empty($srcMatch[1])) {
                return $fullTag; // No se pudo extraer URL, devolver original
            }
            
            $imageUrl = $srcMatch[1];
            
            try {
                // Intentar descargar la imagen
                $imageData = @file_get_contents($imageUrl);
                
                if ($imageData === false) {
                    // Si falla, intentar con curl
                    $ch = curl_init($imageUrl);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    $imageData = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    
                    if ($httpCode !== 200 || $imageData === false) {
                        return $fullTag; // Fallo, devolver original
                    }
                }
                
                // Convertir a base64
                $base64 = base64_encode($imageData);
                
                // Detectar tipo MIME (default a image/png)
                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $mimeType = $finfo->buffer($imageData) ?: 'image/png';
                
                // Crear data URI
                $dataUri = 'data:' . $mimeType . ';base64,' . $base64;
                
                // Reemplazar URL con data URI
                return str_replace($imageUrl, $dataUri, $fullTag);
                
            } catch (\Exception $e) {
                // En caso de error, devolver tag original
                return $fullTag;
            }
        }, $html);
        
        return $html;
    }
}
