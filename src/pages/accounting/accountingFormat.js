// Muhasebe Paneli — saf formatlayıcılar ve durum haritaları (JSX yok).

// =========== DURUM / STATUS HARITALARI ===========

// Roster çalışan durumu
export const ROSTER_STATUS = {
    INSIDE: { label: 'Ofiste', color: 'green' },
    OUTSIDE: { label: 'Dışarıda', color: 'default' },
    ON_LEAVE: { label: 'İzinde', color: 'purple' },
};

// Genel talep durumları (izin / mesai)
export const REQUEST_STATUS_COLORS = {
    PENDING: 'blue',
    POTENTIAL: 'cyan',
    APPROVED: 'green',
    AUTO_APPROVED: 'green',
    REJECTED: 'red',
    CANCELLED: 'default',
    INTENDED: 'geekblue',
};

export const REQUEST_STATUS_LABELS = {
    PENDING: 'Onay Bekliyor',
    POTENTIAL: 'Algılandı',
    APPROVED: 'Onaylandı',
    AUTO_APPROVED: 'Oto. Onaylandı',
    REJECTED: 'Reddedildi',
    CANCELLED: 'İptal Edildi',
    INTENDED: 'Planlandı',
};

// Kart yön rozetleri
export const DIRECTION_LABELS = {
    IN: { label: 'Giriş', color: 'green' },
    OUT: { label: 'Çıkış', color: 'volcano' },
};

// =========== SABITLER ===========

// Ortak tarih/saat aralığı ayıracı (en-dash, çevresi boşluklu): "09:00 – 18:00"
export const RANGE_SEP = ' – ';

// =========== EMPTY-STATE METNI ===========

/**
 * Tablo boş-durum açıklaması (3 durum):
 *   - dönem seçili değil (!ready)      -> "Dönem seçin"
 *   - dönem seçili, henüz yüklenmedi   -> "Yükleniyor…"
 *   - yüklendi, sonuç boş              -> "Kayıt bulunamadı" (özelleştirilebilir)
 */
export const emptyStateText = (ready, loaded, emptyLabel = 'Kayıt bulunamadı') => {
    if (!ready) return 'Dönem seçin';
    if (!loaded) return 'Yükleniyor…';
    return emptyLabel;
};

// =========== FORMATLAYICILAR ===========

// "2026-03-12" -> "12.03.2026"
export const fmtDate = (s) => {
    if (!s) return '—';
    const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Istanbul',
    });
};

// ISO -> "12.03.2026 14:30"
export const fmtDateTime = (s) => {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
    });
};

// "14:30:00" -> "14:30"  (HH:MM:SS veya HH:MM)
export const fmtTime = (s) => {
    if (!s) return '—';
    const m = String(s).match(/^(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : s;
};

// Tarih aralığı: tek günse "12.03.2026", aksi "12.03.2026 – 14.03.2026"
export const fmtRange = (start, end) => {
    if (!start && !end) return '—';
    if (!end || start === end) return fmtDate(start);
    return `${fmtDate(start)}${RANGE_SEP}${fmtDate(end)}`;
};

// Saniye -> "Xs Ydk" (örn 3900 -> "1s 5dk", 1800 -> "30dk")
export const fmtDurationFromSeconds = (sec) => {
    if (sec == null || isNaN(sec)) return '—';
    const total = Math.round(Math.abs(sec) / 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h && m) return `${h}s ${m}dk`;
    if (h) return `${h}s`;
    return `${m}dk`;
};

// Dakika -> "Xs Ydk"
export const fmtDurationFromMinutes = (min) => {
    if (min == null || isNaN(min)) return '—';
    return fmtDurationFromSeconds(min * 60);
};

// Saniye -> "S:MM" saat:dk (örn 30600 -> "8:30")
export const fmtHourMin = (sec) => {
    if (sec == null || isNaN(sec)) return '—';
    const neg = sec < 0;
    const total = Math.round(Math.abs(sec) / 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${neg ? '-' : ''}${h}:${String(m).padStart(2, '0')}`;
};

// Ondalık saat: 12.5 -> "12,5 s"
export const fmtHours = (v) => {
    if (v == null || isNaN(v)) return '—';
    return `${Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} s`;
};
