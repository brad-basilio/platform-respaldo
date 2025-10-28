import React, { useState, useMemo, useCallback } from 'react';
import { GraduationCap, Plus, Edit, Trash2, Search, XCircle } from 'lucide-react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/color-picker';
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
  description?: string;
  order: number;
  color?: string;
  is_active: boolean;
  payment_plans_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  academicLevels: AcademicLevel[];
}

const AcademicLevelsIndex: React.FC<Props> = ({ academicLevels: initialLevels }) => {
  const [levels, setLevels] = useState<AcademicLevel[]>(initialLevels);
  const [showForm, setShowForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AcademicLevel | null>(null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [formData, setFormData] = useState<Partial<AcademicLevel>>({
    name: '',
    code: '',
    description: '',
    order: 0,
    color: '#3B82F6',
    is_active: true
  });

  // Función para obtener niveles académicos desde el backend y mantener el estado canónico
  const fetchAcademicLevels = useCallback(async () => {
    try {
      const response = await axios.get('/api/admin/academic-levels');
      const academicLevels = response.data;
      
      if (Array.isArray(academicLevels)) {
        setLevels(academicLevels);
        console.log('✅ Niveles académicos actualizados desde el servidor:', academicLevels.length, 'niveles');
      } else {
        console.error('❌ Formato de respuesta inesperado:', academicLevels);
      }
    } catch (error) {
      console.error('❌ Error fetching academic levels:', error);
      toast.error('Error al obtener niveles académicos', {
        description: 'No se pudo sincronizar con el servidor. Intenta recargar la página.',
        duration: 5000,
      });
    }
  }, []);

  // Obtener lista canónica al montar el componente
  React.useEffect(() => {
    fetchAcademicLevels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers (definidos antes de columnDefs para evitar problemas de inicialización)
  const handleEdit = useCallback((level: AcademicLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      code: level.code,
      description: level.description || '',
      order: level.order,
      color: level.color || '#3B82F6',
      is_active: level.is_active
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((level: AcademicLevel) => {
    if (level.payment_plans_count && level.payment_plans_count > 0) {
      toast.error('No se puede eliminar', {
        description: 'Este nivel académico tiene planes de pago asociados'
      });
      return;
    }

    if (confirm(`¿Estás seguro de eliminar el nivel académico "${level.name}"?`)) {
      router.delete(`/admin/academic-levels/${level.id}`, {
        onSuccess: async () => {
          toast.success('Nivel académico eliminado exitosamente');
          await fetchAcademicLevels(); // Refrescar desde el servidor
        },
        onError: () => {
          toast.error('Error al eliminar nivel académico');
        }
      });
    }
  }, [fetchAcademicLevels]);

  // Definición de columnas para AG Grid
  const columnDefs = useMemo<ColDef<AcademicLevel>[]>(() => [
    {
      headerName: 'Orden',
      field: 'order',
      width: 100,
      sort: 'asc',
      cellRenderer: (params: any) => {
        return (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm font-semibold text-gray-900">{params.value}</span>
          </div>
        );
      }
    },
    {
      headerName: 'Nivel Académico',
      field: 'name',
      flex: 1,
      minWidth: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const level = params.data;
        return (
          <div className="flex items-center py-2 h-full">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: level.color || '#3B82F6' }}
            >
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{level.name}</div>
              <div className="text-xs text-gray-500">Código: {level.code}</div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Descripción',
      field: 'description',
      flex: 1,
      minWidth: 250,
      cellRenderer: (params: any) => {
        return (
          <div className="flex items-center h-full">
            <span className="text-sm text-gray-600">{params.value || 'Sin descripción'}</span>
          </div>
        );
      }
    },
    {
      headerName: 'Planes de Pago',
      field: 'payment_plans_count',
      width: 150,
      cellRenderer: (params: any) => {
        const count = params.value || 0;
        return (
          <div className="flex items-center justify-center h-full">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {count} {count === 1 ? 'plan' : 'planes'}
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
        const level = params.data;
        const isActive = params.value;
        
        const handleToggle = async (checked: boolean) => {
          if (!level || !level.id) {
            console.error('❌ No se puede actualizar: level o level.id es undefined', level);
            toast.error('Error', {
              description: 'No se pudo identificar el nivel académico',
              duration: 3000
            });
            return;
          }
          
          console.log('🔄 Actualizando nivel académico ID:', level.id, 'a is_active:', checked);
          
          router.put(
            `/admin/academic-levels/${level.id}`,
            {
              name: level.name,
              code: level.code,
              description: level.description,
              order: level.order,
              color: level.color,
              is_active: checked
            },
            {
              preserveScroll: true,
              onSuccess: async () => {
                await fetchAcademicLevels();
                toast.success(
                  checked ? 'Nivel académico activado' : 'Nivel académico desactivado',
                  {
                    description: `El nivel "${level.name}" ha sido ${checked ? 'activado' : 'desactivado'} exitosamente`,
                    duration: 3000
                  }
                );
              },
              onError: (errors) => {
                console.error('❌ Error al cambiar estado:', errors);
                toast.error('Error al cambiar estado', {
                  description: 'No se pudo actualizar el estado del nivel académico',
                  duration: 5000
                });
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
        const level = params.data;
        return (
          <div className="flex items-center justify-center space-x-2 h-full">
            <button
              onClick={() => handleEdit(level)}
              className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
              title="Editar nivel"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(level)}
              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
              title="Eliminar nivel"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ], [fetchAcademicLevels, handleEdit, handleDelete]);

  const handleCreate = () => {
    setEditingLevel(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      order: levels.length + 1,
      color: '#3B82F6',
      is_active: true
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingLevel) {
      router.put(`/admin/academic-levels/${editingLevel.id}`, formData, {
        onSuccess: async () => {
          toast.success('Nivel académico actualizado exitosamente');
          setShowForm(false);
          await fetchAcademicLevels(); // Refrescar desde el servidor
        },
        onError: (errors) => {
          console.error(errors);
          toast.error('Error al actualizar nivel académico');
        }
      });
    } else {
      router.post('/admin/academic-levels', formData, {
        onSuccess: async () => {
          toast.success('Nivel académico creado exitosamente');
          setShowForm(false);
          await fetchAcademicLevels(); // Refrescar desde el servidor
        },
        onError: (errors) => {
          console.error(errors);
          toast.error('Error al crear nivel académico');
        }
      });
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-blue-600" />
              Niveles Académicos
            </h1>
            <p className="text-gray-600 mt-1">
              Administra los niveles académicos disponibles para los planes de pago
            </p>
          </div>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Nivel
          </Button>
        </div>

        {/* AG Grid Table */}
        <div className="space-y-4">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Input
              type="text"
              label="Buscar por nombre, código o descripción..."
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div 
              className="ag-theme-quartz" 
              style={{ height: 'calc(100vh - 350px)', width: '100%' }}
            >
              <AgGridReact
                rowData={levels}
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
        {levels.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay niveles académicos registrados</p>
            <p className="text-gray-400 text-sm mt-2">Crea el primer nivel para comenzar</p>
          </div>
        )}

        {/* Form Dialog */}
        {showForm && (
          <div
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
            style={{ height: '100vh', width: '100vw' }}
          >
            {/* Modal Container */}
            <div
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="relative bg-blue-600 px-8 py-6 rounded-t-3xl flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {editingLevel ? 'Editar Nivel Académico' : 'Nuevo Nivel Académico'}
                    </h3>
                    <p className="text-blue-100">
                      {editingLevel
                        ? 'Actualiza la información del nivel académico'
                        : 'Completa la información para crear un nuevo nivel'}
                    </p>
                  </div>

                  {/* Close Button */}
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

              {/* Contenido del Modal - Con scroll */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-8 space-y-6 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 gap-6">
                    <Input
                      label="Nombre del Nivel"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Básico, Intermedio, Avanzado"
                      required
                    />

                    <div>
                      <Input
                        label="Código"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                        placeholder="Ej: basic, intermediate, advanced"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">El código se convertirá automáticamente a minúsculas</p>
                    </div>

                    <Textarea
                      label="Descripción"
                      value={formData.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción opcional del nivel académico"
                      rows={3}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Orden de Visualización"
                          type="number"
                          value={formData.order}
                          onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                          min={0}
                        />
                        <p className="text-xs text-gray-500 mt-1">Menor número aparece primero</p>
                      </div>

                      <ColorPicker
                        label="Color Identificador"
                        value={formData.color}
                        onChange={(color) => setFormData({ ...formData, color })}
                      />
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
                      {editingLevel ? 'Actualizar Nivel' : 'Crear Nivel'}
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

export default AcademicLevelsIndex;
