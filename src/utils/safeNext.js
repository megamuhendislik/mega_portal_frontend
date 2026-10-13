// Giriş sonrası dönülecek yol: yalnız site içi göreli yol kabul edilir (açık yönlendirme yok).
export function safeNext(raw) {
    if (typeof raw !== 'string' || !raw.startsWith('/')) return '/';
    if (raw.startsWith('//') || raw.startsWith('/\\')) return '/';
    // Tarayıcı sekme/satır sonunu atar, ters bölüyü / sayar: "/\t/evil.com" → //evil.com
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f\\]/.test(raw)) return '/';
    if (raw === '/login' || raw.startsWith('/login?') || raw.startsWith('/login/')) return '/';
    return raw;
}

export function loginPathFor(pathWithSearch) {
    const next = safeNext(pathWithSearch);
    return next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
}
