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

        // 🔥 OPTIMIZACIÓN: Solo convertir imágenes si hay URLs HTTP en el HTML
        if (preg_match('/src=["\']https?:\/\//i', $contractHTML)) {
            \Illuminate\Support\Facades\Log::info('Convirtiendo imágenes a base64 para DomPDF', [
                'student_id' => $student->id,
            ]);
            $contractHTML = $this->convertImagesToBase64($contractHTML);
        }

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
            
            \Illuminate\Support\Facades\Log::info('Procesando firma del estudiante', [
                'signature_path' => $signaturePath,
                'full_path' => $fullPath,
                'exists' => file_exists($fullPath),
            ]);
            
            if (file_exists($fullPath)) {
                $imageData = file_get_contents($fullPath);
                $mimeType = mime_content_type($fullPath);
                
                // Validar que sea una imagen válida
                if (strpos($mimeType, 'image/') !== 0) {
                    \Illuminate\Support\Facades\Log::warning('Archivo de firma no es imagen válida', [
                        'mime_type' => $mimeType,
                    ]);
                } else {
                    $base64Image = 'data:' . $mimeType . ';base64,' . base64_encode($imageData);
                    $firmaEstudiante = '<img src="' . $base64Image . '" style="max-height: 60px; max-width: 200px; display: block; margin: 0 auto;" alt="Firma del estudiante" />';
                    
                    \Illuminate\Support\Facades\Log::info('Firma convertida a base64', [
                        'size_bytes' => strlen($imageData),
                        'mime_type' => $mimeType,
                        'base64_length' => strlen($base64Image),
                    ]);
                }
            } else {
                \Illuminate\Support\Facades\Log::error('Archivo de firma no encontrado', [
                    'full_path' => $fullPath,
                ]);
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
        // Buscar todas las etiquetas <img> con src
        $pattern = '/<img([^>]*)src=["\']([^"\']+)["\']/i';
        
        $html = preg_replace_callback($pattern, function($matches) {
            $fullTag = $matches[0];
            $imageUrl = $matches[2];
            
            \Illuminate\Support\Facades\Log::info('Procesando imagen en contrato', [
                'url' => $imageUrl,
                'full_tag' => $fullTag,
            ]);
            
            try {
                // 🔥 CASO 1: Imágenes con URL completa del storage (http://localhost:8000/storage/...)
                $appUrl = rtrim(config('app.url'), '/');
                
                // Extraer dominio base sin puerto para comparación flexible
                $urlParts = parse_url($appUrl);
                $baseUrl = $urlParts['scheme'] . '://' . $urlParts['host'];
                
                // Detectar URLs que empiecen con el dominio (con o sin puerto) + /storage/
                if (preg_match('#^' . preg_quote($baseUrl, '#') . '(:\d+)?/storage/(.+)$#', $imageUrl, $matches)) {
                    $relativePath = $matches[2]; // La parte después de /storage/
                    $fullPath = Storage::disk('public')->path($relativePath);
                    
                    \Illuminate\Support\Facades\Log::info('Imagen local detectada (URL completa)', [
                        'relative_path' => $relativePath,
                        'full_path' => $fullPath,
                        'exists' => file_exists($fullPath),
                    ]);
                    
                    if (file_exists($fullPath)) {
                        $imageData = file_get_contents($fullPath);
                        $mimeType = mime_content_type($fullPath);
                        $base64 = base64_encode($imageData);
                        $dataUri = 'data:' . $mimeType . ';base64,' . $base64;
                        
                        \Illuminate\Support\Facades\Log::info('Imagen convertida a base64', [
                            'size' => strlen($imageData),
                            'mime' => $mimeType,
                        ]);
                        
                        return str_replace($imageUrl, $dataUri, $fullTag);
                    }
                }
                
                // 🔥 CASO 2: Imágenes del dominio local (http://localhost:8000/logo.png) - archivos públicos
                // Detectar URLs del dominio sin /storage/ (archivos en public/)
                if (preg_match('#^' . preg_quote($baseUrl, '#') . '(:\d+)?/([^/]+\.(png|jpg|jpeg|gif|svg|webp))$#i', $imageUrl, $matches)) {
                    $fileName = $matches[2]; // nombre del archivo (ej: logo.png)
                    $publicPath = public_path($fileName);
                    
                    \Illuminate\Support\Facades\Log::info('Imagen pública local detectada', [
                        'file_name' => $fileName,
                        'public_path' => $publicPath,
                        'exists' => file_exists($publicPath),
                    ]);
                    
                    if (file_exists($publicPath)) {
                        $imageData = file_get_contents($publicPath);
                        $mimeType = mime_content_type($publicPath);
                        $base64 = base64_encode($imageData);
                        $dataUri = 'data:' . $mimeType . ';base64,' . $base64;
                        
                        \Illuminate\Support\Facades\Log::info('Imagen pública convertida a base64', [
                            'size' => strlen($imageData),
                            'mime' => $mimeType,
                        ]);
                        
                        return str_replace($imageUrl, $dataUri, $fullTag);
                    }
                }
                
                // 🔥 CASO 3: Imágenes con ruta relativa (/storage/...)
                if (str_starts_with($imageUrl, '/storage/')) {
                    $relativePath = str_replace('/storage/', '', $imageUrl);
                    $fullPath = Storage::disk('public')->path($relativePath);
                    
                    \Illuminate\Support\Facades\Log::info('Imagen local detectada (ruta relativa)', [
                        'relative_path' => $relativePath,
                        'full_path' => $fullPath,
                        'exists' => file_exists($fullPath),
                    ]);
                    
                    if (file_exists($fullPath)) {
                        $imageData = file_get_contents($fullPath);
                        $mimeType = mime_content_type($fullPath);
                        $base64 = base64_encode($imageData);
                        $dataUri = 'data:' . $mimeType . ';base64,' . $base64;
                        
                        \Illuminate\Support\Facades\Log::info('Imagen convertida a base64', [
                            'size' => strlen($imageData),
                            'mime' => $mimeType,
                        ]);
                        
                        return str_replace($imageUrl, $dataUri, $fullTag);
                    }
                }
                
                // 🔥 CASO 4: URLs HTTP/HTTPS externas - Intentar descargar con timeout corto
                if (str_starts_with($imageUrl, 'http://') || str_starts_with($imageUrl, 'https://')) {
                    \Illuminate\Support\Facades\Log::info('Imagen externa detectada, intentando descargar', [
                        'url' => $imageUrl,
                    ]);
                    
                    $context = stream_context_create([
                        'http' => [
                            'timeout' => 3, // 3 segundos máximo
                            'ignore_errors' => true,
                        ],
                        'ssl' => [
                            'verify_peer' => false,
                            'verify_peer_name' => false,
                        ]
                    ]);
                    
                    $imageData = @file_get_contents($imageUrl, false, $context);
                    
                    if ($imageData !== false && strlen($imageData) > 0) {
                        $finfo = new \finfo(FILEINFO_MIME_TYPE);
                        $mimeType = $finfo->buffer($imageData) ?: 'image/png';
                        $base64 = base64_encode($imageData);
                        $dataUri = 'data:' . $mimeType . ';base64,' . $base64;
                        
                        \Illuminate\Support\Facades\Log::info('Imagen externa descargada y convertida', [
                            'size' => strlen($imageData),
                            'mime' => $mimeType,
                        ]);
                        
                        return str_replace($imageUrl, $dataUri, $fullTag);
                    } else {
                        \Illuminate\Support\Facades\Log::warning('No se pudo descargar imagen externa', [
                            'url' => $imageUrl,
                        ]);
                    }
                }
                
                // Si no se pudo procesar, devolver original
                \Illuminate\Support\Facades\Log::warning('Imagen no procesada, devolviendo original', [
                    'url' => $imageUrl,
                ]);
                return $fullTag;
                
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Error al convertir imagen a base64', [
                    'url' => $imageUrl,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return $fullTag;
            }
        }, $html);
        
        return $html;
    }
}
