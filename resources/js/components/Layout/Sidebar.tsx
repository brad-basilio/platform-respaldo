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
    if (currentComponent === 'Cashier/PaymentControl') return 'cashier-payment-control';
    if (currentComponent === 'Admin/PaymentControl') return 'admin-payment-control';
    if (currentComponent === 'Cashier/PaymentReports') return 'payment-reports';
    
    if (currentUrl.startsWith('/admin/students')) return 'students';
    if (currentUrl.startsWith('/admin/enrolled-students')) return 'enrolled-students';
    if (currentUrl.startsWith('/sales-advisor/enrolled-students')) return 'enrolled-students';
    if (currentUrl.startsWith('/admin/teachers')) return 'teachers';
    if (currentUrl.startsWith('/admin/groups')) return 'groups';
    if (currentUrl.startsWith('/admin/academic-levels')) return 'academic-levels';
    if (currentUrl.startsWith('/admin/payment-plans')) return 'payment-plans';
    if (currentUrl.startsWith('/admin/payments')) return 'payments';
    if (currentUrl.startsWith('/admin/analytics')) return 'analytics';
    if (currentUrl.startsWith('/student/payment-control')) return 'payment-control';
    if (currentUrl.startsWith('/admin/payment-control')) return 'admin-payment-control';
    if (currentUrl.startsWith('/cashier/payment-control')) return 'cashier-payment-control';
    if (currentUrl.startsWith('/cashier/payment-reports')) return 'payment-reports';
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
      'enrolled-students': user?.role === 'sales_advisor' ? '/sales-advisor/enrolled-students' : '/admin/enrolled-students',
      'teachers': '/admin/teachers',
      'groups': '/admin/groups',
      'academic-levels': '/admin/academic-levels',
      'payment-plans': '/admin/payment-plans',
      'payments': '/admin/payments',
      'payment-control': '/student/payment-control',
      'admin-payment-control': '/admin/payment-control',
      'cashier-payment-control': '/cashier/payment-control',
      'payment-reports': '/cashier/payment-reports',
      'analytics': '/admin/analytics',
      'settings': '/settings',
    };

    const route = routes[view];
    if (route) {
      router.visit(route);
    }
  };

  const getMenuItems = () => {
    switch (user?.role) {
      case 'admin':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: Home },
            ]
          },
          {
            section: 'PROSPECTOS',
            items: [
              { id: 'students', label: 'Prospectos', icon: Users },
              { id: 'enrolled-students', label: 'Alumnos Matriculados', icon: GraduationCap },
            ]
          },
          {
            section: 'CONFIGURACIÓN',
            items: [
              //{ id: 'teachers', label: 'Docentes', icon: UserCheck },
              //{ id: 'groups', label: 'Creación de grupos', icon: Users },
              { id: 'academic-levels', label: 'Niveles Académicos', icon: GraduationCap },
              { id: 'payment-plans', label: 'Planes de Pago', icon: CreditCard },
            ]
          },
          {
            section: 'FINANZAS',
            items: [
        
              { id: 'admin-payment-control', label: 'Gestión de Pagos', icon: CreditCard },
            ]
          },
         /* {
            section: 'REPORTES',
            items: [
              { id: 'analytics', label: 'Estadísticas', icon: PieChart },
              { id: 'settings', label: 'Configuración', icon: Settings },
            ]
          },*/
        ];
      case 'teacher':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: Home },
            ]
          },
          {
            section: 'ACADÉMICO',
            items: [
              { id: 'classes', label: 'Clases', icon: BookOpen },
              { id: 'workshops', label: 'Talleres', icon: Video },
              { id: 'evaluations', label: 'Evaluaciones', icon: FileText },
              { id: 'students', label: 'Mis Estudiantes', icon: Users },
            ]
          },
          {
            section: 'COMUNICACIÓN',
            items: [
              { id: 'forums', label: 'Foros', icon: MessageSquare },
            ]
          },
        ];
      case 'student':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: Home },
            ]
          },
    /*      {
            section: 'ACADÉMICO',
            items: [
          //    { id: 'classes', label: 'Clases', icon: BookOpen },
           //   { id: 'workshops', label: 'Talleres', icon: Video },
            //  { id: 'exams', label: 'Exámenes', icon: FileText },
             // { id: 'progress', label: 'Progreso', icon: BarChart3 },
             // { id: 'certificates', label: 'Certificados', icon: Award },
            ]
          },*/
          {
            section: 'FINANZAS',
            items: [
              { id: 'payment-control', label: 'Control de Pagos', icon: CreditCard },
            ]
          },
         /* {
            section: 'COMUNICACIÓN',
            items: [
              { id: 'forums', label: 'Foros', icon: MessageSquare },
            ]
          },*/
        ];
      case 'sales_advisor':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: Home },
            ]
          },
          {
            section: 'VENTAS',
            items: [
              { id: 'students', label: 'Mis Prospectos', icon: Users },
              { id: 'enrolled-students', label: 'Matriculados Verificados', icon: GraduationCap },
            ]
          },
        ];
      case 'cashier':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: Home },
            ]
          },
          {
            section: 'FINANZAS',
            items: [
              { id: 'students', label: 'Prospectos', icon: Users },
              { id: 'cashier-payment-control', label: 'Control de Pagos', icon: CreditCard },
            //  { id: 'payment-reports', label: 'Reportes', icon: BarChart3 },
            ]
          },
        ];
      default:
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: Home },
            ]
          },
        ];
    }
  };

  return (
    <div className="bg-white w-64 border-r border-slate-200 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sidebar-scroll">
        <nav className="space-y-6">
          {getMenuItems().map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-1.5">
              {/* Título de la sección */}
              <h3 className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {section.section}
              </h3>
              
              {/* Items de la sección */}
              {section.items.map((item) => {
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
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;