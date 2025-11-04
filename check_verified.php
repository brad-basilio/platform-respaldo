<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Checking enrollment_verified values:\n\n";

$students = App\Models\Student::where('prospect_status', 'matriculado')->get();

foreach ($students as $student) {
    $verified = $student->enrollment_verified;
    $verifiedType = gettype($verified);
    $verifiedRaw = DB::table('students')->where('id', $student->id)->value('enrollment_verified');
    
    echo "ID: {$student->id}\n";
    echo "Name: {$student->first_name} {$student->paternal_last_name}\n";
    echo "enrollment_verified (Model): " . var_export($verified, true) . " (type: {$verifiedType})\n";
    echo "enrollment_verified (Raw DB): " . var_export($verifiedRaw, true) . "\n";
    echo "---\n";
}
