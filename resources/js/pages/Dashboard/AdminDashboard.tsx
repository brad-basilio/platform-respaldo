import React from 'react';
import { 
  Users, GraduationCap, DollarSign, BookOpen, 
  TrendingUp, Activity, UserCheck, AlertTriangle,
  PieChart, BarChart3, Calendar, Star, CheckCircle
} from 'lucide-react';
import { Admin } from '../../types';

interface AdminDashboardProps {
  admin: Admin;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin }) => {
  const stats = [
    { label: 'Estudiantes Activos', value: '3', change: '+1', icon: Users, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
    { label: 'Profesores Activos', value: '3', change: '+1', icon: UserCheck, color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Total de Grupos', value: '3', change: '+1', icon: BookOpen, color: 'violet', gradient: 'from-violet-500 to-violet-600' },
    { label: 'Ocupación Promedio', value: '42%', change: '+5%', icon: BarChart3, color: 'amber', gradient: 'from-amber-500 to-amber-600' },
  ];

  const recentActivities = [
    { id: '1', action: 'Estudiante inscrito en grupo', student: 'Juan Pérez', group: 'Teórico Básico A', time: 'hace 2 horas', type: 'enrollment' },
    { id: '2', action: 'Nuevo grupo creado', group: 'Práctico Intermedio B', teacher: 'Mike Wilson', time: 'hace 3 horas', type: 'group_created' },
    { id: '3', action: 'Profesor asignado a grupo', teacher: 'Sarah Johnson', group: 'Teórico Básico A', time: 'hace 5 horas', type: 'assignment' },
    { id: '4', action: 'Estado de estudiante actualizado', student: 'Ahmed Hassan', status: 'Activo', time: 'hace 1 día', type: 'status_update' },
  ];

  const groupDistribution = [
    { type: 'Teórico', groups: 2, students: 1, percentage: 67 },
    { type: 'Práctico', groups: 1, students: 1, percentage: 33 },
  ];

  const upcomingTasks = [
    { id: '1', task: 'Asignar profesor al Grupo Avanzado C', priority: 'high', due: 'Hoy' },
    { id: '2', task: 'Revisar solicitudes de inscripción', priority: 'medium', due: 'Mañana' },
    { id: '3', task: 'Actualizar horarios de grupos para el próximo mes', priority: 'low', due: 'Esta semana' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Administración</h1>
          <p className="text-slate-600 mt-1">Bienvenido de nuevo, <span className="font-semibold">{admin.name}</span></p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white px-6 py-4 rounded-2xl shadow-lg shadow-amber-500/25">
          <div className="text-center">
            <div className="text-3xl font-bold">1</div>
            <div className="text-sm opacity-90 font-medium">Sin Asignar</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-emerald-600 text-sm font-semibold bg-emerald-50 px-3 py-1 rounded-lg">{stat.change}</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Distribución de Grupos</h2>
            <PieChart className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {groupDistribution.map((item, index) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    index === 0 ? 'bg-blue-500' : 'bg-purple-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-900">{item.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{item.groups} grupos, {item.students} estudiantes</span>
                  <span className="text-sm font-semibold text-gray-900">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Tareas Pendientes</h2>
            <Calendar className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' :
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.task}</p>
                    <p className="text-xs text-gray-600">Vence: {task.due}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {task.priority === 'high' ? 'alta' : task.priority === 'medium' ? 'media' : 'baja'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Actividades Recientes</h2>
          <Activity className="h-5 w-5 text-slate-400" />
        </div>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activity.type === 'enrollment' ? 'bg-blue-100 text-blue-600' :
                activity.type === 'group_created' ? 'bg-green-100 text-green-600' :
                activity.type === 'assignment' ? 'bg-purple-100 text-purple-600' :
                'bg-orange-100 text-orange-600'
              }`}>
                {activity.type === 'enrollment' && <Users className="h-5 w-5" />}
                {activity.type === 'group_created' && <BookOpen className="h-5 w-5" />}
                {activity.type === 'assignment' && <UserCheck className="h-5 w-5" />}
                {activity.type === 'status_update' && <CheckCircle className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">
                  {activity.student && `Estudiante: ${activity.student}`}
                  {activity.teacher && `Profesor: ${activity.teacher}`}
                  {activity.group && ` - ${activity.group}`}
                  {activity.status && ` - ${activity.status}`}
                </p>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-blue-50 rounded-xl mb-3 group-hover:bg-blue-100 transition-colors">
              <Users className="h-7 w-7 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Estudiantes</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-emerald-50 rounded-xl mb-3 group-hover:bg-emerald-100 transition-colors">
              <UserCheck className="h-7 w-7 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Profesores</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-violet-50 rounded-xl mb-3 group-hover:bg-violet-100 transition-colors">
              <BookOpen className="h-7 w-7 text-violet-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Grupos</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-amber-50 rounded-xl mb-3 group-hover:bg-amber-100 transition-colors">
              <BarChart3 className="h-7 w-7 text-amber-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Estadísticas</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;