import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';

/**
 * A `?` icon that shows a floating tooltip with metric explanation on click.
 * Tooltip is rendered via portal to document.body so it escapes parent
 * overflow/transform/stacking contexts and appears above everything.
 */
export default function InfoTooltip({ title, children, className = '' }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, placement: 'top' });
    const btnRef = useRef(null);
    const popRef = useRef(null);

    const updatePosition = () => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const TOOLTIP_W = 288; // w-72
        const TOOLTIP_H = 160; // approx; we measure if popRef exists
        const popH = popRef.current?.offsetHeight || TOOLTIP_H;
        const popW = popRef.current?.offsetWidth || TOOLTIP_W;
        const margin = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Prefer top placement; fall back to bottom if not enough room above
        let placement = 'top';
        let top = rect.top - popH - margin;
        if (top < margin) {
            placement = 'bottom';
            top = rect.bottom + margin;
        }
        // Center horizontally on the icon, clamp to viewport
        let left = rect.left + rect.width / 2 - popW / 2;
        left = Math.max(margin, Math.min(vw - popW - margin, left));

        // Final clamp vertical
        top = Math.max(margin, Math.min(vh - popH - margin, top));

        setPos({ top, left, placement, anchorX: rect.left + rect.width / 2 });
    };

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
        // Re-measure after popup rendered (height becomes accurate)
        const id = requestAnimationFrame(updatePosition);
        return () => cancelAnimationFrame(id);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onClick = (e) => {
            if (btnRef.current?.contains(e.target)) return;
            if (popRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        const onScroll = () => setOpen(false);
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open]);

    return (
        <span className={`inline-flex ${className}`}>
            <button
                ref={btnRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="p-0.5 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all"
                title="Nasıl hesaplanır?"
            >
                <HelpCircle size={12} />
            </button>
            {open && createPortal(
                <div
                    ref={popRef}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999, width: 288 }}
                    className="animate-in fade-in zoom-in-95 duration-150"
                >
                    <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-4 text-[11px] leading-relaxed relative">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-300">{title || 'Hesaplama'}</h4>
                            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                                <X size={12} />
                            </button>
                        </div>
                        <div className="space-y-1.5 text-slate-300">{children}</div>
                    </div>
                </div>,
                document.body,
            )}
        </span>
    );
}

/**
 * Pre-defined metric explanations as a lookup.
 */
