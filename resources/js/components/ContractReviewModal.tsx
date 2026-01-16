import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

interface ContractReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAcceptanceId: number | null;
  studentName: string;
  pdfPath: string;
  onApproved: () => void;
  onResent: () => void;
}

export const ContractReviewModal: React.FC<ContractReviewModalProps> = ({
  isOpen,
  onClose,
  contractAcceptanceId,
  studentName,
  pdfPath,
  onApproved,
  onResent,
}) => {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'resend' | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const handleApprove = async () => {
    if (!contractAcceptanceId) return;

    setLoading(true);
    setAction('approve');

    try {
      const response = await axios.post(`/admin/contracts/${contractAcceptanceId}/approve`);

      if (response.data.success) {
        toast.success('¡Contrato aprobado!', {
          description: 'Los emails han sido enviados y el aprendiz ha pasado a pago por verificar',
          duration: 5000,
        });
        onApproved();
        onClose();
      }
    } catch (error: unknown) {
      console.error('Error al aprobar contrato:', error);
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
      toast.error('Error al aprobar contrato', {
        description: axios.isAxiosError(error) ? error.response?.data?.message : message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleResend = async () => {
    if (!contractAcceptanceId) return;

    setLoading(true);
    setAction('resend');

    try {
      const response = await axios.post(`/admin/contracts/${contractAcceptanceId}/resend`);

      if (response.data.success) {
        toast.success('Contrato reenviado', {
          description: 'El aprendiz recibirá un nuevo email para firmar el contrato nuevamente',
          duration: 5000,
        });
        onResent();
        onClose();
      }
    } catch (error: unknown) {
      console.error('Error al reenviar contrato:', error);
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
      toast.error('Error al reenviar contrato', {
        description: axios.isAxiosError(error) ? error.response?.data?.message : message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const pdfUrl = pdfPath ? `/storage/${pdfPath}` : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border-0 shadow-2xl [&>button]:hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-[#073372] to-[#0B4D9D] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                Revisar Contrato Firmado
              </DialogTitle>
              <p className="text-blue-100 text-sm mt-0.5">
                Aprendiz: <span className="font-semibold text-white">{studentName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden bg-gray-50">
          <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm relative">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full absolute inset-0"
                title="Vista previa del contrato firmado"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <FileText className="h-16 w-16 opacity-20" />
                <p className="font-medium">No hay documento PDF disponible</p>
              </div>
            )}
          </div>

          {/* Checkbox de Verificación */}
          <div className="mt-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  id="verify-contract"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="peer h-6 w-6 text-[#073372] border-gray-300 rounded-md focus:ring-[#073372] cursor-pointer transition-all"
                />
              </div>
              <div className="flex-1">
                <span className="text-gray-900 font-semibold block group-hover:text-[#073372] transition-colors">
                  Confirmar revisión del documento
                </span>
                <span className="text-sm text-gray-500 block mt-0.5">
                  He revisado el contrato y confirmo que la firma es válida y los datos son correctos.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer de Acciones */}
        <div className="bg-white p-6 border-t border-gray-100 flex justify-between items-center gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium"
          >
            Cancelar
          </Button>

          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleResend}
              disabled={loading}
              className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-none hover:shadow-sm transition-all"
            >
              {loading && action === 'resend' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Reenviando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar y Reenviar
                </>
              )}
            </Button>

            <Button
              onClick={handleApprove}
              disabled={loading || !isVerified}
              className={`
                relative overflow-hidden transition-all duration-300 shadow-lg hover:shadow-xl
                ${!isVerified
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-[#073372] to-[#0B4D9D] hover:from-[#062b61] hover:to-[#094185] text-white transform hover:-translate-y-0.5'
                }
              `}
            >
              {loading && action === 'approve' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Aprobando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobar y Finalizar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractReviewModal;
