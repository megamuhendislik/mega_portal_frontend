import React, { useState, useEffect } from 'react';
import { getIstanbulToday, getIstanbulDateOffset } from '../../../utils/dateUtils';
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    DocumentArrowDownIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    XCircleIcon,
    WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Phase2IssuePanel from './Phase2IssuePanel';
import IntegrityFindingsPanel from './IntegrityFindingsPanel';
import SanityCheckPanel from './SanityCheckPanel';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtSeconds(s) {
    if (s === null || s === undefined || Number.isNaN(Number(s))) return '0 sn';
    const totalRaw = Math.trunc(Number(s));
    const sign = totalRaw < 0 ? '-' : '';
    const total = Math.abs(totalRaw);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    const parts = [];
    if (h) parts.push(`${h} sa`);
    if (m) parts.push(`${m} dk`);
    if (sec) parts.push(`${sec} sn`);
    return `${sign}${parts.length ? parts.join(' ') : '0 sn'}`;
}


const ROOT_CAUSE_COLORS = {
    STALE_CALC: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Eski Hesaplama' },
    TOLERANCE_DIFF: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Tolerans Farki' },
    BREAK_DIFF: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Mola Farki' },
    SPLIT_CHANGE: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Kayit Bolme' },
    OT_THRESHOLD: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Fazla Mesai Esik' },
    DEFICIT_FILL: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Eksik Tamamlama' },
    STATUS_DRIFT: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Durum Farki' },
    RECORD_COUNT: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Kayit Sayisi' },
    HOSPITAL_VISIT: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Hastane Ziyareti' },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function RecalculationAuditTab() {
    const [startDate, setStartDate] = useState(getIstanbulDateOffset(-30));
    const [endDate, setEndDate] = useState(getIstanbulToday());
    const [employeeId, setEmployeeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [showLog, setShowLog] = useState(false);
    const [expandedMismatches, setExpandedMismatches] = useState(new Set());

    // Unified audit state
    const [uniLoading, setUniLoading] = useState(false);
    const [uniFixing, setUniFixing] = useState(false);
    const [uniResult, setUniResult] = useState(null);
    const [uniError, setUniError] = useState(null);
    const [uniLogText, setUniLogText] = useState(null);
    const [uniLogLoading, setUniLogLoading] = useState(false);
    const [showUniLog, setShowUniLog] = useState(false);

    // Full recalculation state
    const [frcLoading, setFrcLoading] = useState(false);
    const [frcResult, setFrcResult] = useState(null);
    const [frcError, setFrcError] = useState(null);
    const [frcExpandedEmps, setFrcExpandedEmps] = useState(new Set());
    const [frcExpandedDays, setFrcExpandedDays] = useState(new Set());
    const [showAllDays, setShowAllDays] = useState(false);

    // OT Request Audit state
    const [otAuditLoading, setOtAuditLoading] = useState(false);
    const [otAuditResult, setOtAuditResult] = useState(null);
    const [otAuditFixing, setOtAuditFixing] = useState(false);

    // Bağımsız Hesap Doğrulama (recalc'tan bağımsız koruma katmanı) state
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);
    const [verifyError, setVerifyError] = useState(null);

    // Bağımsız doğrulama büyük tarih aralığında uzun sürebilir (65 emp × 90 gün)
    // — 30 dk timeout (axios default 30sn yetmez).
    const VERIFY_TIMEOUT_MS = 30 * 60 * 1000;

    const runVerifyCalculations = async () => {
        setVerifyLoading(true);
        setVerifyError(null);
        setVerifyResult(null);
        try {
            const body = { date_from: startDate, date_to: endDate, only_mismatch: false };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/verify-calculations/', body,
                { timeout: VERIFY_TIMEOUT_MS });
            setVerifyResult(res.data);
        } catch (e) {
            const isTimeout = (e.code === 'ECONNABORTED') || /timeout/i.test(e.message || '');
            setVerifyError(
                isTimeout
                    ? 'Timeout — tarih aralığı çok büyük olabilir. Daha kısa aralık veya tek çalışan deneyin.'
                    : (e?.response?.data?.error || e.message || 'Doğrulama başarısız')
            );
        } finally {
            setVerifyLoading(false);
        }
    };

    const downloadVerifyTxt = () => {
        // Backend zaten text_log'u response'da gönderiyor — tekrar HTTP yok,
        // mevcut state'ten direkt blob oluştur.
        const text = verifyResult?.text_log;
        if (!text) {
            alert('TXT yok — önce Bağımsız Doğrulama çalıştırın.');
            return;
        }
        try {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bagimsiz_dogrulama_${startDate}_${endDate}.txt`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('TXT indirme hatası: ' + (e.message || 'Bilinmeyen'));
        }
    };

    const runOtAudit = async (mode = 'scan') => {
        if (mode === 'fix' && !window.confirm(
            'Bulunan sorunlar düzeltilecek (duplikatlar silinecek, stale potansiyeller temizlenecek). Devam?'
        )) return;
        mode === 'fix' ? setOtAuditFixing(true) : setOtAuditLoading(true);
        try {
            const res = await api.post('/system/health-check/ot-request-audit/', {
                date_from: startDate, date_to: endDate, mode,
            });
            setOtAuditResult(res.data);
        } catch (e) {
            alert('Talep denetimi hatası: ' + (e.response?.data?.error || e.message));
        } finally {
            setOtAuditLoading(false);
            setOtAuditFixing(false);
        }
    };

    // Sayfa açıldığında son task durumunu kontrol et
    useEffect(() => {
        let cancelled = false;
        const checkLatest = async () => {
            try {
                const res = await api.get('/system/health-check/full-recalculation-status/');
                if (cancelled) return;
                const st = res.data;
                if (st.status === 'COMPLETED' && st.has_result) {
                    // Son tamamlanan hesaplamanın tam JSON'unu yükle
                    try {
                        const fullRes = await api.get(`/system/health-check/full-recalculation-status/?task_id=${st.task_id}&full=true`);
                        if (!cancelled) setFrcResult(fullRes.data);
                    } catch {
                        // JSON yoksa summary'den göster
                        if (!cancelled) setFrcResult({ summary: st.summary, text_log: '', _fromCache: true });
                    }
                } else if (st.status === 'RUNNING') {
                    setFrcLoading(true);
                    const pollInterval = setInterval(async () => {
                        try {
                            const pollRes = await api.get(`/system/health-check/full-recalculation-status/?task_id=${st.task_id}`);
                            if (cancelled) { clearInterval(pollInterval); return; }
                            if (pollRes.data.status === 'COMPLETED') {
                                clearInterval(pollInterval);
                                const fullRes = await api.get(`/system/health-check/full-recalculation-status/?task_id=${st.task_id}&full=true`);
                                setFrcResult(fullRes.data);
                                setFrcLoading(false);
                            } else if (pollRes.data.status === 'FAILED') {
                                clearInterval(pollInterval);
                                setFrcError(pollRes.data.error || 'Hesaplama başarısız');
                                setFrcLoading(false);
                            }
                        } catch { /* ignore poll errors */ }
                    }, 5000);
                }
            } catch { /* no previous task */ }
        };
        checkLatest();
        return () => { cancelled = true; };
    }, []);

    const fetchUnifiedLogText = async () => {
        if (uniLogText) { setShowUniLog(!showUniLog); return; }
        setUniLogLoading(true);
        try {
            const body = { date_from: startDate, date_to: endDate, download: true };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/unified-audit/', body, {
                responseType: 'text',
                timeout: 300000,
            });
            setUniLogText(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2));
            setShowUniLog(true);
        } catch (e) {
            alert('Log yuklenemedi: ' + (e.message || 'Bilinmeyen hata'));
        } finally {
            setUniLogLoading(false);
        }
    };

    const downloadUnifiedLog = async () => {
        try {
            const body = { date_from: startDate, date_to: endDate, download: true };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/unified-audit/', body, {
                responseType: 'blob',
                timeout: 300000,
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `birlesik_denetim_${startDate}_${endDate}.txt`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('Log indirme hatasi: ' + (e.message || 'Bilinmeyen hata'));
        }
    };

    // ── Full Recalculation ──────────────────────────────────────────
    const runFullRecalculation = async (mode = 'dry_run') => {
        if (mode === 'apply') {
            // Çalışan aleyhine (Normal AZALANSA) ek koruma: prompt + tam-kelime
            // yazma şartı. Türkay 11 May benzeri 2sa 20dk haksız eksik
            // senaryoları kaza ile uygulanmasın.
            const normalDiff = frcResult?.summary?.normal_diff || 0;
            const missingDiff = frcResult?.summary?.missing_diff || 0;
            if (normalDiff < 0) {
                const lossHours = (Math.abs(normalDiff) / 3600).toFixed(2);
                const eksikGain = (Math.abs(missingDiff) / 3600).toFixed(2);
                const typed = window.prompt(
                    `⚠️ DİKKAT — KULLANICI ALEYHİNE DEĞİŞİM\n\n` +
                    `Bu işlem ${lossHours} saat NORMAL MESAİ SİLECEK.\n` +
                    `Eksik artışı: +${eksikGain} saat\n\n` +
                    `Çalışanlar haksız eksik göstermiş olabilir. Detay TXT raporunu\n` +
                    `kontrol et — her bir değişimi tek tek doğrulamadan UYGULAMA.\n\n` +
                    `Bilerek devam ediyorsan tam olarak şu kelimeyi yaz: ONAYLIYORUM`
                );
                if (typed !== 'ONAYLIYORUM') {
                    alert('İptal edildi. Bilerek devam etmek için "ONAYLIYORUM" yazılması gerekir.');
                    return;
                }
            }
            if (!window.confirm(
                'DIKKAT: Tum degisiklikler kalici olarak uygulanacak!\n\n' +
                'Dry-run raporundaki tum split duzeltmeleri, normal mesai yeniden hesaplamalari,\n' +
                'Fazla Mesai ayarlamalari ve aylik ozet guncellemeleri veritabanina yazilacak.\n\n' +
                'Bu islem geri alinamaz. Devam etmek istiyor musunuz?'
            )) return;
        }

        setFrcLoading(true);
        setFrcError(null);
        // Apply (staged run_id VEYA cache): sim sonucunu silme — staged apply
        // frcResult.run_id'ye ihtiyaç duyar; fail durumunda kullanıcı eski raporu görebilsin.
        if (!(mode === 'apply' && (frcResult?.run_id || frcResult?.cache_token))) {
            setFrcResult(null);
        }
        setFrcExpandedEmps(new Set());
        setFrcExpandedDays(new Set());
        try {
            const body = { date_from: startDate, date_to: endDate, mode, show_all_days: showAllDays };
            if (employeeId) body.employee_id = parseInt(employeeId);
            // STAGE-THEN-APPLY: dry-run (SIMULASYON) sonucu FrcStagedRun'a stage'lensin
            // → backend ORTAK run_id üretir, "Uygula" bu run'ı YENİDEN HESAPLAMADAN
            // canlıya yazar (apply-staged). apply modunda stage YOK (zaten canlıya yazar).
            if (mode === 'dry_run') body.stage = true;

            // FAST-PATH (STAGED): Apply edilmiş sim → apply-staged ile YENİDEN
            // HESAPLAMADAN canlıya yaz (Task 13). frcResult.run_id varsa bu yolu kullan.
            if (mode === 'apply' && frcResult?.run_id) {
                try {
                    const stagedRes = await api.post(
                        '/system/health-check/apply-staged/',
                        { run_id: frcResult.run_id },
                        { timeout: 60000 });
                    // apply-staged async chunk task'ları döndürür → hepsini izle.
                    const stagedTaskIds = (stagedRes.data.tasks || [])
                        .map(t => t.task_id).filter(Boolean);
                    if (stagedTaskIds.length === 0) throw new Error('Apply task başlatılamadı');

                    // Tüm chunk task'ları COMPLETED olana kadar bekle (run APPLIED
                    // tüm chunk'lar bitince işaretlenir). Birinde FAILED → hata.
                    const pending = new Set(stagedTaskIds);
                    let aAttempts = 0;
                    const A_POLL_MS = 5000;
                    const A_MAX_MIN = 67;
                    const aMaxAttempts = (A_MAX_MIN * 60 * 1000) / A_POLL_MS;
                    let aPollErrors = 0;
                    while (pending.size > 0 && aAttempts < aMaxAttempts) {
                        await new Promise(r => setTimeout(r, A_POLL_MS));
                        aAttempts++;
                        try {
                            for (const tid of Array.from(pending)) {
                                const sRes = await api.get(
                                    `/system/health-check/full-recalculation-status/?task_id=${tid}`,
                                    { timeout: 60000 });
                                const sSt = sRes.data;
                                if (sSt.status === 'COMPLETED') {
                                    pending.delete(tid);
                                } else if (sSt.status === 'FAILED') {
                                    throw new Error(sSt.error || 'Uygulama başarısız');
                                } else if (['CANCELLED', 'NOT_FOUND', 'NO_TASK'].includes(sSt.status)) {
                                    throw new Error('Uygulama iptal edildi veya bulunamadı');
                                }
                            }
                            aPollErrors = 0;
                        } catch (aPollErr) {
                            // Kendi attığımız hata (FAILED/iptal — axios DEĞİL) → hemen yükselt.
                            // Geçici axios poll hatası → birkaç kez tolere et.
                            if (!aPollErr?.isAxiosError) throw aPollErr;
                            aPollErrors++;
                            if (aPollErrors >= 12) throw aPollErr;
                        }
                    }
                    if (pending.size > 0) {
                        throw new Error(`Uygulama zaman aşımına uğradı (${A_MAX_MIN}dk).`);
                    }
                    // Başarı: sim raporunu koru, mode=apply işaretle (UI "uygulandı" gösterir).
                    setFrcResult({ ...frcResult, mode: 'apply', _appliedStaged: true });
                    setFrcLoading(false);
                    return;
                } catch (stagedErr) {
                    const sData = stagedErr?.response?.data || {};
                    const sStatus = stagedErr?.response?.status;
                    // 409 EXPIRED / already-applied / APPLYING → taze sim gerekli.
                    if (sStatus === 409 || sStatus === 404) {
                        setFrcError(
                            (sData.error ? sData.error + ' ' : '') +
                            'Sim süresi dolmuş veya zaten uygulanmış olabilir. Lütfen ' +
                            'Tam Yeniden Hesaplama (SIMULASYON) tekrar çalıştırın, sonra Uygula\'ya basın.');
                        setFrcLoading(false);
                        return;
                    }
                    // Diğer hata (network vb.) → kullanıcıya bildir.
                    setFrcError(sData.error || stagedErr.message || 'Uygulama hatası');
                    setFrcLoading(false);
                    return;
                }
            }

            // GERİ-UYUM FAST-PATH: run_id yok (eski sim) ama cache_token var →
            // tekrar hesaplamadan direkt uygula (eski yol).
            if (mode === 'apply' && frcResult?.cache_token) {
                body.from_cache = true;
                body.cache_token = frcResult.cache_token;
                try {
                    // Fast-path sync apply: targeted recalc + MWS cascade dakikalar
                    // sürebilir → 67dk timeout (default 30s yetmez).
                    const fastRes = await api.post('/system/health-check/full-recalculation/', body,
                        { timeout: 67 * 60 * 1000 });
                    setFrcResult({ ...frcResult, ...fastRes.data, mode: 'apply' });
                    setFrcLoading(false);
                    return;
                } catch (fastErr) {
                    // Cache expired → full pipeline fallback
                    const errData = fastErr?.response?.data || {};
                    if (errData.cache_expired) {
                        // Cache silinmiş, kullanıcıya bildir + sim tekrar çekmesini iste
                        setFrcError('Sim cache süresi doldu (1 saat). Lütfen Tam Yeniden Hesaplama (SIMULASYON) tekrar çalıştırın, sonra Uygula\'ya basın.');
                        setFrcLoading(false);
                        return;
                    }
                    // Diğer hata → normal apply pipeline'a düş
                    delete body.from_cache;
                    delete body.cache_token;
                }
            }

            // Async endpoint — Celery task başlat (sim veya cache-less apply)
            // NOT: api default timeout 30s. Backend yük altındaysa task dispatch
            // 30s'yi aşabiliyor → açık 60s timeout ver (yoksa 'timeout of 30000ms').
            const startRes = await api.post('/system/health-check/full-recalculation-async/', body,
                { timeout: 60000 });
            const taskId = startRes.data.task_id;
            if (!taskId) throw new Error('Task ID alınamadı');
            // STAGE-THEN-APPLY: dry-run + stage → backend ORTAK run_id döndürür.
            // "Uygula" bunu apply-staged'e verir (status JSON'da kaybolursa fallback).
            const stageRunId = startRes.data.run_id || null;

            // Poll task status
            // Tüm dönem (65 çalışan × ~90 gün) TYR'si ~18-22dk sürebiliyor.
            // Backend Celery task: soft_time_limit=3600s (60dk), time_limit=3900s (65dk).
            // Frontend tavanı 67dk: backend hard limit'in HAFİF üstünde — böylece
            // backend zaman aşımına uğrarsa onun FAILED durumunu gösterir, kendi
            // generic timeout'unu değil.
            let attempts = 0;
            const POLL_INTERVAL_MS = 5000;
            const MAX_MINUTES = 67;
            const maxAttempts = (MAX_MINUTES * 60 * 1000) / POLL_INTERVAL_MS; // 720
            let consecutivePollErrors = 0;
            while (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
                attempts++;
                try {
                    // Her poll'a açık 60s timeout (default 30s yetmeyebilir, DB yük altında)
                    const statusRes = await api.get(
                        `/system/health-check/full-recalculation-status/?task_id=${taskId}`,
                        { timeout: 60000 });
                    const st = statusRes.data;
                    consecutivePollErrors = 0;

                    if (st.status === 'COMPLETED') {
                        // Tam JSON sonucu al (summary + employees + text_log) — büyük olabilir
                        const fullRes = await api.get(
                            `/system/health-check/full-recalculation-status/?task_id=${taskId}&full=true`,
                            { timeout: 120000 }
                        );
                        // run_id status JSON'da varsa onu kullan, yoksa async start
                        // response'undakiyle tamamla (apply-staged için zorunlu).
                        setFrcResult({
                            ...fullRes.data,
                            run_id: fullRes.data.run_id || stageRunId,
                        });
                        break;
                    } else if (st.status === 'FAILED') {
                        throw new Error(st.error || 'Hesaplama başarısız');
                    } else if (st.status === 'CANCELLED' || st.status === 'NOT_FOUND' || st.status === 'NO_TASK') {
                        throw new Error('Hesaplama iptal edildi veya bulunamadı');
                    }
                    // RUNNING — devam et
                } catch (pollErr) {
                    // Geçici network/poll hatası — birkaç kez tolere et, hemen iptal etme
                    consecutivePollErrors++;
                    if (consecutivePollErrors >= 12) throw pollErr; // ~1dk üst üste hata → vazgeç
                    if (attempts >= maxAttempts) throw pollErr;
                }
            }
            if (attempts >= maxAttempts) {
                throw new Error(`Hesaplama zaman aşımına uğradı (${MAX_MINUTES}dk). Daha kısa tarih aralığı veya tek çalışan deneyin.`);
            }
        } catch (e) {
            setFrcError(e.response?.data?.error || e.message || 'Bilinmeyen hata');
        } finally {
            setFrcLoading(false);
        }
    };

    const downloadFrcLog = () => {
        // İkinci API çağrısı yerine mevcut sonuçtan indir (timeout sorunu çözümü)
        if (!frcResult?.text_log) {
            alert('Önce hesaplama çalıştırın.');
            return;
        }
        const blob = new Blob([frcResult.text_log], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tam_yeniden_hesaplama_${startDate}_${endDate}.txt`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    // ── Geniş (Comprehensive) Rapor — tüm veri dökümü ──
    const [wideLoading, setWideLoading] = useState(false);
    const downloadWideReport = async () => {
        // Kişi bazlı (Sicil No doluysa) veya toplu (boşsa). 30dk timeout.
        setWideLoading(true);
        try {
            const body = { date_from: startDate, date_to: endDate, download: true };
            if (employeeId) body.employee_id = employeeId;
            const res = await api.post('/system/health-check/comprehensive-report/', body, {
                responseType: 'blob',
                timeout: 30 * 60 * 1000,
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            const suffix = employeeId ? `_${employeeId}` : '_toplu';
            a.download = `genis_rapor${suffix}_${startDate}_${endDate}.txt`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            const isTimeout = (e.code === 'ECONNABORTED') || /timeout/i.test(e.message || '');
            alert(isTimeout
                ? 'Geniş rapor zaman aşımı — tek çalışan (Sicil No) veya daha kısa aralık deneyin.'
                : 'Geniş rapor hatası: ' + (e?.response?.data?.error || e.message || 'Bilinmeyen'));
        } finally {
            setWideLoading(false);
        }
    };

    const toggleFrcEmp = (id) => {
        setFrcExpandedEmps(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleFrcDay = (key) => {
        setFrcExpandedDays(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const runUnifiedAudit = async (fix = false) => {
        if (fix && !window.confirm(
            'Kesin Hatalari Duzelt\n\n' +
            'Sadece kesin hesaplama hatalarini duzeltir:\n' +
            '- Split yanlis noktada bolunmus -> dogru noktada yeniden bol\n' +
            '- Fragment/duplikat talepler -> birlestir\n' +
            '- Izin cift sayim -> recalculate\n' +
            '- Aylik ozetler -> cascade guncelle\n\n' +
            'PDKS uyumsuzluklarina (saha/evden calisma) DOKUNMAZ.\n' +
            'Devam etmek istiyor musunuz?'
        )) return;

        fix ? setUniFixing(true) : setUniLoading(true);
        setUniError(null);
        setUniResult(null);
        setUniLogText(null);
        setShowUniLog(false);
        try {
            const body = { date_from: startDate, date_to: endDate, fix };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/unified-audit/', body, { timeout: 300000 });
            setUniResult(res.data);
        } catch (e) {
            setUniError(e.response?.data?.error || e.message || 'Bilinmeyen hata');
        } finally {
            setUniLoading(false);
            setUniFixing(false);
        }
    };

    const runAudit = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const body = {
                start_date: startDate,
                end_date: endDate,
            };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/recalculation-audit/', body, { timeout: 300000 });
            setResult(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Bilinmeyen hata');
        } finally {
            setLoading(false);
        }
    };

    const runFix = async () => {
        if (!window.confirm(
            'DİKKAT: Bu işlem tüm farklılıkları kalıcı olarak düzeltecektir.\n\n' +
            'Tüm günler yeniden hesaplanacak ve sonuçlar veritabanına kaydedilecek.\n' +
            'Aylık özetler de güncellenecektir.\n\n' +
            'Devam etmek istiyor musunuz?'
        )) return;

        setFixing(true);
        setError(null);
        setResult(null);
        try {
            const body = {
                start_date: startDate,
                end_date: endDate,
            };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/recalculation-fix/', body, { timeout: 300000 });
            setResult(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Bilinmeyen hata');
        } finally {
            setFixing(false);
        }
    };

    const downloadLog = async () => {
        try {
            const body = {
                start_date: startDate,
                end_date: endDate,
                download: true,
            };
            if (employeeId) body.employee_id = parseInt(employeeId);
            const res = await api.post('/system/health-check/recalculation-audit/', body, {
                responseType: 'blob',
                timeout: 300000,
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `recalculation_audit_${startDate}_${endDate}.txt`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('Log indirme hatasi: ' + (e.message || 'Bilinmeyen hata'));
        }
    };

    const toggleMismatch = (idx) => {
        setExpandedMismatches(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const isFixMode = result?.mode === 'fix';
    const isProcessing = loading || fixing;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <ArrowPathIcon className="w-6 h-6 text-indigo-600" />
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Hesaplama Denetimi</h3>
                    <p className="text-xs text-gray-500">
                        Talep analizi, PDKS kart dogrulama ve hesaplama butunlugu — tek butonla tum denetim.
                        Sonuclar icinden tek tek veya toplu duzeltme yapilabilir.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Baslangic Tarihi</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Bitis Tarihi</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sicil No (opsiyonel)</label>
                    <input
                        type="text"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="Tumu"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-28 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => runUnifiedAudit(false)}
                        disabled={isProcessing || uniLoading || uniFixing || frcLoading}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                            uniLoading || uniFixing ? 'bg-gray-400 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                        }`}
                    >
                        <MagnifyingGlassIcon className="w-4 h-4" />
                        {uniLoading ? 'Tarama...' : uniFixing ? 'Duzeltiliyor...' : 'Hesaplama Denetimi'}
                    </button>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                        <input type="checkbox" checked={showAllDays} onChange={e => setShowAllDays(e.target.checked)}
                            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                        Tum Gunler
                    </label>
                    <button
                        onClick={() => runFullRecalculation('dry_run')}
                        disabled={isProcessing || uniLoading || uniFixing || frcLoading}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                            frcLoading ? 'bg-gray-400 cursor-wait' : 'bg-violet-600 hover:bg-violet-700 active:scale-95'
                        }`}
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        {frcLoading ? 'Hesaplaniyor...' : 'Tam Yeniden Hesaplama'}
                    </button>
                    <button
                        onClick={runVerifyCalculations}
                        disabled={isProcessing || uniLoading || uniFixing || frcLoading || verifyLoading}
                        title="Recalc'tan BAĞIMSIZ koruma katmanı: ham gate event'lerden hesap yapar, DB ile karşılaştırır. Mismatch = recalc engine'inde gizli bug işareti."
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                            verifyLoading ? 'bg-gray-400 cursor-wait' : 'bg-amber-600 hover:bg-amber-700 active:scale-95'
                        }`}
                    >
                        <CheckCircleIcon className="w-4 h-4" />
                        {verifyLoading ? 'Doğrulanıyor...' : 'Bağımsız Doğrulama'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {/* Loading */}
            {isProcessing && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                        {fixing ? (
                            <WrenchScrewdriverIcon className="w-8 h-8 text-red-500 animate-pulse" />
                        ) : (
                            <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin" />
                        )}
                        <p className="text-sm text-gray-500 font-medium">
                            {fixing ? 'Tum gunler yeniden hesaplaniyor ve duzeltiliyor...' : 'Tum gunler yeniden hesaplaniyor (dry-run)...'}
                        </p>
                        <p className="text-xs text-gray-400">Bu islem birkac dakika surebilir.</p>
                    </div>
                </div>
            )}

            {/* Results */}
            {result && !isProcessing && (
                <div className="space-y-6">
                    {/* Mode Banner */}
                    {isFixMode && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
                            <WrenchScrewdriverIcon className="w-5 h-5 shrink-0" />
                            <div>
                                <span className="font-bold">Duzeltme tamamlandi!</span>
                                {' '}{result.summary?.fixed_days || 0} gun duzeltildi, aylik ozetler guncellendi.
                            </div>
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <SummaryCard
                            icon={<CheckCircleIcon className="w-6 h-6 text-green-600" />}
                            label="Eslesen Gunler"
                            value={result.summary?.matching_days || 0}
                            color="green"
                        />
                        <SummaryCard
                            icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-600" />}
                            label="Uyusmayan Gunler"
                            value={result.summary?.mismatching_days || 0}
                            color="red"
                        />
                        {isFixMode && (
                            <SummaryCard
                                icon={<WrenchScrewdriverIcon className="w-6 h-6 text-emerald-600" />}
                                label="Duzeltilen"
                                value={result.summary?.fixed_days || 0}
                                color="green"
                            />
                        )}
                        <SummaryCard
                            icon={<XCircleIcon className="w-6 h-6 text-amber-600" />}
                            label="Hatali Gunler"
                            value={result.summary?.error_days || 0}
                            color="amber"
                        />
                        <SummaryCard
                            icon={<ClockIcon className="w-6 h-6 text-gray-500" />}
                            label="Kayitsiz Gunler"
                            value={result.summary?.no_record_days || 0}
                            color="gray"
                        />
                        <SummaryCard
                            icon={<ExclamationTriangleIcon className="w-6 h-6 text-purple-600" />}
                            label="Anomaliler"
                            value={result.summary?.anomaly_count || 0}
                            color="purple"
                        />
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                        <span>
                            Toplam {result.total_days_processed} gun islendi | Sure: {result.elapsed_seconds}s | Mod: {isFixMode ? 'DUZELTME' : 'DENETIM'}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowLog(!showLog)}
                                className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors"
                            >
                                {showLog ? 'Logu Gizle' : 'Detayli Logu Goster'}
                            </button>
                            <button
                                onClick={downloadLog}
                                className="flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                TXT Indir
                            </button>
                        </div>
                    </div>

                    {/* Anomalies */}
                    {result.anomalies?.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-1.5">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                Anomaliler ({result.anomalies.length})
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {result.anomalies.map((a, i) => (
                                    <div key={i} className="p-3 border border-purple-200 bg-purple-50 rounded-lg text-xs">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                a.type === 'MULTI_REQUEST' ? 'bg-red-100 text-red-700' :
                                                a.type === 'REJECTED_BUT_APPROVED_OT' ? 'bg-red-100 text-red-700' :
                                                a.type === 'APPROVED_BUT_NO_OT' ? 'bg-red-100 text-red-700' :
                                                a.type === 'OT_DURATION_MISMATCH' ? (a.severity === 'INFO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700') :
                                                a.type === 'MONTHLY_SUMMARY_MISMATCH' ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {a.type === 'MULTI_REQUEST' ? 'Coklu Talep' :
                                                 a.type === 'REJECTED_BUT_APPROVED_OT' ? 'RED AMA Fazla Mesai Var' :
                                                 a.type === 'APPROVED_BUT_NO_OT' ? 'Onayli AMA Fazla Mesai Yok' :
                                                 a.type === 'OT_DURATION_MISMATCH' ? (a.severity === 'INFO' ? 'Fazla Mesai Kaplama (Beklenen)' : 'Fazla Mesai Sure Uyumsuz') :
                                                 a.type === 'MONTHLY_SUMMARY_MISMATCH' ? 'Aylik Ozet' :
                                                 a.type === 'NEGATIVE_MISSING' ? 'Negatif Eksik' :
                                                 a.type === 'EXTREME_MISSING' ? 'Asiri Eksik' : a.type}
                                            </span>
                                            <span className="font-bold text-gray-700">{a.employee_name}</span>
                                            <span className="text-gray-500">{a.date}</span>
                                        </div>
                                        <p className="text-gray-600">{a.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Monthly Summary Mismatches */}
                    {result.monthly_summary_mismatches?.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-1.5">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                Aylik Ozet Uyusmazliklari ({result.monthly_summary_mismatches.length})
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {result.monthly_summary_mismatches.map((m, i) => (
                                    <div key={i} className="p-3 border border-orange-200 bg-orange-50 rounded-lg text-xs">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                                                Aylik Ozet
                                            </span>
                                            <span className="font-bold text-gray-700">{m.employee_name}</span>
                                            <span className="text-gray-500">{m.date}</span>
                                        </div>
                                        <p className="text-gray-600">{m.detail}</p>
                                        {m.diffs?.length > 0 && (
                                            <div className="mt-2 space-y-0.5">
                                                {m.diffs.map((d, j) => (
                                                    <div key={j} className="flex items-center gap-2 text-[11px]">
                                                        <span className="font-mono text-gray-500 w-40">{d.field}</span>
                                                        <span className="text-gray-600">{fmtSeconds(d.stored)}</span>
                                                        <span className="text-gray-400">&rarr;</span>
                                                        <span className="font-bold text-orange-700">{fmtSeconds(d.fresh)}</span>
                                                        <span className={`text-[10px] font-bold ${d.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            ({d.diff > 0 ? '+' : ''}{fmtSeconds(Math.abs(d.diff))})
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mismatches */}
                    {result.mismatches?.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-1.5">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                {isFixMode ? 'Duzeltilen Gunler' : 'Uyusmayan Gunler'} ({result.mismatches.length})
                            </h4>
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {result.mismatches.map((m, i) => (
                                    <div key={i} className={`border rounded-lg overflow-hidden ${
                                        m.fixed ? 'border-green-200' : 'border-red-200'
                                    }`}>
                                        <button
                                            onClick={() => toggleMismatch(i)}
                                            className={`w-full flex items-center justify-between p-3 transition-colors text-left ${
                                                m.fixed ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 text-xs">
                                                {m.fixed && <WrenchScrewdriverIcon className="w-4 h-4 text-green-600" />}
                                                <span className={`font-bold ${m.fixed ? 'text-green-800' : 'text-red-800'}`}>{m.date}</span>
                                                <span className="text-gray-700">{m.employee_name}</span>
                                                <span className="text-gray-400">({m.diffs?.length || 0} fark)</span>
                                                {m.root_cause && ROOT_CAUSE_COLORS[m.root_cause] && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${ROOT_CAUSE_COLORS[m.root_cause].bg} ${ROOT_CAUSE_COLORS[m.root_cause].text}`}>
                                                        {ROOT_CAUSE_COLORS[m.root_cause].label}
                                                    </span>
                                                )}
                                                {m.fixed && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold">DUZELTILDI</span>}
                                            </div>
                                            {expandedMismatches.has(i) ?
                                                <ChevronUpIcon className="w-4 h-4 text-gray-400" /> :
                                                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                                            }
                                        </button>
                                        {expandedMismatches.has(i) && (
                                            <div className="p-3 border-t border-red-100 space-y-3">
                                                {/* Diffs */}
                                                <div>
                                                    <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Farklar</h5>
                                                    <div className="space-y-1">
                                                        {m.diffs?.map((d, j) => (
                                                            <div key={j} className="flex items-center gap-2 text-xs">
                                                                <span className="font-mono text-gray-500 w-44">{d.field}</span>
                                                                {d.field === 'status' || d.field === 'record_count' ? (
                                                                    <span className="text-red-600 font-bold">{d.diff_formatted}</span>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-gray-600">{fmtSeconds(d.before)}</span>
                                                                        <span className="text-gray-400">&rarr;</span>
                                                                        <span className="font-bold text-red-700">{fmtSeconds(d.after)}</span>
                                                                        <span className={`text-[10px] font-bold ${d.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                            ({d.diff > 0 ? '+' : ''}{d.diff_formatted})
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Before/After Table */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <SnapshotBlock title="Onceki Degerler" data={m.before} color="gray" />
                                                    <SnapshotBlock title={m.fixed ? 'Duzeltilmis Degerler' : 'Yeniden Hesaplanan'} data={m.after} color={m.fixed ? 'green' : 'red'} />
                                                </div>

                                                {/* Requests */}
                                                {m.requests?.length > 0 && (
                                                    <div>
                                                        <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                                                            Fazla Mesai Talepleri ({m.requests.length})
                                                        </h5>
                                                        <div className="space-y-1">
                                                            {m.requests.map((r, k) => (
                                                                <div key={k} className="flex items-center gap-2 text-[11px]">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                        r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                                        r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                                        r.status === 'POTENTIAL' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                        {r.status}
                                                                    </span>
                                                                    <span className="text-gray-500">{r.assignment_source || '-'}</span>
                                                                    <span className="font-mono text-gray-600">
                                                                        {r.start_time?.slice(0,5) || '-'} - {r.end_time?.slice(0,5) || '-'}
                                                                    </span>
                                                                    <span className="text-gray-400">{fmtSeconds(r.duration_seconds)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Simulation Logs */}
                                                {m.simulation_logs?.length > 0 && (
                                                    <details className="mt-2">
                                                        <summary className="text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                                                            Simulasyon Logu ({m.simulation_logs.length} satir)
                                                        </summary>
                                                        <pre className="mt-1 p-2 bg-gray-900 text-green-400 text-[10px] rounded max-h-48 overflow-y-auto font-mono leading-relaxed">
                                                            {m.simulation_logs.join('\n')}
                                                        </pre>
                                                    </details>
                                                )}

                                                {/* Day Rules */}
                                                {m.day_rules && !m.day_rules.error && (
                                                    <details className="mt-2">
                                                        <summary className="text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                                                            Gun Kurallari
                                                        </summary>
                                                        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-gray-600 bg-gray-50 p-2 rounded">
                                                            <span>Vardiya: {m.day_rules.shift_start} - {m.day_rules.shift_end}</span>
                                                            <span>Ogle: {m.day_rules.lunch_start} - {m.day_rules.lunch_end}</span>
                                                            <span>Tolerans: {m.day_rules.tolerance_minutes} dk</span>
                                                            <span>Servis Tol: {m.day_rules.service_tolerance_minutes} dk</span>
                                                            <span>Min Fazla Mesai: {m.day_rules.minimum_overtime_minutes} dk</span>
                                                            <span>Mola Ind: {m.day_rules.daily_break_allowance} dk</span>
                                                            <span>Hedef: {m.day_rules.target_formatted || '-'}</span>
                                                            <span>{m.day_rules.is_off_day ? 'TATIL' : 'Is gunu'}</span>
                                                        </div>
                                                    </details>
                                                )}

                                                {/* Leave/Cardless/Meal Requests */}
                                                {(m.leave_requests?.length > 0 || m.cardless_requests?.length > 0 || m.meal_requests?.length > 0) && (
                                                    <details className="mt-2">
                                                        <summary className="text-[10px] font-bold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                                                            Diger Talepler
                                                        </summary>
                                                        <div className="mt-1 space-y-1 text-[11px]">
                                                            {m.leave_requests?.map((r, k) => (
                                                                <div key={`l${k}`} className="flex items-center gap-2">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                        r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>{r.status}</span>
                                                                    <span className="text-gray-700">{r.request_type__name || 'Izin'}</span>
                                                                    <span className="text-gray-500">{r.start_date} - {r.end_date}</span>
                                                                </div>
                                                            ))}
                                                            {m.cardless_requests?.map((r, k) => (
                                                                <div key={`c${k}`} className="flex items-center gap-2">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                        r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>{r.status}</span>
                                                                    <span className="text-gray-700">Kartsiz Giris</span>
                                                                    <span className="font-mono text-gray-500">
                                                                        {String(r.check_in_time || '-').slice(0,5)} - {String(r.check_out_time || '-').slice(0,5)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Employee Summaries */}
                    {result.employee_summaries && Object.keys(result.employee_summaries).length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-2">Calisan Bazli Ozet</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-left">
                                            <th className="py-2 px-2 font-bold text-gray-600">Calisan</th>
                                            <th className="py-2 px-2 font-bold text-green-600 text-right">Eslesen</th>
                                            <th className="py-2 px-2 font-bold text-red-600 text-right">Uyusmayan</th>
                                            {isFixMode && <th className="py-2 px-2 font-bold text-emerald-600 text-right">Duzeltilen</th>}
                                            <th className="py-2 px-2 font-bold text-amber-600 text-right">Hata</th>
                                            <th className="py-2 px-2 font-bold text-gray-600 text-right">Normal</th>
                                            <th className="py-2 px-2 font-bold text-indigo-600 text-right">Hesap. FM</th>
                                            <th className="py-2 px-2 font-bold text-purple-600 text-right">Onayli FM</th>
                                            <th className="py-2 px-2 font-bold text-orange-600 text-right">Eksik</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(result.employee_summaries)
                                            .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'tr'))
                                            .map(([empId, s]) => (
                                                <tr key={empId} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="py-1.5 px-2 font-medium text-gray-800">{s.name}</td>
                                                    <td className="py-1.5 px-2 text-right text-green-700 font-bold">{s.match_days}</td>
                                                    <td className="py-1.5 px-2 text-right text-red-700 font-bold">{s.mismatch_days}</td>
                                                    {isFixMode && <td className="py-1.5 px-2 text-right text-emerald-700 font-bold">{s.fixed_days || 0}</td>}
                                                    <td className="py-1.5 px-2 text-right text-amber-700 font-bold">{s.error_days}</td>
                                                    <td className="py-1.5 px-2 text-right text-gray-600">{fmtSeconds(s.completed_seconds)}</td>
                                                    <td className="py-1.5 px-2 text-right text-indigo-600">{fmtSeconds(s.calculated_ot_seconds)}</td>
                                                    <td className="py-1.5 px-2 text-right text-purple-600">{fmtSeconds(s.approved_ot_seconds)}</td>
                                                    <td className="py-1.5 px-2 text-right text-orange-600">{fmtSeconds(s.missing_seconds)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Full Log */}
                    {showLog && result.log_text && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-2">Detayli Log</h4>
                            <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-[11px] leading-relaxed overflow-auto max-h-[600px] font-mono whitespace-pre-wrap">
                                {result.log_text}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* ══════ Birlesik Denetim Sonuclari ══════ */}
            {(uniLoading || uniFixing) && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                        <ArrowPathIcon className="w-8 h-8 text-emerald-500 animate-spin" />
                        <p className="text-sm text-gray-500 font-medium">
                            {uniFixing ? 'Birlesik duzeltme yapiliyor (3 faz)...' : 'Birlesik denetim taramasi (3 faz)...'}
                        </p>
                        <p className="text-xs text-gray-400">Bu islem birkac dakika surebilir.</p>
                    </div>
                </div>
            )}

            {uniError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 shrink-0" />
                    {uniError}
                </div>
            )}

            {uniResult && (
                <div className="space-y-6 mt-6 border-t-2 border-emerald-300 pt-6">
                    {/* Puan Sistemi */}
                    {uniResult.health_score && (
                        <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white ${
                                    uniResult.health_score.overall_score >= 90 ? 'bg-green-500' :
                                    uniResult.health_score.overall_score >= 70 ? 'bg-amber-500' :
                                    'bg-red-500'
                                }`}>
                                    %{uniResult.health_score.overall_score}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-800">Hesaplama Sagligi</div>
                                    <div className="text-[10px] text-gray-500">{uniResult.date_range}</div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 flex-1">
                                {Object.entries(uniResult.health_score.categories || {}).map(([key, cat]) => (
                                    <div key={key} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                            cat.score >= 90 ? 'bg-green-500' : cat.score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}>
                                            {cat.score}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-semibold text-gray-700">{cat.label}</div>
                                            <div className="text-[10px] text-gray-400">{cat.issues}/{cat.total} sorun</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Hesaplama Denetimi Sonuclari</h3>
                                <p className="text-xs text-gray-500">{uniResult.date_range} | Mod: {uniResult.mode}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {uniResult.mode === 'dry-run' && (
                                <button
                                    onClick={() => runUnifiedAudit(true)}
                                    disabled={uniFixing}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                                        uniFixing ? 'bg-gray-400 cursor-wait' : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
                                    }`}
                                >
                                    <WrenchScrewdriverIcon className="w-4 h-4" />
                                    {uniFixing ? 'Duzeltiliyor...' : 'Kesin Hatalari Duzelt'}
                                </button>
                            )}
                            <button
                                onClick={fetchUnifiedLogText}
                                disabled={uniLogLoading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border transition-all ${
                                    showUniLog
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'text-indigo-700 bg-indigo-50 border-indigo-300 hover:bg-indigo-100'
                                } active:scale-95`}
                            >
                                <MagnifyingGlassIcon className="w-4 h-4" />
                                {uniLogLoading ? 'Yukleniyor...' : showUniLog ? 'Logu Gizle' : 'Detayli Logu Goster'}
                            </button>
                            <button
                                onClick={downloadUnifiedLog}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 active:scale-95 transition-all"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                TXT Indir
                            </button>
                        </div>
                    </div>

                    {/* Faz 1: Talep Analizi */}
                    {uniResult.phase1 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                            <h4 className="font-bold text-blue-800 text-sm">Faz 1: Talep Analizi</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <SummaryCard
                                    icon={<ClockIcon className="w-5 h-5 text-blue-500" />}
                                    label="Toplam Talep" value={uniResult.phase1.total} color="gray"
                                />
                                <SummaryCard
                                    icon={<ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />}
                                    label="Sorunlu" value={uniResult.phase1.with_issues} color={uniResult.phase1.with_issues > 0 ? 'amber' : 'green'}
                                />
                                {uniResult.phase1.fixed !== undefined && (
                                    <SummaryCard
                                        icon={<CheckCircleIcon className="w-5 h-5 text-green-500" />}
                                        label="Duzeltildi" value={uniResult.phase1.fixed} color="green"
                                    />
                                )}
                                {uniResult.phase1.failed !== undefined && uniResult.phase1.failed > 0 && (
                                    <SummaryCard
                                        icon={<XCircleIcon className="w-5 h-5 text-red-500" />}
                                        label="Basarisiz" value={uniResult.phase1.failed} color="red"
                                    />
                                )}
                            </div>
                            {/* Issue breakdown */}
                            {uniResult.phase1.issue_breakdown && Object.entries(uniResult.phase1.issue_breakdown).some(([,v]) => v > 0) && (
                                <div className="text-xs space-y-1">
                                    <p className="font-semibold text-gray-600">Sorun Dagilimi:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(uniResult.phase1.issue_breakdown).filter(([,v]) => v > 0).map(([code, count]) => (
                                            <span key={code} className="px-2 py-1 bg-white border border-blue-200 rounded text-blue-700 font-mono">
                                                {code}: {count}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Fix log */}
                            {uniResult.phase1.fix_log?.length > 0 && (
                                <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                                    <p className="font-semibold text-gray-600">Duzeltme Logu:</p>
                                    {uniResult.phase1.fix_log.map((log, i) => (
                                        <div key={i} className={`p-2 rounded ${log.fixed ? 'bg-green-50' : 'bg-red-50'} flex gap-2`}>
                                            {log.fixed ? <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <XCircleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                                            <span>{log.employee_name} {log.date} [{log.issue_code}] -- {log.detail}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Veri Butunlugu Fix Sonuclari */}
                    {uniResult.data_fixes && uniResult.data_fixes.fixes?.length > 0 && (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
                            <h4 className="font-bold text-orange-800 text-sm">Veri Butunlugu Duzeltmeleri ({uniResult.data_fixes.total})</h4>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {uniResult.data_fixes.fixes.map((fix, i) => (
                                    <div key={i} className="flex items-start gap-2 p-2 bg-white rounded border border-orange-100 text-xs">
                                        <WrenchScrewdriverIcon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                        <span>{fix}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Faz 2: PDKS Dogrulama — Interaktif Panel */}
                    {uniResult.phase2 && <Phase2IssuePanel phase2={uniResult.phase2} />}

                    {/* Faz 3: Butunluk Kontrolu */}
                    {uniResult.phase3 && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                            <h4 className="font-bold text-emerald-800 text-sm">Faz 3: Butunluk Kontrolu</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <SummaryCard
                                    icon={<ClockIcon className="w-5 h-5 text-emerald-500" />}
                                    label="Toplam Talep" value={uniResult.phase3.total} color="gray"
                                />
                                <SummaryCard
                                    icon={<ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />}
                                    label="Kalan Sorunlu" value={uniResult.phase3.with_issues} color={uniResult.phase3.with_issues > 0 ? 'amber' : 'green'}
                                />
                                <SummaryCard
                                    icon={<WrenchScrewdriverIcon className="w-5 h-5 text-orange-500" />}
                                    label="Duzeltilebilir" value={uniResult.phase3.fixable_remaining} color={uniResult.phase3.fixable_remaining > 0 ? 'red' : 'green'}
                                />
                            </div>
                            {uniResult.phase3.fixable_remaining === 0 && uniResult.phase3.with_issues === 0 && (
                                <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm font-bold">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    Tum denetimler basarili - sorun bulunamadi!
                                </div>
                            )}
                        </div>
                    )}

                    {/* Detayli Log Paneli */}
                    {showUniLog && uniLogText && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-2">Detayli Hesaplama Denetim Logu</h4>
                            <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-[11px] leading-relaxed overflow-auto max-h-[600px] font-mono whitespace-pre-wrap">
                                {uniLogText}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* ══════ Tam Yeniden Hesaplama ══════ */}
            {frcLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                        <ArrowPathIcon className="w-8 h-8 text-violet-500 animate-spin" />
                        <p className="text-sm text-gray-500 font-medium">
                            Tam yeniden hesaplama arka planda calisiyor...
                        </p>
                        <p className="text-xs text-gray-400">
                            Celery task olarak calisir, 8-10 dakika surebilir. Sayfa acik kalsin.
                        </p>
                        <button
                            onClick={async () => {
                                try {
                                    await api.get('/system/health-check/full-recalculation-status/?cancel=true');
                                    setFrcLoading(false);
                                    setFrcResult(null);
                                    setFrcError(null);
                                } catch {}
                            }}
                            className="mt-2 px-4 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                        >
                            Iptal Et / Sifirla
                        </button>
                    </div>
                </div>
            )}

            {frcError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 shrink-0" />
                    {frcError}
                </div>
            )}

            {frcResult && !frcLoading && (
                <div className="space-y-6 mt-6 border-t-2 border-violet-300 pt-6">
                    {/* Header + Apply Button */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <ArrowPathIcon className="w-6 h-6 text-violet-600" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">
                                    Tam Yeniden Hesaplama Raporu
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {frcResult.date_range} | Mod: {frcResult.mode === 'dry_run' ? 'SIMULASYON' : 'UYGULANDI'} | Sure: {frcResult.elapsed}s
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {frcResult.mode === 'dry_run' && (
                                <button
                                    onClick={() => runFullRecalculation('apply')}
                                    disabled={frcLoading}
                                    title={frcResult.run_id
                                        ? 'Bu simülasyonun sonucu hazır (staged) — yeniden hesaplamadan doğrudan canlıya yazılır.'
                                        : 'Değişiklikler hesaplanıp canlıya uygulanır.'}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-lg"
                                >
                                    <WrenchScrewdriverIcon className="w-4 h-4" />
                                    {(frcResult.summary?.total_employees_changed > 0 || frcResult.summary?.restored_requests > 0 || frcResult.summary?.dedup_manual_ot > 0)
                                        ? `Onayla ve Uygula${frcResult.summary?.restored_requests > 0 ? ` (${frcResult.summary.restored_requests} talep kurtarılacak)` : ''}`
                                        : 'Aylık Özetleri Yeniden Hesapla'}
                                </button>
                            )}
                            <button
                                onClick={downloadFrcLog}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-violet-700 bg-violet-50 border border-violet-300 hover:bg-violet-100 active:scale-95 transition-all"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                TXT Indir (Kompakt)
                            </button>
                            <button
                                onClick={downloadWideReport}
                                disabled={wideLoading}
                                title="Geniş TXT: bu tarih aralığı için herkes (veya Sicil No doluysa tek kişi) için TÜM veri — kart giriş/çıkış, tüm kayıtlar, tüm talep statüleri (onaylı/bekleyen/red/iptal), izinler, sağlık raporları, aylık özet."
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border transition-all active:scale-95 ${
                                    wideLoading
                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait'
                                        : 'text-sky-800 bg-sky-50 border-sky-300 hover:bg-sky-100'
                                }`}
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                {wideLoading ? 'Hazırlanıyor...' : (employeeId ? 'Geniş TXT (Kişi)' : 'Geniş TXT (Toplu)')}
                            </button>
                        </div>
                        {frcResult.mode === 'apply' && (
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col gap-1 px-4 py-2 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm font-bold">
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Degisiklikler basariyla uygulandi!
                                    </div>
                                    {(frcResult.summary?.restored_requests || 0) > 0 && (
                                        <div className="text-xs font-medium text-green-700 ml-7">
                                            {frcResult.summary.restored_requests} iptal edilmiş talep kurtarıldı
                                            {(frcResult.summary?.restored_approved || 0) > 0 && ` (${frcResult.summary.restored_approved} onaylı`}
                                            {(frcResult.summary?.restored_pending || 0) > 0 && `, ${frcResult.summary.restored_pending} bekleyen`}
                                            {(frcResult.summary?.restored_approved || 0) > 0 && ')'}
                                            {' — hesaplamalar güncellendi'}
                                        </div>
                                    )}
                                    {(frcResult.summary?.dedup_manual_ot || 0) > 0 && (
                                        <div className="text-xs font-medium text-green-700 ml-7">
                                            {frcResult.summary.dedup_manual_ot} duplikat MANUAL_OT kaydı temizlendi
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => runFullRecalculation('dry_run')}
                                    disabled={frcLoading}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 active:scale-95 transition-all"
                                >
                                    <MagnifyingGlassIcon className="w-4 h-4" />
                                    Değişiklikleri Doğrula (Tekrar Kontrol)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SummaryCard
                            icon={<MagnifyingGlassIcon className="w-5 h-5 text-gray-500" />}
                            label="Taranan Calisan"
                            value={frcResult.summary?.total_employees_scanned || 0}
                            color="gray"
                        />
                        <SummaryCard
                            icon={<ExclamationTriangleIcon className="w-5 h-5 text-violet-500" />}
                            label="Degisen Calisan"
                            value={frcResult.summary?.total_employees_changed || 0}
                            color={frcResult.summary?.total_employees_changed > 0 ? 'purple' : 'green'}
                        />
                        <SummaryCard
                            icon={<ClockIcon className="w-5 h-5 text-amber-500" />}
                            label="Degisen Gun"
                            value={frcResult.summary?.total_days_changed || 0}
                            color={frcResult.summary?.total_days_changed > 0 ? 'amber' : 'green'}
                        />
                        <SummaryCard
                            icon={<WrenchScrewdriverIcon className="w-5 h-5 text-orange-500" />}
                            label="Split Duzeltme"
                            value={frcResult.summary?.split_fixes || 0}
                            color={frcResult.summary?.split_fixes > 0 ? 'red' : 'green'}
                        />
                        {(frcResult.summary?.ghost_days || 0) > 0 && (
                            <SummaryCard
                                icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-600" />}
                                label="Kayitsiz Gun"
                                value={frcResult.summary.ghost_days}
                                color="red"
                            />
                        )}
                        {(frcResult.summary?.balance_mismatches || 0) > 0 && (
                            <SummaryCard
                                icon={<ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />}
                                label="Hedef Denge Hatasi"
                                value={frcResult.summary.balance_mismatches}
                                color="amber"
                            />
                        )}
                        {(frcResult.summary?.day_balance_fails || 0) > 0 && (
                            <SummaryCard
                                icon={<ExclamationTriangleIcon className="w-6 h-6 text-pink-600" />}
                                label="Gun Denge Hatasi"
                                value={frcResult.summary.day_balance_fails}
                                color="red"
                            />
                        )}
                        {(frcResult.summary?.total_employees_with_issues || 0) > 0 && (
                            <SummaryCard
                                icon={<ExclamationTriangleIcon className="w-6 h-6 text-rose-600" />}
                                label="Sorunlu Calisan"
                                value={frcResult.summary.total_employees_with_issues}
                                color="red"
                            />
                        )}
                        {(frcResult.summary?.restored_requests || 0) > 0 && (
                            <SummaryCard
                                icon={<CheckCircleIcon className="w-6 h-6 text-emerald-600" />}
                                label={frcResult.mode === 'dry_run' ? 'Kurtarilacak Talep' : 'Kurtarilan Talep'}
                                value={frcResult.summary.restored_requests}
                                color="green"
                            />
                        )}
                        {(frcResult.summary?.dedup_manual_ot || 0) > 0 && (
                            <SummaryCard
                                icon={<CheckCircleIcon className="w-6 h-6 text-blue-600" />}
                                label={frcResult.mode === 'dry_run' ? 'Temizlenecek Duplikat' : 'Temizlenen Duplikat'}
                                value={frcResult.summary.dedup_manual_ot}
                                color="blue"
                            />
                        )}
                        {(frcResult.summary?.status_fixed || 0) > 0 && (
                            <SummaryCard
                                icon={<WrenchScrewdriverIcon className="w-6 h-6 text-amber-600" />}
                                label={frcResult.mode === 'dry_run' ? 'Durum Duzeltilecek' : 'Durum Duzeltildi'}
                                value={frcResult.summary.status_fixed}
                                color="amber"
                            />
                        )}
                        {(frcResult.summary?.gate_rebuilt || 0) > 0 && (
                            <SummaryCard
                                icon={<WrenchScrewdriverIcon className="w-6 h-6 text-teal-600" />}
                                label={frcResult.mode === 'dry_run' ? 'Overlap Temizlenecek' : 'Overlap Temizlendi'}
                                value={frcResult.summary.gate_rebuilt}
                                color="green"
                            />
                        )}
                    </div>

                    {/* Overlap Temizleme Detayları */}
                    {frcResult.summary?.gate_details?.length > 0 && (
                        <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                            <h4 className="font-bold text-cyan-800 text-sm mb-3">
                                Overlap Temizleme Detayları
                                <span className="ml-2 text-xs font-normal text-cyan-600">({frcResult.summary.gate_details.length} gün)</span>
                            </h4>
                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-cyan-50">
                                        <tr className="text-left text-cyan-700 border-b border-cyan-200">
                                            <th className="pb-2 pr-3">Çalışan</th>
                                            <th className="pb-2 pr-3">Tarih</th>
                                            <th className="pb-2 pr-3">Eski Kayıt</th>
                                            <th className="pb-2 pr-3">Yeni Kayıt</th>
                                            <th className="pb-2 pr-3">Kart Çiftleri</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {frcResult.summary.gate_details.map((gd, i) => (
                                            <tr key={i} className="border-b border-cyan-100 hover:bg-cyan-100/50">
                                                <td className="py-1.5 pr-3 font-medium text-slate-800">{gd.emp}</td>
                                                <td className="py-1.5 pr-3 text-slate-600">{gd.date}</td>
                                                <td className="py-1.5 pr-3 font-mono text-red-600 font-bold">{gd.old_count}</td>
                                                <td className="py-1.5 pr-3 font-mono text-green-700 font-bold">{gd.new_count}</td>
                                                <td className="py-1.5 pr-3 font-mono text-slate-600 text-xs">
                                                    {(gd.pairs || []).map((p, j) => <span key={j} className="mr-2">{p[0]}-{p[1]}</span>)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Global Diff Summary */}
                    {(frcResult.summary?.normal_diff || frcResult.summary?.ot_diff || frcResult.summary?.missing_diff) ? (
                        <div className="flex flex-wrap gap-4 p-3 bg-violet-50 border border-violet-200 rounded-lg text-sm">
                            <span className="font-bold text-violet-800">Toplam Fark:</span>
                            {frcResult.summary.normal_diff !== 0 && (
                                <span className={frcResult.summary.normal_diff > 0 ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                                    Normal: {frcResult.summary.normal_diff > 0 ? '+' : ''}{fmtSeconds(Math.abs(frcResult.summary.normal_diff))}
                                </span>
                            )}
                            {frcResult.summary.ot_diff !== 0 && (
                                <span className={frcResult.summary.ot_diff > 0 ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                                    Mesai: {frcResult.summary.ot_diff > 0 ? '+' : ''}{fmtSeconds(Math.abs(frcResult.summary.ot_diff))}
                                </span>
                            )}
                            {frcResult.summary.missing_diff !== 0 && (
                                <span className={frcResult.summary.missing_diff < 0 ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                                    Eksik: {frcResult.summary.missing_diff > 0 ? '+' : ''}{fmtSeconds(Math.abs(frcResult.summary.missing_diff))}
                                </span>
                            )}
                        </div>
                    ) : null}

                    {/* No changes */}
                    {frcResult.summary?.total_employees_changed === 0 && (
                        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-bold">
                            <CheckCircleIcon className="w-5 h-5" />
                            Tum hesaplamalar dogru — degisiklik gerekmiyor!
                        </div>
                    )}

                    {/* Employee List */}
                    {frcResult.employees?.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-gray-800">
                                Degisen Calisanlar ({frcResult.employees.length})
                            </h4>
                            {frcResult.employees.map((emp) => (
                                <div key={emp.id} className="border border-violet-200 rounded-xl overflow-hidden">
                                    {/* Employee Header */}
                                    <button
                                        onClick={() => toggleFrcEmp(emp.id)}
                                        className="w-full flex items-center justify-between p-3 bg-violet-50 hover:bg-violet-100 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="font-bold text-violet-800">{emp.name}</span>
                                            <span className="text-gray-500">{emp.dept}</span>
                                            <span className="px-2 py-0.5 bg-violet-200 text-violet-800 rounded-full text-[10px] font-bold">
                                                {emp.cd} gun degisti
                                            </span>
                                        </div>
                                        {frcExpandedEmps.has(emp.id) ?
                                            <ChevronUpIcon className="w-4 h-4 text-gray-400" /> :
                                            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                                        }
                                    </button>

                                    {/* Employee Detail */}
                                    {frcExpandedEmps.has(emp.id) && (
                                        <div className="p-4 space-y-4 bg-white">
                                            {/* Days */}
                                            {emp.days?.map((day) => {
                                                const dayKey = `${emp.id}-${day.date}`;
                                                return (
                                                    <div key={day.date} className="border border-gray-200 rounded-lg overflow-hidden">
                                                        {/* Day Header */}
                                                        <button
                                                            onClick={() => toggleFrcDay(dayKey)}
                                                            className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                                        >
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="font-bold text-gray-800">{day.date}</span>
                                                                <span className="text-gray-500">{day.wd}</span>
                                                                {day.rules?.off && (
                                                                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[9px] font-bold">TATIL</span>
                                                                )}
                                                                {day.rules?.hol && (
                                                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold">{day.rules.hol}</span>
                                                                )}
                                                                <span className="text-gray-400">|</span>
                                                                {day.ch?.map((c, ci) => (
                                                                    <span key={ci} className="text-gray-600">{c}</span>
                                                                ))}
                                                            </div>
                                                            {frcExpandedDays.has(dayKey) ?
                                                                <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400" /> :
                                                                <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
                                                            }
                                                        </button>

                                                        {/* Day Detail */}
                                                        {frcExpandedDays.has(dayKey) && (
                                                            <div className="p-3 space-y-3 border-t border-gray-100">
                                                                {/* Rules */}
                                                                <div className="flex flex-wrap gap-3 text-[11px] text-gray-600 bg-slate-50 p-2 rounded">
                                                                    <span>Vardiya: {day.rules?.shift || '-'}</span>
                                                                    <span>Ogle: {day.rules?.lunch || '-'}</span>
                                                                    <span>Tolerans: {day.rules?.tol || 0}dk</span>
                                                                    <span>Mola: {day.rules?.brk || 0}dk</span>
                                                                </div>

                                                                {/* Requests */}
                                                                {day.reqs?.length > 0 && (
                                                                    <div>
                                                                        <h6 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Talepler</h6>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {day.reqs.map((r, ri) => (
                                                                                <span key={ri} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                                    r.st === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                                                    r.st === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                                                    r.st === 'POTENTIAL' ? 'bg-blue-100 text-blue-700' :
                                                                                    r.st === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                                                    'bg-gray-100 text-gray-700'
                                                                                }`}>
                                                                                    [{r.st}] {r.tp}{r.nm ? ` ${r.nm}` : ''} {r.s}-{r.e}
                                                                                    {r.d ? ` (${fmtSeconds(r.d)})` : ''}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Before / After Tables */}
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <FrcRecordTable title="ONCE" data={day.before} color="gray" />
                                                                    <FrcRecordTable title="SONRA" data={day.after} color="violet" />
                                                                </div>

                                                                {/* Changes */}
                                                                {day.ch?.length > 0 && (
                                                                    <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                                                                        <h6 className="text-[10px] font-bold text-amber-700 uppercase mb-1">Degisiklikler</h6>
                                                                        {day.ch.map((c, ci) => (
                                                                            <div key={ci} className="text-[11px] text-amber-800 font-mono">{c}</div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Monthly Summary Diff */}
                                            {emp.mb && emp.ma && (
                                                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                                    <h6 className="text-[10px] font-bold text-indigo-700 uppercase mb-2">Aylik Ozet Degisiklikleri</h6>
                                                    {Object.keys({ ...emp.mb, ...emp.ma }).sort().map((key) => {
                                                        const b = emp.mb[key];
                                                        const a = emp.ma[key];
                                                        if (!b && !a) return null;
                                                        return (
                                                            <div key={key} className="mb-2">
                                                                <div className="text-xs font-bold text-indigo-800 mb-1">{key}</div>
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                                                    <FrcMonthlyField label="Tamamlanan" before={b?.cmp} after={a?.cmp} />
                                                                    <FrcMonthlyField label="Mesai" before={b?.ot} after={a?.ot} />
                                                                    <FrcMonthlyField label="Eksik" before={b?.mis} after={a?.mis} />
                                                                    <FrcMonthlyField label="Net Bakiye" before={b?.nb} after={a?.nb} />
                                                                    <FrcMonthlyField label="Toplam Is" before={b?.tw} after={a?.tw} />
                                                                    <FrcMonthlyField label="Kumulatif" before={b?.cum} after={a?.cum} />
                                                                    <FrcMonthlyField label="Izin" before={b?.lv} after={a?.lv} />
                                                                    <FrcMonthlyField label="Rapor" before={b?.hr} after={a?.hr} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════ VERİ BÜTÜNLÜĞÜ BULGULARI (2026-05-19 birleştirme) ══════════ */}
            {frcResult && !frcLoading && frcResult.summary?.integrity_findings !== undefined && (
                <IntegrityFindingsPanel
                    findings={frcResult.summary.integrity_findings}
                    dateFrom={startDate}
                    dateTo={endDate}
                    employeeId={employeeId || null}
                />
            )}

            {/* ══════════ BAĞIMSIZ HESAP DOĞRULAMA ══════════ */}
            {(verifyError || verifyResult || verifyLoading) && (
                <div className="space-y-4 mt-6 border-t-2 border-amber-300 pt-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="w-6 h-6 text-amber-600" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">
                                    Bağımsız Hesap Doğrulama
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Recalc engine'inden BAĞIMSIZ koruma katmanı —
                                    ham gate event'lerden hesap yapar, DB ile karşılaştırır.
                                    Mismatch = recalc'ta gizli bug işareti.
                                </p>
                            </div>
                        </div>
                        {verifyResult && (
                            <button
                                onClick={downloadVerifyTxt}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100 active:scale-95 transition-all"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                TXT İndir
                            </button>
                        )}
                    </div>

                    {verifyLoading && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            Bağımsız hesap çalışıyor — birkaç saniye sürebilir...
                        </div>
                    )}

                    {verifyError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <XCircleIcon className="w-5 h-5 inline mr-2" />
                            {verifyError}
                        </div>
                    )}

                    {verifyResult && (
                        <>
                            <p className="text-xs text-gray-500">
                                {verifyResult.date_range} | Süre: {verifyResult.elapsed}s |
                                Eşik: {Math.round((verifyResult.threshold_seconds || 1800) / 60)}dk
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="text-xs text-green-700 font-semibold">OK</div>
                                    <div className="text-2xl font-bold text-green-800">{verifyResult.summary?.ok || 0}</div>
                                </div>
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="text-xs text-red-700 font-semibold">MISMATCH</div>
                                    <div className="text-2xl font-bold text-red-800">{verifyResult.summary?.mismatch || 0}</div>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <div className="text-xs text-slate-700 font-semibold">SKIP</div>
                                    <div className="text-2xl font-bold text-slate-800">{verifyResult.summary?.skip || 0}</div>
                                </div>
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <div className="text-xs text-gray-700 font-semibold">NO_DATA</div>
                                    <div className="text-2xl font-bold text-gray-800">{verifyResult.summary?.no_data || 0}</div>
                                </div>
                            </div>

                            {(verifyResult.summary?.mismatch || 0) === 0 ? (
                                <div className="p-4 bg-green-50 border border-green-300 rounded-lg text-green-800 text-sm font-bold flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    ✓ Hiç MISMATCH yok — bağımsız hesap DB ile uyumlu.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-800 text-sm font-bold">
                                        🔴 {verifyResult.summary?.mismatch} adet MISMATCH bulundu — recalc engine'inde olası bug işareti.
                                    </div>
                                    {(verifyResult.employees || []).map(emp => {
                                        const mmDays = (emp.days || []).filter(d => d.flag === 'MISMATCH');
                                        if (mmDays.length === 0) return null;
                                        return (
                                            <div key={emp.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                                                <div className="font-bold text-red-900 mb-2">
                                                    [{emp.id}] {emp.name} ({emp.dept})
                                                </div>
                                                <div className="space-y-2">
                                                    {mmDays.map(d => {
                                                        const ev = d.evidence || {};
                                                        const sr = ev.shift_rules || {};
                                                        const c = ev.calculation || {};
                                                        return (
                                                            <details key={d.work_date} className="text-xs text-gray-700 font-mono bg-white rounded border border-red-200 p-2">
                                                                <summary className="cursor-pointer hover:bg-red-50 -m-2 p-2 rounded">
                                                                    <span className="font-bold text-red-700">{d.work_date}</span>
                                                                    {' — '}
                                                                    <span>N: bek={fmtSeconds(d.expected_normal)} kayıt={fmtSeconds(d.actual_normal)} <b>fark={fmtSeconds(d.diff_normal)}</b></span>
                                                                    {' | '}
                                                                    <span>M: bek={fmtSeconds(d.expected_missing)} kayıt={fmtSeconds(d.actual_missing)} <b>fark={fmtSeconds(d.diff_missing)}</b></span>
                                                                    {d.notes?.length > 0 && (
                                                                        <div className="ml-4 text-rose-600">→ {d.notes.join(' | ')}</div>
                                                                    )}
                                                                    <span className="ml-2 text-blue-600 text-[10px]">[kanıt için tıkla]</span>
                                                                </summary>
                                                                <div className="mt-3 pl-3 border-l-2 border-red-300 space-y-1">
                                                                    <div><b>Vardiya:</b> {String(sr.shift_start || '-')}-{String(sr.shift_end || '-')} | Lunch: {String(sr.lunch_start || '-')}-{String(sr.lunch_end || '-')} | Off: {String(sr.is_off_day)} | Break: {sr.daily_break_allowance_min || 0}dk</div>
                                                                    {ev.public_holiday && (
                                                                        <div><b>Tatil:</b> {ev.public_holiday.name} [{ev.public_holiday.type}]</div>
                                                                    )}
                                                                    {ev.daily_override && (
                                                                        <div className="text-orange-700"><b>Override:</b> #{ev.daily_override.id} is_off={String(ev.daily_override.is_off)} {ev.daily_override.start_time}-{ev.daily_override.end_time}</div>
                                                                    )}
                                                                    {ev.gate_events?.length > 0 && (
                                                                        <div><b>Gate ({ev.gate_events.length}):</b> {ev.gate_events.slice(0, 12).map(e => `${e.ts} ${e.direction} ${e.status}`).join(' | ')}{ev.gate_events.length > 12 ? '…' : ''}</div>
                                                                    )}
                                                                    {ev.pairs?.length > 0 && (
                                                                        <div><b>Pairs:</b> {ev.pairs.map(p => `${p.check_in || '?'}→${p.check_out || 'AÇIK'}`).join(' | ')}</div>
                                                                    )}
                                                                    {ev.attendance_records?.length > 0 && (
                                                                        <div>
                                                                            <b>Att kayıt ({ev.attendance_records.length}):</b>
                                                                            <div className="ml-3">
                                                                                {ev.attendance_records.map(a => (
                                                                                    <div key={a.id}>
                                                                                        #{a.id} {a.source}{a.is_overtime_record ? ' *OT' : ''}{a.parent_attendance_id ? ` parent=${a.parent_attendance_id}` : ''} {a.check_in || '-'}→{a.check_out || 'AÇIK'} st={a.status} N={fmtSeconds(a.normal_seconds)} OT={fmtSeconds(a.overtime_seconds)} M={fmtSeconds(a.missing_seconds)} HV={fmtSeconds(a.hospital_visit_seconds)}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {ev.leave_requests_all_status?.length > 0 && (
                                                                        <div className="text-purple-700">
                                                                            <b>LeaveReq ({ev.leave_requests_all_status.length}):</b>
                                                                            <div className="ml-3">
                                                                                {ev.leave_requests_all_status.map(lr => (
                                                                                    <div key={lr.id}>#{lr.id} <b>{lr.status}</b> {lr.category || '-'}/{lr.request_type_name || '-'} {lr.start_date}→{lr.end_date} {lr.start_time}-{lr.end_time}</div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {ev.health_reports_all_status?.length > 0 && (
                                                                        <div className="text-pink-700">
                                                                            <b>HealthRep ({ev.health_reports_all_status.length}):</b>
                                                                            <div className="ml-3">
                                                                                {ev.health_reports_all_status.map(h => (
                                                                                    <div key={h.id}>#{h.id} <b>{h.status}</b> {h.report_type || '-'} {h.start_date}→{h.end_date} full={String(h.is_full_day)} {h.start_time}-{h.end_time}</div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="bg-yellow-50 p-2 rounded mt-2">
                                                                        <b>Hesap:</b> raw={fmtSeconds(c.raw_work_in_shift_s || 0)} − lunch={fmtSeconds(c.lunch_overlap_s || 0)} + hv={fmtSeconds(c.hv_credit_s || 0)} + leave={fmtSeconds(c.leave_credit_s || 0)} = <b>expected_normal={fmtSeconds(c.expected_normal_s || 0)}</b>
                                                                        <br />
                                                                        <b>Target:</b> {fmtSeconds(c.daily_target_s || 0)} → <b>expected_missing={fmtSeconds(c.expected_missing_s || 0)}</b>
                                                                    </div>
                                                                </div>
                                                            </details>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ══════════ HESAPLAMA SANITY CHECK ══════════ */}
            <SanityCheckPanel />

            {/* ══════════ OT TALEP DENETİMİ ══════════ */}
            <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Talep Bütünlüğü Denetimi</h3>
                        <p className="text-xs text-gray-500">
                            Duplikat, stale, çakışan potansiyeller ve onaylı-ama-uygulanmamış Fazla Mesai talepleri
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => runOtAudit('scan')}
                            disabled={otAuditLoading || otAuditFixing}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-indigo-700 bg-indigo-50 border border-indigo-300 hover:bg-indigo-100 active:scale-95 transition-all"
                        >
                            <MagnifyingGlassIcon className="w-4 h-4" />
                            {otAuditLoading ? 'Taranıyor...' : 'Tara'}
                        </button>
                        {otAuditResult && otAuditResult.total_issues > 0 && (
                            <button
                                onClick={() => runOtAudit('fix')}
                                disabled={otAuditLoading || otAuditFixing}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all"
                            >
                                <WrenchScrewdriverIcon className="w-4 h-4" />
                                {otAuditFixing ? 'Düzeltiliyor...' : `Düzelt (${otAuditResult.total_issues})`}
                            </button>
                        )}
                        {otAuditResult && (
                            <button
                                onClick={() => {
                                    const log = otAuditResult.text_log || 'Rapor yok';
                                    const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `talep_denetim_${startDate}_${endDate}.txt`;
                                    link.click();
                                    window.URL.revokeObjectURL(url);
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-violet-700 bg-violet-50 border border-violet-300 hover:bg-violet-100 active:scale-95 transition-all"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                TXT İndir
                            </button>
                        )}
                    </div>
                </div>

                {otAuditResult && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm">
                            <span className={`px-3 py-1 rounded-full font-bold ${
                                otAuditResult.total_issues === 0
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {otAuditResult.total_issues === 0
                                    ? '✅ Sorun Yok'
                                    : `⚠️ ${otAuditResult.total_issues} Sorun`}
                            </span>
                            {otAuditResult.fixed > 0 && (
                                <span className="px-3 py-1 rounded-full font-bold bg-green-100 text-green-800">
                                    ✅ {otAuditResult.fixed} Düzeltildi
                                </span>
                            )}
                            <span className="text-gray-500">
                                {otAuditResult.date_range} | {otAuditResult.elapsed}s |
                                Mod: {otAuditResult.mode === 'fix' ? 'DÜZELTME' : 'TARAMA'}
                            </span>
                        </div>

                        {Object.keys(otAuditResult.summary || {}).length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                {Object.entries(otAuditResult.summary).map(([type, count]) => (
                                    <div key={type} className="px-3 py-2 bg-gray-50 border rounded-lg text-center">
                                        <div className="text-lg font-bold text-gray-800">{count}</div>
                                        <div className="text-xs text-gray-500">
                                            {type === 'DUPLICATE_POTENTIAL' && 'Duplikat'}
                                            {type === 'STALE_POTENTIAL' && 'Stale (Kart Yok)'}
                                            {type === 'MANUAL_ONLY_POTENTIAL' && 'Kartsız Giriş'}
                                            {type === 'REDUNDANT_POTENTIAL' && 'Gereksiz (Onaylı Var)'}
                                            {type === 'APPROVED_NO_OT' && 'Onaylı Fazla Mesai=0'}
                                            {type === 'OVERLAPPING_POTENTIAL' && 'Çakışan'}
                                            {type === 'DURATION_MISMATCH' && 'Süre Tutarsız'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {(otAuditResult.issues || []).length > 0 && (
                            <div className="max-h-96 overflow-y-auto border rounded-lg">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Tür</th>
                                            <th className="px-3 py-2 text-left">Çalışan</th>
                                            <th className="px-3 py-2 text-left">Tarih</th>
                                            <th className="px-3 py-2 text-left">Detay</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {otAuditResult.issues.map((iss, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                        iss.type === 'STALE_POTENTIAL' ? 'bg-orange-100 text-orange-700' :
                                                        iss.type === 'DUPLICATE_POTENTIAL' ? 'bg-red-100 text-red-700' :
                                                        iss.type === 'APPROVED_NO_OT' ? 'bg-purple-100 text-purple-700' :
                                                        iss.type === 'OVERLAPPING_POTENTIAL' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {iss.type === 'DUPLICATE_POTENTIAL' && 'Duplikat'}
                                                        {iss.type === 'STALE_POTENTIAL' && 'Stale'}
                                                        {iss.type === 'MANUAL_ONLY_POTENTIAL' && 'Kartsız'}
                                                        {iss.type === 'REDUNDANT_POTENTIAL' && 'Gereksiz'}
                                                        {iss.type === 'APPROVED_NO_OT' && 'FM=0'}
                                                        {iss.type === 'OVERLAPPING_POTENTIAL' && 'Çakışan'}
                                                        {iss.type === 'DURATION_MISMATCH' && 'Süre'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">{iss.employee_name || `ID:${iss.employee_id}`}</td>
                                                <td className="px-3 py-2">{iss.date}</td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {iss.time && <span>{iss.time}</span>}
                                                    {iss.count && <span> ({iss.count} duplikat)</span>}
                                                    {iss.diff_seconds && <span> (fark: {Math.round(iss.diff_seconds/60)}dk)</span>}
                                                    {iss.pot1 && <span>{iss.pot1} ↔ {iss.pot2}</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color }) {
    const colors = {
        green: 'bg-green-50 border-green-200',
        red: 'bg-red-50 border-red-200',
        amber: 'bg-amber-50 border-amber-200',
        gray: 'bg-gray-50 border-gray-200',
        purple: 'bg-purple-50 border-purple-200',
    };
    return (
        <div className={`p-4 rounded-xl border ${colors[color] || colors.gray} flex items-center gap-3`}>
            {icon}
            <div>
                <div className="text-2xl font-bold text-gray-800">{value}</div>
                <div className="text-[10px] text-gray-500 font-medium">{label}</div>
            </div>
        </div>
    );
}

function SnapshotBlock({ title, data, color }) {
    if (!data) return null;
    const borderColor = color === 'red' ? 'border-red-200' : color === 'green' ? 'border-green-200' : 'border-gray-200';
    const bgColor = color === 'red' ? 'bg-red-50' : color === 'green' ? 'bg-green-50' : 'bg-gray-50';
    return (
        <div className={`p-2 border ${borderColor} ${bgColor} rounded-lg`}>
            <h6 className="text-[10px] font-bold text-gray-500 uppercase mb-1">{title}</h6>
            <div className="space-y-0.5 text-[11px]">
                <Row label="Normal" value={fmtSeconds(data.normal_seconds)} />
                <Row label="Hesap. FM" value={fmtSeconds(data.calculated_overtime_seconds)} />
                <Row label="Onayli FM" value={fmtSeconds(data.overtime_seconds)} />
                <Row label="Eksik" value={fmtSeconds(data.missing_seconds)} />
                <Row label="Toplam" value={fmtSeconds(data.total_seconds)} />
                <Row label="Mola" value={fmtSeconds(data.break_seconds)} />
                <Row label="Pot. Mola" value={fmtSeconds(data.potential_break_seconds)} />
                <Row label="Hastane" value={fmtSeconds(data.hospital_visit_seconds)} />
                <Row label="Durum" value={data.status || '-'} />
                <Row label="Kayit" value={data.record_count || 0} />
            </div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-700">{value}</span>
        </div>
    );
}

// ─── Full Recalculation Sub-components ──────────────────────────────────────

const SRC_COLORS = {
    CARD: 'bg-blue-100 text-blue-700',
    SPLIT: 'bg-orange-100 text-orange-700',
    AUTO_SPLIT: 'bg-amber-100 text-amber-700',
    DUTY: 'bg-green-100 text-green-700',
    MANUAL: 'bg-purple-100 text-purple-700',
    MANUAL_OT: 'bg-pink-100 text-pink-700',
    HEALTH_REPORT: 'bg-rose-100 text-rose-700',
    HOSPITAL_VISIT: 'bg-red-100 text-red-700',
    SYSTEM: 'bg-slate-100 text-slate-700',
    SPECIAL_LEAVE: 'bg-teal-100 text-teal-700',
};

function FrcRecordTable({ title, data, color }) {
    if (!data) return null;
    const borderCls = color === 'violet' ? 'border-violet-200' : 'border-gray-200';
    const bgCls = color === 'violet' ? 'bg-violet-50' : 'bg-gray-50';
    const titleCls = color === 'violet' ? 'text-violet-700' : 'text-gray-600';

    return (
        <div className={`border ${borderCls} ${bgCls} rounded-lg overflow-hidden`}>
            <div className={`px-2 py-1 text-[10px] font-bold uppercase ${titleCls} border-b ${borderCls}`}>
                {title} ({data.rc || 0} kayit)
            </div>
            {data.recs?.length > 0 ? (
                <table className="w-full text-[10px]">
                    <thead>
                        <tr className={`border-b ${borderCls} text-left text-gray-500`}>
                            <th className="py-0.5 px-1">Giris</th>
                            <th className="py-0.5 px-1">Cikis</th>
                            <th className="py-0.5 px-1">Kaynak</th>
                            <th className="py-0.5 px-1 text-right">Normal</th>
                            <th className="py-0.5 px-1 text-right">Mesai</th>
                            <th className="py-0.5 px-1 text-right">Eksik</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.recs.map((r, i) => (
                            <tr key={i} className={`border-b border-gray-100 ${r.ot ? 'bg-amber-50/50' : ''}`}>
                                <td className="py-0.5 px-1 font-mono">{r.ci || '-'}</td>
                                <td className="py-0.5 px-1 font-mono">{r.co || '-'}</td>
                                <td className="py-0.5 px-1">
                                    <span className={`px-1 py-0 rounded text-[8px] font-bold ${SRC_COLORS[r.src] || 'bg-gray-100 text-gray-700'}`}>
                                        {r.src}
                                    </span>
                                </td>
                                <td className="py-0.5 px-1 text-right font-mono">{fmtSeconds(r.ns)}</td>
                                <td className="py-0.5 px-1 text-right font-mono">{fmtSeconds(r.os)}</td>
                                <td className="py-0.5 px-1 text-right font-mono">{fmtSeconds(r.ms)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="p-2 text-[10px] text-gray-400 italic">Kayit yok</div>
            )}
            <div className={`px-2 py-1 border-t ${borderCls} text-[10px] font-bold flex justify-between`}>
                <span>Normal: {fmtSeconds(data.tn)}</span>
                <span>Mesai: {fmtSeconds(data.to)}</span>
                <span>Eksik: {fmtSeconds(data.tm)}</span>
            </div>
        </div>
    );
}

function FrcMonthlyField({ label, before, after }) {
    const diff = (after || 0) - (before || 0);
    if (before === after || (!before && !after)) return null;
    return (
        <div className="flex flex-col">
            <span className="text-gray-500 text-[9px]">{label}</span>
            <div className="flex items-center gap-1">
                <span className="text-gray-600">{fmtSeconds(before || 0)}</span>
                <span className="text-gray-400">&rarr;</span>
                <span className="font-bold text-indigo-700">{fmtSeconds(after || 0)}</span>
                {diff !== 0 && (
                    <span className={`text-[9px] font-bold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({diff > 0 ? '+' : ''}{fmtSeconds(Math.abs(diff))})
                    </span>
                )}
            </div>
        </div>
    );
}
