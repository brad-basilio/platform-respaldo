import React, { useState } from 'react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { Input, Select } from '../../components/ui/input';
import { DatePicker } from '../../components/ui/DatePicker';
import { Select2, SelectOption } from '../../components/ui/Select2';
import { User, Mail, Phone, MapPin, Briefcase } from 'lucide-react';

const InputDemo: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: null as Date | null,
    gender: '',
    country: null as string | number | null,
    city: '',
    address: '',
    occupation: null as string | number | null,
  });

  const countryOptions: SelectOption[] = [
    { value: 'pe', label: 'Perú' },
    { value: 'ar', label: 'Argentina' },
    { value: 'cl', label: 'Chile' },
    { value: 'co', label: 'Colombia' },
    { value: 'mx', label: 'México' },
    { value: 'es', label: 'España' },
    { value: 'us', label: 'Estados Unidos' },
  ];

  const occupationOptions: SelectOption[] = [
    { value: 'estudiante', label: '🎓 Estudiante' },
    { value: 'empleado', label: '💼 Empleado' },
    { value: 'independiente', label: '🚀 Independiente' },
    { value: 'empresario', label: '👔 Empresario' },
    { value: 'desempleado', label: '🔍 Desempleado' },
  ];

  return (
    <AuthenticatedLayout>
      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#073372] via-[#17BC91] to-[#F98613] rounded-t-2xl p-8 text-white">
            <h3 className="text-3xl font-bold mb-2">Nuevo Diseño de Inputs - Material Design 3</h3>
            <p className="text-white/90">Basado en Material Design 3 de Google - Professional UI Components</p>
          </div>

          <div className="bg-white rounded-b-2xl shadow-xl p-8">
            {/* Variant Outlined */}
            <div className="mb-12">
              <h4 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-[#073372]">
                Variant: Outlined (Predeterminado)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Nombre Completo"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  helperText="Ingresa tu nombre completo"
                />

                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  icon={<Mail className="w-5 h-5" />}
                  required
                />

                <Input
                  label="Teléfono"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  icon={<Phone className="w-5 h-5" />}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <DatePicker
                  label="Fecha de Nacimiento"
                  selected={formData.birthDate}
                  onChange={(date) => setFormData({...formData, birthDate: date})}
                  required
                  helperText="Selecciona tu fecha de nacimiento"
                />

                <Select
                  label="Sexo"
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  icon={<User className="w-5 h-5" />}
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </Select>
              </div>

              <div className="mt-6">
                <Select2
                  label="Ocupación"
                  value={formData.occupation}
                  onChange={(value) => setFormData({...formData, occupation: value})}
                  options={occupationOptions}
                  icon={<Briefcase className="w-5 h-5" />}
                  helperText="Selecciona tu ocupación actual"
                />
              </div>
            </div>

            {/* DatePicker y Select2 */}
            <div className="mb-12">
              <h4 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-[#17BC91]">
                DatePicker & Select2 (React Select)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select2
                  label="País"
                  value={formData.country}
                  onChange={(value) => setFormData({...formData, country: value})}
                  options={countryOptions}
                  icon={<MapPin className="w-5 h-5" />}
                  isSearchable
                  isClearable
                  helperText="Busca y selecciona tu país"
                />

                <Input
                  label="Ciudad"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  variant="filled"
                  icon={<MapPin className="w-5 h-5" />}
                />
              </div>

              <div className="mt-6">
                <Input
                  label="Dirección Completa"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  variant="filled"
                  helperText="Ingresa tu dirección completa incluyendo número de casa"
                />
              </div>
            </div>

            {/* Estados de Error */}
            <div>
              <h4 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-[#F98613]">
                Estados de Validación y Error
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Email (Con Error)"
                  type="email"
                  value="correo-invalido"
                  onChange={() => {}}
                  error="Por favor ingresa un correo electrónico válido"
                />

                <Input
                  label="Teléfono (Con Error)"
                  type="tel"
                  value="123"
                  onChange={() => {}}
                  variant="filled"
                  error="El teléfono debe tener al menos 9 dígitos"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Input
                  label="Campo Deshabilitado"
                  type="text"
                  value="No editable"
                  disabled
                />

                <Select
                  label="Select Deshabilitado"
                  value="opcion1"
                  disabled
                >
                  <option value="opcion1">Opción 1</option>
                  <option value="opcion2">Opción 2</option>
                </Select>
              </div>
            </div>

            {/* Feature List */}
            <div className="mt-12 bg-gradient-to-r from-[#073372]/5 via-[#17BC91]/5 to-[#F98613]/5 rounded-xl p-8 border border-[#17BC91]/20">
              <h4 className="text-xl font-bold text-[#073372] mb-4">🎨 Características del Nuevo Diseño:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-[#17BC91]">✓</span>
                  <span><strong>Floating Labels:</strong> Etiquetas que se mueven suavemente</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#17BC91]">✓</span>
                  <span><strong>Dos Variantes:</strong> Outlined y Filled</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#17BC91]">✓</span>
                  <span><strong>Estados Dinámicos:</strong> Hover, Focus, Error, Disabled</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#17BC91]">✓</span>
                  <span><strong>Iconos Animados:</strong> Cambio de color en focus</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#17BC91]">✓</span>
                  <span><strong>Helper Text:</strong> Mensajes de ayuda y validación</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#17BC91]">✓</span>
                  <span><strong>Material Design 3:</strong> Siguiendo estándares de Google</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#17BC91]">✓</span>
                  <span><strong>Transiciones Suaves:</strong> Animaciones de 200ms</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#17BC91]">✓</span>
                  <span><strong>Accesibilidad:</strong> Colores AAA-compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default InputDemo;
