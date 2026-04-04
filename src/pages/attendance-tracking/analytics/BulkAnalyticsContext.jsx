import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAnalyticsFilter } from './AnalyticsFilterContext';
import api from '../../../services/api';

const BulkAnalyticsContext = createContext(null);

const ALL_SECTIONS = 'team_overview,work_hours,entry_exit,break_meal,overtime,absence_leave';

export function BulkAnalyticsProvider({ children }) {
    const { queryParams } = useAnalyticsFilter();
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);

    const fetchBulk = useCallback(async () => {
        // Abort previous in-flight request
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/bulk/', {
                params: { ...queryParams, sections: ALL_SECTIONS },
                signal: controller.signal,
            });
            if (!controller.signal.aborted) {
                setData(res.data || {});
            }
        } catch (err) {
            if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
            console.error('BulkAnalytics fetch error:', err);
            setError('Analitik verileri yüklenemedi.');
            // On error, clear data so sections can fallback to individual fetches
            setData({});
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [queryParams]);

    useEffect(() => {
        fetchBulk();
        return () => {
            if (abortRef.current) abortRef.current.abort();
        };
    }, [fetchBulk]);

    const value = { data, loading, error, refetch: fetchBulk };

    return (
        <BulkAnalyticsContext.Provider value={value}>
            {children}
        </BulkAnalyticsContext.Provider>
    );
}

/**
 * Hook to consume bulk analytics data.
 * Returns { data, loading, error, refetch } where data is the full bulk response object.
 * Individual sections can access their data via data.team_overview, data.work_hours, etc.
 *
 * Returns null if used outside provider (signals: use individual fetch fallback).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useBulkAnalytics() {
    return useContext(BulkAnalyticsContext);
}
