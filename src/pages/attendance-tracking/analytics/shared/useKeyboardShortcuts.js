import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * useKeyboardShortcuts — analytics sayfasında kısayol eşleştirici.
 *
 * Usage:
 *   useKeyboardShortcuts({
 *     '?': () => setHelpOpen(true),
 *     'r': () => refetch(),
 *     'Escape': () => closeAllModals(),
 *     '/': (e) => { e.preventDefault(); searchRef.current?.focus(); },
 *   });
 *
 * Input/textarea/contenteditable içinde aktifken bu shortcut'lar tetiklenmez
 * (kullanıcı yazmaya odaklanmış demek). Escape hariç.
 *
 * Props:
 *   shortcuts — { [key]: handler(event) }
 *   enabled   — false ise dinleyici eklenmez (default true)
 */
export default function useKeyboardShortcuts(shortcuts, enabled = true) {
    const shortcutsRef = useRef(shortcuts);

    // Keep ref up to date without triggering re-subscribe (layout effect
    // runs synchronously after DOM mutation, before paint — avoids stale
    // handlers on next keydown)
    useLayoutEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    useEffect(() => {
        if (!enabled) return;

        const handler = (e) => {
            // İçinde yazılıyorsa (input, textarea, contenteditable) Escape hariç pas geç
            const target = e.target;
            const isInput = target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable
            );

            // Modifier tuşlu kombinasyonları pas geç (ctrl/alt/meta ile çakışmasın)
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            const key = e.key;

            if (isInput && key !== 'Escape') return;

            const handler = shortcutsRef.current[key];
            if (handler) {
                handler(e);
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [enabled]);
}
