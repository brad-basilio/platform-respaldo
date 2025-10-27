<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Group;
use App\Models\Badge;
use App\Models\TimeSlot;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin user
        $admin = User::create([
            'name' => 'Usuario Administrador',
            'email' => 'admin@english.com',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
        ]);

        // Llamar a los seeders adicionales
        $this->call([
            RolesSeeder::class,
            StudentSeeder::class, // Crea prospectos con diferentes estados
        ]);

        // Create teachers
        $teacher1 = User::create([
            'name' => 'Sarah Johnson',
            'email' => 'teacher@english.com',
            'password' => Hash::make('teacher123'),
            'role' => 'teacher',
        ]);

        $teacherProfile1 = Teacher::create([
            'user_id' => $teacher1->id,
            'first_name' => 'Sarah',
            'paternal_last_name' => 'Johnson',
            'maternal_last_name' => '',
            'phone_number' => '+1234567890',
            'gender' => 'Femenino',
            'age' => 32,
            'birth_date' => '1992-05-15',
            'document_type' => 'DNI',
            'document_number' => '12345678',
            'education_level' => 'Maestría',
            'status' => 'active',
            'specialization' => 'theoretical',
            'start_date' => '2023-01-01',
            'work_modality' => 'Híbrido',
            'language_level' => 'C2',
            'contract_status' => 'contratado',
        ]);

        TimeSlot::create([
            'teacher_id' => $teacherProfile1->id,
            'day_of_week' => 'Lunes',
            'start_time' => '09:00',
            'end_time' => '12:00',
            'duration' => 180,
        ]);

        TimeSlot::create([
            'teacher_id' => $teacherProfile1->id,
            'day_of_week' => 'Miércoles',
            'start_time' => '14:00',
            'end_time' => '17:00',
            'duration' => 180,
        ]);

        $teacher2 = User::create([
            'name' => 'Mike Wilson',
            'email' => 'mike@english.com',
            'password' => Hash::make('teacher123'),
            'role' => 'teacher',
        ]);

        $teacherProfile2 = Teacher::create([
            'user_id' => $teacher2->id,
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

        TimeSlot::create([
            'teacher_id' => $teacherProfile2->id,
            'day_of_week' => 'Martes',
            'start_time' => '08:00',
            'end_time' => '12:00',
            'duration' => 240,
        ]);

        TimeSlot::create([
            'teacher_id' => $teacherProfile2->id,
            'day_of_week' => 'Jueves',
            'start_time' => '13:00',
            'end_time' => '18:00',
            'duration' => 300,
        ]);

        // Create students
        $student1 = User::create([
            'name' => 'Juan Pérez',
            'email' => 'student@english.com',
            'password' => Hash::make('student123'),
            'role' => 'student',
        ]);

        // Obtener asesor 1 para asignar estudiantes
        $asesor1 = User::where('email', 'asesor1@english.com')->first();
        
        $studentProfile1 = Student::create([
            'user_id' => $student1->id,
            'registered_by' => $asesor1?->id,
            'first_name' => 'Juan',
            'paternal_last_name' => 'Pérez',
            'maternal_last_name' => 'García',
            'phone_number' => '+51987654321',
            'gender' => 'M',
            'birth_date' => '2000-03-10',
            'document_type' => 'dni',
            'document_number' => '60123456', // Cambiado para evitar duplicación
            'education_level' => 'universitario',
            'status' => 'active',
            'class_type' => 'theoretical',
            'level' => 'intermediate',
            'points' => 1250,
            'registration_date' => '2024-01-10',
            'payment_date' => '2024-01-15',
            'enrollment_date' => '2024-01-15',
            'enrollment_code' => 'ENG2024001',
            'prospect_status' => 'matriculado',
            'payment_verified' => true,
        ]);

        $student2 = User::create([
            'name' => 'María García',
            'email' => 'maria@english.com',
            'password' => Hash::make('student123'),
            'role' => 'student',
        ]);

        $studentProfile2 = Student::create([
            'user_id' => $student2->id,
            'registered_by' => $asesor1?->id,
            'first_name' => 'María',
            'paternal_last_name' => 'García',
            'maternal_last_name' => 'López',
            'phone_number' => '+51987654322',
            'gender' => 'F',
            'birth_date' => '1998-07-22',
            'document_type' => 'dni',
            'document_number' => '60123457', // Cambiado para evitar duplicación
            'education_level' => 'secundaria',
            'status' => 'active',
            'class_type' => 'practical',
            'level' => 'basic',
            'points' => 850,
            'registration_date' => '2024-01-08',
            'payment_date' => '2024-01-10',
            'enrollment_date' => '2024-01-10',
            'enrollment_code' => 'ENG2024002',
            'prospect_status' => 'matriculado',
            'payment_verified' => true,
        ]);

        $student3 = User::create([
            'name' => 'Ahmed Hassan',
            'email' => 'ahmed@english.com',
            'password' => Hash::make('student123'),
            'role' => 'student',
        ]);

        $studentProfile3 = Student::create([
            'user_id' => $student3->id,
            'registered_by' => $asesor1?->id,
            'first_name' => 'Ahmed',
            'paternal_last_name' => 'Hassan',
            'maternal_last_name' => '',
            'phone_number' => '+51987654323',
            'gender' => 'M',
            'birth_date' => '1995-11-05',
            'document_type' => 'ce',
            'document_number' => 'CE001235', // Cambiado para evitar duplicación
            'education_level' => 'postgrado',
            'status' => 'inactive',
            'class_type' => 'theoretical',
            'level' => 'advanced',
            'points' => 2100,
            'registration_date' => now(),
            'prospect_status' => 'registrado',
        ]);

        // Agregar estudiantes con diferentes estados del flujo
        $student4 = User::create([
            'name' => 'Camila Silva',
            'email' => 'camila.silva@english.com',
            'password' => Hash::make('student123'),
            'role' => 'student',
        ]);

        $studentProfile4 = Student::create([
            'user_id' => $student4->id,
            'registered_by' => $asesor1?->id,
            'first_name' => 'Camila',
            'paternal_last_name' => 'Silva',
            'maternal_last_name' => 'Morales',
            'phone_number' => '+51987654324',
            'gender' => 'F',
            'birth_date' => '2001-01-12',
            'document_type' => 'dni',
            'document_number' => '78567890', // Cambiado para evitar duplicación
            'education_level' => 'universitario',
            'status' => 'active',
            'class_type' => 'theoretical',
            'level' => 'intermediate',
            'points' => 0,
            'registration_date' => now(),
            'prospect_status' => 'pago_reportado', // Nuevo estado: asesor confirmó que pagó
        ]);

        $student5 = User::create([
            'name' => 'Ricardo Paredes',
            'email' => 'ricardo.paredes@english.com',
            'password' => Hash::make('student123'),
            'role' => 'student',
        ]);

        $studentProfile5 = Student::create([
            'user_id' => $student5->id,
            'registered_by' => $asesor1?->id,
            'first_name' => 'Ricardo',
            'paternal_last_name' => 'Paredes',
            'maternal_last_name' => 'Luna',
            'phone_number' => '+51987654325',
            'gender' => 'M',
            'birth_date' => '1999-10-28',
            'document_type' => 'dni',
            'document_number' => '76987654', // Cambiado para evitar duplicación
            'education_level' => 'tecnico',
            'status' => 'active',
            'class_type' => 'practical',
            'level' => 'basic',
            'points' => 0,
            'registration_date' => now(),
            'prospect_status' => 'propuesta_enviada', // Propuesta enviada, esperando pago
        ]);

        // Create groups
        $group1 = Group::create([
            'name' => 'Teórico Básico A',
            'type' => 'theoretical',
            'teacher_id' => $teacherProfile1->id,
            'max_capacity' => 4,
            'status' => 'active',
            'level' => 'basic',
            'start_date' => '2024-01-15',
            'end_date' => '2024-04-15',
            'day_of_week' => 'Lunes',
            'start_time' => '09:00',
            'end_time' => '10:30',
            'duration' => 90,
        ]);

        $group1->students()->attach($studentProfile1->id);

        $group2 = Group::create([
            'name' => 'Práctico Intermedio B',
            'type' => 'practical',
            'teacher_id' => $teacherProfile2->id,
            'max_capacity' => 6,
            'status' => 'active',
            'level' => 'intermediate',
            'start_date' => '2024-01-16',
            'end_date' => '2024-04-16',
            'day_of_week' => 'Martes',
            'start_time' => '08:00',
            'end_time' => '09:30',
            'duration' => 90,
        ]);

        $group2->students()->attach($studentProfile2->id);

        $group3 = Group::create([
            'name' => 'Teórico Avanzado C',
            'type' => 'theoretical',
            'teacher_id' => null,
            'max_capacity' => 4,
            'status' => 'closed',
            'level' => 'advanced',
            'start_date' => '2024-02-01',
            'end_date' => '2024-05-01',
            'day_of_week' => 'Miércoles',
            'start_time' => '14:00',
            'end_time' => '15:30',
            'duration' => 90,
        ]);

        // Create badges
        Badge::create([
            'name' => 'Primeros Pasos',
            'description' => 'Completa tu primera clase',
            'icon' => '🎯',
            'points' => 100,
        ]);

        Badge::create([
            'name' => 'Estudiante Dedicado',
            'description' => 'Asiste a 10 clases consecutivas',
            'icon' => '📚',
            'points' => 250,
        ]);

        Badge::create([
            'name' => 'Maestro del Idioma',
            'description' => 'Completa un nivel completo',
            'icon' => '🏆',
            'points' => 500,
        ]);

        // Attach a badge to student 1
        $studentProfile1->badges()->attach(1, ['earned_at' => now()]);
    }
}

