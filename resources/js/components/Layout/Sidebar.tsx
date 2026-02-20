import React from 'react';
import {
  RiHome5Line,
  RiTeamLine,
  RiBookOpenLine,
  RiVideoLine,
  RiMessage3Line,
  RiBarChartBoxLine,
  RiAwardLine,
  RiFileTextLine,
  RiSettings4Line,
  RiGraduationCapLine,
  RiUserStarLine,
  RiPieChartLine,
  RiSecurePaymentLine,
  RiDashboard2Line,
  RiGroupLine,
  RiShieldUserLine,
  RiFileListLine,
  RiCalendarCheckLine
} from 'react-icons/ri';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { usePage, router } from '@inertiajs/react';
import { User } from '@/types/models';

interface SidebarProps {
  activeView?: string;
  onViewChange: (view: string) => void;
  hasUnsignedContract?: boolean; // ✅ Nueva prop
}

const Sidebar: React.FC<SidebarProps> = ({ onViewChange, hasUnsignedContract = false }) => {
  const page = usePage();
  const user = page.props.auth?.user as User;

  console.log('📍 Full Inertia Page:', page); // Debug completo
  console.log('📝 Has Unsigned Contract (prop):', hasUnsignedContract); // Debug contrato

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
    if (currentComponent === 'Student/Billing') return 'billing';
    if (currentComponent === 'Student/MyPlan') return 'my-plan';
    if (currentComponent === 'Student/PaymentMethods') return 'payment-methods';
    if (currentComponent === 'Cashier/PaymentControl') return 'cashier-payment-control';
    if (currentComponent === 'Admin/PaymentControl') return 'admin-payment-control';
    if (currentComponent === 'Cashier/PaymentReports') return 'payment-reports';
    if (currentComponent === 'Dashboard/Verifier') return 'dashboard';
    if (currentComponent === 'Dashboard/Admin') return 'dashboard';
    if (currentComponent === 'SalesAdvisor/ArchivedStudents') return 'archived-students';

    if (currentUrl.startsWith('/admin/students')) return 'students';
    if (currentUrl.startsWith('/admin/enrolled-students')) return 'enrolled-students';
    if (currentUrl.startsWith('/sales-advisor/enrolled-students')) return 'enrolled-students';
    if (currentUrl.startsWith('/sales-advisor/archived-students')) return 'archived-students';
    if (currentUrl.startsWith('/verifier/enrolled-students')) return 'enrolled-students';
    if (currentUrl.startsWith('/admin/teachers')) return 'teachers';
    if (currentUrl.startsWith('/admin/groups')) return 'groups';
    if (currentUrl.startsWith('/admin/academic-levels')) return 'academic-levels';
    if (currentUrl.startsWith('/admin/payment-plans')) return 'payment-plans';
    if (currentUrl.startsWith('/admin/document-types')) return 'document-types';
    if (currentUrl.startsWith('/admin/payments')) return 'payments';
    if (currentUrl.startsWith('/admin/analytics')) return 'analytics';
    if (currentUrl.startsWith('/admin/class-templates')) return 'class-templates';
    if (currentUrl.startsWith('/admin/scheduled-classes')) return 'scheduled-classes';
    if (currentUrl.startsWith('/admin/scheduled-practices')) return 'scheduled-practices';
    if (currentUrl.startsWith('/admin/class-requests')) return 'class-requests';
    if (currentUrl.startsWith('/admin/practice-requests')) return 'practice-requests';
    if (currentUrl.startsWith('/student/payment-control')) return 'payment-control';
    if (currentUrl.startsWith('/student/billing')) return 'billing';
    if (currentUrl.startsWith('/student/my-plan')) return 'my-plan';
    if (currentUrl.startsWith('/student/payment-methods')) return 'payment-methods';
    if (currentUrl.startsWith('/student/my-classes')) return 'my-classes';
    if (currentUrl.startsWith('/student/class-templates')) return 'my-classes';
    if (currentUrl.startsWith('/student/class-enrollments')) return 'my-classes';
    // Teacher routes
    if (currentUrl.startsWith('/teacher/my-classes')) {
        // Si estamos en el detalle, intentamos obtener el tipo de las props
        const scheduledClass = page.props.scheduledClass as any;
        if (scheduledClass?.type === 'practice' || currentUrl.includes('type=practice')) {
            return 'teacher-my-practices';
        }
        return 'teacher-my-classes';
    }
    if (currentUrl.startsWith('/teacher/my-students')) return 'teacher-my-students';
    if (currentUrl.startsWith('/teacher/class-templates')) return 'teacher-class-templates';
    if (currentUrl.startsWith('/teacher/availability')) return 'teacher-availability';
    if (currentUrl.startsWith('/admin/payment-control')) return 'admin-payment-control';
    if (currentUrl.startsWith('/cashier/payment-control')) return 'cashier-payment-control';
    if (currentUrl.startsWith('/cashier/payment-reports')) return 'payment-reports';
    if (currentUrl.startsWith('/admin/settings')) return 'settings';
    if (currentUrl.startsWith('/settings')) return 'settings';
    if (currentUrl.startsWith('/dashboard')) return 'dashboard';
    if (currentUrl.startsWith('/admin/practice-rotations')) return 'practice-rotations';
    if (currentUrl.startsWith('/student/practice-rotations')) return 'practice-rotations';
    if (currentUrl.startsWith('/teacher/practice-rotations')) return 'practice-rotations';
    return 'dashboard';
  };

  const currentActiveView = getActiveViewFromUrl();
  console.log('✅ Active view:', currentActiveView); // Debug

  const handleNavigation = (view: string) => {
    // Check if on contract page
    if (currentUrl.startsWith('/contract/accept/')) return;

    onViewChange(view);

    // Navigate using Inertia router
    const routes: Record<string, string> = {
      'dashboard': '/dashboard',
      'students': '/admin/students',
      'enrolled-students': user?.role === 'sales_advisor'
        ? '/sales-advisor/enrolled-students'
        : '/admin/enrolled-students', // verifier y admin usan la misma ruta
      'archived-students': '/sales-advisor/archived-students',
      'teachers': '/admin/teachers',
      'groups': '/admin/groups',
      'academic-levels': '/admin/academic-levels',
      'payment-plans': '/admin/payment-plans',
      'document-types': '/admin/document-types',
      'payments': '/admin/payments',
      'payment-control': '/student/payment-control',
      'billing': '/student/billing',
      'my-plan': '/student/my-plan',
      'payment-methods': '/student/payment-methods',
      'my-classes': '/student/my-classes',
      
      // Rutas de Teacher
      'teacher-my-classes': '/teacher/my-classes?type=regular',
      'teacher-my-practices': '/teacher/my-classes?type=practice',
      'teacher-my-students': '/teacher/my-students',
      'teacher-class-templates': '/teacher/class-templates',
      'teacher-availability': '/teacher/availability',
      
      'admin-payment-control': '/admin/payment-control',
      'cashier-payment-control': '/cashier/payment-control',
      'payment-reports': '/cashier/payment-reports',
      'analytics': '/admin/analytics',
      'settings': '/admin/settings',
      'users': '/admin/users',
      'class-templates': '/admin/class-templates',
      'scheduled-classes': '/admin/scheduled-classes',
      'scheduled-practices': '/admin/scheduled-practices',
      'class-requests': '/admin/class-requests',
      'practice-requests': '/admin/practice-requests',
      'practice-rotations': user?.role === 'admin' ? '/admin/practice-rotations' : `/${user?.role.replace('_', '-')}/practice-rotations`,
    };

    const route = routes[view];
    if (route) {
      router.visit(route);
    }
  };

  const todayTeacher = page.props.today_practice_teacher as string;

  const getMenuItems = () => {
    switch (user?.role) {
      case 'admin':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: RiDashboard2Line },
            ]
          },
          {
            section: 'PROSPECTOS',
            items: [
              { id: 'students', label: 'Prospectos', icon: RiGroupLine },
              { id: 'enrolled-students', label: 'Participantes Inscritos', icon: RiGraduationCapLine },
            ]
          },
          {
            section: 'ACADÉMICO',
            items: [
              { id: 'class-templates', label: 'Plantillas de Clases', icon: RiBookOpenLine },
              { id: 'scheduled-classes', label: 'Grupos de Clase', icon: RiVideoLine },
              { id: 'scheduled-practices', label: 'Grupos de Práctica', icon: RiGroupLine },
              { id: 'class-requests', label: 'Solicitudes de Clases', icon: RiMessage3Line },
              { id: 'practice-requests', label: 'Solicitudes de Práctica', icon: RiFileListLine },
              { 
                id: 'practice-rotations', 
                label: 'Cronograma Maestro', 
                icon: RiCalendarCheckLine,
        
              },
            ]
          },
          {
            section: 'CONFIGURACIÓN',
            items: [
              { id: 'teachers', label: 'Asesores', icon: RiUserStarLine },
              //{ id: 'groups', label: 'Creación de grupos', icon: RiTeamLine },
              { id: 'academic-levels', label: 'Niveles Académicos', icon: RiGraduationCapLine },
              { id: 'payment-plans', label: 'Planes de Pago', icon: RiSecurePaymentLine },
              { id: 'document-types', label: 'Tipos de Documentos', icon: RiFileListLine },
              { id: 'users', label: 'Usuarios', icon: RiShieldUserLine },
              { id: 'settings', label: 'Configuraciones', icon: RiSettings4Line },
            ]
          },
          {
            section: 'FINANZAS',
            items: [

              { id: 'admin-payment-control', label: 'Gestión de Pagos', icon: RiSecurePaymentLine },
            ]
          },
          /* {
             section: 'REPORTES',
             items: [
               { id: 'analytics', label: 'Estadísticas', icon: RiPieChartLine },
               { id: 'settings', label: 'Configuración', icon: RiSettings4Line },
             ]
           },*/
        ];
      case 'teacher':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: RiHome5Line },
            ]
          },
          {
            section: 'ACADÉMICO',
            items: [
            //  { id: 'teacher-class-templates', label: 'Plantillas de Clases', icon: RiBookOpenLine },
              { id: 'teacher-my-classes', label: 'Mis Clases Teóricas', icon: RiVideoLine },
              { id: 'teacher-my-practices', label: 'Mis Sesiones Prácticas', icon: RiGroupLine },
              { id: 'teacher-my-students', label: 'Mis Participantes', icon: RiTeamLine },
              { 
                id: 'practice-rotations', 
                label: 'Mis días de práctica', 
                icon: RiCalendarCheckLine,
              },
            ]
          },
          {
            section: 'CONFIGURACIÓN',
            items: [
              { id: 'teacher-availability', label: 'Mi Disponibilidad', icon: RiSettings4Line },
            ]
          },
        ];
      case 'student':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: RiHome5Line },
            ]
          },
          {
            section: 'ACADÉMICO',
            items: [
              { id: 'my-classes', label: 'Mis Clases', icon: RiBookOpenLine },
            ]
          },
          // ✅ Solo mostrar secciones financieras si el aprendiz ha firmado el contrato
          ...(!hasUnsignedContract ? [{
            section: 'FINANZAS',
            items: [
              { id: 'payment-control', label: 'Control de Pagos', icon: RiSecurePaymentLine },
              { id: 'billing', label: 'Mi Facturación', icon: RiFileTextLine },
              { id: 'my-plan', label: 'Plan Escogido', icon: RiPieChartLine },
              { id: 'payment-methods', label: 'Métodos de Pago', icon: RiSecurePaymentLine },
            ]
          }] : []),
          /* {
             section: 'COMUNICACIÓN',
             items: [
               { id: 'forums', label: 'Foros', icon: RiMessage3Line },
             ]
           },*/
        ];
      case 'sales_advisor':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: RiHome5Line },
            ]
          },
          {
            section: 'VENTAS',
            items: [
              { id: 'students', label: 'Mis Prospectos', icon: RiTeamLine },
              { id: 'enrolled-students', label: 'Inscritos Verificados', icon: RiGraduationCapLine },
              { id: 'archived-students', label: 'Prospectos Archivados', icon: RiFileListLine },
            ]
          },
        ];
      case 'cashier':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: RiHome5Line },
            ]
          },
          {
            section: 'FINANZAS',
            items: [
              { id: 'students', label: 'Prospectos', icon: RiTeamLine },
              { id: 'cashier-payment-control', label: 'Control de Pagos', icon: RiSecurePaymentLine },
              //  { id: 'payment-reports', label: 'Reportes', icon: RiBarChartBoxLine },
            ]
          },
        ];
      case 'verifier':
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: RiDashboard2Line },
            ]
          },
          {
            section: 'PROSPECTOS',
            items: [
              { id: 'students', label: 'Prospectos', icon: RiGroupLine },
              { id: 'enrolled-students', label: 'Participantes Inscritos', icon: RiGraduationCapLine },
            ]
          },
          {
            section: 'FINANZAS',
            items: [

              { id: 'admin-payment-control', label: 'Gestión de Pagos', icon: RiSecurePaymentLine },
            ]
          },
        ];
      default:
        return [
          {
            section: 'GESTIÓN',
            items: [
              { id: 'dashboard', label: 'Panel Principal', icon: RiHome5Line },
            ]
          },
        ];
    }
  };

  return (
    <div className="bg-[#073372] w-64 border-r border-[#073372]/20 flex flex-col overflow-hidden shadow-xl">
      {/* Logo en el Sidebar */}
      <div className="p-6 border-b border-white/10">
        <img
          src="/logo-white.png"
          alt="UNCED Logo"
          className="h-12 w-auto mx-auto"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 sidebar-scroll">
        <nav className="space-y-6">
          {getMenuItems().map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-1.5">
              {/* Título de la sección */}
              <h3 className="px-4 text-xs font-semibold text-white/60 uppercase tracking-wider">
                {section.section}
              </h3>

              {/* Items de la sección */}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentActiveView === item.id;
                const isContractPage = currentUrl.startsWith('/contract/accept/');

                return (
                  <button
                    key={item.id}
                    onClick={() => !isContractPage && handleNavigation(item.id)}
                    disabled={isContractPage}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                        ? 'bg-[#17BC91] text-white shadow-lg shadow-[#17BC91]/25'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                      } ${isContractPage ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-white/80' : ''}`}
                  >
                    <Icon className={`mr-3 h-5 w-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                      }`} />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/90 border border-white/5 font-bold uppercase truncate max-w-[80px]">
                        {item.badge}
                      </span>
                    )}
                    {isContractPage && (
                      <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded text-white/80">
                        Bloqueado
                      </span>
                    )}
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