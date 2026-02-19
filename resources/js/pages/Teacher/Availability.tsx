import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Clock, Save, Trash2, Plus, AlertTriangle, CheckCircle, Link2, Calendar } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

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
  
  // Estado para agregar horarios en grupo
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkDays, setBulkDays] = useState<string[]>([]);
  const [bulkTimeRanges, setBulkTimeRanges] = useState<{start: string, end: string}[]>([
    { start: '09:00', end: '12:00' }
  ]);

  const addTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      { day_of_week: 'Lunes', start_time: '09:00', end_time: '12:00' }
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

  // Agregar un rango de tiempo al bulk
  const addBulkTimeRange = () => {
    setBulkTimeRanges([...bulkTimeRanges, { start: '14:00', end: '17:00' }]);
  };

  // Eliminar un rango de tiempo del bulk
  const removeBulkTimeRange = (index: number) => {
    if (bulkTimeRanges.length > 1) {
      setBulkTimeRanges(bulkTimeRanges.filter((_, i) => i !== index));
    }
  };

  // Actualizar un rango de tiempo
  const updateBulkTimeRange = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...bulkTimeRanges];
    updated[index] = { ...updated[index], [field]: value };
    setBulkTimeRanges(updated);
  };

  // Agregar horarios en grupo
  const handleBulkAdd = () => {
    if (bulkDays.length === 0) {
      toast.error('Selecciona al menos un día');
      return;
    }
    
    if (bulkTimeRanges.length === 0) {
      toast.error('Agrega al menos un horario');
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
    setShowBulkAdd(false);
    setBulkDays([]);
    setBulkTimeRanges([{ start: '09:00', end: '12:00' }]);
    
    toast.success(`Se agregaron ${newSlots.length} horarios`, {
      description: `${bulkDays.length} día${bulkDays.length > 1 ? 's' : ''} × ${bulkTimeRanges.length} horario${bulkTimeRanges.length > 1 ? 's' : ''}`,
    });
  };

  // Toggle día en selección múltiple
  const toggleBulkDay = (day: string) => {
    if (bulkDays.includes(day)) {
      setBulkDays(bulkDays.filter(d => d !== day));
    } else {
      setBulkDays([...bulkDays, day]);
    }
  };

  // Seleccionar Lunes a Viernes
  const selectWeekdays = () => {
    setBulkDays(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
  };

  // Seleccionar todos
  const selectAllDays = () => {
    setBulkDays([...DAYS_OF_WEEK]);
  };

  // Limpiar selección
  const clearBulkDays = () => {
    setBulkDays([]);
  };

  const handleSave = async () => {
    // Validar horarios inválidos antes de enviar
    const invalidSlots = timeSlots.filter(slot => {
      const [startH, startM] = slot.start_time.split(':').map(Number);
      const [endH, endM] = slot.end_time.split(':').map(Number);
      const duration = (endH * 60 + endM) - (startH * 60 + startM);
      return duration <= 0;
    });

    if (invalidSlots.length > 0) {
      toast.error('Hay horarios inválidos', {
        description: 'La hora de fin debe ser mayor a la hora de inicio en todos los horarios.',
        duration: 5000,
      });
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
      toast.success('Configuración guardada exitosamente', {
        description: 'Tus horarios y link de Meet han sido actualizados.',
        duration: 4000,
      });
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Error al guardar la configuración', {
        description: 'No se pudieron guardar los cambios. Intenta nuevamente.',
        duration: 5000,
      });
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
        toast.warning('Has marcado que no atiendes hoy', {
          description: 'No se te asignarán clases por el resto del día.',
          duration: 5000,
        });
      } else {
        toast.success('¡Disponibilidad activada!', {
          description: 'Ya puedes recibir asignación de clases.',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Error al cambiar la disponibilidad', {
        description: 'No se pudo cambiar tu estado. Intenta nuevamente.',
        duration: 5000,
      });
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Mi Disponibilidad" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi Disponibilidad</h1>
            <p className="text-gray-600">Configura tus horarios de atención y link de Google Meet</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-[#073372] to-[#17BC91] hover:from-[#052a5e] hover:to-[#14a77f] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>

        {/* Card Principal con estilo de StudentManagement */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header del Card */}
          <div className="relative bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  Configuración de Disponibilidad
                </h3>
                <p className="text-blue-100">
                  Define tus horarios y preferencias para recibir clases
                </p>
              </div>
              <Clock className="w-10 h-10 text-white/80" />
            </div>
          </div>

          {/* Contenido */}
          <div className="p-8 space-y-6">
            {/* Toggle Disponibilidad Hoy */}
            <div className={`p-4 rounded-xl border-2 transition-all ${
              notAvailableToday 
                ? 'bg-red-50 border-red-300' 
                : 'bg-[#17BC91]/10 border-[#17BC91]/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {notAvailableToday ? (
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#17BC91]/20 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-[#17BC91]" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {notAvailableToday ? 'No disponible hoy' : 'Disponible hoy'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {notAvailableToday 
                        ? 'No se te asignarán clases hasta mañana. Este estado se reinicia a medianoche.'
                        : 'Puedes recibir clases según tus horarios configurados.'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleToggleAvailability}
                  disabled={isTogglingAvailability}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    notAvailableToday
                      ? 'bg-[#17BC91] hover:bg-[#14a77f] text-white'
                      : 'bg-[#F98613] hover:bg-[#e07610] text-white'
                  } ${isTogglingAvailability ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isTogglingAvailability ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Cambiando...
                    </span>
                  ) : notAvailableToday ? (
                    'Activar Disponibilidad'
                  ) : (
                    'No Atiendo Hoy'
                  )}
                </button>
              </div>
            </div>

            {/* Sección 1: Link de Google Meet */}
            <div>
              <div className="flex items-center mb-4 pb-2 border-b-2 border-[#073372]">
                <div className="w-8 h-8 bg-[#073372] text-white rounded-full flex items-center justify-center font-bold mr-3">
                  1
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Link de Google Meet Personal</h4>
              </div>

              <Input
                label="URL de tu sala de Meet"
                type="url"
                value={meetUrl}
                disabled
                onChange={(e) => setMeetUrl(e.target.value)}
                icon={<Link2 className="w-5 h-5" />}
                helperText="Este link se usará automáticamente al asignar clases. Usa un link permanente para evitar crear uno nuevo cada clase."
              />
            </div>

            {/* Sección 2: Horarios Disponibles por Día */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-[#F98613]">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-[#F98613] text-white rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Horarios Disponibles</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkAdd(!showBulkAdd)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    showBulkAdd 
                      ? 'bg-[#F98613] text-white' 
                      : 'bg-[#F98613]/10 text-[#F98613] hover:bg-[#F98613]/20'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Agregar Varios Días
                </button>
              </div>

              {/* Panel para agregar horarios en grupo */}
              {showBulkAdd && (
                <div className="mb-6 p-5 bg-gradient-to-r from-[#F98613]/5 to-[#073372]/5 border-2 border-[#F98613]/30 rounded-2xl">
                  <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#F98613]" />
                    Configuración Rápida de Horarios
                  </h5>

                  {/* Paso 1: Selección de días */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-[#073372] text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                      <span className="font-medium text-gray-800">Selecciona los días</span>
                    </div>
                    
                    {/* Botones de selección rápida */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        type="button"
                        onClick={selectWeekdays}
                        className="px-3 py-1.5 text-sm bg-[#073372] text-white rounded-lg hover:bg-[#052a5e] transition-colors"
                      >
                        📅 Lunes a Viernes
                      </button>
                      <button
                        type="button"
                        onClick={selectAllDays}
                        className="px-3 py-1.5 text-sm bg-[#17BC91] text-white rounded-lg hover:bg-[#14a77f] transition-colors"
                      >
                        📆 Todos los días
                      </button>
                      <button
                        type="button"
                        onClick={clearBulkDays}
                        className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        ✕ Limpiar
                      </button>
                    </div>

                    {/* Selector de días */}
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleBulkDay(day)}
                          className={`p-3 rounded-xl text-center transition-all ${
                            bulkDays.includes(day)
                              ? 'bg-[#073372] text-white shadow-lg scale-105'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#073372]'
                          }`}
                        >
                          <div className="font-bold text-sm">{day.substring(0, 3)}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Paso 2: Rangos de horarios */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#F98613] text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                        <span className="font-medium text-gray-800">Define los horarios</span>
                      </div>
                      <button
                        type="button"
                        onClick={addBulkTimeRange}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#17BC91] bg-[#17BC91]/10 hover:bg-[#17BC91]/20 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar otro horario
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {bulkTimeRanges.map((range, index) => (
                        <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                          <span className="text-xs font-bold text-white bg-[#073372] px-2.5 py-1 rounded-full">
                            #{index + 1}
                          </span>
                          <div className="flex items-center gap-3 flex-1 flex-wrap">
                            <div className="flex-1 min-w-[140px]">
                              <Input
                                label="Hora inicio"
                                type="time"
                                value={range.start}
                                onChange={(e) => updateBulkTimeRange(index, 'start', e.target.value)}
                                icon={<Clock className="w-5 h-5" />}
                              />
                            </div>
                            <span className="text-[#073372] font-bold text-xl hidden sm:block">→</span>
                            <div className="flex-1 min-w-[140px]">
                              <Input
                                label="Hora fin"
                                type="time"
                                value={range.end}
                                onChange={(e) => updateBulkTimeRange(index, 'end', e.target.value)}
                                icon={<Clock className="w-5 h-5" />}
                              />
                            </div>
                            {/* Calcular duración */}
                            <div className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap ${
                              (() => {
                                const [startH, startM] = range.start.split(':').map(Number);
                                const [endH, endM] = range.end.split(':').map(Number);
                                const duration = (endH * 60 + endM) - (startH * 60 + startM);
                                return duration <= 0 ? 'bg-red-100 text-red-600' : 'bg-[#17BC91]/10 text-[#17BC91]';
                              })()
                            }`}>
                              {(() => {
                                const [startH, startM] = range.start.split(':').map(Number);
                                const [endH, endM] = range.end.split(':').map(Number);
                                const duration = (endH * 60 + endM) - (startH * 60 + startM);
                                if (duration <= 0) return '⚠️ Inválido';
                                const hours = Math.floor(duration / 60);
                                const mins = duration % 60;
                                return hours > 0 ? `${hours}h ${mins > 0 ? mins + 'm' : ''}` : `${mins}m`;
                              })()}
                            </div>
                          </div>
                          {bulkTimeRanges.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBulkTimeRange(index)}
                              className="p-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumen y botón de agregar */}
                  <div className="bg-white/50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold text-[#073372]">{bulkDays.length}</span> día{bulkDays.length !== 1 ? 's' : ''} × 
                        <span className="font-semibold text-[#F98613] ml-1">{bulkTimeRanges.length}</span> horario{bulkTimeRanges.length !== 1 ? 's' : ''} = 
                        <span className="font-bold text-[#17BC91] ml-1">{bulkDays.length * bulkTimeRanges.length}</span> entradas
                      </div>
                      {bulkDays.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {bulkDays.slice(0, 3).join(', ')}{bulkDays.length > 3 ? ` +${bulkDays.length - 3} más` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleBulkAdd}
                      disabled={bulkDays.length === 0 || bulkTimeRanges.length === 0}
                      className="flex-1 py-3 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white rounded-xl font-semibold hover:from-[#052a5e] hover:to-[#14a77f] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Agregar {bulkDays.length * bulkTimeRanges.length} Horarios
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkAdd(false);
                        setBulkDays([]);
                        setBulkTimeRanges([{ start: '09:00', end: '12:00' }]);
                      }}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-4">
                Define los días y horarios en los que estás disponible para dictar clases. 
                <span className="text-[#F98613] font-medium"> Puedes agregar múltiples horarios por día</span> 
                (ej: Lunes 9:00-12:00 y Lunes 18:00-21:00).
              </p>

              {/* Vista por Días de la Semana */}
              <div className="space-y-4">
                {DAYS_OF_WEEK.map(day => {
                  const daySlots = timeSlots.filter(slot => slot.day_of_week === day);
                  const dayIndex = DAYS_OF_WEEK.indexOf(day);
                  const dayColors = [
                    'bg-blue-50 border-blue-200',
                    'bg-green-50 border-green-200',
                    'bg-purple-50 border-purple-200',
                    'bg-orange-50 border-orange-200',
                    'bg-pink-50 border-pink-200',
                    'bg-cyan-50 border-cyan-200',
                    'bg-yellow-50 border-yellow-200',
                  ];
                  
                  return (
                    <div 
                      key={day} 
                      className={`rounded-xl border-2 overflow-hidden transition-all ${
                        daySlots.length > 0 ? dayColors[dayIndex] : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {/* Header del día */}
                      <div className={`px-4 py-3 flex items-center justify-between ${
                        daySlots.length > 0 ? 'bg-white/50' : ''
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                            daySlots.length > 0 ? 'bg-[#073372]' : 'bg-gray-400'
                          }`}>
                            {day.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">{day}</span>
                            {daySlots.length > 0 && (
                              <span className="ml-2 text-xs bg-[#17BC91] text-white px-2 py-0.5 rounded-full">
                                {daySlots.length} horario{daySlots.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setTimeSlots([
                              ...timeSlots,
                              { day_of_week: day, start_time: '09:00', end_time: '12:00' }
                            ]);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#F98613] hover:bg-[#F98613]/10 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Agregar
                        </button>
                      </div>
                      
                      {/* Horarios del día */}
                      {daySlots.length > 0 && (
                        <div className="px-4 pb-4 space-y-3">
                          {timeSlots.map((slot, index) => {
                            if (slot.day_of_week !== day) return null;
                            
                            const [startH, startM] = slot.start_time.split(':').map(Number);
                            const [endH, endM] = slot.end_time.split(':').map(Number);
                            const duration = (endH * 60 + endM) - (startH * 60 + startM);
                            const isValid = duration > 0;
                            
                            return (
                              <div 
                                key={index} 
                                className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center gap-3 flex-1 flex-wrap">
                                  <div className="flex-1 min-w-[130px]">
                                    <Input
                                      label="Inicio"
                                      type="time"
                                      value={slot.start_time}
                                      onChange={(e) => updateTimeSlot(index, 'start_time', e.target.value)}
                                      icon={<Clock className="w-5 h-5" />}
                                    />
                                  </div>
                                  
                                  <span className="text-[#073372] font-bold text-xl hidden sm:block">→</span>
                                  
                                  <div className="flex-1 min-w-[130px]">
                                    <Input
                                      label="Fin"
                                      type="time"
                                      value={slot.end_time}
                                      onChange={(e) => updateTimeSlot(index, 'end_time', e.target.value)}
                                      icon={<Clock className="w-5 h-5" />}
                                    />
                                  </div>
                                  
                                  {/* Calcular y mostrar duración */}
                                  <div className={`px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap ${
                                    isValid ? 'bg-[#17BC91]/10 text-[#17BC91]' : 'bg-red-100 text-red-600'
                                  }`}>
                                    {isValid ? (
                                      (() => {
                                        const hours = Math.floor(duration / 60);
                                        const mins = duration % 60;
                                        return hours > 0 ? `${hours}h ${mins > 0 ? mins + 'm' : ''}` : `${mins}m`;
                                      })()
                                    ) : '⚠️ Inválido'}
                                  </div>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => removeTimeSlot(index)}
                                  className="p-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all flex-shrink-0"
                                  title="Eliminar horario"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resumen de horarios */}
              {timeSlots.length > 0 && (
                <div className="mt-6 p-5 bg-gradient-to-r from-[#073372]/5 to-[#17BC91]/5 border border-[#17BC91]/30 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#17BC91] rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900">Resumen de Disponibilidad</h5>
                      <p className="text-sm text-gray-500">{timeSlots.length} horario{timeSlots.length > 1 ? 's' : ''} configurado{timeSlots.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {DAYS_OF_WEEK.map(day => {
                      const daySlots = timeSlots.filter(slot => slot.day_of_week === day);
                      if (daySlots.length === 0) return null;
                      return (
                        <div key={day} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-[#073372] text-white rounded-lg flex items-center justify-center text-xs font-bold">
                              {day.substring(0, 2)}
                            </div>
                            <span className="font-semibold text-gray-800">{day}</span>
                          </div>
                          <div className="space-y-1">
                            {daySlots.map((s, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <Clock className="w-3.5 h-3.5 text-[#17BC91]" />
                                <span className="text-gray-600">{s.start_time} - {s.end_time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mensaje si no hay horarios */}
              {timeSlots.length === 0 && (
                <div className="mt-6 text-center py-10 bg-gradient-to-r from-[#F98613]/5 to-[#F98613]/10 rounded-2xl border-2 border-dashed border-[#F98613]/40">
                  <div className="w-16 h-16 bg-[#F98613]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-[#F98613]" />
                  </div>
                  <p className="text-gray-800 font-semibold text-lg">No tienes horarios configurados</p>
                  <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    Usa el botón "Agregar Varios Días" para configurar rápidamente, o haz clic en "Agregar" en cualquier día
                  </p>
                </div>
              )}
            </div>

            {/* Sección 3: Información */}
            <div>
              <div className="flex items-center mb-4 pb-2 border-b-2 border-[#17BC91]">
                <div className="w-8 h-8 bg-[#17BC91] text-white rounded-full flex items-center justify-center font-bold mr-3">
                  3
                </div>
                <h4 className="text-lg font-semibold text-gray-900">¿Cómo funciona?</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-[#073372]/5 to-[#073372]/10 border border-[#073372]/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#073372] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h6 className="font-semibold text-gray-800 mb-1">Asignación Automática</h6>
                    <p className="text-sm text-gray-600">Cuando un estudiante solicita una clase, el sistema busca profesores disponibles en ese horario.</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-[#17BC91]/5 to-[#17BC91]/10 border border-[#17BC91]/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#17BC91] rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h6 className="font-semibold text-gray-800 mb-1">Rangos Configurados</h6>
                    <p className="text-sm text-gray-600">Solo se te asignarán clases dentro de los rangos horarios que has configurado.</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-[#F98613]/5 to-[#F98613]/10 border border-[#F98613]/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#F98613] rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h6 className="font-semibold text-gray-800 mb-1">No Atiendo Hoy</h6>
                    <p className="text-sm text-gray-600">Si marcas "No Atiendo Hoy", no recibirás asignaciones por el resto del día. Se reinicia a medianoche.</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Link2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h6 className="font-semibold text-gray-800 mb-1">Google Meet</h6>
                    <p className="text-sm text-gray-600">Tu link de Google Meet se incluirá automáticamente en las clases que te asignen.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer con Botones */}
          <div className="bg-gray-50 px-8 py-6 border-t-2 border-gray-200">
            <div className="flex justify-end gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm flex items-center gap-2 bg-gradient-to-r from-[#073372] to-[#17BC91] hover:from-[#052a5e] hover:to-[#14a77f] text-white disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Guardar Configuración
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Availability;
