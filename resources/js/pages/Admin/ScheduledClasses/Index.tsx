import React, { useState, useCallback } from 'react';
import { 
  Calendar, Plus, Trash2, Search, Users, Clock, 
  Play, CheckCircle, Filter, Eye, Film, Link2, ChevronLeft, ChevronRight
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { router, Link } from '@inertiajs/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select2 } from '@/components/ui/Select2';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

interface Props {
  scheduledClasses: {
    data: ScheduledClass[];
    current_page: number;
    last_page: number;
    total: number;
    links: PaginationLink[];
    from: number;
    to: number;
  };
  templates: ClassTemplate[];
  teachers: Teacher[];
  groups: Group[];
  filters: {
    status?: string;
    teacher_id?: string;
    date?: string;
  };
  classMaxStudents: number;
}

const ScheduledClassesIndex: React.FC<Props> = ({ 
  scheduledClasses, 
  templates, 
  teachers, 
  groups, 
  filters,
  classMaxStudents
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
    max_students: classMaxStudents || 6,
    notes: '',
  });

  const [recordingUrl, setRecordingUrl] = useState('');

  const applyFilters = useCallback((status: string, search: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (search) params.set('search', search); // If search is supported by backend, otherwise client filtering might be needed but paginations makes it hard. Assuming backend search or mainly status filter.
    // The original code only filtered by status, teacher_id, date. quickFilterText was client side in AgGrid.
    // Since we removed AgGrid, client side filtering on THIS page of data is easy, but global search requires backend.
    // For now, I'll keep client side filtering on the current page data for "quick filter".
    
    router.get(`/admin/scheduled-classes?${params.toString()}`, {}, {
      preserveState: true,
      replace: true,
    });
  }, []);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    applyFilters(value, '');
  };

  const handleCreate = () => {
    router.post('/admin/scheduled-classes', formData, {
      onSuccess: () => {
        toast.success('Grupo creado exitosamente');
        setShowCreateModal(false);
        setFormData({
          class_template_id: '',
          teacher_id: '',
          group_id: '',
          scheduled_at: '',
          meet_url: '',
          max_students: classMaxStudents || 6,
          notes: '',
        });
      },
      onError: () => {
        toast.error('Error al crear el grupo');
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
        description: 'Esta clase tiene aprendices inscritos'
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
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'; label: string; className?: string }> = {
      scheduled: { variant: 'outline', label: 'Programada', className: 'border-blue-200 text-blue-700 bg-blue-50' },
      in_progress: { variant: 'default', label: 'En curso', className: 'bg-green-600 hover:bg-green-700' },
      completed: { variant: 'secondary', label: 'Completada', className: 'bg-gray-100 text-gray-700' },
      cancelled: { variant: 'destructive', label: 'Cancelada', className: '' },
    };
    const config = variants[status] || variants.scheduled;
    // @ts-ignore
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return { border: 'border-l-blue-500', bg: 'bg-blue-50/30' };
      case 'in_progress': return { border: 'border-l-green-500', bg: 'bg-green-50/30' };
      case 'completed': return { border: 'border-l-gray-400', bg: 'bg-gray-50/50' };
      case 'cancelled': return { border: 'border-l-red-500', bg: 'bg-red-50/30' };
      default: return { border: 'border-l-gray-300', bg: 'bg-white' };
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' }),
      time: date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Client-side filtering for the current page (replicating AgGrid quick filter behavior partially)
  const filteredClasses = scheduledClasses.data.filter(sc => {
    if (!quickFilterText) return true;
    const search = quickFilterText.toLowerCase();
    return (
      sc.template.title.toLowerCase().includes(search) ||
      sc.teacher?.name.toLowerCase().includes(search) ||
      sc.template.academic_level.name.toLowerCase().includes(search)
    );
  });

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grupos de Clase</h1>
            <p className="text-gray-500 mt-1">Gestiona los grupos de clase, horarios y grabaciones</p>
          </div>
          <Button 
            className="bg-[#073372] hover:bg-[#052555] shadow-lg hover:shadow-xl transition-all"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Grupo
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2 self-center text-gray-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtros:</span>
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
                label="Buscar en esta página"
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                icon={<Search className="w-5 h-5" />}
                placeholder="Nombre, profesor o nivel..."
              />
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((sc) => {
              const { date, time } = formatDateTime(sc.scheduled_at);
              const isFull = sc.enrollments_count >= sc.max_students;
              const statusColors = getStatusColor(sc.status);
              
              return (
                <Card key={sc.id} className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-[6px] ${statusColors.border} ${statusColors.bg} border-t border-r border-b border-gray-200 shadow-sm`}>
                  
                  <CardHeader className="pb-3 pt-4 px-5 bg-white/60">
                    <div className="flex justify-between items-start gap-2">
                       <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200">
                               {sc.template?.academic_level?.name} • S{sc.template?.session_number}
                            </Badge>
                             <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: sc.template?.academic_level?.color || '#3B82F6' }}
                                title="Color de nivel"
                             />
                          </div>
                          <CardTitle className="text-lg font-bold text-gray-900 leading-tight line-clamp-2" title={sc.template.title}>
                             {sc.template.title}
                          </CardTitle>
                       </div>
                       <div className="flex-shrink-0">
                          {getStatusBadge(sc.status)}
                       </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="px-5 py-4 space-y-4 bg-white/40">
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex flex-col items-center justify-center flex-shrink-0 border border-blue-100">
                         <span className="text-[10px] font-bold text-blue-700 uppercase leading-none">{new Date(sc.scheduled_at).toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '')}</span>
                         <span className="text-lg font-bold text-blue-900 leading-none">{new Date(sc.scheduled_at).getDate()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium uppercase">Horario</span>
                        <span className="font-bold text-gray-900">{time}</span>
                        <span className="text-xs text-gray-500 capitalize">{new Date(sc.scheduled_at).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="flex flex-col p-2 rounded-md hover:bg-purple-50/50 transition-colors">
                          <div className="flex items-center gap-1.5 text-xs text-purple-700 font-medium mb-1">
                             <Users className="w-3.5 h-3.5" />
                             <span>Aprendices</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                             <span className={`text-lg font-bold ${isFull ? 'text-red-600' : 'text-gray-900'}`}>
                                {sc.enrollments_count}
                             </span>
                             <span className="text-xs text-gray-500">/ {sc.max_students}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                             <div 
                                className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-purple-500'}`}
                                style={{ width: `${Math.min((sc.enrollments_count / sc.max_students) * 100, 100)}%` }}
                             />
                          </div>
                       </div>

                       <div className="flex flex-col p-2 rounded-md hover:bg-orange-50/50 transition-colors">
                          <div className="flex items-center gap-1.5 text-xs text-orange-700 font-medium mb-1">
                             <Users className="w-3.5 h-3.5" />
                             <span>Instructor</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 truncate" title={sc.teacher?.name || 'Sin asignar'}>
                             {sc.teacher?.name ? sc.teacher.name.split(' ')[0] : 'Sin asignar'}
                          </span>
                          <span className="text-xs text-gray-500 truncate">
                             {sc.teacher?.name ? (sc.teacher.name.split(' ').slice(1).join(' ') || 'Teacher') : '-'}
                          </span>
                       </div>
                    </div>

                    {sc.recording_url && (
                       <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2">
                          <Film className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-green-700">Grabación disponible</span>
                       </div>
                    )}
                  </CardContent>

                  <CardFooter className="px-5 py-3 bg-white border-t border-gray-100 flex justify-between items-center gap-2">
                    <Link href={`/admin/scheduled-classes/${sc.id}`}>
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#073372] hover:bg-blue-50 -ml-2">
                        <Eye className="w-4 h-4 mr-1.5" />
                        Ver Detalles
                      </Button>
                    </Link>

                    <div className="flex gap-1">
                      {sc.status === 'scheduled' && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9 text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700 hover:border-green-300 transition-colors shadow-sm"
                          title="Iniciar clase"
                          onClick={() => handleUpdateStatus(sc, 'in_progress')}
                        >
                          <Play className="h-4 w-4 fill-current" />
                        </Button>
                      )}
                      
                      {sc.status === 'in_progress' && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-colors shadow-sm"
                          title="Marcar completada"
                          onClick={() => handleUpdateStatus(sc, 'completed')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {sc.status === 'completed' && !sc.recording_url && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9 text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:text-purple-700 hover:border-purple-300 transition-colors shadow-sm"
                          title="Agregar grabación"
                          onClick={() => {
                            setSelectedClass(sc);
                            setShowRecordingModal(true);
                          }}
                        >
                          <Film className="h-4 w-4" />
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                             <Trash2 className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              onClick={() => handleDelete(sc)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar Clase
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardFooter>
                </Card>
              );
            })
          ) : (
             <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <Search className="w-12 h-12 mb-3 text-gray-300" />
                <p className="font-medium text-lg">No se encontraron clases</p>
                <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
             </div>
          )}
        </div>

        {/* Pagination */}
        {scheduledClasses.total > scheduledClasses.data.length && (
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Mostrando {scheduledClasses.from} a {scheduledClasses.to} de {scheduledClasses.total} clases
              </div>
              <div className="flex gap-2">
                 {scheduledClasses.links.map((link, i) => {
                    // Simple pagination logic for prev/next
                    if (link.label.includes('&laquo;') || link.label.includes('Previous')) {
                       return (
                          <Button 
                            key={i} 
                            variant="outline" 
                            size="icon" 
                            disabled={!link.url}
                            onClick={() => link.url && router.visit(link.url)}
                          >
                             <ChevronLeft className="w-4 h-4" />
                          </Button>
                       );
                    }
                    if (link.label.includes('&raquo;') || link.label.includes('Next')) {
                       return (
                          <Button 
                             key={i} 
                             variant="outline" 
                             size="icon" 
                             disabled={!link.url}
                             onClick={() => link.url && router.visit(link.url)}
                          >
                             <ChevronRight className="w-4 h-4" />
                          </Button>
                       );
                    }
                    return null; // Don't show numeric links for simplicity in this card view, or could add them.
                 })}
                 {/* Alternative: Numbered pagination */}
                 <div className="hidden sm:flex gap-1">
                   {scheduledClasses.links.filter(l => !l.label.includes('Previous') && !l.label.includes('Next')).map((link, i) => {
                      if (link.label === '...') {
                        return <span key={i} className="px-2 py-2">...</span>;
                      }
                      return (
                         <Button
                            key={i}
                            variant={link.active ? 'default' : 'outline'}
                            size="sm"
                            className={link.active ? 'bg-[#073372]' : ''}
                            onClick={() => link.url && router.visit(link.url)}
                         >
                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                         </Button>
                      )
                   })}
                 </div>
              </div>
           </div>
        )}

        {/* Modal Crear Grupo */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Grupo</DialogTitle>
              <DialogDescription>
                Crea un nuevo grupo de clase basado en una plantilla
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
                  label="Instructor"
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
                  label="Máx. Aprendices"
                  type="number"
                  min={1}
                  max={50}
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
                Crear Grupo
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
                helperText="Esta grabación reemplazará el video de introducción para los aprendices inscritos"
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
