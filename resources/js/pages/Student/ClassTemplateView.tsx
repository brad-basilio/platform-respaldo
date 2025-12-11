import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { 
  ArrowLeft, Clock, Play, FileText, 
  Send, MessageCircle, Calendar, Lock, Users, Sparkles,
  BookOpen, Target, Video, CheckCircle, GraduationCap
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
}

interface ClassTemplate {
  id: number;
  title: string;
  description?: string;
  content?: string;
  objectives?: string | null;
  intro_video_url?: string;
  intro_video_thumbnail?: string;
  modality?: 'theoretical' | 'practical';
  session_number: string;
  duration_minutes: number;
  academic_level: AcademicLevel;
  questions: Question[];
  resources: Resource[];
}

interface ClassRequest {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  student_message?: string;
  admin_response?: string;
  created_at: string;
}

interface ScheduledClass {
  id: number;
  scheduled_at: string;
  status: string;
  meet_url?: string;
  teacher?: { id: number; name: string };
}

interface Enrollment {
  id: number;
  scheduled_class: ScheduledClass;
}

interface Props {
  template: ClassTemplate;
  existingRequest: ClassRequest | null;
  enrollment: Enrollment | null;
}

const ClassTemplateView: React.FC<Props> = ({ template, existingRequest, enrollment }) => {
  const enrolledClass = enrollment?.scheduled_class || null;
  const isEnrolled = !!enrolledClass;
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRequest = () => {
    if (existingRequest || enrolledClass) return;

    setSubmitting(true);
    router.post('/student/class-requests', {
      class_template_id: template.id,
      message: message.trim() || null,
    }, {
      onSuccess: () => {
        toast.success('¡Solicitud enviada! Te notificaremos cuando sea procesada.');
        setShowRequestModal(false);
      },
      onError: () => {
        toast.error('Error al enviar la solicitud');
        setSubmitting(false);
      },
    });
  };

  const getStatusInfo = () => {
    if (enrolledClass) {
      return {
        type: 'enrolled',
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Inscrito',
        description: `Clase programada para el ${new Date(enrolledClass.scheduled_at).toLocaleDateString('es-PE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        })}`
      };
    }
    
    if (existingRequest) {
      const statuses: Record<string, { color: string; textColor: string; bgColor: string; borderColor: string; label: string; description: string }> = {
        pending: { 
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          label: 'Solicitud Pendiente', 
          description: 'Tu solicitud está siendo revisada por el equipo académico' 
        },
        approved: { 
          color: 'bg-cyan-500',
          textColor: 'text-cyan-700',
          bgColor: 'bg-cyan-50',
          borderColor: 'border-cyan-200',
          label: 'Solicitud Aprobada', 
          description: 'Tu solicitud fue aprobada. Pronto te asignarán una clase' 
        },
        scheduled: { 
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Clase Programada', 
          description: 'Ya tienes una clase asignada' 
        },
        rejected: { 
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Solicitud Rechazada', 
          description: existingRequest.admin_response || 'Tu solicitud no fue aprobada' 
        },
      };
      return { type: 'requested', ...statuses[existingRequest.status] };
    }
    
    return {
      type: 'available',
      color: 'bg-gray-400',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      label: 'Disponible',
      description: 'Puedes solicitar esta clase'
    };
  };

  const status = getStatusInfo();
  const canAccessContent = isEnrolled;

  // Extraer video ID de YouTube si es URL de YouTube
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    // Si es Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return url;
  };

  const videoEmbedUrl = template.intro_video_url ? getYouTubeEmbedUrl(template.intro_video_url) : null;

  return (
    <AuthenticatedLayout>
      <Head title={template.title} />
      
      <div className="min-h-screen bg-gray-100">
        {/* Back Button */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link 
              href="/student/my-classes" 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver a mis clases</span>
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
                  ) : template.intro_video_thumbnail ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={template.intro_video_thumbnail} 
                        alt={template.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="w-10 h-10 text-gray-800 ml-1" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                      <Video className="w-16 h-16 mb-3 opacity-50" />
                      <span className="text-sm">Video de introducción no disponible</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info - Right Side (2 cols) */}
              <div className="lg:col-span-2 flex flex-col">
                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
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
                    <span>{template.questions.length} preguntas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{template.resources.length} recursos</span>
                  </div>
                </div>

                {/* Status Card */}
                <div className={`rounded-xl p-4 ${status.bgColor} border ${status.borderColor} mb-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${status.color}`}></div>
                    <span className={`font-semibold ${status.textColor}`}>{status.label}</span>
                  </div>
                  <p className={`text-sm ${status.textColor} opacity-80`}>{status.description}</p>
                </div>

                {/* Action Button */}
                <div className="mt-auto">
                  {status.type === 'available' && (
                    <Button 
                      className="w-full bg-[#073372] hover:bg-[#052555] text-white h-12 text-base"
                      onClick={() => setShowRequestModal(true)}
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Solicitar esta Clase
                    </Button>
                  )}

                  {status.type === 'enrolled' && enrolledClass?.meet_url && (
                    <a 
                      href={enrolledClass.meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full"
                    >
                      <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-base">
                        <Play className="w-5 h-5 mr-2" />
                        Entrar a la clase
                      </Button>
                    </a>
                  )}

                  {status.type === 'requested' && existingRequest?.status === 'rejected' && (
                    <Button 
                      variant="outline"
                      className="w-full h-12 text-base"
                      onClick={() => setShowRequestModal(true)}
                    >
                      Volver a solicitar
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

              {/* Preguntas de Discusión - BLOQUEADAS si no está inscrito */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Preguntas de Discusión</h2>
                        <p className="text-sm text-gray-500">{template.questions.length} preguntas preparadas</p>
                      </div>
                    </div>
                    {!canAccessContent && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm">Bloqueado</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {canAccessContent ? (
                  <div className="px-6 py-4">
                    {template.questions.length > 0 ? (
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
                    ) : (
                      <p className="text-gray-500 text-center py-4">No hay preguntas definidas</p>
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center">
                    <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 mb-1">Contenido bloqueado</p>
                    <p className="text-sm text-gray-400">
                      Solicita esta clase para ver las preguntas de discusión
                    </p>
                  </div>
                )}
              </div>

              {/* Recursos - BLOQUEADOS si no está inscrito */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Recursos de la Clase</h2>
                        <p className="text-sm text-gray-500">{template.resources.length} materiales disponibles</p>
                      </div>
                    </div>
                    {!canAccessContent && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm">Bloqueado</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {canAccessContent ? (
                  <div className="px-6 py-4">
                    {template.resources.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {template.resources.map((res) => (
                          <div
                            key={res.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                          >
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{res.title}</p>
                              <p className="text-xs text-gray-500 capitalize">{res.type}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No hay recursos disponibles</p>
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center">
                    <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 mb-1">Contenido bloqueado</p>
                    <p className="text-sm text-gray-400">
                      Solicita esta clase para acceder a los recursos
                    </p>
                  </div>
                )}
              </div>
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
                    <span className="text-gray-500 text-sm">Preguntas</span>
                    <span className="font-medium text-gray-900">{template.questions.length}</span>
                  </div>
                </div>
              </div>

              {/* Tips Card */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 p-6">
                <h3 className="font-semibold text-blue-900 mb-3">💡 Consejos</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                    <span>Revisa los objetivos antes de la clase</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                    <span>Prepara vocabulario relacionado al tema</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                    <span>No tengas miedo de cometer errores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                    <span>Participa activamente en las discusiones</span>
                  </li>
                </ul>
              </div>

              {/* Instructor Info (si está inscrito) */}
              {isEnrolled && enrolledClass?.teacher && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#073372]" />
                    Tu Profesor
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#073372] flex items-center justify-center text-white font-bold">
                      {enrolledClass.teacher.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{enrolledClass.teacher.name}</p>
                      <p className="text-sm text-gray-500">Instructor</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scheduled Info */}
              {isEnrolled && enrolledClass && (
                <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Clase Programada
                  </h3>
                  <p className="text-green-800">
                    {new Date(enrolledClass.scheduled_at).toLocaleDateString('es-PE', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para el contenido renderizado - igual que RichTextEditor */}
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
        /* Text alignment */
        .rich-content [style*="text-align: center"] {
          text-align: center;
        }
        .rich-content [style*="text-align: right"] {
          text-align: right;
        }
        .rich-content [style*="text-align: left"] {
          text-align: left;
        }
      `}</style>

      {/* Modal de Solicitud */}
      {showRequestModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !submitting && setShowRequestModal(false)}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Solicitar Clase</h3>
                  <p className="text-blue-100 text-sm">{template.title}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                ¿Deseas solicitar esta clase? Nuestro equipo académico revisará tu solicitud y te 
                programará una sesión.
              </p>

              <Textarea
                label="Mensaje (opcional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="¿Tienes alguna preferencia de horario o comentario?"
                rows={3}
              />
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowRequestModal(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="bg-[#073372] hover:bg-[#052555]"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Solicitud
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
};

export default ClassTemplateView;
