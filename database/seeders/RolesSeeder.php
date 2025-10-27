<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class RolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Asesor de Ventas 1
        User::create([
            'name' => 'Carlos Ventas',
            'email' => 'asesor1@english.com',
            'password' => Hash::make('asesor123'),
            'role' => 'sales_advisor', // Asesor de Ventas
        ]);

        // Asesor de Ventas 2
        User::create([
            'name' => 'María Comercial',
            'email' => 'asesor2@english.com',
            'password' => Hash::make('asesor123'),
            'role' => 'sales_advisor',
        ]);

        // Cajero/Tesorero 1
        User::create([
            'name' => 'Ana Tesorería',
            'email' => 'cajero1@english.com',
            'password' => Hash::make('cajero123'),
            'role' => 'cashier', // Cajero/Tesorero
        ]);

        // Cajero/Tesorero 2
        User::create([
            'name' => 'Pedro Finanzas',
            'email' => 'cajero2@english.com',
            'password' => Hash::make('cajero123'),
            'role' => 'cashier',
        ]);
    }
}
