import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { 
  Clock, Save, Trash2, Plus, AlertTriangle, CheckCircle, 
  Link2, Calendar, X, AlertCircle, Copy 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

const Availability: React.FC<Props> = ({ teacher }) => {
  const [meetUrl, setMeetUrl] = useState(teacher.meet_url || '');
  const [notAvailableToday, setNotAvailableToday] = useState(teacher.not_available_today);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>((teacher.time_slots || []).map(slot => ({
    ...slot,
    start_time: slot.start_time.substring(0, 5),
    end_time: slot.end_time.substring(0, 5)
  })));
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  
  // Estado para agregar horarios en grupo (Modal)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkDays, setBulkDays] = useState<string[]>([]);
  const [bulkTimeRanges, setBulkTimeRanges] = useState<{start: string, end: string}[]>([
    { start: '09:00', end: '12:00' }
  ]);

  const addTimeSlot = (day: string) => {
    setTimeSlots([
      ...timeSlots,
      { day_of_week: day, start_time: '09:00', end_time: '12:00' }
    ]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const updated = [...timeSlots];
    updated[index] = { ...updated[index], [field]: value };
    setTimeSlots(updated);
  };

  // --- Bulk Actions ---

  const addBulkTimeRange = () => {
    setBulkTimeRanges([...bulkTimeRanges, { start: '14:00', end: '17:00' }]);
  };

  const removeBulkTimeRange = (index: number) => {
    if (bulkTimeRanges.length > 1) {
      setBulkTimeRanges(bulkTimeRanges.filter((_, i) => i !== index));
    }
  };

  const updateBulkTimeRange = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...bulkTimeRanges];
    updated[index] = { ...updated[index], [field]: value };
    setBulkTimeRanges(updated);
  };

  const handleBulkAdd = () => {
    if (bulkDays.length === 0) {
      toast.error('Selecciona al menos un día');
      return;
    }
    const newSlots: TimeSlot[] = [];
    bulkDays.forEach(day => {
      bulkTimeRanges.forEach(range => {
        newSlots.push({
          day_of_week: day,
          start_time: range.start,
          end_time: range.end,
        });
      });
    });
    
    setTimeSlots([...timeSlots, ...newSlots]);
    setIsBulkModalOpen(false);
    setBulkDays([]);
    setBulkTimeRanges([{ start: '09:00', end: '12:00' }]);
    toast.success(`Se agregaron ${newSlots.length} horarios`);
  };

  const toggleBulkDay = (day: string) => {
    if (bulkDays.includes(day)) {
      setBulkDays(bulkDays.filter(d => d !== day));
    } else {
      setBulkDays([...bulkDays, day]);
    }
  };

  const copyToClipboard = () => {
    if (!meetUrl) return;
    navigator.clipboard.writeText(meetUrl);
    toast.success('Link copiado al portapapeles');
  };

  const applyPreset = (preset: 'morning' | 'afternoon' | 'evening' | 'full') => {
    let ranges: {start: string, end: string}[] = [];
    switch (preset) {
        case 'morning':
            ranges = [{ start: '08:00', end: '12:00' }];
            break;
        case 'afternoon':
            ranges = [{ start: '14:00', end: '18:00' }];
            break;
        case 'evening':
            ranges = [{ start: '19:00', end: '22:00' }];
            break;
        case 'full':
            ranges = [
                { start: '09:00', end: '13:00' },
                { start: '15:00', end: '19:00' }
            ];
            break;
    }
    setBulkTimeRanges(ranges);
    // Auto-select weekdays if no days are selected
    if (bulkDays.length === 0) {
        setBulkDays(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
    }
  };

  // --- API Actions ---

  const handleSave = async () => {
    const invalidSlots = timeSlots.filter(slot => {
      const [startH, startM] = slot.start_time.split(':').map(Number);
      const [endH, endM] = slot.end_time.split(':').map(Number);
      return (endH * 60 + endM) - (startH * 60 + startM) <= 0;
    });

    if (invalidSlots.length > 0) {
      toast.error('Hay horarios inválidos (Fin debe ser mayor a Inicio)');
      return;
    }

    setIsSaving(true);
    try {
      await axios.put('/teacher/availability', {
        meet_url: meetUrl || null,
        time_slots: timeSlots.map(slot => ({
          day_of_week: slot.day_of_week,
          start_time: slot.start_time.substring(0, 5),
          end_time: slot.end_time.substring(0, 5),
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

  const getDayColor = (day: string) => {
      // Return a consistent color for headers based on the day
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
                         <p className="text-sm text-gray-500">Administra tus horarios de clase y preferencias</p>
                     </div>
                     <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button 
                            variant="outline" 
                            onClick={() => setIsBulkModalOpen(true)}
                            className="flex-1 sm:flex-none"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Agregar Varios
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-[#073372] hover:bg-[#062b61] text-white flex-1 sm:flex-none"
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
                    Horarios Semanales
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {DAYS_OF_WEEK.map(day => {
                        const daySlots = timeSlots.filter(s => s.day_of_week === day);
                        const dayColor = getDayColor(day);
                        
                        return (
                            <div key={day} className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
                                {/* Day Header */}
                                <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm text-xs"
                                            style={{ backgroundColor: dayColor }}
                                        >
                                            {day.substring(0,3).toUpperCase()}
                                        </div>
                                        <span className="font-semibold text-gray-900">{day}</span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-[#073372] hover:bg-white"
                                        onClick={() => addTimeSlot(day)}
                                        title="Agregar Horario"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Slots List */}
                                <div className="p-4 space-y-3 flex-1">
                                    {daySlots.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-6 text-sm">
                                            <span>No hay horarios</span>
                                        </div>
                                    ) : (
                                        daySlots.map((slot, idx) => {
                                            // Find the original index in standard array to update correctly with ID
                                            const originalIndex = timeSlots.indexOf(slot);
                                            
                                            // Validation
                                            const [sh, sm] = slot.start_time.split(':').map(Number);
                                            const [eh, em] = slot.end_time.split(':').map(Number);
                                            const isValid = (eh * 60 + em) > (sh * 60 + sm);

                                            return (
                                                <div key={idx} className="flex items-center gap-2 group animate-in slide-in-from-left-2 duration-200">
                                                    <div className={`flex-1 flex items-center gap-2 p-1.5 rounded-lg border ${isValid ? 'border-gray-200 bg-white' : 'border-red-300 bg-red-50'}`}>
                                                        <input
                                                            type="time"
                                                            className="flex-1 min-w-0 bg-transparent border-none text-sm font-medium text-gray-900 focus:ring-0 p-0 text-center"
                                                            value={slot.start_time}
                                                            onChange={(e) => updateTimeSlot(originalIndex, 'start_time', e.target.value)}
                                                        />
                                                        <span className="text-gray-400 text-xs">➜</span>
                                                        <input
                                                            type="time"
                                                            className="flex-1 min-w-0 bg-transparent border-none text-sm font-medium text-gray-900 focus:ring-0 p-0 text-center"
                                                            value={slot.end_time}
                                                            onChange={(e) => updateTimeSlot(originalIndex, 'end_time', e.target.value)}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => removeTimeSlot(originalIndex)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                
                                {/* Footer summary for day */}
                                {daySlots.length > 0 && (
                                     <div className="bg-gray-50 px-4 py-2 border-t text-xs text-gray-500 text-center">
                                         {daySlots.length} horarios configurados
                                     </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Bulk Add Modal */}
        <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
            <DialogContent className="w-[95vw] min-w-[60vw] max-w-[1400px] p-0 overflow-hidden gap-0" classNameIcon="text-white [&_svg:not([class*='size-'])]:size-6">
                <div className="bg-[#073372] px-6 py-4 text-white">
                    <DialogTitle className="text-xl">Configuración Rápida de Horarios</DialogTitle>
                    <p className="text-blue-100 text-sm mt-1">
                        Asigna horarios a múltiples días simultáneamente de forma masiva
                    </p>
                </div>
                
                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left Column: Days Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-[#073372]" />
                                1. Selecciona Días
                            </h4>
                            <div className="flex gap-2">
                                <Button 
                                    variant="ghost" size="sm" 
                                    onClick={() => setBulkDays(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'])}
                                    className="text-xs h-7 text-[#073372] hover:bg-blue-50 hover:text-black"
                                >
                                    Lun-Vie
                                </Button>
                                <Button 
                                    variant="ghost" size="sm" 
                                    onClick={() => setBulkDays(DAYS_OF_WEEK)}
                                    className="text-xs h-7 text-[#073372] hover:bg-blue-50 hover:text-black"
                                >
                                    Todos
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {DAYS_OF_WEEK.map(day => (
                                <button
                                    key={day}
                                    onClick={() => toggleBulkDay(day)}
                                    className={`
                                        flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 text-sm font-medium
                                        ${bulkDays.includes(day) 
                                            ? 'border-[#073372] bg-[#073372] text-white shadow-md transform scale-[1.02]' 
                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                        }
                                    `}
                                >
                                    <span>{day}</span>
                                    {bulkDays.includes(day) && <CheckCircle className="w-4 h-4 text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Time & Presets */}
                    <div className="space-y-6">
                        {/* Time Slots */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-[#F98613]" />
                                2. Define Horarios
                            </h4>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                {bulkTimeRanges.map((range, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="flex-1 grid grid-cols-2 gap-3">
                                            <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm focus-within:border-[#073372] focus-within:ring-1 focus-within:ring-[#073372] transition-all">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Inicio</label>
                                                <input 
                                                    type="time" 
                                                    className="w-full text-sm font-medium border-none p-0 focus:ring-0 text-gray-900 h-6"
                                                    value={range.start}
                                                    onChange={(e) => updateBulkTimeRange(index, 'start', e.target.value)}
                                                />
                                            </div>
                                            <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm focus-within:border-[#073372] focus-within:ring-1 focus-within:ring-[#073372] transition-all">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Fin</label>
                                                <input 
                                                    type="time" 
                                                    className="w-full text-sm font-medium border-none p-0 focus:ring-0 text-gray-900 h-6"
                                                    value={range.end}
                                                    onChange={(e) => updateBulkTimeRange(index, 'end', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        {bulkTimeRanges.length > 1 && (
                                            <button 
                                                onClick={() => removeBulkTimeRange(index)} 
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addBulkTimeRange} className="w-full border-dashed bg-white text-[#073372] border-[#073372]/30 hover:bg-blue-50">
                                    <Plus className="w-4 h-4 mr-2" /> Agregar otro intervalo
                                </Button>
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Plantillas Rápidas (Aplica a días no seleccionados)
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => applyPreset('morning')} className="text-left p-3 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 group transition-all">
                                    <div className="font-semibold text-gray-700 group-hover:text-amber-700 text-sm flex items-center gap-2">
                                        <span>🌅</span> Mañanas
                                    </div>
                                    <div className="text-xs text-gray-500 group-hover:text-amber-600 mt-1">08:00 - 12:00</div>
                                </button>
                                <button onClick={() => applyPreset('afternoon')} className="text-left p-3 rounded-lg border border-gray-200 hover:border-orange-400 hover:bg-orange-50 group transition-all">
                                    <div className="font-semibold text-gray-700 group-hover:text-orange-700 text-sm flex items-center gap-2">
                                        <span>☀️</span> Tardes
                                    </div>
                                    <div className="text-xs text-gray-500 group-hover:text-orange-600 mt-1">14:00 - 18:00</div>
                                </button>
                                <button onClick={() => applyPreset('evening')} className="text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 group transition-all">
                                    <div className="font-semibold text-gray-700 group-hover:text-indigo-700 text-sm flex items-center gap-2">
                                        <span>🌙</span> Noches
                                    </div>
                                    <div className="text-xs text-gray-500 group-hover:text-indigo-600 mt-1">19:00 - 22:00</div>
                                </button>
                                <button onClick={() => applyPreset('full')} className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 group transition-all">
                                    <div className="font-semibold text-gray-700 group-hover:text-blue-700 text-sm flex items-center gap-2">
                                        <span>🏢</span> Jornada
                                    </div>
                                    <div className="text-xs text-gray-500 group-hover:text-blue-600 mt-1">2 turnos</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-100">
                    <div className="text-sm text-gray-500">
                        {bulkDays.length > 0 ? (
                            <span>Aplicando a <span className="font-bold text-[#073372]">{bulkDays.length} días</span> seleccionados</span>
                        ) : (
                            <span>Selecciona días primero</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setIsBulkModalOpen(false)}>Cancelar</Button>
                        <Button 
                            onClick={handleBulkAdd}
                            disabled={bulkDays.length === 0}
                            className="bg-[#073372] hover:bg-[#062b61] text-white min-w-[140px]"
                        >
                            Aplicar Horarios
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};

export default Availability;
