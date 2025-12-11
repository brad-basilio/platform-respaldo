import React, { useState, useMemo, useCallback } from 'react';
import { 
  Calendar, Plus, Trash2, Search, Users, Clock, 
  Play, CheckCircle, Filter, Eye, Film, Link2
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { router, Link } from '@inertiajs/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select2 } from '@/components/ui/Select2';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import '../../../../css/ag-grid-custom.css';

ModuleRegistry.registerModules([AllCommunityModule]);

interface AcademicLevel {
  id: number;
  name: string;
  color?: string;
}

interface ClassTemplate {
  id: number;
  title: string;
  session_number: string;
  duration_minutes: number;
  academic_level: AcademicLevel;
}

interface Teacher {
  id: number;
  name: string;
  email: string;
}

interface Group {
  id: number;
  name: string;
}

interface ScheduledClass {
  id: number;
  class_template_id: number;
  teacher_id?: number;
  group_id?: number;
  scheduled_at: string;
  ended_at?: string;
  meet_url?: string;
  recording_url?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  max_students: number;
  enrollments_count: number;
  template: ClassTemplate;
  teacher?: Teacher;
  group?: Group;
}

interface Props {
  scheduledClasses: {
    data: ScheduledClass[];
    current_page: number;
    last_page: number;
    total: number;
  };
  templates: ClassTemplate[];
  teachers: Teacher[];
  groups: Group[];
  filters: {
    status?: string;
    teacher_id?: string;
    date?: string;
  };
}

const ScheduledClassesIndex: React.FC<Props> = ({ 
  scheduledClasses, 
  templates, 
  teachers, 
  groups, 
  filters 
}) => {
  const [quickFilterText, setQuickFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ScheduledClass | null>(null);
  
  const [formData, setFormData] = useState({
    class_template_id: '',
    teacher_id: '',
    group_id: '',
    scheduled_at: '',
    meet_url: '',
    max_students: 6,
    notes: '',
  });

  const [recordingUrl, setRecordingUrl] = useState('');

  const applyFilters = useCallback((status: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    
    router.get(`/admin/scheduled-classes?${params.toString()}`, {}, {
      preserveState: true,
      replace: true,
    });
  }, []);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    applyFilters(value);
  };

  const handleCreate = () => {
    router.post('/admin/scheduled-classes', formData, {
      onSuccess: () => {
        toast.success('Clase programada exitosamente');
        setShowCreateModal(false);
        setFormData({
          class_template_id: '',
          teacher_id: '',
          group_id: '',
          scheduled_at: '',
          meet_url: '',
          max_students: 6,
          notes: '',
        });
      },
      onError: () => {
        toast.error('Error al programar la clase');
      }
    });
  };

  const handleUpdateStatus = (scheduledClass: ScheduledClass, newStatus: string) => {
    router.put(`/admin/scheduled-classes/${scheduledClass.id}/status`, {
      status: newStatus
    }, {
      onSuccess: () => {
        toast.success('Estado actualizado');
      },
      onError: () => {
        toast.error('Error al actualizar estado');
      }
    });
  };

  const handleAddRecording = () => {
    if (!selectedClass || !recordingUrl) return;
    
    router.post(`/admin/scheduled-classes/${selectedClass.id}/recording`, {
      recording_url: recordingUrl
    }, {
      onSuccess: () => {
        toast.success('Grabación agregada exitosamente');
        setShowRecordingModal(false);
        setRecordingUrl('');
        setSelectedClass(null);
      },
      onError: () => {
        toast.error('Error al agregar grabación');
      }
    });
  };

  const handleDelete = (scheduledClass: ScheduledClass) => {
    if (scheduledClass.enrollments_count > 0) {
      toast.error('No se puede eliminar', {
        description: 'Esta clase tiene estudiantes inscritos'
      });
      return;
    }

    if (confirm('¿Estás seguro de eliminar esta clase programada?')) {
      router.delete(`/admin/scheduled-classes/${scheduledClass.id}`, {
        onSuccess: () => {
          toast.success('Clase eliminada');
        },
        onError: () => {
          toast.error('Error al eliminar clase');
        }
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      scheduled: { variant: 'outline', label: 'Programada' },
      in_progress: { variant: 'default', label: 'En curso' },
      completed: { variant: 'secondary', label: 'Completada' },
      cancelled: { variant: 'destructive', label: 'Cancelada' },
    };
    const config = variants[status] || variants.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columnDefs = useMemo<ColDef<ScheduledClass>[]>(() => [
    {
      headerName: 'Clase',
      flex: 1,
      minWidth: 280,
      cellRenderer: (params: any) => {
        const sc = params.data;
        return (
          <div className="flex items-center gap-3 py-2 h-full">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: sc.template?.academic_level?.color || '#3B82F6' }}
            >
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {sc.template?.title}
              </div>
              <div className="text-xs text-gray-500">
                {sc.template?.academic_level?.name} • S{sc.template?.session_number}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Fecha y Hora',
      field: 'scheduled_at',
      width: 180,
      sort: 'desc',
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{formatDateTime(params.value)}</span>
        </div>
      )
    },
    {
      headerName: 'Profesor',
      width: 150,
      cellRenderer: (params: any) => {
        const sc = params.data;
        return (
          <div className="flex items-center h-full">
            <span className="text-sm text-gray-600">
              {sc.teacher?.name || <span className="text-gray-400">Sin asignar</span>}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Alumnos',
      width: 100,
      cellRenderer: (params: any) => {
        const sc = params.data;
        return (
          <div className="flex items-center gap-2 h-full">
            <Users className="w-4 h-4 text-gray-400" />
            <span className={`text-sm ${sc.enrollments_count >= sc.max_students ? 'text-red-600 font-medium' : ''}`}>
              {sc.enrollments_count}/{sc.max_students}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Estado',
      field: 'status',
      width: 120,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
          {getStatusBadge(params.value)}
        </div>
      )
    },
    {
      headerName: 'Grabación',
      width: 100,
      cellRenderer: (params: any) => {
        const sc = params.data;
        return (
          <div className="flex items-center h-full">
            {sc.recording_url ? (
              <Badge variant="outline" className="text-green-600">
                <Film className="w-3 h-3 mr-1" />
                Sí
              </Badge>
            ) : (
              <span className="text-xs text-gray-400">No</span>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Acciones',
      width: 200,
      pinned: 'right',
      cellRenderer: (params: any) => {
        const sc = params.data;
        return (
          <div className="flex items-center gap-1 h-full">
            <Link href={`/admin/scheduled-classes/${sc.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver detalles">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            
            {sc.status === 'scheduled' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-green-600"
                title="Iniciar clase"
                onClick={() => handleUpdateStatus(sc, 'in_progress')}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            
            {sc.status === 'in_progress' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-blue-600"
                title="Marcar completada"
                onClick={() => handleUpdateStatus(sc, 'completed')}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            
            {sc.status === 'completed' && !sc.recording_url && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-purple-600"
                title="Agregar grabación"
                onClick={() => {
                  setSelectedClass(sc);
                  setShowRecordingModal(true);
                }}
              >
                <Film className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-600"
              title="Eliminar"
              onClick={() => handleDelete(sc)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
  }), []);

  return (
    <AuthenticatedLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clases Programadas</h1>
            <p className="text-gray-500 mt-1">Gestiona las sesiones de clase programadas</p>
          </div>
          <Button 
            className="bg-[#073372] hover:bg-[#052555]"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Programar Clase
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2 self-center">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Filtros:</span>
            </div>
            
            <div className="w-44">
              <Select2
                label="Estado"
                value={statusFilter}
                onChange={(value) => handleStatusChange(value as string)}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'scheduled', label: 'Programadas' },
                  { value: 'in_progress', label: 'En curso' },
                  { value: 'completed', label: 'Completadas' },
                  { value: 'cancelled', label: 'Canceladas' }
                ]}
                isSearchable={false}
                isClearable={false}
              />
            </div>

            <div className="flex-1 max-w-md ml-auto">
              <Input
                label="Buscar clases"
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="ag-theme-quartz" style={{ height: 'calc(100vh - 320px)', width: '100%' }}>
            <AgGridReact<ScheduledClass>
              rowData={scheduledClasses.data}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              quickFilterText={quickFilterText}
              pagination={true}
              paginationPageSize={20}
              rowHeight={60}
              theme={themeQuartz}
              animateRows={true}
              suppressCellFocus={true}
            />
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-4 flex gap-4 text-sm text-gray-500">
          <span>Total: {scheduledClasses.total} clases</span>
        </div>

        {/* Modal Crear Clase */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Programar Nueva Clase</DialogTitle>
              <DialogDescription>
                Programa una nueva sesión de clase basada en una plantilla
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <Select2
                label="Plantilla de Clase"
                value={formData.class_template_id}
                onChange={(value) => setFormData(prev => ({ ...prev, class_template_id: value as string }))}
                options={templates.map(template => ({
                  value: String(template.id),
                  label: `${template.academic_level.name} - S${template.session_number}: ${template.title}`
                }))}
                required
                placeholder="Seleccionar plantilla"
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  className="w-full h-14 px-3 pt-4 pb-1 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:border-2 focus:border-[#073372] hover:border-gray-900 transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select2
                  label="Profesor"
                  value={formData.teacher_id}
                  onChange={(value) => setFormData(prev => ({ ...prev, teacher_id: value as string }))}
                  options={teachers.map(teacher => ({
                    value: String(teacher.id),
                    label: teacher.name
                  }))}
                  placeholder="Seleccionar"
                  isClearable
                />

                <Input
                  label="Máx. Estudiantes"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.max_students}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_students: Number(e.target.value) }))}
                />
              </div>

              <Input
                label="URL de Meet/Zoom"
                type="url"
                value={formData.meet_url}
                onChange={(e) => setFormData(prev => ({ ...prev, meet_url: e.target.value }))}
                icon={<Link2 className="w-5 h-5" />}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-2 focus:border-[#073372] hover:border-gray-900 transition-all duration-200"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} className="bg-[#073372] hover:bg-[#052555]">
                Programar Clase
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Agregar Grabación */}
        <Dialog open={showRecordingModal} onOpenChange={setShowRecordingModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Grabación</DialogTitle>
              <DialogDescription>
                Agrega la URL de la grabación de Google Meet o Drive
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <Input
                label="URL de la Grabación"
                type="url"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                required
                helperText="Esta grabación reemplazará el video de introducción para los estudiantes inscritos"
                icon={<Link2 className="w-5 h-5" />}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRecordingModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddRecording} className="bg-[#073372] hover:bg-[#052555]">
                Agregar Grabación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};

export default ScheduledClassesIndex;
