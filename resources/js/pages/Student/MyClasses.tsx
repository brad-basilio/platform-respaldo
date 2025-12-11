import React from 'react';
import { BookOpen, Video, Calendar, CheckCircle, Clock, PlayCircle, Lock } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface AcademicLevel {
  id: number;
  name: string;
  color?: string;
}

interface ScheduledClass {
  id: number;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  recording_url?: string;
  template: {
    id: number;
    title: string;
    session_number: string;
    description?: string;
    intro_video_url?: string;
    has_exam: boolean;
    duration_minutes: number;
    academic_level: AcademicLevel;
  };
}

interface ClassEnrollment {
  id: number;
  attended: boolean;
  exam_completed: boolean;
  scheduled_class: ScheduledClass;
}

interface Props {
  enrollments: ClassEnrollment[];
  completedCount: number;
  totalCount: number;
}

const StudentMyClasses: React.FC<Props> = ({ enrollments, completedCount, totalCount }) => {
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getStatusBadge = (status: string, attended: boolean, examCompleted: boolean) => {
    if (status === 'completed' && attended && examCompleted) {
      return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completada</Badge>;
    }
    if (status === 'completed') {
      return <Badge variant="secondary">Clase terminada</Badge>;
    }
    if (status === 'in_progress') {
      return <Badge className="bg-blue-600"><PlayCircle className="w-3 h-3 mr-1" />En progreso</Badge>;
    }
    if (status === 'scheduled') {
      return <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" />Programada</Badge>;
    }
    return <Badge variant="destructive">Cancelada</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isAccessible = (status: string) => {
    return status === 'completed' || status === 'in_progress';
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Clases</h1>
          <p className="text-gray-600">Revisa el contenido de tus sesiones y completa las evaluaciones</p>
        </div>

        {/* Progress Card */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Tu Progreso</CardTitle>
            <CardDescription>
              Has completado {completedCount} de {totalCount} clases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={progressPercentage} className="flex-1 h-3" />
              <span className="text-2xl font-bold text-blue-600">{progressPercentage}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Classes List */}
        {enrollments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes clases asignadas</h3>
              <p className="text-gray-600">Cuando se te asignen clases, aparecerán aquí.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => {
              const { scheduled_class } = enrollment;
              const { template } = scheduled_class;
              const accessible = isAccessible(scheduled_class.status);

              return (
                <Card 
                  key={enrollment.id}
                  className={`transition ${accessible ? 'hover:shadow-md' : 'opacity-75'}`}
                >
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {/* Left Color Bar */}
                      <div 
                        className="w-2 rounded-l-lg"
                        style={{ backgroundColor: template.academic_level?.color || '#3B82F6' }}
                      />
                      
                      {/* Content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {template.academic_level.name}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Sesión {template.session_number}
                              </Badge>
                              {getStatusBadge(scheduled_class.status, enrollment.attended, enrollment.exam_completed)}
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {template.title}
                            </h3>
                            
                            {template.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(scheduled_class.scheduled_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {template.duration_minutes} min
                              </span>
                              {scheduled_class.recording_url && (
                                <span className="flex items-center gap-1 text-purple-600">
                                  <Video className="w-4 h-4" />
                                  Grabación disponible
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="ml-4">
                            {accessible ? (
                              <Link href={`/student/class-enrollments/${enrollment.id}`}>
                                <Button>
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                  Ver Clase
                                </Button>
                              </Link>
                            ) : (
                              <Button disabled variant="outline">
                                <Lock className="w-4 h-4 mr-2" />
                                Próximamente
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Progress indicators */}
                        {scheduled_class.status === 'completed' && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-4">
                            <div className={`flex items-center gap-1 text-sm ${
                              enrollment.attended ? 'text-green-600' : 'text-gray-400'
                            }`}>
                              <CheckCircle className="w-4 h-4" />
                              Asistencia
                            </div>
                            {template.has_exam && (
                              <div className={`flex items-center gap-1 text-sm ${
                                enrollment.exam_completed ? 'text-green-600' : 'text-gray-400'
                              }`}>
                                <CheckCircle className="w-4 h-4" />
                                Evaluación
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default StudentMyClasses;
