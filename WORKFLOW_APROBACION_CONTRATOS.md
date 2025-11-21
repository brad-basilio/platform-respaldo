# 📋 Flujo de Aprobación de Contratos - Guía Completa

## 🎯 Objetivo
Implementar un sistema de aprobación de contratos donde el asesor debe revisar y aprobar el contrato firmado por el estudiante antes de enviar los emails y cambiar el estado del prospecto.

---

## 🔄 Flujo Completo del Proceso

### **Paso 1: Asesor Envía Propuesta** 
📍 **Estado:** `propuesta_enviada`

1. El asesor completa los datos del prospecto en el Kanban
2. Mueve el prospecto a la columna **"Propuesta Enviada"**
3. El sistema:
   - ✅ Genera PDF del contrato SIN firma
   - ✅ Crea registro en `contract_acceptances` con token único
   - ✅ Envía email al estudiante con link para aceptar contrato

---

### **Paso 2: Estudiante Firma el Contrato** 
📍 **Estado:** `propuesta_enviada` (permanece igual)

1. Estudiante recibe email con link: `/contract/accept/{token}`
2. Estudiante accede al link, ve el contrato y sube su firma
3. El sistema:
   - ✅ Guarda la firma en `storage/app/public/signatures/`
   - ✅ Regenera el PDF del contrato CON la firma
   - ✅ Actualiza `contract_acceptances`:
     - `accepted_at` = timestamp actual
     - `acceptance_ip` = IP del estudiante
     - `signature_path` = ruta de la firma
     - `pdf_path` = ruta del PDF con firma
   - 🔔 **NUEVO:** Dispara evento `ContractSignedByStudent`
   - ❌ **NO envía emails** (esto ahora es responsabilidad del asesor)
   - ❌ **NO cambia el estado** del prospecto

---

### **Paso 3: Asesor Recibe Notificación en Tiempo Real** 
📍 **Estado:** `propuesta_enviada`

1. **Notificación Reverb:**
   - 🔔 El asesor recibe notificación en tiempo real vía WebSocket
   - Canal privado: `advisor.{advisor_id}`
   - Toast aparece en pantalla: *"🔔 Nuevo contrato firmado - {nombre_estudiante} ha firmado su contrato. ¡Revísalo ahora!"*

2. **Modal de Revisión:**
   - Se abre automáticamente el `ContractReviewModal`
   - Muestra:
     - ✅ Vista previa del PDF firmado en iframe
     - ✅ Nombre del estudiante
     - ✅ Dos botones de acción

---

### **Paso 4: Asesor Aprueba o Rechaza** 

#### ✅ **Opción A: APROBAR**
Endpoint: `POST /admin/contracts/{id}/approve`

El sistema:
1. ✅ Marca en BD:
   - `advisor_approved` = true
   - `advisor_approved_at` = timestamp actual
   - `advisor_id` = ID del asesor que aprueba

2. ✅ **Cambia estado del prospecto:**
   - `status` = `pago_por_verificar`

3. ✅ **Envía 3 emails:**
   - 📧 Al estudiante: `ContractSignedStudentMail` (confirmación con PDF adjunto)
   - 📧 Al admin: `ContractSignedAdminMail` (notificación con PDF adjunto)
   - 📧 Al asesor: `ContractSignedAdvisorMail` (confirmación con PDF adjunto)

4. ✅ Cierra el modal
5. ✅ Refresca la lista de prospectos (el prospecto se mueve a "Pago por Verificar")

---

#### ❌ **Opción B: RECHAZAR y REENVIAR**
Endpoint: `POST /admin/contracts/{id}/resend`

El sistema:
1. 🗑️ **Elimina archivos:**
   - Firma anterior (`storage/app/public/signatures/...`)
   - PDF con firma anterior (`storage/app/public/contracts/...`)

2. 🔄 **Resetea registro en BD:**
   - `accepted_at` = NULL
   - `acceptance_ip` = NULL
   - `signature_path` = NULL
   - `contract_content` = NULL

3. 📄 **Regenera contrato SIN firma:**
   - Genera nuevo PDF limpio
   - Actualiza `pdf_path` con nuevo PDF

4. 📧 **Reenvía email al estudiante:**
   - Email: `ContractMail`
   - Contenido: Link para firmar nuevamente el contrato
   - Token: Mismo token original (sigue siendo válido)

