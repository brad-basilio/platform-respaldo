import React from 'react';
import { 
  Users, TrendingUp, Clock, Award, UserCheck, ShieldCheck
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

interface TopVerifier {
  name: string;
  total: number;
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalProspects: number;
  registrados: number;
  propuestasEnviadas: number;
  pagosPorVerificar: number;
  matriculados: number;
  verificados: number; // Esta es la métrica clave - verificados por MÍ
  prospectosHoy: number;
  verificadosHoy: number; // Verificados hoy por MÍ
  enProceso: number;
  totalUsers: number;
  admins: number;
  salesAdvisors: number;
  cashiers: number;
  verifiers: number;
}

interface VerifierDashboardProps {
  admin: Admin; // Reutilizamos el tipo Admin para el verifier
  stats: Stats;
  dailyStudents: DailyData[];
  prospectDistribution: DistributionData[];
  topSalesAdvisors: TopVerifier[]; // Reutilizamos el slot para top verificadores
}

const VerifierDashboard: React.FC<VerifierDashboardProps> = ({ 
  admin: verifier, 
  stats, 
  dailyStudents, 
  prospectDistribution, 
  topSalesAdvisors: topVerifiers 
}) => {
  // KPI Cards - Métricas clave para verificadores
  const kpiCards = [
    { 
      label: 'Verificados por Mí', 
      value: stats.verificados, 
      icon: ShieldCheck, 
      color: COLORS.pradera,
      description: 'Total de matrículas verificadas'
    },
    { 
      label: 'Verificados Hoy', 
      value: stats.verificadosHoy, 
      icon: UserCheck, 
      color: COLORS.catalina,
      description: 'Verificaciones realizadas hoy'
    },
    { 
      label: 'Por Verificar', 
      value: stats.pagosPorVerificar, 
      icon: Clock, 
      color: COLORS.beer,
      description: 'Pagos pendientes de verificación'
    },
    { 
      label: 'Total Prospectos', 
      value: stats.totalProspects, 
      icon: Users, 
      color: COLORS.catalina,
      description: 'Todos los prospectos del sistema'
    },
    { 
      label: 'Total Matriculados', 
      value: stats.matriculados, 
      icon: Award, 
      color: COLORS.pradera,
      description: 'Aprendices matriculados',
      percentage: stats.totalProspects > 0 
        ? Math.round((stats.matriculados / stats.totalProspects) * 100) 
        : 0
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Panel de Verificador</h1>
            <p className="text-gray-500">
              Bienvenido, <span className="font-semibold text-gray-700">{verifier.name}</span>
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 px-6 py-3 rounded-xl border border-green-200">
            <div className="text-xs text-green-600 font-bold mb-1">MI RENDIMIENTO</div>
            <div className="text-3xl font-black" style={{ color: COLORS.pradera }}>
              {stats.verificados}
            </div>
            <div className="text-xs text-green-600 font-medium">verificaciones totales</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                {card.percentage !== undefined && card.percentage > 0 && (
                  <div 
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ 
                      backgroundColor: `${card.color}15`,
                      color: card.color 
                    }}
                  >
                    {card.percentage}%
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-3xl font-black text-gray-900">{card.value}</p>
                <p className="text-sm font-bold text-gray-700">{card.label}</p>
                <p className="text-xs text-gray-500">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Tendencia - Prospectos vs Verificados por mí */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tendencia de Verificaciones
            </h2>
            <p className="text-sm text-gray-500">Últimos 30 días - Prospectos generales vs mis verificaciones</p>
          </div>
          
          <ResponsiveContainer width="100%" height={420}>
            <AreaChart data={dailyStudents} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
                tick={{ fill: '#374151' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
                tick={{ fill: '#374151' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '12px',
                  fontWeight: 600
                }}
                labelStyle={{ fontWeight: 700, marginBottom: '8px', color: '#111827' }}
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
                name="Prospectos Totales"
                dot={{ fill: COLORS.catalina, r: 4, strokeWidth: 2, stroke: 'white' }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
              />
              <Area 
                type="monotone" 
                dataKey="verificados" 
                stroke={COLORS.pradera}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorVerificados)"
                name="Verificados por Mí"
                dot={{ fill: COLORS.pradera, r: 4, strokeWidth: 2, stroke: 'white' }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Resumen de totales */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="rounded-xl p-5 shadow-md" style={{ backgroundColor: `${COLORS.catalina}08` }}>
              <p className="text-xs font-bold text-gray-600 mb-2">TOTAL PROSPECTOS (30 DÍAS)</p>
              <p className="text-4xl font-black" style={{ color: COLORS.catalina }}>
                {dailyStudents.reduce((sum, day) => sum + day.prospectos, 0)}
              </p>
            </div>
            <div className="rounded-xl p-5 shadow-md" style={{ backgroundColor: `${COLORS.pradera}08` }}>
              <p className="text-xs font-bold text-gray-600 mb-2">MIS VERIFICACIONES (30 DÍAS)</p>
              <p className="text-4xl font-black" style={{ color: COLORS.pradera }}>
                {dailyStudents.reduce((sum, day) => sum + day.verificados, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico de Distribución de Prospectos */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Distribución de Estados
              </h2>
              <p className="text-sm text-gray-500">Pipeline de prospectos general</p>
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
                  width={180}
                  stroke="#6b7280"
                  style={{ fontSize: '14px', fontWeight: 700 }}
                  tick={{ fill: '#111827' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    padding: '12px',
                    fontWeight: 600
                  }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[0, 8, 8, 0]}
                  label={{ 
                    position: 'right', 
                    style: { fontSize: '14px', fontWeight: 700, fill: '#111827' } 
                  }}
                >
                  {prospectDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-gray-400 text-sm">
              No hay datos de distribución disponibles
            </div>
          )}

          {/* Total general */}
          <div className="mt-8">
            <div className="rounded-xl p-5 shadow-md bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
              <p className="text-xs font-bold text-gray-600 mb-2">TOTAL GENERAL</p>
              <p className="text-4xl font-black text-gray-900">
                {prospectDistribution.reduce((sum, item) => sum + item.value, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking de Verificadores */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Top Verificadores
          </h2>
          <p className="text-sm text-gray-500">Ranking de verificadores por matrículas procesadas</p>
        </div>
        
        <div className="space-y-4">
          {topVerifiers.map((verifierItem, index) => (
            <div 
              key={index}
              className="flex items-center p-5 rounded-xl hover:shadow-md transition-all duration-200"
              style={{ 
                backgroundColor: index === 0 ? `${COLORS.pradera}08` : 
                                index === 1 ? `${COLORS.catalina}05` : 
                                index === 2 ? `${COLORS.beer}05` : '#f9fafb'
              }}
            >
              <div 
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg mr-5"
                style={{ 
                  backgroundColor: index === 0 ? COLORS.pradera : 
                                  index === 1 ? COLORS.catalina : 
                                  index === 2 ? COLORS.beer : '#9ca3af'
                }}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{verifierItem.name}</h3>
                <p className="text-sm text-gray-500">Verificaciones realizadas</p>
              </div>
              <div className="text-right">
                <div 
                  className="text-4xl font-black"
                  style={{ 
                    color: index === 0 ? COLORS.pradera : 
                           index === 1 ? COLORS.catalina : 
                           index === 2 ? COLORS.beer : '#6b7280'
                  }}
                >
                  {verifierItem.total}
                </div>
                <p className="text-xs text-gray-500 font-semibold">aprendices</p>
              </div>
            </div>
          ))}
          
          {topVerifiers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No hay datos de verificadores disponibles
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifierDashboard;
