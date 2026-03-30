import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Cache-busting: her isteğe benzersiz timestamp ekle (proxy cache bypass)
        config.params = config.params || {};
        config.params._t = Date.now();
        // Strip "undefined" / "null" string values from query params to prevent backend 500 errors
        if (config.params) {
            Object.keys(config.params).forEach(key => {
                if (config.params[key] === undefined || config.params[key] === null || config.params[key] === 'undefined' || config.params[key] === 'null') {
                    delete config.params[key];
                }
            });
        }
        // Also sanitize URL-embedded query strings (e.g. api.get(`/endpoint/?employee_id=${val}`))
        if (config.url && config.url.includes('=undefined')) {
            config.url = config.url.replace(/([?&])[^=]+=undefined(&|$)/g, (match, prefix, suffix) => {
                return suffix === '&' ? prefix : '';
            });
        }
        if (config.url && config.url.includes('=null')) {
            config.url = config.url.replace(/([?&])[^=]+=null(&|$)/g, (match, prefix, suffix) => {
                return suffix === '&' ? prefix : '';
            });
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Flag to prevent multiple concurrent refresh requests (in-tab)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// Cross-tab refresh coordination: wait for another tab's refresh result
const waitForCrossTabRefresh = () => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            window.removeEventListener('storage', handler);
            reject(new Error('Cross-tab refresh timeout'));
        }, 10000);

        const handler = (e) => {
            if (e.key === 'access_token' && e.newValue) {
                clearTimeout(timeout);
                window.removeEventListener('storage', handler);
                resolve(e.newValue);
            } else if (e.key === '_token_refresh_lock' && e.newValue === 'failed') {
                clearTimeout(timeout);
                window.removeEventListener('storage', handler);
                reject(new Error('Cross-tab refresh failed'));
            }
        };
        window.addEventListener('storage', handler);
    });
};

// Check if another tab is currently refreshing (within last 15 seconds)
const isAnotherTabRefreshing = () => {
    const lockTime = localStorage.getItem('_token_refresh_lock');
    if (!lockTime || lockTime === 'failed') return false;
    return (Date.now() - parseInt(lockTime, 10)) < 15000;
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            // In-tab queue: another request in THIS tab is already refreshing
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;

            // Cross-tab check: another TAB is already refreshing
            if (isAnotherTabRefreshing()) {
                try {
                    const newToken = await waitForCrossTabRefresh();
                    originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
                    return api(originalRequest);
                } catch {
                    // Cross-tab refresh failed or timed out, try ourselves
                }
            }

            isRefreshing = true;
            // Set cross-tab lock with timestamp
            localStorage.setItem('_token_refresh_lock', String(Date.now()));

            try {
                let refreshToken = localStorage.getItem('refresh_token');
                let storage = localStorage;

                if (!refreshToken) {
                    refreshToken = sessionStorage.getItem('refresh_token');
                    storage = sessionStorage;
                }

                if (!refreshToken) {
                    throw new Error("No refresh token available");
                }

                const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
                const response = await axios.post(`${baseURL}/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access } = response.data;
                storage.setItem('access_token', access);
                // Clear the lock (other tabs will pick up the new access_token via storage event)
                localStorage.removeItem('_token_refresh_lock');

                api.defaults.headers.common['Authorization'] = `Bearer ${access}`;

                // Release queued requests immediately before permission refresh
                processQueue(null, access);
                isRefreshing = false;

                // Fire-and-forget permission refresh (don't block queued requests)
                axios.get(`${baseURL}/employees/me/`, {
                    headers: { Authorization: `Bearer ${access}` }
                }).then(meResponse => {
                    window.dispatchEvent(new CustomEvent('permissions-refreshed', { detail: meResponse.data }));
                }).catch(permErr => {
                    console.warn('Permission refresh after token refresh failed:', permErr);
                });

                originalRequest.headers['Authorization'] = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Signal failure to other tabs
                localStorage.setItem('_token_refresh_lock', 'failed');
                setTimeout(() => localStorage.removeItem('_token_refresh_lock'), 1000);

                processQueue(refreshError, null);
                isRefreshing = false;

                console.error('Token refresh failed:', refreshError);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                sessionStorage.removeItem('access_token');
                sessionStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

// Frontend hata raporlama
export function reportFrontendError(error, componentName = '') {
    try {
        api.post('/system/error-logs/report/', {
            message: error.message || String(error),
            stack_trace: error.stack || '',
            source_url: window.location.href,
            component_name: componentName,
        }).catch(() => {});
    } catch {
        // Hata raporlama hatası — yoksay
    }
}

export default api;
