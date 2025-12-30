import React from 'react';
import { Link } from '@inertiajs/react';
import { 
  Users, BookOpen, Calendar, Clock, 
  CheckCircle, Play, Film, ChevronRight,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Colores institucionales UNCED según manual de marca
const COLORS = {
  catalina: '#073372',    // Catalina Blue (Pantone 294 C)
  pradera: '#17BC91',     // Pradera de montaña (Pantone 3395 C)
  beer: '#F98613',        // Beer Orange (Hexachrome Orange C)
};

interface Teacher {
  id: number;
  name: string;
  email: string;
  specialization?: string;
  assignedGroups: Array<{
    groupId: number;
    groupName: string;
    type: string;
    schedule: string;
  }>;
}

interface ScheduledClassItem {
  id: number;
  title: string;
  session_number: string;
  level: string;
  level_color: string;
  time?: string;
  date?: string;
  students: number;
  status?: string;
  meet_url?: string;
  total_students?: number;
  attended_students?: number;
  has_recording?: boolean;
}

interface Stats {
  totalClasses: number;
  scheduledClasses: number;
  inProgressClasses: number;
  completedClasses: number;
  totalStudents: number;
  todayClasses: number;
  pendingEvaluations: number;
}

interface TeacherDashboardProps {
  teacher: Teacher;
  stats?: Stats;
  todayClasses?: ScheduledClassItem[];
  upcomingClasses?: ScheduledClassItem[];
  recentClasses?: ScheduledClassItem[];
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  teacher, 
  stats = {
    totalClasses: 0,
    scheduledClasses: 0,
    inProgressClasses: 0,
    completedClasses: 0,
    totalStudents: 0,
    todayClasses: 0,
    pendingEvaluations: 0,
  },
  todayClasses = [],
  upcomingClasses = [],
  recentClasses = [],
}) => {
  // KPI Cards - Colores institucionales UNCED
  const kpiCards = [
    { 
      label: 'Estudiantes Activos', 
      value: stats.totalStudents, 
      icon: Users, 
      color: COLORS.catalina,
      description: 'Total de participantes'
    },
    { 
      label: 'Clases Programadas', 
      value: stats.scheduledClasses, 
      icon: Calendar, 
      color: COLORS.beer,
      description: 'Pendientes de impartir'
    },
    { 
      label: 'Clases Completadas', 
      value: stats.completedClasses, 
      icon: CheckCircle, 
      color: COLORS.pradera,
      description: 'Finalizadas exitosamente'
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto bg-gray-50">
      {/* Header Minimalista */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Panel del Profesor</h1>
            <p className="text-gray-500">
              Bienvenido, <span className="font-semibold text-gray-700">{teacher.name}</span>
              {teacher.specialization && (
                <span className="text-gray-400"> • {teacher.specialization === 'theoretical' ? 'Teórico' : teacher.specialization === 'practical' ? 'Práctico' : 'Ambos'}</span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/teacher/my-classes">
              <Button 
                className="text-white shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: COLORS.catalina }}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Ver Mis Clases
              </Button>
            </Link>
            <Link href="/teacher/my-students">
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                <Users className="w-4 h-4 mr-2" />
                Mis Participantes
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards - Data-Centric Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Clases Hoy - KPI Destacado */}
        <div 
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
          style={{ backgroundColor: `${COLORS.beer}05` }}
        >
          <div className="flex items-start justify-between mb-3">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${COLORS.beer}15` }}
            >
              <Zap className="h-7 w-7" style={{ color: COLORS.beer }} />
            </div>
            {stats.todayClasses > 0 && (
              <div 
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white animate-pulse"
                style={{ backgroundColor: COLORS.beer }}
              >
                HOY
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <p className="text-5xl font-black text-gray-900">{stats.todayClasses}</p>
            <p className="text-sm font-bold text-gray-700 mt-2">Clases Hoy</p>
            <p className="text-xs text-gray-500">Sesiones del día</p>
          </div>
        </div>

        {/* Resto de KPIs */}
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.label} 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
              style={{ backgroundColor: `${card.color}03` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  <Icon className="h-6 w-6" style={{ color: card.color }} />
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-5xl font-black text-gray-900">{card.value}</p>
                <p className="text-sm font-bold text-gray-700 mt-2">{card.label}</p>
                <p className="text-xs text-gray-500">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Classes - Destacado */}
      {todayClasses.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${COLORS.pradera}15` }}
                >
                  <Zap className="h-6 w-6" style={{ color: COLORS.pradera }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Clases de Hoy</h2>
                  <p className="text-sm text-gray-500 mt-1">{todayClasses.length} sesión(es) programada(s) para hoy</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {todayClasses.map((cls) => (
              <div 
                key={cls.id}
                className="flex items-center justify-between p-5 rounded-xl border border-gray-200 hover:shadow-md transition-all"
                style={{ backgroundColor: `${cls.level_color}05` }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md"
                    style={{ backgroundColor: cls.level_color }}
                  >
                    {cls.session_number}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{cls.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" style={{ color: COLORS.catalina }} />
                        {cls.time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" style={{ color: COLORS.catalina }} />
                        {cls.students} estudiantes
                      </span>
                      <Badge 
                        variant="outline" 
                        className="font-semibold"
                        style={{ borderColor: cls.level_color, color: cls.level_color }}
                      >
                        {cls.level}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {cls.status === 'in_progress' ? (
                    <Badge 
                      className="text-white font-bold px-3 py-1"
                      style={{ backgroundColor: COLORS.beer }}
                    >
                      En Curso
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-semibold" style={{ borderColor: COLORS.catalina, color: COLORS.catalina }}>
                      Programada
                    </Badge>
                  )}
                  <Link href={`/teacher/my-classes/${cls.id}`}>
                    <Button 
                      className="text-white font-bold shadow-md hover:shadow-lg transition-all"
                      style={{ backgroundColor: COLORS.pradera }}
                    >
                      {cls.status === 'in_progress' ? (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Continuar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar
                        </>
                      )}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Próximas y Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Classes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${COLORS.catalina}15` }}
                >
                  <Calendar className="h-6 w-6" style={{ color: COLORS.catalina }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Próximas Clases</h2>
                  <p className="text-sm text-gray-500 mt-1">Sesiones programadas</p>
                </div>
              </div>
              <Link href="/teacher/my-classes?status=scheduled">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Ver todas <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {upcomingClasses.length === 0 ? (
            <div className="text-center py-12">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${COLORS.catalina}10` }}
              >
                <Calendar className="w-8 h-8" style={{ color: COLORS.catalina, opacity: 0.5 }} />
              </div>
              <p className="text-gray-500 font-medium">No hay clases programadas próximamente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingClasses.map((cls) => (
                <Link 
                  key={cls.id} 
                  href={`/teacher/my-classes/${cls.id}`}
                  className="flex items-center justify-between p-4 rounded-xl hover:shadow-md transition-all border border-gray-100"
                  style={{ backgroundColor: `${cls.level_color}05` }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
                      style={{ backgroundColor: cls.level_color }}
                    >
                      {cls.session_number}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{cls.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cls.date} • {cls.time} • {cls.students} estudiantes
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Classes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${COLORS.pradera}15` }}
                >
                  <CheckCircle className="h-6 w-6" style={{ color: COLORS.pradera }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Clases Recientes</h2>
                  <p className="text-sm text-gray-500 mt-1">Historial de sesiones</p>
                </div>
              </div>
              <Link href="/teacher/my-classes?status=completed">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Ver todas <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {recentClasses.length === 0 ? (
            <div className="text-center py-12">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${COLORS.pradera}10` }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: COLORS.pradera, opacity: 0.5 }} />
              </div>
              <p className="text-gray-500 font-medium">No hay clases completadas aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentClasses.map((cls) => (
                <Link 
                  key={cls.id} 
                  href={`/teacher/my-classes/${cls.id}`}
                  className="flex items-center justify-between p-4 rounded-xl hover:shadow-md transition-all border border-gray-100"
                  style={{ backgroundColor: `${cls.level_color}05` }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
                      style={{ backgroundColor: cls.level_color }}
                    >
                      {cls.session_number}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{cls.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span>{cls.date}</span>
                        <span>•</span>
                        <span>{cls.attended_students}/{cls.total_students} asistieron</span>
                        {cls.has_recording && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1" style={{ color: COLORS.beer }}>
                              <Film className="w-3 h-3" />
                              Grabación
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
