import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { 
  ArrowLeft, Calendar, Clock, Users, Video, Film, 
  Play, CheckCircle, UserPlus, UserMinus, ExternalLink,
  BookOpen, Target, MessageCircle, FileText, GraduationCap
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AcademicLevel {
  id: number;
  name: string;
  color?: string;
}

interface Question {
  id: number;
  question: string;
  order: number;
}

interface Resource {
  id: number;
  title: string;
  type: 'video' | 'pdf' | 'image' | 'link' | 'document';
  description?: string;
  file_path?: string;
}

interface ClassTemplate {
  id: number;
  title: string;
  session_number: string;
  duration_minutes: number;
  description?: string;
  content?: string;
  objectives?: string | null;
  intro_video_url?: string;
  modality?: 'theoretical' | 'practical';
  academic_level: AcademicLevel;
  questions?: Question[];
  resources: Resource[];
}

interface Teacher {
  id: number;
  name: string;
  email: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Enrollment {
  id: number;
  student_id: number;
  attended: boolean;
  exam_completed: boolean;
  student: Student;
}

interface ScheduledClass {
  id: number;
  scheduled_at: string;
  ended_at?: string;
  meet_url?: string;
  recording_url?: string;
  recording_thumbnail?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  max_students: number;
  template: ClassTemplate;
  teacher?: Teacher;
  enrollments: Enrollment[];
}

interface Props {
  scheduledClass: ScheduledClass;
}

const Show: React.FC<Props> = ({ scheduledClass }) => {
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState(scheduledClass.recording_url || '');
  const [studentId, setStudentId] = useState('');

  const template = scheduledClass.template;

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { 
      variant: 'default' | 'secondary' | 'destructive' | 'outline'; 
      label: string;
      color: string;
      bgColor: string;
      borderColor: string;
      textColor: string;
    }> = {
      scheduled: { 
        variant: 'outline', 
        label: 'Programada',
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700'
      },
      in_progress: { 
        variant: 'default', 
        label: 'En Curso',
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-700'
      },
      completed: { 
        variant: 'secondary', 
        label: 'Completada',
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-700'
      },
      cancelled: { 
        variant: 'destructive', 
        label: 'Cancelada',
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-700'
      },
    };
    return configs[status] || configs.scheduled;
  };

  const formatDateTime = (dateStr: string) => {
    // La fecha viene en formato ISO desde el servidor
    // Crear un Date object y mostrarlo en la zona horaria local
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima' // Forzar zona horaria de Perú
    });
  };

  const handleUpdateStatus = (newStatus: string) => {
    router.put(`/admin/scheduled-classes/${scheduledClass.id}/status`, {
      status: newStatus
    }, {
      onSuccess: () => toast.success('Estado actualizado'),
      onError: () => toast.error('Error al actualizar estado')
    });
  };

  const handleAddRecording = () => {
    if (!recordingUrl) return;
    
    router.post(`/admin/scheduled-classes/${scheduledClass.id}/recording`, {
      recording_url: recordingUrl
    }, {
      onSuccess: () => {
        toast.success('Grabación guardada');
        setShowRecordingModal(false);
      },
      onError: () => toast.error('Error al guardar grabación')
    });
  };

  const handleEnrollStudent = () => {
    if (!studentId) return;
    
    router.post(`/admin/scheduled-classes/${scheduledClass.id}/enroll`, {
      student_id: studentId
    }, {
      onSuccess: () => {
        toast.success('Estudiante inscrito');
        setShowEnrollModal(false);
        setStudentId('');
      },
      onError: () => toast.error('Error al inscribir estudiante')
    });
  };

  const handleUnenrollStudent = (studentId: number) => {
    if (confirm('¿Estás seguro de remover a este estudiante?')) {
      router.delete(`/admin/scheduled-classes/${scheduledClass.id}/unenroll/${studentId}`, {
        onSuccess: () => toast.success('Estudiante removido'),
        onError: () => toast.error('Error al remover estudiante')
      });
    }
  };

  // Extraer video ID de YouTube
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  const videoUrl = scheduledClass.recording_url || template.intro_video_url;
  const videoEmbedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
  const isRecording = !!scheduledClass.recording_url;
  const statusConfig = getStatusConfig(scheduledClass.status);

  return (
    <AuthenticatedLayout>
      <Head title={`Grupo: ${template.title}`} />
      
      <div className="min-h-screen bg-gray-100">
        {/* Back Button */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link 
              href="/admin/scheduled-classes" 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver a Grupos de Clase</span>
            </Link>
          </div>
        </div>

        {/* Hero Section - Video + Info */}
        <div className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Video - Left Side (3 cols) */}
              <div className="lg:col-span-3">
                <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-lg">
                  {videoEmbedUrl ? (
                    <iframe
                      src={videoEmbedUrl}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                      <Video className="w-16 h-16 mb-3 opacity-50" />
                      <span className="text-sm">Video no disponible</span>
                    </div>
                  )}
                  
                  {/* Recording Badge */}
                  {isRecording && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-600 text-white">
                        <Film className="w-3 h-3 mr-1" />
                        Grabación
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Info - Right Side (2 cols) */}
              <div className="lg:col-span-2 flex flex-col">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge 
                    style={{ backgroundColor: template.academic_level?.color || '#3B82F6' }}
                    className="text-white border-0"
                  >
                    {template.academic_level?.name}
                  </Badge>
                  <Badge variant="outline">Sesión {template.session_number}</Badge>
                  {template.modality && (
                    <Badge variant="outline" className="capitalize">
                      {template.modality === 'theoretical' ? 'Teórico' : 'Práctico'}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                  {template.title}
                </h1>

                {/* Description */}
                {template.description && (
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {template.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{template.duration_minutes} minutos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>{template.questions?.length || 0} preguntas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{template.resources?.length || 0} recursos</span>
                  </div>
                </div>

                {/* Status Card */}
                <div className={`rounded-xl p-4 ${statusConfig.bgColor} border ${statusConfig.borderColor} mb-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.color}`}></div>
                    <span className={`font-semibold ${statusConfig.textColor}`}>{statusConfig.label}</span>
                  </div>
                  <p className={`text-sm ${statusConfig.textColor} opacity-80`}>
                    {formatDateTime(scheduledClass.scheduled_at)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto space-y-2">
                  {scheduledClass.status === 'scheduled' && (
                    <Button 
                      className="w-full bg-orange-600 hover:bg-orange-700 h-11"
                      onClick={() => handleUpdateStatus('in_progress')}
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Iniciar Clase
                    </Button>
                  )}
                  
                  {scheduledClass.status === 'in_progress' && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 h-11"
                      onClick={() => handleUpdateStatus('completed')}
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Marcar Completada
                    </Button>
                  )}

                  {scheduledClass.meet_url && (
                    <a 
                      href={scheduledClass.meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full"
                    >
                      <Button variant="outline" className="w-full h-11">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir enlace de Meet
                      </Button>
                    </a>
                  )}

                  {scheduledClass.status === 'completed' && (
                    <Button 
                      variant="outline"
                      className="w-full h-11"
                      onClick={() => setShowRecordingModal(true)}
                    >
                      <Film className="w-4 h-4 mr-2" />
                      {scheduledClass.recording_url ? 'Cambiar Grabación' : 'Agregar Grabación'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - 2 cols */}
            <div className="lg:col-span-2 space-y-6">
              {/* Objetivos */}
              {template.objectives && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Objetivos de Aprendizaje</h2>
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <div className="rich-content text-gray-900 max-w-none whitespace-pre-line">
                      {template.objectives}
                    </div>
                  </div>
                </div>
              )}

              {/* Contenido */}
              {template.content && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Contenido de la Clase</h2>
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <div 
                      className="rich-content max-w-none"
                      dangerouslySetInnerHTML={{ __html: template.content }}
                    />
                  </div>
                </div>
              )}

              {/* Preguntas de Discusión */}
              {template.questions && template.questions.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Preguntas de Discusión</h2>
                        <p className="text-sm text-gray-500">{template.questions.length} preguntas preparadas</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <div className="space-y-3">
                      {template.questions.sort((a, b) => a.order - b.order).map((q, idx) => (
                        <div 
                          key={q.id} 
                          className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                        >
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                            style={{ backgroundColor: template.academic_level?.color || '#073372' }}
                          >
                            {idx + 1}
                          </div>
                          <p className="text-gray-700 leading-relaxed pt-1">{q.question}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recursos */}
              {template.resources && template.resources.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Recursos de la Clase</h2>
                        <p className="text-sm text-gray-500">{template.resources.length} materiales disponibles</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {template.resources.map((res) => (
                        <a
                          key={res.id}
                          href={res.file_path ? `/storage/${res.file_path}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{res.title}</p>
                            <p className="text-xs text-gray-500 capitalize">{res.type}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - 1 col */}
            <div className="space-y-6">
              {/* Info Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#073372]" />
                  Información del Grupo
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Nivel</span>
                    <Badge 
                      style={{ backgroundColor: template.academic_level?.color || '#3B82F6' }}
                      className="text-white border-0"
                    >
                      {template.academic_level?.name}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Sesión</span>
                    <span className="font-medium text-gray-900">{template.session_number}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Modalidad</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {template.modality === 'theoretical' ? 'Teórico' : template.modality === 'practical' ? 'Práctico' : '-'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Duración</span>
                    <span className="font-medium text-gray-900">{template.duration_minutes} min</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500 text-sm">Capacidad</span>
                    <span className="font-medium text-gray-900">
                      {scheduledClass.enrollments.length}/{scheduledClass.max_students}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profesor */}
              {scheduledClass.teacher && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#073372]" />
                    Profesor Asignado
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#073372] flex items-center justify-center text-white font-bold">
                      {scheduledClass.teacher.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{scheduledClass.teacher.name}</p>
                      <p className="text-sm text-gray-500">{scheduledClass.teacher.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fecha Programada */}
              <div className={`rounded-xl border p-6 ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${statusConfig.textColor}`}>
                  <Calendar className="w-5 h-5" />
                  Fecha Programada
                </h3>
                <p className={statusConfig.textColor}>
                  {formatDateTime(scheduledClass.scheduled_at)}
                </p>
              </div>

              {/* Estudiantes Inscritos */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#073372]" />
                      Estudiantes ({scheduledClass.enrollments.length}/{scheduledClass.max_students})
                    </h3>
                    {scheduledClass.enrollments.length < scheduledClass.max_students && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowEnrollModal(true)}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  {scheduledClass.enrollments.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay estudiantes inscritos</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {scheduledClass.enrollments.map((enrollment) => (
                        <div 
                          key={enrollment.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full bg-[#073372] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              {enrollment.student.first_name?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {enrollment.student.first_name} {enrollment.student.last_name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {enrollment.attended && (
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                    Asistió
                                  </Badge>
                                )}
                                {enrollment.exam_completed && (
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                                    Examen ✓
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleUnenrollStudent(enrollment.student.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notas */}
              {scheduledClass.notes && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 p-6">
                  <h3 className="font-semibold text-blue-900 mb-3">📝 Notas</h3>
                  <p className="text-sm text-blue-800">{scheduledClass.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para el contenido renderizado */}
      <style>{`
        .rich-content h1 { 
          font-size: 1.75rem; 
          font-weight: 700; 
          margin: 1.5rem 0 0.75rem; 
          line-height: 1.2;
          color: #111827;
        }
        .rich-content h2 { 
          font-size: 1.375rem; 
          font-weight: 600; 
          margin: 1.25rem 0 0.5rem; 
          line-height: 1.3;
          color: #1f2937;
        }
        .rich-content h3 { 
          font-size: 1.125rem; 
          font-weight: 600; 
          margin: 1rem 0 0.5rem;
          color: #374151;
        }
        .rich-content p {
          margin: 0.5rem 0;
          line-height: 1.6;
          color: #374151;
        }
        .rich-content ul, .rich-content ol { 
          padding-left: 1.5rem; 
          margin: 0.75rem 0; 
        }
        .rich-content li { 
          margin: 0.25rem 0;
          line-height: 1.6;
        }
        .rich-content ul { list-style-type: disc; }
        .rich-content ol { list-style-type: decimal; }
        .rich-content blockquote { 
          border-left: 4px solid #e5e7eb; 
          padding-left: 1rem; 
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }
        .rich-content pre {
          background: #1f2937;
          color: #e5e7eb;
          padding: 1rem;
          border-radius: 0.5rem;
          font-family: 'Fira Code', 'Monaco', monospace;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .rich-content code {
          background: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Fira Code', 'Monaco', monospace;
          font-size: 0.875em;
        }
        .rich-content pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
        .rich-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .rich-content a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        .rich-content a:hover {
          color: #2563eb;
        }
        .rich-content hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 1.5rem 0;
        }
        .rich-content strong {
          font-weight: 600;
        }
        .rich-content em {
          font-style: italic;
        }
        .rich-content u {
          text-decoration: underline;
        }
      `}</style>

      {/* Modal Grabación */}
      <Dialog open={showRecordingModal} onOpenChange={setShowRecordingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {scheduledClass.recording_url ? 'Cambiar Grabación' : 'Agregar Grabación'}
            </DialogTitle>
            <DialogDescription>
              La grabación reemplazará el video de introducción para los estudiantes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>URL de la Grabación</Label>
              <Input
                type="url"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordingModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRecording} className="bg-[#073372] hover:bg-[#052555]">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Inscribir Estudiante */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscribir Estudiante</DialogTitle>
            <DialogDescription>
              Ingresa el ID del estudiante a inscribir
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ID del Estudiante</Label>
              <Input
                type="number"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="ID del estudiante"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnrollStudent} className="bg-[#073372] hover:bg-[#052555]">
              Inscribir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
};

export default Show;
