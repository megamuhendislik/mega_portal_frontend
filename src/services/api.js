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

// Flag to prevent multiple concurrent refresh requests
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

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
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
            isRefreshing = true;

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
