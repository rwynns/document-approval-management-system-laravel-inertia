<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Public channel for role management (everyone can listen)
Broadcast::channel('role-management', function () {
    return true; // Public channel
});

// Private channel example (if needed)
// Broadcast::channel('role-management-private', function ($user) {
//     return $user->role === 'admin'; // Only admins can listen
// });
