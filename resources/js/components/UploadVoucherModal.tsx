import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, FileImage, CheckCircle2, AlertCircle } from 'lucide-react';
import { Installment } from '@/types/models';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface UploadVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: Installment;
  onVoucherUploaded: () => void;
}

export default function UploadVoucherModal({
  open,
  onOpenChange,
  installment,
  onVoucherUploaded,
}: UploadVoucherModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    voucher_file: null as File | null,
    declared_amount: installment.totalDue || installment.amount,
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'transfer' as 'cash' | 'transfer' | 'deposit' | 'card',
    transaction_reference: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no puede exceder los 5MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }

    setFormData({ ...formData, voucher_file: file });
    setError(null);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.voucher_file) {
      setError('Debes seleccionar un archivo de voucher');
      return;
    }

    if (formData.declared_amount <= 0) {
      setError('El monto declarado debe ser mayor a 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append('voucher_file', formData.voucher_file);
      data.append('declared_amount', formData.declared_amount.toString());
      data.append('payment_date', formData.payment_date);
      data.append('payment_method', formData.payment_method);
      if (formData.transaction_reference) {
        data.append('transaction_reference', formData.transaction_reference);
      }

      const response = await fetch(`/api/installments/${installment.id}/vouchers`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al subir el voucher');
      }

      setSuccess(true);
      setTimeout(() => {
        onVoucherUploaded();
        resetForm();
      }, 1500);
    } catch (err) {
      console.error('Error uploading voucher:', err);
      setError(err instanceof Error ? err.message : 'Error al subir el voucher');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      voucher_file: null,
      declared_amount: installment.totalDue || installment.amount,
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'transfer',
      transaction_reference: '',
    });
    setPreviewUrl(null);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Subir Voucher de Pago - Cuota {installment.installment_number}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              ¡Voucher subido exitosamente!
            </h3>
            <p className="text-gray-600">
              El voucher está en revisión. El cajero verificará el pago próximamente.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Installment Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Fecha de Vencimiento:</p>
                  <p className="font-semibold">{formatDate(installment.due_date)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Monto a Pagar:</p>
                  <p className="font-semibold text-lg text-blue-600">
                    {formatCurrency(installment.totalDue || installment.amount)}
                  </p>
                </div>
              </div>
              {installment.late_fee > 0 && (
                <div className="mt-2 text-sm">
                  <p className="text-gray-600">
                    Incluye mora: <span className="text-red-600 font-semibold">{formatCurrency(installment.late_fee)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="voucher_file" className="text-base font-semibold">
                Archivo del Voucher *
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="voucher_file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="voucher_file" className="cursor-pointer">
                  {previewUrl ? (
                    <div className="space-y-2">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-gray-600">{formData.voucher_file?.name}</p>
                      <Button type="button" variant="outline" size="sm">
                        Cambiar archivo
                      </Button>
                    </div>
                  ) : formData.voucher_file ? (
                    <div className="space-y-2">
                      <FileImage className="w-12 h-12 text-gray-400 mx-auto" />
                      <p className="text-sm font-medium">{formData.voucher_file.name}</p>
                      <Button type="button" variant="outline" size="sm">
                        Cambiar archivo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-600">
                        Haz clic para seleccionar un archivo
                      </p>
                      <p className="text-xs text-gray-500">
                        JPG, PNG o PDF (máx. 5MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="declared_amount">Monto Pagado *</Label>
                <Input
                  id="declared_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.declared_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, declared_amount: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">Fecha de Pago *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_date: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value: 'cash' | 'transfer' | 'deposit' | 'card') =>
                    setFormData({ ...formData, payment_method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="deposit">Depósito</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_reference">
                  N° de Operación {formData.payment_method !== 'cash' && '*'}
                </Label>
                <Input
                  id="transaction_reference"
                  type="text"
                  placeholder="Ej: 123456789"
                  value={formData.transaction_reference}
                  onChange={(e) =>
                    setFormData({ ...formData, transaction_reference: e.target.value })
                  }
                  required={formData.payment_method !== 'cash'}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !formData.voucher_file}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Voucher
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
