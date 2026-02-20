import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { 
  Clock, Save, CheckCircle, 
  Link2, AlertCircle, Copy 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface TimeSlot {
  id?: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  duration?: number;
}

interface TeacherData {
  id: number;
  name: string;
  meet_url: string | null;
  not_available_today: boolean;
  time_slots: TimeSlot[];
}

interface Props {
  teacher: TeacherData;
  settings: {
    operation_start_hour: string;
    operation_end_hour: string;
  };
}

const DAYS_OF_WEEK = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

const Availability: React.FC<Props> = ({ teacher, settings }) => {
  const [meetUrl, setMeetUrl] = useState(teacher.meet_url || '');
  const [notAvailableToday, setNotAvailableToday] = useState(teacher.not_available_today);
  
  // Normalizar las horas de operación para asegurar formato HH:mm requerido por el backend
  const formatHour = (h: string) => {
    const hour = h.includes(':') ? h.split(':')[0] : h;
    return hour.padStart(2, '0') + ':00';
  };

  const opStart = formatHour(settings?.operation_start_hour || '08');
  const opEnd = formatHour(settings?.operation_end_hour || '22');

  const [activeDays, setActiveDays] = useState<string[]>(
    teacher.time_slots && teacher.time_slots.length > 0
      ? Array.from(new Set(teacher.time_slots.map(slot => slot.day_of_week)))
      : DAYS_OF_WEEK
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  
  const toggleDay = (day: string) => {
    if (activeDays.includes(day)) {
      setActiveDays(activeDays.filter(d => d !== day));
    } else {
      setActiveDays([...activeDays, day]);
    }
  };

  // --- API Actions ---

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.put('/teacher/availability', {
        meet_url: meetUrl || null,
        time_slots: activeDays.map(day => ({
          day_of_week: day,
          start_time: opStart,
          end_time: opEnd,
        })),
      });
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async () => {
    setIsTogglingAvailability(true);
    try {
      const response = await axios.post('/teacher/toggle-availability');
      setNotAvailableToday(response.data.not_available_today);
      if (response.data.not_available_today) {
        toast.warning('Marcado como NO DISPONIBLE por hoy');
      } else {
        toast.success('Marcado como DISPONIBLE hoy');
      }
    } catch (error) {
      toast.error('Error al cambiar disponibilidad');
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const copyToClipboard = () => {
    if (!meetUrl) return;
    navigator.clipboard.writeText(meetUrl);
    toast.success('Link copiado al portapapeles');
  };

  const getDayColor = (day: string) => {
      const colors: Record<string, string> = {
          'Lunes': '#073372', // Navy
          'Martes': '#0ea5e9', // Sky
          'Miércoles': '#17BC91', // Teal
          'Jueves': '#8b5cf6', // Violet
          'Viernes': '#ec4899', // Pink
          'Sábado': '#f59e0b', // Amber
          'Domingo': '#ef4444', // Red
      };
      return colors[day] || '#64748b';
  };

  return (
    <AuthenticatedLayout>
      <Head title="Mi Disponibilidad" />

      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Top Header */}
        <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
             <div className="w-full px-6 py-4">
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div>
                         <h1 className="text-2xl font-bold text-gray-900">Mi Disponibilidad</h1>
                         <p className="text-sm text-gray-500">Administra tus días de trabajo (Horario fijo de {opStart} a {opEnd})</p>
                     </div>
                     <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-[#073372] hover:bg-[#062b61] text-white flex-1 sm:w-48"
                        >
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            {!isSaving && <Save className="w-4 h-4 ml-2" />}
                        </Button>
                     </div>
                 </div>
             </div>
        </div>

        <div className="w-full px-6 py-8 space-y-8">
            
            {/* Status & Meet Link Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Meet Link Section */}
                <Card className="md:col-span-2 shadow-sm border-gray-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <Link2 className="w-4 h-4 text-blue-700" />
                            </div>
                            Link de Google Meet
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                             <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        readOnly
                                        placeholder="https://meet.google.com/..."
                                        value={meetUrl}
                                        className="font-mono text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                                        icon={<Link2 className="w-4 h-4" />}
                                    />
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={copyToClipboard}
                                    title="Copiar Link"
                                    className="shrink-0"
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                             </div>
                            <p className="text-xs text-gray-500">
                                Este enlace es asignado administrativamente y no puede ser modificado.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Daily Availability Status */}
                <Card className={`shadow-sm border transition-colors ${notAvailableToday ? 'border-red-200 bg-red-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${notAvailableToday ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                {notAvailableToday ? <AlertCircle className="w-4 h-4 text-red-700" /> : <CheckCircle className="w-4 h-4 text-emerald-700" />}
                            </div>
                            Estado de Hoy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${notAvailableToday ? 'text-red-700' : 'text-emerald-700'}`}>
                                    {notAvailableToday ? 'NO Disponible' : 'Disponible'}
                                </span>
                                <Switch
                                    checked={!notAvailableToday}
                                    onCheckedChange={handleToggleAvailability}
                                    disabled={isTogglingAvailability}
                                    className="data-[state=checked]:bg-[#17BC91]"
                                />
                            </div>
                            <p className="text-xs text-gray-500 leading-tight">
                                {notAvailableToday 
                                    ? "Has indicado que no puedes atender hoy. No recibirás nuevas asignaciones por el resto del día."
                                    : "Estás disponible para recibir clases hoy según tus horarios configurados."
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Weekly Schedule Grid */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    Días de Disponibilidad Semanal
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {DAYS_OF_WEEK.map(day => {
                        const isActive = activeDays.includes(day);
                        const dayColor = getDayColor(day);
                        
                        // Detectar si el día de la tarjeta es HOY
                        const todayName = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
                        const isToday = day.toLowerCase() === todayName.toLowerCase();
                        
                        // Si es HOY y el switch de "No disponible hoy" está activo, 
                        // visualmente se debe mostrar como no laboral aunque el día esté activo semanalmente.
                        const isOverriddenByToday = isToday && notAvailableToday;
                        const effectivelyActive = isActive && !isOverriddenByToday;

                        return (
                            <div 
                                key={day} 
                                className={`flex flex-col rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${
                                    effectivelyActive 
                                        ? 'bg-white border-gray-200' 
                                        : isOverriddenByToday 
                                            ? 'bg-red-50/50 border-red-200' 
                                            : 'bg-gray-100/50 border-gray-200 grayscale opacity-70'
                                }`}
                            >
                                {/* Day Header */}
                                <div className={`px-4 py-3 border-b flex items-center justify-between ${isOverriddenByToday ? 'bg-red-100/30' : 'bg-gray-50/50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-sm text-sm transition-transform ${isToday ? 'scale-110 ring-2 ring-offset-2 ring-blue-400' : ''}`}
                                            style={{ backgroundColor: isOverriddenByToday ? '#ef4444' : dayColor }}
                                        >
                                            {day.substring(0,3).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 leading-tight">{day}</span>
                                            {isToday && <span className="text-[10px] text-blue-600 font-bold uppercase">Hoy</span>}
                                        </div>
                                    </div>
                                    <Switch
                                        checked={isActive}
                                        onCheckedChange={() => toggleDay(day)}
                                        className="data-[state=checked]:bg-[#17BC91]"
                                    />
                                </div>

                                {/* Status Info */}
                                <div className="p-5 flex flex-col items-center justify-center text-center space-y-2">
                                    {effectivelyActive ? (
                                        <>
                                            <div className="text-lg font-mono font-bold text-[#073372]">
                                                {opStart} - {opEnd}
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                Disponible
                                            </span>
                                        </>
                                    ) : isOverriddenByToday ? (
                                        <>
                                            <div className="text-lg font-mono font-bold text-red-400 line-through decoration-2">
                                                {opStart} - {opEnd}
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                                    Inactivo por Hoy
                                                </span>
                                                <span className="text-[9px] text-red-500 mt-1 font-medium italic">Bloqueado por estado diario</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-lg font-mono font-bold text-gray-400">
                                                -- : --
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                                                No Laboral
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Availability;
