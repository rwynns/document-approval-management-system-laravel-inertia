import axios from 'axios';

// Get CSRF token from meta tag or cookie
function getCsrfToken(): string | null {
    // Try to get from meta tag first
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }
    
    // Try to get from cookie (XSRF-TOKEN)
    const matches = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (matches) {
        return decodeURIComponent(matches[1]);
    }
    
    return null;
}

// Get session token from cookie
function getSessionToken(): string | null {
    const matches = document.cookie.match(/laravel_session=([^;]+)/);
    if (matches) {
        return matches[1];
    }
    return null;
}

// Initialize CSRF protection
let csrfInitialized = false;
async function initializeCSRF() {
    if (csrfInitialized) return;
    
    try {
        // Get CSRF cookie from Laravel
        await axios.get('/sanctum/csrf-cookie', {
            withCredentials: true
        });
        csrfInitialized = true;
    } catch (error) {
        console.warn('Failed to initialize CSRF protection:', error);
    }
}

// Create axios instance
const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add CSRF token and auth token to requests
api.interceptors.request.use(async (config) => {
    // Ensure CSRF cookie is set first
    await initializeCSRF();
    
    // Get CSRF token from XSRF-TOKEN cookie (preferred by Laravel Sanctum)
    const xsrfMatches = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (xsrfMatches) {
        const xsrfToken = decodeURIComponent(xsrfMatches[1]);
        config.headers['X-XSRF-TOKEN'] = xsrfToken;
        console.log('Using X-XSRF-TOKEN from cookie');
    } else {
        // Fallback to X-CSRF-TOKEN from meta tag
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            config.headers['X-CSRF-TOKEN'] = csrfToken;
            console.log('Using X-CSRF-TOKEN from meta tag');
        } else {
            console.warn('No CSRF token found!');
        }
    }
    
    console.log('Session token found:', getSessionToken() ? 'Yes' : 'No');
    
    // Also support Bearer token for API token auth (backward compatibility)
    const token = localStorage.getItem('auth-token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('API Request headers:', config.headers);
    return config;
});

// Handle authentication errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 419) {
            // 401 = Unauthorized, 419 = CSRF token mismatch
            localStorage.removeItem('auth-token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;