<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Canal privado para notificaciones a cajeros
// Solo usuarios con rol 'cashier' pueden suscribirse
Broadcast::channel('cashiers', function ($user) {
    return $user->role === 'cashier';
});

// Canal privado para notificaciones a asesores específicos
// Solo el asesor con el ID especificado puede suscribirse
Broadcast::channel('advisor.{advisorId}', function ($user, $advisorId) {
    return (int) $user->id === (int) $advisorId && in_array($user->role, ['admin', 'sales_advisor']);
});
