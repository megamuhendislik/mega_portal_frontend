import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const SEVERITY_COLORS = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
};

const SEVERITY_DOT = {
    critical: 'bg-red-500',
    error: 'bg-red-400',
    warning: 'bg-amber-400',
    success: 'bg-emerald-400',
    info: 'bg-blue-400',
};

const TYPE_LABELS = {
    ATTENDANCE_CREATED: 'Kayıt Oluşturma',
    ATTENDANCE_UPDATED: 'Kayıt Güncelleme',
    GATE_EVENT: 'Kart Okuyucu',
    SERVICE_LOG: 'Servis Log',
    REQUEST_LEAVE: 'İzin Talebi',
    REQUEST_CARDLESS: 'Kartsız Giriş',
};

function formatSeconds(s) {
    if (!s && s !== 0) return '-';
    const h = Math.floor(Math.abs(s) / 3600);
    const m = Math.floor((Math.abs(s) % 3600) / 60);
    return `${s < 0 ? '-' : ''}${h}sa ${m}dk`;
}

function formatTime(isoStr) {
    if (!isoStr) return '-';
    try {
        const d = new Date(isoStr);
        return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return isoStr;
    }
}

export default function AttendanceForensicTab() {
    const [employees, setEmployees] = useState([]);
    const [employeeId, setEmployeeId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [daysBack, setDaysBack] = useState(7);
    const [useRange, setUseRange] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedTimeline, setExpandedTimeline] = useState({});
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [activeSection, setActiveSection] = useState('timeline');

    useEffect(() => {
        api.get('/employees/?limit=500').then(res => {
            const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setEmployees(list);
        }).catch(() => {});
    }, []);

    const fetchForensic = async () => {
        if (!employeeId) return;
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const params = { employee_id: employeeId };
            if (useRange) {
                params.days_back = daysBack;
            } else {
                params.date = date;
            }
            const res = await api.get('/system/health-check/attendance-forensic/', { params, timeout: 60000 });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (attId) => {
        if (!window.confirm(`Attendance #${attId} kaydı kalıcı olarak silinecek. Emin misiniz?`)) return;
        setDeleteLoading(attId);
        try {
            await api.post('/system/health-check/delete-attendance-record/', { attendance_id: attId });
            fetchForensic();
        } catch (err) {
            alert('Silme hatası: ' + (err.response?.data?.error || err.message));
        } finally {
            setDeleteLoading(null);
        }
    };

    const toggleTimeline = (idx) => {
        setExpandedTimeline(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-1">Kayıt Soruşturma (Forensic)</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Hayalet kayıtların kaynağını tespit edin. Gate event, servis log ve attendance kayıtlarını kronolojik olarak inceleyin.
                </p>

                {/* Controls */}
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Personel</label>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-300"
                        >
                            <option value="">Personel Seçin...</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>
                                    {e.first_name} {e.last_name} {e.user?.is_superuser ? '(ADMIN)' : ''} — #{e.id}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useRange}
                                onChange={(e) => setUseRange(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-red-600"
                            />
                            <span className="text-xs font-medium text-gray-600">Tarih Aralığı</span>
                        </label>
                    </div>

                    {useRange ? (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Son X Gün</label>
                            <input
                                type="number"
                                min={1}
                                max={90}
                                value={daysBack}
                                onChange={(e) => setDaysBack(parseInt(e.target.value) || 7)}
                                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tarih</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                    )}

                    <button
                        onClick={fetchForensic}
                        disabled={loading || !employeeId}
                        className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Sorgulanıyor...' : 'Sorgula'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
                    {error}
                </div>
            )}

            {data && (
                <>
                    {/* Employee Info + Day Rules */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">Personel Bilgisi</h3>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between"><span className="text-gray-500">Ad</span><span className="font-bold">{data.employee.name}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Sicil</span><span className="font-mono">{data.employee.employee_code || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Superuser</span>
                                    <span className={`font-bold ${data.employee.is_superuser ? 'text-red-600' : 'text-gray-600'}`}>
                                        {data.employee.is_superuser ? 'EVET' : 'Hayır'}
                                    </span>
                                </div>
                                <div className="flex justify-between"><span className="text-gray-500">Departman</span><span>{data.employee.department || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Pozisyon</span><span>{data.employee.job_position || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">FiscalCalendar</span><span>{data.employee.fiscal_calendar?.name || 'YOK'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">WorkSchedule</span><span>{data.employee.work_schedule?.name || 'YOK'}</span></div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">Vardiya Kuralları ({data.day_rules?.date || '-'})</h3>
                            {data.day_rules?.error ? (
                                <div className="text-red-500 text-xs">{data.day_rules.error}</div>
                            ) : data.day_rules ? (
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between"><span className="text-gray-500">Vardiya</span><span className="font-mono font-bold">{data.day_rules.shift_start} — {data.day_rules.shift_end}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Yemek</span><span className="font-mono">{data.day_rules.lunch_start} — {data.day_rules.lunch_end}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Tatil Günü</span>
                                        <span className={data.day_rules.is_off_day ? 'font-bold text-emerald-600' : ''}>{data.day_rules.is_off_day ? 'EVET' : 'Hayır'}</span>
                                    </div>
                                    <div className="flex justify-between"><span className="text-gray-500">Mola Hakkı</span><span>{data.day_rules.daily_break_allowance} dk</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Kaynak</span><span className="font-mono text-indigo-600">{data.day_rules.source}</span></div>
                                </div>
                            ) : <div className="text-gray-400 text-xs">Bilgi yok</div>}
                        </div>
                    </div>

                    {/* Counts Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                            { label: 'Attendance', count: data.counts.attendance, color: 'indigo' },
                            { label: 'Gate Events', count: data.counts.gate_events, color: 'emerald' },
                            { label: 'Servis Logları', count: data.counts.service_logs, color: 'blue' },
                            { label: 'Talepler', count: data.counts.related_requests, color: 'violet' },
                            { label: 'Anomaliler', count: data.counts.anomalies, color: data.counts.anomalies > 0 ? 'red' : 'gray' },
                        ].map(c => (
                            <div key={c.label} className={`bg-white rounded-xl border p-4 text-center border-${c.color}-100`}>
                                <div className={`text-2xl font-black text-${c.color}-600`}>{c.count}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{c.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Anomalies Alert */}
                    {data.anomalies.length > 0 && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                            <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                Anomaliler Tespit Edildi ({data.anomalies.length})
                            </h3>
                            <div className="space-y-2">
                                {data.anomalies.map((a, i) => (
                                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.warning}`}>
                                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${SEVERITY_DOT[a.severity]}`}></span>
                                        <div className="flex-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{a.type}</span>
                                            <p className="text-xs font-medium mt-0.5">{a.message}</p>
                                        </div>
                                        {a.attendance_id && (
                                            <button
                                                onClick={() => handleDelete(a.attendance_id)}
                                                disabled={deleteLoading === a.attendance_id}
                                                className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex-shrink-0"
                                            >
                                                {deleteLoading === a.attendance_id ? '...' : 'Sil'}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section Tabs */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        {[
                            { id: 'timeline', label: 'Zaman Çizelgesi' },
                            { id: 'attendance', label: `Attendance (${data.counts.attendance})` },
                            { id: 'gates', label: `Gate Events (${data.counts.gate_events})` },
                            { id: 'logs', label: `Servis Logları (${data.counts.service_logs})` },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveSection(t.id)}
                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                    activeSection === t.id ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Timeline */}
                    {activeSection === 'timeline' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h3 className="text-sm font-bold text-gray-700 mb-4">Kronolojik Zaman Çizelgesi</h3>
                            {data.timeline.length === 0 ? (
                                <div className="text-center text-gray-400 py-8 text-sm">Bu dönemde hiç kayıt bulunamadı.</div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                                    <div className="space-y-1">
                                        {data.timeline.map((event, idx) => (
                                            <div key={idx} className="relative pl-10">
                                                <div className={`absolute left-3 top-3 w-2.5 h-2.5 rounded-full border-2 border-white ${SEVERITY_DOT[event.severity] || 'bg-gray-300'}`}></div>
                                                <button
                                                    onClick={() => toggleTimeline(idx)}
                                                    className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm ${SEVERITY_COLORS[event.severity] || 'bg-gray-50 border-gray-200'}`}
                                                >
                                                    <div className="flex items-center gap-2 justify-between">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 flex-shrink-0">
                                                                {TYPE_LABELS[event.type] || event.type}
                                                            </span>
                                                            <span className="text-xs font-medium truncate">{event.summary}</span>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">{formatTime(event.time)}</span>
                                                    </div>
                                                </button>
                                                {expandedTimeline[idx] && event.details && (
                                                    <div className="ml-2 mt-1 mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-[11px] font-mono overflow-auto max-h-48">
                                                        <pre className="whitespace-pre-wrap">{JSON.stringify(event.details, null, 2)}</pre>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attendance Records */}
                    {activeSection === 'attendance' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100">
                                <h3 className="text-sm font-bold text-gray-700">Attendance Kayıtları</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                                            <th className="p-3 text-left">ID</th>
                                            <th className="p-3 text-left">Tarih</th>
                                            <th className="p-3 text-left">Status</th>
                                            <th className="p-3 text-left">Source</th>
                                            <th className="p-3 text-left">Giriş</th>
                                            <th className="p-3 text-left">Çıkış</th>
                                            <th className="p-3 text-right">Normal</th>
                                            <th className="p-3 text-right">Mesai</th>
                                            <th className="p-3 text-right">Eksik</th>
                                            <th className="p-3 text-right">Total</th>
                                            <th className="p-3 text-left">Oluşturulma</th>
                                            <th className="p-3 text-left">Not</th>
                                            <th className="p-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.attendance_records.length === 0 ? (
                                            <tr><td colSpan="13" className="p-8 text-center text-gray-400">Kayıt yok</td></tr>
                                        ) : data.attendance_records.map(att => (
                                            <tr key={att.id} className={`hover:bg-gray-50 ${att.source === 'SYSTEM' ? 'bg-amber-50/30' : ''}`}>
                                                <td className="p-3 font-mono font-bold">#{att.id}</td>
                                                <td className="p-3 font-mono">{att.work_date}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        att.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                                        att.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                                                        att.status === 'AUTO_APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {att.status}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`font-bold ${att.source === 'SYSTEM' ? 'text-amber-600' : att.source === 'CARD' ? 'text-emerald-600' : 'text-gray-600'}`}>
                                                        {att.source}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono">{att.check_in ? formatTime(att.check_in) : '-'}</td>
                                                <td className="p-3 font-mono">{att.check_out ? formatTime(att.check_out) : '-'}</td>
                                                <td className="p-3 text-right font-mono">{formatSeconds(att.normal_seconds)}</td>
                                                <td className="p-3 text-right font-mono">{formatSeconds(att.overtime_seconds)}</td>
                                                <td className="p-3 text-right font-mono text-red-600">{formatSeconds(att.missing_seconds)}</td>
                                                <td className="p-3 text-right font-mono font-bold">{formatSeconds(att.total_seconds)}</td>
                                                <td className="p-3 font-mono text-[10px]">{formatTime(att.created_at)}</td>
                                                <td className="p-3 max-w-[100px] truncate" title={att.note}>{att.note || '-'}</td>
                                                <td className="p-3">
                                                    <button
                                                        onClick={() => handleDelete(att.id)}
                                                        disabled={deleteLoading === att.id}
                                                        className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded hover:bg-red-200 disabled:opacity-50"
                                                    >
                                                        {deleteLoading === att.id ? '...' : 'Sil'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Gate Events */}
                    {activeSection === 'gates' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100">
                                <h3 className="text-sm font-bold text-gray-700">Kart Okuyucu Olayları (Gate Events)</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                                            <th className="p-3 text-left">ID</th>
                                            <th className="p-3 text-left">Event ID</th>
                                            <th className="p-3 text-left">Timestamp</th>
                                            <th className="p-3 text-left">Yön</th>
                                            <th className="p-3 text-left">Status</th>
                                            <th className="p-3 text-left">Oluşturulma</th>
                                            <th className="p-3 text-left">Payload</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.gate_events.length === 0 ? (
                                            <tr><td colSpan="7" className="p-8 text-center text-gray-400">
                                                Hiç kart okuyucu olayı yok — Bu çalışan kart basmamış.
                                            </td></tr>
                                        ) : data.gate_events.map(ge => (
                                            <tr key={ge.id} className="hover:bg-gray-50">
                                                <td className="p-3 font-mono">#{ge.id}</td>
                                                <td className="p-3 font-mono text-[10px]">{ge.event_id}</td>
                                                <td className="p-3 font-mono">{formatTime(ge.timestamp)}</td>
                                                <td className="p-3 font-bold">{ge.direction}</td>
                                                <td className="p-3">{ge.status}</td>
                                                <td className="p-3 font-mono text-[10px]">{formatTime(ge.created_at)}</td>
                                                <td className="p-3 font-mono text-[10px] max-w-[200px] truncate">{ge.raw_payload || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Service Logs */}
                    {activeSection === 'logs' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100">
                                <h3 className="text-sm font-bold text-gray-700">Servis Logları (Son 200)</h3>
                            </div>
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-gray-50">
                                        <tr className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                                            <th className="p-3 text-left">Zaman</th>
                                            <th className="p-3 text-left">Seviye</th>
                                            <th className="p-3 text-left">Bileşen</th>
                                            <th className="p-3 text-left">Mesaj</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.service_logs.length === 0 ? (
                                            <tr><td colSpan="4" className="p-8 text-center text-gray-400">Servis logu yok (loglar devre dışı olabilir)</td></tr>
                                        ) : data.service_logs.map(log => (
                                            <tr key={log.id} className={`hover:bg-gray-50 ${log.level === 'ERROR' ? 'bg-red-50/50' : log.level === 'WARN' ? 'bg-amber-50/50' : ''}`}>
                                                <td className="p-3 font-mono text-[10px] whitespace-nowrap">{formatTime(log.timestamp)}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        log.level === 'ERROR' ? 'bg-red-100 text-red-700' :
                                                        log.level === 'WARN' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>{log.level}</span>
                                                </td>
                                                <td className="p-3 font-mono text-indigo-600">{log.component}</td>
                                                <td className="p-3">{log.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