5. ✅ Cierra el modal
6. ℹ️ Toast de confirmación: *"Contrato rechazado y reenviado al estudiante para nueva firma"*

---

## 🗄️ Estructura de Base de Datos

### Tabla: `contract_acceptances`

```sql
id                      BIGINT UNSIGNED
student_id              BIGINT UNSIGNED
token                   VARCHAR(255) UNIQUE
contract_content        LONGTEXT
pdf_path                VARCHAR(255)
signature_path          VARCHAR(255) NULLABLE
accepted_at             TIMESTAMP NULLABLE
acceptance_ip           VARCHAR(45) NULLABLE
advisor_approved        BOOLEAN DEFAULT FALSE  ← NUEVO
advisor_approved_at     TIMESTAMP NULLABLE     ← NUEVO
advisor_id              BIGINT UNSIGNED NULLABLE ← NUEVO
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

---

## 🎨 Componentes Frontend

### 1. **ContractReviewModal.tsx**
Ubicación: `resources/js/components/ContractReviewModal.tsx`

**Props:**
```typescript
interface ContractReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAcceptanceId: number | null;
  studentName: string;
  pdfPath: string;
  onApproved: () => void;
  onResent: () => void;
}
```

**Características:**
- ✅ Vista previa del PDF en iframe
- ✅ Botón "Aprobar y Enviar Emails" (verde)
- ✅ Botón "Rechazar y Reenviar" (rojo)
- ✅ Loading states durante las acciones
- ✅ Manejo de errores con toasts

---

### 2. **StudentManagement.tsx (Modificado)**
Ubicación: `resources/js/pages/Admin/StudentManagement.tsx`

**Cambios realizados:**
1. ✅ Importa `usePage` de Inertia
2. ✅ Importa `ContractReviewModal`
3. ✅ Estado nuevo:
   ```typescript
   const [contractReviewOpen, setContractReviewOpen] = useState(false);
   const [pendingContract, setPendingContract] = useState<{
     id: number;
     studentName: string;
     pdfPath: string;
   } | null>(null);
   ```

4. ✅ Obtiene usuario actual:
   ```typescript
   const { props } = usePage<any>();
   const currentUserId = props.auth?.user?.id;
   ```

5. ✅ **Listener de Reverb:**
   ```typescript
   useEffect(() => {
     if (!currentUserId) return;

     const channel = (window as any).Echo.private(`advisor.${currentUserId}`);
     
     channel.listen('ContractSignedByStudent', (data: any) => {
       toast.info('🔔 Nuevo contrato firmado', {
         description: `${data.student_name} ha firmado su contrato. ¡Revísalo ahora!`,
         duration: 8000,
       });
       
       setPendingContract({
         id: data.contract_acceptance_id,
         studentName: data.student_name,
         pdfPath: data.pdf_path,
       });
       setContractReviewOpen(true);
       fetchStudents();
     });

     return () => {
       channel.stopListening('ContractSignedByStudent');
     };
   }, [currentUserId]);
   ```

6. ✅ Renderiza el modal al final del componente

---

## 🔧 Backend - Archivos Modificados/Creados

### 1. **Migration**
`database/migrations/2025_11_20_182407_add_advisor_approval_to_contract_acceptances_table.php`

### 2. **Event**
`app/Events/ContractSignedByStudent.php`
- ✅ Implementa `ShouldBroadcast`
- ✅ Canal privado: `advisor.{advisor_id}`
- ✅ Datos broadcasted:
  ```php
  [
    'contract_acceptance_id' => $this->contractAcceptance->id,
    'student_id' => $this->student->id,
    'student_name' => $this->student->user->name,
    'pdf_path' => $this->contractAcceptance->pdf_path,
    'signed_at' => $this->contractAcceptance->accepted_at,
  ]
  ```

### 3. **Controller: ContractController.php (Modificado)**
`app/Http/Controllers/ContractController.php`

**Método `accept()` modificado:**
```php
// ❌ ANTES: Enviaba emails inmediatamente
Mail::to($student->user->email)->send(new ContractSignedStudentMail(...));
Mail::to($adminUser->email)->send(new ContractSignedAdminMail(...));
Mail::to($advisor->email)->send(new ContractSignedAdvisorMail(...));

