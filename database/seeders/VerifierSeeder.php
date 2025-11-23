<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class VerifierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Verificador 1
        User::UpdateOrCreate([
          
            'email' => 'verificador1@english.com',
          
        ], [
            'name' => 'Laura Verificación',
            'email' => 'verificador1@english.com',
            'password' => Hash::make('verifier123'),
            'role' => 'verifier',
        ]);

      
    }
}
