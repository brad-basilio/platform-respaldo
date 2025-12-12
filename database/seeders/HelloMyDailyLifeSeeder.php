<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ClassTemplate;
use App\Models\ClassTemplateQuestion;
use App\Models\TemplateQuestion;
use App\Models\User;

class HelloMyDailyLifeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Seeder para la clase "Hello! My Daily Life" - Nivel Básico A1
     */
    public function run(): void
    {
        // Obtener el primer usuario admin o el primer usuario
        $adminUser = User::where('role', 'admin')->first() ?? User::first();
        
        // Crear el template de clase
        $template = ClassTemplate::create([
            'academic_level_id' => 3, // Avanzado (cambiar según tu BD)
            'created_by' => $adminUser->id,
            'title' => 'Hello! My Daily Life',
            'session_number' => '1',
            'duration_minutes' => 60,
            'modality' => 'theoretical',
            'description' => 'Clase introductoria de nivel Básico (A1) que se enfoca en la comunicación personal esencial. Los estudiantes aprenderán a presentarse con datos básicos (nombre, edad, origen) y a describir sus hábitos y actividades diarias utilizando los dos pilares gramaticales del nivel inicial: el verbo "To Be" y el Presente Simple.',
            'objectives' => "Presentarse formal e informalmente usando el verbo \"To Be\".\nIdentificar y usar vocabulario clave sobre la rutina diaria (get up, have breakfast, go to work).\nFormar oraciones afirmativas en Presente Simple, prestando especial atención a la conjugación de la tercera persona singular (He, She, It).",
            'content' => $this->getContent(),
            'intro_video_url' => 'https://youtu.be/YZ3dEZf8JwM',
            'is_active' => true,
        ]);

        // Crear las preguntas del examen
        $this->createQuestions($template->id);

        $this->command->info('✅ Template "Hello! My Daily Life" creado con ' . ClassTemplateQuestion::where('class_template_id', $template->id)->count() . ' preguntas.');
    }

    /**
     * Obtener el contenido HTML de la clase
     */
    private function getContent(): string
    {
        return <<<'HTML'
<h1>🇺🇸 Apuntes de Clase: Hello! My Daily Life</h1>
<h2>Nivel: Básico (A1 - Principiante)</h2>
<h3>Tema Central: Presentación Personal y Rutina</h3>
<hr>
<h2>1. Warm-up: ¡Rompiendo el Hielo! (5 minutos)</h2>
<p>El objetivo inicial es practicar los saludos y la información básica que ya conocemos.</p>
<ul>
<li><p><strong>Teacher:</strong> Good morning, class!</p></li>
<li><p><strong>Student:</strong> Good morning / Hello!</p></li>
</ul>
<p>Practicamos las siguientes preguntas y respuestas clave:</p>
<ul>
<li><p><strong>What's your name?</strong> → My name is [Nombre].</p></li>
<li><p><strong>How old are you?</strong> → I am [edad] years old.</p></li>
<li><p><strong>Where are you from?</strong> → I am from [País/Ciudad].</p></li>
</ul>
<hr>
<h2>2. Gramática en Foco: El Verbo "To Be" (15 minutos)</h2>
<p>El verbo "to be" es el más importante en inglés. Significa "ser" o "estar".</p>
<h3>Conjugación en Presente:</h3>
<table>
<thead>
<tr><th>Sujeto</th><th>Verbo "To Be"</th><th>Ejemplo</th></tr>
</thead>
<tbody>
<tr><td>I</td><td>am</td><td>I <strong>am</strong> a student.</td></tr>
<tr><td>You</td><td>are</td><td>You <strong>are</strong> my friend.</td></tr>
<tr><td>He / She / It</td><td>is</td><td>She <strong>is</strong> happy.</td></tr>
<tr><td>We</td><td>are</td><td>We <strong>are</strong> in class.</td></tr>
<tr><td>They</td><td>are</td><td>They <strong>are</strong> from Peru.</td></tr>
</tbody>
</table>
<h3>Contracciones (muy usadas al hablar):</h3>
<ul>
<li>I am → <strong>I'm</strong></li>
<li>You are → <strong>You're</strong></li>
<li>He is → <strong>He's</strong></li>
<li>She is → <strong>She's</strong></li>
<li>It is → <strong>It's</strong></li>
<li>We are → <strong>We're</strong></li>
<li>They are → <strong>They're</strong></li>
</ul>
<hr>
<h2>3. Vocabulario: Mi Rutina Diaria (Daily Routine) (10 minutos)</h2>
<p>Aprendemos las acciones que hacemos todos los días:</p>
<table>
<thead>
<tr><th>Inglés</th><th>Español</th></tr>
</thead>
<tbody>
<tr><td>wake up</td><td>despertarse</td></tr>
<tr><td>get up</td><td>levantarse</td></tr>
<tr><td>take a shower</td><td>ducharse</td></tr>
<tr><td>brush my teeth</td><td>cepillarse los dientes</td></tr>
<tr><td>have breakfast</td><td>desayunar</td></tr>
<tr><td>go to work / school</td><td>ir al trabajo / escuela</td></tr>
<tr><td>have lunch</td><td>almorzar</td></tr>
<tr><td>have dinner</td><td>cenar</td></tr>
<tr><td>watch TV</td><td>ver televisión</td></tr>
<tr><td>go to bed</td><td>ir a la cama</td></tr>
</tbody>
</table>
<hr>
<h2>4. Gramática en Foco: El Presente Simple (15 minutos)</h2>
<p>Usamos el Presente Simple para hablar de hábitos y rutinas.</p>
<h3>Regla de Oro para la Tercera Persona (He, She, It):</h3>
<p>¡Se añade <strong>-S</strong> o <strong>-ES</strong> al verbo!</p>
<table>
<thead>
<tr><th>Sujeto</th><th>Verbo</th><th>Ejemplo</th></tr>
</thead>
<tbody>
<tr><td>I</td><td>work</td><td>I <strong>work</strong> in an office.</td></tr>
<tr><td>You</td><td>work</td><td>You <strong>work</strong> at home.</td></tr>
<tr><td>He / She / It</td><td>work<strong>s</strong></td><td>He <strong>works</strong> in a hospital.</td></tr>
<tr><td>We</td><td>work</td><td>We <strong>work</strong> together.</td></tr>
<tr><td>They</td><td>work</td><td>They <strong>work</strong> on Saturdays.</td></tr>
</tbody>
</table>
<h3>Casos especiales para la tercera persona:</h3>
<ul>
<li>Verbos que terminan en <strong>-o, -ss, -sh, -ch, -x</strong> → se añade <strong>-ES</strong><br>Ej: go → go<strong>es</strong> / watch → watch<strong>es</strong></li>
<li>Verbos que terminan en <strong>consonante + y</strong> → se cambia la "y" por <strong>-IES</strong><br>Ej: study → stud<strong>ies</strong></li>
</ul>
<hr>
<h2>5. Práctica: Describiendo mi día (10 minutos)</h2>
<p>Vamos a crear oraciones sobre nuestra rutina. Completa con tus datos:</p>
<ol>
<li>I wake up at _______ am.</li>
<li>I have breakfast at _______ am.</li>
<li>I go to _______ (work/school/university).</li>
<li>I have lunch at _______ pm.</li>
<li>I go to bed at _______ pm.</li>
</ol>
<p><strong>Ejemplo de un párrafo:</strong></p>
<blockquote>
<p>"My name is Carlos. I am 25 years old and I am from Lima, Peru. I wake up at 6:00 am. I take a shower and have breakfast at 7:00 am. I go to work at 8:00 am. I have lunch at 1:00 pm. After work, I watch TV. I go to bed at 11:00 pm."</p>
</blockquote>
<hr>
<h2>6. Resumen de la Clase</h2>
<ul>
<li>✅ Verbo "To Be": I am, You are, He/She/It is, We are, They are</li>
<li>✅ Presente Simple: para hábitos y rutinas</li>
<li>✅ Regla: He/She/It + verbo con -S/-ES</li>
<li>✅ Vocabulario de rutina diaria</li>
</ul>
<hr>
<h2>📝 Tarea para casa:</h2>
<ol>
<li>Escribe un párrafo de 5 oraciones describiendo tu rutina diaria.</li>
<li>Practica las contracciones del verbo "to be" en voz alta.</li>
</ol>
HTML;
    }

    /**
     * Crear las preguntas del examen
     */
    private function createQuestions(int $templateId): void
    {
        $questions = [
            // ===== VERB TO BE - Multiple Choice (10 preguntas) =====
            [
                'question' => 'I _____ a student at the university.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'are', 'is_correct' => false],
                    ['text' => 'is', 'is_correct' => false],
                    ['text' => 'am', 'is_correct' => true],
                    ['text' => 'be', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'She _____ my best friend.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'are', 'is_correct' => false],
                    ['text' => 'is', 'is_correct' => true],
                    ['text' => 'am', 'is_correct' => false],
                    ['text' => 'be', 'is_correct' => false],
                ],
                'points' => 2,
            ],
            [
                'question' => 'We _____ tired after class.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'are', 'is_correct' => true],
                    ['text' => 'is', 'is_correct' => false],
                    ['text' => 'am', 'is_correct' => false],
                    ['text' => 'be', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'My dog _____ in the garden now.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'are', 'is_correct' => false],
                    ['text' => 'is', 'is_correct' => true],
                    ['text' => 'am', 'is_correct' => false],
                    ['text' => 'be', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'You _____ a very good student.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'are', 'is_correct' => true],
                    ['text' => 'is', 'is_correct' => false],
                    ['text' => 'am', 'is_correct' => false],
                    ['text' => 'be', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'They _____ 35 years old.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'are', 'is_correct' => true],
                    ['text' => 'is', 'is_correct' => false],
                    ['text' => 'am', 'is_correct' => false],
                    ['text' => 'be', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'It _____ cold today.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'are', 'is_correct' => false],
                    ['text' => 'is', 'is_correct' => true],
                    ['text' => 'am', 'is_correct' => false],
                    ['text' => 'be', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'Maria and Luis _____ married.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'are', 'is_correct' => true],
                    ['text' => 'is', 'is_correct' => false],
                    ['text' => 'am', 'is_correct' => false],
                    ['text' => 'be', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'I _____ happy to see you.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'are', 'is_correct' => false],
                    ['text' => 'is', 'is_correct' => false],
                    ['text' => 'am', 'is_correct' => true],
                    ['text' => 'be', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'He _____ my brother.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'are', 'is_correct' => false],
                    ['text' => 'is', 'is_correct' => true],
                    ['text' => 'am', 'is_correct' => false],
                    ['text' => 'be', 'is_correct' => false],
                ],
                'points' => 1,
            ],

            // ===== VERB TO BE - True/False (10 preguntas) =====
            [
                'question' => 'I is a teacher.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => false],
                    ['text' => 'Falso', 'is_correct' => true],
                ],
                'points' => 1,
            ],
            [
                'question' => 'You are my friend.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'She are happy.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => false],
                    ['text' => 'Falso', 'is_correct' => true],
                ],
                'points' => 1,
            ],
            [
                'question' => 'We am students.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => false],
                    ['text' => 'Falso', 'is_correct' => true],
                ],
                'points' => 1,
            ],
            [
                'question' => 'They are from Canada.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'He is thirty years old.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'The coffee is hot.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'My parents is at home.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => false],
                    ['text' => 'Falso', 'is_correct' => true],
                ],
                'points' => 1,
            ],
            [
                'question' => 'I am hungry.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'It are a blue pen.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => false],
                    ['text' => 'Falso', 'is_correct' => true],
                ],
                'points' => 1,
            ],

            // ===== PRESENT SIMPLE - Multiple Choice (10 preguntas) =====
            [
                'question' => 'I always _____ breakfast at 7:00 am.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'has', 'is_correct' => false],
                    ['text' => 'have', 'is_correct' => true],
                    ['text' => 'having', 'is_correct' => false],
                    ['text' => 'to have', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'She _____ to work by bus every morning.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'go', 'is_correct' => false],
                    ['text' => 'goes', 'is_correct' => true],
                    ['text' => 'going', 'is_correct' => false],
                    ['text' => 'gone', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'We _____ dinner at home with our family.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'eats', 'is_correct' => false],
                    ['text' => 'eat', 'is_correct' => true],
                    ['text' => 'eating', 'is_correct' => false],
                    ['text' => 'ate', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'He usually _____ TV after dinner.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'watch', 'is_correct' => false],
                    ['text' => 'watching', 'is_correct' => false],
                    ['text' => 'watches', 'is_correct' => true],
                    ['text' => 'to watch', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'They _____ up late on Saturdays.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'get', 'is_correct' => true],
                    ['text' => 'gets', 'is_correct' => false],
                    ['text' => 'getting', 'is_correct' => false],
                    ['text' => 'got', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'My mother _____ home at 6:00 pm.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'go', 'is_correct' => false],
                    ['text' => 'goes', 'is_correct' => true],
                    ['text' => 'going', 'is_correct' => false],
                    ['text' => 'gone', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'You _____ the newspaper every day.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'reads', 'is_correct' => false],
                    ['text' => 'read', 'is_correct' => true],
                    ['text' => 'reading', 'is_correct' => false],
                    ['text' => 'to read', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'The class _____ at 9:00 am.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'start', 'is_correct' => false],
                    ['text' => 'starts', 'is_correct' => true],
                    ['text' => 'starting', 'is_correct' => false],
                    ['text' => 'started', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'Sandra _____ a shower in the morning.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'take', 'is_correct' => false],
                    ['text' => 'taking', 'is_correct' => false],
                    ['text' => 'takes', 'is_correct' => true],
                    ['text' => 'took', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'We _____ our teeth before going to bed.',
                'type' => 'multiple_choice',
                'options' => [
                    ['text' => 'brushes', 'is_correct' => false],
                    ['text' => 'brush', 'is_correct' => true],
                    ['text' => 'brushing', 'is_correct' => false],
                    ['text' => 'brushed', 'is_correct' => false],
                ],
                'points' => 1,
            ],

            // ===== PRESENT SIMPLE - True/False (10 preguntas) =====
            [
                'question' => 'I goes to the gym on Mondays.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => false],
                    ['text' => 'Falso', 'is_correct' => true],
                ],
                'points' => 1,
            ],
            [
                'question' => 'My father works in an office.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'We have lunch at 2:00 pm.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'She get up very early.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => false],
                    ['text' => 'Falso', 'is_correct' => true],
                ],
                'points' => 1,
            ],
            [
                'question' => 'They watchs movies on Friday night.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => false],
                    ['text' => 'Falso', 'is_correct' => true],
                ],
                'points' => 1,
            ],
            [
                'question' => 'You take a shower every morning.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'The train leaves at 7:00 am.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'I finishes my homework quickly.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => false],
                    ['text' => 'Falso', 'is_correct' => true],
                ],
                'points' => 1,
            ],
            [
                'question' => 'My sister drinks coffee every day.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
            [
                'question' => 'We go to bed at 11:00 pm.',
                'type' => 'true_false',
                'options' => [
                    ['text' => 'Verdadero', 'is_correct' => true],
                    ['text' => 'Falso', 'is_correct' => false],
                ],
                'points' => 1,
            ],
        ];

        foreach ($questions as $questionData) {
            TemplateQuestion::create([
                'class_template_id' => $templateId,
                'question' => $questionData['question'],
                'type' => $questionData['type'],
                'options' => $questionData['options'],
                'points' => $questionData['points'],
                'is_active' => true,
            ]);
        }
    }
}
