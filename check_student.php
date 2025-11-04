<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$student = App\Models\Student::where('first_name', 'Brad')
    ->where('paternal_last_name', 'Basilio')
    ->first();

if ($student) {
    echo "Student Found:\n";
    echo "ID: " . $student->id . "\n";
    echo "Name: " . $student->first_name . " " . $student->paternal_last_name . "\n";
    echo "Prospect Status: " . $student->prospect_status . "\n";
    echo "Enrollment Verified: " . ($student->enrollment_verified ? 'YES (true)' : 'NO (false)') . "\n";
    echo "Enrollment Code: " . ($student->enrollment_code ?? 'NULL') . "\n";
    echo "\n";
    
    // Check all matriculados
    echo "All matriculados:\n";
    $matriculados = App\Models\Student::where('prospect_status', 'matriculado')->get();
    foreach ($matriculados as $m) {
        echo "- {$m->first_name} {$m->paternal_last_name}: verified=" . ($m->enrollment_verified ? 'YES' : 'NO') . "\n";
    }
} else {
    echo "Student not found\n";
}
