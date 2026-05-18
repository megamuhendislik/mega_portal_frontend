import React, { useState, useCallback, useEffect } from 'react';
import { Button, Tag, Tooltip } from 'antd';
import {
    SparklesIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon,
    BeakerIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

/**
 * AnalyticsFixAuditTab — Bu seansta + önceki seanslarda yapılan analytics
 * fix'lerinin canlıda doğru uygulandığını gösteren denetim sayfası.
 *
 * Backend: GET /api/system/health-check/analytics-fix-audit/
 *   Her test küçük bir in-memory senaryoyu çalıştırır; DB'ye yazmaz.
 *
 * Group'lar:
 *   - SLA İş Günü Hesabı (K1)
 *   - Anomaly Yüzdelik Dilim (A1)
 *   - Insights Servisi (I1)
 *   - Comparison Servisi (K3)
 *   - Weekly Limit Window (Y3)
 *   - Burnout Servisi (O6)
 *   - Debug TXT Audit (DBG)
 *   - Bilinen Sorun (KI) — açık iş listesi
 */
export default function AnalyticsFixAuditTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const runAudit = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/system/health-check/analytics-fix-audit/');
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Audit çalıştırılamadı');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { runAudit(); }, [runAudit]);

    const summary = data?.summary || {};

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-indigo-100 rounded-xl">
                            <BeakerIcon className="w-6 h-6 text-indigo-700" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Analytics Fix Audit</h2>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Bu yıl yapılan tüm analytics fix'lerinin canlı sistemde uygulanmış olduğunu doğrular.
                                Her test küçük in-memory senaryo — DB'ye yazmaz, production trafiğini etkilemez.
                            </p>
                            {data?.generated_at && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Son çalışma: {new Date(data.generated_at).toLocaleString('tr-TR')}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button
                        icon={<ArrowPathIcon className="w-4 h-4" />}
                        onClick={runAudit}
                        loading={loading}
                        type="primary"
                    >
                        Tekrar Çalıştır
                    </Button>
                </div>

                {/* Summary */}
                {data && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <SummaryTile
                            label="Toplam Test"
                            value={summary.total}
                            color="indigo"
                            icon={SparklesIcon}
                        />
                        <SummaryTile
                            label="Geçen"
                            value={summary.pass}
                            color="emerald"
                            icon={CheckCircleIcon}
                        />
                        <SummaryTile
                            label="Düşen"
                            value={summary.fail}
                            color="red"
                            icon={XCircleIcon}
                        />
                        <SummaryTile
                            label="Başarı Oranı"
                            value={`%${summary.pass_pct ?? 0}`}
                            color={summary.pass_pct >= 90 ? 'emerald' : summary.pass_pct >= 70 ? 'amber' : 'red'}
                            icon={BeakerIcon}
                        />
                    </div>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    ⚠ {error}
                </div>
            )}

            {/* Groups */}
            {data?.groups?.map((g, idx) => (
                <GroupCard key={idx} group={g} />
            ))}
        </div>
    );
}

function SummaryTile({ label, value, color, icon: Icon }) {
    const colorMap = {
        indigo: 'bg-white border-indigo-200 text-indigo-700',
        emerald: 'bg-white border-emerald-200 text-emerald-700',
        red: 'bg-white border-red-200 text-red-700',
        amber: 'bg-white border-amber-200 text-amber-700',
    };
    return (
        <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-black tabular-nums">{value ?? '—'}</div>
        </div>
    );
}

function GroupCard({ group }) {
    const allPass = group.fail === 0;
    return (
        <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${allPass ? 'border-emerald-200' : 'border-amber-200'}`}>
            <div className={`px-5 py-3 border-b flex items-center justify-between ${allPass ? 'bg-emerald-50/40' : 'bg-amber-50/40'}`}>
                <div className="flex items-center gap-2">
                    {allPass
                        ? <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                        : <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                    }
                    <h3 className="font-bold text-slate-800">{group.name}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <Tag color="green" className="!m-0">{group.pass} geçti</Tag>
                    {group.fail > 0 && <Tag color="red" className="!m-0">{group.fail} düştü</Tag>}
                    <Tag color="default" className="!m-0">{group.total} toplam</Tag>
                </div>
            </div>
            <div className="divide-y divide-slate-100">
                {group.tests.map((t, idx) => (
                    <TestRow key={idx} test={t} />
                ))}
            </div>
        </div>
    );
}

function TestRow({ test }) {
    return (
        <div className={`px-5 py-3 flex items-start gap-3 ${test.pass ? '' : 'bg-amber-50/30'}`}>
            <div className="flex-shrink-0 mt-0.5">
                {test.pass
                    ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                    : <XCircleIcon className="w-5 h-5 text-red-500" />
                }
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {test.fix_id}
                    </span>
                    <span className="text-sm font-bold text-slate-800">{test.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Beklenen:</span>
                        <div className="font-mono text-slate-700 mt-0.5 break-words">{test.expected}</div>
                    </div>
                    <div>
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Gerçek:</span>
                        <div className={`font-mono mt-0.5 break-words ${test.pass ? 'text-emerald-700' : 'text-red-700 font-bold'}`}>
                            {test.actual}
                        </div>
                    </div>
                </div>
                {test.note && (
                    <Tooltip title={test.note}>
                        <p className="text-[10px] text-slate-500 mt-1.5 italic flex items-start gap-1 cursor-help">
                            <SparklesIcon className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>{test.note}</span>
                        </p>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}
