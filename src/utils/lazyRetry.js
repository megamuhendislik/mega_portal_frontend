import React from 'react';

/**
 * React.lazy wrapper that recovers from chunk-fetch failures (e.g. after a
 * deploy invalidates old chunk hashes) by reloading the page exactly once.
 *
 * sessionStorage flag prevents an infinite reload loop if the chunk is
 * genuinely broken (network down, build artifact missing).
 */
export const lazyRetry = (importFn) =>
    React.lazy(() => {
        const key = 'lazy-retry-' + importFn.toString().slice(0, 50);
        const hasRefreshed = JSON.parse(sessionStorage.getItem(key) || 'false');
        return importFn()
            .then((component) => {
                sessionStorage.removeItem(key);
                return component;
            })
            .catch((error) => {
                if (!hasRefreshed) {
                    sessionStorage.setItem(key, 'true');
                    window.location.reload();
                    return new Promise(() => {});
                }
                throw error;
            });
    });

export default lazyRetry;
