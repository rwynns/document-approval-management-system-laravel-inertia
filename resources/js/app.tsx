import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import Echo from 'laravel-echo';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import Pusher from 'pusher-js';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { initializeTheme } from './hooks/use-appearance';

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

// Add Socket ID to all Inertia requests for broadcasting exclusion (toOthers)
router.on('before', (event) => {
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
