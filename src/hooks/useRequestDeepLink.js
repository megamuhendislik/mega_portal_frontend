import { useEffect, useRef } from 'react';
import { message } from 'antd';
import { findRequestRow, rowType } from '../utils/requestDeepLink';

/**
 * ?type=&id= ile gelen talebi, liste yüklenince detay penceresinde açar; sonra linki tüketir.
 * fetchFallback(deepLink) verilirse listede olmayan talep tekil uçtan getirilir (Promise<row|null>).
 */
export function useRequestDeepLink({ deepLink, loading, lists, open, onConsumed, fetchFallback }) {
    const handledRef = useRef(null);
    useEffect(() => {
        if (!deepLink) {
            handledRef.current = null;
            return;
        }
        if (loading) return;
        const key = `${deepLink.type}-${deepLink.id}`;
        if (handledRef.current === key) return;
        handledRef.current = key;
        const finish = (row, type) => {
            if (row) open(row, type);
            else message.warning('Talep bulunamadı ya da artık bu listede değil.');
            onConsumed?.();
        };
        const found = findRequestRow(lists, deepLink);
        if (found || !fetchFallback) {
            // react-hooks/set-state-in-effect: setState microtask'ta
            Promise.resolve().then(() => finish(found, found ? rowType(found) || deepLink.type : null));
        } else {
            fetchFallback(deepLink).then((row) => finish(row, deepLink.type), () => finish(null, null));
        }
    }, [deepLink, loading, lists, open, onConsumed, fetchFallback]);
}
