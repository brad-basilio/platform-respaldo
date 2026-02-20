import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { 
  RiCalendarCheckLine, 
  RiUserStarLine, 
  RiRefreshLine, 
  RiArrowLeftSLine, 
  RiArrowRightSLine,
  RiInformationLine,
  RiCheckDoubleLine
} from 'react-icons/ri';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Teacher {
  id: number;
  name: string;
}

interface Rotation {
  id: number;
  date: string;
  teacher_id: number;
  teacher?: {
    id: number;
    name: string;
  };
}

interface PageProps {
  auth: any;
  teachers: Teacher[];
}

const PracticeRotation: React.FC<PageProps> = ({ auth, teachers }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isAdmin = auth.user.role === 'admin';

  const fetchRotations = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/practice-rotations', {
        params: {
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
        }
      });
      
      // Normalizar las fechas para que coincidan con el formato yyyy-MM-dd
      const normalizedRotations = response.data.map((r: any) => ({
        ...r,
        date: format(parseISO(r.date), 'yyyy-MM-dd')
      }));
      
      setRotations(normalizedRotations);
    } catch (error) {
      toast.error('Error al cargar el cronograma');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRotations();
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleUpdateRotation = async (date: string, teacherId: number) => {
    try {
      const response = await axios.post('/api/admin/practice-rotations', {
        date,
        teacher_id: teacherId
      });
      
      const updatedRotation = {
        ...response.data.rotation,
        date: format(parseISO(response.data.rotation.date), 'yyyy-MM-dd')
      };
      setRotations(prev => {
        const index = prev.findIndex(r => r.date === date);
        if (index !== -1) {
          const newRotations = [...prev];
          newRotations[index] = updatedRotation;
          return newRotations;
        }
        return [...prev, updatedRotation];
      });
      
      toast.success(`Turno asignado para el ${format(parseISO(date), 'dd/MM/yyyy')}`);
    } catch (error) {
      toast.error('Error al guardar el turno');
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await axios.post('/api/admin/practice-rotations/generate', {
        start_date: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
        days: 31
      });
      toast.success('Cronograma generado automáticamente para este mes');
      fetchRotations();
    } catch (error) {
      toast.error('Error al generar el cronograma');
    } finally {
      setIsGenerating(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  return (
    <AuthenticatedLayout>
      <Head title="Cronograma de Prácticas" />

      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header section moved inside children */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-xl flex items-center justify-center shadow-lg shadow-[#073372]/20">
                <RiCalendarCheckLine className="text-white text-2xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-none mb-1">Cronograma de Prácticas</h2>
                <p className="text-sm text-gray-500 font-medium font-outfit uppercase tracking-wider">
                  Asignación diaria de instructores
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="border-[#073372] text-[#073372] hover:bg-[#073372]/5 font-semibold"
                >
                  {isGenerating ? <RiRefreshLine className="animate-spin mr-2" /> : <RiRefreshLine className="mr-2" />}
                  Generar Rotación Automática
                </Button>
              </div>
            )}
          </div>
          {/* Calendar Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handlePrevMonth}
                  className="rounded-full hover:bg-gray-100"
                >
                  <RiArrowLeftSLine className="text-2xl" />
                </Button>
                
                <div className="text-center min-w-[200px]">
                  <h3 className="text-xl font-bold text-gray-900 capitalize leading-none mb-1">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                  </h3>
                  <button 
                    onClick={handleToday}
                    className="text-xs font-semibold text-[#17BC91] hover:underline"
                  >
                    Ir a hoy
                  </button>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleNextMonth}
                  className="rounded-full hover:bg-gray-100"
                >
                  <RiArrowRightSLine className="text-2xl" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                {!isAdmin ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#F98613]"></div>
                      <span className="text-gray-600 font-medium">Mis días</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      <span className="text-gray-500">Otros instructores</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <span className="text-gray-600">Pendiente de asignar</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#17BC91]"></div>
                      <span className="text-gray-600">Asignado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <span className="text-gray-600">Sin asignar</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <RiInformationLine className="text-blue-600 text-lg" />
            </div>
            <div>
              <p className="text-sm text-blue-800 font-medium">Información de Rotación</p>
              <p className="text-xs text-blue-600 mt-0.5">
                El instructor seleccionado para un día específico se dedicará exclusivamente a gestionar las sesiones de práctica. 
                El sistema asignará automáticamente cualquier solicitud de práctica a este instructor.
              </p>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {calendarDays.map((dateTime) => {
              const dateStr = format(dateTime, 'yyyy-MM-dd');
              const rotation = rotations.find(r => r.date === dateStr);
              const isTodayDate = isToday(dateTime);
              
              const isTeacher = auth.user.role === 'teacher';
              const isMyRotation = isTeacher && rotation?.teacher_id === auth.user.id;
              const isOtherRotation = isTeacher && rotation && rotation.teacher_id !== auth.user.id;
              const isUnassigned = !rotation;

              // Estilos para profesores
              let cardStyles = "relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden ";
              let headerStyles = "px-4 py-3 flex items-center justify-between ";
              
              if (isTodayDate) {
                cardStyles += "border-[#073372] ring-1 ring-[#073372] shadow-md ";
                headerStyles += "bg-[#073372]/5 ";
              } else if (isMyRotation) {
                cardStyles += "border-[#F98613] ring-1 ring-[#F98613]/50 shadow-lg shadow-[#F98613]/10 scale-[1.02] z-10 ";
                headerStyles += "bg-[#F98613]/10 ";
              } else if (isTeacher && (isOtherRotation || isUnassigned)) {
                cardStyles += "border-gray-100 opacity-60 grayscale-[0.5] ";
                headerStyles += "bg-gray-50/50 ";
              } else {
                cardStyles += "border-gray-100 hover:border-gray-200 hover:shadow-sm ";
                headerStyles += "bg-gray-50/50 ";
              }

              return (
                <div key={dateStr} className={cardStyles}>
                  {/* Card Header */}
                  <div className={headerStyles}>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        isTodayDate ? 'text-[#073372]' : isMyRotation ? 'text-[#F98613]' : 'text-gray-400'
                      }`}>
                        {format(dateTime, 'EEEE', { locale: es })}
                      </span>
                      <h4 className={`text-lg font-bold leading-none mt-0.5 ${
                        isTodayDate ? 'text-[#073372]' : isMyRotation ? 'text-[#F98613]' : 'text-gray-900'
                      }`}>
                        {format(dateTime, 'd')}
                      </h4>
                    </div>
                    {rotation && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                        isMyRotation ? 'bg-[#F98613]/20 border-[#F98613]/30' : 'bg-[#17BC91]/10 border-[#17BC91]/20'
                      }`}>
                        <RiCheckDoubleLine className={isMyRotation ? 'text-[#F98613]' : 'text-[#17BC91]'} />
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1 block">
                          Instructor de Práctica
                        </label>
                        {isAdmin ? (
                          <Select 
                            value={rotation?.teacher_id?.toString() || ""}
                            onValueChange={(val) => handleUpdateRotation(dateStr, parseInt(val))}
                          >
                            <SelectTrigger className={`h-10 text-xs ${
                              !rotation ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-white'
                            }`}>
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers.map(t => (
                                <SelectItem key={t.id} value={t.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-[#073372] flex items-center justify-center text-[8px] text-white">
                                      {t.name.charAt(0)}
                                    </div>
                                    <span>{t.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className={`h-10 flex items-center px-3 rounded-md border text-xs font-semibold ${
                            isMyRotation ? 'bg-[#F98613]/5 border-[#F98613]/20 text-[#F98613]' :
                            rotation ? 'bg-gray-50 border-gray-100 text-gray-700' : 'bg-amber-50 border-amber-100 text-amber-600 italic'
                          }`}>
                            {rotation ? (
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white uppercase ${
                                  isMyRotation ? 'bg-[#F98613]' : 'bg-[#073372]'
                                }`}>
                                  {rotation.teacher?.name.charAt(0)}
                                </div>
                                <span className="truncate">{rotation.teacher?.name}</span>
                                {isMyRotation && <span className="ml-1 text-[10px] font-black">(TÚ)</span>}
                              </div>
                            ) : (
                              'Sin asignar'
                            )}
                          </div>
                        )}
                      </div>

                      {rotation ? (
                        <div className="flex items-center gap-2 pt-1">
                          <div className={`px-2 py-0.5 rounded-full border ${
                            isMyRotation ? 'bg-[#F98613]/10 border-[#F98613]/20' : 'bg-[#17BC91]/10 border-[#17BC91]/20'
                          }`}>
                            <span className={`text-[10px] font-bold uppercase tracking-tighter ${
                              isMyRotation ? 'text-[#F98613]' : 'text-[#17BC91]'
                            }`}>
                              {isMyRotation ? 'Tu Turno' : 'Confirmado'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          <div className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">Pendiente</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isTodayDate && (
                    <div className="absolute top-0 right-0 z-20">
                      <div className="bg-[#073372] text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-sm">
                        Hoy
                      </div>
                    </div>
                  )}
                  {isMyRotation && !isTodayDate && (
                    <div className="absolute top-0 right-0 z-20">
                      <div className="bg-[#F98613] text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-sm">
                        Mi Día
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default PracticeRotation;
