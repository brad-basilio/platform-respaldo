# Flujo de Clases y Sesiones - Documentación Técnica

## 📋 Resumen del Sistema

El sistema maneja clases programadas para estudiantes de inglés. Cada estudiante puede:
1. Solicitar inscribirse a clases
2. Asistir a las clases
3. Completar exámenes
4. Desbloquear siguientes sesiones

## 🗂️ Modelos Involucrados

### 1. `ScheduledClass` (Clase Programada)
- **Estados posibles**: `scheduled`, `in_progress`, `completed`, `cancelled`
- **Campos clave**:
  - `scheduled_at`: Fecha/hora programada
  - `ended_at`: Fecha/hora de finalización
  - `status`: Estado actual de la clase
  - `recording_url`: URL de la grabación (opcional)

### 2. `StudentClassEnrollment` (Inscripción del Estudiante)
- **Campos clave**:
  - `attended`: boolean - ¿El estudiante asistió?
  - `exam_completed`: boolean - ¿Completó el examen?
  - `exam_score`: decimal - Puntuación del examen
  - `joined_at`: datetime - Cuándo se unió
  - `left_at`: datetime - Cuándo salió

### 3. `ClassTemplate` (Plantilla de Clase)
- **Campos clave**:
  - `session_number`: Número de sesión
  - `has_exam`: boolean - ¿Tiene examen?
  - `exam_passing_score`: Nota mínima para aprobar
  - `exam_max_attempts`: Intentos máximos del examen

---

## 🔄 FLUJO ACTUAL DEL SISTEMA

### Estado: ¿Cómo se determina que una sesión está "completada"?

```typescript
// MyClasses.tsx - Línea 83-88
const isSessionCompleted = (templateId: number): boolean => {
  const enrollment = enrollments[templateId];
  if (!enrollment) return false;
  const sc = enrollment.scheduled_class;
  return sc.status === 'completed' && enrollment.attended && enrollment.exam_completed;
};
```

**CRITERIOS para considerar una sesión COMPLETADA:**
1. ✅ `scheduled_class.status === 'completed'` - La clase debe estar marcada como completada
2. ✅ `enrollment.attended === true` - El estudiante debe haber asistido
3. ✅ `enrollment.exam_completed === true` - El examen debe estar completado (si aplica)

### Estado: ¿Cómo se desbloquea la siguiente sesión?

```typescript
// MyClasses.tsx - Línea 91-107
const isSessionUnlocked = (template: ClassTemplate): boolean => {
  const sessionNum = parseInt(template.session_number) || 0;
  
  // La sesión 1 siempre está desbloqueada
  if (sessionNum <= 1) return true;
  
  // Buscar la sesión anterior
  const previousSession = sortedTemplates.find(t => {
    const num = parseInt(t.session_number) || 0;
    return num === sessionNum - 1;
  });
  
  // Si no hay sesión anterior, está desbloqueada
  if (!previousSession) return true;
  
  // La sesión anterior debe estar completada
  return isSessionCompleted(previousSession.id);
};
```

**CRITERIOS para desbloquear siguiente sesión:**
- La sesión N se desbloquea cuando la sesión N-1 está completada

---

## ⚠️ PROBLEMAS IDENTIFICADOS (GAPS)

### 1. ❌ **LA ASISTENCIA NO SE MARCA AUTOMÁTICAMENTE**

**Problema**: El método `markAttendance()` existe en el modelo pero **NO SE USA EN NINGÚN LUGAR**.

```php
// StudentClassEnrollment.php
public function markAttendance(): void
{
    $this->update([
        'attended' => true,
        'joined_at' => now(),
    ]);
}
```

**¿Dónde debería marcarse?**
- Cuando el estudiante accede a la clase en vivo
- Cuando el admin marca asistencia manualmente
- Automáticamente cuando la clase termina (si el estudiante estaba conectado)

### 2. ❌ **NO HAY FORMA DE MARCAR ASISTENCIA DESDE EL ADMIN**

**Problema**: En la vista `Admin/ScheduledClasses/Show.tsx`, se MUESTRA si el estudiante asistió, pero NO hay botón para marcar asistencia.

```tsx
// Show.tsx - Solo muestra estado, no permite modificar
{enrollment.attended && (
  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
    Asistió
  </Badge>
)}
```

### 3. ❌ **EL ESTADO DE LA CLASE SE CAMBIA MANUALMENTE**

