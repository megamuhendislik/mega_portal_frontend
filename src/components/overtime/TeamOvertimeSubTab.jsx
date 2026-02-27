import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle2, XCircle, AlertCircle, Users, Plus, Loader2, Filter, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import CreateAssignmentModal from './CreateAssignmentModal';

const DAY_NAMES = ['Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar'];
const MONTH_NAMES = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];

function formatDateTurkish(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    const dow = d.getDay(); // 0=Sun
    const dayName = DAY_NAMES[dow === 0 ? 6 : dow - 1];
    return `${day} ${month} ${year}, ${dayName}`;
}

const SourceBadge = ({ sourceType }) => {
    const config = {
        INTENDED: { label: 'Planli', color: 'bg-blue-100 text-blue-700' },
        POTENTIAL: { label: 'Algilanan', color: 'bg-purple-100 text-purple-700' },
        MANUAL: { label: 'Manuel', color: 'bg-amber-100 text-amber-700' },
    };
    const c = config[sourceType] || { label: sourceType || '?', color: 'bg-slate-100 text-slate-600' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${c.color}`}>{c.label}</span>;
};

const StatusBadge = ({ status }) => {
    const config = {
        PENDING: { label: 'Bekliyor', color: 'bg-amber-100 text-amber-700' },
        APPROVED: { label: 'Onaylandi', color: 'bg-emerald-100 text-emerald-700' },
        REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-700' },
        CANCELLED: { label: 'Iptal Edildi', color: 'bg-slate-200 text-slate-500' },
        POTENTIAL: { label: 'Taslak', color: 'bg-sky-100 text-sky-700' },
        ASSIGNED: { label: 'Atandi', color: 'bg-blue-100 text-blue-700' },
        CLAIMED: { label: 'Talep Edildi', color: 'bg-amber-100 text-amber-700' },
        EXPIRED: { label: 'Suresi Doldu', color: 'bg-red-100 text-red-700' },
    };
    const c = config[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${c.color}`}>{c.label}</span>;
};

