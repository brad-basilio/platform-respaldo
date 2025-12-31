/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { 
  Calendar, Check, X, Clock, Filter, Search, 
  BookOpen, UserPlus, CalendarPlus, AlertCircle
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select2 } from '@/components/ui/Select2';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface StudentProfile {
  academic_level?: AcademicLevel;
}

interface User {
  id: number;
  name: string;
  email: string;
  student_profile?: StudentProfile;
}

interface ClassTemplate {
  id: number;
  title: string;
  session_number: string;
  academic_level: AcademicLevel;
}

interface ScheduledClass {
  id: number;
  scheduled_at: string;
  max_students: number;
  enrollments_count: number;
  teacher?: { id: number; name: string };
}

interface ClassRequest {
  id: number;
  student_id: number;
  class_template_id: number;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  student_message?: string;
  admin_response?: string;
  requested_datetime?: string;
  target_scheduled_class?: ScheduledClass;
  created_at: string;
  processed_at?: string;
  student: User;
  template: ClassTemplate;
  scheduled_class?: ScheduledClass;
  processed_by?: User;
}

interface Teacher {
  id: number;
  name: string;
  email: string;
}

interface ActiveGroup {
  id: number;
  scheduled_at: string;
  teacher_name?: string;
  enrollments_count: number;
  max_students: number;
  available_slots: number;
}

interface Props {
  requests: {
    data: ClassRequest[];
    current_page: number;
    last_page: number;
    total: number;
  };
  academicLevels: AcademicLevel[];
  teachers: Teacher[];
  filters: {
    status?: string;
    level_id?: string;
  };
  counts: {
    pending: number;
    approved: number;
    scheduled: number;
    rejected: number;
  };
  activeGroups: Record<number, ActiveGroup[]>;
}

