import React from 'react';
import { 
  Users, TrendingUp, Clock, Award, UserCheck
} from 'lucide-react';
import { Admin } from '@/types/models';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Colores institucionales UNCED según manual de marca
const COLORS = {
  catalina: '#073372',    // Catalina Blue (Pantone 294 C)
  pradera: '#17BC91',     // Pradera de montaña (Pantone 3395 C)
  beer: '#F98613',        // Beer Orange (Hexachrome Orange C)
};

interface DailyData {
  date: string;
  prospectos: number;
  verificados: number;
}

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

interface TopAdvisor {
  name: string;
  total: number;
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  activeTeachers: number;
  totalGroups: number;
  activeGroups: number;
  totalProspects: number;
  registrados: number;
  propuestasEnviadas: number;
  pagosPorVerificar: number;
  matriculados: number;
  verificados: number;
  prospectosHoy: number;
  verificadosHoy: number;
  enProceso: number;
  totalUsers: number;
  admins: number;
  salesAdvisors: number;
  cashiers: number;
  verifiers: number;
}

interface AdminDashboardProps {
  admin: Admin;
  stats: Stats;
  dailyStudents: DailyData[];
  prospectDistribution: DistributionData[];
  topSalesAdvisors: TopAdvisor[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  admin, 
  stats, 
  dailyStudents, 
  prospectDistribution, 
  topSalesAdvisors 
}) => {
  // KPI Cards - Colores institucionales UNCED
  const kpiCards = [
    { 
      label: 'Prospectos Hoy', 
      value: stats.prospectosHoy, 
      icon: Users, 
      color: COLORS.catalina,
      description: 'Nuevos registros del día'
    },
    { 
      label: 'Verificados Hoy', 
      value: stats.verificadosHoy, 
      icon: UserCheck, 
      color: COLORS.pradera,
      description: 'Matriculados y verificados'
    },
    { 
      label: 'En Proceso', 
      value: stats.enProceso, 
      icon: Clock, 
      color: COLORS.beer,
      description: 'Propuesta enviada o por verificar',
      percentage: Math.round((stats.enProceso / stats.totalProspects) * 100)
    },
    { 
      label: 'Total Verificados', 
      value: stats.verificados, 
      icon: Award, 
      color: COLORS.pradera,
      description: 'Matriculados y verificados total',
      percentage: Math.round((stats.verificados / stats.totalProspects) * 100)
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto bg-gray-50">
      {/* Header Minimalista */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Panel de Administración</h1>
            <p className="text-gray-500">Bienvenido, <span className="font-semibold text-gray-700">{admin.name}</span></p>
          </div>
        </div>
      </div>

      {/* KPI Cards - Data-Centric Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Prospectos - KPI Destacado */}
        <div 
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
          style={{ backgroundColor: `${COLORS.catalina}05` }}
        >
          <div className="flex items-start justify-between mb-3">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${COLORS.catalina}15` }}
            >
              <Users className="h-7 w-7" style={{ color: COLORS.catalina }} />
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-5xl font-black text-gray-900">{stats.totalProspects}</p>
            <p className="text-sm font-bold text-gray-700 mt-2">Total Prospectos</p>
            <p className="text-xs text-gray-500">Acumulado general</p>
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
                {card.percentage && (
                  <div 
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: card.color, color: 'white' }}
                  >
                    {card.percentage}%
                  </div>
                )}
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

      {/* Gráfica de Área - Tendencia (Últimos 30 días) */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Tendencia de Estudiantes
              </h2>
              <p className="text-sm text-gray-500 mt-1">Últimos 30 días - Prospectos vs Verificados</p>
            </div>
            <TrendingUp className="h-6 w-6" style={{ color: COLORS.catalina }} />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={420}>
          <AreaChart data={dailyStudents} margin={{ top: 10, right: 30, left: 0, bottom: 70 }}>
            <defs>
              <linearGradient id="colorProspectos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.catalina} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.catalina} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorVerificados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.pradera} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.pradera} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#9ca3af"
              style={{ fontSize: '11px', fontWeight: 500 }}
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis 
              stroke="#9ca3af" 
              style={{ fontSize: '12px', fontWeight: 600 }}
              tick={{ fill: '#374151' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                padding: '16px'
              }}
              labelStyle={{ fontWeight: 700, color: '#111827', marginBottom: '8px', fontSize: '13px' }}
              itemStyle={{ fontWeight: 600, fontSize: '14px' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '24px', fontSize: '14px', fontWeight: 600 }}
              iconType="rect"
            />
            <Area 
              type="monotone" 
              dataKey="prospectos" 
              stroke={COLORS.catalina}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorProspectos)"
              name="Prospectos Registrados"
              dot={{ fill: COLORS.catalina, r: 5, strokeWidth: 2, stroke: 'white' }}
              activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
            />
            <Area 
              type="monotone" 
              dataKey="verificados" 
              stroke={COLORS.pradera}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorVerificados)"
              name="Matriculados Verificados"
              dot={{ fill: COLORS.pradera, r: 5, strokeWidth: 2, stroke: 'white' }}
              activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Resumen de totales */}
        <div className="mt-8 grid grid-cols-2 gap-6">
          <div className="rounded-xl p-5 shadow-md" style={{ backgroundColor: `${COLORS.catalina}08` }}>
            <p className="text-xs font-bold text-gray-600 mb-2">TOTAL PROSPECTOS (30 DÍAS)</p>
            <p className="text-4xl font-black" style={{ color: COLORS.catalina }}>
              {dailyStudents.reduce((sum, day) => sum + day.prospectos, 0)}
            </p>
          </div>
          <div className="rounded-xl p-5 shadow-md" style={{ backgroundColor: `${COLORS.pradera}08` }}>
            <p className="text-xs font-bold text-gray-600 mb-2">TOTAL VERIFICADOS (30 DÍAS)</p>
            <p className="text-4xl font-black" style={{ color: COLORS.pradera }}>
              {dailyStudents.reduce((sum, day) => sum + day.verificados, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top 5 Asesores - Gráfica de barras horizontal */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Top 5 Asesores
                </h2>
                <p className="text-sm text-gray-500 mt-1">Por estudiantes verificados (comisión)</p>
              </div>
              <Award className="h-6 w-6" style={{ color: COLORS.pradera }} />
            </div>
          </div>

          {topSalesAdvisors.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topSalesAdvisors} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis 
                  type="number"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px', fontWeight: 600 }}
                  tick={{ fill: '#374151' }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  width={160}
                  stroke="#6b7280"
                  style={{ fontSize: '14px', fontWeight: 700 }}
                  tick={{ fill: '#111827' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    padding: '16px'
                  }}
                  cursor={{ fill: 'rgba(7, 51, 114, 0.03)' }}
                  labelStyle={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}
                  itemStyle={{ fontWeight: 700 }}
                />
                <Bar 
                  dataKey="total"
                  radius={[0, 8, 8, 0]}
                  barSize={36}
                  name="Verificados"
                >
                  {topSalesAdvisors.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? COLORS.pradera : COLORS.catalina}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center">
              <p className="text-gray-400 text-center text-sm">No hay datos disponibles</p>
            </div>
          )}
        </div>

        {/* Distribución de Prospectos - Gráfica de barras horizontal */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Distribución de Prospectos
              </h2>
              <p className="text-sm text-gray-500">Pipeline de ventas actual</p>
            </div>
          </div>
          
          {prospectDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={prospectDistribution} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis 
                  type="number"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px', fontWeight: 600 }}
                  tick={{ fill: '#374151' }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  width={160}
                  stroke="#6b7280"
                  style={{ fontSize: '14px', fontWeight: 700 }}
                  tick={{ fill: '#111827' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    padding: '16px'
                  }}
                  cursor={{ fill: 'rgba(7, 51, 114, 0.03)' }}
                  labelStyle={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}
                  itemStyle={{ fontWeight: 700 }}
                  formatter={(value: number) => {
                    const percentage = Math.round((value / stats.totalProspects) * 100);
                    return `${value} (${percentage}%)`;
                  }}
                />
                <Bar 
                  dataKey="value"
                  radius={[0, 8, 8, 0]}
                  barSize={36}
                  name="Prospectos"
                >
                  {prospectDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center">
              <p className="text-gray-400 text-center text-sm">No hay datos disponibles</p>
            </div>
          )}

          {/* Total general */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-600 uppercase tracking-wide">Total Prospectos</span>
              <span className="text-3xl font-black text-gray-900">
                {stats.totalProspects}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;