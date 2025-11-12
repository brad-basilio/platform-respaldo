import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FileText, Download, Upload, CheckCircle, AlertTriangle, Clock, User, XCircle } from 'lucide-react';

interface PendingDocument {
  id: number;
  document_type: string;
  document_name: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_url: string;
  uploaded_by: {
    name: string;
    email: string;
  };
  uploaded_at: string;
}

interface DocumentConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onDocumentsConfirmed?: () => void;
}

const DocumentConfirmationModal: React.FC<DocumentConfirmationModalProps> = ({ open, onClose, onDocumentsConfirmed }) => {
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingIds, setConfirmingIds] = useState<number[]>([]);
  const [signedFiles, setSignedFiles] = useState<{ [key: number]: File | null }>({});
  const [supportEmail, setSupportEmail] = useState('soporte@example.com');

  useEffect(() => {
    if (open) {
      fetchPendingDocuments();
      fetchSupportEmail();
    }
  }, [open]);

  const fetchSupportEmail = async () => {
    try {
      const response = await axios.get('/api/settings/support_email');
      if (response.data.content) {
        setSupportEmail(response.data.content);
      }
    } catch (error) {
      console.error('Error fetching support email:', error);
      // Mantener el email por defecto
    }
  };

  const fetchPendingDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/student/pending-documents');
      setPendingDocuments(response.data.pending_documents);
    } catch (error: any) {
      console.error('Error fetching pending documents:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudieron cargar los documentos pendientes.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (documentId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSignedFiles((prev) => ({ ...prev, [documentId]: file }));
    }
  };

  const handleConfirmDocument = async (document: PendingDocument) => {
    try {
      setConfirmingIds((prev) => [...prev, document.id]);

      const formData = new FormData();
      const signedFile = signedFiles[document.id];
      if (signedFile) {
        formData.append('signed_file', signedFile);
      }

      const response = await axios.post(`/api/student/documents/${document.id}/confirm`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const isLastDocument = pendingDocuments.length === 1;
      const enrollmentVerified = response.data.enrollment_verified;

      if (isLastDocument && enrollmentVerified) {
        // ✅ Todos los documentos confirmados - Matrícula verificada
        Swal.fire({
          icon: 'success',
          title: '🎉 ¡Matrícula Verificada!',
          html: `
            <p class="text-lg font-semibold mb-2">Has confirmado todos los documentos exitosamente</p>
            <p class="text-sm text-gray-600">Tu matrícula ha sido verificada y ya puedes acceder a todas las funcionalidades de la plataforma.</p>
          `,
          confirmButtonColor: '#10b981',
          confirmButtonText: '¡Entendido!',
        });
      } else {
        // Documento individual confirmado
        Swal.fire({
          icon: 'success',
          title: '✓ Documento Confirmado',
          html: signedFile
            ? '<p>Tu documento firmado ha sido cargado exitosamente.</p>'
            : '<p>El documento ha sido confirmado.</p>' +
              (response.data.pending_documents > 0 
                ? `<p class="text-sm text-orange-600 mt-2">⏳ Te quedan ${response.data.pending_documents} documento(s) por confirmar</p>`
                : ''),
          timer: 2000,
          showConfirmButton: false,
        });
      }

      // Remove document from pending list
      setPendingDocuments((prev) => prev.filter((doc) => doc.id !== document.id));
      setSignedFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[document.id];
        return newFiles;
      });

      // If no more pending documents, close modal and notify
      if (isLastDocument) {
        setTimeout(() => {
          onDocumentsConfirmed?.();
          onClose();
        }, 2500);
      }
    } catch (error: any) {
      console.error('Error confirming document:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo confirmar el documento.',
      });
    } finally {
      setConfirmingIds((prev) => prev.filter((id) => id !== document.id));
    }
  };

  const handleDownload = (document: PendingDocument) => {
    window.open(document.file_url, '_blank');
  };

  const getDocumentTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      contract: 'Contrato',
      regulation: 'Reglamento',
      terms: 'Términos y Condiciones',
      other: 'Otro',
    };
    return types[type] || type;
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Mejorado */}
        <div className="bg-gradient-to-r from-[#073372] via-[#0d4a8f] to-[#17BC91] px-8 py-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <FileText className="h-6 w-6" />
                  </div>
                  Documentos Pendientes de Firma
                </h2>
                <p className="text-white/90 text-sm mt-2 ml-14 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Debes confirmar y firmar los siguientes documentos para continuar
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#17BC91] border-t-transparent absolute top-0"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Cargando documentos...</p>
            </div>
          ) : pendingDocuments.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-6">
                <div className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-2xl">
                  <CheckCircle className="h-16 w-16 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Todo Listo!</h3>
              <p className="text-gray-600">No tienes documentos pendientes de confirmar.</p>
              <p className="text-sm text-gray-500 mt-2">Ya puedes acceder a todas las funcionalidades de la plataforma</p>
            </div>
          ) : (
            <>
              {/* Warning Banner Mejorado */}
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-l-4 border-orange-500 rounded-xl p-6 mb-8 shadow-sm">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                      ⚠️ Acción Requerida
                      <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                        {pendingDocuments.length} Pendiente{pendingDocuments.length > 1 ? 's' : ''}
                      </span>
                    </p>
                    <p className="text-sm text-orange-800 leading-relaxed">
                      Descarga cada documento, fírmalo y súbelo nuevamente. No podrás acceder a todas las funcionalidades hasta completar este proceso.
                    </p>
                  </div>
                </div>
              </div>

              {/* Documents Grid */}
              <div className="space-y-6">
                {pendingDocuments.map((document) => {
                  const isConfirming = confirmingIds.includes(document.id);
                  const hasSignedFile = signedFiles[document.id];

                  return (
                    <div
                      key={document.id}
                      className="group border-2 border-gray-200 rounded-2xl p-6 bg-gradient-to-br from-white to-gray-50 hover:border-[#17BC91] hover:shadow-xl transition-all duration-300"
                    >
                      {/* Document Header */}
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                              <FileText className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#073372] transition-colors">
                                {document.document_name}
                              </h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                                  {getDocumentTypeLabel(document.document_type)}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {new Date(document.uploaded_at).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {document.description && (
                            <div className="bg-blue-50 border-l-2 border-blue-400 rounded-r-lg p-3 mb-3">
                              <p className="text-sm text-gray-700 leading-relaxed">{document.description}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-lg px-3 py-2 w-fit">
                            <User className="h-3 w-3" />
                            <span>Subido por:</span>
                            <span className="font-semibold text-gray-900">{document.uploaded_by.name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Download Button */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold">1</span>
                            Descarga el Documento Original
                          </label>
                          <button
                            onClick={() => handleDownload(document)}
                            className="group/btn w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#073372] to-[#0d4a8f] hover:from-[#0d4a8f] hover:to-[#073372] text-white px-4 py-3.5 rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                          >
                            <Download className="w-5 h-5 group-hover/btn:animate-bounce" />
                            Descargar {document.file_name}
                          </button>
                          <p className="text-xs text-gray-500 text-center">Formato PDF • Click para abrir</p>
                        </div>

                        {/* Upload Button */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-[#17BC91] text-white rounded-full text-xs font-bold">2</span>
                            Sube el Documento Firmado
                          </label>
                          <div className="relative">
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) => handleFileSelect(document.id, e)}
                              className="hidden"
                              id={`file-input-${document.id}`}
                            />
                            <label
                              htmlFor={`file-input-${document.id}`}
                              className={`group/btn w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-medium cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                                hasSignedFile
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500 text-white'
                                  : 'bg-gradient-to-r from-[#17BC91] to-[#14a87d] hover:from-[#14a87d] hover:to-[#17BC91] text-white'
                              }`}
                            >
                              <Upload className="w-5 h-5 group-hover/btn:animate-bounce" />
                              {hasSignedFile ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
                            </label>
                          </div>
                          {hasSignedFile ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                              <p className="text-xs text-green-700 font-semibold flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                {hasSignedFile.name}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                Tamaño: {(hasSignedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 text-center">PDF, PNG o JPG • Max 10MB</p>
                          )}
                        </div>
                      </div>

                      {/* Confirm Button */}
                      <button
                        onClick={() => handleConfirmDocument(document)}
                        disabled={isConfirming}
                        className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg ${
                          isConfirming
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#073372] via-[#0d4a8f] to-[#17BC91] hover:from-[#0d4a8f] hover:via-[#073372] hover:to-[#14a87d] text-white hover:shadow-xl transform hover:-translate-y-0.5'
                        }`}
                      >
                        {isConfirming ? (
                          <>
                            <div className="relative">
                              <div className="animate-spin rounded-full h-6 w-6 border-3 border-gray-400 border-t-transparent"></div>
                            </div>
                            <span>Confirmando documento...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-6 w-6" />
                            <span>
                              Confirmar Documento
                              {hasSignedFile && ' y Subir Archivo Firmado'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Mejorado */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-5 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-center">
              <span className="font-semibold text-gray-900">¿Necesitas ayuda?</span> Contacta a tu asesor o escribe a{' '}
              <a href={`mailto:${supportEmail}`} className="text-[#17BC91] hover:text-[#14a87d] font-semibold hover:underline">
                {supportEmail}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentConfirmationModal;