const ClassRequestsIndex: React.FC<Props> = ({ 
  requests, 
  academicLevels, 
  teachers,
  filters, 
  counts,
  activeGroups = {}
}) => {
  const [quickFilterText, setQuickFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState(filters.status || 'pending');
  const [levelFilter, setLevelFilter] = useState(filters.level_id || '');
  
  // Modales
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ClassRequest | null>(null);
  const [availableClasses, setAvailableClasses] = useState<ScheduledClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  
  // Form data
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_at: '',
    teacher_id: '',
    meet_url: '',
    max_students: 6,
  });
  const [rejectReason, setRejectReason] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const applyFilters = (status: string, levelId: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (levelId) params.set('level_id', levelId);
    
    router.get(`/admin/class-requests?${params.toString()}`, {}, {
      preserveState: true,
      replace: true,
    });
  };

  const handleApprove = (request: ClassRequest) => {
    router.post(`/admin/class-requests/${request.id}/approve`, {}, {
      onSuccess: () => toast.success('Solicitud aprobada'),
      onError: () => toast.error('Error al aprobar'),
    });
  };

  const openRejectModal = (request: ClassRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('Debes indicar un motivo de rechazo');
      return;
    }

    router.post(`/admin/class-requests/${selectedRequest.id}/reject`, {
      response: rejectReason,
    }, {
      onSuccess: () => {
        toast.success('Solicitud rechazada');
        setShowRejectModal(false);
      },
      onError: () => toast.error('Error al rechazar'),
    });
  };

  const openScheduleModal = (request: ClassRequest) => {
    setSelectedRequest(request);
    
    // Pre-fill with requested datetime if available
    let scheduledAt = '';
    if (request.requested_datetime) {
      const date = new Date(request.requested_datetime);
      // Format for datetime-local input: YYYY-MM-DDTHH:MM
      scheduledAt = date.toISOString().slice(0, 16);
    }
    
    setScheduleForm({
      scheduled_at: scheduledAt,
      teacher_id: '',
      meet_url: '',
      max_students: 6,
    });
    setShowScheduleModal(true);
  };

  const handleSchedule = () => {
    if (!selectedRequest || !scheduleForm.scheduled_at) {
      toast.error('Debes seleccionar fecha y hora');
      return;
    }

    router.post(`/admin/class-requests/${selectedRequest.id}/schedule`, scheduleForm, {
      onSuccess: () => {
        toast.success('Clase programada y estudiante inscrito');
        setShowScheduleModal(false);
      },
      onError: () => toast.error('Error al programar clase'),
    });
  };

  const openAssignModal = async (request: ClassRequest) => {
    setSelectedRequest(request);
    // Pre-select the group if student requested a specific one
    setSelectedClassId(request.target_scheduled_class ? String(request.target_scheduled_class.id) : '');
    setLoadingClasses(true);
    setShowAssignModal(true);

    try {
      const response = await fetch(`/api/admin/class-templates/${request.class_template_id}/available-classes`);
      const data = await response.json();
      setAvailableClasses(data);
    } catch {
      toast.error('Error al cargar clases disponibles');
      setAvailableClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleAssignToExisting = () => {
    if (!selectedRequest || !selectedClassId) {
      toast.error('Debes seleccionar una clase');
      return;
    }

    router.post(`/admin/class-requests/${selectedRequest.id}/assign-existing`, {
      scheduled_class_id: selectedClassId,
    }, {
      onSuccess: () => {
        toast.success('Estudiante asignado a la clase');
        setShowAssignModal(false);
      },
      onError: () => toast.error('Error al asignar'),
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className?: string }> = {
      pending: { variant: 'outline', label: 'Pendiente', className: 'border-orange-300 text-orange-600 bg-orange-50' },
      approved: { variant: 'default', label: 'Aprobada', className: 'bg-cyan-600' },
      scheduled: { variant: 'secondary', label: 'Programada', className: 'bg-green-600 text-white' },
      rejected: { variant: 'destructive', label: 'Rechazada' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columnDefs = useMemo<ColDef<ClassRequest>[]>(() => [
    {
      headerName: 'Estudiante',
      flex: 1,
      minWidth: 200,
      cellRenderer: (params: any) => {
        const req = params.data;
        return (
          <div className="flex items-center gap-3 py-2 h-full">
            <div className="w-10 h-10 rounded-full bg-[#073372] flex items-center justify-center text-white font-semibold">
              {req.student?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{req.student?.name}</div>
              <div className="text-xs text-gray-500 truncate">{req.student?.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Clase Solicitada',
      flex: 1,
      minWidth: 220,
      cellRenderer: (params: any) => {
        const req = params.data;
        const templateGroups = activeGroups[req.template?.id] || [];
        const hasAvailableGroups = templateGroups.length > 0;
        const totalSlots = templateGroups.reduce((sum, g) => sum + g.available_slots, 0);
        
        return (
          <div className="flex items-center gap-3 h-full">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 relative"
              style={{ backgroundColor: req.template?.academic_level?.color || '#3B82F6' }}
            >
              <BookOpen className="w-5 h-5 text-white" />
              {hasAvailableGroups && req.status !== 'scheduled' && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {templateGroups.length}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{req.template?.title}</div>
              <div className="text-xs text-gray-500">
                {req.template?.academic_level?.name} • Sesión {req.template?.session_number}
              </div>
              {hasAvailableGroups && req.status !== 'scheduled' && (
                <div className="text-xs text-green-600 font-medium">
                  {templateGroups.length} grupo{templateGroups.length > 1 ? 's' : ''} • {totalSlots} cupos
                </div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Solicitud',
      width: 220,
      cellRenderer: (params: any) => {
        const req = params.data;
        const hasRequestedTime = !!req.requested_datetime;
        const wantsToJoinGroup = !!req.target_scheduled_class;
        
        // Caso: Sin preferencia específica (ni horario ni grupo)
        if (!hasRequestedTime && !wantsToJoinGroup) {
          return (
            <div className="flex flex-col justify-center h-full py-1">
              <div className="flex items-center gap-1">
                <CalendarPlus className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500">
                  Sin preferencia horaria
                </span>
              </div>
              {req.student_message && (
                <span className="text-xs text-gray-500 truncate" title={req.student_message}>
                  "{req.student_message}"
                </span>
              )}
            </div>
          );
        }
        
        return (
          <div className="flex flex-col justify-center h-full py-1">
            {wantsToJoinGroup ? (
              <div className="flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                <span className="text-xs font-medium text-purple-700">
                  Unirse a grupo
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <CalendarPlus className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span className="text-xs font-medium text-blue-700">
                  Nueva clase
                </span>
              </div>
            )}
            {hasRequestedTime && (
              <span className="text-xs text-gray-600 font-medium">
                📅 {new Date(req.requested_datetime!).toLocaleDateString('es-PE', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
            {wantsToJoinGroup && req.target_scheduled_class?.scheduled_at && (
              <span className="text-xs text-purple-600">
                📅 {new Date(req.target_scheduled_class.scheduled_at).toLocaleDateString('es-PE', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
            {wantsToJoinGroup && req.target_scheduled_class?.teacher && (
              <span className="text-xs text-gray-500 truncate">
                Prof: {req.target_scheduled_class.teacher.name}
              </span>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Fecha',
      field: 'created_at',
      width: 140,
      sort: 'desc',
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{formatDate(params.value)}</span>
        </div>
      )
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
      headerName: 'Acciones',
      width: 220,
      pinned: 'right',
      cellRenderer: (params: any) => {
        const req = params.data;
        const templateGroups = activeGroups[req.template?.id] || [];
        const hasAvailableGroups = templateGroups.length > 0;
        
        // Determinar qué pidió el estudiante
        const wantsToJoinGroup = !!req.target_scheduled_class;
        const wantsNewClass = !!req.requested_datetime && !req.target_scheduled_class;
        
        if (req.status === 'pending') {
          return (
            <div className="flex items-center gap-1 h-full">
              {/* Priorizar según la preferencia del estudiante */}
              {wantsToJoinGroup ? (
                // El estudiante quiere unirse a un grupo específico
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs px-2"
                    title="Unir al grupo solicitado"
                    onClick={() => openAssignModal(req)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Unir
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-blue-600"
                    title="Crear nuevo grupo en su lugar"
                    onClick={() => openScheduleModal(req)}
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                </>
              ) : wantsNewClass ? (
                // El estudiante quiere una nueva clase
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2"
                    title="Crear nuevo grupo"
                    onClick={() => openScheduleModal(req)}
                  >
                    <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                    Crear
                  </Button>
                  {hasAvailableGroups && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-purple-600"
                      title="Unir a grupo existente en su lugar"
                      onClick={() => openAssignModal(req)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : hasAvailableGroups ? (
                // Solicitud libre - hay grupos disponibles
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs px-2"
                    title="Unir a grupo existente"
                    onClick={() => openAssignModal(req)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Unir
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-blue-600"
                    title="Crear nuevo grupo"
                    onClick={() => openScheduleModal(req)}
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                // Solicitud libre - no hay grupos disponibles
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2"
                  title="Crear nuevo grupo"
                  onClick={() => openScheduleModal(req)}
                >
                  <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                  Crear
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-600"
                title="Rechazar"
                onClick={() => openRejectModal(req)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        }

        if (req.status === 'approved') {
          return (
            <div className="flex items-center gap-1 h-full">
              {wantsToJoinGroup ? (
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs px-2"
                    title="Unir al grupo solicitado"
                    onClick={() => openAssignModal(req)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Unir a Grupo
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-blue-600"
                    title="Crear nuevo grupo"
                    onClick={() => openScheduleModal(req)}
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                </>
              ) : wantsNewClass ? (
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2"
                    title="Crear nuevo grupo"
                    onClick={() => openScheduleModal(req)}
                  >
                    <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                    Crear Grupo
                  </Button>
                  {hasAvailableGroups && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-purple-600"
                      title="Unir a grupo existente"
                      onClick={() => openAssignModal(req)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : hasAvailableGroups ? (
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs px-2"
                    title="Unir a grupo existente"
                    onClick={() => openAssignModal(req)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Unir a Grupo
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-blue-600"
                    title="Crear nuevo grupo"
                    onClick={() => openScheduleModal(req)}
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2"
                  title="Crear nuevo grupo"
                  onClick={() => openScheduleModal(req)}
                >
                  <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                  Crear Grupo
                </Button>
              )}
            </div>
          );
        }

        if (req.status === 'scheduled' && req.scheduled_class) {
          return (
            <div className="flex items-center gap-2 h-full">
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDate(req.scheduled_class.scheduled_at)}
              </Badge>
            </div>
          );
        }

        if (req.status === 'rejected') {
          return (
            <div className="flex items-center h-full">
              <span className="text-xs text-gray-500 truncate" title={req.admin_response || ''}>
                {req.admin_response || 'Rechazada'}
              </span>
            </div>
          );
        }

        return null;
      }
    },
  ], [activeGroups]);

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
            <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Clases</h1>
            <p className="text-gray-500 mt-1">Gestiona las solicitudes de clases de los estudiantes</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button 
            onClick={() => { setStatusFilter('pending'); applyFilters('pending', levelFilter); }}
            className={`p-4 rounded-lg border transition-all ${
              statusFilter === 'pending' 
                ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-200' 
                : 'border-gray-200 bg-white hover:border-orange-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-gray-900">{counts.pending}</div>
                <div className="text-sm text-gray-500">Pendientes</div>
              </div>
            </div>
          </button>

          <button 
            onClick={() => { setStatusFilter('approved'); applyFilters('approved', levelFilter); }}
            className={`p-4 rounded-lg border transition-all ${
              statusFilter === 'approved' 
                ? 'border-cyan-300 bg-cyan-50 ring-2 ring-cyan-200' 
                : 'border-gray-200 bg-white hover:border-cyan-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-gray-900">{counts.approved}</div>
                <div className="text-sm text-gray-500">Aprobadas</div>
              </div>
            </div>
          </button>

          <button 
            onClick={() => { setStatusFilter('scheduled'); applyFilters('scheduled', levelFilter); }}
            className={`p-4 rounded-lg border transition-all ${
              statusFilter === 'scheduled' 
                ? 'border-green-300 bg-green-50 ring-2 ring-green-200' 
                : 'border-gray-200 bg-white hover:border-green-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-gray-900">{counts.scheduled}</div>
                <div className="text-sm text-gray-500">Programadas</div>
              </div>
            </div>
          </button>

          <button 
            onClick={() => { setStatusFilter('rejected'); applyFilters('rejected', levelFilter); }}
            className={`p-4 rounded-lg border transition-all ${
              statusFilter === 'rejected' 
                ? 'border-red-300 bg-red-50 ring-2 ring-red-200' 
                : 'border-gray-200 bg-white hover:border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-gray-900">{counts.rejected}</div>
                <div className="text-sm text-gray-500">Rechazadas</div>
              </div>
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2 self-center">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Filtros:</span>
            </div>
            
            <div className="w-52">
              <Select2
                label="Nivel Académico"
                value={levelFilter}
                onChange={(value) => { setLevelFilter(value as string); applyFilters(statusFilter, value as string); }}
                options={[
                  { value: '', label: 'Todos los niveles' },
                  ...academicLevels.map(level => ({
                    value: String(level.id),
                    label: level.name
                  }))
                ]}
                isSearchable={false}
                isClearable={false}
              />
            </div>

            <div className="flex-1 max-w-md ml-auto">
              <Input
                label="Buscar solicitudes"
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="ag-theme-quartz" style={{ height: 'calc(100vh - 420px)', width: '100%' }}>
            <AgGridReact<ClassRequest>
              rowData={requests.data}
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

        {/* Modal Programar Clase */}
        {showScheduleModal && selectedRequest && (
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowScheduleModal(false)}
          >
            <div 
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-6 py-5 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <CalendarPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Crear Nuevo Grupo</h3>
                    <p className="text-blue-100 text-sm">
                      Para: {selectedRequest.student.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900">{selectedRequest.template.title}</h4>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.template.academic_level.name} • Sesión {selectedRequest.template.session_number}
                  </p>
                </div>

                {/* Show student request info if available */}
                {(selectedRequest.requested_datetime || selectedRequest.target_scheduled_class) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-800 mb-1">📋 Solicitud del estudiante:</p>
                    {selectedRequest.target_scheduled_class ? (
                      <p className="text-sm text-blue-700">
                        Quiere unirse a grupo existente
                        {selectedRequest.target_scheduled_class.teacher && (
                          <span> (Prof. {selectedRequest.target_scheduled_class.teacher.name})</span>
                        )}
                      </p>
                    ) : selectedRequest.requested_datetime ? (
                      <p className="text-sm text-blue-700">
                        Horario solicitado: {new Date(selectedRequest.requested_datetime).toLocaleDateString('es-PE', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fecha y Hora *</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.scheduled_at}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    className="w-full h-14 px-3 pt-4 pb-1 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:border-2 focus:border-[#073372] hover:border-gray-900 transition-all duration-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select2
                    label="Instructor"
                    value={scheduleForm.teacher_id}
                    onChange={(value) => setScheduleForm(prev => ({ ...prev, teacher_id: value as string }))}
                    options={teachers.map(t => ({
                      value: String(t.id),
                      label: t.name
                    }))}
                    placeholder="Seleccionar"
                    isClearable
                  />

                  <Input
                    label="Máx. Estudiantes"
                    type="number"
                    min={1}
                    max={20}
                    value={scheduleForm.max_students}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, max_students: Number(e.target.value) }))}
                  />
                </div>

                <Input
                  label="URL de Meet/Zoom"
                  type="url"
                  value={scheduleForm.meet_url}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, meet_url: e.target.value }))}
                />
              </div>

              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 border-t">
                <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSchedule} className="bg-[#073372] hover:bg-[#052555]">
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Crear Grupo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Rechazar */}
        {showRejectModal && selectedRequest && (
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <div 
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <X className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Rechazar Solicitud</h3>
                    <p className="text-red-100 text-sm">
                      De: {selectedRequest.student.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900">{selectedRequest.template.title}</h4>
                </div>

                <Textarea
                  label="Motivo del rechazo"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explica al estudiante por qué se rechaza su solicitud..."
                  rows={3}
                  required
                />
              </div>

              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 border-t">
                <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleReject} variant="destructive">
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Unir a Grupo Existente */}
        {showAssignModal && selectedRequest && (
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAssignModal(false)}
          >
            <div 
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-purple-600 to-[#17BC91] px-6 py-5 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Unir a Grupo Existente</h3>
                    <p className="text-blue-100 text-sm">
                      Estudiante: {selectedRequest.student.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900">{selectedRequest.template.title}</h4>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.template.academic_level.name} • Sesión {selectedRequest.template.session_number}
                  </p>
                </div>

                {/* Show if student requested a specific group */}
                {selectedRequest.target_scheduled_class && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-purple-800 mb-1">📋 El estudiante solicitó unirse a:</p>
                    <p className="text-sm text-purple-700">
                      {new Date(selectedRequest.target_scheduled_class.scheduled_at).toLocaleDateString('es-PE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {selectedRequest.target_scheduled_class.teacher && (
                        <span className="font-medium"> - Prof. {selectedRequest.target_scheduled_class.teacher.name}</span>
                      )}
                    </p>
                  </div>
                )}

                {loadingClasses ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#073372] mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Cargando clases disponibles...</p>
                  </div>
                ) : availableClasses.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600">No hay grupos disponibles con cupo</p>
                    <p className="text-sm text-gray-500 mt-1">Crea un nuevo grupo para este estudiante</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Seleccionar grupo</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableClasses.map((sc) => (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => setSelectedClassId(String(sc.id))}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            selectedClassId === String(sc.id)
                              ? 'border-[#073372] bg-blue-50 ring-2 ring-[#073372]/20'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatDate(sc.scheduled_at)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {sc.teacher?.name || 'Sin instructor'} • {sc.enrollments_count}/{sc.max_students} alumnos
                              </div>
                            </div>
                            <Badge variant="outline" className={
                              sc.enrollments_count < sc.max_students ? 'text-green-600' : 'text-red-600'
                            }>
                              {sc.max_students - sc.enrollments_count} cupos
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 border-t">
                <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAssignToExisting} 
                  disabled={!selectedClassId || availableClasses.length === 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Unir al Grupo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default ClassRequestsIndex;
