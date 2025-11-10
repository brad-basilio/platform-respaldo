import React from 'react';
import { LogOut, Settings } from 'lucide-react';
import { usePage, router } from '@inertiajs/react';
import { User as UserType } from '@/types/models';
import NotificationBell from '@/components/NotificationBell';

const Header: React.FC = () => {
  const { auth } = usePage<{ auth: { user: UserType } }>().props;
  const user = auth.user;

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
      default: return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Profesor';
      case 'student': return 'Estudiante';
      case 'sales_advisor': return 'Asesor de Ventas';
      case 'cashier': return 'Cajero';
      default: return 'Usuario';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-full px-6 lg:px-8">
        <div className="flex justify-end items-center h-16">
        

          <div className="flex items-center space-x-3">
            {/* 🔔 Notificación Bell - Funciona en todas las páginas */}
            <NotificationBell userId={user.id} userRole={user.role} />

            <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${getRoleColor(user?.role || '')}`}>
                    {getRoleLabel(user?.role || '')}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button className="p-2.5 text-slate-400 hover:text-[#073372] hover:bg-slate-50 rounded-xl transition-all">
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={logout}
                  className="p-2.5 text-slate-400 hover:text-[#F98613] hover:bg-red-50 rounded-xl transition-all"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;