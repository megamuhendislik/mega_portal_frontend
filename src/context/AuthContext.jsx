import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

// Permission Mapping: Old codes → New codes (Week 1 standardization)
// Supports backward compatibility during transition period
const PERMISSION_MAP = {
    // Employee permissions → Unified + Page access
    'EMPLOYEE_VIEW_ALL': ['MENU_EMPLOYEES_VIEW', 'EMPLOYEE_MANAGE'],
    'EMPLOYEE_CREATE': ['EMPLOYEE_MANAGE'],
    'EMPLOYEE_UPDATE': ['EMPLOYEE_MANAGE'],
    'EMPLOYEE_VIEW_LIST': ['MENU_EMPLOYEES_VIEW'],
    'EMPLOYEE_VIEW_DETAIL': ['MENU_EMPLOYEES_VIEW'],
    'EMPLOYEE_EDIT_PROFILE': ['EMPLOYEE_MANAGE'],
    'EMPLOYEE_EDIT_JOB': ['EMPLOYEE_MANAGE'],

    // Request management permissions → Standardized MANAGE
    'REQUEST_LEAVE_VIEW': ['REQUEST_ANNUAL_LEAVE_MANAGE'],
    'REQUEST_LEAVE_APPROVE': ['REQUEST_ANNUAL_LEAVE_MANAGE'],
    'LEAVE_REQUEST': ['REQUEST_ANNUAL_LEAVE_MANAGE'],
    'LEAVE_APPROVE': ['REQUEST_ANNUAL_LEAVE_MANAGE'],
    'LEAVE_REQUEST_APPROVE': ['REQUEST_ANNUAL_LEAVE_MANAGE'],
    'APPROVE_LEAVE_REQUESTS': ['REQUEST_ANNUAL_LEAVE_MANAGE'],

    'REQUEST_OVERTIME_VIEW': ['REQUEST_OVERTIME_MANAGE'],
    'OVERTIME_APPROVE': ['REQUEST_OVERTIME_MANAGE'],
    'REQUEST_OVERTIME_APPROVE': ['REQUEST_OVERTIME_MANAGE'],
    'APPROVE_OVERTIME_REQUESTS': ['REQUEST_OVERTIME_MANAGE'],

    'REQUEST_CARDLESS_ENTRY_VIEW': ['REQUEST_CARDLESS_ENTRY_MANAGE'],
    'REQUEST_CARDLESS_ENTRY_APPROVE': ['REQUEST_CARDLESS_ENTRY_MANAGE'],

    // Break analysis (feature-level)
    'ATTENDANCE_VIEW_BREAK_ANALYSIS': ['FEATURE_BREAK_ANALYSIS_VIEW_TEAM'],
    'ATTENDANCE_VIEW_OTHERS_BREAKS': ['FEATURE_BREAK_ANALYSIS_VIEW_TEAM'],

    // Organization chart
    'ORG_VIEW_ALL': ['MENU_ORG_CHART_VIEW'],
    'ORG_VIEW_TEAM': ['MENU_ORG_CHART_VIEW'],

    // Reports
    'REPORT_VIEW_ALL': ['MENU_REPORTS_VIEW'],
    'REPORT_VIEW_TEAM': ['MENU_REPORTS_VIEW'],

    // Work schedules / Calendar
    'SETTINGS_MANAGE_SCHEDULES': ['MENU_WORK_CALENDAR_VIEW'],
    'WORK_SCHEDULE_MANAGE': ['MENU_WORK_CALENDAR_VIEW'],
    'CALENDAR_MANAGE_HOLIDAYS': ['MENU_WORK_CALENDAR_VIEW'],

    // Meal tracking
    'REQUEST_MEAL_VIEW': ['MENU_MEAL_TRACKING_VIEW'],
    'REQUEST_MEAL_APPROVE': ['MENU_MEAL_TRACKING_VIEW'],
};

/**
 * Map old permission codes to new standardized codes.
 * @param {string} permissionCode - Old or new permission code
 * @returns {string[]} Array of permission codes to check
 */
const mapPermissionCode = (permissionCode) => {
    if (PERMISSION_MAP[permissionCode]) {
        const mapped = PERMISSION_MAP[permissionCode];
        // Return original + mapped codes (for dual-mode compatibility)
        return [permissionCode, ...mapped];
    }
    // Not in map, return as-is
    return [permissionCode];
};

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

        // Map old permission codes to new ones (backward compatibility)
        const permissionCodes = mapPermissionCode(permissionCode);

        // Check if user has any of the mapped permissions
        return permissionCodes.some(code => user.all_permissions.includes(code));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
