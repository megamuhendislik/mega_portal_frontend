/**
 * useFiscalPeriods — kullanıcının fiscal period listesini React hook olarak sunar.
 *
 * Kullanım:
 *   const { periods, current, loading, findByYearMonth, navigate } = useFiscalPeriods();
 *
 * - Periods backend'den çekilene kadar `current` null'dır; consumer loading state'i
 *   gözetmeli.
 * - Cache'lidir (5dk); aynı session içinde tekrar tekrar çağırılabilir.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    fetchMyFiscalPeriods,
    findCurrentPeriod,
    findPeriodByYearMonth,
    findPeriodForDate,
    navigatePeriod,
} from '../utils/fiscalPeriods';

export default function useFiscalPeriods({ months = 24 } = {}) {
    const [periods, setPeriods] = useState([]);
    const [current, setCurrent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [calendarName, setCalendarName] = useState('');
    const [reloadCounter, setReloadCounter] = useState(0);  // #61 FE-2: retry tetikleyici

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        // #61 FE-2: retry'da (reloadCounter>0) cache'i baypas et (force), ilk yüklemede cache.
        fetchMyFiscalPeriods({ months, force: reloadCounter > 0 })
            .then(data => {
                if (cancelled) return;
                const list = data.periods || [];
                setPeriods(list);
                setCalendarName(data.calendar_name || '');
                setCurrent(findCurrentPeriod(list));
                setError(null);
            })
            .catch(err => {
                if (cancelled) return;
                setError(err);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [months, reloadCounter]);

    const refetch = useCallback(() => setReloadCounter((c) => c + 1), []);  // #61 FE-2

    const findByYearMonth = useCallback(
        (year, month) => findPeriodByYearMonth(periods, year, month),
        [periods]
    );

    const findByDate = useCallback(
        (dateInput) => findPeriodForDate(periods, dateInput),
        [periods]
    );

    const navigate = useCallback(
        (year, month, direction) => navigatePeriod(periods, year, month, direction),
        [periods]
    );

    return {
        periods,
        current,
        loading,
        error,
        calendarName,
        findByYearMonth,
        findByDate,
        navigate,
        refetch,
    };
}
