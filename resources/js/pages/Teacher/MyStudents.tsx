import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { 
  Users, Search, ArrowLeft, CheckCircle,
  GraduationCap, ChevronDown, ChevronUp, Mail, Phone
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface EnrollmentDetail {
  id: number;
  class_title: string;
  session_number: string;
  status: string;
  attended: boolean;
  exam_completed: boolean;
  scheduled_at: string;
}

interface StudentData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  academic_level: string;
  academic_level_color: string;
  completed_classes: number;
  total_classes: number;
  progress: number;
  enrollments: EnrollmentDetail[];
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  graduatedStudents: number;
}

interface Props {
  students: StudentData[];
  stats: Stats;
}

export default function MyStudents({ students, stats }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           student.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleExpand = (studentId: number) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  const getStatusConfig = (status: string, attended: boolean, examCompleted: boolean) => {
    if (status === 'completed' && attended && examCompleted) {
      return { label: 'Completada', color: 'bg-emerald-100 text-emerald-700' };
    }
    if (status === 'completed' && attended && !examCompleted) {
      return { label: 'Pendiente examen', color: 'bg-amber-100 text-amber-700' };
    }
    if (status === 'in_progress') {
      return { label: 'En curso', color: 'bg-blue-100 text-blue-700' };
    }
    return { label: 'Programada', color: 'bg-gray-100 text-gray-700' };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Mis Participantes" />

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
                <h1 className="text-2xl font-bold text-gray-900">Mis Participantes</h1>
                <p className="text-gray-600 mt-1">Estudiantes de tus clases asignadas</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center px-4 py-2 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
                  <div className="text-blue-600">Total</div>
                </div>
                <div className="text-center px-4 py-2 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.activeStudents}</div>
                  <div className="text-orange-600">En Progreso</div>
                </div>
                <div className="text-center px-4 py-2 bg-emerald-50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{stats.graduatedStudents}</div>
                  <div className="text-emerald-600">Completaron</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Students List */}
          {filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay participantes</h3>
                <p className="text-gray-600">
                  {searchTerm ? 'No se encontraron participantes con ese criterio de búsqueda.' : 'Aún no tienes estudiantes asignados en tus clases.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Student Header */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpand(student.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: student.academic_level_color }}
                        >
                          {student.first_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {student.first_name} {student.last_name}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {student.email}
                            </span>
                            {student.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {student.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <Badge 
                            variant="outline"
                            style={{ borderColor: student.academic_level_color, color: student.academic_level_color }}
                          >
                            {student.academic_level}
                          </Badge>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-gray-600">
                              {student.completed_classes}/{student.total_classes} clases
                            </span>
                            <Progress value={student.progress} className="w-24 h-2" />
                            <span className="text-sm font-medium text-gray-900">{student.progress}%</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          {expandedStudent === student.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedStudent === student.id && (
                      <div className="border-t bg-gray-50 p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Historial de Clases</h4>
                        <div className="grid gap-2">
                          {student.enrollments.map((enrollment) => {
                            const statusConfig = getStatusConfig(enrollment.status, enrollment.attended, enrollment.exam_completed);
                            return (
                              <div 
                                key={enrollment.id}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded bg-[#073372] text-white flex items-center justify-center text-sm font-bold">
                                    {enrollment.session_number}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{enrollment.class_title}</p>
                                    <p className="text-xs text-gray-500">{formatDate(enrollment.scheduled_at)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {enrollment.attended && (
                                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Asistió
                                    </Badge>
                                  )}
                                  {enrollment.exam_completed && (
                                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                                      <GraduationCap className="w-3 h-3 mr-1" />
                                      Examen ✓
                                    </Badge>
                                  )}
                                  <Badge className={statusConfig.color}>
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
