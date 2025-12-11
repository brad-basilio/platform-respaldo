import React, { useState } from 'react';
import { BookOpen, CheckCircle, Clock, PlayCircle, Send, Eye, FileQuestion, FileText, AlertCircle } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Link, router } from '@inertiajs/react';
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

interface Props {
  templates: ClassTemplate[];
  enrollments: Record<number, ClassEnrollment>; // keyed by template_id
  myRequests: Record<number, ClassRequest>; // keyed by template_id
  academicLevel?: AcademicLevel;
  message?: string;
}

const StudentMyClasses: React.FC<Props> = ({ 
  templates, 
  enrollments, 
  myRequests, 
  academicLevel,
  message 
}) => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ClassTemplate | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calcular progreso
  const completedCount = Object.values(enrollments).filter(e => 
    e.scheduled_class.status === 'completed' && e.attended && e.exam_completed
  ).length;
  const totalCount = templates.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
    const enrollment = enrollments[template.id];
    const request = myRequests[template.id];

    if (enrollment) {
      const sc = enrollment.scheduled_class;
      if (sc.status === 'completed' && enrollment.attended && enrollment.exam_completed) {
        return { type: 'completed', label: 'Completada', color: 'bg-green-600' };
      }
      if (sc.status === 'completed') {
        return { type: 'pending_exam', label: 'Pendiente examen', color: 'bg-yellow-600' };
      }
      if (sc.status === 'in_progress') {
        return { type: 'in_progress', label: 'En curso', color: 'bg-blue-600' };
      }
      return { type: 'scheduled', label: 'Programada', color: 'bg-purple-600' };
    }

    if (request) {
      if (request.status === 'pending') {
        return { type: 'request_pending', label: 'Solicitud pendiente', color: 'bg-orange-500' };
      }
      if (request.status === 'approved') {
        return { type: 'request_approved', label: 'Aprobada', color: 'bg-cyan-600' };
      }
    }

    return { type: 'available', label: 'Disponible', color: 'bg-gray-400' };
  };

  if (message) {
    return (
      <AuthenticatedLayout>
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
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: academicLevel?.color || '#3B82F6' }}
            >
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Clases</h1>
              <p className="text-gray-600">{academicLevel?.name || 'Sin nivel asignado'}</p>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="mb-8 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white">
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Tu Progreso</h3>
                <p className="text-blue-100">
                  Has completado {completedCount} de {totalCount} sesiones
                </p>
              </div>
              <div className="text-4xl font-bold">{progressPercentage}%</div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-white rounded-full h-3 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600" />
            <span className="text-gray-600">Completada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            <span className="text-gray-600">En curso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-600" />
            <span className="text-gray-600">Programada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-600">Solicitud pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-gray-600">Disponible para solicitar</span>
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay clases disponibles</h3>
              <p className="text-gray-600">Las clases de tu nivel aparecerán aquí.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const status = getTemplateStatus(template);
              const enrollment = enrollments[template.id];
              const request = myRequests[template.id];

              return (
                <Card 
                  key={template.id}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    status.type === 'completed' ? 'border-green-200 bg-green-50/50' : ''
                  }`}
                >
                  {/* Status Bar */}
                  <div className={`h-1.5 ${status.color}`} />
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="text-xs mb-2">
                        Sesión {template.session_number}
                      </Badge>
                      <Badge className={`${status.color} text-white text-xs`}>
                        {status.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-base leading-tight">
                      {template.title}
                    </CardTitle>
                    {template.description && (
                      <CardDescription className="line-clamp-2 text-xs">
                        {template.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Info */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {template.duration_minutes} min
                      </span>
                      {template.has_exam && (
                        <span className="flex items-center gap-1">
                          <FileQuestion className="w-3.5 h-3.5" />
                          {template.questions_count} preguntas
                        </span>
                      )}
                      {template.resources_count > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {template.resources_count}
                        </span>
                      )}
                    </div>

                    {/* Actions based on status */}
                    {status.type === 'completed' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Clase completada</span>
                        </div>
                        {enrollment && (
                          <Link href={`/student/class-enrollments/${enrollment.id}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver contenido
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}

                    {(status.type === 'in_progress' || status.type === 'scheduled' || status.type === 'pending_exam') && enrollment && (
                      <Link href={`/student/class-enrollments/${enrollment.id}`}>
                        <Button className="w-full bg-[#073372] hover:bg-[#052555]">
                          <PlayCircle className="w-4 h-4 mr-2" />
                          {status.type === 'pending_exam' ? 'Completar examen' : 'Ver clase'}
                        </Button>
                      </Link>
                    )}

                    {status.type === 'request_pending' && request && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-orange-600 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>Esperando respuesta...</span>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/student/class-templates/${template.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver temario
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => cancelRequest(request.id)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {status.type === 'request_approved' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-cyan-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Aprobada - En espera de programación</span>
                        </div>
                        <Link href={`/student/class-templates/${template.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver temario
                          </Button>
                        </Link>
                      </div>
                    )}

                    {status.type === 'available' && (
                      <div className="flex gap-2">
                        <Link href={`/student/class-templates/${template.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver temario
                          </Button>
                        </Link>
                        <Button 
                          size="sm"
                          className="flex-1 bg-[#17BC91] hover:bg-[#14a77f]"
                          onClick={() => handleRequestClass(template)}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Solicitar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

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
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Send className="w-5 h-5 text-white" />
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-1">{selectedTemplate.title}</h4>
                  {selectedTemplate.description && (
                    <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                  )}
                </div>

                <Textarea
                  label="Mensaje (opcional)"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="¿Tienes alguna preferencia de horario o comentario adicional?"
                  rows={3}
                />

                <p className="text-xs text-gray-500">
                  Al solicitar esta clase, un administrador revisará tu petición y te asignará a una sesión disponible.
                </p>
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
      </div>
    </AuthenticatedLayout>
  );
};

export default StudentMyClasses;
