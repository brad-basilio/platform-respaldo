import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { 
  Clock, Save, Trash2, Plus, AlertTriangle, CheckCircle, 
  Link2, Calendar, X, AlertCircle 
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
                             <Input
                                placeholder="https://meet.google.com/..."
                                value={meetUrl}
                                onChange={(e) => setMeetUrl(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500">
                                Este enlace se enviará automáticamente a tus alumnos cuando se programe una clase.
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
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Configuración Rápida de Horarios</DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    {/* Step 1: Select Days */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                            <span className="bg-[#073372] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                            Selecciona los días
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                             <Button 
                                variant="outline" size="sm" 
                                onClick={() => setBulkDays(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'])}
                                className="w-full text-xs"
                             >
                                 Lun - Vie
                             </Button>
                             <Button 
                                variant="outline" size="sm" 
                                onClick={() => setBulkDays(DAYS_OF_WEEK)}
                                className="w-full text-xs"
                             >
                                 Todos
                             </Button>
                        </div>
                        <div className="space-y-2">
                            {DAYS_OF_WEEK.map(day => (
                                <div 
                                    key={day}
                                    onClick={() => toggleBulkDay(day)}
                                    className={`
                                        flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all text-sm
                                        ${bulkDays.includes(day) ? 'border-[#073372] bg-blue-50 text-[#073372]' : 'border-gray-100 hover:bg-gray-50 text-gray-600'}
                                    `}
                                >
                                    <span>{day}</span>
                                    {bulkDays.includes(day) && <CheckCircle className="w-4 h-4" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Time Ranges */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                             <span className="bg-[#F98613] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                            Define los horarios
                        </h4>
                        
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {bulkTimeRanges.map((range, index) => (
                                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="grid grid-cols-2 gap-2 flex-1">
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase text-gray-500 font-bold">Inicio</span>
                                            <input 
                                                type="time" 
                                                className="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1"
                                                value={range.start}
                                                onChange={(e) => updateBulkTimeRange(index, 'start', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase text-gray-500 font-bold">Fin</span>
                                            <input 
                                                type="time" 
                                                className="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1"
                                                value={range.end}
                                                onChange={(e) => updateBulkTimeRange(index, 'end', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {bulkTimeRanges.length > 1 && (
                                        <button onClick={() => removeBulkTimeRange(index)} className="text-gray-400 hover:text-red-500 mt-4">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        <Button variant="outline" size="sm" onClick={addBulkTimeRange} className="w-full border-dashed">
                            <Plus className="w-3 h-3 mr-2" /> Agregar otro rango
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="ghost" onClick={() => setIsBulkModalOpen(false)}>Cancelar</Button>
                    <Button 
                        onClick={handleBulkAdd}
                        disabled={bulkDays.length === 0}
                        className="bg-[#073372] hover:bg-[#062b61] text-white"
                    >
                        Agregar Horarios
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};

export default Availability;
