import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { 
  ArrowLeft, Clock, Play, FileText, 
  Send, Calendar, Lock, Users, Sparkles,
  BookOpen, Target, Video, CheckCircle, GraduationCap, UserPlus, Plus,
  FileQuestion, Award, Download, ExternalLink, Image, Film, Link as LinkIcon,
  X, ChevronLeft, ChevronRight, Loader2, Eye, XCircle
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import axios from 'axios';

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

interface ExamQuestion {
  id: number;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options: { text: string }[];
  points: number;
}

interface Resource {
  id: number;
  name: string;
  file_type: 'video' | 'pdf' | 'image' | 'link' | 'document';
  description?: string;
  file_path?: string;
  file_size?: number;
  download_url?: string;
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
  // Exam configuration
  has_exam: boolean;
  exam_questions_count: number;
  exam_passing_score: number;
  exam_max_attempts?: number;
}

interface ClassRequest {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  student_message?: string;
  admin_response?: string;
  created_at: string;
  scheduled_class?: ScheduledClass;
}

interface ScheduledClass {
  id: number;
  scheduled_at: string;
  status: string;
  meet_url?: string;
  recording_url?: string;
  teacher?: { id: number; name: string };
}

interface Enrollment {
  id: number;
  scheduled_class: ScheduledClass;
  exam_completed?: boolean;
  exam_score?: number;
  // Latest exam attempt info
  latest_exam_score?: number;
  latest_exam_total_points?: number;
  latest_exam_percentage?: number;
  latest_exam_passed?: boolean;
  exam_attempts_count?: number;
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
  template: ClassTemplate;
  existingRequest: ClassRequest | null;
  enrollment: Enrollment | null;
  studentInfo?: StudentInfo;
}

const ClassTemplateView: React.FC<Props> = ({ template, existingRequest, enrollment, studentInfo }) => {
  const enrolledClass = enrollment?.scheduled_class || null;
  const isEnrolled = !!enrolledClass;
  
  // Determinar si la clase está completada (misma lógica que MyClasses.tsx)
  const isClassCompleted = enrolledClass?.status === 'completed';
  
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // New state for regular students
  const [classConfig, setClassConfig] = useState<ClassConfig | null>(null);
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [calculatedSlot, setCalculatedSlot] = useState<Date | null>(null);
  
  // State for special students preferred datetime
  const [preferredDatetime, setPreferredDatetime] = useState<string>('');

  // Exam modal states
  const [showExamModal, setShowExamModal] = useState(false);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [loadingExam, setLoadingExam] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submittingExam, setSubmittingExam] = useState(false);
  const [examResult, setExamResult] = useState<{
    score: number;
    total_points: number;
    percentage: number;
    passed: boolean;
    passing_score: number;
    attempts: number;
  } | null>(null);

  // Exam review modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [examReview, setExamReview] = useState<{
    attempt: {
      score: number;
      total_points: number;
      percentage: number;
      passed: boolean;
      completed_at: string;
    };
    questions: Array<{
      question: string;
      student_answer: string | null;
      is_correct: boolean;
      points_earned: number;
      points_possible: number;
      correct_answer?: string;
    }>;
    attempts_used: number;
    max_attempts: number;
    attempts_exhausted: boolean;
    show_correct_answers: boolean;
    passing_score: number;
  } | null>(null);

  // Determine student type and verification status
  const studentType = studentInfo?.studentType ?? 'regular';
  const isVerified = studentInfo?.isVerified ?? false;
  const useRegularFlow = studentType === 'regular' && isVerified;
  const useDailyFlow = studentType === 'daily' && isVerified;
  const useWeeklyFlow = studentType === 'weekly' && isVerified;

  // Fetch class config on mount for regular, daily and weekly students
  useEffect(() => {
    if (useRegularFlow || useDailyFlow || useWeeklyFlow) {
      axios.get('/api/student/class-config')
        .then(res => setClassConfig(res.data))
        .catch(err => console.error('Error loading class config:', err));
    }
  }, [useRegularFlow, useDailyFlow, useWeeklyFlow]);

  // Calculate the next available slot based on current time and config
  const nextAvailableSlot = useMemo(() => {
    if (!classConfig) return null;

    const now = new Date();
    const { min_advance_hours, operation_start_hour, operation_end_hour } = classConfig;

    // Calculate next slot: current hour + min_advance_hours, rounded up to next full hour
    let slotHour = now.getHours() + min_advance_hours;
    
    // If we're past minutes, add 1 more hour to round up to next complete hour
    if (now.getMinutes() > 0) {
      slotHour += 1;
    }

    // Create the slot date
    const slot = new Date(now);
    slot.setHours(slotHour, 0, 0, 0);

    // If slot is outside operation hours today, set to start of tomorrow
    if (slot.getHours() >= operation_end_hour) {
      slot.setDate(slot.getDate() + 1);
      slot.setHours(operation_start_hour, 0, 0, 0);
    }

    // If slot is before operation start, set to operation start
    if (slot.getHours() < operation_start_hour) {
      slot.setHours(operation_start_hour, 0, 0, 0);
    }

    return slot;
  }, [classConfig]);

  // Format date to local ISO string (without timezone conversion to UTC)
  const toLocalISOString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Fetch available classes when modal opens for regular students
  useEffect(() => {
    if (showRequestModal && useRegularFlow && nextAvailableSlot) {
      setLoadingClasses(true);
      setSelectedClassId(null);
      
      axios.get(`/api/student/available-classes/${template.id}`, {
        params: { datetime: toLocalISOString(nextAvailableSlot) }
      })
        .then(res => {
          setAvailableClasses(res.data.classes || []);
        })
        .catch(err => {
          console.error('Error loading available classes:', err);
          setAvailableClasses([]);
        })
        .finally(() => setLoadingClasses(false));
    }
  }, [showRequestModal, useRegularFlow, nextAvailableSlot, template.id]);

  // Fetch available classes for daily/weekly students when they select a datetime
  useEffect(() => {
    if (showRequestModal && (useDailyFlow || useWeeklyFlow) && preferredDatetime) {
      setLoadingClasses(true);
      setSelectedClassId(null);
      
      axios.get(`/api/student/available-classes/${template.id}`, {
        params: { datetime: preferredDatetime }
      })
        .then(res => {
          setAvailableClasses(res.data.classes || []);
        })
        .catch(err => {
          console.error('Error loading available classes:', err);
          setAvailableClasses([]);
        })
        .finally(() => setLoadingClasses(false));
    }
  }, [showRequestModal, useDailyFlow, useWeeklyFlow, preferredDatetime, template.id]);

  // Update calculatedSlot when nextAvailableSlot changes (derived state)
  useEffect(() => {
    if (nextAvailableSlot) {
      setCalculatedSlot(nextAvailableSlot);
    }
  }, [nextAvailableSlot]);

  const handleSubmitRequest = () => {
    if (existingRequest || enrolledClass) return;

    setSubmitting(true);
    
    // Determine requested datetime based on flow type
    let requestedDatetime: string | null = null;
    let targetClassId: number | null = null;

    if (useRegularFlow) {
      // Regular student flow - próximo slot disponible
      if (selectedClassId) {
        const selectedClass = availableClasses.find(c => c.id === selectedClassId);
        requestedDatetime = selectedClass?.scheduled_at || null;
        targetClassId = selectedClassId;
      } else if (calculatedSlot) {
        requestedDatetime = toLocalISOString(calculatedSlot);
      }
    } else if (useDailyFlow || useWeeklyFlow) {
      // Daily/Weekly flow - usa el horario seleccionado
      if (preferredDatetime) {
        requestedDatetime = preferredDatetime;
        if (selectedClassId) {
          targetClassId = selectedClassId;
        }
      }
    } else {
      // Non-verified flow - guardar preferencia sin validaciones
      if (preferredDatetime) {
        requestedDatetime = preferredDatetime;
      }
    }
    
    const payload = {
      class_template_id: template.id,
      message: message.trim() || null,
      requested_datetime: requestedDatetime,
      target_scheduled_class_id: targetClassId,
    };

    router.post('/student/class-requests', payload, {
      onSuccess: () => {
        toast.success('¡Solicitud enviada! Te notificaremos cuando sea procesada.');
        setShowRequestModal(false);
        setMessage('');
        setSelectedClassId(null);
        setPreferredDatetime('');
      },
      onError: (errors) => {
        const errorMsg = Object.values(errors)[0] as string || 'Error al enviar la solicitud';
        toast.error(errorMsg);
        setSubmitting(false);
      },
    });
  };

  const formatSlotTime = (date: Date) => {
    return date.toLocaleString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Exam functions
  const handleStartExam = async () => {
    if (!enrollment) return;
    
    setLoadingExam(true);
    setShowExamModal(true);
    setAnswers({});
    setCurrentQuestion(0);
    setExamResult(null);
    
    try {
      const response = await axios.get(`/api/student/class-enrollments/${enrollment.id}/exam-questions`);
      setExamQuestions(response.data.questions);
    } catch (error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError.response?.data?.error || 'Error al cargar el examen');
      setShowExamModal(false);
    } finally {
      setLoadingExam(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitExam = async () => {
    if (!enrollment || examQuestions.length === 0) return;
    
    setSubmittingExam(true);
    
    // Send question IDs along with answers to ensure correct matching
    const answersWithQuestions = examQuestions.map((question, index) => ({
      question_id: question.id,
      answer: answers[index] || null
    }));
    
    try {
      const response = await axios.post(`/student/class-enrollments/${enrollment.id}/submit-exam`, {
        answers: answersWithQuestions
      });
      
      // Show results
      setExamResult(response.data);
      setSubmittingExam(false);
      
      if (response.data.passed) {
        toast.success('¡Felicitaciones! Has aprobado la evaluación.');
      } else {
        toast.error('No alcanzaste el puntaje mínimo. Puedes intentar de nuevo.');
      }
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al enviar el examen');
      setSubmittingExam(false);
    }
  };

  const handleCloseExamAndReload = () => {
    setShowExamModal(false);
    setExamResult(null);
    router.reload();
  };

  // View exam results/review
  const handleViewExamReview = async () => {
    if (!enrollment) return;
    
    setLoadingReview(true);
    setShowReviewModal(true);
    
    try {
      const response = await axios.get(`/api/student/class-enrollments/${enrollment.id}/exam-results`);
      setExamReview(response.data);
    } catch (error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError.response?.data?.error || 'Error al cargar los resultados');
      setShowReviewModal(false);
    } finally {
      setLoadingReview(false);
    }
  };

  const examProgress = examQuestions.length > 0
    ? Math.round((Object.keys(answers).length / examQuestions.length) * 100)
    : 0;

  const getStatusInfo = () => {
    if (enrolledClass) {
      return {
        type: 'enrolled',
        color: 'bg-[#17BC91]',
        textColor: 'text-[#17BC91]',
        bgColor: 'bg-[#17BC91]/10',
        borderColor: 'border-[#17BC91]/30',
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
          color: 'bg-[#F98613]',
          textColor: 'text-[#F98613]',
          bgColor: 'bg-[#F98613]/10',
          borderColor: 'border-[#F98613]/30',
          label: 'Solicitud Pendiente', 
          description: 'Tu solicitud está siendo revisada por el equipo académico' 
        },
        approved: { 
          color: 'bg-[#17BC91]',
          textColor: 'text-[#17BC91]',
          bgColor: 'bg-[#17BC91]/10',
          borderColor: 'border-[#17BC91]/30',
          label: 'Solicitud Aprobada', 
          description: 'Tu solicitud fue aprobada. Pronto te asignarán una clase' 
        },
        scheduled: { 
          color: 'bg-[#17BC91]',
          textColor: 'text-[#17BC91]',
          bgColor: 'bg-[#17BC91]/10',
          borderColor: 'border-[#17BC91]/30',
          label: 'Clase Programada', 
          description: existingRequest.scheduled_class 
            ? `Tu clase está programada para el ${new Date(existingRequest.scheduled_class.scheduled_at).toLocaleDateString('es-PE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}${existingRequest.scheduled_class.teacher ? ` con ${existingRequest.scheduled_class.teacher.name}` : ''}`
            : 'Ya tienes una clase asignada' 
        },
        rejected: { 
          color: 'bg-red-500',
          textColor: 'text-red-600',
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

  // Usar recording_url si la clase está completada y existe, sino usar intro_video_url
  const videoUrl = (isClassCompleted && enrolledClass?.recording_url) 
    ? enrolledClass.recording_url 
    : template.intro_video_url;
  const videoEmbedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
  const isShowingRecording = isClassCompleted && !!enrolledClass?.recording_url;

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
                  
                  {/* Badge de Grabación */}
                  {isShowingRecording && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-600 text-white border-0">
                        <Film className="w-3 h-3 mr-1" />
                        Grabación de la clase
                      </Badge>
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
                <div className="flex flex-wrap gap-3 text-sm mb-6">
                  <div className="flex items-center gap-2 bg-[#073372]/5 px-3 py-1.5 rounded-full">
                    <Clock className="w-4 h-4 text-[#073372]" />
                    <span className="text-[#073372] font-medium">{template.duration_minutes} min</span>
                  </div>
                  {template.has_exam && (
                    <div className="flex items-center gap-2 bg-[#F98613]/10 px-3 py-1.5 rounded-full">
                      <FileQuestion className="w-4 h-4 text-[#F98613]" />
                      <span className="text-[#F98613] font-medium">{template.exam_questions_count} preguntas</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-[#17BC91]/10 px-3 py-1.5 rounded-full">
                    <FileText className="w-4 h-4 text-[#17BC91]" />
                    <span className="text-[#17BC91] font-medium">{template.resources.length} recursos</span>
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

                  {status.type === 'enrolled' && enrolledClass?.meet_url && !isClassCompleted && (
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

                  {/* Show "Enter class" button for scheduled requests with meet_url */}
                  {status.type === 'requested' && existingRequest?.status === 'scheduled' && existingRequest?.scheduled_class?.meet_url && (
                    <a 
                      href={existingRequest.scheduled_class.meet_url}
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
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#073372]/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#073372] rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
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
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#17BC91]/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#17BC91] rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
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

              {/* Sección de Examen - Solo si tiene examen */}
              {template.has_exam && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#F98613]/5 to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#F98613] rounded-lg flex items-center justify-center">
                          <FileQuestion className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Examen de Evaluación</h2>
                          <p className="text-sm text-gray-500">Evalúa tu comprensión del tema</p>
                        </div>
                      </div>
                      {canAccessContent && enrollment?.exam_completed && (
                        <Badge className="bg-emerald-500 text-white">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Completado
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {canAccessContent ? (
                      <div className="space-y-4">
                        {/* Exam Info Cards */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-[#073372]/5 rounded-xl p-4 text-center">
                            <div className="w-12 h-12 bg-[#073372] rounded-full flex items-center justify-center mx-auto mb-2">
                              <FileQuestion className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-2xl font-bold text-[#073372]">{template.exam_questions_count}</p>
                            <p className="text-xs text-gray-500">Preguntas</p>
                          </div>
                          <div className="bg-[#17BC91]/5 rounded-xl p-4 text-center">
                            <div className="w-12 h-12 bg-[#17BC91] rounded-full flex items-center justify-center mx-auto mb-2">
                              <Award className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-2xl font-bold text-[#17BC91]">{template.exam_passing_score}%</p>
                            <p className="text-xs text-gray-500">Para aprobar</p>
                          </div>
                          <div className="bg-[#F98613]/5 rounded-xl p-4 text-center">
                            <div className="w-12 h-12 bg-[#F98613] rounded-full flex items-center justify-center mx-auto mb-2">
                              <Clock className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-2xl font-bold text-[#F98613]">~{Math.ceil(template.exam_questions_count * 1.5)}</p>
                            <p className="text-xs text-gray-500">Minutos aprox.</p>
                          </div>
                        </div>

                        {/* Exam Status & Action */}
                        {enrollment?.exam_completed ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="font-semibold text-emerald-800">¡Examen aprobado!</p>
                                  <p className="text-sm text-emerald-600">
                                    Tu puntuación: {enrollment.latest_exam_percentage ?? enrollment.exam_score}%
                                    {enrollment.exam_attempts_count && enrollment.exam_attempts_count > 1 && (
                                      <span className="text-emerald-500 ml-2">({enrollment.exam_attempts_count} intentos)</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                onClick={handleViewExamReview}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver examen
                              </Button>
                            </div>
                          </div>
                        ) : enrollment?.exam_attempts_count && enrollment.exam_attempts_count > 0 ? (
                          /* Has attempted but not passed yet */
                          (() => {
                            const maxAttempts = template.exam_max_attempts ?? 3;
                            const attemptsUsed = enrollment.exam_attempts_count;
                            const attemptsRemaining = maxAttempts - attemptsUsed;
                            const attemptsExhausted = attemptsRemaining <= 0;
                            
                            return (
                              <div className={`${attemptsExhausted ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} border rounded-xl p-4`}>
                                <div className="flex flex-col gap-4">
                                  <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 ${attemptsExhausted ? 'bg-red-500' : 'bg-amber-500'} rounded-full flex items-center justify-center flex-shrink-0`}>
                                      <FileQuestion className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <p className={`font-semibold ${attemptsExhausted ? 'text-red-800' : 'text-amber-800'}`}>
                                        {attemptsExhausted ? 'Sin intentos restantes' : 'Examen no aprobado aún'}
                                      </p>
                                      <p className={`text-sm ${attemptsExhausted ? 'text-red-600' : 'text-amber-600'}`}>
                                        Último intento: {enrollment.latest_exam_percentage}% 
                                        <span className={`ml-1 ${attemptsExhausted ? 'text-red-500' : 'text-amber-500'}`}>(mínimo: {template.exam_passing_score}%)</span>
                                      </p>
                                      <p className={`text-xs mt-1 ${attemptsExhausted ? 'text-red-500' : 'text-amber-500'}`}>
                                        {attemptsUsed} de {maxAttempts} intento{maxAttempts !== 1 ? 's' : ''} usado{attemptsUsed !== 1 ? 's' : ''}
                                        {!attemptsExhausted && (
                                          <span className="font-medium ml-1">
                                            • {attemptsRemaining} restante{attemptsRemaining !== 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2 justify-end">
                                    <Button 
                                      variant="outline"
                                      className={`${attemptsExhausted ? 'border-red-300 text-red-700 hover:bg-red-100' : 'border-amber-300 text-amber-700 hover:bg-amber-100'}`}
                                      onClick={handleViewExamReview}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      Ver mi examen
                                    </Button>
                                    {!attemptsExhausted && (
                                      <Button 
                                        className="bg-[#F98613] hover:bg-[#d96f0a] text-white"
                                        onClick={handleStartExam}
                                      >
                                        <FileQuestion className="w-4 h-4 mr-2" />
                                        Intentar de nuevo
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="bg-gradient-to-r from-[#F98613]/10 to-[#F98613]/5 border border-[#F98613]/20 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">¿Listo para el examen?</p>
                                <p className="text-sm text-gray-600">Pon a prueba lo que has aprendido</p>
                              </div>
                              <Button 
                                className="bg-[#F98613] hover:bg-[#d96f0a] text-white"
                                onClick={handleStartExam}
                              >
                                <FileQuestion className="w-4 h-4 mr-2" />
                                Iniciar Examen
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Lock className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium mb-1">Examen bloqueado</p>
                        <p className="text-sm text-gray-400">Inscríbete en la clase para acceder al examen</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recursos de la Clase - Mejorado */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#17BC91]/5 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#17BC91] rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
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
                  <div className="p-6">
                    {template.resources.length > 0 ? (
                      <div className="space-y-3">
                        {template.resources.map((res) => {
                          const getResourceIcon = () => {
                            switch (res.file_type) {
                              case 'video': return <Film className="w-5 h-5" />;
                              case 'pdf': return <FileText className="w-5 h-5" />;
                              case 'image': return <Image className="w-5 h-5" />;
                              case 'link': return <LinkIcon className="w-5 h-5" />;
                              default: return <FileText className="w-5 h-5" />;
                            }
                          };
                          
                          const getResourceColor = () => {
                            switch (res.file_type) {
                              case 'video': return 'bg-red-500';
                              case 'pdf': return 'bg-red-600';
                              case 'image': return 'bg-blue-500';
                              case 'link': return 'bg-[#17BC91]';
                              default: return 'bg-gray-500';
                            }
                          };

                          return (
                            <div
                              key={res.id}
                              className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-[#17BC91]/50 hover:shadow-md transition-all duration-200 group cursor-pointer"
                            >
                              <div className={`w-12 h-12 ${getResourceColor()} rounded-xl flex items-center justify-center flex-shrink-0 text-white`}>
                                {getResourceIcon()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 group-hover:text-[#073372] transition-colors">{res.name}</p>
                                {res.description && (
                                  <p className="text-sm text-gray-500 line-clamp-1">{res.description}</p>
                                )}
                                <p className="text-xs text-gray-400 capitalize mt-1">{res.file_type}</p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#17BC91] hover:text-[#14a77f] hover:bg-[#17BC91]/10"
                              >
                                {res.file_type === 'link' ? (
                                  <>
                                    <ExternalLink className="w-4 h-4 mr-1" />
                                    Abrir
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-1" />
                                    Descargar
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500">No hay recursos disponibles para esta clase</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium mb-1">Contenido bloqueado</p>
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

                  {template.has_exam && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 text-sm">Examen</span>
                      <Badge className="bg-[#F98613] text-white border-0">
                        {template.exam_questions_count} preguntas
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500 text-sm">Recursos</span>
                    <span className="font-medium text-gray-900">{template.resources.length}</span>
                  </div>
                </div>
              </div>

              {/* Tips Card - Con colores UNCED */}
              <div className="bg-gradient-to-br from-[#073372]/5 via-white to-[#17BC91]/5 rounded-xl border border-[#073372]/10 p-6">
                <h3 className="font-semibold text-[#073372] mb-3 flex items-center gap-2">
                  💡 Consejos para la clase
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-[#17BC91] flex-shrink-0" />
                    <span>Revisa los objetivos antes de la clase</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-[#17BC91] flex-shrink-0" />
                    <span>Prepara vocabulario relacionado al tema</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-[#17BC91] flex-shrink-0" />
                    <span>No tengas miedo de cometer errores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-[#17BC91] flex-shrink-0" />
                    <span>Participa activamente en las discusiones</span>
                  </li>
                </ul>
              </div>

              {/* Instructor Info (si está inscrito) */}
              {isEnrolled && enrolledClass?.teacher && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#073372]" />
                    Tu Instructor
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#073372] to-[#17BC91] flex items-center justify-center text-white font-bold">
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
                <div className="bg-gradient-to-br from-[#17BC91]/10 to-[#17BC91]/5 rounded-xl border border-[#17BC91]/20 p-6">
                  <h3 className="font-semibold text-[#17BC91] mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {isClassCompleted ? 'Clase Completada' : 'Clase Programada'}
                  </h3>
                  <p className="text-gray-800 font-medium">
                    {new Date(enrolledClass.scheduled_at).toLocaleDateString('es-PE', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {enrolledClass.meet_url && !isClassCompleted && (
                    <a 
                      href={enrolledClass.meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block"
                    >
                      <Button size="sm" className="bg-[#17BC91] hover:bg-[#14a77f] text-white">
                        <Play className="w-4 h-4 mr-1" />
                        Entrar a clase
                      </Button>
                    </a>
                  )}
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
          color: #073372;
          text-decoration: underline;
          cursor: pointer;
        }
        .rich-content a:hover {
          color: #17BC91;
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
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg"
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

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Regular Student Flow - Próximo slot disponible */}
              {useRegularFlow ? (
                <>
                  {/* Calculated Slot Info */}
                  {calculatedSlot && (
                    <div className="bg-[#073372]/5 border border-[#073372]/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-[#073372] mb-2">
                        <Calendar className="w-5 h-5" />
                        <span className="font-semibold">Tu próximo horario disponible</span>
                      </div>
                      <p className="text-[#073372] font-medium capitalize">
                        {formatSlotTime(calculatedSlot)}
                      </p>
                      <p className="text-sm text-[#073372]/70 mt-1">
                        Las clases deben solicitarse con al menos {classConfig?.min_advance_hours || 1} hora(s) de anticipación
                      </p>
                    </div>
                  )}

                  {/* Available Classes */}
                  {loadingClasses ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-3 border-[#073372]/30 border-t-[#073372] rounded-full animate-spin"></div>
                      <span className="ml-3 text-gray-600">Buscando clases disponibles...</span>
                    </div>
                  ) : availableClasses.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-gray-700 font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#17BC91]" />
                        Grupos disponibles para este horario:
                      </p>
                      
                      {availableClasses.map((cls) => (
                        <div
                          key={cls.id}
                          onClick={() => setSelectedClassId(cls.id === selectedClassId ? null : cls.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedClassId === cls.id
                              ? 'border-[#17BC91] bg-[#17BC91]/5'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                selectedClassId === cls.id ? 'bg-[#17BC91] text-white' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <UserPlus className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {cls.teacher?.name || 'Instructor por asignar'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(cls.scheduled_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                cls.available_spots <= 2 
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {cls.enrolled_count}/{cls.max_students} aprendices
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                {cls.available_spots} cupo{cls.available_spots !== 1 ? 's' : ''} disponible{cls.available_spots !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          {selectedClassId === cls.id && (
                            <div className="mt-3 pt-3 border-t border-[#17BC91]/20">
                              <p className="text-sm text-[#17BC91] flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Solicitar unirse a este grupo
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Option to request new class */}
                      <div className="pt-2 border-t border-gray-200">
                        <button
                          onClick={() => setSelectedClassId(null)}
                          className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                            selectedClassId === null
                              ? 'border-[#073372] bg-[#073372]/5'
                              : 'border-dashed border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            selectedClassId === null ? 'bg-[#073372] text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Plus className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">Solicitar nueva clase</p>
                            <p className="text-sm text-gray-500">Se creará un nuevo grupo para este horario</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-700 font-medium">No hay grupos disponibles</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Se solicitará crear una nueva clase para este horario
                      </p>
                    </div>
                  )}

                  {/* Message */}
                  <Textarea
                    label="Mensaje (opcional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="¿Tienes algún comentario adicional?"
                    rows={2}
                  />
                </>
              ) : useDailyFlow ? (
                /* Daily Student Flow - Cualquier hora del día actual */
                <>
                  <div className="bg-[#17BC91]/5 border border-[#17BC91]/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-[#17BC91] mb-2">
                      <Clock className="w-5 h-5" />
                      <span className="font-semibold">Plan Diario</span>
                    </div>
                    <p className="text-sm text-[#17BC91]/80">
                      Puedes elegir cualquier hora disponible para hoy. La clase debe ser al menos 30 minutos en el futuro.
                    </p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-gray-700 mb-3">
                      <Calendar className="w-5 h-5" />
                      <span className="font-semibold">Selecciona la hora de tu clase (hoy)</span>
                    </label>
                    <select
                      value={preferredDatetime}
                      onChange={(e) => setPreferredDatetime(e.target.value)}
                      className="w-full h-14 px-4 bg-white border-2 border-gray-200 rounded-lg text-gray-900 text-base focus:outline-none focus:border-[#17BC91] focus:ring-2 focus:ring-[#17BC91]/20 transition-all"
                    >
                      <option value="">Selecciona una hora...</option>
                      {(() => {
                        const now = new Date();
                        const operationStart = classConfig?.operation_start_hour || 8;
                        const operationEnd = classConfig?.operation_end_hour || 22;
                        const options = [];
                        
                        for (let hour = operationStart; hour < operationEnd; hour++) {
                          const slotDate = new Date(now);
                          slotDate.setHours(hour, 0, 0, 0);
                          
                          // Solo mostrar horas que sean al menos 30 min en el futuro
                          if (slotDate.getTime() > now.getTime() + 30 * 60 * 1000) {
                            const value = toLocalISOString(slotDate);
                            options.push(
                              <option key={hour} value={value}>
                                {hour.toString().padStart(2, '0')}:00
                              </option>
                            );
                          }
                        }
                        return options;
                      })()}
                    </select>
                  </div>

                  {/* Available Classes for selected time */}
                  {preferredDatetime && (
                    <>
                      {loadingClasses ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-6 h-6 border-2 border-[#17BC91]/30 border-t-[#17BC91] rounded-full animate-spin"></div>
                          <span className="ml-2 text-gray-600 text-sm">Buscando grupos...</span>
                        </div>
                      ) : availableClasses.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-gray-700 font-medium text-sm flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#17BC91]" />
                            Grupos disponibles:
                          </p>
                          {availableClasses.map((cls) => (
                            <div
                              key={cls.id}
                              onClick={() => setSelectedClassId(cls.id === selectedClassId ? null : cls.id)}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedClassId === cls.id
                                  ? 'border-[#17BC91] bg-[#17BC91]/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">{cls.teacher?.name || 'Por asignar'}</span>
                                <span className="text-xs text-gray-500">{cls.available_spots} cupos</span>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => setSelectedClassId(null)}
                            className={`w-full p-3 rounded-lg border-2 border-dashed transition-all ${
                              selectedClassId === null ? 'border-[#073372] bg-[#073372]/5' : 'border-gray-300'
                            }`}
                          >
                            <span className="text-sm text-gray-700">+ Solicitar nueva clase</span>
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-2">
                          No hay grupos. Se creará una nueva clase.
                        </p>
                      )}
                    </>
                  )}

                  <Textarea
                    label="Mensaje (opcional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="¿Tienes algún comentario adicional?"
                    rows={2}
                  />
                </>
              ) : useWeeklyFlow ? (
                /* Weekly Student Flow - Cualquier hora de cualquier día de la semana */
                <>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-purple-700 mb-2">
                      <Calendar className="w-5 h-5" />
                      <span className="font-semibold">Plan Semanal</span>
                    </div>
                    <p className="text-sm text-purple-600">
                      Puedes elegir cualquier hora y día dentro de los próximos 7 días.
                    </p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-gray-700 mb-3">
                      <Calendar className="w-5 h-5" />
                      <span className="font-semibold">Selecciona fecha y hora</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={preferredDatetime}
                      onChange={(e) => setPreferredDatetime(e.target.value)}
                      min={(() => {
                        const now = new Date();
                        now.setMinutes(now.getMinutes() + 30);
                        return toLocalISOString(now).slice(0, 16);
                      })()}
                      max={(() => {
                        const maxDate = new Date();
                        maxDate.setDate(maxDate.getDate() + 7);
                        return toLocalISOString(maxDate).slice(0, 16);
                      })()}
                      className="w-full h-14 px-4 bg-white border-2 border-gray-200 rounded-lg text-gray-900 text-base focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                      style={{ colorScheme: 'light' }}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Horarios disponibles: {classConfig?.operation_start_hour || 8}:00 - {classConfig?.operation_end_hour || 22}:00
                    </p>
                  </div>

                  {/* Available Classes for selected time */}
                  {preferredDatetime && (
                    <>
                      {loadingClasses ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
                          <span className="ml-2 text-gray-600 text-sm">Buscando grupos...</span>
                        </div>
                      ) : availableClasses.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-gray-700 font-medium text-sm flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-600" />
                            Grupos disponibles para este horario:
                          </p>
                          {availableClasses.map((cls) => (
                            <div
                              key={cls.id}
                              onClick={() => setSelectedClassId(cls.id === selectedClassId ? null : cls.id)}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedClassId === cls.id
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-gray-900">{cls.teacher?.name || 'Por asignar'}</span>
                                  <p className="text-xs text-gray-500">
                                    {new Date(cls.scheduled_at).toLocaleString('es-PE', { 
                                      weekday: 'short', 
                                      day: 'numeric', 
                                      month: 'short',
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-500">{cls.available_spots} cupos</span>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => setSelectedClassId(null)}
                            className={`w-full p-3 rounded-lg border-2 border-dashed transition-all ${
                              selectedClassId === null ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
                            }`}
                          >
                            <span className="text-sm text-gray-700">+ Solicitar nueva clase</span>
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-2">
                          No hay grupos para este horario. Se creará una nueva clase.
                        </p>
                      )}
                    </>
                  )}

                  <Textarea
                    label="Mensaje (opcional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="¿Tienes algún comentario adicional?"
                    rows={2}
                  />
                </>
              ) : (
                /* Non-verified Student Flow - Sin validaciones estrictas */
                <>
                  <p className="text-gray-600">
                    ¿Deseas solicitar esta clase? Nuestro equipo académico revisará tu solicitud y te 
                    programará una sesión.
                  </p>

                  <div className="bg-[#F98613]/5 border border-[#F98613]/30 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-[#F98613] mb-3">
                      <Calendar className="w-5 h-5" />
                      <span className="font-semibold">¿Cuándo te gustaría tomar la clase?</span>
                    </label>
                    <div className="relative">
                      <input
                        type="datetime-local"
                        value={preferredDatetime}
                        onChange={(e) => setPreferredDatetime(e.target.value)}
                        className="w-full h-14 px-4 bg-white border-2 border-[#F98613]/40 rounded-lg text-gray-900 text-base cursor-pointer focus:outline-none focus:border-[#F98613] focus:ring-2 focus:ring-[#F98613]/20 hover:border-[#F98613]/60 transition-all duration-200"
                        style={{ colorScheme: 'light' }}
                      />
                    </div>
                    <p className="text-xs text-[#F98613]/80 mt-2">
                      Haz clic en el campo para seleccionar fecha y hora. El equipo académico lo revisará y confirmará.
                    </p>
                  </div>

                  <Textarea
                    label="Mensaje adicional (opcional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="¿Algún comentario o preferencia adicional?"
                    rows={2}
                  />
                </>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedClassId(null);
                  setMessage('');
                  setPreferredDatetime('');
                }}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitRequest}
                disabled={
                  submitting || 
                  (useRegularFlow && !calculatedSlot) ||
                  ((useDailyFlow || useWeeklyFlow) && !preferredDatetime)
                }
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
                    {selectedClassId ? 'Solicitar Unirme' : 'Enviar Solicitud'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Modal */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${
              examResult 
                ? examResult.passed 
                  ? 'bg-gradient-to-r from-[#17BC91] to-[#14a57f]' 
                  : 'bg-gradient-to-r from-red-500 to-red-600'
                : 'bg-gradient-to-r from-[#F98613] to-[#d96f0a]'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  {examResult ? (
                    examResult.passed ? <Award className="w-5 h-5 text-white" /> : <FileQuestion className="w-5 h-5 text-white" />
                  ) : (
                    <FileQuestion className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {examResult ? (examResult.passed ? '¡Aprobado!' : 'No aprobado') : 'Evaluación'}
                  </h2>
                  <p className="text-white/80 text-sm">{template.title}</p>
                </div>
              </div>
              <button
                onClick={examResult ? handleCloseExamAndReload : () => setShowExamModal(false)}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingExam ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-[#F98613] animate-spin mb-4" />
                  <p className="text-gray-600">Cargando preguntas del examen...</p>
                </div>
              ) : examResult ? (
                /* Results Screen */
                <div className="text-center py-8">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    examResult.passed ? 'bg-[#17BC91]/10' : 'bg-red-50'
                  }`}>
                    {examResult.passed ? (
                      <Award className="w-12 h-12 text-[#17BC91]" />
                    ) : (
                      <FileQuestion className="w-12 h-12 text-red-500" />
                    )}
                  </div>
                  
                  <h3 className={`text-2xl font-bold mb-2 ${
                    examResult.passed ? 'text-[#17BC91]' : 'text-red-600'
                  }`}>
                    {examResult.passed ? '¡Felicitaciones!' : 'Sigue intentando'}
                  </h3>
                  
                  <p className="text-gray-600 mb-6">
                    {examResult.passed 
                      ? 'Has aprobado la evaluación exitosamente.' 
                      : 'No alcanzaste el puntaje mínimo para aprobar.'}
                  </p>

                  {/* Score Display */}
                  <div className="bg-gray-50 rounded-2xl p-6 mb-6 max-w-sm mx-auto">
                    <div className="text-5xl font-bold mb-2" style={{ color: examResult.passed ? '#17BC91' : '#ef4444' }}>
                      {examResult.percentage}%
                    </div>
                    <p className="text-gray-500 text-sm mb-4">
                      {examResult.score} de {examResult.total_points} puntos
                    </p>
                    
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">{examResult.passing_score}%</p>
                        <p className="text-gray-500 text-xs">Puntaje mínimo</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200"></div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">{examResult.attempts} / {template.exam_max_attempts ?? 3}</p>
                        <p className="text-gray-500 text-xs">Intentos usados</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {!examResult.passed && examResult.attempts < (template.exam_max_attempts ?? 3) && (
                      <Button 
                        onClick={handleStartExam}
                        className="bg-[#F98613] hover:bg-[#d96f0a]"
                      >
                        <FileQuestion className="w-4 h-4 mr-2" />
                        Intentar de nuevo
                      </Button>
                    )}
                    {!examResult.passed && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowExamModal(false);
                          setExamResult(null);
                          handleViewExamReview();
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver mi examen
                      </Button>
                    )}
                    <Button 
                      variant={examResult.passed ? "default" : "outline"}
                      onClick={handleCloseExamAndReload}
                      className={examResult.passed ? "bg-[#17BC91] hover:bg-[#14a57f]" : ""}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {examResult.passed ? 'Continuar' : 'Cerrar'}
                    </Button>
                  </div>
                </div>
              ) : examQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No hay preguntas disponibles para este examen.</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowExamModal(false)}
                    className="mt-4"
                  >
                    Cerrar
                  </Button>
                </div>
              ) : (
                <>
                  {/* Progress */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Pregunta {currentQuestion + 1} de {examQuestions.length}
                      </span>
                      <span className="text-sm text-gray-500">
                        {Object.keys(answers).length} de {examQuestions.length} respondidas
                      </span>
                    </div>
                    <Progress value={examProgress} className="h-2" />
                  </div>

                  {/* Question */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <p className="text-lg font-medium text-gray-900 mb-6">
                      {examQuestions[currentQuestion].question}
                    </p>
                    <div className="space-y-2">
                      {examQuestions[currentQuestion].options.map((option, i) => (
                        <div 
                          key={i} 
                          onClick={() => handleAnswerSelect(currentQuestion, option.text)}
                          className={`flex items-center space-x-3 p-4 rounded-lg cursor-pointer transition-all ${
                            answers[currentQuestion] === option.text
                              ? 'bg-[#F98613]/10 border-2 border-[#F98613]'
                              : 'bg-white border-2 border-gray-200 hover:border-[#F98613]/50 hover:bg-[#F98613]/5'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            answers[currentQuestion] === option.text
                              ? 'border-[#F98613] bg-[#F98613]'
                              : 'border-gray-300'
                          }`}>
                            {answers[currentQuestion] === option.text && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                          <span className="flex-1 text-gray-700">
                            {option.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Question Navigation */}
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {examQuestions.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentQuestion(i)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                          i === currentQuestion
                            ? 'bg-[#F98613] text-white shadow-lg'
                            : answers[i]
                              ? 'bg-[#17BC91] text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestion === 0}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    
                    {currentQuestion === examQuestions.length - 1 ? (
                      <Button
                        onClick={handleSubmitExam}
                        disabled={Object.keys(answers).length < examQuestions.length || submittingExam}
                        className="bg-[#17BC91] hover:bg-[#14a57f]"
                      >
                        {submittingExam ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Enviar Examen
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setCurrentQuestion(prev => Math.min(examQuestions.length - 1, prev + 1))}
                        className="bg-[#073372] hover:bg-[#052555]"
                      >
                        Siguiente
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exam Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${
              examReview?.attempt.passed 
                ? 'bg-gradient-to-r from-[#17BC91] to-[#14a57f]' 
                : examReview?.attempts_exhausted
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Revisión del Examen</h2>
                  <p className="text-white/80 text-sm">{template.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingReview ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-[#F98613] animate-spin mb-4" />
                  <p className="text-gray-600">Cargando resultados del examen...</p>
                </div>
              ) : examReview ? (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className={`rounded-xl p-4 ${
                    examReview.attempt.passed 
                      ? 'bg-emerald-50 border border-emerald-200' 
                      : examReview.attempts_exhausted
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`text-4xl font-bold ${
                          examReview.attempt.passed ? 'text-emerald-600' : examReview.attempts_exhausted ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {examReview.attempt.percentage}%
                        </div>
                        <div>
                          <p className={`font-semibold ${
                            examReview.attempt.passed ? 'text-emerald-800' : examReview.attempts_exhausted ? 'text-red-800' : 'text-amber-800'
                          }`}>
                            {examReview.attempt.passed ? '¡Aprobado!' : examReview.attempts_exhausted ? 'No aprobado' : 'En progreso'}
                          </p>
                          <p className={`text-sm ${
                            examReview.attempt.passed ? 'text-emerald-600' : examReview.attempts_exhausted ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            {examReview.attempt.score} de {examReview.attempt.total_points} puntos
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-600">
                          Intentos: {examReview.attempts_used}/{examReview.max_attempts}
                        </p>
                        <p className="text-gray-500">
                          Mínimo para aprobar: {examReview.passing_score}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info Banner */}
                  {!examReview.show_correct_answers && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">Modo de revisión limitado</p>
                          <p className="text-sm text-blue-600">
                            Puedes ver si tus respuestas fueron correctas o incorrectas. 
                            Las respuestas correctas se mostrarán cuando agotes tus intentos o apruebes el examen.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Questions Review */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Detalle de respuestas</h3>
                    {examReview.questions.map((q, index) => (
                      <div 
                        key={index} 
                        className={`rounded-xl border-2 p-4 ${
                          q.is_correct 
                            ? 'border-emerald-200 bg-emerald-50/50' 
                            : 'border-red-200 bg-red-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            q.is_correct ? 'bg-emerald-500' : 'bg-red-500'
                          }`}>
                            {q.is_correct ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                              <XCircle className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 mb-2">
                              {index + 1}. {q.question}
                            </p>
                            
                            {/* Student's Answer */}
                            <div className={`rounded-lg p-3 mb-2 ${
                              q.is_correct 
                                ? 'bg-emerald-100 border border-emerald-300' 
                                : 'bg-red-100 border border-red-300'
                            }`}>
                              <p className="text-sm font-medium text-gray-700 mb-1">Tu respuesta:</p>
                              <p className={`${q.is_correct ? 'text-emerald-800' : 'text-red-800'}`}>
                                {q.student_answer || <span className="italic text-gray-400">Sin respuesta</span>}
                              </p>
                            </div>

                            {/* Correct Answer - Only if allowed */}
                            {examReview.show_correct_answers && q.correct_answer && !q.is_correct && (
                              <div className="rounded-lg p-3 bg-emerald-100 border border-emerald-300">
                                <p className="text-sm font-medium text-gray-700 mb-1">Respuesta correcta:</p>
                                <p className="text-emerald-800">{q.correct_answer}</p>
                              </div>
                            )}

                            {/* Points */}
                            <div className="mt-2 text-sm text-gray-500">
                              {q.points_earned} / {q.points_possible} punto{q.points_possible !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 justify-center pt-4 border-t">
                    {!examReview.attempt.passed && !examReview.attempts_exhausted && (
                      <Button 
                        onClick={() => {
                          setShowReviewModal(false);
                          handleStartExam();
                        }}
                        className="bg-[#F98613] hover:bg-[#d96f0a]"
                      >
                        <FileQuestion className="w-4 h-4 mr-2" />
                        Intentar de nuevo
                      </Button>
                    )}
                    <Button 
                      variant="outline"
                      onClick={() => setShowReviewModal(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No se pudieron cargar los resultados.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
};

export default ClassTemplateView;
