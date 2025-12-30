import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { 
  Book, ArrowLeft, Search, FileText, Clock, Users,
  ChevronRight, BookOpen, GraduationCap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClassTemplate {
  id: number;
  title: string;
  description: string;
  session_number: number;
  lesson_number: number;
  duration_minutes: number;
  academic_level: string;
  academic_level_color: string;
  objectives: string[];
  vocabulary_items_count: number;
  grammar_structures_count: number;
  scheduled_count: number;
}

interface Stats {
  totalTemplates: number;
  byLevel: Record<string, number>;
}

interface Props {
  templates: ClassTemplate[];
  stats: Stats;
  academicLevels: { id: number; name: string; color: string }[];
}

export default function ClassTemplates({ templates, stats, academicLevels }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || template.academic_level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  // Agrupar por nivel académico
  const groupedByLevel = filteredTemplates.reduce((acc, template) => {
    const level = template.academic_level;
    if (!acc[level]) {
      acc[level] = {
        color: template.academic_level_color,
        templates: []
      };
    }
    acc[level].templates.push(template);
    return acc;
  }, {} as Record<string, { color: string; templates: ClassTemplate[] }>);

  return (
    <AuthenticatedLayout>
      <Head title="Plantillas de Clase" />

      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Plantillas de Clase</h1>
                <p className="text-gray-600 mt-1">Material y estructura para tus clases</p>
              </div>
              <div className="text-center px-4 py-2 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalTemplates}</div>
                <div className="text-blue-600 text-sm">Plantillas disponibles</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por título o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filtrar por nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    {academicLevels.map((level) => (
                      <SelectItem key={level.id} value={level.name}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates grouped by level */}
          {Object.keys(groupedByLevel).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Book className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay plantillas</h3>
                <p className="text-gray-600">
                  {searchTerm || levelFilter !== 'all' 
                    ? 'No se encontraron plantillas con los filtros aplicados.' 
                    : 'No tienes plantillas de clase asignadas.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedByLevel).map(([levelName, { color, templates: levelTemplates }]) => (
                <div key={levelName}>
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <h2 className="text-lg font-semibold text-gray-900">{levelName}</h2>
                    <Badge variant="secondary">{levelTemplates.length} plantillas</Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {levelTemplates.map((template) => (
                      <Link 
                        key={template.id}
                        href={`/teacher/class-templates/${template.id}`}
                        className="block"
                      >
                        <Card className="h-full hover:shadow-md transition-shadow group cursor-pointer">
                          <CardContent className="p-0">
                            {/* Session Header */}
                            <div 
                              className="px-4 py-3 flex items-center justify-between text-white"
                              style={{ backgroundColor: color }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center font-bold">
                                  {template.session_number}
                                </div>
                                <span className="text-sm">Sesión {template.session_number}</span>
                              </div>
                              <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            {/* Content */}
                            <div className="p-4">
                              <h3 className="font-semibold text-gray-900 mb-2">{template.title}</h3>
                              <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                                {template.description}
                              </p>

                              {/* Meta Info */}
                              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {template.duration_minutes} min
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  Lección {template.lesson_number}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {template.scheduled_count} programadas
                                </span>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-3 pt-3 border-t">
                                <div className="flex items-center gap-1 text-xs">
                                  <BookOpen className="w-4 h-4 text-blue-500" />
                                  <span className="text-gray-600">
                                    {template.vocabulary_items_count} palabras
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                  <GraduationCap className="w-4 h-4 text-emerald-500" />
                                  <span className="text-gray-600">
                                    {template.grammar_structures_count} gramática
                                  </span>
                                </div>
                              </div>

                              {/* Objectives Preview */}
                              {template.objectives && template.objectives.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Objetivos:</p>
                                  <ul className="text-xs text-gray-600 list-disc list-inside">
                                    {template.objectives.slice(0, 2).map((obj, idx) => (
                                      <li key={idx} className="truncate">{obj}</li>
                                    ))}
                                    {template.objectives.length > 2 && (
                                      <li className="text-gray-400">+{template.objectives.length - 2} más</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
