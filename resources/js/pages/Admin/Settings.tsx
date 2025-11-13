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
    contact?: Setting[];
    payment?: Setting[];
  };
}

interface EmailTemplate {
  key: string;
  label: string;
  variables: string[];
}

const Settings: React.FC<Props> = ({ settings }) => {
  const [activeTab, setActiveTab] = useState<'mail' | 'whatsapp' | 'general' | 'contact' | 'payment'>('mail');
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
    {
      key: 'enrollment_verified',
      label: 'Email de Matrícula Verificada',
      variables: ['nombre_estudiante', 'codigo_matricula', 'email', 'nivel_academico', 'plan_pago', 'verificado_por', 'fecha_verificacion', 'cantidad_documentos', 'url_plataforma']
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

  const contactForm = useForm({
    support_email: settings.contact?.find(s => s.key === 'support_email')?.content || '',
  });

  const paymentForm = useForm({
    plan_change_deadline_days: settings.payment?.find(s => s.key === 'plan_change_deadline_days')?.content || '7',
    allow_partial_payments: settings.payment?.find(s => s.key === 'allow_partial_payments')?.content || 'true',
  });

  const tabs = [
    { id: 'mail', label: 'Templates de Email', icon: RiMailLine },
    { id: 'whatsapp', label: 'Configuración WhatsApp', icon: RiWhatsappLine },
    { id: 'payment', label: 'Configuración de Pagos', icon: RiSettings4Line },
    { id: 'general', label: 'Configuración General', icon: RiGlobalLine },
    { id: 'contact', label: 'Información de Contacto', icon: RiMailLine },
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

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const settingsArray = [
      {
        key: 'support_email',
        content: contactForm.data.support_email,
        type: 'contact',
        description: 'Email de soporte técnico para estudiantes',
      },
    ];

    contactForm.transform(() => ({ settings: settingsArray }));
    contactForm.post('/admin/settings', {
      onSuccess: () => {
        toast.success('Configuración guardada', {
          description: 'El email de soporte ha sido actualizado',
          duration: 4000,
        });
      },
    });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const settingsArray = [
      {
        key: 'plan_change_deadline_days',
        content: paymentForm.data.plan_change_deadline_days,
        type: 'payment',
        description: 'Días límite desde la matrícula para cambiar de plan',
      },
      {
        key: 'allow_partial_payments',
        content: paymentForm.data.allow_partial_payments,
        type: 'payment',
        description: 'Permitir pagos parciales de cualquier monto aplicados al total',
      },
    ];

    paymentForm.transform(() => ({ settings: settingsArray }));
    paymentForm.post('/admin/settings', {
      onSuccess: () => {
        toast.success('Configuración guardada', {
          description: 'Las configuraciones de pago han sido actualizadas',
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
                    onClick={() => setActiveTab(tab.id as 'mail' | 'whatsapp' | 'general' | 'contact' | 'payment')}
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
                      menubar: 'file edit view insert format tools table help',
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'help', 'wordcount', 'visualchars', 'pagebreak'
                      ],
                      toolbar: 'undo redo | formatselect | bold italic underline forecolor backcolor | ' +
                        'alignleft aligncenter alignright alignjustify | ' +
                        'bullist numlist outdent indent | link image media | ' +
                        'table tabledelete | code | removeformat | help',
                      image_title: true,
                      image_advtab: true,
                      automatic_uploads: true,
                      file_picker_types: 'image',
                      images_upload_url: '/admin/upload-image',
                      relative_urls: false,
                      remove_script_host: false,
                      convert_urls: true,
                      extended_valid_elements: 'img[data-src|src|alt|style|width|height|class]',
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
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                      setup: (editor) => {
                        // Limpia cualquier base antes de variables o URLs absolutas en src y href
                        const cleanSrcHref = (html: string) => {
                          // Para src de imágenes
                          html = html.replace(/src="[^"]*({{[^}]+}})"/g, 'src="$1"');
                          html = html.replace(/src="[^"]*(https?:\/\/[^"}]+)"/g, 'src="$1"');
                          // Para href de enlaces
                          html = html.replace(/href="[^"]*({{[^}]+}})"/g, 'href="$1"');
                          html = html.replace(/href="[^"]*(https?:\/\/[^"}]+)"/g, 'href="$1"');
                          return html;
                        };
                        
                        editor.on('BeforeSetContent', function (e) {
                          if (e.content && typeof e.content === 'string') {
                            e.content = cleanSrcHref(e.content);
                          }
                        });
                        
                        editor.on('PostProcess', function (e) {
                          if (e.content && typeof e.content === 'string') {
                            e.content = cleanSrcHref(e.content);
                          }
                        });
                      }
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

            {/* Contact Tab */}
            {activeTab === 'contact' && (
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <Input
                  label="Email de Soporte"
                  type="email"
                  value={contactForm.data.support_email}
                  onChange={(e) => contactForm.setData('support_email', e.target.value)}
                  helperText="Email que se mostrará a los estudiantes para soporte técnico"
                  variant="outlined"
                />

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Nota:</strong> Este email se muestra en las notificaciones y modales de confirmación de documentos para que los estudiantes puedan contactar con soporte.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={contactForm.processing}
                    className="inline-flex items-center px-6 py-3 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <RiSaveLine className="h-5 w-5 mr-2" />
                    {contactForm.processing ? 'Guardando...' : 'Guardar Email'}
                  </button>
                </div>
              </form>
            )}

            {/* Payment Configuration Tab */}
            {activeTab === 'payment' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    ⚙️ Configuraciones de Sistema de Pagos
                  </h3>
                  <p className="text-sm text-slate-700">
                    Estas configuraciones afectan el comportamiento del sistema de pagos y cambios de plan para todos los estudiantes.
                  </p>
                </div>

                {/* Días para cambiar de plan */}
                <div>
                  <Input
                    label="Días límite para cambiar de plan"
                    type="number"
                    min="0"
                    max="30"
                    value={paymentForm.data.plan_change_deadline_days}
                    onChange={(e) => paymentForm.setData('plan_change_deadline_days', e.target.value)}
                    helperText="Número de días desde la matrícula en que el estudiante puede cambiar su plan de pago (ej: 7 días)"
                    variant="outlined"
                  />
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-900">
                      <strong>⚠️ Importante:</strong> Solo los estudiantes que no tengan cuotas pagadas o verificadas podrán cambiar de plan, incluso dentro de este período.
                    </p>
                  </div>
                </div>

                {/* Permitir pagos parciales */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permitir pagos parciales
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="allow_partial_payments"
                        value="true"
                        checked={paymentForm.data.allow_partial_payments === 'true'}
                        onChange={(e) => paymentForm.setData('allow_partial_payments', e.target.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Sí, permitir pagos parciales</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="allow_partial_payments"
                        value="false"
                        checked={paymentForm.data.allow_partial_payments === 'false'}
                        onChange={(e) => paymentForm.setData('allow_partial_payments', e.target.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">No, solo pagos completos</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Si se habilita, los estudiantes podrán pagar cualquier monto que deseen aplicado al total de su plan de pagos.
                  </p>
                </div>

                {/* Vista previa de configuración */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">📊 Resumen de Configuración Actual:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Días para cambiar plan:</span>
                      <span className="font-bold text-slate-900">{paymentForm.data.plan_change_deadline_days} días</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Pagos parciales:</span>
                      <span className={`font-bold ${paymentForm.data.allow_partial_payments === 'true' ? 'text-green-600' : 'text-red-600'}`}>
                        {paymentForm.data.allow_partial_payments === 'true' ? '✓ Habilitados (monto libre)' : '✗ Deshabilitados'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={paymentForm.processing}
                    className="inline-flex items-center px-6 py-3 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <RiSaveLine className="h-5 w-5 mr-2" />
                    {paymentForm.processing ? 'Guardando...' : 'Guardar Configuración de Pagos'}
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
