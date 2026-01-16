import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { 
  ArrowLeft, Calendar, Clock, Users, Video, Film, 
  Play, CheckCircle, ExternalLink, Download, Eye,
  BookOpen, Target, MessageCircle, FileText, GraduationCap,
  CircleCheck, Circle, HelpCircle, Lightbulb
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

interface QuestionOption {
  text: string;
  is_correct: boolean;
}

interface Question {
  id: number;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'open';
  options?: QuestionOption[];
  explanation?: string;
  points: number;
  order?: number;
}

interface Resource {
  id: number;
  name: string;
  file_type: 'video' | 'pdf' | 'image' | 'link' | 'document';
  description?: string;
  file_path?: string;
  download_url?: string;
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
  enrollments: Enrollment[];
}

interface Props {
  scheduledClass: ScheduledClass;
}

const ClassDetail: React.FC<Props> = ({ scheduledClass }) => {
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState(scheduledClass.recording_url || '');
  const [loadingAttendance, setLoadingAttendance] = useState<number | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const template = scheduledClass.template;

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { 
      label: string;
      color: string;
      bgColor: string;
      borderColor: string;
      textColor: string;
    }> = {
      scheduled: { 
        label: 'Programada',
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700'
      },
      in_progress: { 
        label: 'En Curso',
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-700'
      },
      completed: { 
        label: 'Completada',
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-700'
      },
      cancelled: { 
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima'
    });
  };

  const handleUpdateStatus = (newStatus: string) => {
    router.put(`/teacher/my-classes/${scheduledClass.id}/status`, {
      status: newStatus
    }, {
      onSuccess: () => toast.success('Estado actualizado'),
      onError: () => toast.error('Error al actualizar estado')
    });
  };

  const handleAddRecording = () => {
    if (!recordingUrl) return;
    
    router.post(`/teacher/my-classes/${scheduledClass.id}/recording`, {
      recording_url: recordingUrl
    }, {
      onSuccess: () => {
        toast.success('Grabación guardada');
        setShowRecordingModal(false);
      },
      onError: () => toast.error('Error al guardar grabación')
    });
  };

  const handleToggleAttendance = (enrollment: Enrollment) => {
    setLoadingAttendance(enrollment.id);
    router.post(`/teacher/my-classes/${scheduledClass.id}/mark-attendance/${enrollment.id}`, {
      attended: !enrollment.attended
    }, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success(enrollment.attended ? 'Asistencia removida' : 'Asistencia marcada');
        setLoadingAttendance(null);
      },
      onError: () => {
        toast.error('Error al actualizar asistencia');
        setLoadingAttendance(null);
      }
    });
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  const getResourceIcon = (fileType: string) => {
    switch (fileType) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'image': return <Eye className="w-5 h-5" />;
      case 'link': return <ExternalLink className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getResourceColor = (fileType: string) => {
    switch (fileType) {
      case 'video': return 'bg-red-500';
      case 'pdf': return 'bg-red-600';
      case 'image': return 'bg-blue-500';
      case 'link': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const videoUrl = scheduledClass.recording_url || template.intro_video_url;
  const videoEmbedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
  const isRecording = !!scheduledClass.recording_url;
  const statusConfig = getStatusConfig(scheduledClass.status);
  const attendedCount = scheduledClass.enrollments.filter(e => e.attended).length;

  return (
    <AuthenticatedLayout>
      <Head title={`Clase: ${template.title}`} />
      
      <div className="min-h-screen bg-gray-100">
        {/* Back Button */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link 
              href="/teacher/my-classes" 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver a Mis Clases</span>
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <Video className="w-16 h-16 mb-3 opacity-50" />
                      <span className="text-sm">Video no disponible</span>
                    </div>
                  )}
                  
                  {isRecording && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-600 text-white border-0">
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
                  <Badge variant="outline" className="border-gray-300 text-gray-700">
                    Sesión {template.session_number}
                  </Badge>
                  {template.modality && (
                    <Badge variant="outline" className="border-gray-300 text-gray-700 capitalize">
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
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{template.duration_minutes} minutos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-gray-500" />
                    <span>{template.questions?.length || 0} preguntas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>{template.resources?.length || 0} recursos</span>
                  </div>
                </div>

                {/* Status Card */}
                <div className={`rounded-xl p-4 ${statusConfig.bgColor} border ${statusConfig.borderColor} mb-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.color}`}></div>
                    <span className={`font-semibold ${statusConfig.textColor}`}>{statusConfig.label}</span>
                  </div>
                  <p className={`text-sm ${statusConfig.textColor}`}>
                    {formatDateTime(scheduledClass.scheduled_at)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto space-y-2">
                  {scheduledClass.status === 'scheduled' && (
                    <Button 
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white h-11"
                      onClick={() => handleUpdateStatus('in_progress')}
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Iniciar Clase
                    </Button>
                  )}
                  
                  {scheduledClass.status === 'in_progress' && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
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
                      <Button variant="outline" className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir enlace de Meet
                      </Button>
                    </a>
                  )}

                  {/*scheduledClass.status === 'completed' && (
                    <Button 
                      variant="outline"
                      className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowRecordingModal(true)}
                    >
                      <Film className="w-4 h-4 mr-2" />
                      {scheduledClass.recording_url ? 'Cambiar Grabación' : 'Agregar Grabación'}
                    </Button>
                  )/*/}
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
                    <div className="text-gray-700 whitespace-pre-line leading-relaxed">
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

              {/* Preguntas de Evaluación - Mejorado */}
              {template.questions && template.questions.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <HelpCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Preguntas de Evaluación</h2>
                          <p className="text-sm text-gray-500">
                            {template.questions.length} preguntas · {template.questions.reduce((acc, q) => acc + (q.points || 1), 0)} puntos totales
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                        Vista del Instructor
                      </Badge>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {template.questions.sort((a, b) => (a.order || 0) - (b.order || 0)).map((question, idx) => (
                      <div key={question.id} className="p-6">
                        {/* Question Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow-sm"
                            style={{ backgroundColor: template.academic_level?.color || '#073372' }}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                                {question.type === 'multiple_choice' ? 'Opción Múltiple' : 
                                 question.type === 'true_false' ? 'Verdadero/Falso' : 'Respuesta Abierta'}
                              </Badge>
                              <Badge className="text-xs bg-blue-100 text-blue-700 border-0">
                                {question.points || 1} {(question.points || 1) === 1 ? 'punto' : 'puntos'}
                              </Badge>
                            </div>
                            <p className="text-gray-900 font-medium leading-relaxed text-base">
                              {question.question}
                            </p>
                          </div>
                        </div>

                        {/* Options */}
                        {question.options && question.options.length > 0 && (
                          <div className="ml-14 space-y-2">
                            {question.options.map((option, optIdx) => (
                              <div 
                                key={optIdx}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                  option.is_correct 
                                    ? 'bg-green-50 border-green-300 shadow-sm' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {option.is_correct ? (
                                  <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                                ) : (
                                  <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={`flex-1 ${option.is_correct ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                                  {option.text}
                                </span>
                                {option.is_correct && (
                                  <Badge className="bg-green-600 text-white border-0 text-xs">
                                    Correcta
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Explanation */}
                        {question.explanation && (
                          <div className="ml-14 mt-4">
                            <button
                              onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
                              className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
                            >
                              <Lightbulb className="w-4 h-4" />
                              {expandedQuestion === question.id ? 'Ocultar explicación' : 'Ver explicación'}
                            </button>
                            {expandedQuestion === question.id && (
                              <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-800 leading-relaxed">
                                  {question.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recursos de la Clase */}
              {template.resources && template.resources.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Recursos de la Clase</h2>
                        <p className="text-sm text-gray-500">{template.resources.length} materiales disponibles</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {template.resources.map((res) => (
                        <a
                          key={res.id}
                          href={res.download_url || (res.file_path ? `/storage/${res.file_path}` : '#')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-green-400 hover:shadow-md transition-all duration-200 group"
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${getResourceColor(res.file_type)}`}>
                            {getResourceIcon(res.file_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 group-hover:text-green-700 transition-colors">{res.name}</p>
                            {res.description && (
                              <p className="text-sm text-gray-500 line-clamp-1">{res.description}</p>
                            )}
                            <p className="text-xs text-gray-400 capitalize mt-1">{res.file_type}</p>
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {res.file_type === 'link' ? (
                              <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                <ExternalLink className="w-4 h-4" />
                                Abrir
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                <Download className="w-4 h-4" />
                                Descargar
                              </span>
                            )}
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
                  Información de la Clase
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
                    <span className="text-gray-500 text-sm">Aprendices</span>
                    <span className="font-medium text-gray-900">
                      {scheduledClass.enrollments.length}/{scheduledClass.max_students}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fecha Programada */}
              <div className={`rounded-xl border p-6 ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${statusConfig.textColor}`}>
                  <Calendar className="w-5 h-5" />
                  Fecha Programada
                </h3>
                <p className={`${statusConfig.textColor} font-medium`}>
                  {formatDateTime(scheduledClass.scheduled_at)}
                </p>
              </div>

              {/* Aprendices y Asistencia - Mejorado */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#073372]" />
                      Asistencia
                    </h3>
                    <Badge 
                      className={`border-0 ${
                        attendedCount === scheduledClass.enrollments.length && scheduledClass.enrollments.length > 0
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {attendedCount}/{scheduledClass.enrollments.length}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  {scheduledClass.enrollments.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay aprendices inscritos</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {scheduledClass.enrollments.map((enrollment) => (
                        <div 
                          key={enrollment.id}
                          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                            enrollment.attended ? 'bg-green-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                              enrollment.attended ? 'bg-green-600' : 'bg-[#073372]'
                            }`}>
                              {enrollment.student.first_name?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {enrollment.student.first_name} {enrollment.student.last_name}
                              </p>
                              {enrollment.exam_completed && (
                                <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 mt-1">
                                  Examen completado
                                </Badge>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleAttendance(enrollment)}
                            disabled={loadingAttendance === enrollment.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              enrollment.attended 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-white border-2 border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
                            } ${loadingAttendance === enrollment.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {enrollment.attended ? (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Presente</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-4 h-4" />
                                <span>Marcar</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notas */}
              {scheduledClass.notes && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
                  <h3 className="font-semibold text-blue-900 mb-3">📝 Notas</h3>
                  <p className="text-sm text-blue-800 leading-relaxed">{scheduledClass.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Grabación */}
      <Dialog open={showRecordingModal} onOpenChange={setShowRecordingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {scheduledClass.recording_url ? 'Cambiar Grabación' : 'Agregar Grabación'}
            </DialogTitle>
            <DialogDescription>
              La grabación reemplazará el video de introducción para los aprendices
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700">URL de la Grabación</Label>
              <Input
                type="url"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="border-gray-300"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordingModal(false)} className="border-gray-300 text-gray-700">
              Cancelar
            </Button>
            <Button onClick={handleAddRecording} className="bg-[#073372] hover:bg-[#052555] text-white">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          color: #374151;
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
          color: #111827;
        }
        .rich-content em {
          font-style: italic;
        }
        .rich-content u {
          text-decoration: underline;
        }
        .rich-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        .rich-content th, .rich-content td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
          text-align: left;
        }
        .rich-content th {
          background: #f9fafb;
          font-weight: 600;
          color: #111827;
        }
        .rich-content td {
          color: #374151;
        }
      `}</style>
    </AuthenticatedLayout>
  );
};

export default ClassDetail;
