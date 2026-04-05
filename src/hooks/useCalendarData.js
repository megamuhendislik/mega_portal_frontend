import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Takvim bileşenleri için tatil ve izin verilerini fetch eder.
 * @param {boolean} enabled - Hook'un veri çekip çekmeyeceği
 * @returns {{ holidays: Array, leaveHistory: Array, loading: boolean, refetch: Function }}
 */
export default function useCalendarData(enabled = true) {
  const [holidays, setHolidays] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    if (!enabled) return;
    setLoading(true);

    Promise.allSettled([
      api.get('/public-holidays/?page_size=200'),
      api.get('/leave/requests/my_requests/?page_size=50'),
    ]).then(([holRes, leaveRes]) => {
      if (holRes.status === 'fulfilled') {
        const data = holRes.value.data?.results || holRes.value.data || [];
        setHolidays(data);
      }
      if (leaveRes.status === 'fulfilled') {
        const data = leaveRes.value.data?.results || leaveRes.value.data || [];
        setLeaveHistory(
          data.filter(h => ['PENDING', 'APPROVED', 'ESCALATED'].includes(h.status)).slice(0, 30)
        );
      }
    }).finally(() => setLoading(false));
  }, [enabled]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { holidays, leaveHistory, loading, refetch: fetchData };
}
