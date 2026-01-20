<?php
/**
 * DEBUG: Investigar por qué el estudiante muestra nivel incorrecto
 * 
 * Ejecutar en el servidor con:
 * cd /var/www/laravel (o donde esté tu proyecto Laravel)
 * php debug_student_level.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Student;
use App\Models\User;
use App\Models\AcademicLevel;
use Illuminate\Support\Facades\DB;

$targetEmail = 'julio.izquierdo.mejia@gmail.com';

echo "========================================\n";
echo "🔍 DEBUG: Estudiante {$targetEmail}\n";
echo "========================================\n\n";

// 1. Primero buscar el User por email
$user = User::where('email', $targetEmail)->first();

if (!$user) {
    echo "❌ ERROR: Usuario no encontrado con email: {$targetEmail}\n";
    exit(1);
}

echo "✅ Usuario encontrado:\n";
echo "   - User ID: {$user->id}\n";
echo "   - User Email: {$user->email}\n";
echo "   - User Name: {$user->name}\n";
echo "\n";

// 2. Buscar el estudiante por user_id
$student = Student::where('user_id', $user->id)->first();

if (!$student) {
    echo "❌ ERROR: Estudiante no encontrado para user_id: {$user->id}\n";
    exit(1);
}

echo "✅ Estudiante encontrado:\n";
echo "   - Student ID: {$student->id}\n";
echo "   - User ID: {$student->user_id}\n";
echo "   - Nombre: {$student->first_name} {$student->paternal_last_name} {$student->maternal_last_name}\n";
echo "   - Prospect Status: {$student->prospect_status}\n";
echo "   - Enrollment Verified: " . ($student->enrollment_verified ? 'Sí' : 'No') . "\n";
echo "\n";

echo "========================================\n";
echo "📊 CAMPOS DE NIVEL EN LA BD\n";
echo "========================================\n\n";

// 2. Mostrar campos relacionados con nivel
echo "   - level (columna directa): " . ($student->level ?? 'NULL') . "\n";
echo "   - academic_level_id: " . ($student->academic_level_id ?? 'NULL') . "\n";

// 3. Verificar la relación academicLevel
$academicLevel = $student->academicLevel;
if ($academicLevel) {
    echo "\n✅ Relación academicLevel cargada:\n";
    echo "   - AcademicLevel ID: {$academicLevel->id}\n";
    echo "   - AcademicLevel name: {$academicLevel->name}\n";
    echo "   - AcademicLevel code: " . ($academicLevel->code ?? 'N/A') . "\n";
    echo "   - AcademicLevel slug: " . ($academicLevel->slug ?? 'N/A') . "\n";
} else {
    echo "\n⚠️ No tiene relación academicLevel cargada\n";
}

echo "\n========================================\n";
echo "📋 TODOS LOS NIVELES ACADÉMICOS EN BD\n";
echo "========================================\n\n";

$allLevels = AcademicLevel::all();
foreach ($allLevels as $level) {
    $marker = ($student->academic_level_id == $level->id) ? ' 👈 ASIGNADO AL ESTUDIANTE' : '';
    echo "   ID: {$level->id} | Name: {$level->name} | Code: " . ($level->code ?? 'N/A') . " | Slug: " . ($level->slug ?? 'N/A') . "{$marker}\n";
}

echo "\n========================================\n";
echo "🔬 QUERY RAW DE LA BD\n";
echo "========================================\n\n";

// 4. Query raw para ver exactamente qué hay en la BD
$rawStudent = DB::table('students')
    ->where('user_id', $user->id)
    ->first();

echo "Datos RAW del estudiante:\n";
echo "   - level: " . json_encode($rawStudent->level ?? null) . "\n";
echo "   - academic_level_id: " . json_encode($rawStudent->academic_level_id ?? null) . "\n";

echo "\n========================================\n";
echo "🧪 SIMULACIÓN: Cómo se transforma para el Frontend\n";
echo "========================================\n\n";

// 5. Simular cómo el Resource transforma los datos
// Cargar el estudiante con las relaciones como lo hace el controlador
$studentWithRelations = Student::with(['academicLevel', 'paymentPlan', 'registeredBy', 'contract', 'user'])
    ->where('user_id', $user->id)
    ->first();

echo "Datos que se enviarían al frontend:\n";

// Verificar si existe StudentResource
$resourceClass = 'App\\Http\\Resources\\StudentResource';
if (class_exists($resourceClass)) {
    $resource = new $resourceClass($studentWithRelations);
    $transformed = $resource->toArray(request());
    
    echo "\n📦 StudentResource output:\n";
    echo "   - level: " . json_encode($transformed['level'] ?? 'NO DEFINIDO') . "\n";
    echo "   - academicLevel: " . json_encode($transformed['academicLevel'] ?? 'NO DEFINIDO') . "\n";
    echo "   - academicLevelId: " . json_encode($transformed['academicLevelId'] ?? 'NO DEFINIDO') . "\n";
    
    // Mostrar todo el array para debug completo
    echo "\n📦 Output COMPLETO del StudentResource:\n";
    print_r($transformed);
} else {
    echo "⚠️ StudentResource no encontrado, mostrando datos crudos:\n";
    echo "   - level: " . json_encode($studentWithRelations->level) . "\n";
    echo "   - academic_level_id: " . json_encode($studentWithRelations->academic_level_id) . "\n";
    echo "   - academicLevel->name: " . json_encode($studentWithRelations->academicLevel->name ?? null) . "\n";
}

echo "\n========================================\n";
echo "🎯 DIAGNÓSTICO\n";
echo "========================================\n\n";

// 6. Diagnóstico
$levelColumn = $rawStudent->level ?? null;
$academicLevelId = $rawStudent->academic_level_id ?? null;

if ($levelColumn && $academicLevelId) {
    // Verificar si coinciden
    $academicLevelFromId = AcademicLevel::find($academicLevelId);
    $expectedLevel = $academicLevelFromId->code ?? $academicLevelFromId->slug ?? null;
    
    if ($levelColumn !== $expectedLevel) {
        echo "⚠️ PROBLEMA DETECTADO: Hay inconsistencia entre 'level' y 'academic_level_id'\n";
        echo "   - La columna 'level' tiene: {$levelColumn}\n";
        echo "   - El AcademicLevel (ID: {$academicLevelId}) sugiere: {$expectedLevel}\n";
        echo "\n💡 SOLUCIÓN: El frontend usa 'level' directamente pero debería usar academicLevel.code o similar\n";
    } else {
        echo "✅ Los campos 'level' y 'academic_level_id' están sincronizados\n";
    }
} elseif (!$levelColumn && $academicLevelId) {
    echo "ℹ️ Solo tiene academic_level_id ({$academicLevelId}), no tiene columna 'level'\n";
    echo "   El frontend podría estar mostrando un valor por defecto\n";
} elseif ($levelColumn && !$academicLevelId) {
    echo "ℹ️ Solo tiene columna 'level' ({$levelColumn}), no tiene academic_level_id\n";
} else {
    echo "⚠️ No tiene ni 'level' ni 'academic_level_id' definidos\n";
}

echo "\n========================================\n";
echo "📝 VERIFICAR EnrolledStudents.tsx\n";
echo "========================================\n\n";

echo "En EnrolledStudents.tsx línea ~1600, el código hace:\n";
echo "   const level = params.value;  // Esto es el campo 'level'\n";
echo "   if level === 'basic' → 'Básico'\n";
echo "   if level === 'intermediate' → 'Intermedio'\n";
echo "   else → 'Avanzado' ⚠️ CUALQUIER OTRO VALOR MUESTRA AVANZADO\n";
echo "\n";
echo "🔍 Si el campo 'level' es NULL, vacío o tiene un valor inesperado,\n";
echo "   el código va al 'else' y muestra 'Avanzado' incorrectamente.\n";

echo "\n✅ Debug completado\n";
