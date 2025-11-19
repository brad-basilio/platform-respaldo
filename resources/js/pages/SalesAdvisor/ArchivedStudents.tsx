import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Student } from '@/types/models';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { RiSearchLine, RiArchiveLine, RiRestartLine } from 'react-icons/ri';
import axios from 'axios';
import { toast } from 'sonner';

// Registrar módulos de AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  archivedStudents: Student[];
}

const ArchivedStudents: React.FC<Props> = ({ archivedStudents: initialArchivedStudents }) => {
  const [archivedStudents, setArchivedStudents] = useState<Student[]>(initialArchivedStudents);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false);
  const [studentToRestore, setStudentToRestore] = useState<Student | null>(null);

  const handleRestoreStudent = async (studentId: string) => {
    try {
      // Usar FormData para enviar solo los campos necesarios
      const data = new FormData();
      data.append('archived', '0');
      data.append('archived_reason', '');
      data.append('_method', 'PUT');

      await axios.post(`/admin/students/${studentId}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Remover del estado local
      setArchivedStudents(prev => prev.filter(s => s.id !== studentId));

      toast.success('Prospecto restaurado', {
        description: 'El prospecto ha sido restaurado y vuelve al estado "Registrado"',
        duration: 4000,
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al restaurar', {
        description: 'No se pudo restaurar el prospecto. Intenta nuevamente.',
        duration: 5000,
      });
    }
  };

  const getProspectStatusColor = (status: string) => {
    switch (status) {
      case 'registrado': return 'bg-[#073372]/10 text-[#073372] border border-[#073372]/30';
      case 'propuesta_enviada': return 'bg-[#F98613]/10 text-[#F98613] border border-[#F98613]/30';
      case 'pago_por_verificar': return 'bg-orange-100 text-orange-700 border border-orange-300';
      case 'matriculado': return 'bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProspectStatusLabel = (status: string) => {
    switch (status) {
      case 'registrado': return 'Registrado';
      case 'propuesta_enviada': return 'Reunión Realizada';
      case 'pago_por_verificar': return 'Pago Por Verificar';
      case 'matriculado': return 'Matriculado';
      default: return 'Sin Estado';
    }
  };

  const columnDefs = useMemo<ColDef<Student>[]>(() => [
    {
      headerName: 'Prospecto',
      field: 'name',
      minWidth: 250,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const student = params.data;
        return (
          <div className="flex items-center py-2 w-full h-full">
            <div className="w-10 h-10 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-full flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
              {student.firstName.charAt(0)}{student.paternalLastName.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{student.name}</div>
              <div className="text-xs text-gray-500">{student.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Estado Original',
      field: 'prospectStatus',
      width: 180,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const student = params.data;
        return (
          <div className='flex items-center w-full h-full'>
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getProspectStatusColor(student.prospectStatus)}`}>
              {getProspectStatusLabel(student.prospectStatus)}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Fecha de Archivo',
      field: 'archivedAt',
      width: 180,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const student = params.data;
        if (!student.archivedAt) return <div className="flex items-center w-full h-full">-</div>;
        
        const date = new Date(student.archivedAt);
        return (
          <div className='flex items-center w-full h-full'>
            <div className="text-sm text-gray-700">
              {date.toLocaleDateString('es-PE', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Razón de Archivo',
      field: 'archivedReason',
      minWidth: 300,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const student = params.data;
        return (
          <div className='flex items-center w-full h-full'>
            <div className="text-sm text-gray-700 truncate">
              {student.archivedReason || 'Sin razón especificada'}
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Contacto',
      field: 'phoneNumber',
      width: 150,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const student = params.data;
        return (
          <div className='flex items-center w-full h-full'>
            <div className="text-sm text-gray-700">{student.phoneNumber}</div>
          </div>
        );
      }
    },
    {
      headerName: 'Acciones',
      width: 130,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        const student = params.data;
        return (
          <div className="flex items-center space-x-2 w-full h-full">
            <button
              onClick={() => {
                setStudentToRestore(student);
                setShowRestoreConfirmation(true);
              }}
              className="p-2 text-[#17BC91] hover:bg-[#17BC91]/10 rounded-lg transition-colors"
              title="Restaurar prospecto"
            >
              <RiRestartLine className="w-5 h-5" />
            </button>
          </div>
        );
      }
    }
  ], []);

  return (
    <AuthenticatedLayout>
      {/* Modal de Confirmación de Restauración */}
      {showRestoreConfirmation && studentToRestore && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#17BC91] to-emerald-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <RiRestartLine className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Confirmar Restauración</h3>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              <p className="text-gray-700 mb-2">
                ¿Estás seguro de que deseas restaurar a <span className="font-semibold">{studentToRestore.name}</span>?
              </p>
              <div className="bg-emerald-50 border-l-4 border-[#17BC91] p-3 rounded mt-4">
                <p className="text-sm text-gray-600">
                  • El prospecto volverá al estado <span className="font-semibold">"Registrado"</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  • Aparecerá nuevamente en tu lista de prospectos activos
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  • Se eliminará la razón de archivo
                </p>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreConfirmation(false);
                  setStudentToRestore(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-lg font-semibold transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRestoreStudent(studentToRestore.id);
                  setShowRestoreConfirmation(false);
                  setStudentToRestore(null);
                }}
                className="px-4 py-2 bg-[#17BC91] hover:bg-emerald-600 text-white rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
              >
                <RiRestartLine className="w-5 h-5" />
                Sí, Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#073372] to-[#17BC91] bg-clip-text text-transparent">
              Prospectos Archivados
            </h1>
            <p className="text-gray-600 mt-2">
              Prospectos que han sido archivados por no llegar a un acuerdo
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600">Total Archivados</div>
              <div className="text-2xl font-bold text-[#073372]">{archivedStudents.length}</div>
            </div>
          </div>
        </div>

        {/* Filtro de búsqueda */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar prospecto archivado..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#17BC91] focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabla AG Grid */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
            <AgGridReact<Student>
              rowData={archivedStudents}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                resizable: true,
                flex: 1,
              }}
              quickFilterText={quickFilterText}
              animateRows={true}
              pagination={true}
              paginationPageSize={20}
              rowHeight={70}
              domLayout='normal'
            />
          </div>
        </div>

        {/* Empty State */}
        {archivedStudents.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <RiArchiveLine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay prospectos archivados
            </h3>
            <p className="text-gray-500">
              Los prospectos archivados aparecerán aquí
            </p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default ArchivedStudents;