export default function TeamOvertimeSubTab() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [teamRequests, setTeamRequests] = useState([]);
    const [teamAssignments, setTeamAssignments] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [filters, setFilters] = useState({ employee_id: '', status: 'ALL' });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignmentsOpen, setAssignmentsOpen] = useState(true);
    const [requestsOpen, setRequestsOpen] = useState(true);

    const fetchTeamData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.employee_id) params.employee_id = filters.employee_id;
            if (filters.status && filters.status !== 'ALL') params.status = filters.status;

            const [statsRes, reqRes, assignRes, membersRes] = await Promise.allSettled([
                api.get('/overtime-requests/team-stats/'),
                api.get('/overtime-requests/team/', { params }),
                api.get('/overtime-assignments/team/', { params: { employee_id: filters.employee_id } }),
                api.get('/employees/', { params: { page_size: 200 } }),
            ]);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            if (reqRes.status === 'fulfilled') {
                const data = reqRes.value.data;
                setTeamRequests(Array.isArray(data) ? data : (data?.results || []));
            }
            if (assignRes.status === 'fulfilled') {
                const data = assignRes.value.data;
                setTeamAssignments(Array.isArray(data) ? data : (data?.results || []));
            }
            if (membersRes.status === 'fulfilled') {
                const data = membersRes.value.data;
                setTeamMembers(Array.isArray(data) ? data : (data.results || []));
            }
        } catch (err) {
            console.error('TeamOvertimeSubTab fetch error:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTeamData();
    }, []);

    const handleApprove = async (req) => {
        if (!window.confirm(`${req.employee_name || 'Calisan'} - ${formatDateTurkish(req.date)} tarihli talebi onaylamak istiyor musunuz?`)) return;
        try {
            await api.post(`/overtime-requests/${req.id}/approve_reject/`, { action: 'approve' });
            fetchTeamData();
        } catch (err) {
            alert(err.response?.data?.error || err.response?.data?.detail || 'Onay sirasinda hata olustu.');
        }
    };

    const handleReject = async (req) => {
        const reason = prompt('Reddetme sebebi:');
        if (reason === null) return;
        if (!reason.trim()) { alert('Sebep girmeniz gerekiyor.'); return; }
        try {
            await api.post(`/overtime-requests/${req.id}/approve_reject/`, { action: 'reject', reason });
            fetchTeamData();
        } catch (err) {
            alert(err.response?.data?.error || err.response?.data?.detail || 'Reddetme sirasinda hata olustu.');
        }
    };

    const handleCancelAssignment = async (assignment) => {
        if (!window.confirm(`${assignment.employee_name || 'Calisan'} - ${formatDateTurkish(assignment.date)} atamasini iptal etmek istiyor musunuz?`)) return;
        try {
            await api.post(`/overtime-assignments/${assignment.id}/cancel/`);
            fetchTeamData();
        } catch (err) {
            alert(err.response?.data?.error || err.response?.data?.detail || 'Hata olustu.');
        }
    };

    return (
        <div className="space-y-6">
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
            ) : (
                <>
                    {/* KPI Cards */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { label: 'Toplam Atama', value: stats?.total_assignments ?? 0, icon: <Calendar size={18} />, color: 'blue' },
                                { label: 'Bekleyen Talep', value: stats?.pending ?? 0, icon: <Clock size={18} />, color: 'amber' },
                                { label: 'Onaylanan Saat', value: `${stats?.approved_hours ?? 0} sa`, icon: <CheckCircle2 size={18} />, color: 'emerald' },
                                { label: 'Reddedilen', value: stats?.rejected ?? 0, icon: <XCircle size={18} />, color: 'red' },
                                { label: 'Iptal Edilen', value: stats?.cancelled ?? 0, icon: <AlertCircle size={18} />, color: 'slate' },
                            ].map((card, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                                    <div className={`text-${card.color}-500 mb-2`}>{card.icon}</div>
                                    <div className="text-2xl font-black text-slate-900">{card.value}</div>
                                    <div className="text-xs font-medium text-slate-500">{card.label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 items-center bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <Filter size={16} className="text-slate-400" />
                        <select
                            value={filters.employee_id}
                            onChange={e => setFilters(f => ({...f, employee_id: e.target.value}))}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                        >
                            <option value="">Tum Calisanlar</option>
                            {teamMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                        </select>
                        <select
                            value={filters.status}
                            onChange={e => setFilters(f => ({...f, status: e.target.value}))}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                        >
                            <option value="ALL">Tum Durumlar</option>
                            <option value="PENDING">Bekliyor</option>
                            <option value="APPROVED">Onaylandi</option>
                            <option value="REJECTED">Reddedildi</option>
                            <option value="CANCELLED">Iptal Edildi</option>
                        </select>
                        <button
                            onClick={fetchTeamData}
                            className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Filtrele
                        </button>
                    </div>

                    {/* Atamalar Section */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setAssignmentsOpen(!assignmentsOpen)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Calendar size={18} className="text-blue-500" />
                                <span className="font-bold text-slate-800">Ek Mesai Atamalari</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">{teamAssignments.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowAssignModal(true); }}
                                    className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1"
                                >
                                    <Plus size={14} /> Ek Mesai Ata
                                </button>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${assignmentsOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </button>
                        {assignmentsOpen && (
                            <div className="border-t border-slate-100">
                                {teamAssignments.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">Bu donemde atama bulunmuyor.</div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {teamAssignments.map(a => (
                                            <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-slate-800">{a.employee_name}</div>
                                                    <div className="text-xs text-slate-500">{formatDateTurkish(a.date)} · Maks {a.max_duration_hours} saat</div>
                                                    {a.task_description && <div className="text-xs text-slate-400 mt-1 truncate">{a.task_description}</div>}
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <StatusBadge status={a.status} />
                                                    {a.status === 'ASSIGNED' && (
                                                        <button onClick={() => handleCancelAssignment(a)}
                                                            className="px-2.5 py-1 bg-red-50 text-red-600 font-bold text-xs rounded-lg hover:bg-red-100">
                                                            Iptal
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Ekip Talepleri Section */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setRequestsOpen(!requestsOpen)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Users size={18} className="text-indigo-500" />
                                <span className="font-bold text-slate-800">Ekip Ek Mesai Talepleri</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700">{teamRequests.length}</span>
                            </div>
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${requestsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {requestsOpen && (
                            <div className="border-t border-slate-100">
                                {teamRequests.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">Bu donemde ekip talebi bulunmuyor.</div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {teamRequests.map(req => (
                                            <div key={req.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-slate-800">{req.employee_name}</span>
                                                        <SourceBadge sourceType={req.source_type} />
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {formatDateTurkish(req.date)}
                                                        {req.start_time && req.end_time && ` · ${req.start_time?.slice(0,5)} - ${req.end_time?.slice(0,5)}`}
                                                        {req.duration_minutes && ` · ${Math.round(req.duration_minutes)} dk`}
                                                    </div>
                                                    {req.reason && <div className="text-xs text-slate-400 mt-1 truncate max-w-md">{req.reason}</div>}
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <StatusBadge status={req.status} />
                                                    {req.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => handleApprove(req)}
                                                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg hover:bg-emerald-100">
                                                                Onayla
                                                            </button>
                                                            <button onClick={() => handleReject(req)}
                                                                className="px-2.5 py-1 bg-red-50 text-red-600 font-bold text-xs rounded-lg hover:bg-red-100">
                                                                Reddet
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Create Assignment Modal */}
            <CreateAssignmentModal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                onSuccess={fetchTeamData}
                teamMembers={teamMembers}
            />
        </div>
    );
}
