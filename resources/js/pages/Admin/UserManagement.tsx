import React, { useState, useRef, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, ICellRendererParams } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
import { 
  RiUserAddLine, 
  RiEditLine, 
  RiDeleteBinLine, 
  RiEyeLine, 
  RiEyeOffLine,
  RiShieldUserLine,
  RiMailLine,
  RiUserStarLine,
  RiUserSettingsLine,
  RiShieldCheckLine
} from 'react-icons/ri';
import { Search, XCircle } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Select2 } from '@/components/ui/Select2';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

// Registrar módulos de AG Grid Community
ModuleRegistry.registerModules([AllCommunityModule]);

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'sales_advisor' | 'cashier' | 'verifier';
  created_at: string;
  updated_at: string;
}

interface Props {
  users: User[];
}

const UserManagement: React.FC<Props> = ({ users }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const gridRef = useRef<AgGridReact>(null);

  const { data, setData, post, put, processing, errors, reset } = useForm({
    name: '',
    email: '',
    role: 'sales_advisor' as 'admin' | 'sales_advisor' | 'cashier' | 'verifier',
    password: '',
  });

  const roleOptions = [
    { value: 'admin', label: 'Administrador' },
    { value: 'sales_advisor', label: 'Asesor de Ventas' },
    { value: 'cashier', label: 'Cajero' },
    { value: 'verifier', label: 'Verificador' },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F98613]/10 text-[#F98613] border border-[#F98613]/30">
            <RiShieldUserLine className="w-3 h-3 mr-1" />
            Administrador
          </span>
        );
      case 'sales_advisor':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <RiUserStarLine className="w-3 h-3 mr-1" />
            Asesor de Ventas
          </span>
        );
      case 'cashier':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
            <RiUserSettingsLine className="w-3 h-3 mr-1" />
            Cajero
          </span>
        );
      case 'verifier':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30">
            <RiShieldCheckLine className="w-3 h-3 mr-1" />
            Verificador
          </span>
        );
      default:
        return role;
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    reset();
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    reset();
    setShowPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      put(`/admin/users/${editingUser.id}`, {
        onSuccess: () => {
          closeModal();
          toast.success('Usuario actualizado', {
            description: 'Los datos del usuario han sido actualizados exitosamente',
            duration: 4000,
          });
        },
        onError: () => {
          toast.error('Error', {
            description: 'No se pudo actualizar el usuario',
            duration: 4000,
          });
        }
      });
    } else {
      post('/admin/users', {
        onSuccess: () => {
          closeModal();
          toast.success('Usuario creado', {
            description: 'El nuevo usuario ha sido agregado al sistema',
            duration: 4000,
          });
        },
        onError: () => {
          toast.error('Error', {
            description: 'No se pudo crear el usuario',
            duration: 4000,
          });
        }
      });
    }
  };

  const handleDelete = async (userId: number, userName: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar Usuario?',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-3">¿Estás seguro de que quieres eliminar a <strong>${userName}</strong>?</p>
          <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p class="text-sm text-red-800">
              <strong>Advertencia:</strong> Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '<i class="fas fa-trash"></i> Sí, Eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      router.delete(`/admin/users/${userId}`, {
        onSuccess: () => {
          toast.success('Usuario eliminado', {
            description: 'El usuario ha sido eliminado del sistema',
            duration: 4000,
          });
        },
        onError: () => {
          toast.error('Error', {
            description: 'No se pudo eliminar el usuario',
            duration: 4000,
          });
        }
      });
    }
  };

  const ActionsCellRenderer = (props: ICellRendererParams<User>) => {
    const user = props.data!;
    return (
      <div className="flex items-center space-x-2 h-full">
        <button
          onClick={() => openEditModal(user)}
          className="text-[#073372] hover:text-[#17BC91] transition-colors p-1.5 hover:bg-[#17BC91]/10 rounded"
          title="Editar"
        >
          <RiEditLine className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleDelete(user.id, user.name)}
          className="text-red-600 hover:text-red-800 transition-colors p-1.5 hover:bg-red-50 rounded"
          title="Eliminar"
        >
          <RiDeleteBinLine className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const RoleCellRenderer = (props: ICellRendererParams<User>) => {
    return (
      <div className="flex items-center h-full">
        {getRoleBadge(props.value)}
      </div>
    );
  };

  const DateCellRenderer = (props: ICellRendererParams<User>) => {
    if (!props.value) return '';
    const date = new Date(props.value);
    return (
      <div className="flex items-center h-full">
        <span className="text-sm text-gray-600">
          {date.toLocaleDateString('es-PE', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
          })}
        </span>
      </div>
    );
  };

  const columnDefs = useMemo<ColDef<User>[]>(() => [
    {
      headerName: 'Usuario',
      field: 'name',
      minWidth: 300,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<User>) => {
        const user = params.data!;
        return (
          <div className="flex items-center py-2 w-full h-full">
            <div className="w-10 h-10 bg-gradient-to-r from-[#073372] to-[#17BC91] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500 flex items-center">
                <RiMailLine className="w-3 h-3 mr-1" />
                {user.email}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Rol',
      field: 'role',
      width: 200,
      cellRenderer: RoleCellRenderer,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Fecha de Creación',
      field: 'created_at',
      width: 180,
      cellRenderer: DateCellRenderer,
      filter: 'agDateColumnFilter',
    },
    {
      headerName: 'Acciones',
      cellRenderer: ActionsCellRenderer,
      width: 120,
      sortable: false,
      filter: false,
      pinned: 'right',
    },
  ], []);

  const defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
  };

  return (
    <AuthenticatedLayout>
      <Head title="Gestión de Usuarios" />

      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-xl shadow-lg">
              <RiShieldUserLine className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
              <p className="text-sm text-slate-600">Administra asesores, cajeros y verificadores del sistema</p>
            </div>
          </div>
          
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2.5 bg-[#073372] hover:bg-[#17BC91] text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            <RiUserAddLine className="h-5 w-5 mr-2" />
            Nuevo Usuario
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Administradores</p>
                <p className="text-3xl font-bold text-[#F98613] mt-1">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <div className="p-3 bg-[#F98613]/10 rounded-lg">
                <RiShieldUserLine className="w-8 h-8 text-[#F98613]" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Asesores de Ventas</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {users.filter(u => u.role === 'sales_advisor').length}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <RiUserStarLine className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cajeros</p>
                <p className="text-3xl font-bold text-cyan-600 mt-1">
                  {users.filter(u => u.role === 'cashier').length}
                </p>
              </div>
              <div className="p-3 bg-cyan-50 rounded-lg">
                <RiUserSettingsLine className="w-8 h-8 text-cyan-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verificadores</p>
                <p className="text-3xl font-bold text-[#17BC91] mt-1">
                  {users.filter(u => u.role === 'verifier').length}
                </p>
              </div>
              <div className="p-3 bg-[#17BC91]/10 rounded-lg">
                <RiShieldCheckLine className="w-8 h-8 text-[#17BC91]" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              placeholder="Buscar por nombre, email o rol..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent transition-all"
            />
            {quickFilterText && (
              <button
                onClick={() => setQuickFilterText('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* AG Grid Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="ag-theme-quartz" style={{ height: '600px', width: '100%' }}>
            <AgGridReact<User>
              ref={gridRef}
              theme={themeQuartz}
              rowData={users}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              quickFilterText={quickFilterText}
              pagination={true}
              paginationPageSize={20}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              animateRows={true}
              rowSelection={{ mode: 'singleRow' }}
              domLayout="normal"
              rowHeight={70}
              headerHeight={48}
              suppressCellFocus={true}
              rowClass="hover:bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6">
              <h2 className="text-2xl font-bold text-white">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <p className="text-white/80 text-sm mt-1">
                {editingUser ? 'Modifica los datos del usuario' : 'Completa los datos del nuevo usuario'}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nombre */}
                <Input
                  label="Nombre Completo"
                  type="text"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  error={errors.name}
                  required
                  variant="outlined"
                />

                {/* Email */}
                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  icon={<RiMailLine className="w-5 h-5" />}
                  error={errors.email}
                  required
                  variant="outlined"
                />

                {/* Rol */}
                <div>
                  <Select2
                    label="Rol del Usuario"
                    options={roleOptions}
                    value={data.role}
                    onChange={(value) => setData('role', value as 'admin' | 'sales_advisor' | 'cashier' | 'verifier')}
                    placeholder="Selecciona un rol"
                    helperText={errors.role}
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Input
                    label={editingUser ? "Contraseña (opcional)" : "Contraseña"}
                    type={showPassword ? 'text' : 'password'}
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    error={errors.password}
                    required={!editingUser}
                    variant="outlined"
                    helperText={editingUser ? "Dejar en blanco para mantener la contraseña actual" : "Mínimo 8 caracteres"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[18px] text-gray-400 hover:text-gray-600 transition-colors z-10"
                  >
                    {showPassword ? (
                      <RiEyeOffLine className="h-5 w-5" />
                    ) : (
                      <RiEyeLine className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-6 py-2.5 text-sm font-medium text-white bg-[#073372] hover:bg-[#17BC91] rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={processing}
              >
                {processing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  editingUser ? 'Actualizar Usuario' : 'Crear Usuario'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
};

export default UserManagement;
