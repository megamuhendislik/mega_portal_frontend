// Muhasebe Paneli — paylaşılan expand-detay render'ları (Ant Descriptions tabanlı, DRY).
//
// Her tür için bir render fonksiyonu döner; <Table expandable.expandedRowRender>
// içinde veya kişi-detay bölümlerinde kullanılır. Yalnız DOLU alanlar gösterilir
// (boş/eksik alanlar otomatik atlanır) → kayıttan kayda temiz, yer kaplamayan detay.

import React from 'react';
import { Descriptions } from 'antd';
import {
    RequestStatusTag, MealStatusTag, CardlessStatusTag,
} from './accountingTags';
import {
    fmtDate, fmtDateTime, fmtTime, fmtRange,
    fmtDurationFromMinutes, fmtHourMin, fmtBool,
} from './accountingFormat';

// Fazla mesai kaynak etiketleri (OvertimeTab ile aynı sözlük)
const OT_SOURCE_LABELS = {
    POTENTIAL: 'Algılanan',
    MANUAL: 'Manuel',
    INTENDED: 'Planlı',
    ASSIGNED: 'Atanan',
};

// Ulaşım türü etiketleri (dış görev)
const TRANSPORT_LABELS = {
    COMPANY: 'Şirket Aracı',
    PERSONAL: 'Özel Araç',
    PUBLIC: 'Toplu Taşıma',
    FLIGHT: 'Uçak',
    RENTAL: 'Kiralık',
    OTHER: 'Diğer',
};

/**
 * Boş alanları otomatik atlayan Descriptions render yardımcısı (component DEĞİL).
 * Bir alan; children null/undefined/''/'—' ise GÖSTERİLMEZ.
 * React düğümleri (Tag/link) her zaman gösterilir.
 */
function renderDesc(items) {
    const visible = (items || []).filter((i) => {
        if (!i) return false;
        const c = i.children;
        if (c == null) return false;
        if (typeof c === 'string') return c !== '' && c !== '—';
        if (typeof c === 'number') return true;
        return true; // React düğümü (Tag/link) → her zaman göster
    });
    if (!visible.length) {
        return <span className="text-xs text-slate-400">Ek detay yok</span>;
    }
    return (
        <Descriptions
            size="small"
            bordered
            column={{ xs: 1, sm: 2, lg: 3 }}
            items={visible}
            className="acc-detail-desc"
        />
    );
}

// JSON segment listesini okunur metne çevirir ("09:00–18:00, 09:00–13:00")
const fmtSegments = (segments) => {
    if (!Array.isArray(segments) || !segments.length) return null;
    const parts = segments
        .map((s) => {
            if (!s) return null;
            const start = s.start || s.start_time;
            const end = s.end || s.end_time;
            const d = s.date ? `${fmtDate(s.date)} ` : '';
            if (!start && !end) return null;
            return `${d}${fmtTime(start)}–${fmtTime(end)}`;
        })
        .filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
};

// ============================ İZİN / DIŞ GÖREV ============================

