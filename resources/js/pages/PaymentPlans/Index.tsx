import React, { useState, useMemo, useCallback } from 'react';
import { CreditCard, Plus, Edit, Trash2, Search, XCircle } from 'lucide-react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select2 } from '@/components/ui/Select2';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import '../../../css/ag-grid-custom.css';

// Registrar módulos de AG Grid Community
ModuleRegistry.registerModules([AllCommunityModule]);

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
  students_count?: number; // Cantidad de estudiantes matriculados
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
  const [plans, setPlans] = useState<PaymentPlan[]>(initialPlans);
  const [selectedLevelId, setSelectedLevelId] = useState<number | undefined>(initialSelectedLevel);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
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

  // Función para obtener planes de pago desde el backend
  const fetchPaymentPlans = useCallback(async () => {
    try {
      // SIEMPRE obtener todos los planes sin filtrar
      // El filtrado por tab se hace en el frontend con filteredPlans
      const response = await axios.get('/api/admin/payment-plans');
      const paymentPlans = response.data;
      
      if (Array.isArray(paymentPlans)) {
        setPlans(paymentPlans);
        console.log('✅ Planes de pago actualizados desde el servidor:', paymentPlans.length, 'planes');
      }
    } catch (error) {
      console.error('❌ Error fetching payment plans:', error);
      toast.error('Error al obtener planes de pago', {
        description: 'No se pudo sincronizar con el servidor.',
        duration: 5000,
      });
    }
  }, []); // Sin dependencias porque siempre obtiene todos

  // Obtener lista al montar y cuando cambie el nivel seleccionado
  React.useEffect(() => {
    fetchPaymentPlans();
  }, [fetchPaymentPlans]);

  // Filtrar planes según el tab activo
  const filteredPlans = useMemo(() => {
    return selectedLevelId
      ? plans.filter(p => p.academic_level_id === selectedLevelId)
      : plans;
  }, [plans, selectedLevelId]);

  // Handlers
  const handleEdit = useCallback((plan: PaymentPlan) => {
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
  }, []);

  const handleDelete = useCallback((plan: PaymentPlan) => {
    if (confirm(`¿Estás seguro de eliminar el plan "${plan.name}"?`)) {
      router.delete(`/admin/payment-plans/${plan.id}`, {
        preserveScroll: true,
        onSuccess: async () => {
          toast.success('Plan de pago eliminado exitosamente');
          await fetchPaymentPlans();
        },
        onError: () => {
          toast.error('Error al eliminar plan de pago');
        }
      });
    }
  }, [fetchPaymentPlans]);

  // Definición de columnas para AG Grid
  const columnDefs = useMemo<ColDef<PaymentPlan>[]>(() => [
    {
      headerName: 'Plan de Pago',
      field: 'name',
      flex: 1,
      minWidth: 250,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const plan = params.data;
        return (
          <div className="flex items-center py-2 h-full">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: plan.academic_level?.color || '#3B82F6' }}
            >
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{plan.name}</div>
              <div className="text-xs text-gray-500">{plan.academic_level?.name}</div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Cuotas',
      field: 'installments_count',
      width: 100,
      cellRenderer: (params: any) => {
        return (
          <div className="flex items-center justify-center h-full">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {params.value}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Mensualidad',
      field: 'monthly_amount',
      width: 140,
      cellRenderer: (params: any) => {
        return (
          <div className="flex items-center justify-end h-full">
            <span className="text-sm font-semibold text-gray-900">S/ {params.value.toFixed(2)}</span>
          </div>
        );
      }
    },
    {
      headerName: 'Total',
      field: 'total_amount',
      width: 140,
      cellRenderer: (params: any) => {
        return (
          <div className="flex items-center justify-end h-full">
            <span className="text-sm font-bold text-gray-900">S/ {params.value.toFixed(2)}</span>
          </div>
        );
      }
    },
    {
      headerName: 'Descuento',
      field: 'discount_percentage',
      width: 120,
      cellRenderer: (params: any) => {
        const discount = params.value || 0;
        return (
          <div className="flex items-center justify-center h-full">
            {discount > 0 ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                {discount}%
              </span>
            ) : (
              <span className="text-xs text-gray-400">Sin descuento</span>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Duración',
      field: 'duration_months',
      width: 110,
      cellRenderer: (params: any) => {
        return (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-gray-600">{params.value} meses</span>
          </div>
        );
      }
    },
    {
      headerName: 'Estudiantes',
      field: 'students_count',
      width: 130,
      cellRenderer: (params: any) => {
        const count = params.value || 0;
        return (
          <div className="flex items-center justify-center h-full">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              count > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {count} {count === 1 ? 'estudiante' : 'estudiantes'}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Estado',
      field: 'is_active',
      width: 120,
      cellRenderer: (params: any) => {
        const plan = params.data;
        const isActive = params.value;
        
        const handleToggle = async (checked: boolean) => {
          if (!plan || !plan.id) {
            toast.error('Error', {
              description: 'No se pudo identificar el plan de pago',
              duration: 3000
            });
            return;
          }
          
          router.put(
            `/admin/payment-plans/${plan.id}`,
            {
              name: plan.name,
              academic_level_id: plan.academic_level_id,
              installments_count: plan.installments_count,
              monthly_amount: plan.monthly_amount,
              total_amount: plan.total_amount,
              discount_percentage: plan.discount_percentage,
              duration_months: plan.duration_months,
              late_fee_percentage: plan.late_fee_percentage,
              grace_period_days: plan.grace_period_days,
              is_active: checked,
              description: plan.description
            },
            {
              preserveScroll: true,
              onSuccess: async () => {
                await fetchPaymentPlans();
                toast.success(
                  checked ? 'Plan activado' : 'Plan desactivado',
                  {
                    description: `El plan "${plan.name}" ha sido ${checked ? 'activado' : 'desactivado'}`,
                    duration: 3000
                  }
                );
              },
              onError: (errors) => {
                console.error('❌ Error al cambiar estado:', errors);
                toast.error('Error al cambiar estado');
              }
            }
          );
        };
        
        return (
          <div className="flex items-center justify-center h-full">
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
            />
          </div>
        );
      }
    },
    {
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        const plan = params.data;
        return (
          <div className="flex items-center justify-center space-x-2 h-full">
            <button
              onClick={() => handleEdit(plan)}
              className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
              title="Editar plan"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(plan)}
              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
              title="Eliminar plan"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ], [fetchPaymentPlans, handleEdit, handleDelete]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { academic_level, ...dataToSend } = formData as PaymentPlan;

    if (editingPlan) {
      router.put(`/admin/payment-plans/${editingPlan.id}`, dataToSend, {
        preserveScroll: true,
        onSuccess: async () => {
          toast.success('Plan de pago actualizado exitosamente');
          setShowForm(false);
          await fetchPaymentPlans();
        },
        onError: (errors) => {
          console.error(errors);
          toast.error('Error al actualizar plan de pago');
        }
      });
    } else {
      router.post('/admin/payment-plans', dataToSend, {
        preserveScroll: true,
        onSuccess: async () => {
          toast.success('Plan de pago creado exitosamente');
          setShowForm(false);
          await fetchPaymentPlans();
        },
        onError: (errors) => {
          console.error(errors);
          toast.error('Error al crear plan de pago');
        }
      });
    }
  };

  // Auto-calculate total amount
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-7 h-7 text-blue-600" />
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

        {/* AG Grid Table */}
        <div className="space-y-4">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Input
              type="text"
              label="Buscar por nombre, nivel, descripción..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="pr-10"
            />
            {quickFilterText && (
              <button
                onClick={() => setQuickFilterText('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Tabs para filtrar por nivel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex overflow-x-auto">
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedLevelId(undefined)}
                className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  !selectedLevelId
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Todos los Planes
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
                  {plans.length}
                </span>
              </button>
              
              {academicLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevelId(level.id)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                    selectedLevelId === level.id
                      ? 'text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={
                    selectedLevelId === level.id
                      ? { 
                          background: `linear-gradient(to right, ${level.color || '#3B82F6'}, ${level.color || '#3B82F6'}dd)` 
                        }
                      : {}
                  }
                >
                  {level.name}
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
                    {plans.filter(p => p.academic_level_id === level.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div 
              className="ag-theme-quartz" 
              style={{ height: 'calc(100vh - 400px)', width: '100%' }}
            >
              <AgGridReact
                rowData={filteredPlans}
                columnDefs={columnDefs}
                quickFilterText={quickFilterText}
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                }}
                pagination={true}
                paginationPageSize={20}
                paginationPageSizeSelector={[10, 20, 50, 100]}
                animateRows={true}
                rowHeight={70}
                headerHeight={50}
                theme={themeQuartz}
              />
            </div>
          </div>
        </div>

        {/* Empty State */}
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

        {/* Form Modal */}
        {showForm && (
          <div
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
            style={{ height: '100vh', width: '100vw' }}
          >
            <div
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="relative bg-blue-600 px-8 py-6 rounded-t-3xl flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {editingPlan ? 'Editar Plan de Pago' : 'Nuevo Plan de Pago'}
                    </h3>
                    <p className="text-blue-100">
                      {editingPlan
                        ? 'Actualiza la información del plan'
                        : 'Completa la información para crear un nuevo plan'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contenido del Modal */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-8 space-y-6 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 gap-6">
                    <Input
                      label="Nombre del Plan"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Plan Premium, Plan Estándar"
                      required
                    />

                    <div>
                      <Select2
                        value={formData.academic_level_id}
                        onChange={(value) => setFormData({ ...formData, academic_level_id: value as number })}
                        options={academicLevels.map(level => ({
                          value: level.id,
                          label: level.name
                        }))}
                        label="Selecciona un nivel académico"
                      />
                      <p className="text-xs text-gray-500 mt-1">Nivel académico al que pertenece el plan</p>
                    </div>

                    <Textarea
                      label="Descripción"
                      value={formData.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción opcional del plan"
                      rows={2}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Número de Cuotas"
                          type="number"
                          value={formData.installments_count}
                          onChange={(e) => setFormData({ ...formData, installments_count: parseInt(e.target.value) || 1 })}
                          onBlur={calculateTotalAmount}
                          min={1}
                          max={12}
                          required
                        />
                      </div>

                      <div>
                        <Input
                          label="Duración (meses)"
                          type="number"
                          value={formData.duration_months}
                          onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 1 })}
                          min={1}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Monto Mensual (S/)"
                          type="number"
                          step="0.01"
                          value={formData.monthly_amount}
                          onChange={(e) => setFormData({ ...formData, monthly_amount: parseFloat(e.target.value) || 0 })}
                          onBlur={calculateTotalAmount}
                          min={0}
                         
                          required
                        />
                      </div>

                      <div>
                        <Input
                          label="Descuento (%)"
                          type="number"
                          step="0.01"
                          value={formData.discount_percentage}
                          onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                          onBlur={calculateTotalAmount}
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>

                    <div>
                      <Input
                        label="Monto Total (S/)"
                        type="number"
                        step="0.01"
                        value={formData.total_amount}
                        onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                        min={0}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Se calcula automáticamente: (Mensualidad × Cuotas) - Descuento
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Mora Mensual (%)"
                          type="number"
                          step="0.01"
                          value={formData.late_fee_percentage}
                          onChange={(e) => setFormData({ ...formData, late_fee_percentage: parseFloat(e.target.value) || 0 })}
                          min={0}
                          max={100}
                        />
                      </div>

                      <div>
                        <Input
                          label="Período de Gracia (días)"
                          type="number"
                          value={formData.grace_period_days}
                          onChange={(e) => setFormData({ ...formData, grace_period_days: parseInt(e.target.value) || 0 })}
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer con botones */}
                <div className="bg-gray-50 px-8 py-6 rounded-b-3xl border-t-2 border-gray-200 flex-shrink-0">
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-xl font-semibold transition-all duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {editingPlan ? 'Actualizar Plan' : 'Crear Plan'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default PaymentPlansIndex;