// ✅ AHORA: Solo dispara evento
event(new ContractSignedByStudent($contractAcceptance, $contractAcceptance->student));
```

### 4. **Controller: ContractApprovalController.php (Nuevo)**
`app/Http/Controllers/Admin/ContractApprovalController.php`

**Métodos:**
- `show(ContractAcceptance $contractAcceptance)` - Obtener detalles del contrato
- `approve(ContractAcceptance $contractAcceptance)` - Aprobar y enviar emails
- `resend(ContractAcceptance $contractAcceptance)` - Rechazar y reenviar

### 5. **Routes: web.php (Modificado)**
`routes/web.php`

```php
// Dentro del grupo 'prospect.access' middleware:
Route::get('/admin/contracts/{contractAcceptance}', [ContractApprovalController::class, 'show'])
  ->name('admin.contracts.show');
Route::post('/admin/contracts/{contractAcceptance}/approve', [ContractApprovalController::class, 'approve'])
  ->name('admin.contracts.approve');
Route::post('/admin/contracts/{contractAcceptance}/resend', [ContractApprovalController::class, 'resend'])
  ->name('admin.contracts.resend');
```

### 6. **Broadcasting: channels.php (Modificado)**
`routes/channels.php`

```php
// Nuevo canal privado para asesores
Broadcast::channel('advisor.{advisorId}', function ($user, $advisorId) {
    return (int) $user->id === (int) $advisorId && 
           in_array($user->role, ['admin', 'sales_advisor']);
});
```

---

## 🧪 Cómo Probar el Flujo Completo

### Requisitos previos:
1. ✅ Servidor Laravel corriendo: `php artisan serve`
2. ✅ Reverb corriendo: `php artisan reverb:start`
3. ✅ Frontend compilado: `npm run dev`
4. ✅ Migración ejecutada: `php artisan migrate`

---

### 📝 Pasos de Prueba:

#### **Test 1: Flujo Completo de Aprobación**

1. **Login como Asesor:**
   - Usuario: asesor@test.com
   - Abrir: `/admin/students` (vista Kanban)

2. **Crear/Mover Prospecto a "Propuesta Enviada":**
   - Asegúrate de que el prospecto tenga:
     - ✅ Email válido
     - ✅ Nivel académico
     - ✅ Plan de pago
   - Muévelo a columna **"Propuesta Enviada"**
   - ✅ Verifica que se envíe el email al estudiante

3. **Login como Estudiante:**
   - Revisar email recibido
   - Click en el link del contrato
   - Subir imagen de firma
   - Click en "Aceptar Contrato"
   - ✅ Debe mostrar mensaje: *"Contrato firmado exitosamente. Esperando aprobación del asesor."*

4. **Volver a Sesión del Asesor:**
   - 🔔 Debe aparecer toast de notificación en tiempo real
   - 🎯 Modal debe abrirse automáticamente mostrando el PDF
   - ✅ Verificar que la firma aparece en el PDF

5. **Aprobar el Contrato:**
   - Click en "Aprobar y Enviar Emails"
   - ✅ Modal se cierra
   - ✅ Toast de confirmación
   - ✅ Prospecto se mueve automáticamente a columna **"Pago por Verificar"**
   - ✅ Verificar que se enviaron los 3 emails:
     - Al estudiante
     - Al admin
     - Al asesor

---

#### **Test 2: Flujo de Rechazo y Reenvío**

1. Repetir pasos 1-4 del Test 1

2. **Rechazar el Contrato:**
   - En el modal, click en "Rechazar y Reenviar"
   - ✅ Modal se cierra
   - ✅ Toast: *"Contrato rechazado y reenviado al estudiante para nueva firma"*
   - ✅ Prospecto permanece en **"Propuesta Enviada"**

3. **Verificar como Estudiante:**
   - Revisar email reenviado
   - Acceder al mismo link
   - ✅ Debe mostrar contrato SIN firma anterior
   - ✅ Debe permitir subir nueva firma

4. **Re-aprobar:**
   - Repetir pasos de aprobación
   - ✅ Debe funcionar normalmente

---

## 🐛 Troubleshooting

### Problema: "No aparece el toast de notificación"

**Posibles causas:**
1. ❌ Reverb no está corriendo
   - Solución: `php artisan reverb:start`

2. ❌ Usuario no está suscrito al canal correcto
   - Verificar en consola del navegador:
     ```javascript
     (window as any).Echo.connector.channels
     ```
   - Debe mostrar: `private-advisor.{userId}`

3. ❌ Evento no se está disparando
   - Verificar logs de Laravel: `storage/logs/laravel.log`
   - Agregar log temporal en `ContractController::accept()`:
     ```php
     Log::info('Disparando evento ContractSignedByStudent', [
       'contract_id' => $contractAcceptance->id,
       'advisor_id' => $contractAcceptance->student->advisor_id
     ]);
     ```

---

### Problema: "Modal no se abre automáticamente"

**Verificar:**
1. ✅ Estado `contractReviewOpen` se está actualizando
2. ✅ `pendingContract` tiene los datos correctos
3. ✅ Componente `ContractReviewModal` está renderizado

**Debug:**
Agregar `console.log` en el listener:
```typescript
channel.listen('ContractSignedByStudent', (data: any) => {
  console.log('📥 Datos recibidos:', data);
  console.log('📦 Pending contract:', pendingContract);
  console.log('🚪 Modal open:', contractReviewOpen);
  // ... resto del código
});
```

---

### Problema: "Error al aprobar/rechazar"

**Verificar:**
1. ✅ Rutas están registradas: `php artisan route:list | Select-String "contracts"`
2. ✅ Usuario tiene permisos (middleware `prospect.access`)
3. ✅ `contract_acceptances.id` existe en la BD

**Verificar en BD:**
```sql
SELECT * FROM contract_acceptances 
WHERE student_id = [ID_DEL_ESTUDIANTE] 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## 📊 Estados del Flujo

