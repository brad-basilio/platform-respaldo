import React, { useState, useMemo } from 'react';
import { BookOpen, CheckCircle, Clock, PlayCircle, Send, Eye, FileQuestion, FileText, AlertCircle, Lock, ChevronRight, Trophy, Target, Zap, Star } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
  recording_url?: string;
  template: ClassTemplate;
}

interface ClassEnrollment {
  id: number;
  attended: boolean;
  exam_completed: boolean;
  scheduled_class: ScheduledClass;
}

interface ClassRequest {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  student_message?: string;
  admin_response?: string;
  created_at: string;
}

interface SessionStat {
  regular_enrolled: boolean;
  regular_completed: boolean;
  regular_status: string | null;
  practice_count: number;
  practice_completed_count: number;
  pending_request: ClassRequest | null;
}

interface PracticeSettings {
  min_required: number;
  max_allowed: number;
}

interface Props {
  templates: ClassTemplate[];
  sessionStats: Record<number, SessionStat>; // keyed by template_id
  academicLevel?: AcademicLevel;
  practiceSettings: PracticeSettings;
  message?: string;
}

const StudentMyClasses: React.FC<Props> = ({ 
  templates, 
  sessionStats, 
  academicLevel,
  practiceSettings,
  message 
}) => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ClassTemplate | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleRequestClass = (template: ClassTemplate) => {
    setSelectedTemplate(template);
    setRequestMessage('');
    setShowRequestModal(true);
  };

  const submitRequest = () => {
    if (!selectedTemplate) return;
    
    setSubmitting(true);
    router.post('/student/class-requests', {
      class_template_id: selectedTemplate.id,
      message: requestMessage,
    }, {
      onSuccess: () => {
        toast.success('Solicitud enviada', {
          description: 'El administrador revisará tu solicitud pronto.'
        });
        setShowRequestModal(false);
      },
      onError: () => {
        toast.error('Error al enviar solicitud');
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
                      <div className="flex gap-3">
                        <Link href={`/student/class-templates/${nextSession.id}`}>
                          <Button className="bg-[#073372] hover:bg-[#052555]">
                            {sessionStats[nextSession.id]?.regular_completed 
                              ? <Zap className="w-4 h-4 mr-2" />
                              : <Eye className="w-4 h-4 mr-2" />
                            }
                            {sessionStats[nextSession.id]?.regular_completed 
                              ? 'Hacer Prácticas'
                              : 'Ver contenido'
                            }
                          </Button>
                        </Link>
                        {/*!myRequests[nextSession.id] && !enrollments[nextSession.id] && (
                          <Button 
                            variant="outline"
                            className="border-[#17BC91] text-[#17BC91] hover:bg-[#17BC91] hover:text-white"
                            onClick={() => handleRequestClass(nextSession)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Solicitar clase
                          </Button>
                        )**/}
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
                            <Link href={`/student/class-templates/${template.id}`}>
                              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                                <Zap className="w-4 h-4 mr-2" />
                                Hacer Prácticas
                              </Button>
                            </Link>
                          )}

                          {(status.type === 'scheduled' || status.type === 'in_progress') && (
                            <Link href={`/student/class-templates/${template.id}`}>
                              <Button size="sm" className="bg-[#073372] hover:bg-[#052555]">
                                {status.type === 'in_progress' ? (
                                  <>
                                    <PlayCircle className="w-4 h-4 mr-2" />
                                    Entrar a clase
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-4 h-4 mr-2" />
                                    Ver clase
                                  </>
                                )}
                              </Button>
                            </Link>
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
                <h4 className="font-semibold text-gray-900 mb-1">{selectedTemplate.title}</h4>
                {selectedTemplate.description && (
                  <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedTemplate.duration_minutes} min
                  </span>
                  {selectedTemplate.has_exam && (
                    <span className="flex items-center gap-1">
                      <FileQuestion className="w-3.5 h-3.5" />
                      Examen ({selectedTemplate.exam_questions_count} preguntas)
                    </span>
                  )}
                </div>
              </div>

              <Textarea
                label="Mensaje (opcional)"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="¿Tienes alguna preferencia de horario o comentario adicional?"
                rows={3}
              />

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Al solicitar esta clase, un administrador revisará tu petición y te asignará a una sesión disponible.
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
