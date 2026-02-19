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
  RiSaveLine,
  RiFileTextLine,
  RiSecurePaymentLine,
  RiBankCardLine,
  RiCalendarLine
} from 'react-icons/ri';
import { toast } from 'sonner';
import PaymentMethodsConfig from '@/components/PaymentMethodsConfig';

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
  const [activeTab, setActiveTab] = useState<'mail' | 'whatsapp' | 'general' | 'contact' | 'payment' | 'contract' | 'schedule' | 'receipt' | 'kulki' | 'payment_methods' | 'classes'>('mail');
  const [selectedMailTemplate, setSelectedMailTemplate] = useState<string>('prospect_welcome');

  // Configuración de templates de email
  const emailTemplates: EmailTemplate[] = [
    {
      key: 'prospect_welcome',
      label: 'Email de Bienvenida a Prospectos',
      variables: ['nombre_estudiante', 'nombre_asesor', 'email_asesor', 'telefono_asesor', 'fecha_registro', 'url_plataforma']
    },
    {
      key: 'contract_email',
      label: 'Email de Contrato de Matrícula (con PDF adjunto)',
      variables: ['nombre_estudiante', 'codigo_matricula', 'nivel_academico', 'plan_pago', 'url_contrato', 'fecha_actual']
    },
    {
      key: 'contract_signed_student',
      label: 'Email de Confirmación de Firma (Aprendiz)',
      variables: ['nombre_estudiante', 'codigo_matricula', 'nivel_academico', 'plan_pago', 'fecha_actual']
    },
    {
      key: 'contract_signed_admin',
      label: 'Notificación de Contrato Firmado (Admin)',
      variables: ['nombre_estudiante', 'codigo_matricula', 'nivel_academico', 'plan_pago', 'asesor', 'fecha_firma']
    },
    {
      key: 'contract_signed_advisor',
      label: 'Notificación de Contrato Firmado (Asesor)',
      variables: ['nombre_asesor', 'nombre_estudiante', 'codigo_matricula', 'nivel_academico', 'plan_pago', 'fecha_firma']
    },
    {
      key: 'student_enrolled',
      label: 'Email de Credenciales para Aprendices Matriculados',
      variables: ['nombre_estudiante', 'codigo_matricula', 'email', 'contrasena', 'url_plataforma', 'nivel_academico', 'plan_pago']
    },
    {
      key: 'enrollment_verified',
      label: 'Email de Matrícula Verificada',
      variables: ['nombre_estudiante', 'codigo_matricula', 'email', 'nivel_academico', 'plan_pago', 'verificado_por', 'fecha_verificacion', 'cantidad_documentos', 'url_plataforma']
    },
    {
      key: 'payment_receipt_email',
      label: 'Email de Comprobante de Pago',
      variables: [
        'nombre_estudiante', 'tipo_documento', 'numero_documento', 'direccion_cliente',
        'descripcion_servicio', 'precio_unitario', 'valor_venta',
        'monto_pagado', 'fecha_pago', 'numero_cuota', 'codigo_operacion', 'metodo_pago',
        'op_gravada', 'igv', 'importe_total',
        'fecha_emision', 'numero_comprobante', 'fecha_autorizacion', 'hash_comprobante',
        'url_plataforma'
      ]
    },
  ];

  // Form states por tab
  const mailForm = useForm({
    settings: (settings.mail || []).reduce((acc, s) => {
      acc[s.key] = s.content;
      return acc;
    }, {} as Record<string, string>)
  });

  const contractForm = useForm({
    contract_template: settings.general?.find(s => s.key === 'contract_template')?.content || '',
  });

  const scheduleForm = useForm({
    payment_schedule_template: settings.general?.find(s => s.key === 'payment_schedule_template')?.content || '',
  });

  const receiptForm = useForm({
    payment_receipt_template: settings.general?.find(s => s.key === 'payment_receipt_template')?.content || '',
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

  const kulkiForm = useForm({
    culqi_public_key: settings.general?.find(s => s.key === 'culqi_public_key')?.content || '',
    culqi_api_key: settings.general?.find(s => s.key === 'culqi_api_key')?.content || '',
    culqi_api_url: settings.general?.find(s => s.key === 'culqi_api_url')?.content || 'https://api.culqi.com',
  });

  const classesForm = useForm({
    class_request_min_advance_hours: settings.general?.find(s => s.key === 'class_request_min_advance_hours')?.content || '1',
    class_request_max_advance_hours: settings.general?.find(s => s.key === 'class_request_max_advance_hours')?.content || '2',
    class_operation_start_hour: settings.general?.find(s => s.key === 'class_operation_start_hour')?.content || '8',
    class_operation_end_hour: settings.general?.find(s => s.key === 'class_operation_end_hour')?.content || '22',
    class_max_students: settings.general?.find(s => s.key === 'class_max_students')?.content || '6',
  });

  const sections = [
    {
      title: 'General',
      items: [
        { id: 'general', label: 'General', icon: RiGlobalLine },
        { id: 'contact', label: 'Contacto', icon: RiMailLine },
      ]
    },
    {
      title: 'Comunicación',
      items: [
        { id: 'mail', label: 'Templates Email', icon: RiMailLine },
        { id: 'whatsapp', label: 'WhatsApp', icon: RiWhatsappLine },
      ]
    },
    {
      title: 'Pagos y Facturación',
      items: [
        { id: 'payment', label: 'Configuración Pagos', icon: RiSettings4Line },
        { id: 'payment_methods', label: 'Métodos de Pago', icon: RiBankCardLine },
        { id: 'kulki', label: 'Pasarela Culqi', icon: RiSecurePaymentLine },
        { id: 'schedule', label: 'Cronograma', icon: RiFileTextLine },
        { id: 'receipt', label: 'Comprobantes', icon: RiFileTextLine },
      ]
    },
    {
      title: 'Académico y Legal',
      items: [
        { id: 'classes', label: 'Clases', icon: RiCalendarLine },
        { id: 'contract', label: 'Contrato', icon: RiFileTextLine },
      ]
    }
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
        description: 'Email de soporte técnico para aprendices',
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

  const handleContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const settingsArray = [
      {
        key: 'contract_template',
        content: contractForm.data.contract_template,
        type: 'general',
        description: 'Plantilla de contrato digital para aprendices',
      },
    ];

    contractForm.transform(() => ({ settings: settingsArray }));
    contractForm.post('/admin/settings', {
      onSuccess: () => {
        toast.success('Configuración guardada', {
          description: 'La plantilla de contrato ha sido actualizada',
          duration: 4000,
        });
      },
      onError: () => {
        toast.error('Error', {
          description: 'No se pudo guardar la plantilla de contrato',
          duration: 4000,
        });
      }
    });
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const settingsArray = [
      {
        key: 'payment_schedule_template',
        content: scheduleForm.data.payment_schedule_template,
        type: 'general',
        description: 'Plantilla de cronograma de pagos para aprendices',
      },
    ];

    scheduleForm.transform(() => ({ settings: settingsArray }));
    scheduleForm.post('/admin/settings', {
      onSuccess: () => {
        toast.success('Configuración guardada', {
          description: 'La plantilla de cronograma de pagos ha sido actualizada',
          duration: 4000,
        });
      },
      onError: () => {
        toast.error('Error', {
          description: 'No se pudo guardar la plantilla de cronograma',
          duration: 4000,
        });
      }
    });
  };

  const handleReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const settingsArray = [
      {
        key: 'payment_receipt_template',
        content: receiptForm.data.payment_receipt_template,
        type: 'general',
        description: 'Plantilla de comprobante de pago para aprendices',
      },
    ];

    receiptForm.transform(() => ({ settings: settingsArray }));
    receiptForm.post('/admin/settings', {
      onSuccess: () => {
        toast.success('Configuración guardada', {
          description: 'La plantilla de comprobante ha sido actualizada',
          duration: 4000,
        });
      },
      onError: () => {
        toast.error('Error', {
          description: 'No se pudo guardar la plantilla de comprobante',
          duration: 4000,
        });
      }
    });
  };

  const handleKulkiSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const settingsArray = [
      {
        key: 'culqi_public_key',
        content: kulkiForm.data.culqi_public_key,
        type: 'general',
        description: 'Clave pública de Culqi para tokenización en frontend',
      },
      {
        key: 'culqi_api_key',
        content: kulkiForm.data.culqi_api_key,
        type: 'general',
        description: 'Clave API secreta de Culqi',
      },
      {
        key: 'culqi_api_url',
        content: kulkiForm.data.culqi_api_url,
        type: 'general',
        description: 'URL de la API de Culqi',
      },
    ];

    kulkiForm.transform(() => ({ settings: settingsArray }));
    kulkiForm.post('/admin/settings', {
      onSuccess: () => {
        toast.success('Configuración guardada', {
          description: 'La configuración de Culqi ha sido actualizada',
          duration: 4000,
        });
      },
      onError: () => {
        toast.error('Error', {
          description: 'No se pudo guardar la configuración de Culqi',
          duration: 4000,
        });
      }
    });
  };

  const handleClassesSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const settingsArray = [
      {
        key: 'class_request_min_advance_hours',
        content: classesForm.data.class_request_min_advance_hours,
        type: 'general',
        description: 'Anticipación mínima en horas para solicitar clase',
      },
      {
        key: 'class_request_max_advance_hours',
        content: classesForm.data.class_request_max_advance_hours,
        type: 'general',
        description: 'Anticipación máxima en horas para solicitar clase',
      },
      {
        key: 'class_operation_start_hour',
        content: classesForm.data.class_operation_start_hour,
        type: 'general',
        description: 'Hora de inicio de operación para clases',
      },
      {
        key: 'class_operation_end_hour',
        content: classesForm.data.class_operation_end_hour,
        type: 'general',
        description: 'Hora de fin de operación para clases',
      },
      {
        key: 'class_max_students',
        content: classesForm.data.class_max_students,
        type: 'general',
        description: 'Número máximo de aprendices por clase',
      },
    ];

    classesForm.transform(() => ({ settings: settingsArray }));
    classesForm.post('/admin/settings', {
      onSuccess: () => {
        toast.success('Configuración guardada', {
          description: 'La configuración de clases ha sido actualizada',
          duration: 4000,
        });
      },
      onError: () => {
        toast.error('Error', {
          description: 'No se pudo guardar la configuración de clases',
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

        {/* Tabs Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-6 sticky top-6">
            {sections.map((section, idx) => (
              <div key={idx}>
                <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group ${
                          activeTab === item.id
                            ? 'bg-white text-[#073372] shadow-sm border border-gray-200'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`mr-3 h-5 w-5 transition-colors ${
                          activeTab === item.id ? 'text-[#17BC91]' : 'text-gray-400 group-hover:text-gray-500'
                        }`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px]">
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
                      paste_data_images: true,
                      file_picker_types: 'image',
                      images_upload_url: '/admin/upload-image',
                      relative_urls: false,
                      remove_script_host: false,
                      convert_urls: true,
                      extended_valid_elements: 'img[data-src|src|alt|style|width|height|class]',
                      images_upload_handler: (blobInfo) => new Promise((resolve, reject) => {
                        (async () => {
                          try {
                            // Primero obtener el CSRF cookie
                            await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });

                            const formData = new FormData();
                            formData.append('file', blobInfo.blob(), blobInfo.filename());

                            // Obtener el token CSRF de las cookies
                            const getCookie = (name: string) => {
                              const value = `; ${document.cookie}`;
                              const parts = value.split(`; ${name}=`);
                              if (parts.length === 2) return parts.pop()?.split(';').shift();
                              return '';
                            };

                            const csrfToken = decodeURIComponent(getCookie('XSRF-TOKEN') || '');

                            const response = await fetch('/admin/upload-image', {
                              method: 'POST',
                              body: formData,
                              credentials: 'same-origin',
                              headers: {
                                'X-XSRF-TOKEN': csrfToken
                              }
                            });

                            const result = await response.json();

                            if (result.location) {
                              resolve(result.location);
                            } else {
                              reject('Error al subir imagen');
                            }
                          } catch {
                            reject('Error al subir imagen');
                          }
                        })();
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

            {/* Contract Template Tab */}
            {activeTab === 'contract' && (
              <form onSubmit={handleContractSubmit} className="space-y-6">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <RiFileTextLine className="w-6 h-6 text-emerald-600" />
                    📄 Plantilla de Contrato Digital
                  </h3>
                  <p className="text-sm text-slate-700">
                    Esta plantilla se genera automáticamente cuando un prospecto pasa de <strong>"Reunión Realizada"</strong> a <strong>"Pago Por Verificar"</strong>.
                    El aprendiz recibirá un email con un enlace para revisar y aceptar el contrato digitalmente.
                  </p>
                </div>

                {/* Editor for Contract Template */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Contenido de la Plantilla de Contrato</h3>
                  </div>

                  <Editor
                    apiKey="0nai4nwo1mc0dumfyzl8re1odbzzr1fz4gfwzpgu5ghdnu4n"
                    value={contractForm.data.contract_template}
                    onEditorChange={(content) => {
                      contractForm.setData('contract_template', content);
                    }}
                    init={{
                      height: 600,
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
                      automatic_uploads: true,
                      paste_data_images: true,
                      file_picker_types: 'image',
                      images_upload_url: '/admin/upload-image',
                      relative_urls: false,
                      remove_script_host: false,
                      convert_urls: true,
                      images_upload_handler: (blobInfo) => new Promise((resolve, reject) => {
                        (async () => {
                          try {
                            // Primero obtener el CSRF cookie
                            await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });

                            const formData = new FormData();
                            formData.append('file', blobInfo.blob(), blobInfo.filename());

                            // Obtener el token CSRF de las cookies
                            const getCookie = (name: string) => {
                              const value = `; ${document.cookie}`;
                              const parts = value.split(`; ${name}=`);
                              if (parts.length === 2) return parts.pop()?.split(';').shift();
                              return '';
                            };

                            const csrfToken = decodeURIComponent(getCookie('XSRF-TOKEN') || '');

                            const response = await fetch('/admin/upload-image', {
                              method: 'POST',
                              body: formData,
                              credentials: 'same-origin',
                              headers: {
                                'X-XSRF-TOKEN': csrfToken
                              }
                            });

                            const result = await response.json();

                            if (result.location) {
                              resolve(result.location);
                            } else {
                              reject('Error al subir imagen');
                            }
                          } catch {
                            reject('Error al subir imagen');
                          }
                        })();
                      }),
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; padding: 20px; }',
                    }}
                  />

                  {/* Variables disponibles */}
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                    <h4 className="font-semibold text-emerald-900 mb-2">Variables Disponibles:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{nombre_estudiante}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{documento_estudiante}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{email_estudiante}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{telefono_estudiante}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{nivel_academico}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{plan_pago}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{monto_total}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{fecha_matricula}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{codigo_matricula}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{usuario}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{contrasena}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{nombre_apoderado}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{documento_apoderado}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300">{'{{fecha_actual}}'}</code>
                    </div>
                    <p className="text-sm text-emerald-800 mt-3">
                      <strong>Nota:</strong> Estas variables se reemplazarán automáticamente con los datos del aprendiz al generar el contrato.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={contractForm.processing}
                    className="inline-flex items-center px-6 py-3 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <RiSaveLine className="h-5 w-5 mr-2" />
                    {contractForm.processing ? 'Guardando...' : 'Guardar Plantilla de Contrato'}
                  </button>
                </div>
              </form>
            )}



            {/* Payment Schedule Template Tab */}
            {activeTab === 'schedule' && (
              <form onSubmit={handleScheduleSubmit} className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <RiFileTextLine className="w-6 h-6 text-purple-600" />
                    📅 Plantilla de Cronograma de Pagos
                  </h3>
                  <p className="text-sm text-slate-700">
                    Esta plantilla se genera automáticamente cuando se envían los documentos de verificación al aprendiz.
                    El cronograma muestra todas las cuotas, fechas de vencimiento, estados de pago y montos.
                  </p>
                </div>

                {/* Editor for Schedule Template */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Contenido de la Plantilla de Cronograma</h3>
                  </div>

                  <Editor
                    apiKey="0nai4nwo1mc0dumfyzl8re1odbzzr1fz4gfwzpgu5ghdnu4n"
                    value={scheduleForm.data.payment_schedule_template}
                    onEditorChange={(content) => {
                      scheduleForm.setData('payment_schedule_template', content);
                    }}
                    init={{
                      height: 600,
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
                      automatic_uploads: true,
                      paste_data_images: true,
                      file_picker_types: 'image',
                      images_upload_url: '/admin/upload-image',
                      relative_urls: false,
                      remove_script_host: false,
                      convert_urls: true,
                      images_upload_handler: (blobInfo) => new Promise((resolve, reject) => {
                        (async () => {
                          try {
                            await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });
                            const formData = new FormData();
                            formData.append('file', blobInfo.blob(), blobInfo.filename());
                            const getCookie = (name: string) => {
                              const value = `; ${document.cookie}`;
                              const parts = value.split(`; ${name}=`);
                              if (parts.length === 2) return parts.pop()?.split(';').shift();
                              return '';
                            };
                            const csrfToken = decodeURIComponent(getCookie('XSRF-TOKEN') || '');
                            const response = await fetch('/admin/upload-image', {
                              method: 'POST',
                              body: formData,
                              credentials: 'same-origin',
                              headers: { 'X-XSRF-TOKEN': csrfToken }
                            });
                            const result = await response.json();
                            if (result.location) resolve(result.location);
                            else reject('Error al subir imagen');
                          } catch { reject('Error al subir imagen'); }
                        })();
                      }),
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; padding: 20px; }',
                    }}
                  />

                  {/* Variables disponibles */}
                  <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">Variables Disponibles:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <code className="bg-white px-2 py-1 rounded border border-purple-300">{'{{nombre_estudiante}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-purple-300">{'{{codigo_matricula}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-purple-300">{'{{nivel_academico}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-purple-300">{'{{plan_pago}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-purple-300">{'{{fecha_matricula}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-purple-300">{'{{monto_total}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-purple-300">{'{{total_pagado}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-purple-300">{'{{total_pendiente}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-purple-300">{'{{tabla_cuotas}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-purple-300">{'{{fecha_generacion}}'}</code>
                    </div>
                    <p className="text-sm text-purple-800 mt-3">
                      <strong>Nota Especial:</strong> La variable <code className="bg-white px-1 rounded">{'{{tabla_cuotas}}'}</code> se reemplaza automáticamente 
                      con las filas de la tabla generadas dinámicamente por el sistema. Cada fila incluye: Cuota #, Monto, Fecha Vencimiento, Fecha Pago, Monto Pagado y Estado.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={scheduleForm.processing}
                    className="inline-flex items-center px-6 py-3 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <RiSaveLine className="h-5 w-5 mr-2" />
                    {scheduleForm.processing ? 'Guardando...' : 'Guardar Plantilla de Cronograma'}
                  </button>
                </div>
              </form>
            )}


            {/* Receipt Template Tab */}
            {activeTab === 'receipt' && (
              <form onSubmit={handleReceiptSubmit} className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <RiFileTextLine className="w-6 h-6 text-blue-600" />
                    📄 Plantilla de Comprobante de Pago
                  </h3>
                  <p className="text-sm text-slate-700">
                    Esta plantilla se utiliza para generar el PDF del comprobante de pago cuando un cajero verifica un pago.
                    El aprendiz recibirá este comprobante por correo electrónico.
                  </p>
                </div>

                {/* Editor for Receipt Template */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Contenido del Comprobante</h3>
                  </div>

                  <Editor
                    apiKey="0nai4nwo1mc0dumfyzl8re1odbzzr1fz4gfwzpgu5ghdnu4n"
                    value={receiptForm.data.payment_receipt_template}
                    onEditorChange={(content) => {
                      receiptForm.setData('payment_receipt_template', content);
                    }}
                    init={{
                      height: 600,
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
                      automatic_uploads: true,
                      paste_data_images: true,
                      file_picker_types: 'image',
                      images_upload_url: '/admin/upload-image',
                      relative_urls: false,
                      remove_script_host: false,
                      convert_urls: true,
                      images_upload_handler: (blobInfo) => new Promise((resolve, reject) => {
                        (async () => {
                          try {
                            await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });
                            const formData = new FormData();
                            formData.append('file', blobInfo.blob(), blobInfo.filename());
                            const getCookie = (name: string) => {
                              const value = `; ${document.cookie}`;
                              const parts = value.split(`; ${name}=`);
                              if (parts.length === 2) return parts.pop()?.split(';').shift();
                              return '';
                            };
                            const csrfToken = decodeURIComponent(getCookie('XSRF-TOKEN') || '');
                            const response = await fetch('/admin/upload-image', {
                              method: 'POST',
                              body: formData,
                              credentials: 'same-origin',
                              headers: { 'X-XSRF-TOKEN': csrfToken }
                            });
                            const result = await response.json();
                            if (result.location) resolve(result.location);
                            else reject('Error al subir imagen');
                          } catch { reject('Error al subir imagen'); }
                        })();
                      }),
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; padding: 20px; }',
                    }}
                  />

                  {/* Variables disponibles */}
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Variables Disponibles:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <code className="bg-white px-2 py-1 rounded border border-blue-300">{'{{nombre_estudiante}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-blue-300">{'{{documento_estudiante}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-blue-300">{'{{monto_pagado}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-blue-300">{'{{metodo_pago}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-blue-300">{'{{fecha_pago}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-blue-300">{'{{numero_cuota}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-blue-300">{'{{concepto}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-blue-300">{'{{codigo_operacion}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-blue-300">{'{{fecha_emision}}'}</code>
                      <code className="bg-white px-2 py-1 rounded border border-blue-300">{'{{cajero}}'}</code>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={receiptForm.processing}
                    className="inline-flex items-center px-6 py-3 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <RiSaveLine className="h-5 w-5 mr-2" />
                    {receiptForm.processing ? 'Guardando...' : 'Guardar Plantilla de Comprobante'}
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
                  helperText="Email que se mostrará a los aprendices para soporte técnico"
                  variant="outlined"
                />

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Nota:</strong> Este email se muestra en las notificaciones y modales de confirmación de documentos para que los aprendices puedan contactar con soporte.
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
                    Estas configuraciones afectan el comportamiento del sistema de pagos y cambios de plan para todos los aprendices.
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
                    helperText="Número de días desde la matrícula en que el aprendiz puede cambiar su plan de pago (ej: 7 días)"
                    variant="outlined"
                  />
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-900">
                      <strong>⚠️ Importante:</strong> Solo los aprendices que no tengan cuotas pagadas o verificadas podrán cambiar de plan, incluso dentro de este período.
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
                    Si se habilita, los aprendices podrán pagar cualquier monto que deseen aplicado al total de su plan de pagos.
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

            {/* Classes Configuration Tab */}
            {activeTab === 'classes' && (
              <form onSubmit={handleClassesSubmit} className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    📅 Configuración de Solicitud de Clases
                  </h3>
                  <p className="text-sm text-slate-700">
                    Configura las reglas de anticipación y horarios de operación para que los aprendices regulares puedan solicitar clases.
                  </p>
                </div>

                {/* Anticipación */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    ⏱️ Reglas de Anticipación
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Define la ventana de tiempo en que un aprendiz regular puede solicitar una clase. 
                    Por ejemplo, si configuras <strong>mínimo 1 hora</strong> y <strong>máximo 2 horas</strong>, 
                    un aprendiz que solicite entre las 2pm y 3pm podrá inscribirse para la clase de las 4pm.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Anticipación mínima (horas)"
                      type="number"
                      min="1"
                      max="24"
                      value={classesForm.data.class_request_min_advance_hours}
                      onChange={(e) => classesForm.setData('class_request_min_advance_hours', e.target.value)}
                      helperText="Mínimo de horas antes de la clase"
                      variant="outlined"
                    />
                    <Input
                      label="Anticipación máxima (horas)"
                      type="number"
                      min="1"
                      max="24"
                      value={classesForm.data.class_request_max_advance_hours}
                      onChange={(e) => classesForm.setData('class_request_max_advance_hours', e.target.value)}
                      helperText="Máximo de horas antes de la clase"
                      variant="outlined"
                    />
                  </div>
                </div>

                {/* Horario de operación */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    🕐 Horario de Operación
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Define el rango de horas en que se pueden programar clases. Solo se mostrarán slots dentro de este horario.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hora de inicio</label>
                      <select
                        value={classesForm.data.class_operation_start_hour}
                        onChange={(e) => classesForm.setData('class_operation_start_hour', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent transition-all"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}:00 {i < 12 ? 'AM' : 'PM'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hora de fin</label>
                      <select
                        value={classesForm.data.class_operation_end_hour}
                        onChange={(e) => classesForm.setData('class_operation_end_hour', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent transition-all"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}:00 {i < 12 ? 'AM' : 'PM'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Max Students */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    🎓 Capacidad de Clases
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Define el número máximo de aprendices permitidos por clase. Esto se utilizará como valor predeterminado al crear nuevos grupos.
                  </p>
                  
                  <div className="max-w-md">
                    <Input
                      label="Máximo de Aprendices por Clase"
                      type="number"
                      min="1"
                      max="50"
                      value={classesForm.data.class_max_students}
                      onChange={(e) => classesForm.setData('class_max_students', e.target.value)}
                      helperText="Capacidad máxima sugerida para nuevas clases"
                      variant="outlined"
                    />
                  </div>
                </div>

                {/* Vista previa */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-900 mb-3">📊 Resumen de Configuración:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700">Ventana de anticipación:</span>
                      <span className="font-bold text-purple-900">
                        {classesForm.data.class_request_min_advance_hours} - {classesForm.data.class_request_max_advance_hours} horas antes
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700">Horario de operación:</span>
                      <span className="font-bold text-purple-900">
                        {classesForm.data.class_operation_start_hour.toString().padStart(2, '0')}:00 - {classesForm.data.class_operation_end_hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700">Capacidad Máxima:</span>
                      <span className="font-bold text-purple-900">
                        {classesForm.data.class_max_students} aprendices
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ejemplo explicativo */}
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">💡 Ejemplo de Funcionamiento:</h4>
                  <p className="text-sm text-blue-800">
                    Con la configuración actual, si un aprendiz regular solicita una clase a las <strong>2:30 PM</strong>:
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                    <li>Se verifica que esté dentro del horario de operación ({classesForm.data.class_operation_start_hour}:00 - {classesForm.data.class_operation_end_hour}:00)</li>
                    <li>Se calcula el slot disponible: 2:30 PM + {classesForm.data.class_request_max_advance_hours} horas = <strong>{parseInt(classesForm.data.class_operation_start_hour) <= 14 + parseInt(classesForm.data.class_request_max_advance_hours) ? `${14 + parseInt(classesForm.data.class_request_max_advance_hours)}:00` : 'siguiente día'}</strong></li>
                    <li>Se muestran los grupos existentes para ese horario o la opción de crear uno nuevo</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={classesForm.processing}
                    className="inline-flex items-center px-6 py-3 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <RiSaveLine className="h-5 w-5 mr-2" />
                    {classesForm.processing ? 'Guardando...' : 'Guardar Configuración de Clases'}
                  </button>
                </div>
              </form>
            )}

            {/* Culqi Configuration Tab */}
            {activeTab === 'kulki' && (
              <form onSubmit={handleKulkiSubmit} className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    💳 Configuración de Pasarela Culqi
                  </h3>
                  <p className="text-sm text-slate-700">
                    Configura las credenciales de tu cuenta de Culqi para procesar pagos con tarjeta de crédito.
                  </p>
                </div>

                {/* Public Key */}
                <div>
                  <Input
                    label="Clave Pública (Public Key)"
                    type="text"
                    value={kulkiForm.data.culqi_public_key}
                    onChange={(e) => kulkiForm.setData('culqi_public_key', e.target.value)}
                    helperText="Clave pública de Culqi para tokenización en el frontend. Comienza con 'pk_live_' o 'pk_test_'"
                    variant="outlined"
                    placeholder="pk_live_xxxxxxxxxxxxxxxxxx"
                  />
                </div>

                {/* Secret Key */}
                <div>
                  <Input
                    label="Clave Secreta (API Key)"
                    type="password"
                    value={kulkiForm.data.culqi_api_key}
                    onChange={(e) => kulkiForm.setData('culqi_api_key', e.target.value)}
                    helperText="Clave secreta de Culqi para procesar cargos. Comienza con 'sk_live_' o 'sk_test_' - ¡NO COMPARTIR!"
                    variant="outlined"
                    placeholder="sk_live_xxxxxxxxxxxxxxxxxx"
                  />
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-900">
                      <strong>🔒 Seguridad:</strong> Esta clave es confidencial y no debe ser compartida. Se utiliza solo en el servidor.
                    </p>
                  </div>
                </div>

                {/* API URL */}
                <div>
                  <Input
                    label="URL de API"
                    type="text"
                    value={kulkiForm.data.culqi_api_url}
                    onChange={(e) => kulkiForm.setData('culqi_api_url', e.target.value)}
                    helperText="URL base de la API de Culqi (generalmente https://api.culqi.com)"
                    variant="outlined"
                    placeholder="https://api.culqi.com"
                  />
                </div>

                {/* Info Box */}
                <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">📘 Cómo Funciona Culqi:</h4>
                  <div className="text-sm text-blue-900 space-y-2">
                    <p><strong>1. Tokenización en Frontend:</strong> Culqi Checkout captura los datos de la tarjeta del cliente y los convierte en un token seguro (sin exponer los datos).</p>
                    <p><strong>2. Envío al Backend:</strong> El token se envía a tu servidor donde se procesa el cargo usando tu clave secreta.</p>
                    <p><strong>3. Confirmación Instantánea:</strong> Culqi responde inmediatamente si el pago fue aprobado o rechazado.</p>
                  </div>
                </div>

                {/* Setup Instructions */}
                <div className="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-3">⚙️ Instrucciones de Configuración:</h4>
                  <ol className="text-sm text-yellow-900 space-y-2 list-decimal list-inside">
                    <li>Crea una cuenta en <a href="https://culqi.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">culqi.com</a></li>
                    <li>Completa el proceso de KYC (verificación de identidad)</li>
                    <li>Ve a <strong>Desarrollo → API Keys</strong> en tu panel de Culqi</li>
                    <li>Copia tu clave pública (pk_test_...) y clave secreta (sk_test_...)</li>
                    <li>Pega las credenciales aquí y guarda</li>
                    <li>Para producción, usa las claves pk_live_... y sk_live_...</li>
                  </ol>
                </div>

                {/* Features */}
                <div className="p-5 bg-green-50 border-2 border-green-200 rounded-xl">
                  <h4 className="text-sm font-semibold text-green-900 mb-3">✅ Funcionalidades Habilitadas:</h4>
                  <ul className="text-sm text-green-900 space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">💳</span>
                      <span>Pagos con tarjeta de crédito/débito (Visa, Mastercard, Amex, Diners)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">🔄</span>
                      <span>Pagos automáticos recurrentes (auto-cobro mensual)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">💾</span>
                      <span>Almacenamiento seguro de tarjetas tokenizadas</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">⚡</span>
                      <span>Aprobación instantánea de pagos (sin esperar verificación manual)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">🔒</span>
                      <span>Seguridad PCI-DSS compliant (Culqi se encarga de la seguridad)</span>
                    </li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={kulkiForm.processing}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <RiSaveLine className="h-5 w-5 mr-2" />
                    {kulkiForm.processing ? 'Guardando...' : 'Guardar Configuración de Culqi'}
                  </button>
                </div>
              </form>
            )}

            {/* Payment Methods (Yape y Transferencias) Tab */}
            {activeTab === 'payment_methods' && (
              <div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                  <h4 className="text-lg font-bold text-blue-900 mb-2">📱 Configuración de Métodos de Pago Tradicionales</h4>
                  <p className="text-sm text-blue-800">
                    Configura los métodos de pago Yape y Transferencia Bancaria que estarán disponibles para los aprendices. 
                    Puedes agregar múltiples cuentas de cada tipo.
                  </p>
                </div>

                <PaymentMethodsConfig />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
</AuthenticatedLayout>
  );
};

export default Settings;
