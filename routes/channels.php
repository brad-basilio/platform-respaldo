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
