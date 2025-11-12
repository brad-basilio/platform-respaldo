import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

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

  useEffect(() => {
    if (open) {
      fetchPendingDocuments();
    }
  }, [open]);

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
    <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6">
          <h2 className="text-2xl font-bold text-white">📋 Documentos Pendientes de Firma</h2>
          <p className="text-white/90 text-sm mt-1">
            Debes confirmar y firmar los siguientes documentos para continuar
          </p>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#17BC91]"></div>
            </div>
          ) : pendingDocuments.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">¡Todo Listo!</h3>
              <p className="mt-2 text-sm text-gray-500">No tienes documentos pendientes de confirmar.</p>
            </div>
          ) : (
            <>
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded mb-6">
                <p className="text-sm text-orange-800">
                  <strong>⚠️ Acción Requerida:</strong> Tienes {pendingDocuments.length} documento(s) pendiente(s).
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Descarga cada documento, fírmalo y súbelo nuevamente. No podrás acceder a todas las funcionalidades hasta completar este proceso.
                </p>
              </div>

              <div className="space-y-6">
                {pendingDocuments.map((document) => {
                  const isConfirming = confirmingIds.includes(document.id);
                  const hasSignedFile = signedFiles[document.id];

                  return (
                    <div
                      key={document.id}
                      className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50 hover:border-[#17BC91] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                              {getDocumentTypeLabel(document.document_type)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Subido el {new Date(document.uploaded_at).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">{document.document_name}</h3>
                          {document.description && (
                            <p className="mt-2 text-sm text-gray-600">{document.description}</p>
                          )}
                          <p className="mt-2 text-xs text-gray-500">
                            Subido por: <span className="font-medium">{document.uploaded_by.name}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            1️⃣ Descarga el Documento Original
                          </label>
                          <button
                            onClick={() => handleDownload(document)}
                            className="w-full flex items-center justify-center gap-2 bg-[#073372] hover:bg-[#073372]/90 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Descargar {document.file_name}
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            2️⃣ Sube el Documento Firmado
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
                              className="w-full flex items-center justify-center gap-2 bg-[#17BC91] hover:bg-[#17BC91]/90 text-white px-4 py-3 rounded-lg font-medium cursor-pointer transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                              </svg>
                              {hasSignedFile ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
                            </label>
                          </div>
                          {hasSignedFile && (
                            <p className="mt-2 text-xs text-green-600 font-medium">
                              ✓ {hasSignedFile.name} ({(hasSignedFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleConfirmDocument(document)}
                        disabled={isConfirming}
                        className="mt-4 w-full bg-gradient-to-r from-[#073372] to-[#17BC91] hover:opacity-90 text-white px-6 py-3 rounded-xl font-bold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isConfirming ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Confirmando...
                          </span>
                        ) : (
                          <span>✓ Confirmar Documento{hasSignedFile ? ' y Subir Archivo Firmado' : ''}</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-center">
          <p className="text-xs text-gray-500 text-center">
            📧 Si tienes problemas con algún documento, contacta a tu asesor o escribe a soporte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentConfirmationModal;
