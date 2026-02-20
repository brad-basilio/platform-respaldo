import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { 
  Calendar, Clock, Users, Film, Play, CheckCircle, 
  ExternalLink, ChevronRight, Search, Filter, ArrowLeft,
  XCircle, AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select2 } from '@/components/ui/Select2';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// AG Grid Imports
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';

// Register AG Grid Modules
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

interface Student {
  id: number;
  first_name: string;
  paternal_last_name: string;
  maternal_last_name?: string;
}

interface Enrollment {
  id: number;
  attended: boolean;
  exam_completed: boolean;
  student: Student;
}

interface ScheduledClass {
  id: number;
  scheduled_at: string;
  ended_at?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  type: 'regular' | 'practice';
  meet_url?: string;
  recording_url?: string;
  max_students: number;
  template: ClassTemplate;
  enrollments: Enrollment[];
  enrollments_count: number;
}

interface Stats {
  totalClasses: number;
  scheduledClasses: number;
  inProgressClasses: number;
  completedClasses: number;
  totalStudents: number;
  todayClasses: number;
}

interface Props {
  scheduledClasses: {
    data: ScheduledClass[];
    current_page: number;
    last_page: number;
    total: number;
  };
  stats: Stats;
  filters: {
    status?: string;
    date?: string;
    type?: string;
  };
}

