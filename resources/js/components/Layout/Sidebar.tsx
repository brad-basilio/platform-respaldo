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
  RiFileListLine
} from 'react-icons/ri';
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
    if (currentUrl.startsWith('/student/payment-control')) return 'payment-control';
    if (currentUrl.startsWith('/admin/payment-control')) return 'admin-payment-control';
    if (currentUrl.startsWith('/cashier/payment-control')) return 'cashier-payment-control';
    if (currentUrl.startsWith('/cashier/payment-reports')) return 'payment-reports';
    if (currentUrl.startsWith('/admin/settings')) return 'settings';
    if (currentUrl.startsWith('/settings')) return 'settings';
    if (currentUrl.startsWith('/dashboard')) return 'dashboard';
    if (currentUrl.startsWith('/admin/users')) return 'users';
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
      'admin-payment-control': '/admin/payment-control',
      'cashier-payment-control': '/cashier/payment-control',
      'payment-reports': '/cashier/payment-reports',
      'analytics': '/admin/analytics',
      'settings': '/admin/settings',
      'users': '/admin/users',
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
              { id: 'classes', label: 'Clases', icon: RiBookOpenLine },
              { id: 'workshops', label: 'Talleres', icon: RiVideoLine },
              { id: 'evaluations', label: 'Evaluaciones', icon: RiFileTextLine },
              { id: 'students', label: 'Mis Participantes', icon: RiTeamLine },
            ]
          },
          {
            section: 'COMUNICACIÓN',
            items: [
              { id: 'forums', label: 'Foros', icon: RiMessage3Line },
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
          /*      {
                  section: 'ACADÉMICO',
                  items: [
                //    { id: 'classes', label: 'Clases', icon: RiBookOpenLine },
                 //   { id: 'workshops', label: 'Talleres', icon: RiVideoLine },
                  //  { id: 'exams', label: 'Exámenes', icon: RiFileTextLine },
                   // { id: 'progress', label: 'Progreso', icon: RiBarChartBoxLine },
                   // { id: 'certificates', label: 'Certificados', icon: RiAwardLine },
                  ]
                },*/
          // ✅ Solo mostrar "Control de Pagos" si el estudiante ha firmado el contrato
          ...(!hasUnsignedContract ? [{
            section: 'FINANZAS',
            items: [
              { id: 'payment-control', label: 'Control de Pagos', icon: RiSecurePaymentLine },
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