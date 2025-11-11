import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { Editor } from '@tinymce/tinymce-react';
import { Input, Select } from '@/components/ui/input';
import { 
  RiSettings4Line, 
  RiMailLine, 
  RiWhatsappLine, 
  RiGlobalLine,
  RiSaveLine 
} from 'react-icons/ri';
import { toast } from 'sonner';

interface Setting {
  id: number;
  key: string;
  type: string;
  content: string;
  description?: string;
}

interface Props {
  settings: {
    mail?: Setting[];
    whatsapp?: Setting[];
    general?: Setting[];
  };
}

interface EmailTemplate {
  key: string;
  label: string;
  variables: string[];
}

const Settings: React.FC<Props> = ({ settings }) => {
  const [activeTab, setActiveTab] = useState<'mail' | 'whatsapp' | 'general'>('mail');
  const [selectedMailTemplate, setSelectedMailTemplate] = useState<string>('prospect_welcome');
  
  // Configuración de templates de email
  const emailTemplates: EmailTemplate[] = [
    {
      key: 'prospect_welcome',
      label: 'Email de Bienvenida a Prospectos',
      variables: ['nombre_estudiante', 'nombre_asesor', 'email_asesor', 'telefono_asesor', 'fecha_registro', 'url_plataforma']
    },
    {
      key: 'student_enrolled',
      label: 'Email de Credenciales para Estudiantes Matriculados',
      variables: ['nombre_estudiante', 'codigo_matricula', 'email', 'contrasena', 'url_plataforma', 'nivel_academico', 'plan_pago']
    },
   
  ];
  
  // Form states por tab
  const mailForm = useForm({
    settings: (settings.mail || []).reduce((acc, s) => {
      acc[s.key] = s.content;
      return acc;
    }, {} as Record<string, string>)
  });

  const whatsappForm = useForm({
    whatsapp_number: settings.whatsapp?.find(s => s.key === 'whatsapp_number')?.content || '',
    whatsapp_message: settings.whatsapp?.find(s => s.key === 'whatsapp_message')?.content || '',
  });

  const generalForm = useForm({
    site_name: settings.general?.find(s => s.key === 'site_name')?.content || '',
    site_description: settings.general?.find(s => s.key === 'site_description')?.content || '',
  });

  const tabs = [
    { id: 'mail', label: 'Templates de Email', icon: RiMailLine },
    { id: 'whatsapp', label: 'Configuración WhatsApp', icon: RiWhatsappLine },
    { id: 'general', label: 'Configuración General', icon: RiGlobalLine },
  ];

  const handleMailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const settingsArray = Object.entries(mailForm.data.settings).map(([key, content]) => ({
      key,
      content,
      type: 'mail',
      description: getMailTemplateDescription(key),
    }));

    mailForm.transform(() => ({ settings: settingsArray }));
    mailForm.post('/admin/settings', {
      onSuccess: () => {
        toast.success('Configuración guardada', {
          description: 'Los templates de email han sido actualizados',
          duration: 4000,
        });
      },
      onError: () => {
        toast.error('Error', {
          description: 'No se pudieron guardar las configuraciones',
          duration: 4000,
        });
      }
    });
  };

  const handleWhatsAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const settingsArray = [
      {
        key: 'whatsapp_number',
        content: whatsappForm.data.whatsapp_number,
        type: 'whatsapp',
        description: 'Número de WhatsApp para contacto',
      },
      {
        key: 'whatsapp_message',
        content: whatsappForm.data.whatsapp_message,
        type: 'whatsapp',
        description: 'Mensaje predeterminado de WhatsApp',
      },
    ];

    whatsappForm.transform(() => ({ settings: settingsArray }));
    whatsappForm.post('/admin/settings', {
      onSuccess: () => {
        toast.success('Configuración guardada', {
          description: 'La configuración de WhatsApp ha sido actualizada',
          duration: 4000,
        });
      },
    });
  };

  const handleGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const settingsArray = [
      {
        key: 'site_name',
        content: generalForm.data.site_name,
        type: 'general',
        description: 'Nombre del sitio',
      },
      {
        key: 'site_description',
        content: generalForm.data.site_description,
        type: 'general',
        description: 'Descripción del sitio',
      },
    ];

    generalForm.transform(() => ({ settings: settingsArray }));
    generalForm.post('/admin/settings', {
      onSuccess: () => {
        toast.success('Configuración guardada', {
          description: 'La configuración general ha sido actualizada',
          duration: 4000,
        });
      },
    });
  };

  const getMailTemplateDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      'welcome_email': 'Email de bienvenida para nuevos usuarios',
      'payment_reminder': 'Recordatorio de pago pendiente',
      'enrollment_confirmation': 'Confirmación de matrícula',
    };
    return descriptions[key] || '';
  };

  return (
    <AuthenticatedLayout>
      <Head title="Configuraciones" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-xl shadow-lg">
            <RiSettings4Line className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configuraciones del Sistema</h1>
            <p className="text-sm text-slate-600">Administra templates de email, WhatsApp y configuración general</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'mail' | 'whatsapp' | 'general')}
                    className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-[#073372] to-[#17BC91] text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Mail Templates Tab */}
            {activeTab === 'mail' && (
              <form onSubmit={handleMailSubmit} className="space-y-6">
                {/* Template Selector */}
                <div>
                  <Select
                    label="Seleccionar Template de Email"
                    value={selectedMailTemplate}
                    onChange={(e) => setSelectedMailTemplate(e.target.value)}
                    required
                  >
                    {emailTemplates.map((template) => (
                      <option key={template.key} value={template.key}>
                        {template.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Editor for Selected Template */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {emailTemplates.find(t => t.key === selectedMailTemplate)?.label}
                    </h3>
                  </div>

                  <Editor
                    key={selectedMailTemplate}
                    apiKey="0nai4nwo1mc0dumfyzl8re1odbzzr1fz4gfwzpgu5ghdnu4n"
                    value={mailForm.data.settings[selectedMailTemplate] || ''}
                    onEditorChange={(content) => {
                      mailForm.setData('settings', {
                        ...mailForm.data.settings,
                        [selectedMailTemplate]: content,
                      });
                    }}
                    init={{
                      height: 500,
                      menubar: false,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'help', 'wordcount'
                      ],
                      toolbar: 'undo redo | blocks | ' +
                        'bold italic forecolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'link image | removeformat | code | help',
                      image_title: true,
                      automatic_uploads: true,
                      file_picker_types: 'image',
                      images_upload_url: '/admin/upload-image',
                      images_upload_handler: (blobInfo) => new Promise((resolve, reject) => {
                        const formData = new FormData();
                        formData.append('file', blobInfo.blob(), blobInfo.filename());

                        fetch('/admin/upload-image', {
                          method: 'POST',
                          body: formData,
                          headers: {
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                          }
                        })
                          .then(response => response.json())
                          .then(result => {
                            if (result.location) {
                              resolve(result.location);
                            } else {
                              reject('Error al subir imagen');
                            }
                          })
                          .catch(() => {
                            reject('Error al subir imagen');
                          });
                      }),
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                    }}
                  />

                  {/* Variables Info */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Variables disponibles para este template:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                      {emailTemplates.find(t => t.key === selectedMailTemplate)?.variables.map((variable) => (
                        <code key={variable} className="bg-white px-2 py-1 rounded">
                          {`{{${variable}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={mailForm.processing}
                    className="inline-flex items-center px-6 py-3 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <RiSaveLine className="h-5 w-5 mr-2" />
                    {mailForm.processing ? 'Guardando...' : 'Guardar Template'}
                  </button>
                </div>
              </form>
            )}

            {/* WhatsApp Tab */}
            {activeTab === 'whatsapp' && (
              <form onSubmit={handleWhatsAppSubmit} className="space-y-6">
                <Input
                  label="Número de WhatsApp"
                  type="text"
                  value={whatsappForm.data.whatsapp_number}
                  onChange={(e) => whatsappForm.setData('whatsapp_number', e.target.value)}
                  helperText="Ejemplo: +51987654321"
                  variant="outlined"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje Predeterminado
                  </label>
                  <textarea
                    value={whatsappForm.data.whatsapp_message}
                    onChange={(e) => whatsappForm.setData('whatsapp_message', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent transition-all"
                    placeholder="Hola! Estoy interesado en información sobre los cursos..."
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Este mensaje se usará como plantilla para contacto por WhatsApp
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={whatsappForm.processing}
                    className="inline-flex items-center px-6 py-3 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <RiSaveLine className="h-5 w-5 mr-2" />
                    {whatsappForm.processing ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </form>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <form onSubmit={handleGeneralSubmit} className="space-y-6">
                <Input
                  label="Nombre del Sitio"
                  type="text"
                  value={generalForm.data.site_name}
                  onChange={(e) => generalForm.setData('site_name', e.target.value)}
                  variant="outlined"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción del Sitio
                  </label>
                  <textarea
                    value={generalForm.data.site_description}
                    onChange={(e) => generalForm.setData('site_description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent transition-all"
                    placeholder="Descripción breve del sitio..."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={generalForm.processing}
                    className="inline-flex items-center px-6 py-3 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <RiSaveLine className="h-5 w-5 mr-2" />
                    {generalForm.processing ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Settings;