**Problema**: El admin debe cambiar manualmente el estado de la clase a:
- `in_progress` - Cuando inicia la clase
- `completed` - Cuando termina la clase

No hay automatización basada en horarios.

### 4. ⚠️ **FLUJO DE ESTADOS DE LA CLASE**

```
scheduled → in_progress → completed
    ↓
cancelled
```

El cambio se hace desde el admin:
```php
// ScheduledClassController.php - updateStatus()
if ($validated['status'] === 'completed') {
    $scheduledClass->update(['ended_at' => now()]);
}
```

### 5. ❌ **LA ASISTENCIA NO SE SINCRONIZA CON EL EXAMEN**

Si el template tiene examen (`has_exam = true`), el estudiante debe:
1. Asistir a la clase (attended = true)
2. Aprobar el examen (exam_completed = true, exam_score >= passing_score)

**Pero actualmente:**
- El examen puede completarse sin haber asistido
- No hay validación que requiera asistencia previa

---

## 🛠️ SOLUCIONES PROPUESTAS

### Solución 1: Endpoint para marcar asistencia desde Admin

```php
// Nueva ruta: POST /admin/scheduled-classes/{id}/mark-attendance
public function markAttendance(Request $request, ScheduledClass $scheduledClass)
{
    $validated = $request->validate([
        'student_id' => 'required|exists:students,id',
        'attended' => 'required|boolean'
    ]);

    $enrollment = $scheduledClass->enrollments()
        ->where('student_id', $validated['student_id'])
        ->firstOrFail();

    $enrollment->update([
        'attended' => $validated['attended'],
        'joined_at' => $validated['attended'] ? now() : null,
    ]);

    return back()->with('success', 'Asistencia actualizada');
}
```

### Solución 2: Auto-marcar asistencia cuando el estudiante entra a la clase

```tsx
// En ClassView.tsx o similar
useEffect(() => {
    if (enrollment && scheduledClass.status === 'in_progress' && !enrollment.attended) {
        // Marcar asistencia automáticamente
        axios.post(`/api/student/enrollments/${enrollment.id}/mark-attendance`);
    }
}, [enrollment, scheduledClass.status]);
```

### Solución 3: Marcar asistencia al ver grabación

```php
// Nueva ruta: POST /api/student/enrollments/{enrollment}/mark-attendance
public function markStudentAttendance(StudentClassEnrollment $enrollment)
{
    $user = Auth::user();
    $student = $user->student;
    
    if ($enrollment->student_id !== $student->id) {
        return response()->json(['error' => 'No autorizado'], 403);
    }

    $scheduledClass = $enrollment->scheduledClass;
    
    // Solo marcar si la clase está completada o en progreso
    if (!in_array($scheduledClass->status, ['in_progress', 'completed'])) {
        return response()->json(['error' => 'La clase aún no está disponible'], 400);
    }

    $enrollment->update([
        'attended' => true,
        'joined_at' => $enrollment->joined_at ?? now(),
    ]);

    return response()->json(['success' => true, 'message' => 'Asistencia registrada']);
}
```

### Solución 4: Validar asistencia antes del examen

```php
// En StudentClassController.php - submitExam()
public function submitExam(Request $request, StudentClassEnrollment $enrollment)
{
    // Validar que el estudiante haya asistido antes de permitir el examen
    if (!$enrollment->attended) {
        return response()->json([
            'error' => 'Debes asistir a la clase antes de tomar el examen'
        ], 400);
    }
    
    // ... resto del código
}
```

---

## ✅ IMPLEMENTACIÓN REALIZADA (Actualizado)

Las siguientes funcionalidades han sido implementadas:

### ✅ 1. Endpoint para marcar asistencia desde Admin

**Ruta:** `POST /admin/scheduled-classes/{scheduledClass}/mark-attendance/{enrollment}`

**Archivo:** `app/Http/Controllers/Admin/ScheduledClassController.php`

```php
public function markAttendance(Request $request, ScheduledClass $scheduledClass, StudentClassEnrollment $enrollment)
{
    // Verificar que el enrollment pertenece a la clase
    if ($enrollment->scheduled_class_id !== $scheduledClass->id) {
        return redirect()->back()->withErrors([
            'attendance' => 'La inscripción no pertenece a esta clase'
        ]);
    }

    $validated = $request->validate([
        'attended' => 'required|boolean',
    ]);

    $enrollment->update([
        'attended' => $validated['attended'],
        'joined_at' => $validated['attended'] ? ($enrollment->joined_at ?? now()) : null,
    ]);

    return redirect()->back()->with('success', "Asistencia actualizada");
}
```

