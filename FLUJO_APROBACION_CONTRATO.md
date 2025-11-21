# ✅ FLUJO CORRECTO DE APROBACIÓN DE CONTRATO

## 📋 Flujo Paso a Paso

### 1️⃣ **PROPUESTA_ENVIADA** → Asesor completa datos
- Estado inicial: `propuesta_enviada`
- Asesor edita el prospecto y completa:
  - ✅ Fecha de pago
  - ✅ Nivel académico
  - ✅ Plan de pago
  - ✅ Sube voucher (opcional)
- **Al guardar**: ✅ **SE QUEDA EN `propuesta_enviada`** (NO pasa a `pago_por_verificar`)

### 2️⃣ PDF Generado y Enviado
- Sistema genera PDF del contrato (sin firma)
- Email enviado al estudiante con:
  - PDF adjunto del contrato
  - Link para aceptar y firmar
- Toast mostrado al asesor: *"Contrato generado y enviado al estudiante"*

### 3️⃣ Estudiante Firma el Contrato
- Estudiante abre el link del email
- Sube su firma digital
- Sistema regenera PDF con la firma
- **Estado sigue en `propuesta_enviada`** ✅

### 4️⃣ 🔔 Notificación en Tiempo Real al Asesor
- Asesor recibe notificación Reverb inmediatamente
- Toast: *"🔔 Nuevo contrato firmado - [Nombre] ha firmado su contrato. ¡Revísalo ahora!"*
- Modal se abre automáticamente con:
  - Vista previa del PDF firmado
  - Botón **"✅ Aprobar y Enviar Emails"**
  - Botón **"❌ Rechazar y Reenviar"**

### 5️⃣ Asesor Aprueba o Rechaza

#### ✅ **SI APRUEBA**:
- Sistema envía 3 emails:
  1. Al estudiante (confirmación con PDF firmado)
  2. Al admin (notificación)
  3. Al asesor (confirmación)
- **Cambia estado a `pago_por_verificar`** ✅
- Prospecto pasa a la columna de "Pago Por Verificar"

#### ❌ **SI RECHAZA**:
- Sistema elimina la firma anterior
- Regenera PDF sin firma
- Reenvía email al estudiante para firmar nuevamente
- **Estado sigue en `propuesta_enviada`** ✅
- Vuelve al paso 3

---

## 🔧 Cambios Implementados

### Backend

#### `StudentController.php` (Línea 871-900)
```php
// ❌ ANTES (INCORRECTO):
$student->update(['prospect_status' => 'pago_por_verificar']); // Cambiaba automáticamente

// ✅ AHORA (CORRECTO):
// NO cambia estado - solo genera contrato
// El estudiante debe firmar primero
// Luego el asesor aprueba
// Solo entonces pasa a pago_por_verificar
```

#### `ContractController.php` (Línea ~98-102)
```php
// ❌ ANTES: Enviaba emails inmediatamente
Mail::to($student->user->email)->send(new ContractSignedStudentMail(...));

// ✅ AHORA: Solo dispara evento
event(new ContractSignedByStudent($contractAcceptance, $student));
```

#### `ContractApprovalController.php` (NUEVO)
```php
// approve() - Envía emails y cambia a pago_por_verificar
// resend() - Elimina firma y reenvía al estudiante
```

### Frontend

#### `StudentManagement.tsx`
```typescript
// Listener de Reverb para notificaciones en tiempo real
useEffect(() => {
  const channel = Echo.private(`advisor.${currentUserId}`);
  channel.listen('ContractSignedByStudent', (data) => {
    // Muestra toast y abre modal automáticamente
  });
}, [currentUserId]);
```

#### `ContractReviewModal.tsx` (NUEVO)
- Vista previa del PDF firmado (iframe)
- Botones de aprobar/rechazar
- Llamadas API a `/admin/contracts/{id}/approve` y `/resend`

---

## 🧪 Cómo Probar

### Paso 1: Crear Prospecto
```
1. Ir a Admin → Gestión de Prospectos
2. Crear nuevo prospecto con email válido
3. Estado inicial: "Registrado"
```

### Paso 2: Cambiar a Propuesta Enviada
```
4. Arrastrar a columna "Reunión Realizada" o cambiar manualmente
5. Estado: "propuesta_enviada"
```

### Paso 3: Completar Datos Académicos
```
6. Clic en "Editar" prospecto
7. Completar:
   - Fecha de pago
   - Nivel académico
   - Plan de pago
   - Subir voucher
8. Guardar
9. ✅ Verificar que SE QUEDA en "Reunión Realizada" (NO pasa a Pago Por Verificar)
10. Toast: "Contrato generado y enviado al estudiante"
```

### Paso 4: Firmar como Estudiante
```
11. Revisar email del estudiante
12. Abrir link del contrato
13. Subir firma (imagen JPG/PNG)
14. ✅ Verificar que sigue en "Reunión Realizada"
```

### Paso 5: Aprobar como Asesor
```
15. Asesor recibe notificación en tiempo real 🔔
16. Modal se abre con PDF firmado
17. Clic en "✅ Aprobar y Enviar Emails"
18. ✅ AHORA SÍ pasa a "Pago Por Verificar"
19. Emails enviados a estudiante, admin y asesor
```

---

## ✅ Validación del Flujo

| Paso | Estado | ¿Pasa a `pago_por_verificar`? |
|------|--------|-------------------------------|
| 1. Crear prospecto | `registrado` | ❌ No |
| 2. Cambiar a reunión realizada | `propuesta_enviada` | ❌ No |
| 3. Completar datos y guardar | `propuesta_enviada` | ❌ **NO (CORREGIDO)** |
| 4. Estudiante firma | `propuesta_enviada` | ❌ No |
| 5. Asesor aprueba | `pago_por_verificar` | ✅ **SÍ** |

---

## 🚨 Error Anterior

**Antes el sistema pasaba automáticamente a `pago_por_verificar` en el paso 3**, sin esperar:
- ❌ Firma del estudiante
- ❌ Aprobación del asesor

**Ahora está corregido**: Solo pasa cuando el asesor aprueba explícitamente el contrato firmado. ✅
