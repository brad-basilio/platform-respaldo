import React from 'react';
import { LogOut, Settings, GraduationCap } from 'lucide-react';
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
      case 'admin': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'teacher': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'student': return 'bg-blue-50 text-blue-700 border border-blue-200';
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
    <header className="bg-white/95 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-full px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-md">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">InglésProf</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Sistema de Gestión Académica</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 🔔 Notificación Bell - Funciona en todas las páginas */}
            <NotificationBell userId={user.id} userRole={user.role} />

            <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
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
                <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={logout}
                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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