export default function MyClasses({ scheduledClasses, stats, filters }: Props) {
  const [statusFilter, setStatusFilter] = useState(filters.status || '');
  const [dateFilter, setDateFilter] = useState<Date | null>(filters.date ? new Date(filters.date) : null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
      scheduled: { label: 'Programada', color: '#073372', bgColor: 'rgba(7, 51, 114, 0.1)', borderColor: 'rgba(7, 51, 114, 0.3)' },
      in_progress: { label: 'En Curso', color: '#F98613', bgColor: 'rgba(249, 134, 19, 0.1)', borderColor: 'rgba(249, 134, 19, 0.3)' },
      completed: { label: 'Completada', color: '#17BC91', bgColor: 'rgba(23, 188, 145, 0.1)', borderColor: 'rgba(23, 188, 145, 0.3)' },
      cancelled: { label: 'Cancelada', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
    };
    return configs[status] || configs.scheduled;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima'
    });
  };

  const isPractice = filters.type === 'practice';
  const pageTitle = isPractice ? 'Mis Sesiones Prácticas' : (filters.type === 'regular' ? 'Mis Clases Teóricas' : 'Todas mis Sesiones');
  const pageSubtitle = isPractice ? 'Refuerza los conocimientos de tus alumnos' : 'Imparte clases teóricas de la ruta académica';

  const handleUpdateStatus = (classId: number, newStatus: string) => {
    router.put(`/teacher/my-classes/${classId}/status`, { status: newStatus }, {
      onSuccess: () => toast.success('Estado actualizado'),
      onError: () => toast.error('Error al actualizar estado'),
      preserveScroll: true,
    });
  };

  const handleFilter = () => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (dateFilter) params.date = dateFilter.toISOString().split('T')[0];
    if (filters.type) params.type = filters.type;
    router.get('/teacher/my-classes', params, { preserveState: true });
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateFilter(null);
    setQuickFilterText('');
    const params: any = {};
    if (filters.type) params.type = filters.type;
    router.get('/teacher/my-classes', params);
  };

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef<ScheduledClass>[]>(() => [
    {
      headerName: 'Tipo',
      field: 'type',
      minWidth: 100,
      maxWidth: 130,
      cellRenderer: (params: any) => {
        const isPrac = params.value === 'practice';
        return (
          <div className="flex items-center h-full">
            <Badge className={`${isPrac ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-blue-100 text-blue-700 border-blue-200'} border shadow-none`}>
               {isPrac ? 'Práctica' : 'Teórica'}
            </Badge>
          </div>
        );
      }
    },
    {
      headerName: 'Sesión',
      field: 'template.session_number',
      minWidth: 80,
      maxWidth: 100,
      cellRenderer: (params: any) => {
        const levelColor = params.data.template.academic_level?.color || '#073372';
        return (
          <div className="flex items-center justify-center h-full">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
              style={{ backgroundColor: levelColor }}
            >
              {params.value}
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Clase',
      field: 'template.title',
      minWidth: 250,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const template = params.data.template;
        return (
            <div className="flex flex-col justify-center h-full py-1">
                <span className="font-semibold text-gray-900 leading-tight">{template.title}</span>
                <span 
                    className="text-xs font-medium mt-1"
                    style={{ color: template.academic_level?.color || '#64748b' }}
                >
                    {template.academic_level?.name}
                </span>
            </div>
        );
      }
    },
    {
      headerName: 'Horario',
      field: 'scheduled_at',
      minWidth: 200,
      cellRenderer: (params: any) => {
        return (
          <div className="flex flex-col justify-center h-full py-1">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formatDateTime(params.value)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                {params.data.template.duration_minutes} min
            </div>
          </div>
        );
      }
    },
    {
        headerName: 'Estado',
        field: 'status',
        minWidth: 140,
        cellRenderer: (params: any) => {
            const config = getStatusConfig(params.value);
            return (
                <div className="flex items-center h-full">
                    <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                            backgroundColor: config.bgColor, 
                            color: config.color,
                            border: `1px solid ${config.borderColor}`
                        }}
                    >
                        {config.label}
                    </span>
                </div>
            )
        }
    },
    {
        headerName: 'Alumnos',
        field: 'enrollments_count',
        minWidth: 120,
        cellRenderer: (params: any) => {
            return (
                <div className="flex items-center h-full gap-1.5 text-sm text-gray-700">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{params.value}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-500">{params.data.max_students}</span>
                </div>
            );
        }
    },
    {
        headerName: 'Grabación',
        field: 'recording_url',
        minWidth: 140,
        cellRenderer: (params: any) => {
            if (!params.value) return (
                <div className="flex items-center h-full text-xs text-slate-400 italic">
                    Sin grabación
                </div>
            );
            return (
                <div className="flex items-center h-full">
                     <Badge 
                        className="text-white font-semibold flex items-center gap-1 hover:bg-[#F98613]/90"
                        style={{ backgroundColor: '#F98613' }}
                    >
                        <Film className="w-3 h-3" />
                         Grabación
                    </Badge>
                </div>
            );
        }
    },
    {
      headerName: 'Acciones',
      minWidth: 200,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        const cls = params.data;
        return (
          <div className="flex items-center gap-2 h-full">
            {cls.status === 'scheduled' && (
               <button
                  onClick={() => handleUpdateStatus(cls.id, 'in_progress')}
                  className="text-orange-500 hover:text-orange-700 p-1.5 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Iniciar Clase"
               >
                   <Play className="w-4 h-4" />
               </button>
            )}
            {cls.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateStatus(cls.id, 'completed')}
                  className="text-green-500 hover:text-green-700 p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                  title="Completar Clase"
                >
                    <CheckCircle className="w-4 h-4" />
                </button>
            )}
            {cls.meet_url && (
                <a 
                    href={cls.meet_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Ir a Meet"
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
            )}
            <Link 
                href={`/teacher/my-classes/${cls.id}`}
                className="text-slate-600 hover:text-slate-900 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title="Ver Detalles"
            >
                <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        );
      }
    }
  ], []);

  return (
    <AuthenticatedLayout>
      <Head title="Mis Clases" />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="w-full px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-[#073372] transition-colors mb-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Volver al Dashboard</span>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
                <p className="text-gray-500 mt-1">{pageSubtitle}</p>
              </div>
              
              {/* Stats KPIs */}
              <div className="flex items-center gap-4">
                <div className="text-center px-5 py-3 rounded-xl shadow-md bg-[#073372]/5">
                  <div className="text-3xl font-black text-[#073372]">{stats.scheduledClasses}</div>
                  <div className="text-xs font-semibold text-gray-600 mt-1">Programadas</div>
                </div>
                <div className="text-center px-5 py-3 rounded-xl shadow-md bg-[#F98613]/5">
                  <div className="text-3xl font-black text-[#F98613]">{stats.inProgressClasses}</div>
                  <div className="text-xs font-semibold text-gray-600 mt-1">En Curso</div>
                </div>
                <div className="text-center px-5 py-3 rounded-xl shadow-md bg-[#17BC91]/5">
                  <div className="text-3xl font-black text-[#17BC91]">{stats.completedClasses}</div>
                  <div className="text-xs font-semibold text-gray-600 mt-1">Completadas</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-6 py-6 space-y-6">
          
             {/* Search Bar & Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="w-full md:max-w-md">
                    <Input
                        label="Buscar en esta página..."
                        value={quickFilterText}
                        onChange={(e) => setQuickFilterText(e.target.value)}
                        icon={<Search className="w-5 h-5" />}
                    />
                 </div>

                 {/* Server Side Filters (Collapsible or Inline) */}
                 <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="w-full md:w-48">
                         <Select2
                            value={statusFilter}
                            onChange={(value) => setStatusFilter(value as string)}
                            options={[
                            { value: '', label: 'Todos los estados' },
                            { value: 'scheduled', label: '📅 Programadas' },
                            { value: 'in_progress', label: '🔄 En Curso' },
                            { value: 'completed', label: '✅ Completadas' },
                            { value: 'cancelled', label: '❌ Canceladas' },
                            ]}
                            isSearchable={false}
                            isClearable={false}
                            label="Estado"
                        />
                    </div>
                     <div className="w-full md:w-48">
                        <DatePicker
                            selected={dateFilter}
                            onChange={(date) => setDateFilter(date)}
                            isClearable
                            label="Fecha"
                        />
                    </div>
                     <div className="flex gap-2 w-full md:w-auto">
                        <Button 
                            onClick={handleFilter} 
                            className="bg-[#073372] hover:bg-[#052a5e] text-white shadow-sm h-[42px]"
                            title="Aplicar Filtros"
                        >
                            <Search className="w-4 h-4" />
                        </Button>
                        {(statusFilter || dateFilter) && (
                            <Button 
                                onClick={clearFilters} 
                                variant="outline"
                                className="border-orange-500 text-orange-500 hover:bg-orange-50 h-[42px]"
                                title="Limpiar Filtros"
                            >
                                <XCircle className="w-4 h-4" />
                            </Button>
                        )}
                     </div>
                 </div>
            </div>

            {/* AG Grid Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="ag-theme-quartz" style={{ height: '600px', width: '100%' }}>
                    <AgGridReact<ScheduledClass>
                        theme={themeQuartz}
                        rowData={scheduledClasses.data}
                        columnDefs={columnDefs}
                        quickFilterText={quickFilterText}
                        defaultColDef={{
                            sortable: true,
                            filter: true,
                            resizable: true,
                            flex: 1,
                            minWidth: 100,
                        }}
                        pagination={true}
                        paginationPageSize={10}
                        paginationPageSizeSelector={[10, 20, 50]}
                        rowSelection={{ mode: 'singleRow' }}
                        animateRows={true}
                        domLayout="normal"
                        rowHeight={70}
                        headerHeight={50}
                        suppressCellFocus={true}
                        rowClass="hover:bg-gray-50"
                        overlayNoRowsTemplate={
                            '<div style="padding: 20px;">No hay clases para mostrar</div>'
                        }
                    />
                </div>
            </div>

          {/* Pagination Links (Server Side) */}
          {scheduledClasses.last_page > 1 && (
            <div className="mt-8 flex justify-center gap-2 pb-8">
              {Array.from({ length: scheduledClasses.last_page }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === scheduledClasses.current_page ? 'default' : 'outline'}
                  className={page === scheduledClasses.current_page 
                    ? 'font-bold text-white shadow-md' 
                    : 'font-semibold hover:bg-gray-50 text-slate-600'
                  }
                  style={page === scheduledClasses.current_page 
                    ? { backgroundColor: '#073372' } 
                    : { borderColor: '#e2e8f0' }
                  }
                  onClick={() => router.get('/teacher/my-classes', { ...filters, page })}
                >
                  {page}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