export function renderLeaveDetail(r) {
    if (!r) return null;
    const isDuty = r.request_type_category === 'EXTERNAL_DUTY';
    const saat = (r.start_time || r.end_time)
        ? `${fmtTime(r.start_time)}–${fmtTime(r.end_time)}`
        : null;
    const konaklama = r.needs_accommodation
        ? `${r.accommodation_name || ''} (${r.accommodation_nights || 0} gece)`.trim()
        : null;
    const ulasim = r.transport_type
        ? (TRANSPORT_LABELS[r.transport_type] || r.transport_type)
        : null;

    const items = [
        { key: 'tip', label: 'Tür', children: r.request_type_name },
        { key: 'durum', label: 'Durum', children: <RequestStatusTag status={r.status} statusDisplay={r.status_display} /> },
        { key: 'aralik', label: 'Tarih', children: fmtRange(r.start_date, r.end_date) },
        { key: 'saat', label: 'Saat', children: saat },
        { key: 'gun', label: 'Gün', children: r.total_days != null ? String(r.total_days) : null },
        { key: 'sebep', label: 'Sebep', children: r.reason },
        { key: 'onay', label: 'Onaylayan', children: r.approved_by_name },
        { key: 'onayzaman', label: 'Onay Zamanı', children: r.approved_at ? fmtDateTime(r.approved_at) : null },
        { key: 'red', label: 'Red Sebebi', children: r.rejection_reason },
        ...(isDuty ? [
            { key: 'sehir', label: 'Görev İli', children: r.duty_city },
            { key: 'ilce', label: 'İlçe', children: r.duty_district },
            { key: 'adres', label: 'Adres', children: r.duty_address },
            { key: 'firma', label: 'Firma', children: r.duty_company },
            { key: 'hedef', label: 'Hedef', children: r.destination },
            { key: 'gorevtip', label: 'Görev Tipi', children: r.task_type },
            { key: 'geztip', label: 'Seyahat Tipi', children: r.trip_type },
            { key: 'telefon', label: 'İletişim', children: r.contact_phone },
            { key: 'ulasim', label: 'Ulaşım', children: ulasim },
            { key: 'plaka', label: 'Plaka', children: r.transport_plate },
            { key: 'surucu', label: 'Sürücü', children: r.transport_driver },
            { key: 'ulasimacik', label: 'Ulaşım Açıklaması', children: r.transport_description },
            { key: 'konaklama', label: 'Konaklama', children: konaklama },
            { key: 'konaklamanot', label: 'Konaklama Notu', children: r.accommodation_notes },
            { key: 'gorevacik', label: 'Görev Açıklaması', children: r.duty_description },
        ] : []),
        { key: 'segment', label: 'Segmentler', children: fmtSegments(r.date_segments) },
        {
            key: 'belge',
            label: 'Belge',
            children: r.document_url
                ? <a href={r.document_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">İndir</a>
                : null,
        },
        { key: 'not', label: 'Not', children: r.notes },
    ];
    return renderDesc(items);
}

// ============================ FAZLA MESAİ ============================

export function renderOvertimeDetail(r) {
    if (!r) return null;
    const saat = (r.start_time || r.end_time)
        ? `${fmtTime(r.start_time)}–${fmtTime(r.end_time)}`
        : null;
    const sure = fmtDurationFromMinutes(
        r.duration_minutes != null
            ? r.duration_minutes
            : (r.duration_seconds != null ? r.duration_seconds / 60 : null)
    );
    let kaynak = null;
    if (r.is_manual && (!r.source_type || r.source_type === 'MANUAL')) {
        kaynak = 'Manuel';
    } else if (r.source_type) {
        kaynak = OT_SOURCE_LABELS[r.source_type] || r.source_type;
    }
    const kilitler = [
        r.is_immutable ? 'Kilitli (dönem kapalı)' : null,
        r.is_admin_override ? 'Yönetici Düzeltmesi' : null,
    ].filter(Boolean).join(' · ') || null;

    const items = [
        { key: 'tarih', label: 'Tarih', children: fmtDate(r.date) },
        { key: 'durum', label: 'Durum', children: <RequestStatusTag status={r.status} statusDisplay={r.status_display} /> },
        { key: 'saat', label: 'Saat', children: saat },
        { key: 'sure', label: 'Süre', children: sure },
        { key: 'kaynak', label: 'Kaynak', children: kaynak },
        { key: 'atama', label: 'Atama No', children: r.assignment_id != null ? String(r.assignment_id) : null },
        { key: 'sebep', label: 'Sebep', children: r.reason },
        { key: 'onay', label: 'Onaylayan', children: r.approval_manager_name },
        { key: 'onayzaman', label: 'Onay Zamanı', children: r.approval_date ? fmtDateTime(r.approval_date) : null },
        { key: 'red', label: 'Red Sebebi', children: r.rejection_reason },
        { key: 'segment', label: 'Segmentler', children: fmtSegments(r.segments) },
        { key: 'kilit', label: 'Durum Bilgisi', children: kilitler },
    ];
    return renderDesc(items);
}

// ============================ YEMEK ============================

export function renderMealDetail(r) {
    if (!r) return null;
    const items = [
        { key: 'tarih', label: 'Tarih', children: fmtDate(r.date) },
        { key: 'durum', label: 'Durum', children: <MealStatusTag status={r.status} statusDisplay={r.status_display} /> },
        { key: 'siparis', label: 'Sipariş Verildi', children: fmtBool(r.is_ordered) },
        { key: 'aciklama', label: 'Açıklama', children: r.description },
        { key: 'siparisnot', label: 'Sipariş Notu', children: r.order_note },
        { key: 'isleyen', label: 'Sipariş Eden', children: r.ordered_by_name },
        { key: 'islzaman', label: 'Sipariş Zamanı', children: r.ordered_at ? fmtDateTime(r.ordered_at) : null },
        { key: 'bagliot', label: 'Bağlı Mesai No', children: r.linked_overtime_id != null ? String(r.linked_overtime_id) : null },
    ];
    return renderDesc(items);
}

// ============================ KARTSIZ GİRİŞ ============================

export function renderCardlessDetail(r) {
    if (!r) return null;
    const saat = (r.check_in_time || r.check_out_time)
        ? `${fmtTime(r.check_in_time)}–${fmtTime(r.check_out_time)}`
        : null;
    const items = [
        { key: 'tarih', label: 'Tarih', children: fmtDate(r.date) },
        { key: 'durum', label: 'Durum', children: <CardlessStatusTag status={r.status} statusDisplay={r.status_display} /> },
        { key: 'saat', label: 'Giriş/Çıkış', children: saat },
        { key: 'sebep', label: 'Sebep', children: r.reason },
        { key: 'onay', label: 'Onaylayan', children: r.approval_manager_name },
        { key: 'onayzaman', label: 'Onay Zamanı', children: r.approval_date ? fmtDateTime(r.approval_date) : null },
        { key: 'red', label: 'Red Sebebi', children: r.rejection_reason },
        { key: 'kilit', label: 'Durum Bilgisi', children: r.is_immutable ? 'Kilitli (dönem kapalı)' : null },
    ];
    return renderDesc(items);
}

// ============================ GÜNLÜK PUANTAJ ============================

export function renderAttendanceDetail(r) {
    if (!r) return null;
    const items = [
        { key: 'tarih', label: 'Tarih', children: fmtDate(r.work_date) },
        { key: 'durum', label: 'Durum', children: r.status_display || r.status },
        { key: 'giris', label: 'Giriş', children: fmtTime(r.check_in) },
        { key: 'cikis', label: 'Çıkış', children: fmtTime(r.check_out) },
        { key: 'normal', label: 'Normal', children: r.normal_seconds != null ? fmtHourMin(r.normal_seconds) : null },
        { key: 'fazla', label: 'Fazla Mesai', children: r.overtime_seconds != null ? fmtHourMin(r.overtime_seconds) : null },
        { key: 'eksik', label: 'Eksik', children: r.missing_seconds != null ? fmtHourMin(r.missing_seconds) : null },
        { key: 'kaynak', label: 'Kaynak', children: r.source_display || r.source },
        { key: 'not', label: 'Not', children: r.note },
    ];
    return renderDesc(items);
}
