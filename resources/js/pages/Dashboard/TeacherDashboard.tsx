import React from 'react';
import { 
  Users, BookOpen, Video, MessageSquare, 
  FileText, Calendar, Clock, Star, CheckCircle, AlertCircle
} from 'lucide-react';
import { Teacher } from '../../types';

interface TeacherDashboardProps {
  teacher: Teacher;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacher }) => {
  const upcomingClasses = [
    { id: '1', title: 'Gramática Avanzada', group: 'Grupo A', time: '09:00 AM', students: 12 },
    { id: '2', title: 'Práctica de Conversación', group: 'Grupo B', time: '11:00 AM', students: 8 },
  ];

  const upcomingWorkshops = [
    { id: '1', title: 'Presentación de Inglés de Negocios', date: 'Hoy', time: '3:00 PM', participants: 6 },
    { id: '2', title: 'Preparación IELTS', date: 'Mañana', time: '10:00 AM', participants: 8 },
  ];

  const pendingEvaluations = [
    { id: '1', student: 'Juan Pérez', assignment: 'Redacción de Ensayo', submitted: 'hace 2 días' },
    { id: '2', student: 'María García', assignment: 'Examen Oral', submitted: 'hace 1 día' },
    { id: '3', student: 'Ahmed Hassan', assignment: 'Quiz de Gramática', submitted: 'hace 3 horas' },
  ];

  const stats = [
    { label: 'Estudiantes Activos', value: '24', icon: Users, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
    { label: 'Clases Esta Semana', value: '12', icon: BookOpen, color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Evaluaciones Pendientes', value: '8', icon: FileText, color: 'orange', gradient: 'from-orange-500 to-orange-600' },
    { label: 'Talleres Programados', value: '3', icon: Video, color: 'violet', gradient: 'from-violet-500 to-violet-600' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">¡Bienvenido, <span className="text-emerald-600">{teacher.name}</span>!</h1>
          <p className="text-slate-600 mt-1 font-medium">Especialización: {teacher.specialization === 'theoretical' ? 'Teórico' : teacher.specialization === 'practical' ? 'Práctico' : 'Ambos'}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white px-6 py-4 rounded-2xl shadow-lg shadow-emerald-600/25">
          <div className="text-center">
            <div className="text-3xl font-bold">{teacher.assignedGroups.length}</div>
            <div className="text-sm opacity-90 font-medium">Grupos Activos</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`p-3.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Clases de Hoy</h2>
            <Calendar className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {upcomingClasses.map((cls) => (
              <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{cls.title}</p>
                  <p className="text-sm text-gray-600">{cls.group} • {cls.students} estudiantes</p>
                  <p className="text-sm text-blue-600 font-medium">{cls.time}</p>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Iniciar Clase
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Próximos Talleres</h2>
            <Video className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {upcomingWorkshops.map((workshop) => (
              <div key={workshop.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{workshop.title}</p>
                  <p className="text-sm text-gray-600">{workshop.date} a las {workshop.time}</p>
                  <p className="text-sm text-green-600">{workshop.participants}/8 participantes</p>
                </div>
                <button className="text-green-600 hover:text-green-700 font-medium text-sm">
                  Gestionar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Evaluaciones Pendientes</h2>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <span className="text-sm text-orange-600 font-semibold bg-orange-50 px-3 py-1 rounded-lg">{pendingEvaluations.length} pendientes</span>
          </div>
        </div>
        <div className="space-y-3">
          {pendingEvaluations.map((evaluation) => (
            <div key={evaluation.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {evaluation.student.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{evaluation.student}</p>
                  <p className="text-sm text-gray-600">{evaluation.assignment}</p>
                  <p className="text-xs text-gray-500">Enviado {evaluation.submitted}</p>
                </div>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Revisar
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-emerald-50 rounded-2xl p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-blue-50 rounded-xl mb-3 group-hover:bg-blue-100 transition-colors">
              <BookOpen className="h-7 w-7 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Subir Clase</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-emerald-50 rounded-xl mb-3 group-hover:bg-emerald-100 transition-colors">
              <Video className="h-7 w-7 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Programar Taller</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-violet-50 rounded-xl mb-3 group-hover:bg-violet-100 transition-colors">
              <FileText className="h-7 w-7 text-violet-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Crear Evaluación</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-orange-50 rounded-xl mb-3 group-hover:bg-orange-100 transition-colors">
              <MessageSquare className="h-7 w-7 text-orange-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Foro</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;