import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight, Wrench, Users, Loader2, RefreshCw } from 'lucide-react';
import { message } from 'antd';
import api from '../../../services/api';
import ModalOverlay from '../../../components/ui/ModalOverlay';
import { getIstanbulTodayDate, getIstanbulToday } from '../../../utils/dateUtils';

export default function RequestAnalysisTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState(6);
    const [error, setError] = useState(null);
    const [expandedSection, setExpandedSection] = useState(null);

    // Yaşam Döngüsü Analizi state'leri
    const [lifecycleData, setLifecycleData] = useState(null);
    const [lifecycleLoading, setLifecycleLoading] = useState(false);
    const [lifecycleError, setLifecycleError] = useState(null);
    const [lcDateFrom, setLcDateFrom] = useState(() => {
        const d = getIstanbulTodayDate(); d.setDate(d.getDate() - 30);
        return d.toLocaleDateString('en-CA');
    });
    const [lcDateTo, setLcDateTo] = useState(() => getIstanbulToday());
    const [lcRequestType, setLcRequestType] = useState('ALL');
    const [lcIssuesOnly, setLcIssuesOnly] = useState(false);
    const [lcSearch, setLcSearch] = useState('');
    const [lcExpandedId, setLcExpandedId] = useState(null);
    const [lcExpandAll, setLcExpandAll] = useState(false);

    // OT Fragment fix state'leri
    const [otFixLoading, setOtFixLoading] = useState({});
    const [otFixResults, setOtFixResults] = useState({});

    // Toplu Düzelt state'leri
    const [bulkFixLoading, setBulkFixLoading] = useState(false);
    const [bulkFixReport, setBulkFixReport] = useState(null);
    const [showFixConfirm, setShowFixConfirm] = useState(false);

    // Per-row yönetici seçimi (NO_APPROVER fix)
    const [selectedFixApprover, setSelectedFixApprover] = useState({});
    const [autoApprove, setAutoApprove] = useState(false);

    // Çalışan Bazlı Analiz
    const [showEmployeeAnalysis, setShowEmployeeAnalysis] = useState(false);
    const [empAnalysisFilter, setEmpAnalysisFilter] = useState('all'); // all, with_issues, unclaimed, no_requests

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/request-analytics/comprehensive/?range=${range}`);
            setData(res.data);
        } catch (e) {
            setError(e.response?.data?.error || 'Veri yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchLifecycle = async () => {
        setLifecycleLoading(true);
        setLifecycleError(null);
        try {
            const res = await api.post('/system/health-check/request-lifecycle-audit/', {
                date_from: lcDateFrom,
                date_to: lcDateTo,
                request_type: lcRequestType,
                issues_only: lcIssuesOnly,
            });
            setLifecycleData(res.data);
        } catch (e) {
            setLifecycleError(e.response?.data?.error || 'Hata oluştu');
        } finally {
            setLifecycleLoading(false);
        }
    };

    const performBulkFix = async () => {
        setShowFixConfirm(false);
        setBulkFixLoading(true);
        setBulkFixReport(null);
        try {
            const res = await api.post('/system/health-check/request-lifecycle-bulk-fix/', {
                date_from: lcDateFrom,
                date_to: lcDateTo,
                request_type: lcRequestType,
                auto_approve: autoApprove,
            });
            setBulkFixReport(res.data);
            // Düzeltme sonrası tekrar tara
            fetchLifecycle();
        } catch (e) {
            setBulkFixReport({ error: e.response?.data?.error || 'Toplu düzeltme hatası' });
        } finally {
            setBulkFixLoading(false);
        }
    };

    const handleSingleFix = async (requestId, approverId, approve = false) => {
        try {
            await api.post('/system/health-check/request-lifecycle-bulk-fix/', {
                date_from: lcDateFrom,
                date_to: lcDateTo,
                request_type: lcRequestType,
                request_ids: [requestId],
                issue_codes: ['NO_APPROVER'],
                target_approver_map: [{ request_id: requestId, approver_id: approverId }],
                auto_approve: approve,
            });
            message.success(approve ? 'Yönetici atandı ve onaylandı' : 'Yönetici atandı');
            fetchLifecycle();
        } catch (err) {
            message.error('Yönetici atanamadı');
        }
    };

    const handleOtFragmentFix = async (requestId, issueCode) => {
        setOtFixLoading(prev => ({ ...prev, [requestId]: true }));
        try {
            const res = await api.post('/system/health-check/ot-fragment-fix/', {
                request_id: requestId,
                issue_code: issueCode,
            });
            setOtFixResults(prev => ({ ...prev, [requestId]: res.data }));
            message.success(
                res.data?.action_log?.[0]?.message || 'Düzeltildi'
            );
            setTimeout(() => fetchLifecycle(), 1000);
        } catch (err) {
            message.error(err.response?.data?.error || 'Düzeltme hatası');
        } finally {
            setOtFixLoading(prev => ({ ...prev, [requestId]: false }));
        }
    };

    const fixableCount = lifecycleData
        ? (lifecycleData.summary?.issue_breakdown?.no_notification || 0) +
          (lifecycleData.summary?.issue_breakdown?.no_approver || 0) +
          (lifecycleData.summary?.issue_breakdown?.wrong_approver || 0) +
          (lifecycleData.summary?.issue_breakdown?.inactive_approver || 0) +
          (lifecycleData.summary?.issue_breakdown?.stale_pending || 0) +
          (lifecycleData.summary?.issue_breakdown?.ghost_approval || 0) +
          (lifecycleData.summary?.issue_breakdown?.duplicate_request || 0) +
          (lifecycleData.summary?.issue_breakdown?.cross_path_duplicate || 0)
        : 0;

    const exportLifecycleTxt = () => {
        if (!lifecycleData) return;
        const lines = [];
        const s = lifecycleData.summary;
        lines.push('=== TALEP YAŞAM DÖNGÜSÜ ANALİZİ ===');
        lines.push(`Tarih: ${lcDateFrom} → ${lcDateTo}`);
        lines.push(`Toplam: ${s.total} | Sorunlu: ${s.with_issues}`);
        const totalDup = (s.issue_breakdown.duplicate_request || 0) + (s.issue_breakdown.cross_path_duplicate || 0);
        lines.push(`Yön.Yok: ${s.issue_breakdown.no_approver} | Pasif Yön: ${s.issue_breakdown.inactive_approver} | Bld.Yok: ${s.issue_breakdown.no_notification} | Görünmez: ${s.issue_breakdown.not_visible} | Eski PEND: ${s.issue_breakdown.stale_pending} | Yanlış Yön: ${s.issue_breakdown.wrong_approver} | Çoklu PRIMARY: ${s.issue_breakdown.multi_primary_no_selection} | Hayalet Onay: ${s.issue_breakdown.ghost_approval || 0} | Duplikat: ${totalDup}`);
        lines.push('');

        // Duplikat grup detayı
        if (s.duplicate_groups?.length > 0) {
            lines.push('=== DUPLİKAT GRUPLARI ===');
            for (const g of s.duplicate_groups) {
                lines.push(`  ${g.employee_name} | ${g.date} | ${g.type} | ${g.total} kayıt`);
                lines.push(`    ✓ Korunacak: ID:${g.keep_id} (${g.keep_duration}, ${g.keep_status})`);
                for (const d of g.duplicates) {
                    lines.push(`    ✗ Silinecek: ID:${d.id} (${d.duration}, ${d.status})`);
                }
            }
            lines.push('');
        }

        lines.push('─'.repeat(120));

        for (const req of lifecycleData.requests) {
            const issues = (req.issues || []).map(i => `[${i.severity}] ${i.code}: ${i.description}`).join(' | ');
            lines.push('');
            lines.push(`#${req.id} | ${req.type} | ${req.employee_name} | ${req.date} | ${req.status} | Süre: ${req.duration_display || '-'} | Kaynak: ${req.source_type || '-'}`);
            lines.push(`  Yönetici: ${req.target_approver ? `${req.target_approver.name} (${req.target_approver.relationship || '?'}) ${req.target_approver.is_active === false ? '[PASİF]' : ''}` : 'ATANMAMIŞ'}`);
            lines.push(`  Bildirim: ${req.notification?.sent === true ? `Gönderildi (${req.notification.sent_at || ''}) ${req.notification.is_read ? '[Okundu]' : '[Okunmadı]'}` : req.notification?.sent === false ? 'GÖNDERİLMEMİŞ' : '-'}`);
            lines.push(`  Görünürlük: ${req.visibility?.in_pending_approvals === true ? 'Görünür' : req.visibility?.in_pending_approvals === false ? `GÖRÜNMÜYOR — ${req.visibility.reason || ''}` : '-'}`);
            if (req.approval_info?.approved_by) {
                lines.push(`  Onay/Red: ${req.approval_info.approved_by} (${req.approval_info.approved_at || ''}) ${req.approval_info.rejection_reason ? `Sebep: ${req.approval_info.rejection_reason}` : ''}`);
            }
            lines.push(`  Oluşturulma: ${req.created_at ? new Date(req.created_at).toLocaleString('tr-TR') : '-'}`);
            if (issues) lines.push(`  SORUNLAR: ${issues}`);
        }

        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `talep-yasam-dongusu-${lcDateFrom}-${lcDateTo}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleSection = (key) => {
        setExpandedSection(prev => prev === key ? null : key);
    };

    const fmtHour = (hours) => {
        if (!hours) return '0:00';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}:${String(m).padStart(2, '0')}`;
    };

    if (loading && !data) {
        return (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-sm text-gray-500">Talep analizi yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl shadow-sm border p-8">
                <div className="text-center">
                    <p className="text-red-600 font-medium mb-2">Hata</p>
                    <p className="text-sm text-gray-500">{error}</p>
                    <button onClick={fetchData} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Backend response structure:
    // overview: { total_requests, by_type: {leave:{total,pending,approved,rejected}, overtime, meal, cardless}, approval_rate, total_overtime_hours, total_leave_days, avg_response_hours }
    // monthly_trend: [{ month:"2025-09", label:"Eylül 2025", leave, overtime, meal, cardless, total, overtime_hours, leave_days }]
    // department_breakdown: [{ name, employee_count, total, approved, leave, overtime, meal, cardless, overtime_hours, leave_days }]
    // employee_breakdown: [{ id, name, department, role, total, approved, leave, overtime, meal, cardless, overtime_hours, leave_days }]
    // weekly_pattern: [{ day:"Pazartesi", day_short:"Paz", leave, overtime, meal, cardless, total }]
    // overtime_sources: { intended, potential, manual }
    // leave_types: [{ name, count, approved, total_days }]
    // indirect_analysis: { subordinate_managers, total_indirect_requests }

    const ov = data.overview || {};
    const byType = ov.by_type || {};
    const totalAll = ov.total_requests || 0;
    const approvalRate = ov.approval_rate ?? 0;

    // Pending count from by_type
    const totalPending = Object.values(byType).reduce((s, v) => s + (v?.pending || 0), 0);
    const totalApproved = Object.values(byType).reduce((s, v) => s + (v?.approved || 0), 0);
    const totalRejected = Object.values(byType).reduce((s, v) => s + (v?.rejected || 0), 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Talep Analizi</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {data.requester?.name && <span className="font-medium">{data.requester.name}</span>}
                        {data.requester?.managed_count > 0 && <span> — {data.requester.managed_count} personel kapsamında</span>}
                        {data.period && <span> | {data.period.start} → {data.period.end}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={range}
                        onChange={(e) => setRange(Number(e.target.value))}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50"
                    >
                        <option value={3}>Son 3 Ay</option>
                        <option value={6}>Son 6 Ay</option>
                        <option value={12}>Son 12 Ay</option>
                        <option value={24}>Son 24 Ay</option>
                    </select>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Yükleniyor...' : 'Yenile'}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard label="Toplam Talep" value={totalAll} color="blue" />
                <KpiCard label="Bekleyen" value={totalPending} color="amber" />
                <KpiCard label="Onaylanan" value={totalApproved} color="green" />
                <KpiCard label="Reddedilen" value={totalRejected} color="red" />
                <KpiCard label="Onay Oranı" value={`%${approvalRate}`} color="indigo" />
            </div>

            {/* Type Breakdown */}
            {Object.keys(byType).length > 0 && (
                <Section title="Talep Türü Dağılımı" sectionKey="types" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <TypeCard title="İzin" data={byType.leave} color="purple" />
                        <TypeCard title="Fazla Mesai" data={byType.overtime} color="amber" />
                        <TypeCard title="Yemek" data={byType.meal} color="emerald" />
                        <TypeCard title="Kartsız Giriş" data={byType.cardless} color="blue" />
                    </div>
                </Section>
            )}

            {/* Extra Stats */}
            {(ov.total_overtime_hours > 0 || ov.total_leave_days > 0 || ov.avg_response_hours) && (
                <Section title="Özet İstatistikler" sectionKey="stats" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-3 gap-3">
                        <StatBox label="Onaylı Ek Mesai" value={fmtHour(ov.total_overtime_hours)} />
                        <StatBox label="Onaylı İzin" value={`${ov.total_leave_days || 0} gün`} />
                        <StatBox label="Ort. Yanıt Süresi" value={ov.avg_response_hours != null ? `${ov.avg_response_hours} saat` : '-'} />
                    </div>
                </Section>
            )}

            {/* Overtime Sources */}
            {data.overtime_sources && (
                <Section title="Ek Mesai Kaynak Dağılımı" sectionKey="ot_src" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-3 gap-3">
                        <StatBox label="Planlı (Atama)" value={data.overtime_sources.intended || 0} />
                        <StatBox label="Algılanan (Potansiyel)" value={data.overtime_sources.potential || 0} />
                        <StatBox label="Manuel Giriş" value={data.overtime_sources.manual || 0} />
                    </div>
                </Section>
            )}

            {/* Leave Types */}
            {data.leave_types && data.leave_types.length > 0 && (
                <Section title="İzin Türü Dağılımı" sectionKey="leave_types" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">İzin Türü</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-600">Onaylı</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-blue-600">Toplam Gün</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.leave_types.map((lt, i) => (
                                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-700">{lt.name}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{lt.count}</td>
                                        <td className="px-3 py-2 text-center text-green-700">{lt.approved}</td>
                                        <td className="px-3 py-2 text-center text-blue-700">{lt.total_days || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Monthly Trend */}
            {data.monthly_trend && data.monthly_trend.length > 0 && (
                <Section title="Aylık Trend" sectionKey="trend" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Ay</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-purple-600">İzin</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemek</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-blue-600">Kartsız</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-700">Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.monthly_trend.map((m, i) => (
                                    <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${m.total > 0 ? '' : 'opacity-50'}`}>
                                        <td className="px-3 py-2 font-medium text-gray-700">{m.label || m.month}</td>
                                        <td className="px-3 py-2 text-center text-purple-700">{m.leave || 0}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{m.overtime || 0}</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{m.meal || 0}</td>
                                        <td className="px-3 py-2 text-center text-blue-700">{m.cardless || 0}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{m.total || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Department Breakdown */}
            {data.department_breakdown && data.department_breakdown.length > 0 && (
                <Section title="Departman Kırılımı" sectionKey="dept" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Departman</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Çalışan</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-600">Onaylı</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-purple-600">İzin</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemek</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.department_breakdown.map((d, i) => (
                                    <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${d.total > 0 ? '' : 'opacity-40'}`}>
                                        <td className="px-3 py-2 font-medium text-gray-700">{d.name || 'Departmansız'}</td>
                                        <td className="px-3 py-2 text-center text-gray-500">{d.employee_count || 0}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{d.total || 0}</td>
                                        <td className="px-3 py-2 text-center text-green-700">{d.approved || 0}</td>
                                        <td className="px-3 py-2 text-center text-purple-700">{d.leave || 0}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{d.overtime || 0}</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{d.meal || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Role Breakdown */}
            {data.role_breakdown && data.role_breakdown.length > 0 && (
                <Section title="Pozisyon Kırılımı" sectionKey="role" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Pozisyon</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Çalışan</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-purple-600">İzin</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemek</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.role_breakdown.map((r, i) => (
                                    <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${r.total > 0 ? '' : 'opacity-40'}`}>
                                        <td className="px-3 py-2 font-medium text-gray-700">{r.role || 'Pozisyonsuz'}</td>
                                        <td className="px-3 py-2 text-center text-gray-500">{r.employee_count || 0}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{r.total || 0}</td>
                                        <td className="px-3 py-2 text-center text-purple-700">{r.leave || 0}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{r.overtime || 0}</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{r.meal || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Employee Breakdown */}
            {data.employee_breakdown && data.employee_breakdown.length > 0 && (
                <Section title="Personel Kırılımı" sectionKey="emp" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Personel</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Departman</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-purple-600">İzin</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemek</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-blue-600">Kartsız</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.employee_breakdown.map((e, i) => (
                                    <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${e.total > 0 ? '' : 'opacity-40'}`}>
                                        <td className="px-3 py-2 font-medium text-gray-700">{e.name}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{e.department || '-'}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{e.total || 0}</td>
                                        <td className="px-3 py-2 text-center text-purple-700">{e.leave || 0}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{e.overtime || 0}</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{e.meal || 0}</td>
                                        <td className="px-3 py-2 text-center text-blue-700">{e.cardless || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Indirect Analysis (Subordinate Managers) */}
            {data.indirect_analysis?.subordinate_managers?.length > 0 && (
                <Section title={`Dolaylı Yönetici Analizi (${data.indirect_analysis.total_indirect_requests} talep)`} sectionKey="indirect" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Yönetici</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Departman</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Ekip</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Gelen</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-600">Onaylı</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-red-600">Reddedilen</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Bekleyen</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-indigo-600">Onay %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.indirect_analysis.subordinate_managers.map((mgr, i) => (
                                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-700">{mgr.name}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{mgr.department || '-'}</td>
                                        <td className="px-3 py-2 text-center text-gray-500">{mgr.direct_reports}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{mgr.requests_received}</td>
                                        <td className="px-3 py-2 text-center text-green-700">{mgr.approved}</td>
                                        <td className="px-3 py-2 text-center text-red-700">{mgr.rejected}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{mgr.pending}</td>
                                        <td className="px-3 py-2 text-center text-indigo-700 font-medium">%{mgr.approval_rate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Weekly Pattern */}
            {data.weekly_pattern && data.weekly_pattern.length > 0 && (
                <Section title="Haftalık Dağılım" sectionKey="weekly" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-7 gap-2">
                        {data.weekly_pattern.map((w, i) => {
                            const maxTotal = Math.max(...data.weekly_pattern.map(x => x.total || 0), 1);
                            const intensity = Math.round((w.total / maxTotal) * 100);
                            return (
                                <div key={i} className="text-center p-3 rounded-lg border border-gray-100" style={{ backgroundColor: `rgba(59, 130, 246, ${intensity / 300})` }}>
                                    <div className="text-xs font-semibold text-gray-600 mb-1">{w.day}</div>
                                    <div className="text-lg font-bold text-gray-800">{w.total || 0}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">talep</div>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {/* Assignment Stats */}
            {data.assignment_stats && data.assignment_stats.total > 0 && (
                <Section title="Ek Mesai Atama İstatistikleri" sectionKey="assign" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatBox label="Toplam Atama" value={data.assignment_stats.total} />
                        <StatBox label="Atandı" value={data.assignment_stats.assigned} />
                        <StatBox label="Talep Edildi" value={data.assignment_stats.claimed} />
                        <StatBox label="Süresi Doldu" value={data.assignment_stats.expired} />
                        <StatBox label="İptal" value={data.assignment_stats.cancelled} />
                    </div>
                </Section>
            )}

            {/* OT-Meal Correlation */}
            {data.overtime_meal_correlation && data.overtime_meal_correlation.length > 0 && (
                <Section title="Ek Mesai — Yemek Korelasyonu" sectionKey="ot_meal" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Personel</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai Gün</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai Saat</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemekli Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-red-600">Mesaisiz Yemek</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam Yemek</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.overtime_meal_correlation.map((c, i) => (
                                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-700">{c.name}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{c.overtime_days}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{c.overtime_hours} sa</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{c.meal_with_ot}</td>
                                        <td className="px-3 py-2 text-center text-red-700">{c.meal_without_ot}</td>
                                        <td className="px-3 py-2 text-center text-gray-800 font-bold">{c.total_meals}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Raw JSON Debug (collapsed) */}
            <Section title="Ham Veri (Debug)" sectionKey="debug" expanded={expandedSection} toggle={toggleSection}>
                <pre className="text-[10px] text-gray-500 bg-gray-50 p-3 rounded-lg overflow-auto max-h-[300px] whitespace-pre-wrap">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </Section>

            {/* ── Talep Yaşam Döngüsü Analizi ── */}
            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    Talep Yaşam Döngüsü Analizi
                </h2>

                {/* Filtreler */}
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Başlangıç</label>
                        <input type="date" value={lcDateFrom} onChange={e => setLcDateFrom(e.target.value)}
                            className="px-2 py-1.5 border rounded-lg text-xs" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Bitiş</label>
                        <input type="date" value={lcDateTo} onChange={e => setLcDateTo(e.target.value)}
                            className="px-2 py-1.5 border rounded-lg text-xs" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Tür</label>
                        <select value={lcRequestType} onChange={e => setLcRequestType(e.target.value)}
                            className="px-2 py-1.5 border rounded-lg text-xs">
                            <option value="ALL">Hepsi</option>
                            <option value="OVERTIME">Ek Mesai</option>
                            <option value="LEAVE">İzin</option>
                            <option value="CARDLESS_ENTRY">Kartsız Giriş</option>
                            <option value="HEALTH_REPORT">Sağlık Raporu</option>
                        </select>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={lcIssuesOnly} onChange={e => setLcIssuesOnly(e.target.checked)}
                            className="rounded" />
                        Sadece sorunlu
                    </label>
                    <button onClick={fetchLifecycle} disabled={lifecycleLoading}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50">
                        {lifecycleLoading ? 'Taranıyor...' : 'Tara'}
                    </button>
                </div>

                {lifecycleError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{lifecycleError}</div>
                )}

                {lifecycleData && (
                    <>
                        {/* Özet kartları */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-14 gap-2">
                            <SummaryBadge label="Toplam" count={lifecycleData.summary.total} color="slate" />
                            <SummaryBadge label="Potansiyel" count={lifecycleData.summary.by_status?.POTENTIAL || 0} color="purple" />
                            <SummaryBadge label="Sorunlu" count={lifecycleData.summary.with_issues} color="red" />
                            <SummaryBadge label="Yön. Yok" count={lifecycleData.summary.issue_breakdown.no_approver} color="rose" />
                            <SummaryBadge label="Pasif Yön." count={lifecycleData.summary.issue_breakdown.inactive_approver} color="orange" />
                            <SummaryBadge label="Bld. Yok" count={lifecycleData.summary.issue_breakdown.no_notification} color="amber" />
                            <SummaryBadge label="Görünmez" count={lifecycleData.summary.issue_breakdown.not_visible} color="purple" />
                            <SummaryBadge label="Eski PEND" count={lifecycleData.summary.issue_breakdown.stale_pending} color="yellow" />
                            <SummaryBadge label="Hayalet Onay" count={lifecycleData.summary.issue_breakdown.ghost_approval || 0} color="red" />
                            <SummaryBadge label="Duplikat" count={(lifecycleData.summary.issue_breakdown.duplicate_request || 0) + (lifecycleData.summary.issue_breakdown.cross_path_duplicate || 0)} color="rose" />
                            <SummaryBadge label="Frag. POT" count={lifecycleData.summary.issue_breakdown?.ot_fragment_potential || 0} color="orange" />
                            <SummaryBadge label="Frag. PEND" count={lifecycleData.summary.issue_breakdown?.ot_fragment_pending || 0} color="red" />
                            <SummaryBadge label="Frag. APPR" count={lifecycleData.summary.issue_breakdown?.ot_fragment_approved || 0} color="rose" />
                            <SummaryBadge label="Yanlış Saat" count={lifecycleData.summary.issue_breakdown?.ot_wrong_start_time || 0} color="red" />
                        </div>

                        {/* Duplikat Grup Detayı */}
                        {(lifecycleData.summary.duplicate_groups?.length > 0) && (
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                                <div className="text-xs font-bold text-rose-700 mb-2">Duplikat Grupları ({lifecycleData.summary.duplicate_groups.length} grup, {(lifecycleData.summary.issue_breakdown.duplicate_request || 0) + (lifecycleData.summary.issue_breakdown.cross_path_duplicate || 0)} fazlalık)</div>
                                <div className="space-y-2">
                                    {lifecycleData.summary.duplicate_groups.map((g, i) => (
                                        <div key={i} className="bg-white rounded p-2 border border-rose-100 text-xs">
                                            <div className="font-semibold text-slate-700">
                                                {g.employee_name} — {g.date} — {g.type} — {g.total} kayıt
                                            </div>
                                            <div className="text-emerald-600 mt-1">
                                                ✓ Korunacak: ID:{g.keep_id} ({g.keep_duration}, {g.keep_status})
                                            </div>
                                            <div className="text-rose-600 mt-0.5">
                                                {g.duplicates.map((d, j) => (
                                                    <span key={j} className="inline-block mr-2">
                                                        ✗ ID:{d.id} ({d.duration}, {d.status})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Çalışan Bazlı Analiz */}
                        {lifecycleData.per_employee?.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setShowEmployeeAnalysis(p => !p)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Users size={15} className="text-indigo-600" />
                                        <span className="text-xs font-bold text-indigo-800">
                                            Çalışan Bazlı Analiz ({lifecycleData.per_employee.length} kişi)
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-200 text-indigo-700 rounded-full font-bold">
                                            {lifecycleData.per_employee.filter(e => e.with_issues > 0).length} sorunlu
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 text-amber-700 rounded-full font-bold">
                                            {lifecycleData.per_employee.filter(e => e.unclaimed_potentials > 0).length} talep edilmemiş OT
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold">
                                            {lifecycleData.per_employee.filter(e => e.total === 0 && e.unclaimed_potentials === 0).length} hiç talebi yok
                                        </span>
                                    </div>
                                    {showEmployeeAnalysis ? <ChevronDown size={16} className="text-indigo-500" /> : <ChevronRight size={16} className="text-indigo-500" />}
                                </button>
                                {showEmployeeAnalysis && (
                                    <div className="p-3 space-y-2 bg-white">
                                        {/* Filtreler */}
                                        <div className="flex gap-1.5 flex-wrap">
                                            {[
                                                { key: 'all', label: 'Tümü', count: lifecycleData.per_employee.length },
                                                { key: 'with_issues', label: 'Sorunlu', count: lifecycleData.per_employee.filter(e => e.with_issues > 0).length },
                                                { key: 'unclaimed', label: 'Talep Edilmemiş OT', count: lifecycleData.per_employee.filter(e => e.unclaimed_potentials > 0).length },
                                                { key: 'no_requests', label: 'Hiç Talebi Yok', count: lifecycleData.per_employee.filter(e => e.total === 0 && e.unclaimed_potentials === 0).length },
                                            ].map(f => (
                                                <button
                                                    key={f.key}
                                                    onClick={() => setEmpAnalysisFilter(f.key)}
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                                                        empAnalysisFilter === f.key
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {f.label} ({f.count})
                                                </button>
                                            ))}
                                        </div>

                                        {/* Tablo */}
                                        <div className="overflow-auto max-h-[400px] border rounded-lg">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-50 sticky top-0 z-10">
                                                    <tr className="text-left text-[10px] font-bold text-slate-500 uppercase">
                                                        <th className="px-2 py-2">Personel</th>
                                                        <th className="px-2 py-2">Departman</th>
                                                        <th className="px-2 py-2 text-center">Toplam</th>
                                                        <th className="px-2 py-2 text-center">Ek Mesai</th>
                                                        <th className="px-2 py-2 text-center">İzin</th>
                                                        <th className="px-2 py-2 text-center">Kartsız</th>
                                                        <th className="px-2 py-2 text-center">Sağlık R.</th>
                                                        <th className="px-2 py-2 text-center">Bekleyen</th>
                                                        <th className="px-2 py-2 text-center">Onaylanan</th>
                                                        <th className="px-2 py-2 text-center">Sorunlu</th>
                                                        <th className="px-2 py-2 text-center">Talep Edilmemiş OT</th>
                                                        <th className="px-2 py-2">Sorun Kodları</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {lifecycleData.per_employee
                                                        .filter(emp => {
                                                            if (empAnalysisFilter === 'with_issues') return emp.with_issues > 0;
                                                            if (empAnalysisFilter === 'unclaimed') return emp.unclaimed_potentials > 0;
                                                            if (empAnalysisFilter === 'no_requests') return emp.total === 0 && emp.unclaimed_potentials === 0;
                                                            return true;
                                                        })
                                                        .map(emp => {
                                                            const potMin = emp.unclaimed_potential_minutes || 0;
                                                            const potH = Math.floor(potMin / 60);
                                                            const potM = potMin % 60;
                                                            const potDisplay = potMin > 0 ? `${emp.unclaimed_potentials} adet (${potH > 0 ? potH + ' sa ' : ''}${potM} dk)` : '—';
                                                            const hasIssue = emp.with_issues > 0;
                                                            const hasUnclaimed = emp.unclaimed_potentials > 0;
                                                            const noRequests = emp.total === 0 && !hasUnclaimed;
                                                            const rowBg = hasIssue ? 'bg-red-50' : hasUnclaimed ? 'bg-amber-50' : noRequests ? 'bg-slate-50' : '';

                                                            return (
                                                                <tr
                                                                    key={emp.employee_id}
                                                                    className={`${rowBg} hover:bg-indigo-50 cursor-pointer transition-colors`}
                                                                    onClick={() => { setLcSearch(emp.employee_name); setShowEmployeeAnalysis(false); }}
                                                                    title="Tıklayınca bu çalışanın taleplerini filtreler"
                                                                >
                                                                    <td className="px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap">{emp.employee_name}</td>
                                                                    <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{emp.department || '—'}</td>
                                                                    <td className="px-2 py-1.5 text-center font-bold">{emp.total || '—'}</td>
                                                                    <td className="px-2 py-1.5 text-center">{emp.by_type?.OVERTIME || '—'}</td>
                                                                    <td className="px-2 py-1.5 text-center">{emp.by_type?.LEAVE || '—'}</td>
                                                                    <td className="px-2 py-1.5 text-center">{emp.by_type?.CARDLESS_ENTRY || '—'}</td>
                                                                    <td className="px-2 py-1.5 text-center">{emp.by_type?.HEALTH_REPORT || '—'}</td>
                                                                    <td className="px-2 py-1.5 text-center">
                                                                        {(emp.by_status?.PENDING || 0) > 0
                                                                            ? <span className="text-amber-600 font-bold">{emp.by_status.PENDING}</span>
                                                                            : '—'}
                                                                    </td>
                                                                    <td className="px-2 py-1.5 text-center">
                                                                        {(emp.by_status?.APPROVED || 0) > 0
                                                                            ? <span className="text-emerald-600 font-bold">{emp.by_status.APPROVED}</span>
                                                                            : '—'}
                                                                    </td>
                                                                    <td className="px-2 py-1.5 text-center">
                                                                        {hasIssue
                                                                            ? <span className="text-red-600 font-bold">{emp.with_issues}</span>
                                                                            : '—'}
                                                                    </td>
                                                                    <td className="px-2 py-1.5 text-center">
                                                                        {hasUnclaimed
                                                                            ? <span className="text-amber-600 font-bold">{potDisplay}</span>
                                                                            : '—'}
                                                                    </td>
                                                                    <td className="px-2 py-1.5">
                                                                        <div className="flex flex-wrap gap-0.5">
                                                                            {emp.issue_codes?.map(code => (
                                                                                <span key={code} className="px-1 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold whitespace-nowrap">
                                                                                    {code}
                                                                                </span>
                                                                            ))}
                                                                            {hasUnclaimed && (
                                                                                <span className="px-1 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold whitespace-nowrap">
                                                                                    UNCLAIMED_OT
                                                                                </span>
                                                                            )}
                                                                            {noRequests && (
                                                                                <span className="px-1 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold whitespace-nowrap">
                                                                                    NO_REQUESTS
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Arama + Aksiyonlar */}
                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" value={lcSearch} onChange={e => setLcSearch(e.target.value)}
                                    placeholder="Çalışan adı veya talep ID ile ara..."
                                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs" />
                            </div>
                            <button onClick={() => setLcExpandAll(p => !p)}
                                className="px-3 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 whitespace-nowrap">
                                {lcExpandAll ? 'Tümünü Kapat' : 'Tümünü Aç'}
                            </button>
                            <button onClick={exportLifecycleTxt}
                                className="px-3 py-2 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-800 whitespace-nowrap">
                                TXT İndir
                            </button>
                            {fixableCount > 0 && (
                                <button
                                    onClick={() => setShowFixConfirm(true)}
                                    disabled={bulkFixLoading}
                                    className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
                                >
                                    <Wrench size={13} />
                                    {bulkFixLoading ? 'Düzeltiliyor...' : `Toplu Düzelt (${fixableCount})`}
                                </button>
                            )}
                            {lifecycleData && Object.keys(otFixResults).length > 0 && (
                                <button
                                    onClick={() => { setOtFixResults({}); fetchLifecycle(); }}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 whitespace-nowrap"
                                >
                                    <RefreshCw size={12} /> Tekrar Denetle
                                </button>
                            )}
                        </div>

                        {/* Talep Listesi */}
                        <div className="space-y-1 max-h-[600px] overflow-y-auto">
                            {lifecycleData.requests
                                .filter(r => {
                                    if (!lcSearch) return true;
                                    const s = lcSearch.toLowerCase();
                                    return r.employee_name?.toLowerCase().includes(s) ||
                                        String(r.id).includes(s);
                                })
                                .map(req => (
                                    <LifecycleRow
                                        key={`${req.type}-${req.id}`}
                                        req={req}
                                        expanded={lcExpandAll || lcExpandedId === `${req.type}-${req.id}`}
                                        onToggle={() => setLcExpandedId(prev =>
                                            prev === `${req.type}-${req.id}` ? null : `${req.type}-${req.id}`
                                        )}
                                        selectedFixApprover={selectedFixApprover}
                                        setSelectedFixApprover={setSelectedFixApprover}
                                        handleSingleFix={handleSingleFix}
                                        otFixLoading={otFixLoading}
                                        otFixResults={otFixResults}
                                        handleOtFragmentFix={handleOtFragmentFix}
                                    />
                                ))
                            }
                            {lifecycleData.requests.length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    Seçili kriterlere uygun talep bulunamadı.
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Onay Modalı */}
                <ModalOverlay open={showFixConfirm} onClose={() => setShowFixConfirm(false)}>
                        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Wrench size={20} className="text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Toplu Düzeltme Onayı</h3>
                                    <p className="text-xs text-gray-500">{lcDateFrom} → {lcDateTo}</p>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
                                <p className="text-amber-800 font-medium mb-2">
                                    {fixableCount} düzeltilebilir sorun tespit edildi:
                                </p>
                                <ul className="text-xs text-amber-700 space-y-1">
                                    {(lifecycleData?.summary?.issue_breakdown?.no_notification || 0) > 0 && (
                                        <li>• Bildirim gönderilmemiş: <b>{lifecycleData.summary.issue_breakdown.no_notification}</b> talep → bildirim gönderilecek</li>
                                    )}
                                    {(lifecycleData?.summary?.issue_breakdown?.no_approver || 0) > 0 && (
                                        <li>• Onaylayıcı yok: <b>{lifecycleData.summary.issue_breakdown.no_approver}</b> talep → yönetici atanacak</li>
                                    )}
                                    {(lifecycleData?.summary?.issue_breakdown?.wrong_approver || 0) > 0 && (
                                        <li>• Yanlış yönetici: <b>{lifecycleData.summary.issue_breakdown.wrong_approver}</b> talep → doğru yönetici atanacak</li>
                                    )}
                                    {(lifecycleData?.summary?.issue_breakdown?.inactive_approver || 0) > 0 && (
                                        <li>• Pasif yönetici: <b>{lifecycleData.summary.issue_breakdown.inactive_approver}</b> talep → aktif yönetici atanacak</li>
                                    )}
                                    {(lifecycleData?.summary?.issue_breakdown?.ghost_approval || 0) > 0 && (
                                        <li>• Hayalet onay: <b>{lifecycleData.summary.issue_breakdown.ghost_approval}</b> talep → onaylayan yönetici atanacak</li>
                                    )}
                                    {(lifecycleData?.summary?.issue_breakdown?.stale_pending || 0) > 0 && (
                                        <li>• Eski PENDING: <b>{lifecycleData.summary.issue_breakdown.stale_pending}</b> talep → hatırlatma gönderilecek</li>
                                    )}
                                    {((lifecycleData?.summary?.issue_breakdown?.duplicate_request || 0) + (lifecycleData?.summary?.issue_breakdown?.cross_path_duplicate || 0)) > 0 && (
                                        <li>• Duplikat: <b>{(lifecycleData.summary.issue_breakdown.duplicate_request || 0) + (lifecycleData.summary.issue_breakdown.cross_path_duplicate || 0)}</b> talep → fazlalıklar CANCELLED yapılacak</li>
                                    )}
                                </ul>
                            </div>

                            {(lifecycleData?.summary?.issue_breakdown?.no_approver || 0) > 0 && (
                                <label className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoApprove}
                                        onChange={e => setAutoApprove(e.target.checked)}
                                        className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-emerald-800">Yönetici atandıktan sonra otomatik onayla</span>
                                        <p className="text-[10px] text-emerald-600">PENDING OT talepleri onaylanır + günlük/aylık hedefler güncellenir</p>
                                    </div>
                                </label>
                            )}

                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowFixConfirm(false)}
                                    className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                                    İptal
                                </button>
                                <button onClick={performBulkFix}
                                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700">
                                    Düzelt
                                </button>
                            </div>
                        </div>
                </ModalOverlay>

                {/* Düzeltme Raporu Modalı */}
                {bulkFixReport && (
                <ModalOverlay open onClose={() => setBulkFixReport(null)}>
                        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
                            <div className="p-5 border-b flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        bulkFixReport.error ? 'bg-red-100' : 'bg-emerald-100'
                                    }`}>
                                        {bulkFixReport.error
                                            ? <XCircle size={20} className="text-red-600" />
                                            : <CheckCircle size={20} className="text-emerald-600" />
                                        }
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">Düzeltme Raporu</h3>
                                        {!bulkFixReport.error && (
                                            <p className="text-xs text-gray-500">
                                                {bulkFixReport.fixed} düzeltildi / {bulkFixReport.failed} başarısız — {bulkFixReport.elapsed_seconds}s
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setBulkFixReport(null)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle size={20} />
                                </button>
                            </div>

                            <div className="p-5 overflow-y-auto flex-1">
                                {bulkFixReport.error ? (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                        {bulkFixReport.error}
                                    </div>
                                ) : (
                                    <>
                                        {/* Özet kartlar */}
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="bg-slate-50 rounded-lg border p-3 text-center">
                                                <div className="text-lg font-bold text-slate-700">{bulkFixReport.total_issues}</div>
                                                <div className="text-[10px] text-slate-500 font-bold">Toplam İşlem</div>
                                            </div>
                                            <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-3 text-center">
                                                <div className="text-lg font-bold text-emerald-700">{bulkFixReport.fixed}</div>
                                                <div className="text-[10px] text-emerald-600 font-bold">Düzeltildi</div>
                                            </div>
                                            <div className="bg-red-50 rounded-lg border border-red-200 p-3 text-center">
                                                <div className="text-lg font-bold text-red-700">{bulkFixReport.failed}</div>
                                                <div className="text-[10px] text-red-600 font-bold">Başarısız</div>
                                            </div>
                                        </div>

                                        {/* Kod bazlı özet */}
                                        {bulkFixReport.by_code && Object.keys(bulkFixReport.by_code).length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="text-xs font-bold text-slate-500 mb-2">Kategori Bazlı</h4>
                                                <div className="space-y-1">
                                                    {Object.entries(bulkFixReport.by_code).map(([code, stats]) => (
                                                        <div key={code} className="flex items-center gap-2 text-xs">
                                                            <span className="font-mono text-slate-600 w-40">{code}</span>
                                                            <span className="text-emerald-600 font-bold">{stats.fixed} ✓</span>
                                                            {stats.failed > 0 && <span className="text-red-600 font-bold">{stats.failed} ✗</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Detay log */}
                                        {bulkFixReport.action_log && bulkFixReport.action_log.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 mb-2">Detaylı İşlem Logu</h4>
                                                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                                                    {bulkFixReport.action_log.map((a, i) => (
                                                        <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                                                            a.fixed ? 'bg-emerald-50' : 'bg-red-50'
                                                        }`}>
                                                            {a.fixed
                                                                ? <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                                                : <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                                            }
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-medium text-slate-700">{a.employee_name}</span>
                                                                    <span className="text-slate-400">#{a.request_id}</span>
                                                                    <span className="px-1 py-0.5 bg-slate-200 rounded text-[10px] font-bold">{a.request_type}</span>
                                                                    <span className="text-slate-400">{a.date}</span>
                                                                    <span className={`px-1 py-0.5 rounded text-[10px] font-bold ${
                                                                        a.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                                                                        a.severity === 'HIGH' ? 'bg-orange-500 text-white' :
                                                                        'bg-amber-400 text-amber-900'
                                                                    }`}>{a.issue_code}</span>
                                                                </div>
                                                                <div className={`mt-0.5 ${a.fixed ? 'text-emerald-700' : 'text-red-700'}`}>
                                                                    {a.detail}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                </ModalOverlay>
                )}
            </div>
        </div>
    );
}

/* ─── Helpers ─── */

function KpiCard({ label, value, color }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    };
    return (
        <div className={`rounded-xl border p-3 ${colors[color] || colors.blue}`}>
            <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
            <div className="text-xl font-bold">{value}</div>
        </div>
    );
}

function TypeCard({ title, data, color }) {
    if (!data) return null;
    const pct = data.total > 0 ? Math.round(((data.approved || 0) / data.total) * 100) : 0;
    const barColors = { purple: '#a855f7', amber: '#f59e0b', emerald: '#10b981', blue: '#3b82f6' };
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-bold uppercase mb-2" style={{ color: barColors[color] || '#6b7280' }}>{title}</div>
            <div className="text-2xl font-bold text-gray-800 mb-2">{data.total}</div>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-gray-500">Onaylı</span>
                    <span className="text-green-600 font-medium">{data.approved || 0}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Bekleyen</span>
                    <span className="text-amber-600 font-medium">{data.pending || 0}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Reddedilen</span>
                    <span className="text-red-600 font-medium">{data.rejected || 0}</span>
                </div>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColors[color] || '#6b7280' }}></div>
            </div>
            <div className="text-[10px] text-gray-400 mt-1 text-right">%{pct} onay</div>
        </div>
    );
}

function StatBox({ label, value }) {
    return (
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-base font-bold text-gray-800">{value}</div>
        </div>
    );
}

function Section({ title, sectionKey, expanded, toggle, children }) {
    const isOpen = expanded === sectionKey;
    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <button
                onClick={() => toggle(sectionKey)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
                <h3 className="text-sm font-bold text-gray-700">{title}</h3>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && <div className="px-4 pb-4">{children}</div>}
        </div>
    );
}

/* ─── Yaşam Döngüsü Analizi Helpers ─── */

function SummaryBadge({ label, count, color }) {
    const colors = {
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        rose: 'bg-rose-50 text-rose-700 border-rose-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    };
    return (
        <div className={`rounded-lg border px-3 py-2 text-center ${colors[color] || colors.slate}`}>
            <div className="text-lg font-extrabold">{count || 0}</div>
            <div className="text-[10px] font-bold opacity-70">{label}</div>
        </div>
    );
}

const TYPE_LABELS = { OVERTIME: 'Ek Mesai', LEAVE: 'İzin', CARDLESS_ENTRY: 'Kartsız', HEALTH_REPORT: 'Sağlık R.' };
const TYPE_COLORS = { OVERTIME: 'bg-violet-100 text-violet-700', LEAVE: 'bg-blue-100 text-blue-700', CARDLESS_ENTRY: 'bg-teal-100 text-teal-700', HEALTH_REPORT: 'bg-pink-100 text-pink-700' };
const STATUS_LABELS = { POTENTIAL: 'Potansiyel', PENDING: 'Bekliyor', APPROVED: 'Onaylı', REJECTED: 'Red', CANCELLED: 'İptal', ESCALATED: 'Üst Yön.' };
const STATUS_COLORS = { POTENTIAL: 'bg-indigo-100 text-indigo-700', PENDING: 'bg-amber-100 text-amber-700', APPROVED: 'bg-emerald-100 text-emerald-700', REJECTED: 'bg-red-100 text-red-700', CANCELLED: 'bg-slate-100 text-slate-500', ESCALATED: 'bg-purple-100 text-purple-700' };
const SOURCE_LABELS = { INTENDED: 'Planlı', POTENTIAL: 'Algılanan', MANUAL: 'Manuel' };
const SOURCE_COLORS = { INTENDED: 'bg-cyan-100 text-cyan-700', POTENTIAL: 'bg-violet-100 text-violet-700', MANUAL: 'bg-slate-100 text-slate-600' };
const SEVERITY_COLORS = { CRITICAL: 'bg-red-600 text-white', HIGH: 'bg-orange-500 text-white', MEDIUM: 'bg-amber-400 text-amber-900', LOW: 'bg-blue-100 text-blue-700' };

function LifecycleRow({ req, expanded, onToggle, selectedFixApprover, setSelectedFixApprover, handleSingleFix, otFixLoading, otFixResults, handleOtFragmentFix }) {
    const hasIssues = req.issues && req.issues.length > 0;
    const isOtFixed = otFixResults && otFixResults[req.id];
    const borderColor = isOtFixed
        ? 'border-l-emerald-500'
        : hasIssues
            ? (req.issues.some(i => i.severity === 'CRITICAL') ? 'border-l-red-600' :
               req.issues.some(i => i.severity === 'HIGH') ? 'border-l-orange-500' : 'border-l-amber-400')
            : 'border-l-emerald-400';

    return (
        <div className={`border rounded-lg border-l-4 ${borderColor} bg-white`}>
            <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                {expanded ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TYPE_COLORS[req.type] || ''}`}>
                    {TYPE_LABELS[req.type] || req.type}
                </span>
                <span className="text-xs font-medium text-slate-700 truncate flex-1">{req.employee_name}</span>
                <span className="text-[10px] text-slate-400">{req.date}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[req.status] || ''}`}>
                    {STATUS_LABELS[req.status] || req.status}
                </span>
                {req.status === 'POTENTIAL' && req.source_type && (
                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${SOURCE_COLORS[req.source_type] || 'bg-slate-100 text-slate-600'}`}>
                        {SOURCE_LABELS[req.source_type] || req.source_type}
                    </span>
                )}
                {req.duration_display && req.status === 'POTENTIAL' && (
                    <span className="text-[10px] text-slate-500">{req.duration_display}</span>
                )}
                {req.target_approver && (
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px]">→ {req.target_approver.name}</span>
                )}
                {hasIssues ? (
                    <span className="flex gap-0.5">
                        {req.issues.map((issue, i) => (
                            <span key={i} className={`px-1 py-0.5 rounded text-[9px] font-bold ${SEVERITY_COLORS[issue.severity]}`}>
                                {issue.code.replace(/_/g, ' ').substring(0, 8)}
                            </span>
                        ))}
                    </span>
                ) : (
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                )}
            </button>

            {expanded && (
                <div className="px-4 pb-3 pt-1 border-t border-slate-100 space-y-2 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Talep ID</span>
                            <span className="font-medium">#{req.id}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Süre / Detay</span>
                            <span className="font-medium">{req.duration_display || '-'}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Kaynak</span>
                            {req.source_type ? (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${SOURCE_COLORS[req.source_type] || ''}`}>
                                    {SOURCE_LABELS[req.source_type] || req.source_type}
                                </span>
                            ) : (
                                <span className="font-medium">-</span>
                            )}
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Oluşturulma</span>
                            <span className="font-medium">{req.created_at ? new Date(req.created_at).toLocaleString('tr-TR') : '-'}</span>
                        </div>
                    </div>

                    {/* Yönetici */}
                    {req.status !== 'POTENTIAL' && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold">Yönetici:</span>
                        {req.target_approver ? (
                            <span className="text-xs">
                                {req.target_approver.name}
                                {req.target_approver.relationship && (
                                    <span className="ml-1 px-1 py-0.5 bg-slate-100 rounded text-[10px]">{req.target_approver.relationship}</span>
                                )}
                                {req.target_approver.is_active === false && (
                                    <span className="ml-1 px-1 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">PASİF</span>
                                )}
                            </span>
                        ) : (
                            <span className="text-red-600 font-bold">ATANMAMIŞ</span>
                        )}
                    </div>
                    )}

                    {/* Bildirim — POTENTIAL için gösterme */}
                    {req.status !== 'POTENTIAL' && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold">Bildirim:</span>
                        {req.notification?.sent === true ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle size={12} /> Gönderildi
                                {req.notification.sent_at && <span className="text-slate-400 ml-1">({new Date(req.notification.sent_at).toLocaleString('tr-TR')})</span>}
                                {req.notification.is_read && <span className="px-1 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] ml-1">Okundu</span>}
                            </span>
                        ) : req.notification?.sent === false ? (
                            <span className="text-red-600 flex items-center gap-1">
                                <XCircle size={12} /> Gönderilmemiş
                            </span>
                        ) : (
                            <span className="text-slate-400">—</span>
                        )}
                    </div>
                    )}

                    {/* Görünürlük — POTENTIAL için gösterme */}
                    {req.status !== 'POTENTIAL' && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold">Görünürlük:</span>
                        {req.visibility?.in_pending_approvals === true ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle size={12} /> Yöneticide görünür
                            </span>
                        ) : req.visibility?.in_pending_approvals === false ? (
                            <span className="text-red-600 flex items-center gap-1">
                                <XCircle size={12} /> {req.visibility.reason || 'Görünmüyor'}
                            </span>
                        ) : (
                            <span className="text-slate-400">—</span>
                        )}
                    </div>
                    )}

                    {/* Onay bilgisi */}
                    {req.approval_info?.approved_by && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-bold">Onay/Red:</span>
                            <span>{req.approval_info.approved_by}</span>
                            {req.approval_info.approved_at && (
                                <span className="text-slate-400">({new Date(req.approval_info.approved_at).toLocaleString('tr-TR')})</span>
                            )}
                            {req.approval_info.rejection_reason && (
                                <span className="text-red-500 ml-1">Sebep: {req.approval_info.rejection_reason}</span>
                            )}
                        </div>
                    )}

                    {/* POTENTIAL OT detayı */}
                    {req.status === 'POTENTIAL' && req.type === 'OVERTIME' && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 mt-1">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                <div>
                                    <span className="text-indigo-400 font-bold block text-[10px]">Başlangıç</span>
                                    <span className="font-medium text-indigo-700">{req.start_time || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-indigo-400 font-bold block text-[10px]">Bitiş</span>
                                    <span className="font-medium text-indigo-700">{req.end_time || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-indigo-400 font-bold block text-[10px]">Süre</span>
                                    <span className="font-medium text-indigo-700">{req.duration_display || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-indigo-400 font-bold block text-[10px]">Segment</span>
                                    <span className="font-medium text-indigo-700">{Array.isArray(req.segments) ? req.segments.length : 0} adet</span>
                                </div>
                            </div>
                            {req.group_key && (
                                <div className="mt-1 text-[10px] text-indigo-500">Group: {req.group_key}</div>
                            )}
                        </div>
                    )}

                    {/* Sorunlar */}
                    {hasIssues && (
                        <div className="space-y-1 mt-2">
                            <span className="text-[10px] text-slate-400 font-bold block">Tespit Edilen Sorunlar:</span>
                            {req.issues.map((issue, i) => (
                                <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded ${
                                    issue.severity === 'CRITICAL' ? 'bg-red-50' :
                                    issue.severity === 'HIGH' ? 'bg-orange-50' :
                                    issue.severity === 'MEDIUM' ? 'bg-amber-50' : 'bg-blue-50'
                                }`}>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${SEVERITY_COLORS[issue.severity]}`}>
                                        {issue.severity}
                                    </span>
                                    <span className="text-xs">{issue.description}</span>
                                    {issue.fragment_count && (
                                        <span className="text-[10px] text-slate-500 ml-2">({issue.fragment_count} ayrı kayıt)</span>
                                    )}
                                    {issue.correct_start_time && (
                                        <span className="text-[10px] text-emerald-600 ml-2">Doğrusu: {issue.correct_start_time}</span>
                                    )}
                                </div>
                            ))}
                            {req.issues?.filter(i => i.code?.startsWith('OT_')).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {req.issues.filter(i => i.code?.startsWith('OT_')).map((issue, idx) => (
                                        <button
                                            key={idx}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOtFragmentFix(req.id, issue.code);
                                            }}
                                            disabled={otFixLoading?.[req.id]}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
                                        >
                                            {otFixLoading?.[req.id] ? (
                                                <span className="flex items-center gap-1">
                                                    <Loader2 size={12} className="animate-spin" /> Düzeltiliyor...
                                                </span>
                                            ) : (
                                                issue.code === 'OT_FRAGMENT_POTENTIAL' ? 'Birleştir (Recalculate)' :
                                                issue.code === 'OT_FRAGMENT_PENDING' ? 'İptal Et & Yeniden Hesapla' :
                                                issue.code === 'OT_FRAGMENT_APPROVED' ? 'Birleştir & Düzelt' :
                                                issue.code === 'OT_WRONG_START_TIME' ? 'Saati Düzelt' : 'Düzelt'
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* NO_APPROVER inline yönetici seçimi */}
                    {req.available_managers && req.available_managers.length > 0 && (
                        <div className="flex items-center gap-2 mt-1.5">
                            <select
                                value={selectedFixApprover?.[req.id] || req.available_managers[0]?.id || ''}
                                onChange={e => setSelectedFixApprover?.(prev => ({...prev, [req.id]: Number(e.target.value)}))}
                                className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white font-medium"
                            >
                                {req.available_managers.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.type === 'PRIMARY' ? '\u2B50 ' : '\uD83D\uDD39 '}{m.name}
                                        {m.type === 'PRIMARY' ? ' (Birincil)' : ' (İkincil)'}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => handleSingleFix?.(req.id, selectedFixApprover?.[req.id] || req.available_managers[0]?.id, false)}
                                className="text-xs px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors"
                            >
                                Ata
                            </button>
                            {req.status === 'PENDING' && req.type === 'OVERTIME' && (
                                <button
                                    onClick={() => handleSingleFix?.(req.id, selectedFixApprover?.[req.id] || req.available_managers[0]?.id, true)}
                                    className="text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                                >
                                    Ata + Onayla
                                </button>
                            )}
                        </div>
                    )}
                    {req.available_managers && req.available_managers.length === 0 && req.issues?.some(i => i.code === 'NO_APPROVER') && (
                        <p className="text-xs text-red-600 font-medium mt-1">
                            Bu calisanin aktif yoneticisi yok. Calisanlar sayfasindan yonetici atayin.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
