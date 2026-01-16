import React from 'react';
import { 
  BookOpen, ArrowLeft, Edit, Copy, Video, FileQuestion, 
  FileText, Clock, CheckCircle2, Download 
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Link, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

interface AcademicLevel {
  id: number;
  name: string;
  code: string;
  color?: string;
}

interface TemplateQuestion {
  id: number;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options: { text: string; is_correct: boolean }[];
  explanation?: string;
  points: number;
  is_active: boolean;
}

interface TemplateResource {
  id: number;
  name: string;
  file_path: string;
  file_type: string;
  file_size?: string;
  description?: string;
  download_count: number;
}

interface Creator {
  id: number;
  name: string;
}

interface ClassTemplate {
  id: number;
  academic_level_id: number;
  title: string;
  session_number: string;
  modality: 'theoretical' | 'practical';
  description?: string;
  content?: string;
  objectives?: string;
  intro_video_url?: string;
  intro_video_thumbnail?: string;
  duration_minutes: number;
  order: number;
  has_exam: boolean;
  exam_questions_count: number;
  exam_passing_score: number;
  is_active: boolean;
  questions: TemplateQuestion[];
  resources: TemplateResource[];
  academic_level: AcademicLevel;
  creator: Creator;
  created_at: string;
}

interface Props {
  template: ClassTemplate;
}

const Show: React.FC<Props> = ({ template }) => {
  const handleDuplicate = () => {
    router.post(`/admin/class-templates/${template.id}/duplicate`, {}, {
      onSuccess: () => {
        toast.success('Plantilla duplicada exitosamente');
      },
      onError: () => {
        toast.error('Error al duplicar plantilla');
      }
    });
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 
      ? `https://www.youtube.com/embed/${match[2]}`
      : url;
  };

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/class-templates">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: template.academic_level?.color || '#3B82F6' }}
                >
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{template.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{template.academic_level.name}</Badge>
                    <Badge variant={template.modality === 'theoretical' ? 'secondary' : 'default'}>
                      {template.modality === 'theoretical' ? 'Teórica' : 'Práctica'}
                    </Badge>
                    <Badge variant={template.is_active ? 'default' : 'destructive'}>
                      {template.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </Button>
            <Link href={`/admin/class-templates/${template.id}/edit`}>
              <Button className="bg-[#073372] hover:bg-[#052555]">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{template.duration_minutes}</p>
                  <p className="text-sm text-gray-500">minutos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <FileQuestion className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{template.questions.length}</p>
                  <p className="text-sm text-gray-500">preguntas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{template.resources.length}</p>
                  <p className="text-sm text-gray-500">recursos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{template.exam_passing_score}%</p>
                  <p className="text-sm text-gray-500">para aprobar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="content" className="space-y-6">
          <TabsList>
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="questions">Preguntas ({template.questions.length})</TabsTrigger>
            <TabsTrigger value="resources">Recursos ({template.resources.length})</TabsTrigger>
          </TabsList>

          {/* Tab Contenido */}
          <TabsContent value="content" className="space-y-6">
            {template.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{template.description}</p>
                </CardContent>
              </Card>
            )}

            {template.objectives && (
              <Card>
                <CardHeader>
                  <CardTitle>Objetivos de Aprendizaje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-line text-gray-700">{template.objectives}</div>
                </CardContent>
              </Card>
            )}

            {template.content && (
              <Card>
                <CardHeader>
                  <CardTitle>Desarrollo de la Clase</CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: template.content }}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Video */}
          <TabsContent value="video">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Video de Introducción
                </CardTitle>
                <CardDescription>
                  Este video se muestra a los aprendices antes de la grabación de su sesión
                </CardDescription>
              </CardHeader>
              <CardContent>
                {template.intro_video_url ? (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={getYouTubeEmbedUrl(template.intro_video_url)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg bg-gray-100 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay video de introducción configurado</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Preguntas */}
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileQuestion className="h-5 w-5" />
                  Banco de Preguntas
                </CardTitle>
                <CardDescription>
                  Se seleccionarán {template.exam_questions_count} preguntas aleatorias para cada examen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {template.questions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay preguntas en el banco</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {template.questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="p-4 border rounded-lg bg-gray-50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                            <Badge variant={question.type === 'multiple_choice' ? 'default' : 'secondary'}>
                              {question.type === 'multiple_choice' ? 'Opción múltiple' : 'V/F'}
                            </Badge>
                            <Badge variant="outline">{question.points} pts</Badge>
                          </div>
                          {!question.is_active && (
                            <Badge variant="destructive">Inactiva</Badge>
                          )}
                        </div>
                        <p className="font-medium text-gray-900 mb-3">{question.question}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {question.options.map((option, i) => (
                            <div
                              key={i}
                              className={`p-2 rounded text-sm ${
                                option.is_correct
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : 'bg-white border'
                              }`}
                            >
                              {option.is_correct && (
                                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                              )}
                              {option.text}
                            </div>
                          ))}
                        </div>
                        {question.explanation && (
                          <p className="mt-3 text-sm text-gray-600 italic">
                            💡 {question.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Recursos */}
          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recursos Descargables
                </CardTitle>
              </CardHeader>
              <CardContent>
                {template.resources.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay recursos disponibles</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {template.resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{resource.name}</p>
                          <p className="text-sm text-gray-500">
                            {resource.file_type.toUpperCase()} • {resource.download_count} descargas
                          </p>
                        </div>
                        <a
                          href={`/storage/${resource.file_path}`}
                          download
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          <Download className="w-5 h-5 text-gray-600" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="mt-6 pt-6 border-t text-sm text-gray-500 flex items-center justify-between">
          <span>Creado por: {template.creator?.name}</span>
          <span>Sesión #{template.session_number} • Orden: {template.order}</span>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Show;
