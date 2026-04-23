import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

/**
 * A `?` icon that shows a floating tooltip with metric explanation on click.
 */
export default function InfoTooltip({ title, children, className = '' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <span className={`relative inline-flex ${className}`} ref={ref}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="p-0.5 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all"
                title="Nasıl hesaplanır?"
            >
                <HelpCircle size={12} />
            </button>
            {open && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-4 text-[11px] leading-relaxed relative">
                        {/* Arrow */}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45" />

                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-300">{title || 'Hesaplama'}</h4>
                            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                                <X size={12} />
                            </button>
                        </div>
                        <div className="space-y-1.5 text-slate-300">{children}</div>
                    </div>
                </div>
            )}
        </span>
    );
}

/**
 * Pre-defined metric explanations as a lookup.
 */
export const METRIC_EXPLANATIONS = {
    efficiency: {
        title: 'Verimlilik',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> (Toplam Çalışma Saati ÷ Hedef Saat) × 100</p>
                <p className="text-slate-400">Hedef saat = Aylık çalışma takvimindeki planlanan toplam çalışma saati.</p>
                <p className="text-slate-400">Ek mesai dahil edilir. %100 üstü = hedefin üzerinde çalışma.</p>
            </>
        ),
    },
    worked_hours: {
        title: 'Toplam Çalışma',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> Σ (Normal Saat + Onaylı Ek Mesai Saati)</p>
                <p className="text-slate-400">Her günkü ilk giriş — son çıkış arasındaki net çalışma süresi.</p>
                <p className="text-slate-400">Mola süreleri düşülür, ek mesai ayrıca eklenir.</p>
            </>
        ),
    },
    overtime: {
        title: 'Ek Mesai',
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
                    <li>Verimlilik: %30</li>
                    <li>Devam oranı: %30</li>
                    <li>Dakiklik: %20</li>
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
                <p><strong className="text-white">Formül:</strong> (Gelinen Gün ÷ Toplam İş Günü) × 100</p>
                <p className="text-slate-400">İzin, rapor ve devamsız günler "gelinen gün" sayılmaz.</p>
            </>
        ),
    },
    punctuality: {
        title: 'Dakiklik',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> (Zamanında Giriş Sayısı ÷ Toplam İş Günü) × 100</p>
                <p className="text-slate-400">"Zamanında" = Vardiya başlangıcı ± tolerans süresi (genellikle 15 dk).</p>
                <p className="text-slate-400">Her çalışanın kendi vardiya saatine göre hesaplanır.</p>
            </>
        ),
    },
    meal_rate: {
        title: 'Yemek Oranı',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> (Yemek Sipariş Günü ÷ İş Günü) × 100</p>
                <p className="text-slate-400">Sistemde yemek siparişi kaydı bulunan günler sayılır.</p>
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
        title: 'OT-Yemek Eşleştirmesi',
        content: (
            <>
                <p><strong className="text-white">Formül:</strong> (OT Günlerinde Yemek Alınan Gün ÷ Toplam OT Günü) × 100</p>
                <p className="text-slate-400">Ek mesai yapılan günlerde yemek siparişi verip vermediğini gösterir.</p>
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
