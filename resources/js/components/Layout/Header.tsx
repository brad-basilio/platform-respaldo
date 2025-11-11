import React from 'react';
import { usePage } from '@inertiajs/react';
import { User as UserType } from '@/types/models';
import NotificationBell from '@/components/NotificationBell';
import UserProfileDropdown from '@/components/UserProfileDropdown';

const Header: React.FC = () => {
  const { auth } = usePage<{ auth: { user: UserType } }>().props;
  const user = auth.user;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-full px-6 lg:px-8">
        <div className="flex justify-end items-center h-16">
          <div className="flex items-center space-x-4">
            {/* 🔔 Notificación Bell */}
            <NotificationBell userId={Number(user.id)} userRole={user.role} />

            {/* Separador */}
            <div className="h-8 w-px bg-slate-200"></div>

            {/* Dropdown de Perfil de Usuario */}
            <UserProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;