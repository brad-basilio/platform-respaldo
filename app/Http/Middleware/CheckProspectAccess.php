<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckProspectAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        // Permitir acceso a admin, sales_advisor, cashier y verifier
        if (!$user || !in_array($user->role, ['admin', 'sales_advisor', 'cashier', 'verifier'])) {
            abort(403, 'No tienes permiso para acceder a esta sección.');
        }
        
        return $next($request);
    }
}