### ✅ 2. UI de Asistencia en Admin

**Archivo:** `resources/js/Pages/Admin/ScheduledClasses/Show.tsx`

Se agregó un botón interactivo para cada estudiante que permite marcar/desmarcar asistencia:
- Muestra "Asistió" (verde) o "Sin asistencia" (gris)
- Click para togglear el estado
- Loading state mientras procesa

### ✅ 3. Auto-marcar asistencia cuando estudiante accede a clase

**Archivo:** `app/Http/Controllers/Student/StudentClassController.php`

En el método `show()`, cuando un estudiante accede a una clase que está `in_progress` o `completed`, se marca automáticamente como asistente:

```php
// Auto-mark attendance when student accesses a class that is in_progress or completed
$classStatus = $enrollment->scheduledClass->status;
if (!$enrollment->attended && in_array($classStatus, ['in_progress', 'completed'])) {
    $enrollment->update([
        'attended' => true,
        'joined_at' => $enrollment->joined_at ?? now(),
    ]);
}
```

### ✅ 4. Validar asistencia antes del examen

**Archivo:** `app/Http/Controllers/Student/StudentClassController.php`

En el método `submitExam()`, se valida que el estudiante haya asistido antes de permitir el examen:

```php
// Verify attendance before allowing exam submission
if (!$enrollment->attended) {
    if ($request->wantsJson() || $request->ajax()) {
        return response()->json([
            'success' => false,
            'message' => 'Debes asistir a la clase antes de poder rendir el examen.'
        ], 422);
    }
    return back()->withErrors(['exam' => 'Debes asistir a la clase antes de poder rendir el examen.']);
}
```

---

## 📊 RESUMEN DE ESTADOS

### Estados de ScheduledClass

| Estado | Descripción | Acciones permitidas |
|--------|-------------|---------------------|
| `scheduled` | Clase programada, aún no inicia | Puede iniciar → `in_progress` |
| `in_progress` | Clase en curso | Puede completar → `completed` |
| `completed` | Clase terminada | Agregar grabación, ver resumen |
| `cancelled` | Clase cancelada | Sin acciones |

### Estados de Enrollment (desde el estudiante)

| attended | exam_completed | Estado visual | Acción requerida |
|----------|----------------|---------------|------------------|
| false | false | "Pendiente" | Asistir a la clase |
| true | false | "Pendiente examen" | Completar examen |
| true | true | "Completada" | Ninguna - Siguiente sesión desbloqueada |

---

## 🎯 FLUJO IDEAL (A IMPLEMENTAR)

```
1. Admin programa clase → status: 'scheduled'
2. Admin inicia clase → status: 'in_progress'
3. Estudiante accede a la clase → attended: true (automático)
4. Admin finaliza clase → status: 'completed'
5. Estudiante puede:
   - Ver grabación (si existe)
   - Tomar examen (si el template tiene examen)
6. Si aprueba examen → exam_completed: true
7. Sesión marcada como completada → Siguiente sesión desbloqueada
```

---

## 📝 ARCHIVOS A MODIFICAR

1. **Backend:**
   - `app/Http/Controllers/Admin/ScheduledClassController.php` - Agregar markAttendance
   - `app/Http/Controllers/Student/StudentClassController.php` - Auto-marcar asistencia
   - `routes/web.php` - Nuevas rutas

2. **Frontend:**
   - `resources/js/pages/Admin/ScheduledClasses/Show.tsx` - Botones de asistencia
   - `resources/js/pages/Student/ClassView.tsx` - Auto-marcar asistencia
   - `resources/js/pages/Student/ClassTemplateView.tsx` - Validaciones

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Crear endpoint para marcar asistencia desde admin
- [x] Agregar botones en vista admin para marcar asistencia
- [x] Auto-marcar asistencia cuando estudiante accede a clase en progreso
- [x] Validar asistencia antes de permitir examen
- [ ] Marcar asistencia cuando estudiante ve grabación (ya se marca al acceder)
- [ ] Notificaciones cuando clase inicia/termina (opcional)
- [ ] Sincronizar estados automáticamente basado en horarios (opcional - cron job)