export const METRIC_EXPLANATIONS = {
    efficiency: {
        title: 'Mesai Doluluğu (Normal)',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> Normal Mesai Saati ÷ Pro-rata Yükümlülük × 100, capped 100</p>
                <p className="text-slate-400">Fazla Mesai HARİÇ. Yükümlülük = devam eden dönemde geçen iş günlerinin toplam saat hedefi.</p>
                <p className="text-slate-400">"Toplam Yapılan Mesai" (N+Fazla Mesai) ve "Fazla Mesai/Yükümlülük", "Eksik/Yükümlülük" ayrı metrikler — Mesai Analizi tabında detay.</p>
            </>
        ),
    },
    worked_hours: {
        title: 'Toplam Çalışma',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> Σ (Normal Saat + Onaylı Fazla Mesai Saati)</p>
                <p className="text-slate-400">Her günkü ilk giriş — son çıkış arasındaki net çalışma süresi.</p>
                <p className="text-slate-400">Mola süreleri düşülür, fazla mesai ayrıca eklenir.</p>
            </>
        ),
    },
    overtime: {
        title: 'Fazla Mesai',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> Σ (calculated_overtime_seconds ÷ 3600)</p>
                <p className="text-slate-400">Planlanan mesai saati üstünde geçirilen süre.</p>
                <p className="text-slate-400">Potansiyel, planlı ve manuel kaynaklar ayrı ayrı hesaplanır.</p>
            </>
        ),
    },
    missing_hours: {
        title: 'Kayıp Saat',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> Σ (Hedef Saat − Çalışılan Saat) [negatif ise 0]</p>
                <p className="text-slate-400">Günlük hedef saatin altında çalışılan sürelerin toplamı.</p>
                <p className="text-slate-400">Geç gelme, erken çıkış ve devamsızlık buna dahildir.</p>
            </>
        ),
    },
    health_score: {
        title: 'Ekip Sağlık Skoru',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> Ağırlıklı ortalama (0-100)</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                    <li>Mesai Doluluğu: %40</li>
                    <li>Devam oranı: %40</li>
                    <li>Kayıp oranı: %20</li>
                </ul>
                <p className="text-slate-400">≥80 Mükemmel, ≥60 İyi, &lt;60 Geliştirilmeli</p>
            </>
        ),
    },
    attendance_rate: {
        title: 'Devam Oranı',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> (Devamsız Olmayan Kayıt ÷ Toplam Attendance Kayıt) × 100</p>
                <p className="text-slate-400"><strong className="text-slate-200">Düşürür:</strong> Sadece sistemin "ABSENT" işaretlediği günler (no-show / kart çekilmemiş iş günü).</p>
                <p className="text-slate-400"><strong className="text-slate-200">Düşürmez:</strong> Onaylı yıllık izin, mazeret, sağlık raporu, dış görev — bu günler için sistem otomatik "APPROVED" attendance kaydı oluşturduğundan "gelmiş" sayılır.</p>
                <p className="text-slate-400"><strong className="text-slate-200">Hariç:</strong> Hafta sonu ve tatil günleri (kayıt oluşmaz).</p>
                <p className="text-slate-400 italic">Yani metrik aslında "ABSENT olmama oranı"dır.</p>
            </>
        ),
    },
    meal_rate: {
        title: 'FM Yemek Oranı',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> (Yemek Alınan Onaylı FM Günü ÷ Toplam Onaylı FM Günü) × 100</p>
                <p className="text-slate-400">Sadece <strong className="text-slate-200">onaylı fazla mesai</strong> günleri payda. FM yapılmayan günler hesaba dahil değil.</p>
                <p className="text-slate-400"><strong className="text-slate-200">Yoğunluk:</strong> Toplam onaylı FM saati ÷ toplam yemek = "her yemek başına X saat OT" (modal'da görünür).</p>
                <p className="text-slate-400 italic">Eski "Yemek/İş Günü" hesabı 2026-05-04'te kaldırıldı (anlamsızdı, çoğu çalışanda %0 görünüyordu).</p>
            </>
        ),
    },
    break_minutes: {
        title: 'Ortalama Mola',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> Σ (Mola Süresi) ÷ Çalışılan Gün Sayısı</p>
                <p className="text-slate-400">potential_break_seconds üzerinden hesaplanır.</p>
                <p className="text-slate-400">60 dk altı = iyi, 60-75 dk = normal, 75+ dk = uzun.</p>
            </>
        ),
    },
    ot_meal_correlation: {
        title: 'Fazla Mesai-Yemek Eşleştirmesi',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> (Fazla Mesai Günlerinde Yemek Alınan Gün ÷ Toplam Fazla Mesai Günü) × 100</p>
                <p className="text-slate-400">Fazla mesai yapılan günlerde yemek siparişi verip vermediğini gösterir.</p>
                <p className="text-slate-400">≥80% İyi, ≥50% Orta, &lt;50% Düşük.</p>
            </>
        ),
    },
    approval_rate: {
        title: 'Onay Oranı',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> (Onaylanan Talep ÷ Toplam Talep) × 100</p>
                <p className="text-slate-400">Bekleyen talepler hesaplamaya dahil değildir.</p>
            </>
        ),
    },
    decision_time: {
        title: 'Ort. Karar Süresi',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> Σ (Karar Tarihi − Oluşturma Tarihi) ÷ Karar Verilen Talep Sayısı</p>
                <p className="text-slate-400">Sadece karara bağlanmış talepler üzerinden hesaplanır.</p>
            </>
        ),
    },
};
