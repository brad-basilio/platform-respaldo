import React from 'react';
import { 
  BookOpen, Video, MessageSquare, FileText, 
  BarChart3, Award, Clock, Star, Trophy, Target
} from 'lucide-react';
import { Student } from '../../types';

interface StudentDashboardProps {
  student: Student;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ student }) => {
  const upcomingClasses = [
    { id: '1', title: 'Gramática Esencial', time: '10:00 AM', date: 'Hoy' },
    { id: '2', title: 'Práctica de Conversación', time: '2:00 PM', date: 'Mañana' },
  ];

  const recentWorkshops = [
    { id: '1', title: 'Inglés de Negocios', participants: 6, status: 'upcoming' },
    { id: '2', title: 'Taller de Pronunciación', participants: 8, status: 'completed' },
  ];

  const stats = [
    { label: 'Clases Completadas', value: '12/20', icon: BookOpen, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
    { label: 'Talleres Asistidos', value: '3', icon: Video, color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Puntos Actuales', value: student.points.toLocaleString(), icon: Star, color: 'amber', gradient: 'from-amber-500 to-amber-600' },
    { label: 'Progreso', value: '60%', icon: Target, color: 'violet', gradient: 'from-violet-500 to-violet-600' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">¡Bienvenido, <span className="text-blue-600">{student.name}</span>!</h1>
          <p className="text-slate-600 mt-1 font-medium">Nivel: {student.level === 'basic' ? 'Básico' : student.level === 'intermediate' ? 'Intermedio' : 'Avanzado'}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-4 rounded-2xl shadow-lg shadow-blue-600/25">
          <div className="text-center">
            <div className="text-3xl font-bold">{student.points}</div>
            <div className="text-sm opacity-90 font-medium">Puntos</div>
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
            <h2 className="text-xl font-bold text-slate-900">Próximas Clases</h2>
            <Clock className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {upcomingClasses.map((cls) => (
              <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{cls.title}</p>
                  <p className="text-sm text-gray-600">{cls.date} at {cls.time}</p>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Unirse
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Talleres</h2>
            <Video className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {recentWorkshops.map((workshop) => (
              <div key={workshop.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{workshop.title}</p>
                  <p className="text-sm text-gray-600">{workshop.participants}/8 participantes</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  workshop.status === 'upcoming' 
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {workshop.status === 'upcoming' ? 'próximo' : 'completado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Logros Recientes</h2>
          <Trophy className="h-5 w-5 text-slate-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {student.badges.map((badge) => (
            <div key={badge.id} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="text-2xl">{badge.icon}</div>
              <div>
                <p className="font-medium text-gray-900">{badge.name}</p>
                <p className="text-sm text-gray-600">{badge.description}</p>
                <p className="text-xs text-orange-600 font-medium">+{badge.points} puntos</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-blue-50 rounded-xl mb-3 group-hover:bg-blue-100 transition-colors">
              <BookOpen className="h-7 w-7 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Iniciar Clase</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-emerald-50 rounded-xl mb-3 group-hover:bg-emerald-100 transition-colors">
              <FileText className="h-7 w-7 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Tomar Examen</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-violet-50 rounded-xl mb-3 group-hover:bg-violet-100 transition-colors">
              <MessageSquare className="h-7 w-7 text-violet-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Visitar Foro</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 group">
            <div className="p-3 bg-orange-50 rounded-xl mb-3 group-hover:bg-orange-100 transition-colors">
              <Award className="h-7 w-7 text-orange-600" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Ver Certificados</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;