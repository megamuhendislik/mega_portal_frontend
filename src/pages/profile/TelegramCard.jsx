import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Select, message } from 'antd';
import { Send, Save } from 'lucide-react';
import api from '../../services/api';
import { TELEGRAM_CATEGORIES, mergeTelegramPrefs, setAllCategories } from '../../utils/telegramPrefs';

const POLL_MS = 3000;
const POLL_LIMIT_MS = 2 * 60 * 1000;
// Yemek koordinatörü, muhasebe, satın alma yöneticisi gibi ekibi olmayanlara da
// talep düşer; bu yüzden iki sütun her zaman gösterilir.
const DIRECTIONS = [['INCOMING', 'Bana gelen'], ['OWN', 'Kendi taleplerim']];
const COLUMN = 'w-16 sm:w-28 shrink-0';

const Toggle = ({ checked, onChange, label }) => (
    <label className="relative inline-flex shrink-0 cursor-pointer" aria-label={label}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-12 h-[26px] bg-slate-200 rounded-full peer peer-checked:bg-teal-500 transition-colors duration-300 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all after:duration-300 peer-checked:after:translate-x-[22px] peer-focus:ring-4 peer-focus:ring-teal-500/15" />
    </label>
);

const SecondaryButton = ({ onClick, disabled, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
    >
        {children}
    </button>
);

const TelegramCard = () => {
    const [state, setState] = useState(null);
    const [prefs, setPrefs] = useState(null);
    const [busy, setBusy] = useState(false);
    const [waitingSince, setWaitingSince] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/telegram/me/');
            setState(res.data);
            setPrefs(mergeTelegramPrefs(res.data.preferences));
            return res.data;
        } catch {
            setState(prev => prev ?? { enabled: false });
            return null;
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Telegram'da "Başlat"a basıldıktan sonra bağlantıyı yakala: 3 sn aralıkla ve sekmeye dönünce, en çok 2 dk.
    useEffect(() => {
        if (!waitingSince) return undefined;
        const tick = async () => {
            const data = await load();
            if (data?.connected || Date.now() - waitingSince > POLL_LIMIT_MS) setWaitingSince(null);
        };
        const timer = setInterval(tick, POLL_MS);
        window.addEventListener('focus', tick);
        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', tick);
        };
    }, [waitingSince, load]);

    if (!state?.enabled || !prefs) return null;

    const connect = async () => {
        // Açılır pencere engellenmesin diye sekme tıklama anında açılır, link gelince yönlendirilir
        const win = window.open('about:blank', '_blank');
        setBusy(true);
        try {
            const res = await api.post('/telegram/me/connect/');
            if (win) {
                win.opener = null;
                win.location.href = res.data.url;
            } else {
                window.location.href = res.data.url;
            }
            setWaitingSince(Date.now());
        } catch {
            if (win) win.close();
            message.error('Bağlantı linki oluşturulamadı.');
        } finally {
            setBusy(false);
        }
    };

    const disconnect = () => {
        Modal.confirm({
            title: 'Telegram bağlantısı kesilsin mi?',
            content: 'Bildirimler artık Telegram\'a gelmez. İstediğiniz zaman yeniden bağlanabilirsiniz.',
            okText: 'Bağlantıyı kes',
            cancelText: 'Vazgeç',
            onOk: async () => {
                try {
                    await api.post('/telegram/me/disconnect/');
                } catch {
                    message.error('Telegram bağlantısı kesilemedi.');
                    return;
                }
                await load();
                message.success('Telegram bağlantısı kesildi.');
            },
        });
    };

    const sendTest = async () => {
        setBusy(true);
        try {
            const res = await api.post('/telegram/me/test/');
            if (res.data.ok) message.success('Test mesajı gönderildi.');
            else message.warning('Test mesajı gönderilemedi.');
        } catch {
            message.error('Test mesajı gönderilemedi.');
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        setBusy(true);
        try {
            const res = await api.patch('/telegram/me/preferences/', prefs);
            setPrefs(mergeTelegramPrefs(res.data.preferences));
            message.success('Telegram ayarları kaydedildi.');
        } catch (e) {
            message.error(e.response?.data?.detail || 'Telegram ayarları kaydedilemedi.');
        } finally {
            setBusy(false);
        }
    };

    const setCell = (cat, dir, value) => setPrefs(p => ({
        ...p, categories: { ...p.categories, [cat]: { ...p.categories[cat], [dir]: value } },
    }));

    return (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 md:px-8 pt-6 pb-4 flex items-center gap-3">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)', boxShadow: '0 4px 12px -2px rgba(2,132,199,0.3)' }}
                >
                    <Send size={14} className="text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Telegram Bildirimleri</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Portal bildirimleriniz Telegram'dan da gelsin</p>
                </div>
            </div>

            {!state.connected ? (
                <div className="px-6 md:px-8 pb-6 space-y-3">
                    <p className="text-[12px] text-slate-500 leading-relaxed">
                        Telegram hesabınızı bağladığınızda seçtiğiniz bildirimler Telegram'a da gönderilir.
                        Bildirim metinleri Telegram üzerinden iletilir.
                    </p>
                    {waitingSince && (
                        <p className="text-[12px] text-sky-700">
                            Telegram'da Başlat'a basın. Bağlantı kurulunca bu ekran kendiliğinden güncellenir.
                        </p>
                    )}
                    <SecondaryButton onClick={connect} disabled={busy}>Telegram'a bağlan</SecondaryButton>
                </div>
            ) : (
                <div className="pb-6">
                    <div className="px-6 md:px-8 pb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-700">
                            <span className="font-semibold">{state.username ? `@${state.username}` : 'Telegram hesabı'}</span> bağlı
                        </p>
                        <div className="flex gap-2">
                            <SecondaryButton onClick={sendTest} disabled={busy}>Test mesajı gönder</SecondaryButton>
                            <SecondaryButton onClick={disconnect} disabled={busy}>Bağlantıyı kes</SecondaryButton>
                        </div>
                    </div>

                    <div className="px-6 md:px-8 py-2 flex items-center justify-end gap-4 sm:gap-6 text-[11px] font-semibold text-slate-400 border-t border-slate-100/80">
                        {DIRECTIONS.map(([dir, text]) => (
                            <span key={dir} className={`${COLUMN} text-center leading-tight`}>{text}</span>
                        ))}
                    </div>
                    <div className="divide-y divide-slate-100/80">
                        {TELEGRAM_CATEGORIES.map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between gap-3 px-6 md:px-8 py-3">
                                <p className="min-w-0 text-sm font-semibold text-slate-800">{label}</p>
                                <div className="flex items-center gap-4 sm:gap-6">
                                    {DIRECTIONS.map(([dir, text]) => (
                                        <div key={dir} className={`${COLUMN} flex justify-center`}>
                                            <Toggle
                                                label={`${label} ${text.toLocaleLowerCase('tr-TR')}`}
                                                checked={prefs.categories[key][dir]}
                                                onChange={v => setCell(key, dir, v)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center justify-between gap-3 px-6 md:px-8 py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">Diğer bildirimler</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Duyuru, hatırlatma ve sistem bildirimleri</p>
                            </div>
                            <div className={`${COLUMN} flex justify-center`}>
                                <Toggle label="Diğer bildirimler" checked={prefs.other} onChange={v => setPrefs(p => ({ ...p, other: v }))} />
                            </div>
                        </div>
                    </div>

                    <div className="px-6 md:px-8 pt-3 flex gap-2">
                        <SecondaryButton onClick={() => setPrefs(p => setAllCategories(p, true))}>Tümünü aç</SecondaryButton>
                        <SecondaryButton onClick={() => setPrefs(p => setAllCategories(p, false))}>Tümünü kapat</SecondaryButton>
                    </div>

                    {state.has_team && (
                        <div className="px-6 md:px-8 pt-5 space-y-3">
                            <p className="text-sm font-semibold text-slate-800">Ekibimden gelen talepler</p>
                            <div className="flex gap-5 text-sm text-slate-700">
                                {[['ALL', 'Herkesinki'], ['SELECTED', 'Yalnız seçtiklerim']].map(([value, text]) => (
                                    <label key={value} className="inline-flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="telegram-team-filter"
                                            checked={prefs.team_filter === value}
                                            onChange={() => setPrefs(p => ({ ...p, team_filter: value }))}
                                        />
                                        {text}
                                    </label>
                                ))}
                            </div>
                            {prefs.team_filter === 'SELECTED' && (
                                <>
                                    <Select
                                        mode="multiple"
                                        className="w-full"
                                        placeholder="Kişi seçin"
                                        optionFilterProp="label"
                                        value={prefs.team_employee_ids}
                                        onChange={ids => setPrefs(p => ({ ...p, team_employee_ids: ids }))}
                                        options={(state.team_options || []).map(o => ({ value: o.id, label: o.name }))}
                                    />
                                    {prefs.team_employee_ids.length === 0 && (
                                        <p className="text-[12px] text-amber-700">
                                            Kimse seçilmedi; ekibinizden gelen talepler Telegram'a gelmez.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div className="px-6 md:px-8 pt-5 flex justify-end">
                        <button
                            type="button"
                            onClick={save}
                            disabled={busy}
                            className="inline-flex items-center gap-2.5 px-7 py-3 text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0d9488 100%)', boxShadow: '0 8px 24px -6px rgba(13,148,136,0.35)' }}
                        >
                            <Save size={15} />
                            Telegram Ayarlarını Kaydet
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TelegramCard;
