import React, { useState } from 'react';
import { 
  ArrowLeft, Calendar, Clock, Users, Video, Film, Edit, 
  Play, CheckCircle, XCircle, UserPlus, UserMinus, ExternalLink
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Link, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  duration_minutes: number;
  description?: string;
  content?: string;
  intro_video_url?: string;
  academic_level: AcademicLevel;
  resources: Array<{
    id: number;
    name: string;
    file_path: string;
    file_type: string;
  }>;
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      scheduled: { variant: 'outline', label: 'Programada' },
      in_progress: { variant: 'default', label: 'En curso' },
      completed: { variant: 'secondary', label: 'Completada' },
      cancelled: { variant: 'destructive', label: 'Cancelada' },
    };
    const config = variants[status] || variants.scheduled;
    return <Badge variant={config.variant} className="text-sm">{config.label}</Badge>;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUpdateStatus = (newStatus: string) => {
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
    if (!recordingUrl) return;
    
    router.post(`/admin/scheduled-classes/${scheduledClass.id}/recording`, {
      recording_url: recordingUrl
    }, {
      onSuccess: () => {
        toast.success('Grabación guardada');
        setShowRecordingModal(false);
      },
      onError: () => {
        toast.error('Error al guardar grabación');
      }
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
      onError: () => {
        toast.error('Error al inscribir estudiante');
      }
    });
  };

  const handleUnenrollStudent = (studentId: number) => {
    if (confirm('¿Estás seguro de remover a este estudiante?')) {
      router.delete(`/admin/scheduled-classes/${scheduledClass.id}/unenroll/${studentId}`, {
        onSuccess: () => {
          toast.success('Estudiante removido');
        },
        onError: () => {
          toast.error('Error al remover estudiante');
        }
      });
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 
      ? `https://www.youtube.com/embed/${match[2]}`
      : url;
  };

  // Determinar qué video mostrar
  const videoUrl = scheduledClass.recording_url || scheduledClass.template.intro_video_url;
  const isRecording = !!scheduledClass.recording_url;

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/scheduled-classes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: scheduledClass.template.academic_level?.color || '#3B82F6' }}
                >
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{scheduledClass.template.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{scheduledClass.template.academic_level.name}</Badge>
                    {getStatusBadge(scheduledClass.status)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {scheduledClass.status === 'scheduled' && (
              <Button 
                variant="outline"
                onClick={() => handleUpdateStatus('in_progress')}
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Clase
              </Button>
            )}
            {scheduledClass.status === 'in_progress' && (
              <Button 
                onClick={() => handleUpdateStatus('completed')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar Completada
              </Button>
            )}
            {scheduledClass.status === 'completed' && (
              <Button 
                variant="outline"
                onClick={() => setShowRecordingModal(true)}
              >
                <Film className="w-4 h-4 mr-2" />
                {scheduledClass.recording_url ? 'Cambiar Grabación' : 'Agregar Grabación'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Video Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  {isRecording ? 'Grabación de la Clase' : 'Video de Introducción'}
                </CardTitle>
                {isRecording && (
                  <Badge variant="default" className="w-fit">
                    <Film className="w-3 h-3 mr-1" />
                    Grabación de sesión
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {videoUrl ? (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={getYouTubeEmbedUrl(videoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg bg-gray-100 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay video disponible</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            {scheduledClass.template.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{scheduledClass.template.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Content */}
            {scheduledClass.template.content && (
              <Card>
                <CardHeader>
                  <CardTitle>Contenido de la Clase</CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: scheduledClass.template.content }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Información</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Fecha y Hora</p>
                    <p className="text-sm text-gray-600">{formatDateTime(scheduledClass.scheduled_at)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Profesor</p>
                    <p className="text-sm text-gray-600">
                      {scheduledClass.teacher?.name || 'Sin asignar'}
                    </p>
                  </div>
                </div>

                {scheduledClass.meet_url && (
                  <div>
                    <a 
                      href={scheduledClass.meet_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir enlace de Meet
                    </a>
                  </div>
                )}

                {scheduledClass.notes && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-1">Notas</p>
                    <p className="text-sm text-gray-600">{scheduledClass.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Students Card */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Estudiantes ({scheduledClass.enrollments.length}/{scheduledClass.max_students})
                  </CardTitle>
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
              </CardHeader>
              <CardContent>
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
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {enrollment.student.first_name} {enrollment.student.last_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {enrollment.attended && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                Asistió
                              </Badge>
                            )}
                            {enrollment.exam_completed && (
                              <Badge variant="outline" className="text-xs text-blue-600">
                                Examen ✓
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => handleUnenrollStudent(enrollment.student.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resources */}
            {scheduledClass.template.resources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recursos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {scheduledClass.template.resources.map((resource) => (
                      <a
                        key={resource.id}
                        href={`/storage/${resource.file_path}`}
                        download
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {resource.file_type.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm truncate flex-1">{resource.name}</span>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

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
              <Button onClick={handleAddRecording}>
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
              <Button onClick={handleEnrollStudent}>
                Inscribir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};

export default Show;
