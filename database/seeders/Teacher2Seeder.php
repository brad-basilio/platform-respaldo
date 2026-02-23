<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Teacher;
use App\Models\TimeSlot;
use Illuminate\Support\Facades\Hash;

class Teacher2Seeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $teacher = User::forceCreate([
            'id' => 19,
            'name' => 'Mike Wilson',
            'email' => 'teacher2@english.com',
            'password' => Hash::make('teacher123'),
            'role' => 'teacher',
        ]);
    }
}
