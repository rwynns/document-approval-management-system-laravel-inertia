import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import axios from 'axios';
import Echo from 'laravel-echo';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import Pusher from 'pusher-js';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { initializeTheme } from './hooks/use-appearance';

// Extend Window interface for Pusher and Echo
declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any>;
    }
}

// Configure Axios for CSRF protection
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.withCredentials = true;
axios.defaults.baseURL = window.location.origin;

// Bootstrap Laravel Echo untuk Reverb (Pusher)
window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    // Enable debug mode for development
    enableLogging: true,
    logToConsole: true,
});

console.log('📡 Laravel Echo initialized with Reverb:', {
    broadcaster: 'reverb',
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    appKey: import.meta.env.VITE_REVERB_APP_KEY,
    scheme: import.meta.env.VITE_REVERB_SCHEME,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
});

// Helper function to get CSRF token from cookie or meta tag
function getCsrfToken(): string | null {
    // First try to get from meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        const token = metaTag.getAttribute('content');
        if (token) return token;
    }

    // Then try from XSRF-TOKEN cookie (set by Sanctum)
    const matches = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (matches && matches[1]) {
        return decodeURIComponent(matches[1]);
    }

    return null;
}

// Add Socket ID to all Inertia requests for broadcasting exclusion (toOthers)
router.on('before', (event) => {
    // Add CSRF token to all Inertia requests
    const csrfToken = getCsrfToken();
    if (csrfToken) {
        event.detail.visit.headers = {
            ...event.detail.visit.headers,
            'X-CSRF-TOKEN': csrfToken,
            'X-XSRF-TOKEN': csrfToken,
        };
        console.log('🔒 Adding CSRF token to Inertia request:', csrfToken.substring(0, 20) + '...');
        console.log('📋 Request headers:', event.detail.visit.headers);
    } else {
        console.warn('⚠️ No CSRF token found!');
    }

    // Add Socket ID for broadcasting
    if (window.Echo) {
        const socketId = window.Echo.socketId();
        if (socketId) {
            event.detail.visit.headers = {
                ...event.detail.visit.headers,
                'X-Socket-ID': socketId,
            };
            console.log('🔌 Adding X-Socket-ID to Inertia request:', socketId);
        }
    }
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <>
                <App {...props} />
                <Toaster
                    position="top-center"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: 'white',
                            color: '#374151',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            maxWidth: '400px',
                            textAlign: 'center',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10B981',
                                secondary: 'white',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#EF4444',
                                secondary: 'white',
                            },
                        },
                    }}
                />
            </>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
