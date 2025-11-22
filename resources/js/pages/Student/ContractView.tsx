import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { RiFileTextLine, RiCheckboxCircleLine, RiAlertLine } from 'react-icons/ri';

interface ContractViewProps {
    contract: {
        id: number;
        pdf_url: string | null;
        accepted: boolean;
        accepted_at: string | null;
        token: string;
    };
    student: {
        name: string;
        email: string;
        academic_level: string;
        payment_plan: string;
    };
}

const ContractView: React.FC<ContractViewProps> = ({ contract, student }) => {
    const [acceptChecked, setAcceptChecked] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

    const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validar que sea imagen
            if (!file.type.startsWith('image/')) {
                toast.error('Archivo inválido', {
                    description: 'Por favor, sube solo archivos de imagen (JPG, PNG, etc.)',
                    duration: 4000,
                });
                return;
            }

            // Validar tamaño (máximo 2MB)
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Archivo muy grande', {
                    description: 'La imagen no debe superar los 2MB',
                    duration: 4000,
                });
                return;
            }

            setSignatureFile(file);

            // Crear preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setSignaturePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAcceptContract = async () => {
        if (!acceptChecked) {
            toast.error('Debes aceptar los términos', {
                description: 'Por favor, marca el checkbox para confirmar que aceptas el contrato',
                duration: 4000,
            });
            return;
        }

        setIsAccepting(true);

        try {
            const formData = new FormData();
            if (signatureFile) {
                formData.append('signature', signatureFile);
            }

            await axios.post(`/contract/accept/${contract.token}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            toast.success('¡Contrato aceptado exitosamente!', {
                description: 'Tu matrícula ha sido confirmada. Recibirás un correo con el contrato.',
                duration: 5000,
            });

            // Redirigir al dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);

        } catch (error: any) {
            console.error('Error al firmar contrato:', error);

            const errorMessage = error.response?.data?.message || 'No se pudo procesar tu solicitud';

            toast.error('Error al aceptar contrato', {
                description: errorMessage,
                duration: 5000,
            });
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden">
                        <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                    <RiFileTextLine className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white">Contrato de Matrícula</h1>
                                    <p className="text-blue-100 mt-1">Plataforma de Inglés</p>
                                </div>
                            </div>
                        </div>

                        {/* Student Info */}
                        <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Estudiante</p>
                                    <p className="text-lg font-semibold text-gray-900">{student.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Correo Electrónico</p>
                                    <p className="text-lg font-semibold text-gray-900">{student.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Nivel Académico</p>
                                    <p className="text-lg font-semibold text-gray-900">{student.academic_level}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Plan de Pago</p>
                                    <p className="text-lg font-semibold text-gray-900">{student.payment_plan}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contract Already Accepted Alert */}
                    {contract.accepted && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6 flex items-start gap-4">
                            <RiCheckboxCircleLine className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-lg font-bold text-green-900 mb-1">
                                    Contrato Aceptado
                                </h3>
                                <p className="text-green-700">
                                    Ya has aceptado este contrato el{' '}
                                    {contract.accepted_at && new Date(contract.accepted_at).toLocaleString('es-PE', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Contract PDF Download Section */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#073372] to-[#17BC91] rounded-full mb-4">
                                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                Contrato de Matrícula (PDF)
                            </h3>
                            <p className="text-gray-600 mb-6">
                                El contrato fue enviado a tu correo electrónico adjunto como PDF
                            </p>

                            {contract.pdf_url && (
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <a
                                        href={contract.pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#073372] to-[#17BC91] hover:shadow-lg text-white rounded-lg font-semibold transition-all duration-200"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Ver PDF en el Navegador
                                    </a>
                                    <a
                                        href={contract.pdf_url}
                                        download="Contrato_Matricula.pdf"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#073372] text-[#073372] hover:bg-[#073372]/5 rounded-lg font-semibold transition-all duration-200"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Descargar PDF
                                    </a>
                                </div>
                            )}

                            <div className="mt-6 bg-blue-50 border-l-4 border-[#073372] rounded-lg p-4 text-left">
                                <p className="text-sm text-gray-700">
                                    <strong>📧 Revisa tu correo:</strong> El contrato también fue enviado como adjunto a <strong>{student.email}</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Acceptance Section */}
                    {!contract.accepted && (
                        <div className="bg-white rounded-2xl shadow-lg p-8">
                            {/* Info Alert */}
                            <div className="bg-blue-50 border-l-4 border-[#073372] rounded-lg p-4 mb-6 flex items-start gap-3">
                                <RiAlertLine className="w-6 h-6 text-[#073372] flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-700">
                                        <strong>Importante:</strong> Asegúrate de haber leído completamente el contrato PDF antes de aceptar.
                                        Al aceptar, confirmas que estás de acuerdo con todos los términos y condiciones.
                                    </p>
                                </div>
                            </div>

                            {/* Checkbox */}
                            <div className="flex items-start gap-3 mb-6">
                                <input
                                    type="checkbox"
                                    id="accept-contract"
                                    checked={acceptChecked}
                                    onChange={(e) => setAcceptChecked(e.target.checked)}
                                    className="mt-1 w-5 h-5 text-[#17BC91] border-gray-300 rounded focus:ring-[#17BC91] cursor-pointer"
                                />
                                <label htmlFor="accept-contract" className="cursor-pointer select-none">
                                    <span className="text-gray-900 font-medium">
                                        Confirmo que he leído el contrato PDF adjunto y acepto todos los términos y condiciones
                                    </span>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Al marcar esta casilla y hacer clic en "Firmar Contrato", confirmas que has revisado el documento PDF
                                        completo y aceptas todos sus términos de manera consciente y voluntaria.
                                    </p>
                                </label>
                            </div>

                            {/* Signature Upload Section */}
                            <div className="border-2 border-dashed border-[#073372]/30 rounded-xl p-6 mb-6 bg-gradient-to-br from-blue-50/50 to-green-50/50">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-gradient-to-r from-[#073372] to-[#17BC91] rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 mb-2">Firma Digital (Opcional)</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Si deseas, puedes subir una imagen de tu firma. <strong>No es obligatorio</strong>; al marcar la casilla de aceptación arriba, tu consentimiento es igualmente válido.
                                        </p>

                                        <div className="space-y-3">
                                            {!signaturePreview ? (
                                                <label className="block cursor-pointer">
                                                    <div className="border-2 border-[#073372] border-dashed rounded-lg p-4 text-center hover:bg-[#073372]/5 transition-colors">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleSignatureChange}
                                                            className="hidden"
                                                        />
                                                        <svg className="w-10 h-10 mx-auto mb-2 text-[#073372]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        <p className="text-sm font-semibold text-[#073372]">Haz clic para subir tu firma</p>
                                                        <p className="text-xs text-gray-500 mt-1">JPG, PNG (máx. 2MB)</p>
                                                    </div>
                                                </label>
                                            ) : (
                                                <div className="bg-white border-2 border-[#17BC91] rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-sm font-semibold text-green-700 flex items-center gap-2">
                                                            <RiCheckboxCircleLine className="w-5 h-5" />
                                                            Firma cargada correctamente
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setSignatureFile(null);
                                                                setSignaturePreview(null);
                                                            }}
                                                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                                                        >
                                                            Cambiar
                                                        </button>
                                                    </div>
                                                    <div className="bg-white border border-gray-200 rounded p-4 flex justify-center">
                                                        <img
                                                            src={signaturePreview}
                                                            alt="Vista previa de firma"
                                                            className="max-h-32 object-contain"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                            <p className="text-xs text-yellow-800">
                                                <strong>💡 Importante:</strong> La firma debe estar en <strong>fondo blanco</strong> y ser legible.
                                                Esta firma aparecerá en tu contrato oficial.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={handleAcceptContract}
                                    disabled={!acceptChecked || isAccepting}
                                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${acceptChecked && !isAccepting
                                        ? 'bg-gradient-to-r from-[#073372] to-[#17BC91] text-white hover:shadow-xl hover:scale-[1.02]'
                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    {isAccepting ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <RiCheckboxCircleLine className="w-6 h-6" />
                                            Firmar y Aceptar Contrato
                                        </>
                                    )}
                                </button>
                            </div>

                            <p className="text-xs text-gray-500 text-center mt-6">
                                Tu IP será registrada junto con la fecha y hora de aceptación para fines de verificación.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default ContractView;
