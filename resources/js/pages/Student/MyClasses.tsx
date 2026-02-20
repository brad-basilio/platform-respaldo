import React, { useState, useMemo } from 'react';
import { BookOpen, CheckCircle, Clock, PlayCircle, Send, Eye, FileQuestion, FileText, AlertCircle, Lock, ChevronRight, Trophy, Target, Zap, Star, Video, Loader2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';

interface AcademicLevel {
  id: number;
  name: string;
  color?: string;
}

interface ClassTemplate {
  id: number;
  title: string;
  session_number: string;
  description?: string;
  intro_video_url?: string;
  has_exam: boolean;
  duration_minutes: number;
  questions_count: number;
  exam_questions_count: number;
  resources_count: number;
  academic_level: AcademicLevel;
}

interface ScheduledClass {
  id: number;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  meet_url?: string;
  recording_url?: string;
  teacher?: { id: number; name: string };
  type: 'regular' | 'practice';
}

interface ClassRequest {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  type: 'regular' | 'practice';
  requested_datetime?: string;
  student_message?: string;
  admin_response?: string;
  created_at: string;
}

interface SessionStat {
  regular_enrolled: boolean;
  regular_completed: boolean;
  regular_status: string | null;
  regular_session: ScheduledClass | null;
  practice_count: number;
  practice_completed_count: number;
  practice_sessions: ScheduledClass[];
  pending_request: ClassRequest | null;
}

interface PracticeSettings {
  min_required: number;
  max_allowed: number;
}

interface StudentInfo {
  studentType: 'regular' | 'daily' | 'weekly';
  isVerified: boolean;
}

interface ClassConfig {
  min_advance_hours: number;
  max_advance_hours: number;
  operation_start_hour: number;
  operation_end_hour: number;
}

interface AvailableClass {
  id: number;
  scheduled_at: string;
  teacher: { id: number; name: string } | null;
  enrolled_count: number;
  max_students: number;
  available_spots: number;
}

interface Props {
  templates: ClassTemplate[];
  sessionStats: Record<number, SessionStat>; // keyed by template_id
  studentInfo: StudentInfo;
  academicLevel?: AcademicLevel;
  practiceSettings: PracticeSettings;
  message?: string;
}

const StudentMyClasses: React.FC<Props> = ({ 
  templates, 
  sessionStats, 
  studentInfo,
  academicLevel,
  practiceSettings,
  message 
}) => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'regular' | 'practice'>('regular');
  const [selectedTemplate, setSelectedTemplate] = useState<ClassTemplate | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // States for scheduling (copied from ClassTemplateView logic)
  const [classConfig, setClassConfig] = useState<ClassConfig | null>(null);
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [preferredDatetime, setPreferredDatetime] = useState<string>('');

  // Ordenar templates por session_number
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      const numA = parseInt(a.session_number) || 0;
      const numB = parseInt(b.session_number) || 0;
      return numA - numB;
    });
  }, [templates]);

  // Verificar si una sesión está completada (Regular OK + Prácticas Mínimas OK)
  const isSessionCompleted = (templateId: number): boolean => {
    const stats = sessionStats[templateId];
    if (!stats) return false;
    
    // Debe haber completado la clase regular
    if (!stats.regular_completed) return false;
    
    // Debe haber completado el mínimo de prácticas
    return stats.practice_completed_count >= practiceSettings.min_required;
  };

  // Verificar si una sesión está desbloqueada (puede ser solicitada)
  const isSessionUnlocked = (template: ClassTemplate): boolean => {
    const sessionNum = parseInt(template.session_number) || 0;
    
    // La sesión 1 siempre está desbloqueada
    if (sessionNum <= 1) return true;
    
    // Buscar la sesión anterior
    const previousSession = sortedTemplates.find(t => {
      const num = parseInt(t.session_number) || 0;
      return num === sessionNum - 1;
    });
    
    // Si no hay sesión anterior, está desbloqueada
    if (!previousSession) return true;
    
    // La sesión anterior debe estar COMPLETAMENTE completada (incluyendo prácticas)
    return isSessionCompleted(previousSession.id);
  };

  // Calcular progreso
  const completedCount = Object.values(sessionStats).filter(s => 
    s.regular_completed && s.practice_completed_count >= practiceSettings.min_required
  ).length;
  const totalCount = templates.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Calcular siguiente sesión a tomar
  const nextSession = useMemo(() => {
    for (const template of sortedTemplates) {
      if (!isSessionCompleted(template.id)) {
        return template;
      }
    }
    return null;
  }, [sortedTemplates, sessionStats]);

  const useRegularFlow = studentInfo.studentType === 'regular' && studentInfo.isVerified;
  const useDailyFlow = studentInfo.studentType === 'daily' && studentInfo.isVerified;
  const useWeeklyFlow = studentInfo.studentType === 'weekly' && studentInfo.isVerified;

  // Next slot calculation logic
  const nextAvailableSlot = useMemo(() => {
    if (!classConfig) return null;
    const now = new Date();
    const { min_advance_hours, operation_start_hour, operation_end_hour } = classConfig;
    let slotHour = now.getHours() + min_advance_hours;
    if (now.getMinutes() > 0) slotHour += 1;
    const slot = new Date(now);
    slot.setHours(slotHour, 0, 0, 0);
    if (slot.getHours() >= operation_end_hour) {
      slot.setDate(slot.getDate() + 1);
      slot.setHours(operation_start_hour, 0, 0, 0);
    }
    if (slot.getHours() < operation_start_hour) {
      slot.setHours(operation_start_hour, 0, 0, 0);
    }
    return slot;
  }, [classConfig]);

  const toLocalISOString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Effects for data fetching (Modal logic)
  React.useEffect(() => {
    if (showRequestModal && (useRegularFlow || useDailyFlow || useWeeklyFlow)) {
      axios.get('/api/student/class-config')
        .then((res: any) => setClassConfig(res.data))
        .catch(err => console.error('Error loading class config:', err));
    }
  }, [showRequestModal, useRegularFlow, useDailyFlow, useWeeklyFlow]);

  React.useEffect(() => {
    if (showRequestModal && useRegularFlow && nextAvailableSlot && selectedTemplate) {
      setLoadingClasses(true);
      axios.get(`/api/student/available-classes/${selectedTemplate.id}`, {
        params: { datetime: toLocalISOString(nextAvailableSlot) }
      })
        .then((res: any) => {
          const classes = res.data.classes || [];
          setAvailableClasses(classes);
          const available = classes.find((c: any) => c.available_spots > 0);
          if (available) setSelectedClassId(available.id);
        })
        .finally(() => setLoadingClasses(false));
    }
  }, [showRequestModal, useRegularFlow, nextAvailableSlot, selectedTemplate]);

  const handleRequestClass = (template: ClassTemplate, type: 'regular' | 'practice' = 'regular') => {
    setSelectedTemplate(template);
    setRequestType(type);
    setRequestMessage('');
    setSelectedClassId(null);
    setPreferredDatetime('');
    setShowRequestModal(true);
  };

  const submitRequest = () => {
    if (!selectedTemplate) return;
    
    setSubmitting(true);
    
    let requestedDatetime: string | null = null;
    let targetClassId: number | null = null;

    if (useRegularFlow) {
      if (selectedClassId) {
        const selectedClass = availableClasses.find(c => c.id === selectedClassId);
        requestedDatetime = selectedClass?.scheduled_at || null;
        targetClassId = selectedClassId;
      } else if (nextAvailableSlot) {
        requestedDatetime = toLocalISOString(nextAvailableSlot);
      }
    } else if ((useDailyFlow || useWeeklyFlow) && preferredDatetime) {
      requestedDatetime = preferredDatetime;
      if (selectedClassId) targetClassId = selectedClassId;
    }

    router.post('/student/class-requests', {
      class_template_id: selectedTemplate.id,
      type: requestType,
      message: requestMessage,
      requested_datetime: requestedDatetime,
      target_scheduled_class_id: targetClassId,
    }, {
      onSuccess: () => {
        toast.success(targetClassId ? '¡Inscripción exitosa!' : 'Solicitud enviada exitosamente');
        setShowRequestModal(false);
      },
      onError: (errors) => {
        const errorMsg = Object.values(errors)[0] as string || 'Error al enviar solicitud';
        toast.error(errorMsg);
      },
      onFinish: () => setSubmitting(false),
    });
  };

  const cancelRequest = (requestId: number) => {
    if (confirm('¿Estás seguro de cancelar esta solicitud?')) {
      router.delete(`/student/class-requests/${requestId}`, {
        onSuccess: () => toast.success('Solicitud cancelada'),
        onError: () => toast.error('Error al cancelar'),
      });
    }
  };

  const getTemplateStatus = (template: ClassTemplate) => {
    const stats = sessionStats[template.id];
    const unlocked = isSessionUnlocked(template);

    // Si está bloqueada
    if (!unlocked) {
      return { type: 'locked', label: 'Bloqueada', color: 'bg-gray-300', icon: Lock };
    }

    if (stats) {
      if (stats.regular_completed && stats.practice_completed_count >= practiceSettings.min_required) {
        return { type: 'completed', label: 'Completada', color: 'bg-emerald-500', icon: CheckCircle };
      }
      if (stats.regular_completed) {
        return { type: 'practices_pending', label: `Prácticas (${stats.practice_completed_count}/${practiceSettings.min_required})`, color: 'bg-cyan-500', icon: Zap };
      }
      if (stats.regular_enrolled && !stats.regular_completed) {
        if (stats.regular_status === 'in_progress') {
          return { type: 'in_progress', label: 'En curso', color: 'bg-blue-500', icon: PlayCircle };
        }
        return { type: 'scheduled', label: 'Programada', color: 'bg-violet-500', icon: Clock };
      }
      if (stats.pending_request) {
        const request = stats.pending_request;
        if (request.status === 'pending') {
          return { type: 'request_pending', label: 'En revisión', color: 'bg-orange-500', icon: Clock };
        }
        if (request.status === 'approved') {
          return { type: 'request_approved', label: 'Aprobada', color: 'bg-cyan-500', icon: CheckCircle };
        }
      }
    }

    return { type: 'available', label: 'Disponible', color: 'bg-gray-400', icon: Target };
  };

  if (message) {
    return (
      <AuthenticatedLayout>
        <Head title="Mis Clases" />
        <div className="max-w-5xl mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
              <p className="text-gray-600">Contacta con tu asesor para más información.</p>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="Mis Clases" />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Hero Header */}
        <div className="bg-gradient-to-r  text-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Title and Level */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-[#073372]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Mi Ruta de Aprendizaje</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-white/20 hover:bg-white/30 text-[#073372] border-0">
                      {academicLevel?.name || 'Sin nivel asignado'}
                    </Badge>
                    <span className="text-[#073372] text-sm">
                      • {totalCount} sesiones en total
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Progress Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold">{completedCount}</div>
                  <div className="text-[#073372] text-sm">Completadas</div>
                </div>
                <div className="w-px h-12 bg-white/30" />
                <div className="text-center">
                  <div className="text-4xl font-bold">{totalCount - completedCount}</div>
                  <div className="text-[#073372] text-sm">Pendientes</div>
                </div>
                <div className="w-px h-12 bg-black/30" />
                <div className="text-center">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="rgba(0,115,114,0.2)"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="#073372"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${progressPercentage * 2.2} 220`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">{progressPercentage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Next Session Card */}
          {nextSession && !isSessionCompleted(nextSession.id) && (
            <div className="mb-8">
              <Card className="border-2 border-[#17BC91] bg-gradient-to-r from-emerald-50 to-teal-50 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-5 h-5 text-[#17BC91]" />
                        <span className="text-sm font-semibold text-[#17BC91] uppercase tracking-wide">
                          Tu siguiente paso
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {sessionStats[nextSession.id]?.regular_completed 
                          ? `Refuerzo: Prácticas de Sesión ${nextSession.session_number}`
                          : `Sesión ${nextSession.session_number}: ${nextSession.title}`
                        }
                      </h3>
                      {sessionStats[nextSession.id]?.regular_completed && (
                         <div className="mb-4 p-3 bg-cyan-100/50 rounded-lg border border-cyan-200">
                           <p className="text-sm text-cyan-800 font-medium">
                             Has completado la teoría. Ahora debes realizar al menos {practiceSettings.min_required} prácticas para avanzar a la siguiente sesión.
                             <span className="block mt-1 font-bold">Llevas: {sessionStats[nextSession.id].practice_completed_count} / {practiceSettings.min_required}</span>
                           </p>
                         </div>
                      )}
                      {nextSession.description && !sessionStats[nextSession.id]?.regular_completed && (
                        <p className="text-gray-600 mb-4 line-clamp-2">{nextSession.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {nextSession.duration_minutes} min
                        </span>
                        {nextSession.has_exam && (
                          <span className="flex items-center gap-1">
                            <FileQuestion className="w-4 h-4" />
                            {nextSession.exam_questions_count} preguntas
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                          const stats = sessionStats[nextSession.id];
                          
                          // Buscar práctica agendada para hoy
                          const activePractice = stats?.practice_sessions.find(ps => {
                            const psDateStr = new Date(ps.scheduled_at).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                            return psDateStr === todayStr && ps.status === 'scheduled';
                          });

                          // Buscar solicitud de práctica pendiente para hoy
                          const pendingPracticeToday = stats?.pending_request?.type === 'practice' && 
                                 stats.pending_request.requested_datetime && 
                                 new Date(stats.pending_request.requested_datetime).toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) === todayStr;

                          if (stats?.regular_completed) {
                            if (activePractice) {
                              return (
                                <div className="w-full bg-cyan-50 rounded-xl border-2 border-cyan-200 p-4 animate-pulse-subtle">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Zap className="w-4 h-4 text-cyan-600" />
                                      <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Práctica para hoy</span>
                                    </div>
                                    <Badge className="bg-cyan-500 text-white border-0 text-[10px]">Confirmado</Badge>
                                  </div>
                                  <p className="text-gray-900 font-bold text-sm mb-3">
                                    {new Date(activePractice.scheduled_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                    {activePractice.teacher?.name && ` - Prof. ${activePractice.teacher.name}`}
                                  </p>
                                  {activePractice.meet_url ? (
                                    <Button 
                                      className="w-full bg-[#17BC91] hover:bg-[#14a77f] text-white font-bold h-12 shadow-md shadow-emerald-100"
                                      onClick={() => window.open(activePractice.meet_url, '_blank')}
                                    >
                                      <Video className="w-4 h-4 mr-2" />
                                      ENTRAR A PRÁCTICA
                                    </Button>
                                  ) : (
                                    <p className="text-[10px] text-cyan-600 italic bg-white/50 p-2 rounded border border-cyan-100">
                                      * Link de acceso disponible pronto
                                    </p>
                                  )}
                                </div>
                              );
                            }

                            if (pendingPracticeToday) {
                              return (
                                <div className="w-full bg-orange-50 rounded-xl border border-orange-200 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-orange-500" />
                                    <span className="text-xs font-bold text-orange-700 uppercase">Solicitud en Revisión</span>
                                  </div>
                                  <p className="text-[11px] text-orange-800">
                                    Ya solicitaste una práctica para hoy. Un instructor la revisará pronto.
                                  </p>
                                </div>
                              );
                            }

                            // Si no hay nada para hoy, permitir programar
                            return (
                              <Button 
                                className="bg-cyan-600 hover:bg-cyan-700 shadow-md shadow-cyan-600/20"
                                onClick={() => handleRequestClass(nextSession, 'practice')}
                              >
                                <Zap className="w-4 h-4 mr-2" />
                                Programar Práctica
                              </Button>
                            );
                          }

                          // Flujo normal de teoría
                          return (
                            <div className="flex flex-wrap gap-2">
                              <Link href={`/student/class-templates/${nextSession.id}`}>
                                <Button className="bg-[#073372] hover:bg-[#052555]">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver contenido
                                </Button>
                              </Link>
                              
                              {/* Quick join Regular today */}
                              {(() => {
                                 const regSession = stats?.regular_session;
                                 if (regSession?.meet_url && regSession.status === 'scheduled') {
                                   const regDateStr = new Date(regSession.scheduled_at).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                                   if (regDateStr === todayStr) {
                                      return (
                                        <Button 
                                          className="bg-[#17BC91] hover:bg-[#14a77f]"
                                          onClick={() => window.open(regSession.meet_url, '_blank')}
                                        >
                                          <Video className="w-4 h-4 mr-2" />
                                          Unirse a Clase
                                        </Button>
                                      );
                                   }
                                 }
                                 return null;
                              })()}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="hidden md:flex items-center justify-center w-48 bg-gradient-to-br from-[#17BC91] to-[#14a77f] text-white">
                      <div className="text-center">
                        <div className="text-6xl font-bold opacity-90">{nextSession.session_number}</div>
                        <div className="text-sm opacity-75">Sesión</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Completion Banner */}
          {completedCount === totalCount && totalCount > 0 && (
            <div className="mb-8">
              <Card className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 overflow-hidden">
                <CardContent className="p-6 text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    ¡Felicitaciones! Has completado todas las sesiones 🎉
                  </h3>
                  <p className="text-gray-600">
                    Has demostrado un excelente compromiso con tu aprendizaje. ¡Sigue así!
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sessions Timeline */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Todas las Sesiones</h2>
            <p className="text-sm text-gray-500">Completa cada sesión en orden para desbloquear la siguiente</p>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay clases disponibles</h3>
                <p className="text-gray-600">Las clases de tu nivel aparecerán aquí.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedTemplates.map((template, index) => {
                const status = getTemplateStatus(template);
                const stats = sessionStats[template.id];
                const isLocked = status.type === 'locked';
                const isCompleted = status.type === 'completed';
                const StatusIcon = status.icon;

                return (
                  <Card 
                    key={template.id}
                    className={`relative overflow-hidden transition-all duration-300 ${
                      isCompleted 
                        ? 'border-emerald-200 bg-emerald-50/50' 
                        : isLocked 
                          ? 'border-gray-200 bg-gray-50 opacity-60' 
                          : 'border-gray-200 hover:border-[#073372]/30 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-stretch">
                      {/* Session Number Column */}
                      <div className={`w-20 flex-shrink-0 flex flex-col items-center justify-center py-4 ${
                        isCompleted 
                          ? 'bg-emerald-500' 
                          : isLocked 
                            ? 'bg-gray-300' 
                            : 'bg-gradient-to-b from-[#073372] to-[#0a4a9e]'
                      }`}>
                        <span className="text-3xl font-bold text-white">{template.session_number}</span>
                        <span className="text-xs text-white/80 uppercase">Sesión</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 flex items-center gap-4">
                        {/* Status Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${status.color}`}>
                          <StatusIcon className="w-5 h-5 text-white" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold truncate ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                              {template.title}
                            </h3>
                            <Badge className={`${status.color} text-white text-xs flex-shrink-0`}>
                              {status.label}
                            </Badge>
                          </div>
                          {template.description && (
                            <p className={`text-sm line-clamp-1 ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                              {template.description}
                            </p>
                          )}
                          <div className={`flex items-center gap-3 mt-2 text-xs ${isLocked ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {template.duration_minutes} min
                            </span>
                            {template.has_exam && (
                              <span className="flex items-center gap-1">
                                <FileQuestion className="w-3.5 h-3.5" />
                                {template.exam_questions_count} preguntas
                              </span>
                            )}
                            {template.resources_count > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                {template.resources_count} recursos
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isLocked && (
                            <div className="text-center px-4">
                              <Lock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                              <span className="text-xs text-gray-400">
                                Completa la sesión {parseInt(template.session_number) - 1}
                              </span>
                            </div>
                          )}

                          {status.type === 'completed' && (
                            <Link href={`/student/class-templates/${template.id}`}>
                              <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-600 hover:bg-emerald-50">
                                <Eye className="w-4 h-4 mr-2" />
                                Ver contenido
                              </Button>
                            </Link>
                          )}

                          {status.type === 'practices_pending' && (
                            <div className="flex flex-wrap items-center gap-2">
                              {(() => {
                                const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                                const stats = sessionStats[template.id];
                                
                                const activePractice = stats?.practice_sessions.find(ps => {
                                  const psDateStr = new Date(ps.scheduled_at).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                                  return psDateStr === todayStr && ps.status === 'scheduled';
                                });

                                const pendingPracticeToday = stats?.pending_request?.type === 'practice' && 
                                       stats.pending_request.requested_datetime && 
                                       new Date(stats.pending_request.requested_datetime).toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) === todayStr;

                                if (activePractice) {
                                  return (
                                    <div className="flex items-center gap-2 p-1 bg-emerald-50 rounded-lg border border-emerald-100">
                                      <div className="text-[10px] text-emerald-800 font-bold px-2 py-0.5 bg-white rounded border border-emerald-200">
                                        Hoy {new Date(activePractice.scheduled_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      {activePractice.meet_url ? (
                                        <Button 
                                          size="sm" 
                                          className="h-7 px-3 bg-[#17BC91] hover:bg-[#14a77f] text-[10px] font-bold"
                                          onClick={() => window.open(activePractice.meet_url, '_blank')}
                                        >
                                          <Video className="w-3 h-3 mr-1" />
                                          ENTRAR
                                        </Button>
                                      ) : (
                                        <span className="text-[9px] text-emerald-600 font-medium px-1">Link hoy</span>
                                      )}
                                    </div>
                                  );
                                }

                                if (pendingPracticeToday) {
                                  return (
                                    <div className="flex items-center gap-2 p-1 bg-orange-50 rounded-lg border border-orange-100">
                                      <Clock className="w-3 h-3 text-orange-500" />
                                      <span className="text-[10px] text-orange-700 font-bold uppercase">En revisión para hoy</span>
                                    </div>
                                  );
                                }

                                return (
                                  <Button 
                                    size="sm" 
                                    className="bg-cyan-600 hover:bg-cyan-700"
                                    onClick={() => handleRequestClass(template, 'practice')}
                                  >
                                    <Zap className="w-4 h-4 mr-2" />
                                    Programar Práctica
                                  </Button>
                                );
                              })()}
                              
                              <Link href={`/student/class-templates/${template.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Detalle
                                </Button>
                              </Link>
                            </div>
                          )}

                          {(status.type === 'scheduled' || status.type === 'in_progress') && (
                            <div className="flex items-center gap-2">
                              {/* Quick join Regular today */}
                              {(() => {
                                 const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                                 const regSession = sessionStats[template.id]?.regular_session;
                                 if (regSession?.meet_url && regSession.status !== 'completed') {
                                   const regDateStr = new Date(regSession.scheduled_at).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                                   if (regDateStr === todayStr) {
                                      return (
                                        <Button 
                                          size="sm" 
                                          className="bg-[#17BC91] hover:bg-[#14a77f]"
                                          onClick={() => window.open(regSession.meet_url, '_blank')}
                                        >
                                          <PlayCircle className="w-4 h-4 mr-2" />
                                          Entrar a Clase
                                        </Button>
                                      );
                                   }
                                 }
                                 return null;
                              })()}

                              <Link href={`/student/class-templates/${template.id}`}>
                                <Button size="sm" className="bg-[#073372] hover:bg-[#052555]">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver contenido
                                </Button>
                              </Link>
                            </div>
                          )}

                          {status.type === 'request_pending' && stats?.pending_request && (
                            <div className="flex items-center gap-2">
                              <Link href={`/student/class-templates/${template.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver temario
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => cancelRequest(stats.pending_request!.id)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}

                          {status.type === 'request_approved' && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-cyan-600 bg-cyan-50 px-2 py-1 rounded">
                                En espera de programación
                              </span>
                              <Link href={`/student/class-templates/${template.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver temario
                                </Button>
                              </Link>
                            </div>
                          )}

                          {/*status.type === 'available' && (
                            <div className="flex items-center gap-2">
                              <Link href={`/student/class-templates/${template.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver temario
                                </Button>
                              </Link>
                              <Button 
                                size="sm"
                                className="bg-[#17BC91] hover:bg-[#14a77f]"
                                onClick={() => handleRequestClass(template)}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Solicitar
                              </Button>
                            </div>
                          )*/}
                        </div>
                      </div>

                      {/* Arrow for completed */}
                      {isCompleted && index < sortedTemplates.length - 1 && (
                        <div className="absolute -bottom-3 left-10 transform -translate-x-1/2 z-10">
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                            <ChevronRight className="w-4 h-4 text-white rotate-90" />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

     
        </div>
      </div>

      {/* Modal de Solicitud */}
      {showRequestModal && selectedTemplate && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowRequestModal(false)}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{selectedTemplate.session_number}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Solicitar Clase</h3>
                  <p className="text-blue-100 text-sm">
                    Sesión {selectedTemplate.session_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{selectedTemplate.title}</h4>
                  <Badge variant="outline" className={requestType === 'practice' ? 'text-cyan-600 border-cyan-200' : 'text-blue-600 border-blue-200'}>
                    {requestType === 'practice' ? 'Sesión de Práctica' : 'Clase Teórica'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedTemplate.duration_minutes} min
                  </span>
                </div>
              </div>

              {/* Schedule Selection logic (Simplified for dashboard) */}
              {(useRegularFlow || useDailyFlow || useWeeklyFlow) ? (
                <div className="space-y-4">
                   {useRegularFlow && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Horario Disponible</label>
                        {loadingClasses ? (
                          <div className="flex items-center justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                        ) : availableClasses.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                            {availableClasses.map((c) => (
                              <div 
                                key={c.id}
                                onClick={() => setSelectedClassId(c.id)}
                                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                                  selectedClassId === c.id 
                                    ? 'border-blue-500 bg-blue-50 shadow-sm' 
                                    : 'border-gray-100 hover:border-gray-200 bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedClassId === c.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    <Clock className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-900">
                                      {new Date(c.scheduled_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-[10px] text-gray-500">{c.teacher ? `Prof. ${c.teacher.name}` : 'Asignación automática'}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge className={c.available_spots > 1 ? 'bg-emerald-500' : 'bg-amber-500'}>
                                    {c.available_spots} cupos
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                           <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                             El próximo horario disponible será calculado automáticamente.
                           </div>
                        )}
                      </div>
                   )}

                   {(useDailyFlow || useWeeklyFlow) && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Selecciona Horario</label>
                        <input 
                          type="datetime-local" 
                          className="w-full p-3 rounded-xl border-gray-200 text-sm focus:ring-2 focus:ring-[#17BC91]" 
                          value={preferredDatetime}
                          onChange={(e) => setPreferredDatetime(e.target.value)}
                        />
                      </div>
                   )}
                </div>
              ) : (
                <Textarea
                  label="Preferencia de Horario"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Ej: Lunes a las 10:00 AM"
                  rows={3}
                />
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {requestType === 'practice' 
                    ? 'Podrás unirte a la sesión una vez que sea confirmada por un instructor.' 
                    : 'Un administrador revisará tu petición y te asignará el horario solicitado.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowRequestModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={submitRequest}
                disabled={submitting}
                className="bg-[#17BC91] hover:bg-[#14a77f]"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
};

export default StudentMyClasses;
