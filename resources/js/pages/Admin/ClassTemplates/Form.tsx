import React, { useState } from 'react';
import { BookOpen, ArrowLeft, Save, Video, FileQuestion, FileText, Plus, Trash2, Check, Clock, ListOrdered, Link2, Upload, X } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { router, Link, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select2 } from '@/components/ui/Select2';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import RichTextEditor from '@/components/ui/RichTextEditor';

interface AcademicLevel {
  id: number;
  name: string;
  code: string;
  color?: string;
}

interface TemplateQuestion {
  id?: number;
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

interface ClassTemplate {
  id?: number;
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
  questions?: TemplateQuestion[];
  resources?: TemplateResource[];
  academic_level?: AcademicLevel;
}

interface Props {
  template?: ClassTemplate;
  academicLevels: AcademicLevel[];
}

const ClassTemplateForm: React.FC<Props> = ({ template, academicLevels }) => {
  const isEditing = !!template?.id;
  
  const { data, setData, post, put, processing, errors } = useForm({
    academic_level_id: template?.academic_level_id || '',
    title: template?.title || '',
    session_number: template?.session_number || '',
    modality: template?.modality || 'theoretical',
    description: template?.description || '',
    content: template?.content || '',
    objectives: template?.objectives || '',
    intro_video_url: template?.intro_video_url || '',
    intro_video_thumbnail: template?.intro_video_thumbnail || '',
    duration_minutes: template?.duration_minutes || 60,
    order: template?.order || 0,
    has_exam: template?.has_exam ?? true,
    exam_questions_count: template?.exam_questions_count || 10,
    exam_passing_score: template?.exam_passing_score || 70,
    is_active: template?.is_active ?? true,
  });

  const [activeTab, setActiveTab] = useState('general');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TemplateQuestion | null>(null);
  const [showResourceModal, setShowResourceModal] = useState(false);

  // Estado para nueva pregunta
  const [questionForm, setQuestionForm] = useState<TemplateQuestion>({
    question: '',
    type: 'multiple_choice',
    options: [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ],
    explanation: '',
    points: 1,
    is_active: true,
  });

  // Estado para subir recurso
  const [resourceForm, setResourceForm] = useState({
    name: '',
    description: '',
    file: null as File | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing) {
      put(`/admin/class-templates/${template.id}`, {
        onSuccess: () => {
          toast.success('Plantilla actualizada exitosamente');
        },
        onError: () => {
          toast.error('Error al actualizar la plantilla');
        }
      });
    } else {
      post('/admin/class-templates', {
        onSuccess: () => {
          toast.success('Plantilla creada exitosamente');
        },
        onError: () => {
          toast.error('Error al crear la plantilla');
        }
      });
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      question: '',
      type: 'multiple_choice',
      options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
      explanation: '',
      points: 1,
      is_active: true,
    });
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question: TemplateQuestion) => {
    setEditingQuestion(question);
    setQuestionForm({ ...question });
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = () => {
    // Validar
    if (!questionForm.question.trim()) {
      toast.error('La pregunta es requerida');
      return;
    }
    
    const hasCorrect = questionForm.options.some(o => o.is_correct);
    if (!hasCorrect) {
      toast.error('Debe haber al menos una respuesta correcta');
      return;
    }

    if (!isEditing || !template?.id) {
      toast.info('Guarda la plantilla primero para agregar preguntas');
      setShowQuestionModal(false);
      return;
    }

    const url = editingQuestion?.id 
      ? `/admin/class-templates/${template.id}/questions/${editingQuestion.id}`
      : `/admin/class-templates/${template.id}/questions`;
    
    const method = editingQuestion?.id ? 'put' : 'post';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router[method](url, questionForm as any, {
      onSuccess: () => {
        toast.success(editingQuestion ? 'Pregunta actualizada' : 'Pregunta agregada');
        setShowQuestionModal(false);
      },
      onError: () => {
        toast.error('Error al guardar la pregunta');
      }
    });
  };

  const handleDeleteQuestion = (question: TemplateQuestion) => {
    if (!question.id || !template?.id) return;
    
    if (confirm('¿Estás seguro de eliminar esta pregunta?')) {
      router.delete(`/admin/class-templates/${template.id}/questions/${question.id}`, {
        onSuccess: () => {
          toast.success('Pregunta eliminada');
        },
        onError: () => {
          toast.error('Error al eliminar la pregunta');
        }
      });
    }
  };

  const handleUploadResource = () => {
    if (!resourceForm.file || !resourceForm.name || !template?.id) {
      toast.error('Nombre y archivo son requeridos');
      return;
    }

    const formData = new FormData();
    formData.append('file', resourceForm.file);
    formData.append('name', resourceForm.name);
    formData.append('description', resourceForm.description || '');

    router.post(`/admin/class-templates/${template.id}/resources`, formData, {
      forceFormData: true,
      onSuccess: () => {
        toast.success('Recurso subido exitosamente');
        setShowResourceModal(false);
        setResourceForm({ name: '', description: '', file: null });
      },
      onError: () => {
        toast.error('Error al subir el recurso');
      }
    });
  };

  const handleDeleteResource = (resource: TemplateResource) => {
    if (!template?.id) return;
    
    if (confirm(`¿Estás seguro de eliminar "${resource.name}"?`)) {
      router.delete(`/admin/class-templates/${template.id}/resources/${resource.id}`, {
        onSuccess: () => {
          toast.success('Recurso eliminado');
        },
        onError: () => {
          toast.error('Error al eliminar el recurso');
        }
      });
    }
  };

  const setCorrectAnswer = (index: number) => {
    if (questionForm.type === 'multiple_choice') {
      // Solo una correcta
      setQuestionForm(prev => ({
        ...prev,
        options: prev.options.map((opt, i) => ({
          ...opt,
          is_correct: i === index
        }))
      }));
    } else {
      // True/False toggle
      setQuestionForm(prev => ({
        ...prev,
        options: prev.options.map((opt, i) => ({
          ...opt,
          is_correct: i === index
        }))
      }));
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/class-templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Editar Plantilla' : 'Nueva Plantilla de Clase'}
            </h1>
            <p className="text-gray-500">
              {isEditing ? `Editando: ${template?.title}` : 'Crea una nueva plantilla de sesión'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="content">Contenido</TabsTrigger>
              <TabsTrigger value="questions" disabled={!isEditing}>
                Preguntas {isEditing && template?.questions && `(${template.questions.length})`}
              </TabsTrigger>
              <TabsTrigger value="resources" disabled={!isEditing}>
                Recursos {isEditing && template?.resources && `(${template.resources.length})`}
              </TabsTrigger>
            </TabsList>

            {/* Tab General */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información Básica</CardTitle>
                  <CardDescription>Configura los datos principales de la plantilla</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Select2
                      label="Nivel Académico"
                      value={data.academic_level_id ? String(data.academic_level_id) : ''}
                      onChange={(value) => setData('academic_level_id', value ? Number(value) : '')}
                      options={academicLevels.map(level => ({
                        value: String(level.id),
                        label: level.name
                      }))}
                      required
                      placeholder="Seleccionar nivel"
                    />

                    <Input
                      label="Número de Sesión"
                      value={data.session_number}
                      onChange={(e) => setData('session_number', e.target.value)}
                      required
                      error={errors.session_number}
                      icon={<ListOrdered className="w-5 h-5" />}
                    />
                  </div>

                  <Input
                    label="Título de la Sesión"
                    value={data.title}
                    onChange={(e) => setData('title', e.target.value)}
                    required
                    error={errors.title}
                    icon={<BookOpen className="w-5 h-5" />}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Select2
                      label="Modalidad"
                      value={data.modality}
                      onChange={(value) => setData('modality', value as 'theoretical' | 'practical')}
                      options={[
                        { value: 'theoretical', label: 'Teórica' },
                        { value: 'practical', label: 'Práctica' }
                      ]}
                      required
                      isSearchable={false}
                    />

                    <Input
                      label="Duración (minutos)"
                      type="number"
                      min={1}
                      max={480}
                      value={data.duration_minutes}
                      onChange={(e) => setData('duration_minutes', Number(e.target.value))}
                      icon={<Clock className="w-5 h-5" />}
                    />
                  </div>

                  <Textarea
                    label="Descripción breve"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Breve descripción de lo que se verá en esta sesión..."
                    rows={3}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Video de Introducción
                  </CardTitle>
                  <CardDescription>
                    Video de bienvenida que se mostrará antes de la grabación de la clase
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="URL del Video (YouTube, Vimeo, Drive)"
                    type="url"
                    value={data.intro_video_url}
                    onChange={(e) => setData('intro_video_url', e.target.value)}
                    icon={<Link2 className="w-5 h-5" />}
                  />

                  <Input
                    label="URL de Thumbnail (opcional)"
                    type="url"
                    value={data.intro_video_thumbnail}
                    onChange={(e) => setData('intro_video_thumbnail', e.target.value)}
                    helperText="Imagen de miniatura para mostrar antes de reproducir el video"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileQuestion className="h-5 w-5" />
                    Configuración del Examen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">¿Tiene examen?</label>
                      <p className="text-sm text-gray-500">Habilitar examen de evaluación para esta sesión</p>
                    </div>
                    <Switch
                      checked={data.has_exam}
                      onCheckedChange={(checked) => setData('has_exam', checked)}
                    />
                  </div>

                  {data.has_exam && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <Input
                          label="Preguntas por examen"
                          type="number"
                          min={1}
                          max={100}
                          value={data.exam_questions_count}
                          onChange={(e) => setData('exam_questions_count', Number(e.target.value))}
                          helperText="Se seleccionarán aleatoriamente del banco"
                        />
                      </div>
                      <div>
                        <Input
                          label="Porcentaje para aprobar (%)"
                          type="number"
                          min={1}
                          max={100}
                          value={data.exam_passing_score}
                          onChange={(e) => setData('exam_passing_score', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Plantilla activa</label>
                      <p className="text-sm text-gray-500">Las plantillas inactivas no pueden usarse para programar clases</p>
                    </div>
                    <Switch
                      checked={data.is_active}
                      onCheckedChange={(checked) => setData('is_active', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Contenido */}
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Objetivos de Aprendizaje</CardTitle>
                  <CardDescription>Lista los objetivos que el estudiante logrará al completar esta sesión</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    label="Objetivos"
                    value={data.objectives}
                    onChange={(e) => setData('objectives', e.target.value)}
                    placeholder="• Objetivo 1&#10;• Objetivo 2&#10;• Objetivo 3"
                    rows={5}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Desarrollo de la Clase</CardTitle>
                  <CardDescription>
                    Contenido principal de la sesión. Usa el editor para agregar texto, imágenes, gráficos, etc.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    value={data.content}
                    onChange={(value) => setData('content', value)}
                    placeholder="Escribe el contenido de la clase aquí..."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Preguntas */}
            <TabsContent value="questions" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileQuestion className="h-5 w-5" />
                        Banco de Preguntas
                      </CardTitle>
                      <CardDescription>
                        Se seleccionarán {data.exam_questions_count} preguntas aleatorias para cada examen
                      </CardDescription>
                    </div>
                    <Button type="button" onClick={handleAddQuestion}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Pregunta
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!template?.questions?.length ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay preguntas agregadas</p>
                      <p className="text-sm">Agrega preguntas al banco para el examen</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {template.questions.map((question, index) => (
                        <div
                          key={question.id || index}
                          className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={question.type === 'multiple_choice' ? 'default' : 'secondary'}>
                                {question.type === 'multiple_choice' ? 'Opción múltiple' : 'V/F'}
                              </Badge>
                              <Badge variant="outline">{question.points} pts</Badge>
                              {!question.is_active && <Badge variant="destructive">Inactiva</Badge>}
                            </div>
                            <p className="text-sm font-medium text-gray-900">{question.question}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {question.options.map((opt, i) => (
                                <span
                                  key={i}
                                  className={`text-xs px-2 py-1 rounded ${
                                    opt.is_correct
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-200 text-gray-600'
                                  }`}
                                >
                                  {opt.text}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditQuestion(question)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => handleDeleteQuestion(question)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Recursos */}
            <TabsContent value="resources" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Recursos Descargables
                      </CardTitle>
                      <CardDescription>
                        PDFs, documentos, presentaciones y otros materiales para el estudiante
                      </CardDescription>
                    </div>
                    <Button type="button" onClick={() => setShowResourceModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Subir Recurso
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!template?.resources?.length ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay recursos agregados</p>
                      <p className="text-sm">Sube PDFs, documentos o presentaciones</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {template.resources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50"
                        >
                          <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{resource.name}</p>
                            <p className="text-xs text-gray-500">
                              {resource.file_type.toUpperCase()} • {resource.download_count} descargas
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => handleDeleteResource(resource)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
            <Link href="/admin/class-templates">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={processing} className="bg-[#073372] hover:bg-[#052555]">
              <Save className="w-4 h-4 mr-2" />
              {processing ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Plantilla')}
            </Button>
          </div>
        </form>

        {/* Modal de Pregunta */}
        {showQuestionModal && (
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowQuestionModal(false)}
          >
            <div 
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="relative bg-gradient-to-r from-[#073372] to-[#17BC91] px-6 py-5 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <FileQuestion className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {editingQuestion ? 'Editar Pregunta' : 'Nueva Pregunta'}
                      </h3>
                      <p className="text-blue-100 text-sm">
                        Agrega una pregunta al banco de preguntas para el examen
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuestionModal(false)}
                    className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Pregunta */}
                <Textarea
                  label="Pregunta"
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Escribe la pregunta..."
                  rows={3}
                  required
                />

                {/* Tipo y Puntos */}
                <div className="grid grid-cols-2 gap-4">
                  <Select2
                    label="Tipo de pregunta"
                    value={questionForm.type}
                    onChange={(value) => {
                      const newType = value as 'multiple_choice' | 'true_false';
                      setQuestionForm(prev => ({
                        ...prev,
                        type: newType,
                        options: newType === 'true_false' 
                          ? [{ text: 'Verdadero', is_correct: true }, { text: 'Falso', is_correct: false }]
                          : [
                              { text: '', is_correct: true },
                              { text: '', is_correct: false },
                              { text: '', is_correct: false },
                              { text: '', is_correct: false },
                            ]
                      }));
                    }}
                    options={[
                      { value: 'multiple_choice', label: 'Opción múltiple' },
                      { value: 'true_false', label: 'Verdadero/Falso' }
                    ]}
                    isSearchable={false}
                  />

                  <Input
                    label="Puntos"
                    type="number"
                    min={1}
                    max={10}
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, points: Number(e.target.value) }))}
                  />
                </div>

                {/* Opciones de Respuesta */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Opciones de respuesta</label>
                  <div className="space-y-2">
                    {questionForm.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                        <button
                          type="button"
                          onClick={() => setCorrectAnswer(index)}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                            option.is_correct 
                              ? 'border-green-500 bg-green-500 text-white shadow-md'
                              : 'border-gray-300 hover:border-[#073372] hover:bg-gray-100'
                          }`}
                        >
                          {option.is_correct && <Check className="w-4 h-4" />}
                        </button>
                        {questionForm.type === 'true_false' ? (
                          <span className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${
                            option.is_correct ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {option.text}
                          </span>
                        ) : (
                          <input
                            value={option.text}
                            onChange={(e) => {
                              const newOptions = [...questionForm.options];
                              newOptions[index] = { ...newOptions[index], text: e.target.value };
                              setQuestionForm(prev => ({ ...prev, options: newOptions }));
                            }}
                            placeholder={`Opción ${index + 1}`}
                            className="flex-1 h-10 px-4 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#073372] focus:border-transparent transition-all duration-200"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Haz clic en el círculo para marcar la respuesta correcta
                  </p>
                </div>

                {/* Explicación */}
                <Textarea
                  label="Explicación (opcional)"
                  value={questionForm.explanation || ''}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, explanation: e.target.value }))}
                  placeholder="Explicación que se mostrará después de responder..."
                  rows={2}
                />
              </div>

              {/* Footer del Modal */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 flex-shrink-0 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowQuestionModal(false)}
                  className="px-5"
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSaveQuestion}
                  className="bg-[#073372] hover:bg-[#052555] px-5"
                >
                  {editingQuestion ? 'Guardar Cambios' : 'Agregar Pregunta'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Recurso */}
        {showResourceModal && (
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowResourceModal(false)}
          >
            <div 
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="relative bg-gradient-to-r from-[#073372] to-[#17BC91] px-6 py-5 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Subir Recurso</h3>
                      <p className="text-blue-100 text-sm">
                        Sube un archivo para que los estudiantes puedan descargarlo
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResourceModal(false)}
                    className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Nombre del recurso */}
                <Input
                  label="Nombre del recurso"
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />

                {/* Archivo - Drag and Drop */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Archivo *</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-[#073372]', 'bg-blue-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-[#073372]', 'bg-blue-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-[#073372]', 'bg-blue-50');
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        setResourceForm(prev => ({ ...prev, file }));
                      }
                    }}
                    className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${
                      resourceForm.file 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 hover:border-[#073372] hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                      onChange={(e) => setResourceForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    
                    {resourceForm.file ? (
                      // Vista cuando hay archivo seleccionado
                      <div className="p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-7 h-7 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{resourceForm.file.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {(resourceForm.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResourceForm(prev => ({ ...prev, file: null }));
                          }}
                          className="relative z-20 w-9 h-9 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      // Vista de drag and drop vacío
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#073372]/10 to-[#17BC91]/10 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-[#073372]" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Arrastra y suelta tu archivo aquí
                        </p>
                        <p className="text-xs text-gray-500 mb-3">o</p>
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#073372] text-white text-sm font-medium rounded-lg hover:bg-[#052555] transition-colors">
                          <Plus className="w-4 h-4" />
                          Seleccionar archivo
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700 flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      PDF, Word, Excel, PowerPoint, ZIP. Máximo 50MB
                    </p>
                  </div>
                </div>

                {/* Descripción */}
                <Textarea
                  label="Descripción (opcional)"
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Breve descripción del contenido..."
                  rows={3}
                />
              </div>

              {/* Footer del Modal */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 flex-shrink-0 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowResourceModal(false)}
                  className="px-5"
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleUploadResource}
                  className="bg-[#073372] hover:bg-[#052555] px-5"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Subir Recurso
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default ClassTemplateForm;
