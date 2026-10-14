// Telegram bildirim ayarları — backend core/services/notification_routing.py ile aynı kurallar.
export const TELEGRAM_CATEGORIES = [
    { key: 'OVERTIME', label: 'Fazla mesai' },
    { key: 'LEAVE', label: 'İzin' },
    { key: 'EXTERNAL_DUTY', label: 'Dış görev' },
    { key: 'CARDLESS_ENTRY', label: 'Kartsız giriş' },
    { key: 'MEAL', label: 'Yemek' },
    { key: 'PROCUREMENT', label: 'Satın alma' },
];

const DIRECTIONS = ['INCOMING', 'OWN'];

export function defaultTelegramPrefs() {
    const categories = {};
    for (const { key } of TELEGRAM_CATEGORIES) categories[key] = { INCOMING: true, OWN: true };
    return { categories, other: true, team_filter: 'ALL', team_employee_ids: [] };
}

export function mergeTelegramPrefs(raw) {
    const prefs = defaultTelegramPrefs();
    if (!raw || typeof raw !== 'object') return prefs;
    for (const { key } of TELEGRAM_CATEGORIES) {
        const row = raw.categories?.[key];
        for (const d of DIRECTIONS) {
            if (typeof row?.[d] === 'boolean') prefs.categories[key][d] = row[d];
        }
    }
    if (typeof raw.other === 'boolean') prefs.other = raw.other;
    if (raw.team_filter === 'ALL' || raw.team_filter === 'SELECTED') prefs.team_filter = raw.team_filter;
    if (Array.isArray(raw.team_employee_ids)) {
        prefs.team_employee_ids = raw.team_employee_ids.filter(Number.isInteger);
    }
    return prefs;
}

export function setAllCategories(prefs, value, directions = DIRECTIONS) {
    const next = mergeTelegramPrefs(prefs);
    for (const { key } of TELEGRAM_CATEGORIES) {
        for (const d of directions) next.categories[key][d] = value;
    }
    next.other = value;
    return next;
}

export const TELEGRAM_CODE_TTL_MS = 15 * 60 * 1000;

// Sunucunun verdiği expires_at geçersizse kodun 15 dk geçerli olduğu varsayılır.
export function telegramCodeExpiryMs(expiresAt, now = Date.now()) {
    const ms = Date.parse(expiresAt);
    return Number.isFinite(ms) ? ms : now + TELEGRAM_CODE_TTL_MS;
}

export const TELEGRAM_PROMPT_SEEN_KEY = 'tgPromptSeen';

// Davet kartı: sunucu "göster" dediyse ve bu oturumda daha önce gösterilmediyse.
export function shouldShowPrompt(status, seenInSession) {
    return !!status?.prompt?.show && !seenInSession;
}
