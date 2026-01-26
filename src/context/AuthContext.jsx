import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            // Check both storages
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            if (token) {
                try {
                    // Fetch user profile from backend
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
    }, []);

    const login = async (username, password, remember = false) => {
        const response = await api.post('/token/', { username, password });
        const { access, refresh } = response.data;

        if (remember) {
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('refresh_token');
        } else {
            sessionStorage.setItem('access_token', access);
            sessionStorage.setItem('refresh_token', refresh);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
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
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        setUser(null);
        window.location.href = '/login';
    };

    const hasPermission = (permissionCode) => {
        if (!user) return false;

        // Superuser Bypass (Check user.user.is_superuser because 'user' here is the Employee profile)
        if (user.user?.is_superuser) return true;

        if (!user.all_permissions) return false;

        // Direct permission check - no mapping (new minimal permission system)
        return user.all_permissions.includes(permissionCode);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
