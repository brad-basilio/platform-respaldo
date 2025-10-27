<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class StudentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener asesores de ventas
        $salesAdvisors = User::where('role', 'sales_advisor')->pluck('id')->toArray();
        
        if (empty($salesAdvisors)) {
            // Si no hay asesores, crear uno por defecto
            $advisor = User::create([
                'name' => 'Asesor Demo',
                'email' => 'asesor.demo@english.com',
                'password' => Hash::make('asesor123'),
                'role' => 'sales_advisor',
            ]);
            $salesAdvisors = [$advisor->id];
        }

        // Prospectos Matriculados
        $this->createStudent([
            'first_name' => 'Juan',
            'paternal_last_name' => 'Pérez',
            'maternal_last_name' => 'García',
            'email' => 'juan.perez@example.com',
            'phone_number' => '987654321',
            'gender' => 'M',
            'birth_date' => '2000-05-15',
            'document_type' => 'dni',
            'document_number' => '72345678',
            'education_level' => 'universitario',
            'level' => 'intermediate',
            'prospect_status' => 'matriculado',
            'payment_date' => '2024-01-15',
            'enrollment_date' => '2024-01-15',
            'enrollment_code' => 'MAT-202401-1234',
            'payment_verified' => true,
            'contracted_plan' => 'estandar',
        ]);

        $this->createStudent([
            'first_name' => 'María',
            'paternal_last_name' => 'García',
            'maternal_last_name' => 'López',
            'email' => 'maria.garcia@example.com',
            'phone_number' => '987654322',
            'gender' => 'F',
            'birth_date' => '1998-08-20',
            'document_type' => 'dni',
            'document_number' => '71234567',
            'education_level' => 'secundaria',
            'level' => 'basic',
            'prospect_status' => 'matriculado',
            'payment_date' => '2024-01-10',
            'enrollment_date' => '2024-01-10',
            'enrollment_code' => 'MAT-202401-5678',
            'payment_verified' => true,
            'contracted_plan' => 'premium',
        ]);

        // Prospectos en Verificación de Pago
        $this->createStudent([
            'first_name' => 'Carlos',
            'paternal_last_name' => 'Mendoza',
            'maternal_last_name' => 'Ruiz',
            'email' => 'carlos.mendoza@example.com',
            'phone_number' => '987654323',
            'gender' => 'M',
            'birth_date' => '2001-03-10',
            'document_type' => 'dni',
            'document_number' => '73456789',
            'education_level' => 'tecnico',
            'level' => 'intermediate',
            'prospect_status' => 'verificacion_pago',
            'payment_date' => now()->format('Y-m-d'),
            'contracted_plan' => 'estandar',
        ]);

        $this->createStudent([
            'first_name' => 'Ana',
            'paternal_last_name' => 'López',
            'maternal_last_name' => 'Martínez',
            'email' => 'ana.lopez@example.com',
            'phone_number' => '987654324',
            'gender' => 'F',
            'birth_date' => '1999-11-25',
            'document_type' => 'dni',
            'document_number' => '70123456',
            'education_level' => 'universitario',
            'level' => 'basic',
            'prospect_status' => 'verificacion_pago',
            'payment_date' => now()->format('Y-m-d'),
            'contracted_plan' => 'basico',
        ]);

        // Prospectos con Propuesta Enviada
        $this->createStudent([
            'first_name' => 'Sofia',
            'paternal_last_name' => 'Ramírez',
            'maternal_last_name' => 'Torres',
            'email' => 'sofia.ramirez@example.com',
            'phone_number' => '987654325',
            'gender' => 'F',
            'birth_date' => '2002-07-18',
            'document_type' => 'dni',
            'document_number' => '74567890',
            'education_level' => 'secundaria',
            'level' => 'advanced',
            'prospect_status' => 'propuesta_enviada',
        ]);

        $this->createStudent([
            'first_name' => 'Diego',
            'paternal_last_name' => 'Flores',
            'maternal_last_name' => 'Quispe',
            'email' => 'diego.flores@example.com',
            'phone_number' => '987654326',
            'gender' => 'M',
            'birth_date' => '2000-12-05',
            'document_type' => 'dni',
            'document_number' => '72987654',
            'education_level' => 'universitario',
            'level' => 'intermediate',
            'prospect_status' => 'propuesta_enviada',
        ]);

        // Prospectos con Pago Reportado (el asesor confirmó que el cliente pagó)
        $this->createStudent([
            'first_name' => 'Camila',
            'paternal_last_name' => 'Silva',
            'maternal_last_name' => 'Morales',
            'email' => 'camila.silva@example.com',
            'phone_number' => '987654331',
            'gender' => 'F',
            'birth_date' => '2001-01-12',
            'document_type' => 'dni',
            'document_number' => '73567890',
            'education_level' => 'universitario',
            'level' => 'intermediate',
            'prospect_status' => 'pago_reportado',
        ]);

        $this->createStudent([
            'first_name' => 'Ricardo',
            'paternal_last_name' => 'Paredes',
            'maternal_last_name' => 'Luna',
            'email' => 'ricardo.paredes@example.com',
            'phone_number' => '987654332',
            'gender' => 'M',
            'birth_date' => '1999-10-28',
            'document_type' => 'dni',
            'document_number' => '71987654',
            'education_level' => 'tecnico',
            'level' => 'basic',
            'prospect_status' => 'pago_reportado',
        ]);

        // Prospectos Registrados (recién ingresados por asesor)
        $this->createStudent([
            'first_name' => 'Ahmed',
            'paternal_last_name' => 'Hassan',
            'maternal_last_name' => '',
            'email' => 'ahmed.hassan@example.com',
            'phone_number' => '987654327',
            'gender' => 'M',
            'birth_date' => '1997-04-22',
            'document_type' => 'ce',
            'document_number' => '001234567',
            'education_level' => 'postgrado',
            'level' => 'advanced',
            'prospect_status' => 'registrado',
        ]);

        $this->createStudent([
            'first_name' => 'Lucía',
            'paternal_last_name' => 'Vargas',
            'maternal_last_name' => 'Soto',
            'email' => 'lucia.vargas@example.com',
            'phone_number' => '987654328',
            'gender' => 'F',
            'birth_date' => '2001-09-14',
            'document_type' => 'dni',
            'document_number' => '73876543',
            'education_level' => 'tecnico',
            'level' => 'basic',
            'prospect_status' => 'registrado',
        ]);

        $this->createStudent([
            'first_name' => 'Roberto',
            'paternal_last_name' => 'Chávez',
            'maternal_last_name' => 'Huamán',
            'email' => 'roberto.chavez@example.com',
            'phone_number' => '987654329',
            'gender' => 'M',
            'birth_date' => '1999-06-30',
            'document_type' => 'dni',
            'document_number' => '71345678',
            'education_level' => 'universitario',
            'level' => 'intermediate',
            'prospect_status' => 'registrado',
        ]);

        $this->createStudent([
            'first_name' => 'Valentina',
            'paternal_last_name' => 'Rojas',
            'maternal_last_name' => 'Cruz',
            'email' => 'valentina.rojas@example.com',
            'phone_number' => '987654330',
            'gender' => 'F',
            'birth_date' => '2003-02-08',
            'document_type' => 'dni',
            'document_number' => '75234567',
            'education_level' => 'secundaria',
            'level' => 'basic',
            'prospect_status' => 'registrado',
        ]);
    }

    private function createStudent(array $data): void
    {
        // Obtener un asesor aleatorio
        $salesAdvisors = User::where('role', 'sales_advisor')->pluck('id')->toArray();
        $registeredBy = !empty($salesAdvisors) ? $salesAdvisors[array_rand($salesAdvisors)] : null;

        // Crear usuario
        $user = User::create([
            'name' => trim("{$data['first_name']} {$data['paternal_last_name']} {$data['maternal_last_name']}"),
            'email' => $data['email'],
            'password' => Hash::make('password123'),
            'role' => 'student',
        ]);

        // Crear estudiante/prospecto
        Student::create([
            'user_id' => $user->id,
            'registered_by' => $registeredBy,
            'first_name' => $data['first_name'],
            'paternal_last_name' => $data['paternal_last_name'],
            'maternal_last_name' => $data['maternal_last_name'],
            'phone_number' => $data['phone_number'],
            'gender' => $data['gender'],
            'birth_date' => $data['birth_date'],
            'document_type' => $data['document_type'],
            'document_number' => $data['document_number'],
            'education_level' => $data['education_level'],
            'level' => $data['level'],
            'prospect_status' => $data['prospect_status'],
            'payment_date' => $data['payment_date'] ?? null,
            'enrollment_date' => $data['enrollment_date'] ?? null,
            'enrollment_code' => $data['enrollment_code'] ?? null,
            'payment_verified' => $data['payment_verified'] ?? false,
            'contracted_plan' => $data['contracted_plan'] ?? null,
            'registration_date' => now(),
        ]);
    }
}
