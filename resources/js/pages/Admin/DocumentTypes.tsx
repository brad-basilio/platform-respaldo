import React, { useState, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Input } from '@/components/ui/input';
import { 
  RiFileListLine, 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine,
  RiSaveLine
} from 'react-icons/ri';
import { XCircle, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';

ModuleRegistry.registerModules([AllCommunityModule]);

interface DocumentType {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  documentTypes: DocumentType[];
}

const DocumentTypes: React.FC<Props> = ({ documentTypes: initialDocumentTypes }) => {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>(initialDocumentTypes);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true,
    sort_order: 0,
  });

  const handleOpenModal = (documentType?: DocumentType) => {
    if (documentType) {
      setEditingType(documentType);
      setFormData({
        name: documentType.name,
        code: documentType.code,
        description: documentType.description || '',
        is_active: documentType.is_active,
        sort_order: documentType.sort_order,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        is_active: true,
        sort_order: 0, // No se usa pero mantenemos por compatibilidad
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      is_active: true,
      sort_order: 0,
    });
  };

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
      .trim()
      .replace(/\s+/g, '_') // Espacios a guiones bajos
      .replace(/-+/g, '_'); // Múltiples guiones a uno solo
  };

  const handleSave = async () => {
    if (!formData.name) {
      await Swal.fire({
        title: 'Campo Requerido',
        text: 'El nombre es obligatorio',
        icon: 'warning',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    setIsSaving(true);

    try {
      const url = editingType 
        ? `/admin/document-types/${editingType.id}`
        : '/admin/document-types';
      
      const method = editingType ? 'put' : 'post';
      
      // Generar código automáticamente como slug del nombre
      // Si es edición, mantener el código original para no romper referencias
      const dataToSend = {
        ...formData,
        code: editingType ? editingType.code : generateSlug(formData.name)
      };
      
      const response = await axios[method](url, dataToSend);

      if (response.data.success) {
        // Actualizar lista
        if (editingType) {
          setDocumentTypes(documentTypes.map(dt => 
            dt.id === editingType.id ? response.data.document_type : dt
          ));
        } else {
          setDocumentTypes([...documentTypes, response.data.document_type]);
        }

        handleCloseModal();

        await Swal.fire({
          title: '¡Éxito!',
          text: editingType ? 'Tipo de documento actualizado' : 'Tipo de documento creado',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error: any) {
      console.error('Error saving document type:', error);
      await Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'Error al guardar el tipo de documento',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (documentType: DocumentType) => {
    try {
      const response = await axios.post(`/admin/document-types/${documentType.id}/toggle-active`);
      
      if (response.data.success) {
        setDocumentTypes(documentTypes.map(dt =>
          dt.id === documentType.id ? response.data.document_type : dt
        ));
      }
    } catch (error: any) {
      console.error('Error toggling active:', error);
      await Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'Error al cambiar el estado',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const handleDelete = async (documentType: DocumentType) => {
    const result = await Swal.fire({
      title: '¿Eliminar Tipo de Documento?',
      html: `
        <p>¿Estás seguro de eliminar <strong>${documentType.name}</strong>?</p>
        <p class="text-sm text-red-600 mt-2">Esta acción no se puede deshacer.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, Eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await axios.delete(`/admin/document-types/${documentType.id}`);
      
      if (response.data.success) {
        setDocumentTypes(documentTypes.filter(dt => dt.id !== documentType.id));
        
        await Swal.fire({
          title: '¡Eliminado!',
          text: 'Tipo de documento eliminado exitosamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error: any) {
      console.error('Error deleting document type:', error);
      await Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'Error al eliminar el tipo de documento',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const handleRowDragEnd = async (event: any) => {
    const movedData = event.node.data;
    const overIndex = event.overIndex;
    
    // Reordenar localmente
    const newDocumentTypes = [...documentTypes];
    const oldIndex = newDocumentTypes.findIndex(dt => dt.id === movedData.id);
    
    // Remover del índice antiguo
    newDocumentTypes.splice(oldIndex, 1);
    // Insertar en el nuevo índice
    newDocumentTypes.splice(overIndex, 0, movedData);
    
    // Actualizar sort_order de todos
    const updatedTypes = newDocumentTypes.map((dt, index) => ({
      ...dt,
      sort_order: index + 1
    }));
    
    setDocumentTypes(updatedTypes);
    
    // Enviar al backend
    try {
      await axios.post('/admin/document-types/reorder', {
        order: updatedTypes.map(dt => ({ id: dt.id, sort_order: dt.sort_order }))
      });
    } catch (error) {
      console.error('Error reordering:', error);
      // Revertir en caso de error
      setDocumentTypes(documentTypes);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo actualizar el orden',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const columnDefs = useMemo<ColDef<DocumentType>[]>(() => [
    {
      headerName: '',
      rowDrag: true,
      width: 50,
      suppressMenu: true,
      cellClass: 'cursor-move',
    },
    
    {
      headerName: 'Nombre',
      field: 'name',
      flex: 1,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<DocumentType>) => {
        return (
          <div className="flex items-center h-full">
            <span className="font-medium text-gray-900">{params.value}</span>
          </div>
        );
      }
    },
    {
      headerName: 'Descripción',
      field: 'description',
      flex: 2,
      cellRenderer: (params: ICellRendererParams<DocumentType>) => {
        return (
          <div className="flex items-center h-full">
            <span className="text-sm text-gray-600">{params.value || 'Sin descripción'}</span>
          </div>
        );
      }
    },
    {
      headerName: 'Estado',
      field: 'is_active',
      width: 120,
      cellRenderer: (params: ICellRendererParams<DocumentType>) => {
        const documentType = params.data!;
        return (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => handleToggleActive(documentType)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                params.value ? 'bg-[#17BC91]' : 'bg-gray-300'
              }`}
              title={params.value ? 'Activo - Clic para desactivar' : 'Inactivo - Clic para activar'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  params.value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        );
      }
    },
    {
      headerName: 'Acciones',
      width: 150,
      cellRenderer: (params: ICellRendererParams<DocumentType>) => {
        const documentType = params.data!;
        return (
          <div className="flex items-center justify-center gap-2 h-full">
            <button
              onClick={() => handleOpenModal(documentType)}
              className="p-2 text-[#073372] hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <RiEditLine className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(documentType)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <RiDeleteBinLine className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ], [documentTypes]);

  return (
    <AuthenticatedLayout>
      <Head title="Tipos de Documentos" />
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RiFileListLine className="text-[#17BC91]" />
              Tipos de Documentos
            </h1>
            <p className="text-gray-600">Gestiona los tipos de documentos para verificación de matrícula</p>
          </div>
          
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
          >
            <RiAddLine className="h-5 w-5" />
            Agregar Tipo
          </button>
        </div>

        {/* Barra de búsqueda global */}
        <div className="relative">
          <Input
            type="text"
            label="Buscar por nombre o descripción..."
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         
          
          <div className="ag-theme-quartz" style={{ height: '600px', width: '100%' }}>
            <AgGridReact<DocumentType>
              theme={themeQuartz}
              rowData={documentTypes}
              columnDefs={columnDefs}
              quickFilterText={quickFilterText}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                minWidth: 100,
              }}
              rowDragManaged={true}
              animateRows={true}
              onRowDragEnd={handleRowDragEnd}
              pagination={false}
              rowHeight={60}
              headerHeight={48}
            />
          </div>
        </div>
      </div>

      {/* Modal para Crear/Editar */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {editingType ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'}
                </h2>
                <p className="text-blue-100 text-sm">
                  {editingType ? 'Modifica la información del tipo' : 'Completa los datos del nuevo tipo'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <Input
                label="Nombre del Tipo *"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Contrato, Reglamento, Términos..."
                disabled={isSaving}
              />

              <Input
                label="Descripción"
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional del tipo de documento"
                disabled={isSaving}
              />
            </div>

            <div className="bg-gray-50 px-8 py-5 border-t border-gray-200 flex justify-end gap-3 rounded-b-3xl">
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <RiSaveLine className="h-5 w-5" />
                    {editingType ? 'Actualizar' : 'Crear'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
};

export default DocumentTypes;
