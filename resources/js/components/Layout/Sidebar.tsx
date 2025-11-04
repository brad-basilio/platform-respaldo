import React from 'react';
import { 
  Home, Users, BookOpen, Video, MessageSquare, 
  BarChart3, Award, FileText, Settings,
  GraduationCap, UserCheck, PieChart, CreditCard
} from 'lucide-react';
import { usePage, router } from '@inertiajs/react';
import { User } from '@/types/models';

interface SidebarProps {
  activeView?: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onViewChange }) => {
  const page = usePage();
  const user = page.props.auth?.user as User;
  
  console.log('📍 Full Inertia Page:', page); // Debug completo
  
  // Obtener URL y component del objeto page
  const currentUrl = page.url || '';
  const currentComponent = page.component || '';

  // Determinar la vista activa basándose en la URL actual
  const getActiveViewFromUrl = () => {
    console.log('🔍 Current URL:', currentUrl); // Debug
    console.log('🔍 Current Component:', currentComponent); // Debug
    
    if (!currentUrl) return 'dashboard';
    
    // Usar component como respaldo si la URL no coincide
    if (currentComponent === 'Student/PaymentControl') return 'payment-control';
    
    if (currentUrl.startsWith('/admin/students')) return 'students';
    if (currentUrl.startsWith('/admin/enrolled-students')) return 'enrolled-students';
    if (currentUrl.startsWith('/admin/teachers')) return 'teachers';
    if (currentUrl.startsWith('/admin/groups')) return 'groups';
    if (currentUrl.startsWith('/admin/academic-levels')) return 'academic-levels';
    if (currentUrl.startsWith('/admin/payment-plans')) return 'payment-plans';
    if (currentUrl.startsWith('/admin/payments')) return 'payments';
    if (currentUrl.startsWith('/admin/analytics')) return 'analytics';
    if (currentUrl.startsWith('/student/payment-control')) return 'payment-control';
    if (currentUrl.startsWith('/settings')) return 'settings';
    if (currentUrl.startsWith('/dashboard')) return 'dashboard';
    return 'dashboard';
  };

  const currentActiveView = getActiveViewFromUrl();
  console.log('✅ Active view:', currentActiveView); // Debug

  const handleNavigation = (view: string) => {
    onViewChange(view);
    
    // Navigate using Inertia router
    const routes: Record<string, string> = {
      'dashboard': '/dashboard',
      'students': '/admin/students',
      'enrolled-students': '/admin/enrolled-students',
      'teachers': '/admin/teachers',
      'groups': '/admin/groups',
      'academic-levels': '/admin/academic-levels',
      'payment-plans': '/admin/payment-plans',
      'payments': '/admin/payments',
      'payment-control': '/student/payment-control',
      'analytics': '/admin/analytics',
      'settings': '/settings',
    };

    const route = routes[view];
    if (route) {
      router.visit(route);
    }
  };

  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Panel Principal', icon: Home },
    ];

    switch (user?.role) {
      case 'admin':
        return [
          ...baseItems,
          { id: 'students', label: 'Prospectos', icon: Users },
          { id: 'enrolled-students', label: 'Alumnos Matriculados', icon: GraduationCap },
          { id: 'teachers', label: 'Docentes', icon: UserCheck },
          { id: 'groups', label: 'Creacion de grupos', icon: Users },
          { id: 'academic-levels', label: 'Niveles Académicos', icon: GraduationCap },
          { id: 'payment-plans', label: 'Planes de Pago', icon: CreditCard },
          { id: 'payments', label: 'Control de pagos', icon: FileText },
          { id: 'analytics', label: 'Estadísticas', icon: PieChart },
          { id: 'settings', label: 'Configuración', icon: Settings },
        ];
      case 'teacher':
        return [
          ...baseItems,
          { id: 'classes', label: 'Clases', icon: BookOpen },
          { id: 'workshops', label: 'Talleres', icon: Video },
          { id: 'forums', label: 'Foros', icon: MessageSquare },
          { id: 'evaluations', label: 'Evaluaciones', icon: FileText },
          { id: 'students', label: 'Mis Estudiantes', icon: Users },
        ];
      case 'student':
        return [
          ...baseItems,
          { id: 'classes', label: 'Clases', icon: BookOpen },
          { id: 'workshops', label: 'Talleres', icon: Video },
          { id: 'payment-control', label: 'Control de Pagos', icon: CreditCard },
          { id: 'forums', label: 'Foros', icon: MessageSquare },
          { id: 'exams', label: 'Exámenes', icon: FileText },
          { id: 'progress', label: 'Progreso', icon: BarChart3 },
          { id: 'certificates', label: 'Certificados', icon: Award },
        ];
      case 'sales_advisor':
        return [
          ...baseItems,
          { id: 'students', label: 'Mis Prospectos', icon: Users },
        ];
      case 'cashier':
        return [
          ...baseItems,
          { id: 'students', label: 'Verificación de Pagos', icon: FileText },
          { id: 'payments', label: 'Control de Pagos', icon: PieChart },
        ];
      default:
        return baseItems;
    }
  };

  return (
    <div className="bg-white w-64 min-h-screen border-r border-slate-200">
      <div className="p-4">
        <nav className="space-y-1.5">
          {getMenuItems().map((item) => {
            const Icon = item.icon;
            const isActive = currentActiveView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                }`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;