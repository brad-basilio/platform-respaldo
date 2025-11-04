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

      $admin = User::create([
            'name' => 'Cajera Maria',
            'email' => 'cajero@english.com',
            'password' => Hash::make('cajero123'),
            'role' => 'cashier',
        ]);
 $admin = User::create([
            'name' => 'Asesor Carlos',
            'email' => 'asesor@english.com',
            'password' => Hash::make('asesor123'),
            'role' => 'sales_advisor',
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

       

     
    }
}

