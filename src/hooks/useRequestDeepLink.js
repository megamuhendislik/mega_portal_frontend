import { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { deepLinkKey, deepLinkStep, findRequestRow, rowType } from '../utils/requestDeepLink';

/**
 * ?type=&id= ile gelen talebi, liste yüklenince detay penceresinde açar; sonra linki tüketir.
 * refetch() verilirse aramadan önce sekme verisi link başına bir kez tazelenir (Promise).
 * fetchFallback(deepLink) verilirse listede olmayan talep tekil uçtan getirilir (Promise<row|null>).
 */
export function useRequestDeepLink({ deepLink, loading, lists, open, onConsumed, fetchFallback, refetch }) {
    const handledRef = useRef(null);
    const pendingRef = useRef(null); // tazelemesi süren link
    const refreshedRef = useRef(null); // tazelemesi biten link
    const [refreshTick, setRefreshTick] = useState(0);
    useEffect(() => {
        if (!deepLink) {
            handledRef.current = null;
            pendingRef.current = null;
            refreshedRef.current = null;
            return;
        }
        const key = deepLinkKey(deepLink);
        const step = deepLinkStep({
            key,
            loading,
            handledKey: handledRef.current,
            pendingKey: pendingRef.current,
            refreshedKey: refreshedRef.current,
            canRefetch: !!refetch,
        });
        if (step === 'refetch') {
            pendingRef.current = key;
            const done = () => {
                if (pendingRef.current !== key) return; // bu arada link değişti
                pendingRef.current = null;
                refreshedRef.current = key;
                setRefreshTick((n) => n + 1); // taze listeyle tekrar çalış
            };
            // react-hooks/set-state-in-effect: tazeleme microtask'ta başlar
            Promise.resolve().then(() => refetch()).then(done, done);
            return;
        }
        if (step !== 'search') return;
        handledRef.current = key;
        const finish = (row, type) => {
            if (handledRef.current !== key) return; // eski linkin geç kalan sonucu
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
    }, [deepLink, loading, lists, open, onConsumed, fetchFallback, refetch, refreshTick]);
}
