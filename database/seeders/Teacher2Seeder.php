<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Teacher;
use App\Models\TimeSlot;
use App\Models\StudentClassEnrollment;
use App\Models\ScheduledClass;
use App\Models\Group;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class Teacher2Seeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Buscar si ya existe un perfil de profesor para Mike Wilson
        $existingTeacher = Teacher::where('first_name', 'Mike')
            ->where('paternal_last_name', 'Wilson')
            ->first();

        $oldUserId = $existingTeacher ? $existingTeacher->user_id : null;

        // 2. Manejar el usuario con ID 19
        // Si el ID 19 ya está ocupado por otro usuario (que no es Mike), podrías tener un conflicto.
        // Vamos a ser agresivos: si existe el 19 lo actualizamos, si no, lo creamos.
        $user19 = User::find(19);

        if ($user19) {
            $user19->update([
                'name' => 'Mike Wilson',
                'email' => 'teacher2@english.com',
                'password' => Hash::make('teacher123'),
                'role' => 'teacher',
            ]);
        } else {
            $user19 = User::forceCreate([
                'id' => 19,
                'name' => 'Mike Wilson',
                'email' => 'teacher2@english.com',
                'password' => Hash::make('teacher123'),
                'role' => 'teacher',
            ]);
        }

        // 3. Si el profesor ya existía con otro user_id, lo reasignamos al 19
        if ($existingTeacher) {
            $existingTeacher->update(['user_id' => 19]);

            // Opcional: Eliminar el usuario antiguo si ya no tiene perfil de profesor
            if ($oldUserId && $oldUserId != 19) {
                $oldUser = User::find($oldUserId);
                if ($oldUser && !$oldUser->student()->exists()) {
                    $oldUser->delete();
                }
            }
        } else {
            // 4. Si no existía el profesor, lo creamos
            Teacher::create([
                'user_id' => 19,
                'first_name' => 'Mike',
                'paternal_last_name' => 'Wilson',
                'maternal_last_name' => '',
                'phone_number' => '+1234567891',
                'gender' => 'Masculino',
                'age' => 28,
                'birth_date' => '1996-08-20',
                'document_type' => 'DNI',
                'document_number' => '87654321',
                'education_level' => 'Universitario',
                'status' => 'active',
                'specialization' => 'practical',
                'start_date' => '2023-02-01',
                'work_modality' => 'Presencial',
                'language_level' => 'Nativo',
                'contract_status' => 'contratado',
            ]);
        }

        // 5. Limpieza de clases tipo práctica para el estudiante específico
        $studentUser = User::where('email', 'basiliohinostrozabrad@gmail.com')->first();
        if ($studentUser && $studentUser->student) {
            $enrollmentsToDelete = StudentClassEnrollment::where('student_id', $studentUser->student->id)
                ->whereHas('scheduledClass', function ($query) {
                    $query->where('type', 'practice');
                })
                ->get();

            foreach ($enrollmentsToDelete as $enrollment) {
                $enrollment->delete();
            }
        }

        // 6. Borrar todas las clases y grupos asignados a este profesor (Mike Wilson ID 19)
        $mikeTeacherProfile = Teacher::where('user_id', 19)->first();

        if ($mikeTeacherProfile) {
            // Borrar inscripciones de Clases donde Mike es el profesor
            StudentClassEnrollment::whereHas('scheduledClass', function ($q) {
                $q->where('teacher_id', 19);
            })->delete();

            // Borrar Clases de Mike
            ScheduledClass::where('teacher_id', 19)->delete();

            // Borrar Grupos de Mike (limpiando pivot primero)
            $groupIds = Group::where('teacher_id', $mikeTeacherProfile->id)->pluck('id');
            if ($groupIds->count() > 0) {
                DB::table('group_student')->whereIn('group_id', $groupIds)->delete();
                Group::whereIn('id', $groupIds)->delete();
            }
        }
    }
}
