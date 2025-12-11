import React, { useState } from 'react';
import { 
  BookOpen, Video, FileText, FileQuestion, Download, Clock, 
  CheckCircle, Play, Award, ChevronDown, ChevronUp
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface AcademicLevel {
  id: number;
  name: string;
  color?: string;
}

interface TemplateQuestion {
  id: number;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options: { text: string; is_correct: boolean }[];
  points: number;
}

interface TemplateResource {
  id: number;
  name: string;
  file_path: string;
  file_type: string;
}

interface ClassTemplate {
  id: number;
  title: string;
  session_number: string;
  description?: string;
  content?: string;
  objectives?: string;
  intro_video_url?: string;
  duration_minutes: number;
  has_exam: boolean;
  exam_questions_count: number;
  exam_passing_score: number;
  academic_level: AcademicLevel;
  resources: TemplateResource[];
}

interface ExamAttempt {
  id: number;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  completed_at: string;
}

interface ClassEnrollment {
  id: number;
  attended: boolean;
  exam_completed: boolean;
  scheduled_class: {
    id: number;
    scheduled_at: string;
    recording_url?: string;
    status: string;
    template: ClassTemplate;
  };
  latest_exam_attempt?: ExamAttempt;
}

interface Props {
  enrollment: ClassEnrollment;
  examQuestions?: TemplateQuestion[];
}

const StudentClassView: React.FC<Props> = ({ enrollment, examQuestions }) => {
  const [showContent, setShowContent] = useState(true);
  const [showExam, setShowExam] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);

  const { scheduled_class } = enrollment;
  const { template } = scheduled_class;
  
  // Determinar qué video mostrar (grabación tiene prioridad)
  const videoUrl = scheduled_class.recording_url || template.intro_video_url;
  const isRecording = !!scheduled_class.recording_url;

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 
      ? `https://www.youtube.com/embed/${match[2]}`
      : url;
  };

  const handleStartExam = () => {
    setShowExam(true);
    setCurrentQuestion(0);
    setAnswers({});
    setExamSubmitted(false);
  };

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitExam = () => {
    if (!examQuestions) return;
    
    const answersArray = examQuestions.map((_, index) => answers[index] || null);
    
    router.post(`/student/class-enrollments/${enrollment.id}/submit-exam`, {
      answers: answersArray
    }, {
      onSuccess: () => {
        toast.success('Examen enviado');
        setExamSubmitted(true);
      },
      onError: () => {
        toast.error('Error al enviar el examen');
      }
    });
  };

  const examProgress = examQuestions 
    ? Math.round((Object.keys(answers).length / examQuestions.length) * 100)
    : 0;

  return (
    <AuthenticatedLayout>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: template.academic_level?.color || '#3B82F6' }}
            >
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{template.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{template.academic_level.name}</Badge>
                <Badge variant="secondary">Sesión {template.session_number}</Badge>
                {enrollment.attended && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Asistió
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {template.description && (
            <p className="text-gray-600 mt-3">{template.description}</p>
          )}
        </div>

        {/* Video Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                {isRecording ? 'Grabación de tu Clase' : 'Video Introductorio'}
              </CardTitle>
              {isRecording && (
                <Badge variant="default" className="bg-purple-600">
                  <Play className="w-3 h-3 mr-1" />
                  Tu sesión grabada
                </Badge>
              )}
            </div>
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
                  <p>El video estará disponible pronto</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Section */}
        {template.content && (
          <Card className="mb-6">
            <CardHeader className="cursor-pointer" onClick={() => setShowContent(!showContent)}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Desarrollo de la Clase
                </CardTitle>
                {showContent ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
            {showContent && (
              <CardContent>
                {template.objectives && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">🎯 Objetivos de Aprendizaje</h3>
                    <div className="text-blue-800 whitespace-pre-line">{template.objectives}</div>
                  </div>
                )}
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: template.content }}
                />
              </CardContent>
            )}
          </Card>
        )}

        {/* Resources Section */}
        {template.resources.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Material Descargable
              </CardTitle>
              <CardDescription>
                Descarga estos recursos para complementar tu aprendizaje
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {template.resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={`/storage/${resource.file_path}`}
                    download
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{resource.name}</p>
                      <p className="text-sm text-gray-500">{resource.file_type.toUpperCase()}</p>
                    </div>
                    <Download className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exam Section */}
        {template.has_exam && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5" />
                Evaluación de la Sesión
              </CardTitle>
              <CardDescription>
                Responde las preguntas para completar esta sesión. Necesitas {template.exam_passing_score}% para aprobar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enrollment.exam_completed && enrollment.latest_exam_attempt ? (
                // Mostrar resultado del examen
                <div className="text-center py-6">
                  <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    enrollment.latest_exam_attempt.passed ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {enrollment.latest_exam_attempt.passed ? (
                      <Award className="w-12 h-12 text-green-600" />
                    ) : (
                      <FileQuestion className="w-12 h-12 text-red-600" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {enrollment.latest_exam_attempt.passed ? '¡Felicitaciones!' : 'Sigue intentando'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Obtuviste {enrollment.latest_exam_attempt.score} de {enrollment.latest_exam_attempt.total_points} puntos
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                    <span className={`text-2xl font-bold ${
                      enrollment.latest_exam_attempt.passed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {enrollment.latest_exam_attempt.percentage}%
                    </span>
                    <Badge variant={enrollment.latest_exam_attempt.passed ? 'default' : 'destructive'}>
                      {enrollment.latest_exam_attempt.passed ? 'Aprobado' : 'No aprobado'}
                    </Badge>
                  </div>
                  {!enrollment.latest_exam_attempt.passed && (
                    <Button className="mt-6" onClick={handleStartExam}>
                      Intentar de nuevo
                    </Button>
                  )}
                </div>
              ) : showExam && examQuestions ? (
                // Mostrar examen
                <div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">
                        Pregunta {currentQuestion + 1} de {examQuestions.length}
                      </span>
                      <span className="text-sm text-gray-600">
                        {Object.keys(answers).length} respondidas
                      </span>
                    </div>
                    <Progress value={examProgress} className="h-2" />
                  </div>

                  <div className="p-6 bg-gray-50 rounded-lg mb-6">
                    <p className="text-lg font-medium mb-4">
                      {examQuestions[currentQuestion].question}
                    </p>
                    <RadioGroup
                      value={answers[currentQuestion] || ''}
                      onValueChange={(value) => handleAnswerSelect(currentQuestion, value)}
                    >
                      {examQuestions[currentQuestion].options.map((option, i) => (
                        <div key={i} className="flex items-center space-x-2 p-3 bg-white rounded-lg mb-2 hover:bg-blue-50 transition">
                          <RadioGroupItem value={option.text} id={`option-${i}`} />
                          <Label htmlFor={`option-${i}`} className="flex-1 cursor-pointer">
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestion === 0}
                    >
                      Anterior
                    </Button>
                    
                    <div className="flex gap-1">
                      {examQuestions.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentQuestion(i)}
                          className={`w-8 h-8 rounded text-sm font-medium transition ${
                            i === currentQuestion
                              ? 'bg-blue-600 text-white'
                              : answers[i]
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    {currentQuestion === examQuestions.length - 1 ? (
                      <Button
                        onClick={handleSubmitExam}
                        disabled={Object.keys(answers).length < examQuestions.length}
                      >
                        Enviar Examen
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setCurrentQuestion(prev => Math.min(examQuestions.length - 1, prev + 1))}
                      >
                        Siguiente
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                // Botón para iniciar examen
                <div className="text-center py-8">
                  <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">¿Listo para la evaluación?</h3>
                  <p className="text-gray-600 mb-6">
                    Tendrás {template.exam_questions_count} preguntas aleatorias.<br />
                    Necesitas {template.exam_passing_score}% para aprobar.
                  </p>
                  <Button size="lg" onClick={handleStartExam}>
                    <Play className="w-4 h-4 mr-2" />
                    Comenzar Evaluación
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Duración estimada: {template.duration_minutes} minutos</span>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default StudentClassView;
