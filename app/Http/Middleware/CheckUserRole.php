<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CheckUserRole
{
    /**
     * Handle an incoming request.
     * Check if user can access the requested dashboard based on their role
     */
    public function handle(Request $request, Closure $next, string $requiredRole)
    {
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();

        // Get user's primary role
        if ($user->userAuths && $user->userAuths->count() > 0) {
            $primaryRole = $user->userAuths->first()->role;

            if ($primaryRole) {
                $userRoleName = strtolower($primaryRole->role_name);
                $requiredRoleLower = strtolower($requiredRole);

                // Debug logging
                Log::info('CheckUserRole Debug', [
                    'user_email' => $user->email,
                    'user_role' => $userRoleName,
                    'required_role' => $requiredRoleLower,
                    'route_name' => $request->route()->getName(),
                    'url' => $request->url()
                ]);

                // If user's role matches required role, allow access
                if ($userRoleName === $requiredRoleLower) {
                    return $next($request);
                }

                // User is trying to access wrong dashboard
                // Redirect to appropriate dashboard based on user's actual role
                $currentRoute = $request->route()->getName();

                switch ($userRoleName) {
                    case 'super admin':
                        if (!str_starts_with($currentRoute, 'super-admin.')) {
                            return redirect()->route('super-admin.dashboard');
                        }
                        break;
                    case 'admin':
                        if (!str_starts_with($currentRoute, 'admin.')) {
                            return redirect()->route('admin.dashboard');
                        }
                        break;
                    case 'user':
                        if (!str_starts_with($currentRoute, 'user.')) {
                            return redirect()->route('user.dashboard');
                        }
                        break;
                    default:
                        if (!str_starts_with($currentRoute, 'user.')) {
                            return redirect()->route('user.dashboard');
                        }
                }

                // If we're already in the correct section but wrong specific page, deny access
                // This prevents infinite loops while allowing access to correct sections
                return abort(403, 'NO ROLE ASSIGNED TO USER.');
            }
        }

        // If no role found, redirect to user dashboard only if not already there
        if ($request->route()->getName() !== 'user.dashboard') {
            return redirect()->route('user.dashboard');
        }

        return abort(403, 'No role assigned to user.');
    }
}
