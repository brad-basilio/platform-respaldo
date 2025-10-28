import React, { useState } from 'react';
import { CreditCard, Plus, Edit, Trash2, TrendingUp } from 'lucide-react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select2 } from '@/components/ui/Select2';

interface AcademicLevel {
  id: number;
  name: string;
  code: string;
  color?: string;
}

interface PaymentPlan {
  id: number;
  name: string;
  academic_level_id: number;
  academic_level?: AcademicLevel;
  installments_count: number;
  monthly_amount: number;
  total_amount: number;
  discount_percentage: number;
  duration_months: number;
  late_fee_percentage: number;
  grace_period_days: number;
  is_active: boolean;
  description?: string;
}

interface Props {
  paymentPlans: PaymentPlan[];
  academicLevels: AcademicLevel[];
  selectedLevelId?: number;
}

const PaymentPlansIndex: React.FC<Props> = ({ 
  paymentPlans: initialPlans, 
  academicLevels,
  selectedLevelId: initialSelectedLevel
}) => {
  const [plans] = useState<PaymentPlan[]>(initialPlans);
  const [selectedLevelId, setSelectedLevelId] = useState<number | undefined>(initialSelectedLevel);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentPlan>>({
    name: '',
    academic_level_id: undefined,
    installments_count: 1,
    monthly_amount: 0,
    total_amount: 0,
    discount_percentage: 0,
    duration_months: 1,
    late_fee_percentage: 5,
    grace_period_days: 5,
    is_active: true,
    description: ''
  });

  const filteredPlans = selectedLevelId
    ? plans.filter(p => p.academic_level_id === selectedLevelId)
    : plans;

  const handleLevelChange = (levelId: number | string | null | undefined) => {
    const numLevelId = levelId === '' || levelId === null ? undefined : Number(levelId);
    setSelectedLevelId(numLevelId);
    if (numLevelId) {
      router.get(`/admin/payment-plans?academic_level_id=${numLevelId}`, {}, {
        preserveState: true,
        preserveScroll: true
      });
    } else {
      router.get('/admin/payment-plans', {}, {
        preserveState: true,
        preserveScroll: true
      });
    }
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      academic_level_id: selectedLevelId || academicLevels[0]?.id,
      installments_count: 1,
      monthly_amount: 0,
      total_amount: 0,
      discount_percentage: 0,
      duration_months: 1,
      late_fee_percentage: 5,
      grace_period_days: 5,
      is_active: true,
      description: ''
    });
    setShowForm(true);
  };

  const handleEdit = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      academic_level_id: plan.academic_level_id,
      installments_count: plan.installments_count,
      monthly_amount: plan.monthly_amount,
      total_amount: plan.total_amount,
      discount_percentage: plan.discount_percentage,
      duration_months: plan.duration_months,
      late_fee_percentage: plan.late_fee_percentage,
      grace_period_days: plan.grace_period_days,
      is_active: plan.is_active,
      description: plan.description || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Remove academic_level from formData before sending
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { academic_level, ...dataToSend } = formData as PaymentPlan;

    if (editingPlan) {
      router.put(`/admin/payment-plans/${editingPlan.id}`, dataToSend, {
        onSuccess: () => {
          toast.success('Plan de pago actualizado exitosamente');
          setShowForm(false);
          router.reload({ only: ['paymentPlans'] });
        },
        onError: (errors) => {
          console.error(errors);
          toast.error('Error al actualizar plan de pago');
        }
      });
    } else {
      router.post('/admin/payment-plans', dataToSend, {
        onSuccess: () => {
          toast.success('Plan de pago creado exitosamente');
          setShowForm(false);
          router.reload({ only: ['paymentPlans'] });
        },
        onError: (errors) => {
          console.error(errors);
          toast.error('Error al crear plan de pago');
        }
      });
    }
  };

  const handleDelete = (plan: PaymentPlan) => {
    if (confirm(`¿Estás seguro de eliminar el plan "${plan.name}"?`)) {
      router.delete(`/admin/payment-plans/${plan.id}`, {
        onSuccess: () => {
          toast.success('Plan de pago eliminado exitosamente');
          router.reload({ only: ['paymentPlans'] });
        },
        onError: () => {
          toast.error('Error al eliminar plan de pago');
        }
      });
    }
  };

  // Auto-calculate total amount when monthly amount or installments change
  const calculateTotalAmount = () => {
    const monthly = formData.monthly_amount || 0;
    const installments = formData.installments_count || 1;
    const discount = formData.discount_percentage || 0;
    
    const subtotal = monthly * installments;
    const total = subtotal * (1 - discount / 100);
    
    setFormData({ ...formData, total_amount: Math.round(total * 100) / 100 });
  };

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-blue-600" />
              Planes de Pago
            </h1>
            <p className="text-gray-600 mt-1">
              Configura los planes de pago por nivel académico
            </p>
          </div>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Plan
          </Button>
        </div>

        {/* Level Filter */}
        <div className="mb-6 max-w-xs">
          <Label htmlFor="level-filter">Filtrar por Nivel Académico</Label>
          <Select2
            id="level-filter"
            value={selectedLevelId}
            onChange={(value) => handleLevelChange(value)}
            options={[
              { value: '' as unknown as number, label: 'Todos los niveles' },
              ...academicLevels.map(level => ({
                value: level.id,
                label: level.name
              }))
            ]}
          />
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-lg shadow-md p-6 border-t-4"
              style={{ borderTopColor: plan.academic_level?.color || '#3B82F6' }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{ 
                        backgroundColor: `${plan.academic_level?.color}20`,
                        color: plan.academic_level?.color || '#3B82F6'
                      }}
                    >
                      {plan.academic_level?.name}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {plan.description && (
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Cuotas:</span>
                  <span className="font-semibold">{plan.installments_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Mensualidad:</span>
                  <span className="font-semibold">S/ {plan.monthly_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Total:</span>
                  <span className="font-bold text-lg">S/ {plan.total_amount.toFixed(2)}</span>
                </div>
                {plan.discount_percentage > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-green-600 text-sm flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Descuento:
                    </span>
                    <span className="font-semibold text-green-600">{plan.discount_percentage}%</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Duración:</span>
                  <span>{plan.duration_months} meses</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Mora mensual:</span>
                  <span>{plan.late_fee_percentage}%</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Período de gracia:</span>
                  <span>{plan.grace_period_days} días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {plan.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPlans.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {selectedLevelId 
                ? 'No hay planes de pago para este nivel académico'
                : 'No hay planes de pago registrados'}
            </p>
            <p className="text-gray-400 text-sm mt-2">Crea el primer plan para comenzar</p>
          </div>
        )}

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plan de Pago' : 'Nuevo Plan de Pago'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nombre del Plan *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Plan Premium, Plan Estándar"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="academic_level_id">Nivel Académico *</Label>
                  <Select2
                    id="academic_level_id"
                    value={formData.academic_level_id}
                    onChange={(value) => setFormData({ ...formData, academic_level_id: value as number })}
                    options={academicLevels.map(level => ({
                      value: level.id,
                      label: level.name
                    }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="installments_count">Número de Cuotas *</Label>
                  <Input
                    id="installments_count"
                    type="number"
                    value={formData.installments_count}
                    onChange={(e) => setFormData({ ...formData, installments_count: parseInt(e.target.value) })}
                    onBlur={calculateTotalAmount}
                    min={1}
                    max={12}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration_months">Duración (meses) *</Label>
                  <Input
                    id="duration_months"
                    type="number"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
                    min={1}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="monthly_amount">Monto Mensual (S/) *</Label>
                  <Input
                    id="monthly_amount"
                    type="number"
                    step="0.01"
                    value={formData.monthly_amount}
                    onChange={(e) => setFormData({ ...formData, monthly_amount: parseFloat(e.target.value) })}
                    onBlur={calculateTotalAmount}
                    min={0}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="discount_percentage">Descuento (%)</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    step="0.01"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                    onBlur={calculateTotalAmount}
                    min={0}
                    max={100}
                  />
                </div>

                <div>
                  <Label htmlFor="total_amount">Monto Total (S/) *</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                    min={0}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se calcula automáticamente según cuotas y descuento
                  </p>
                </div>

                <div>
                  <Label htmlFor="late_fee_percentage">Mora Mensual (%)</Label>
                  <Input
                    id="late_fee_percentage"
                    type="number"
                    step="0.01"
                    value={formData.late_fee_percentage}
                    onChange={(e) => setFormData({ ...formData, late_fee_percentage: parseFloat(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>

                <div>
                  <Label htmlFor="grace_period_days">Período de Gracia (días)</Label>
                  <Input
                    id="grace_period_days"
                    type="number"
                    value={formData.grace_period_days}
                    onChange={(e) => setFormData({ ...formData, grace_period_days: parseInt(e.target.value) })}
                    min={0}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción opcional del plan"
                    rows={3}
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Plan activo</Label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};

export default PaymentPlansIndex;
