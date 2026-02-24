import { useEffect, useRef, useCallback } from 'react';

/**
 * useSmartPolling
 * A hook that manages polling intervals intelligently.
 *
 * Features:
 * - Polls at regular intervals when window is visible.
 * - Immediately refetches on window focus and resets the timer.
 * - Pauses polling when tab is hidden.
 *
 * @param {Function} refetchFn - The function to call to refresh data.
 * @param {number} intervalMs - The standard polling interval (default 30s).
 * @param {boolean} enabled - Whether polling is active.
 */
const useSmartPolling = (refetchFn, intervalMs = 30000, enabled = true) => {
    const savedCallback = useRef(refetchFn);
    const intervalRef = useRef(null);

    // Keep callback fresh
    useEffect(() => {
        savedCallback.current = refetchFn;
    }, [refetchFn]);

    useEffect(() => {
        if (!enabled) return;

        const startInterval = () => {
            // Clear any existing interval before starting a new one
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            intervalRef.current = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    savedCallback.current();
                }
            }, intervalMs);
        };

        // Start the initial interval
        startInterval();

        // Window Focus Handler: immediate fetch + reset timer
        const onFocus = () => {
            savedCallback.current();
            startInterval(); // Restart interval aligned to focus time
        };

        window.addEventListener('focus', onFocus);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            window.removeEventListener('focus', onFocus);
        };
    }, [intervalMs, enabled]);
};

export default useSmartPolling;
