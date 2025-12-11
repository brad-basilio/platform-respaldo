import React, { useState, useMemo, useCallback } from 'react';
import { BookOpen, Plus, Edit, Trash2, Search, Copy, Eye, FileQuestion, FileText, Video, Filter } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { router, Link } from '@inertiajs/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select2 } from '@/components/ui/Select2';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import '../../../../css/ag-grid-custom.css';

ModuleRegistry.registerModules([AllCommunityModule]);

interface AcademicLevel {
  id: number;
  name: string;
  code: string;
  color?: string;
}

interface ClassTemplate {
  id: number;
  academic_level_id: number;
  created_by: number;
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
  questions_count: number;
  resources_count: number;
  scheduled_classes_count: number;
  academic_level?: AcademicLevel;
  creator?: { id: number; name: string };
  created_at?: string;
}

interface Props {
  templates: ClassTemplate[];
  academicLevels: AcademicLevel[];
  filters: {
    level_id?: string;
    modality?: string;
    is_active?: string;
  };
}

const ClassTemplatesIndex: React.FC<Props> = ({ templates: initialTemplates, academicLevels, filters }) => {
  const [templates, setTemplates] = useState<ClassTemplate[]>(initialTemplates);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>(filters.level_id || 'all');
  const [modalityFilter, setModalityFilter] = useState<string>(filters.modality || 'all');

  const applyFilters = useCallback((levelId: string, modality: string) => {
    const params = new URLSearchParams();
    if (levelId && levelId !== 'all') params.set('level_id', levelId);
    if (modality && modality !== 'all') params.set('modality', modality);
    
    router.get(`/admin/class-templates?${params.toString()}`, {}, {
      preserveState: true,
      replace: true,
    });
  }, []);

  const handleLevelChange = (value: string) => {
    setLevelFilter(value);
    applyFilters(value, modalityFilter);
  };

  const handleModalityChange = (value: string) => {
    setModalityFilter(value);
    applyFilters(levelFilter, value);
  };

  const handleDelete = useCallback((template: ClassTemplate) => {
    if (template.scheduled_classes_count > 0) {
      toast.error('No se puede eliminar', {
        description: 'Esta plantilla tiene clases programadas asociadas'
      });
      return;
    }

    if (confirm(`¿Estás seguro de eliminar la plantilla "${template.title}"?`)) {
      router.delete(`/admin/class-templates/${template.id}`, {
        onSuccess: () => {
          toast.success('Plantilla eliminada exitosamente');
        },
        onError: () => {
          toast.error('Error al eliminar plantilla');
        }
      });
    }
  }, []);

  const handleDuplicate = useCallback((template: ClassTemplate) => {
    router.post(`/admin/class-templates/${template.id}/duplicate`, {}, {
      onSuccess: () => {
        toast.success('Plantilla duplicada exitosamente');
      },
      onError: () => {
        toast.error('Error al duplicar plantilla');
      }
    });
  }, []);

  const columnDefs = useMemo<ColDef<ClassTemplate>[]>(() => [
    {
      headerName: '#',
      field: 'session_number',
      width: 80,
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full">
          <span className="text-sm font-bold text-gray-700">S{params.value}</span>
        </div>
      )
    },
    {
      headerName: 'Plantilla de Clase',
      field: 'title',
      flex: 1,
      minWidth: 280,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const template = params.data;
        return (
          <div className="flex items-center py-2 h-full gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: template.academic_level?.color || '#3B82F6' }}
            >
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">{template.title}</div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span>{template.academic_level?.name}</span>
                <Badge variant={template.modality === 'theoretical' ? 'secondary' : 'default'} className="text-[10px] px-1.5 py-0">
                  {template.modality === 'theoretical' ? 'Teórica' : 'Práctica'}
                </Badge>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Contenido',
      width: 180,
      cellRenderer: (params: any) => {
        const template = params.data;
        return (
          <div className="flex items-center gap-3 h-full">
            <div className="flex items-center gap-1 text-xs text-gray-600" title="Preguntas">
              <FileQuestion className="w-3.5 h-3.5" />
              <span>{template.questions_count}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600" title="Recursos">
              <FileText className="w-3.5 h-3.5" />
              <span>{template.resources_count}</span>
            </div>
            {template.intro_video_url && (
              <div className="flex items-center gap-1 text-xs text-green-600" title="Tiene video">
                <Video className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Duración',
      field: 'duration_minutes',
      width: 100,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
          <span className="text-sm text-gray-600">{params.value} min</span>
        </div>
      )
    },
    {
      headerName: 'Examen',
      width: 120,
      cellRenderer: (params: any) => {
        const template = params.data;
        if (!template.has_exam) {
          return <span className="text-xs text-gray-400">Sin examen</span>;
        }
        return (
          <div className="flex flex-col h-full justify-center">
            <span className="text-xs text-gray-600">{template.exam_questions_count} preguntas</span>
            <span className="text-[10px] text-gray-400">Aprobar: {template.exam_passing_score}%</span>
          </div>
        );
      }
    },
    {
      headerName: 'Clases',
      field: 'scheduled_classes_count',
      width: 80,
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full">
          <Badge variant="outline" className="text-xs">{params.value}</Badge>
        </div>
      )
    },
    {
      headerName: 'Estado',
      field: 'is_active',
      width: 100,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
          <Badge variant={params.value ? 'default' : 'secondary'}>
            {params.value ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
      )
    },
    {
      headerName: 'Acciones',
      width: 160,
      pinned: 'right',
      cellRenderer: (params: any) => {
        const template = params.data;
        return (
          <div className="flex items-center gap-1 h-full">
            <Link href={`/admin/class-templates/${template.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/admin/class-templates/${template.id}/edit`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" title="Editar">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-purple-600" 
              title="Duplicar"
              onClick={() => handleDuplicate(template)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-600" 
              title="Eliminar"
              onClick={() => handleDelete(template)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    },
  ], [handleDelete, handleDuplicate]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
  }), []);

  return (
    <AuthenticatedLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plantillas de Clases</h1>
            <p className="text-gray-500 mt-1">Gestiona las plantillas de sesiones por nivel académico</p>
          </div>
          <Link href="/admin/class-templates/create">
            <Button className="bg-[#073372] hover:bg-[#052555]">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Plantilla
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2 self-center">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Filtros:</span>
            </div>
            
            <div className="w-52">
              <Select2
                label="Nivel Académico"
                value={levelFilter}
                onChange={(value) => handleLevelChange(value as string)}
                options={[
                  { value: 'all', label: 'Todos los niveles' },
                  ...academicLevels.map(level => ({
                    value: String(level.id),
                    label: level.name
                  }))
                ]}
                isSearchable={false}
                isClearable={false}
              />
            </div>

            <div className="w-44">
              <Select2
                label="Modalidad"
                value={modalityFilter}
                onChange={(value) => handleModalityChange(value as string)}
                options={[
                  { value: 'all', label: 'Todas' },
                  { value: 'theoretical', label: 'Teórica' },
                  { value: 'practical', label: 'Práctica' }
                ]}
                isSearchable={false}
                isClearable={false}
              />
            </div>

            <div className="flex-1 max-w-md ml-auto">
              <Input
                label="Buscar plantillas"
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="ag-theme-quartz" style={{ height: 'calc(100vh - 320px)', width: '100%' }}>
            <AgGridReact<ClassTemplate>
              rowData={templates}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              quickFilterText={quickFilterText}
              pagination={true}
              paginationPageSize={20}
              rowHeight={60}
              theme={themeQuartz}
              animateRows={true}
              suppressCellFocus={true}
            />
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-4 flex gap-4 text-sm text-gray-500">
          <span>Total: {templates.length} plantillas</span>
          <span>•</span>
          <span>Activas: {templates.filter(t => t.is_active).length}</span>
          <span>•</span>
          <span>Con examen: {templates.filter(t => t.has_exam).length}</span>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default ClassTemplatesIndex;