| Estado del Prospecto | Registro en BD | Emails Enviados | Puede Firmar | Requiere Aprobación |
|----------------------|----------------|-----------------|--------------|---------------------|
| `registrado` | ❌ Sin contrato | ❌ No | ❌ No | ❌ No |
| `propuesta_enviada` | ✅ Creado, sin firma | 📧 ContractMail | ✅ Sí | ⏳ Pendiente |
| `propuesta_enviada` | ✅ Firmado, sin aprobar | ❌ No | ❌ Ya firmó | ⏳ Pendiente aprobación |
| `pago_por_verificar` | ✅ Firmado y aprobado | 📧📧📧 Todos | ❌ Completado | ✅ Aprobado |

---

## 🎯 Beneficios del Nuevo Flujo

### ✅ Para el Asesor:
- 🔔 **Notificación en tiempo real** cuando un estudiante firma
- 👀 **Revisión previa** del contrato firmado antes de enviar emails
- ✏️ **Control de calidad** - puede rechazar firmas incorrectas/ilegibles
- 📊 **Visibilidad** del estado de aprobación en la BD

### ✅ Para el Estudiante:
- ⚡ **Proceso más rápido** si todo está correcto
- 🔄 **Segunda oportunidad** si necesita corregir la firma
- ✅ **Confirmación clara** de que su firma fue recibida

### ✅ Para el Sistema:
- 🛡️ **Validación extra** antes de cambiar estados
- 📝 **Auditoría completa** - quién aprobó y cuándo
- 🔒 **Seguridad** - solo asesores autorizados pueden aprobar
- 📧 **Emails más precisos** - solo se envían cuando todo está verificado

---

## 🚀 Próximas Mejoras Posibles

1. **Indicador visual en el Kanban:**
   - Badge "⏳ Pendiente aprobación" en tarjetas con contrato firmado pero no aprobado

2. **Historial de rechazos:**
   - Tabla `contract_rejection_history` con motivos de rechazo

3. **Notificaciones push:**
   - Notificaciones del navegador además del toast

4. **Dashboard de aprobaciones:**
   - Vista dedicada con todos los contratos pendientes de aprobación

5. **Campos de motivo de rechazo:**
   - Textarea para que el asesor explique por qué rechaza

6. **Aprobación masiva:**
   - Seleccionar múltiples contratos y aprobar todos a la vez

---

## 📞 Soporte

Si encuentras algún problema o necesitas ayuda:
1. Revisar logs: `storage/logs/laravel.log`
2. Verificar consola del navegador (F12)
3. Revisar estado de Reverb: `php artisan reverb:status` (si existe el comando)
4. Verificar conexión WebSocket en Network tab del navegador

---

**¡Flujo de Aprobación de Contratos Implementado Exitosamente! 🎉**
