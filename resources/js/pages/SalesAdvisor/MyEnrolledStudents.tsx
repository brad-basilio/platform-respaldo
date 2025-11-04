import React, { useState, useMemo } from 'react';
import { Users, Search, XCircle, CheckCircle, GraduationCap } from 'lucide-react';
import { Student } from '../../types/models';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Input } from '@/components/ui/input';
import '../../../css/ag-grid-custom.css';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  students: Student[];
}

const MyEnrolledStudents: React.FC<Props> = ({ students: initialStudents = [] }) => {
  const [quickFilterText, setQuickFilterText] = useState<string>('');

  const columnDefs = useMemo<ColDef<Student>[]>(() => [
    {
      headerName: 'Alumno',
      field: 'name',
      minWidth: 300,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        return (
          <div className="flex items-center py-2 w-full h-full">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                {student.name.split(' ').map((n: string) => n[0]).join('')}
              </span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{student.name}</div>
              <div className="text-xs text-gray-500">{student.email}</div>
              <div className="text-xs text-gray-400">{student.phoneNumber}</div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Código Matrícula',
      field: 'enrollmentCode',
      width: 180,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        return (
          <div className="w-full h-full flex flex-col justify-center">
            <div className="text-sm font-mono text-gray-900">{params.value}</div>
          </div>
        );
      }
    },
    {
      headerName: 'Fecha Matrícula',
      field: 'enrollmentDate',
      width: 150,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        return (
          <div className="w-full h-full flex items-center">
            <div className="text-sm text-gray-700">{params.value}</div>
          </div>
        );
      }
    },
    {
      headerName: 'Nivel Académico',
      field: 'academicLevel.name',
      width: 180,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        if (!student.academicLevel) {
          return (
            <div className="w-full h-full flex items-center">
              <span className="text-xs text-gray-400">Sin nivel</span>
            </div>
          );
        }
        return (
          <div className='flex items-center space-x-2 w-full h-full'>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <GraduationCap className="w-3 h-3 mr-1" />
              {student.academicLevel.name}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Plan de Pago',
      field: 'paymentPlan.name',
      minWidth: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        if (!student.paymentPlan) {
          return (
            <div className="w-full h-full flex items-center">
              <span className="text-xs text-gray-400">Sin plan</span>
            </div>
          );
        }
        return (
          <div className="w-full h-full flex flex-col justify-center">
            <div className="text-sm text-gray-900">{student.paymentPlan.name}</div>
            <div className="text-xs text-gray-500">{student.paymentPlan.installments_count} cuotas</div>
          </div>
        );
      }
    },
    {
      headerName: 'Verificación',
      field: 'enrollmentVerified',
      width: 150,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        return (
          <div className="flex items-center h-full gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Verificada
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Verificada Por',
      field: 'verifiedEnrollmentBy.name',
      width: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        if (!student.verifiedEnrollmentBy) {
          return (
            <div className="w-full h-full flex items-center">
              <span className="text-xs text-gray-400">Sin verificar</span>
            </div>
          );
        }
        return (
          <div className="w-full h-full flex flex-col justify-center">
            <div className="text-sm text-gray-900">{student.verifiedEnrollmentBy.name}</div>
            <div className="text-xs text-gray-500">
              {student.enrollmentVerifiedAt ? new Date(student.enrollmentVerifiedAt).toLocaleDateString('es-PE') : ''}
            </div>
          </div>
        );
      }
    }
  ], []);

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Matriculados Verificados</h1>
            <p className="text-gray-600">Lista de tus estudiantes con matrícula verificada</p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg">
            <div className="text-center">
              <div className="text-3xl font-bold">{initialStudents.length}</div>
              <div className="text-sm opacity-90">Verificados</div>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda global */}
        <div className="relative">
          <Input
            type="text"
            label="Buscar por nombre, email, código, nivel, plan..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            className="pr-10"
          />
          {quickFilterText && (
            <button
              onClick={() => setQuickFilterText('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Tabla AG Grid */}
        <div className="ag-theme-quartz" style={{ height: '600px', width: '100%' }}>
          <AgGridReact<Student>
            theme={themeQuartz}
            rowData={initialStudents}
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
            paginationPageSize={20}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            rowSelection={{ mode: 'singleRow' }}
            animateRows={true}
            domLayout="normal"
            rowHeight={70}
            headerHeight={48}
            suppressCellFocus={true}
            rowClass="hover:bg-gray-50"
          />
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Verificados</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{initialStudents.length}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Con Plan de Pago</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {initialStudents.filter((s: Student) => s.paymentPlan).length}
                </p>
              </div>
              <GraduationCap className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Con Nivel Asignado</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {initialStudents.filter((s: Student) => s.academicLevel).length}
                </p>
              </div>
              <Users className="h-10 w-10 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default MyEnrolledStudents;
