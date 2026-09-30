import { useEffect, useState } from 'react';
import api from '../services/api';

// Bu FM onaylanırsa haftalık sınır aşılıyor mu (sistem yöneticisi onayı gerekecek mi)?
// Uç yoksa ya da hata dönerse sessizce null.
export default function useAdminApprovalCheck({ employeeId, date, durationSeconds, excludeRequestId, enabled = true }) {
    const seconds = Math.round(Number(durationSeconds) || 0);
    const key = enabled && date && seconds > 0
        ? [employeeId || '', date, seconds, excludeRequestId || ''].join('|')
        : null;
    const [result, setResult] = useState({ key: null, data: null });

    useEffect(() => {
        if (!key) return undefined;
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const params = { date, duration_seconds: seconds };
                if (employeeId) params.employee_id = employeeId;
                if (excludeRequestId) params.exclude_request_id = excludeRequestId;
                const res = await api.get('/overtime-requests/admin-approval-check/', { params });
                if (!cancelled) setResult({ key, data: res?.data || null });
            } catch {
                if (!cancelled) setResult({ key, data: null });
            }
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [key, employeeId, date, seconds, excludeRequestId]);

    return key && result.key === key ? result.data : null;
}
