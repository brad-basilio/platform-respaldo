import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Settings, LogOut, Camera, X } from 'lucide-react';
import { usePage, router, useForm } from '@inertiajs/react';
import { User as UserType } from '@/types/models';
import { toast } from 'sonner';
import axios from 'axios';

const UserProfileDropdown: React.FC = () => {
  const { auth } = usePage<{ auth: { user: UserType } }>().props;
  const user = auth.user;
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, setData, processing } = useForm({
    avatar: null as File | null,
  });

  // Calcular posición del dropdown
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // No cerrar si el click es en el botón o en el dropdown menu
      if (
        buttonRef.current?.contains(target) ||
        dropdownMenuRef.current?.contains(target)
      ) {
        return;
      }
      
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const logout = () => {
    router.post('/logout');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-[#F98613]/10 text-[#F98613] border border-[#F98613]/30';
      case 'teacher': return 'bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30';
      case 'student': return 'bg-[#073372]/10 text-[#073372] border border-[#073372]/30';
      case 'sales_advisor': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'cashier': return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      case 'verifier': return 'bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30';
      default: return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Instructor';
      case 'student': return 'Aprendiz';
      case 'sales_advisor': return 'Asesor de Ventas';
      case 'cashier': return 'Cajero';
      case 'verifier': return 'Verificador';
      default: return 'Usuario';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Error', { description: 'Por favor selecciona una imagen válida' });
        return;
      }

      // Validar tamaño (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Error', { description: 'La imagen no debe superar los 2MB' });
        return;
      }

      setData('avatar', file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!data.avatar) {
      toast.error('Error', { description: 'Por favor selecciona una imagen' });
      return;
    }

    const formData = new FormData();
    formData.append('avatar', data.avatar);

    try {
      await axios.post('/profile/update-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Foto actualizada', {
        description: 'Tu foto de perfil ha sido actualizada exitosamente',
      });

      setShowProfileModal(false);
      setPreviewImage(null);
      
      // Recargar la página para ver los cambios
      router.reload();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error', {
        description: 'No se pudo actualizar la foto de perfil',
      });
    }
  };

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return `/storage/${user.avatar}`;
    }
    return null;
  };

  return (
    <>
      <div className="relative z-[100]" ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={() => {
            console.log('Button clicked! Current state:', isOpen);
            setIsOpen(!isOpen);
          }}
          className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all"
        >
          {getAvatarUrl() ? (
            <img
              src={getAvatarUrl()!}
              alt={user?.name}
              className="h-10 w-10 rounded-full object-cover shadow-md border-2 border-white"
            />
          ) : (
            <div className="h-10 w-10 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-semibold">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user?.role || '')}`}>
              {getRoleLabel(user?.role || '')}
            </span>
          </div>
        </button>

        {/* Dropdown Menu usando Portal */}
        {isOpen && createPortal(
          <div 
            ref={dropdownMenuRef}
            className="fixed w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-[9999]"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>

            <button
              onClick={() => {
                console.log('Mi Perfil clicked');
                setShowProfileModal(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User className="h-4 w-4 mr-3 text-[#073372]" />
              Mi Perfil
            </button>

            <button
              onClick={() => {
                console.log('Configuración clicked');
                router.visit('/settings');
                setIsOpen(false);
              }}
              className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Settings className="h-4 w-4 mr-3 text-slate-500" />
              Configuración
            </button>

            <div className="border-t border-slate-100 mt-2 pt-2">
              <button
                onClick={() => {
                  console.log('Cerrar Sesión clicked');
                  logout();
                }}
                className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Cerrar Sesión
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Modal de Perfil */}
      {showProfileModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-in">
            {/* Header del Modal - Con gradiente como los demás modales */}
            <div className="relative bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6 rounded-t-3xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Mi Perfil</h3>
                  <p className="text-blue-100 text-sm">Actualiza tu información personal</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    setPreviewImage(null);
                    setData('avatar', null);
                  }}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrolleable */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              {/* Sección 1: Foto de Perfil */}
              <div>
                <div className="flex items-center mb-4 pb-2 border-b-2 border-[#073372]">
                  <div className="w-8 h-8 bg-[#073372] text-white rounded-full flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Foto de Perfil</h4>
                </div>
                
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    {previewImage || getAvatarUrl() ? (
                      <img
                        src={previewImage || getAvatarUrl()!}
                        alt="Preview"
                        className="h-32 w-32 rounded-full object-cover border-4 border-[#17BC91] shadow-lg"
                      />
                    ) : (
                      <div className="h-32 w-32 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-4xl font-bold">
                          {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-3 bg-[#073372] hover:bg-[#17BC91] text-white rounded-full shadow-lg transition-all duration-200"
                      title="Cambiar foto"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="text-center">
                    <p className="text-sm text-slate-600 font-medium">
                      Haz clic en el ícono de cámara para cambiar tu foto
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Formatos: JPG, PNG, GIF • Tamaño máximo: 2MB
                    </p>
                  </div>

                  {previewImage && (
                    <div className="w-full bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-[#073372] rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-[#073372]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-[#073372]">
                            Nueva imagen seleccionada. Haz clic en "Guardar Cambios" para aplicar.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 2: Información Personal */}
              <div>
                <div className="flex items-center mb-4 pb-2 border-b-2 border-[#073372]">
                  <div className="w-8 h-8 bg-[#073372] text-white rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Información Personal</h4>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center">
                        <User className="h-3 w-3 mr-1.5" />
                        Nombre Completo
                      </label>
                      <p className="text-slate-900 mt-2 font-medium text-base">{user?.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center">
                        <svg className="h-3 w-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Correo Electrónico
                      </label>
                      <p className="text-slate-900 mt-2 text-base">{user?.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center mb-2">
                        <svg className="h-3 w-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Rol en el Sistema
                      </label>
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getRoleColor(user?.role || '')}`}>
                        {getRoleLabel(user?.role || '')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-slate-300">
                    <div className="flex items-start space-x-2 text-amber-700 bg-amber-50 rounded-lg p-3">
                      <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs font-medium leading-relaxed">
                        Esta información solo puede ser modificada por un administrador del sistema. Si necesitas actualizar tus datos, contacta con el área de soporte.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer - Siempre visible */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-4 rounded-b-3xl border-t border-slate-200 flex justify-end space-x-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setPreviewImage(null);
                  setData('avatar', null);
                }}
                className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 shadow-sm"
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#073372] to-[#17BC91] hover:from-[#17BC91] hover:to-[#073372] rounded-lg transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                disabled={processing || !data.avatar}
              >
                {processing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default UserProfileDropdown;
