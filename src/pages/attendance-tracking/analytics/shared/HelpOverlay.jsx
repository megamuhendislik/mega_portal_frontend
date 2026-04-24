import React from 'react';
import { Modal } from 'antd';
import { Keyboard, Info } from 'lucide-react';

/**
 * HelpOverlay — klavye kısayolları + metrik glossary'sini gösteren yardım modalı.
 * `?` tuşu ile açılır, `Escape` ile kapanır.
 */

const SHORTCUTS = [
    { key: '?', label: 'Bu yardımı aç/kapat' },
    { key: 'r', label: 'Sayfayı yenile' },
    { key: 'Escape', label: 'Modal veya menüyü kapat' },
    { key: '/', label: 'Aramaya odaklan' },
    { key: '←', label: 'Önceki aya git' },
    { key: '→', label: 'Sonraki aya git' },
    { key: 't', label: 'Bugüne (bu ay) dön' },
];

const METRICS_GLOSSARY = [
    { name: 'Verimlilik', formula: '(Toplam Çalışma / Hedef) × 100', desc: 'Hedef saate göre gerçekleşen çalışma yüzdesi.' },
    { name: 'Devam Oranı', formula: '(Gelinen Gün / İş Günü) × 100', desc: 'İzinli/devamsız günler hariç gelme yüzdesi.' },
    { name: 'Dakiklik', formula: '(Zamanında Giriş / İş Günü) × 100', desc: 'Tolerans penceresi içinde giren gün yüzdesi.' },
    { name: 'Sağlık Skoru', formula: '%30 verimlilik + %30 devam + %20 dakiklik + %20 kayıp', desc: 'Ekip performansı için birleşik skor (0–100).' },
    { name: 'Ek Mesai', formula: 'calculated_overtime_seconds / 3600', desc: 'Onaylanmış ek mesai saatleri toplamı.' },
    { name: 'Kayıp Saat', formula: 'Σ (Hedef − Çalışılan)', desc: 'Hedefe ulaşamayan günlerin eksik saatleri.' },
    { name: 'Mazeret İzni', formula: 'Yıllık 18 saat (max 4.5 sa/gün)', desc: 'Saatlik izin kontingenti (yıllık 1 Ocak sıfırlama).' },
];

export default function HelpOverlay({ open, onClose }) {
    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={720}
            title={
                <div className="flex items-center gap-2">
                    <Info size={18} className="text-indigo-500" />
                    <span>Analiz Yardım — Kısayollar & Metrikler</span>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Keyboard shortcuts */}
                <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Keyboard size={16} className="text-slate-500" />
                        Klavye Kısayolları
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {SHORTCUTS.map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <span className="text-xs text-slate-600">{label}</span>
                                <kbd className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-700 shadow-sm">
                                    {key}
                                </kbd>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Metrics glossary */}
                <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Info size={16} className="text-slate-500" />
                        Metrik Açıklamaları
                    </div>
                    <div className="space-y-2">
                        {METRICS_GLOSSARY.map(({ name, formula, desc }) => (
                            <div key={name} className="rounded-lg border border-slate-200 p-3">
                                <div className="mb-1 flex items-baseline gap-2">
                                    <span className="text-sm font-semibold text-slate-800">{name}</span>
                                    <code className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700">{formula}</code>
                                </div>
                                <div className="text-xs text-slate-500">{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                    💡 İpucu: Filtreler URL'e yansıdığı için analitik görünümleri doğrudan paylaşılabilir —
                    adres çubuğundan linki kopyalayıp başka birine gönderin.
                </div>
            </div>
        </Modal>
    );
}
