import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { 
  Calendar, Clock, Users, Film, Play, CheckCircle, 
  ExternalLink, ChevronRight, Search, Filter, ArrowLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select2 } from '@/components/ui/Select2';
import { DatePicker } from '@/components/ui/DatePicker';
import { toast } from 'sonner';

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
  };
}

export default function MyClasses({ scheduledClasses, stats, filters }: Props) {
  const [statusFilter, setStatusFilter] = useState(filters.status || '');
  const [dateFilter, setDateFilter] = useState<Date | null>(filters.date ? new Date(filters.date) : null);

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
    router.get('/teacher/my-classes', params, { preserveState: true });
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateFilter(null);
    router.get('/teacher/my-classes');
  };

  return (
    <AuthenticatedLayout>
      <Head title="Mis Clases" />

      <div className="min-h-screen bg-gray-50">
        {/* Header - Consistent with Dashboard Design */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-[#073372] transition-colors mb-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Volver al Dashboard</span>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Mis Clases</h1>
                <p className="text-gray-500 mt-1">Gestiona y monitorea tus sesiones de clase</p>
              </div>
              
              {/* Stats KPIs */}
              <div className="flex items-center gap-4">
                <div 
                  className="text-center px-5 py-3 rounded-xl shadow-md"
                  style={{ backgroundColor: 'rgba(7, 51, 114, 0.05)' }}
                >
                  <div className="text-3xl font-black" style={{ color: '#073372' }}>{stats.scheduledClasses}</div>
                  <div className="text-xs font-semibold text-gray-600 mt-1">Programadas</div>
                </div>
                <div 
                  className="text-center px-5 py-3 rounded-xl shadow-md"
                  style={{ backgroundColor: 'rgba(249, 134, 19, 0.05)' }}
                >
                  <div className="text-3xl font-black" style={{ color: '#F98613' }}>{stats.inProgressClasses}</div>
                  <div className="text-xs font-semibold text-gray-600 mt-1">En Curso</div>
                </div>
                <div 
                  className="text-center px-5 py-3 rounded-xl shadow-md"
                  style={{ backgroundColor: 'rgba(23, 188, 145, 0.05)' }}
                >
                  <div className="text-3xl font-black" style={{ color: '#17BC91' }}>{stats.completedClasses}</div>
                  <div className="text-xs font-semibold text-gray-600 mt-1">Completadas</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Filters Card - Material Design Style */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div 
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: 'rgba(7, 51, 114, 0.1)' }}
              >
                <Filter className="w-5 h-5" style={{ color: '#073372' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Filtros de Búsqueda</h3>
                <p className="text-sm text-gray-500">Encuentra tus clases rápidamente</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <Select2
                label="Estado de la Clase"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as string)}
                options={[
                  { value: '', label: 'Todos los estados' },
                  { value: 'scheduled', label: '📅 Programadas' },
                  { value: 'in_progress', label: '🔄 En Curso' },
                  { value: 'completed', label: '✅ Completadas' },
                  { value: 'cancelled', label: '❌ Canceladas' },
                ]}
                icon={<CheckCircle className="w-5 h-5" />}
                isSearchable={false}
                isClearable={false}
              />

              <DatePicker
                label="Fecha"
                selected={dateFilter}
                onChange={(date) => setDateFilter(date)}
                isClearable
                
              />

              <Button 
                onClick={handleFilter} 
                className="h-14 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: '#073372' }}
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar
              </Button>

              {(statusFilter || dateFilter) && (
                <Button 
                  onClick={clearFilters} 
                  variant="outline" 
                  className="h-14 border-2 font-semibold hover:bg-gray-50"
                  style={{ borderColor: '#F98613', color: '#F98613' }}
                >
                  Limpiar Filtros
                </Button>
              )}
            </div>
          </div>

          {/* Classes List */}
          {scheduledClasses.data.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <div 
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(7, 51, 114, 0.1)' }}
              >
                <Calendar className="w-10 h-10" style={{ color: '#073372', opacity: 0.5 }} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No hay clases</h3>
              <p className="text-gray-500">No tienes clases asignadas con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledClasses.data.map((scheduledClass) => {
                const statusConfig = getStatusConfig(scheduledClass.status);
                return (
                  <div 
                    key={scheduledClass.id} 
                    className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="flex items-stretch">
                      {/* Session Number */}
                      <div 
                        className="w-28 flex-shrink-0 flex flex-col items-center justify-center py-6"
                        style={{ backgroundColor: scheduledClass.template.academic_level?.color || '#073372' }}
                      >
                        <span className="text-4xl font-black text-white">{scheduledClass.template.session_number}</span>
                        <span className="text-xs text-white/80 uppercase font-semibold mt-1">Sesión</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg text-gray-900">{scheduledClass.template.title}</h3>
                              <Badge 
                                className="text-xs font-semibold px-3 py-1"
                                style={{ 
                                  backgroundColor: statusConfig.bgColor, 
                                  color: statusConfig.color,
                                  border: `1px solid ${statusConfig.borderColor}`
                                }}
                              >
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-3">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" style={{ color: '#073372' }} />
                                {formatDateTime(scheduledClass.scheduled_at)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" style={{ color: '#073372' }} />
                                {scheduledClass.template.duration_minutes} min
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" style={{ color: '#073372' }} />
                                {scheduledClass.enrollments_count}/{scheduledClass.max_students} aprendices
                              </span>
                              <Badge 
                                variant="outline"
                                className="font-semibold"
                                style={{ borderColor: scheduledClass.template.academic_level?.color, color: scheduledClass.template.academic_level?.color }}
                              >
                                {scheduledClass.template.academic_level?.name}
                              </Badge>
                            </div>

                            {/* Recording badge */}
                            {scheduledClass.recording_url && (
                              <div className="mt-3">
                                <Badge 
                                  className="text-white font-semibold"
                                  style={{ backgroundColor: '#F98613' }}
                                >
                                  <Film className="w-3 h-3 mr-1.5" />
                                  Con Grabación
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 ml-4">
                            {scheduledClass.status === 'scheduled' && (
                              <Button 
                                className="font-semibold text-white shadow-md hover:shadow-lg transition-all"
                                style={{ backgroundColor: '#F98613' }}
                                onClick={() => handleUpdateStatus(scheduledClass.id, 'in_progress')}
                              >
                                <Play className="w-4 h-4 mr-1.5" />
                                Iniciar
                              </Button>
                            )}
                            {scheduledClass.status === 'in_progress' && (
                              <Button 
                                className="font-semibold text-white shadow-md hover:shadow-lg transition-all"
                                style={{ backgroundColor: '#17BC91' }}
                                onClick={() => handleUpdateStatus(scheduledClass.id, 'completed')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                Completar
                              </Button>
                            )}
                            {scheduledClass.meet_url && (
                              <a href={scheduledClass.meet_url} target="_blank" rel="noopener noreferrer">
                                <Button 
                                  variant="outline"
                                  className="font-semibold"
                                  style={{ borderColor: '#073372', color: '#073372' }}
                                >
                                  <ExternalLink className="w-4 h-4 mr-1.5" />
                                  Meet
                                </Button>
                              </a>
                            )}
                            <Link href={`/teacher/my-classes/${scheduledClass.id}`}>
                              <Button 
                                variant="outline"
                                className="font-semibold text-gray-800"
                              >
                                Ver Detalle
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {scheduledClasses.last_page > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: scheduledClasses.last_page }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === scheduledClasses.current_page ? 'default' : 'outline'}
                  className={page === scheduledClasses.current_page 
                    ? 'font-bold text-white shadow-md' 
                    : 'font-semibold hover:bg-gray-50'
                  }
                  style={page === scheduledClasses.current_page 
                    ? { backgroundColor: '#073372' } 
                    : { borderColor: '#073372', color: '#073372' }
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
