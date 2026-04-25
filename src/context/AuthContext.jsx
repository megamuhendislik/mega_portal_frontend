import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            if (token) {
                try {
                    const response = await api.get('/employees/me/');
                    setUser(response.data);
                } catch (error) {
                    console.error("Auth check failed", error);
                    if (error.response && error.response.status === 401) {
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        sessionStorage.removeItem('access_token');
                        sessionStorage.removeItem('refresh_token');
                    }
                }
            }
            setLoading(false);
        };
        checkAuth();

        // Cross-tab sync: başka sekmede logout olursa login'e yönlendir
        const handleStorageChange = (e) => {
            if (e.key === 'access_token') {
                if (!e.newValue) {
                    // Token silindi — logout (başka tab'dan)
                    setUser(null);
                    window.location.href = '/login';
                }
                // Token değişimi (refresh) durumunda reload YAPMA —
                // yeni token zaten localStorage'da, sonraki API çağrısı onu kullanacak.
                // Aynı kullanıcının token refresh'i sayfayı kırmaz.
            }
            // Refresh token silindi (logout) — eğer access da yoksa login'e git
            if (e.key === 'refresh_token' && !e.newValue) {
                const hasAccess = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
                if (!hasAccess) {
                    setUser(null);
                    window.location.href = '/login';
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Permission refresh after token refresh
        const handlePermissionsRefreshed = (e) => {
            if (e.detail) {
                setUser(e.detail);
            }
        };
        window.addEventListener('permissions-refreshed', handlePermissionsRefreshed);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('permissions-refreshed', handlePermissionsRefreshed);
        };
    }, []);

    const login = useCallback(async (username, password, remember = false) => {
        // Önceki kullanıcının tüm verilerini temizle (LAN proxy cache bypass)
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');

        const response = await api.post('/token/', { username, password });
        const { access, refresh } = response.data;

        if (remember) {
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
        } else {
            sessionStorage.setItem('access_token', access);
            sessionStorage.setItem('refresh_token', refresh);
        }

        // Fetch user details immediately after login
        try {
            const userResponse = await api.get('/employees/me/');
            setUser(userResponse.data);
        } catch (error) {
            console.error("Failed to fetch user details after login", error);
            setUser({ username });
        }

        return response.data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        setUser(null);
        window.location.href = '/login';
    }, []);

    const hasPermission = useCallback((permissionCode) => {
        if (!user) return false;

        // 1. Django Superuser Bypass (en yüksek seviye)
        if (user.user?.is_superuser) return true;

        // 2. is_admin flag — backend hesaplar (superuser veya SYSTEM_ADMIN rolü
        //    veya SYSTEM_FULL_ACCESS yetkisi). Defense-in-depth.
        if (user.is_admin) return true;

        // 3. Roles SYSTEM_ADMIN içinde mi? (defense-in-depth)
        if (Array.isArray(user.roles) && user.roles.some((r) => r?.key === 'SYSTEM_ADMIN')) return true;

        if (!user.all_permissions) return false;

        // 4. SYSTEM_FULL_ACCESS permission bypass
        if (user.all_permissions.includes('SYSTEM_FULL_ACCESS')) return true;

        // 5. Direct permission check
        return user.all_permissions.includes(permissionCode);
    }, [user]);

    const value = useMemo(() => ({
        user, login, logout, loading, hasPermission
    }), [user, loading, login, logout, hasPermission]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
