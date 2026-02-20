<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
                'is_today_practice_teacher' => (function () use ($request) {
                    $user = $request->user();
                    if (!$user || $user->role !== 'teacher') return false;

                    $today = now()->toDateString();
                    return \App\Models\PracticeRotation::where('date', $today)
                        ->where('teacher_id', $user->id)
                        ->exists();
                })(),
            ],
            'today_practice_teacher' => (function () {
                $today = now()->toDateString();
                $rotation = \App\Models\PracticeRotation::where('date', $today)->with('teacher:id,name')->first();

                if (!$rotation) {
                    \App\Models\PracticeRotation::ensureRotationsExist(now(), 7);
                    $rotation = \App\Models\PracticeRotation::where('date', $today)->with('teacher:id,name')->first();
                }

                return $rotation?->teacher?->name;
            })(),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
