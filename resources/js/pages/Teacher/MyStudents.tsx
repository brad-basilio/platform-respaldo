import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { 
  Users, Search, ArrowLeft, CheckCircle,
  GraduationCap, Mail, Phone, X, History,
  XCircle, BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// AG Grid Imports
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

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
  const [quickFilterText, setQuickFilterText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: string, attended: boolean, examCompleted: boolean) => {
    if (status === 'completed' && attended && examCompleted) {
      return { label: 'Completada', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' };
    }
    if (status === 'completed' && attended && !examCompleted) {
      return { label: 'Pendiente examen', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' };
    }
    if (status === 'in_progress') {
      return { label: 'En curso', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' };
    }
    return { label: 'Programada', color: 'bg-gray-100 text-gray-700', border: 'border-gray-200' };
  };

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef<StudentData>[]>(() => [
    {
      headerName: 'Estudiante',
      field: 'first_name',
      minWidth: 250,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const student = params.data;
        const initial = student.first_name.charAt(0);
        return (
          <div className="flex items-center gap-3 py-1">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
              style={{ backgroundColor: student.academic_level_color }}
            >
              {initial}
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-semibold text-gray-900 leading-tight">
                {student.first_name} {student.last_name}
              </span>
              <span className="text-xs text-gray-500">{student.email}</span>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Nivel',
      field: 'academic_level',
      minWidth: 150,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const color = params.data.academic_level_color;
        return (
          <div className="flex items-center h-full">
            <Badge 
              variant="outline" 
              className="font-medium"
              style={{ borderColor: color, color: color, backgroundColor: `${color}10` }}
            >
              <BookOpen className="w-3 h-3 mr-1.5" />
              {params.value}
            </Badge>
          </div>
        );
      }
    },
    {
      headerName: 'Contacto',
      field: 'phone', // Filter by phone
      minWidth: 180,
      cellRenderer: (params: any) => {
         const student = params.data;
         return (
             <div className="flex flex-col justify-center h-full text-sm text-gray-600 gap-1">
                 {student.phone ? (
                     <div className="flex items-center gap-1.5">
                         <Phone className="w-3.5 h-3.5 text-gray-400" />
                         <span>{student.phone}</span>
                     </div>
                 ) : (
                     <span className="text-gray-400 italic text-xs">Sin teléfono</span>
                 )}
             </div>
         )
      }
    },
    {
      headerName: 'Progreso',
      field: 'progress',
      minWidth: 200,
      cellRenderer: (params: any) => {
        const student = params.data;
        return (
          <div className="flex flex-col justify-center h-full w-full pr-4">
             <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700">
                    {student.completed_classes}/{student.total_classes} clases
                </span>
                <span className="text-xs font-bold text-gray-900">{student.progress}%</span>
             </div>
             <Progress value={student.progress} className="h-2 w-full" />
          </div>
        );
      }
    },
    {
      headerName: 'Acciones',
      width: 200,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        return (
          <div className="flex items-center h-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStudent(params.data)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 h-8"
              title="Ver Historial de Clases"
            >
              <History className="w-4 h-4 mr-1.5" />
              Historial
            </Button>
          </div>
        );
      }
    }
  ], []);

  // Modal styles for history
  const HistoryModal = ({ student, onClose }: { student: StudentData | null, onClose: () => void }) => {
    if (!student) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
         <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
             {/* Header */}
             <div className="flex items-center justify-between p-5 border-b bg-gray-50/50">
                 <div className="flex items-center gap-3">
                     <div 
                         className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
                         style={{ backgroundColor: student.academic_level_color }}
                     >
                         {student.first_name.charAt(0)}
                     </div>
                     <div>
                         <h3 className="text-lg font-bold text-gray-900 leading-tight">
                             {student.first_name} {student.last_name}
                         </h3>
                         <p className="text-sm text-gray-500">Historial de Clases</p>
                     </div>
                 </div>
                 <button 
                     onClick={onClose}
                     className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                 >
                     <X className="w-5 h-5" />
                 </button>
             </div>

             {/* Content */}
             <div className="p-5 overflow-y-auto">
                 {student.enrollments.length === 0 ? (
                     <div className="text-center py-12 text-gray-500">
                         <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                         <p>No hay historial de clases registrado.</p>
                     </div>
                 ) : (
                     <div className="space-y-3">
                         {student.enrollments.map((enrollment) => {
                             const config = getStatusConfig(enrollment.status, enrollment.attended, enrollment.exam_completed);
                             return (
                                 <div 
                                     key={enrollment.id}
                                     className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                 >
                                     <div className="flex items-start gap-4">
                                         <div 
                                             className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#073372] to-[#124d9c] text-white flex items-center justify-center font-bold text-sm shadow-sm"
                                         >
                                             {enrollment.session_number}
                                         </div>
                                         <div>
                                             <h4 className="font-semibold text-gray-900">{enrollment.class_title}</h4>
                                             <p className="text-sm text-gray-500 mt-0.5">
                                                 <span className="font-medium text-gray-700">Programada:</span> {formatDate(enrollment.scheduled_at)}
                                             </p>
                                         </div>
                                     </div>

                                     <div className="flex flex-col items-end gap-2">
                                         <Badge 
                                             className={`${config.color} border px-2.5 py-0.5`}
                                         >
                                             {config.label}
                                         </Badge>
                                         <div className="flex gap-1.5">
                                             {enrollment.attended && (
                                                 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                     <CheckCircle className="w-3 h-3 mr-1" /> Asistió
                                                 </span>
                                             )}
                                             {enrollment.exam_completed && (
                                                 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                     <GraduationCap className="w-3 h-3 mr-1" /> Examen
                                                 </span>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 )}
             </div>

             {/* Footer */}
             <div className="p-4 border-t bg-gray-50/50 flex justify-end">
                 <Button 
                     onClick={onClose}
                     variant="outline"
                     className="border-gray-300"
                 >
                     Cerrar
                 </Button>
             </div>
         </div>
      </div>
    );
  };

  return (
    <AuthenticatedLayout>
      <Head title="Mis Participantes" />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="w-full px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-[#073372] transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Volver al Dashboard</span>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Mis Participantes</h1>
                <p className="text-gray-500 mt-1">Gestiona y monitorea el progreso de tus aprendices</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-center px-5 py-2.5 bg-[#073372]/5 rounded-xl border border-[#073372]/10">
                  <div className="text-2xl font-black text-[#073372]">{stats.totalStudents}</div>
                  <div className="text-xs font-semibold text-gray-600">Total</div>
                </div>
                <div className="text-center px-5 py-2.5 bg-[#F98613]/5 rounded-xl border border-[#F98613]/10">
                  <div className="text-2xl font-black text-[#F98613]">{stats.activeStudents}</div>
                  <div className="text-xs font-semibold text-gray-600">En Progreso</div>
                </div>
                <div className="text-center px-5 py-2.5 bg-[#17BC91]/5 rounded-xl border border-[#17BC91]/10">
                  <div className="text-2xl font-black text-[#17BC91]">{stats.graduatedStudents}</div>
                  <div className="text-xs font-semibold text-gray-600">Completaron</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-6 py-6 space-y-6">
            {/* Search Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-full">
                    <Input
                        label="Buscar por nombre, email o teléfono..."
                        value={quickFilterText}
                        onChange={(e) => setQuickFilterText(e.target.value)}
                        icon={<Search className="w-5 h-5" />}
                    />
                </div>
                {/* Additional actions could go here */}
            </div>

            {/* AG Grid Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="ag-theme-quartz" style={{ height: '600px', width: '100%' }}>
                    <AgGridReact<StudentData>
                        theme={themeQuartz}
                        rowData={students}
                        columnDefs={columnDefs}
                        quickFilterText={quickFilterText}
                        defaultColDef={{
                            sortable: true,
                            filter: true,
                            resizable: true,
                            flex: 1,
                            minWidth: 100,
                        }}
                        pagination={true}
                        paginationPageSize={10}
                        paginationPageSizeSelector={[10, 20, 50]}
                        rowSelection={{ mode: 'singleRow' }}
                        animateRows={true}
                        domLayout="normal"
                        rowHeight={70}
                        headerHeight={50}
                        suppressCellFocus={true}
                        overlayNoRowsTemplate={
                            '<div style="padding: 20px;">No se encontraron participantes</div>'
                        }
                    />
                </div>
            </div>
        </div>

        {/* Modal for History */}
        <HistoryModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      </div>
    </AuthenticatedLayout>
  );
}
