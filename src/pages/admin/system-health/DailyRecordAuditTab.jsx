import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
    MagnifyingGlassIcon,
    DocumentArrowDownIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    CreditCardIcon,
    DocumentTextIcon,
    ArrowPathIcon,
    EyeIcon,
    ShieldCheckIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';

export default function DailyRecordAuditTab() {
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [employeesLoading, setEmployeesLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get('/employees/', { params: { page_size: 500 } })
            .then(res => {
                const list = (res.data.results || res.data || [])
                    .filter(e => e.is_active !== false)
                    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'tr'));
                setAllEmployees(list);
            })
            .catch(() => {})
            .finally(() => setEmployeesLoading(false));
    }, []);

    const handleEmployeeChange = (e) => {
        const id = e.target.value;
        if (!id) { setSelectedEmployee(null); return; }
        const emp = allEmployees.find(emp => String(emp.id) === id);
        setSelectedEmployee(emp || null);
    };

    const handleQuery = async () => {
        if (!selectedEmployee || !date) {
            setError('Çalışan ve tarih seçimi zorunludur.');
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await api.get(`/system/health-check/daily-record-audit/?employee_id=${selectedEmployee.id}&date=${date}`);
            setResult(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadTxt = () => {
        if (!result?.text_report) return;
        const blob = new Blob([result.text_report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gun_ici_hesap_izi_${selectedEmployee?.id}_${date}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatSeconds = (s) => {
        if (s == null) return '-';
        const absolute = Math.abs(Number(s) || 0);
        const h = Math.floor(absolute / 3600);
        const m = Math.floor((absolute % 3600) / 60);
        const sec = Math.floor(absolute % 60);
        const pieces = [];
        if (h) pieces.push(`${h}sa`);
        if (m) pieces.push(`${m}dk`);
        if (sec || pieces.length === 0) pieces.push(`${sec}sn`);
        return `${s < 0 ? '-' : ''}${pieces.join(' ')}`;
    };

    const formatAuditDate = (value) => {
        if (!value) return '-';
        const [year, month, day] = value.split('-');
        return `${day}.${month}.${year}`;
    };

    const presenceTone = (status) => {
        if (status === 'INSIDE' || status === 'OVERTIME') {
            return 'border-emerald-300 bg-emerald-50 text-emerald-800';
        }
        if (status === 'OUTSIDE') {
            return 'border-slate-300 bg-slate-50 text-slate-700';
        }
        return 'border-amber-300 bg-amber-50 text-amber-800';
    };

    const triggerLabel = (trigger) => ({
        LIVE_RECALC: 'Canlı hesap',
        GATE_EVENT: 'Kart olayı',
    }[trigger] || trigger || 'Durum değişikliği');

    const warningLabel = (warning) => ({
        GATE_IN_WITHOUT_OPEN_ATTENDANCE: 'Son kart GİRİŞ fakat açık Attendance yok',
        GATE_OUT_WITH_OPEN_ATTENDANCE: 'Son kart ÇIKIŞ fakat Attendance hâlâ açık',
        FUTURE_GATE_EVENT_IGNORED: 'Gelecek zamanlı kart olayı hesaba katılmadı',
        CARD_ATTENDANCE_WITHOUT_GATE_EVENT: 'CARD Attendance var fakat ham kart olayı yok',
        CROSS_MIDNIGHT_GATE_CARRY: 'Önceki günün son GİRİŞ/ÇIKIŞ kanıtı gece yarısından taşındı',
    }[warning] || warning);

    const sourceColor = (source) => {
        const colors = {
            'CARD': 'bg-blue-100 text-blue-800',
            'MANUAL': 'bg-yellow-100 text-yellow-800',
            'HEALTH_REPORT': 'bg-purple-100 text-purple-800',
            'HOSPITAL_VISIT': 'bg-pink-100 text-pink-800',
            'SPLIT': 'bg-gray-100 text-gray-800',
            'AUTO_SPLIT': 'bg-gray-100 text-gray-600',
            'SYSTEM': 'bg-slate-100 text-slate-800',
            'DUTY': 'bg-green-100 text-green-800',
            'MANUAL_OT': 'bg-orange-100 text-orange-800',
            'ADMIN_ENTRY': 'bg-indigo-100 text-indigo-800',
        };
        return colors[source] || 'bg-gray-100 text-gray-600';
    };

    const statusColor = (status) => {
        const colors = {
            'APPROVED': 'text-green-700 bg-green-50',
            'REJECTED': 'text-red-700 bg-red-50',
            'PENDING': 'text-yellow-700 bg-yellow-50',
            'CANCELLED': 'text-gray-500 bg-gray-50',
            'POTENTIAL': 'text-blue-700 bg-blue-50',
            'OPEN': 'text-orange-700 bg-orange-50',
            'CALCULATED': 'text-indigo-700 bg-indigo-50',
            'AUTO_APPROVED': 'text-green-600 bg-green-50',
            'ABSENT': 'text-red-600 bg-red-50',
            'HEALTH_REPORT': 'text-purple-700 bg-purple-50',
            'PRESENT': 'text-green-700 bg-green-50',
            'PENDING_MANAGER_APPROVAL': 'text-amber-700 bg-amber-50',
        };
        return colors[status] || 'text-gray-600 bg-gray-50';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <MagnifyingGlassIcon className="w-5 h-5 text-indigo-600" />
                    Günlük Canlı Hesap Denetimi
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    Bir çalışanın kart hareketini, motorun ürettiği Attendance parçalarını ve
                    ekranda gösterilen “Ofiste / Dışarıda” kararını aynı zaman çizgisinde inceleyin.
                    Bu ekran salt okunurdur; kayıtları değiştirmez.
                </p>

                <div className="flex flex-wrap items-end gap-4">
                    {/* Employee Select */}
                    <div className="flex-1 min-w-[250px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Çalışan</label>
                        <select
                            value={selectedEmployee?.id || ''}
                            onChange={handleEmployeeChange}
                            disabled={employeesLoading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        >
                            <option value="">{employeesLoading ? 'Yükleniyor...' : 'Çalışan seçin...'}</option>
                            {allEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.full_name || `${emp.first_name} ${emp.last_name}`}{emp.department_name ? ` (${emp.department_name})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div className="min-w-[180px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Query Button */}
                    <button
                        onClick={handleQuery}
                        disabled={loading || !selectedEmployee || !date}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                        Sorgula
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Action Bar */}
                    <div className="flex flex-wrap justify-between items-center gap-3">
                        <h3 className="text-sm font-bold text-gray-600">
                            Sonuçlar: {result.employee?.full_name} — {formatAuditDate(result.date)}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                <ShieldCheckIcon className="h-4 w-4" />
                                Salt okunur
                            </span>
                            <button
                                onClick={downloadTxt}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                Kanıt TXT’sini indir
                            </button>
                        </div>
                    </div>

                    {/* Live calculation evidence */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
                            <div>
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <EyeIcon className="h-5 w-5 text-cyan-300" />
                                    Gün içi hesap izi
                                </div>
                                <p className="mt-1 text-xs text-slate-300">
                                    Kart kanıtı → motor sonucu → kullanıcıya gösterilen durum
                                </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                result.timeline_mode === 'OBSERVED'
                                    ? 'bg-cyan-300 text-slate-950'
                                    : 'bg-amber-300 text-slate-950'
                            }`}>
                                {result.timeline_mode === 'OBSERVED'
                                    ? `${result.live_timeline?.length || 0} gözlenmiş değişiklik`
                                    : result.timeline_mode === 'RECONSTRUCTED_CURRENT'
                                        ? 'Yeniden oluşturulmuş son durum'
                                        : 'Kayıt yok'}
                            </span>
                        </div>

                        {result.timeline_mode !== 'OBSERVED' && (
                            <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                                {result.timeline_mode === 'RECONSTRUCTED_CURRENT'
                                    ? 'Bu gün için geçmiş ara fotoğraf yok. Aşağıdaki hüküm ham kart ve sorgu anındaki son kayıtlardan yeniden oluşturuldu; o anda ekranda görülen değerin kesin kanıtı değildir.'
                                    : 'Bu çalışan-gün için ham kart, Attendance veya gözlenmiş canlı hesap izi bulunamadı.'}
                            </div>
                        )}

                        {result.live_timeline?.length > 0 ? (
                            <div className="divide-y divide-slate-200">
                                {result.live_timeline.map((snapshot, index) => {
                                    const lastGate = snapshot.last_gate_event;
                                    const totals = snapshot.totals || {};
                                    return (
                                        <article key={snapshot.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[110px_1fr]">
                                            <div className="relative border-l-2 border-cyan-300 pl-4">
                                                <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-cyan-500 ring-4 ring-cyan-50" />
                                                <div className="font-mono text-sm font-bold text-slate-900">{snapshot.observed_time}</div>
                                                <div className="mt-1 text-xs text-slate-500">Değişim {String(index + 1).padStart(2, '0')}</div>
                                                <div className="mt-2 text-xs font-medium text-cyan-700">{triggerLabel(snapshot.trigger)}</div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
                                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                                        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Ham kart</div>
                                                        {lastGate ? (
                                                            <>
                                                                <div className="mt-2 font-mono text-sm font-bold text-blue-950">
                                                                    {lastGate.date} {lastGate.time} · {lastGate.normalized_direction === 'IN' ? 'GİRİŞ' : 'ÇIKIŞ'}
                                                                </div>
                                                                <div className="mt-1 break-all text-xs text-blue-700">{lastGate.event_id} · {lastGate.status}</div>
                                                            </>
                                                        ) : (
                                                            <div className="mt-2 text-sm text-blue-700">Geçerli kart hükmü yok</div>
                                                        )}
                                                    </div>
                                                    <ArrowRightIcon className="hidden h-5 w-5 self-center text-slate-300 md:block" />
                                                    <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                                                        <div className="text-[11px] font-bold uppercase tracking-wider text-violet-600">Motor hesabı</div>
                                                        <div className="mt-2 text-sm font-semibold text-violet-950">
                                                            {totals.attendance_count || 0} parça
                                                        </div>
                                                        <div className="mt-1 text-xs leading-5 text-violet-700">
                                                            Normal {formatSeconds(totals.normal_seconds)} · Mesai {formatSeconds(totals.calculated_overtime_seconds)} · Eksik {formatSeconds(totals.missing_seconds)}
                                                        </div>
                                                    </div>
                                                    <ArrowRightIcon className="hidden h-5 w-5 self-center text-slate-300 md:block" />
                                                    <div className={`rounded-lg border p-3 ${presenceTone(snapshot.presence_status)}`}>
                                                        <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">Ekranda görünen</div>
                                                        <div className="mt-2 text-sm font-bold">{snapshot.presence_label || snapshot.presence_status}</div>
                                                        <div className="mt-1 text-xs leading-5">{snapshot.presence_reason || 'Açıklama yok'}</div>
                                                    </div>
                                                </div>

                                                {snapshot.warnings?.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {snapshot.warnings.map(warning => (
                                                            <span key={warning} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                                                                {warningLabel(warning)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <details className="rounded-lg border border-slate-200 bg-slate-50">
                                                    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
                                                        Bu anda kullanılan ham veriyi ve Attendance parçalarını göster
                                                    </summary>
                                                    <div className="grid gap-4 border-t border-slate-200 p-4 xl:grid-cols-2">
                                                        <div>
                                                            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Kart olayları ({snapshot.gate_events?.length || 0})</div>
                                                            <div className="space-y-1 font-mono text-xs text-slate-700">
                                                                {snapshot.gate_events?.length > 0
                                                                    ? snapshot.gate_events.map(event => (
                                                                        <div key={event.id} className="rounded bg-white px-2 py-1.5">
                                                                            {event.time} {event.normalized_direction || event.direction} · {event.status} · {event.event_id}
                                                                            {event.is_future ? ' · HESABA KATILMADI (gelecek)' : ''}
                                                                        </div>
                                                                    ))
                                                                    : <div className="text-slate-400">Kart olayı yok</div>}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Attendance ({snapshot.attendance_records?.length || 0})</div>
                                                            <div className="space-y-1 font-mono text-xs text-slate-700">
                                                                {snapshot.attendance_records?.length > 0
                                                                    ? snapshot.attendance_records.map(record => (
                                                                        <div key={record.id} className="rounded bg-white px-2 py-1.5">
                                                                            #{record.id} · {record.check_in_time || '?'} → {record.check_out_time || 'AÇIK'} · {record.source} · N {formatSeconds(record.normal_seconds)} · M {formatSeconds(record.calculated_overtime_seconds)} · E {formatSeconds(record.missing_seconds)}
                                                                        </div>
                                                                    ))
                                                                    : <div className="text-slate-400">Attendance parçası yok</div>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </details>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : result.current_presence && (
                            <div className="px-5 py-5">
                                <div className={`rounded-lg border p-4 ${presenceTone(result.current_presence.status)}`}>
                                    <div className="text-xs font-bold uppercase tracking-wider opacity-70">Sorgu anındaki hüküm</div>
                                    <div className="mt-2 text-base font-bold">{result.current_presence.label || result.current_presence.status}</div>
                                    <div className="mt-1 text-sm">{result.current_presence.reason}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Diagnosis */}
                    {result.diagnosis?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                                Teshis
                            </h4>
                            <div className="space-y-2">
                                {result.diagnosis.map((d, i) => (
                                    <div key={i} className={`p-3 rounded-lg text-sm ${
                                        d.includes('KRiTiK') || d.includes('KRITIK') ? 'bg-red-50 border border-red-200 text-red-800' :
                                        d.includes('ANOMALI') ? 'bg-amber-50 border border-amber-200 text-amber-800' :
                                        d.includes('COZUM') || d.includes('INFO') ? 'bg-blue-50 border border-blue-200 text-blue-800' :
                                        'bg-gray-50 border border-gray-200 text-gray-700'
                                    }`}>
                                        {d}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {result.diagnosis?.length === 0 && (
                        <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-green-800 text-sm flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                            Anomali tespit edilmedi.
                        </div>
                    )}

                    {/* Day Rules */}
                    {result.day_rules && !result.day_rules.error && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-indigo-500" />
                                Vardiya Kurallari
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="p-2 bg-gray-50 rounded">
                                    <span className="text-gray-500">Vardiya:</span>{' '}
                                    <span className="font-medium">{result.day_rules.shift_start} - {result.day_rules.shift_end}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                    <span className="text-gray-500">Ogle:</span>{' '}
                                    <span className="font-medium">{result.day_rules.lunch_start} - {result.day_rules.lunch_end}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                    <span className="text-gray-500">Tatil:</span>{' '}
                                    <span className="font-medium">{result.day_rules.is_off_day ? 'Evet' : 'Hayir'}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                    <span className="text-gray-500">Tolerans:</span>{' '}
                                    <span className="font-medium">{result.day_rules.tolerance_minutes}dk / Min Fazla Mesai: {result.day_rules.minimum_overtime_minutes}dk</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gate Events */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <CreditCardIcon className="w-5 h-5 text-blue-500" />
                            Kart Okuyucu Verileri ({result.gate_event_count ?? result.gate_events?.length ?? 0} kayit)
                        </h4>
                        {result.gate_events?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left p-2 font-medium text-gray-600">Saat</th>
                                            <th className="text-left p-2 font-medium text-gray-600">Yon</th>
                                            <th className="text-left p-2 font-medium text-gray-600">Event ID</th>
                                            <th className="text-left p-2 font-medium text-gray-600">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {result.gate_events.map((ge, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-2 font-mono">{ge.timestamp}</td>
                                                <td className="p-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                        ge.direction === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {ge.direction === 'IN' ? 'GIRIS' : 'CIKIS'}
                                                    </span>
                                                </td>
                                                <td className="p-2 text-gray-500 font-mono text-xs">{ge.event_id}</td>
                                                <td className="p-2 text-gray-500">{ge.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Bu tarihte kart okuyucu verisi yok.</p>
                        )}
                    </div>

                    {/* Attendance Records */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <DocumentTextIcon className="w-5 h-5 text-emerald-500" />
                            Attendance Kayitlari ({result.attendance_count ?? result.attendance_records?.length ?? 0} kayit)
                        </h4>
                        {result.attendance_records?.length > 0 ? (
                            <div className="space-y-3">
                                {result.attendance_records.map((att, i) => (
                                    <div key={i} className="p-3 border border-gray-200 rounded-lg hover:border-indigo-200 transition-colors">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="text-xs text-gray-400">ID:{att.id}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${sourceColor(att.source)}`}>{att.source}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(att.status)}`}>{att.status}</span>
                                            {att.is_overtime_record && <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800">FM Record</span>}
                                            {att.related_health_report_id && <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">HR#{att.related_health_report_id}</span>}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                            <div><span className="text-gray-500">Giris:</span> <span className="font-mono font-medium">{att.check_in || '-'}</span></div>
                                            <div><span className="text-gray-500">Cikis:</span> <span className="font-mono font-medium">{att.check_out || '-'}</span></div>
                                            <div><span className="text-gray-500">Normal:</span> <span className="font-medium">{formatSeconds(att.normal_seconds)}</span></div>
                                            <div><span className="text-gray-500">Fazla Mesai:</span> <span className="font-medium">{formatSeconds(att.calculated_overtime_seconds)}</span></div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-1">
                                            <div><span className="text-gray-500">Eksik:</span> <span className="font-medium text-red-600">{formatSeconds(att.missing_seconds)}</span></div>
                                            <div><span className="text-gray-500">Toplam:</span> <span className="font-medium">{formatSeconds(att.total_seconds)}</span></div>
                                            <div><span className="text-gray-500">Mola:</span> <span className="font-medium">{formatSeconds(att.break_seconds)}</span></div>
                                            {att.parent_attendance_id && <div><span className="text-gray-500">Parent ID:</span> <span className="font-medium">{att.parent_attendance_id}</span></div>}
                                        </div>
                                        {att.note && <div className="mt-1 text-xs text-gray-500 italic">Not: {att.note}</div>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Bu tarihte attendance kaydi yok.</p>
                        )}
                    </div>

                    {/* Health Reports */}
                    {result.health_reports?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3">Saglik Raporlari ({result.health_reports.length})</h4>
                            {result.health_reports.map((hr, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg mb-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-400">ID:{hr.id}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(hr.status)}`}>{hr.status}</span>
                                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{hr.report_type}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-500">Tarih:</span> {hr.start_date} — {hr.end_date}
                                        {hr.rejection_reason && <div className="text-red-600 mt-1">Red sebebi: {hr.rejection_reason}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Overtime Requests */}
                    {result.overtime_requests?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3">Fazla Mesai Talepleri ({result.overtime_requests.length})</h4>
                            {result.overtime_requests.map((ot, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg mb-2 flex flex-wrap items-center gap-3">
                                    <span className="text-xs text-gray-400">ID:{ot.id}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(ot.status)}`}>{ot.status}</span>
                                    <span className="text-sm">{ot.start_time} - {ot.end_time}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{ot.source_type}</span>
                                    {ot.duration_minutes && <span className="text-sm text-gray-500">{ot.duration_minutes}dk</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Leave Requests */}
                    {result.leave_requests?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3">Izin Talepleri ({result.leave_requests.length})</h4>
                            {result.leave_requests.map((lr, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg mb-2 flex flex-wrap items-center gap-3">
                                    <span className="text-xs text-gray-400">ID:{lr.id}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(lr.status)}`}>{lr.status}</span>
                                    <span className="text-sm">{lr.request_type}</span>
                                    <span className="text-sm text-gray-500">{lr.start_date} — {lr.end_date}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Cardless Entries */}
                    {result.cardless_entries?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3">Kartsiz Giris Talepleri ({result.cardless_entries.length})</h4>
                            {result.cardless_entries.map((ce, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg mb-2 flex flex-wrap items-center gap-3">
                                    <span className="text-xs text-gray-400">ID:{ce.id}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(ce.status)}`}>{ce.status}</span>
                                    <span className="text-sm">{ce.check_in} - {ce.check_out}</span>
                                    {ce.reason && <span className="text-sm text-gray-500">{ce.reason}</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Meal Requests */}
                    {result.meal_requests?.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-3">Yemek Talepleri ({result.meal_requests.length})</h4>
                            {result.meal_requests.map((m, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg mb-2 flex flex-wrap items-center gap-3">
                                    <span className="text-xs text-gray-400">ID:{m.id}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(m.status)}`}>{m.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
