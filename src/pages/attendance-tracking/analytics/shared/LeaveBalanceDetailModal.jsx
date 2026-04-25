import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Input, Table, Empty, Segmented } from 'antd';
import {
    Search as SearchIcon, X as CloseIcon, Coins, Calendar, Clock,
    SortAsc, SortDesc, Filter as FilterIcon, Building2,
} from 'lucide-react';
import api from '../../../../services/api';

const ANNUAL_BAR_COLOR = '#3b82f6';   // blue
const ANNUAL_BG_COLOR = '#dbeafe';
const EXCUSE_BAR_COLOR = '#f59e0b';   // amber
const EXCUSE_BG_COLOR = '#fef3c7';

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Inline iki-bar gösterim (yıllık + mazeret, ayrı renk)
function LeaveBars({ row }) {
    // Yıllık bar: bu yıl kullanım / (kullanım + kalan) — aktif bakiyeye göre oran
    const annualBase = (row.annual.used_this_year + row.annual.remaining);
    const annualPct = annualBase > 0
        ? Math.min(100, (row.annual.used_this_year / annualBase) * 100)
        : 0;
    const excusePct = row.excuse.entitled > 0
        ? Math.min(100, (row.excuse.used / row.excuse.entitled) * 100)
        : 0;
    return (
        <div className="flex flex-col gap-1.5 w-32">
            <div
                className="relative h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: ANNUAL_BG_COLOR }}
                title={`Yıllık: ${row.annual.used_this_year}g kullanıldı / ${row.annual.remaining}g kalan`}
            >
                <div
                    className="absolute h-full transition-all"
                    style={{ width: `${annualPct}%`, backgroundColor: ANNUAL_BAR_COLOR }}
                />
            </div>
            <div
                className="relative h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: EXCUSE_BG_COLOR }}
                title={`Mazeret: ${row.excuse.used}sa / ${row.excuse.entitled}sa`}
            >
                <div
                    className="absolute h-full transition-all"
                    style={{ width: `${excusePct}%`, backgroundColor: EXCUSE_BAR_COLOR }}
                />
            </div>
        </div>
    );
}

export default function LeaveBalanceDetailModal({ open, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('annual_remaining_desc');
    const [selectedDepts, setSelectedDepts] = useState([]);

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        // setState'leri microtask'a ertele — react-hooks/set-state-in-effect uyumlu
        Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
        });
        api.get('/attendance-analytics/leave-balance-detail/')
            .then((res) => {
                if (cancelled) return;
                setData(res.data);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.error || err.message || 'Veri alınamadı');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [open]);

    const employees = useMemo(() => data?.employees || [], [data]);
    const summary = data?.summary || {};

    const departmentList = useMemo(() => {
        const map = new Map();
        employees.forEach((e) => {
            const d = e.department || '—';
            map.set(d, (map.get(d) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [employees]);

    const showDeptFilter = departmentList.length > 1;

    const filtered = useMemo(() => {
        let list = [...employees];
        if (showDeptFilter && selectedDepts.length > 0) {
            const set = new Set(selectedDepts);
            list = list.filter((e) => set.has(e.department || '—'));
        }
        if (search) {
            const tr = (s) => String(s || '').toLowerCase()
                .replace(/[ışçöüğİ]/g, c => ({ ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', İ: 'i' })[c] || c);
            const q = tr(search);
            list = list.filter((e) => tr(e.name).includes(q) || tr(e.department).includes(q));
        }
        list.sort((a, b) => {
            switch (sortBy) {
                case 'annual_remaining_desc': return b.annual.remaining - a.annual.remaining;
                case 'annual_remaining_asc': return a.annual.remaining - b.annual.remaining;
                case 'annual_used_desc': return b.annual.used_this_year - a.annual.used_this_year;
                case 'excuse_remaining_desc': return b.excuse.remaining - a.excuse.remaining;
                case 'excuse_used_desc': return b.excuse.used - a.excuse.used;
                case 'name': return String(a.name).localeCompare(String(b.name), 'tr');
                case 'department':
                    return String(a.department).localeCompare(String(b.department), 'tr')
                        || (b.annual.remaining - a.annual.remaining);
                default: return 0;
            }
        });
        return list;
    }, [employees, search, sortBy, selectedDepts, showDeptFilter]);

    const toggleDept = (dept) => {
        setSelectedDepts((prev) => prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]);
    };

    const columns = [
        {
            title: 'Çalışan',
            dataIndex: 'name',
            sorter: (a, b) => String(a.name).localeCompare(String(b.name), 'tr'),
            render: (v) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm flex-shrink-0 bg-slate-500">
                        {initials(v)}
                    </div>
                    <span className="font-semibold text-slate-700 text-[13px]">{v}</span>
                </div>
            ),
        },
        {
            title: 'Departman',
            dataIndex: 'department',
            render: (v) => <span className="text-slate-500 text-[12px]">{v || '—'}</span>,
        },
        {
            title: <span className="font-semibold text-[12px] text-blue-700">Yıllık Bu Yıl Kull.</span>,
            key: 'annual_used',
            align: 'right',
            sorter: (a, b) => a.annual.used_this_year - b.annual.used_this_year,
            render: (_, row) => (
                <span className="tabular-nums text-blue-600 text-[12px]">{row.annual.used_this_year} g</span>
            ),
        },
        {
            title: <span className="font-semibold text-[12px] text-blue-700">Yıllık Kalan</span>,
            key: 'annual_remaining',
            align: 'right',
            sorter: (a, b) => a.annual.remaining - b.annual.remaining,
            defaultSortOrder: 'descend',
            render: (_, row) => (
                <span className="font-bold tabular-nums text-blue-800 text-[13px]">{row.annual.remaining} g</span>
            ),
        },
        {
            title: <span className="font-semibold text-[12px] text-amber-700">Mazeret Hak</span>,
            key: 'excuse_entitled',
            align: 'right',
            render: (_, row) => (
                <span className="tabular-nums text-amber-600 text-[12px]">{row.excuse.entitled} sa</span>
            ),
        },
        {
            title: <span className="font-semibold text-[12px] text-amber-700">Mazeret Bu Yıl Kull.</span>,
            key: 'excuse_used',
            align: 'right',
            sorter: (a, b) => a.excuse.used - b.excuse.used,
            render: (_, row) => (
                <span className="tabular-nums text-amber-600 text-[12px]">{row.excuse.used} sa</span>
            ),
        },
        {
            title: <span className="font-semibold text-[12px] text-amber-700">Mazeret Kalan</span>,
            key: 'excuse_remaining',
            align: 'right',
            sorter: (a, b) => a.excuse.remaining - b.excuse.remaining,
            render: (_, row) => (
                <span className="font-bold tabular-nums text-amber-800 text-[13px]">{row.excuse.remaining} sa</span>
            ),
        },
        {
            title: 'Görsel',
            key: 'bars',
            align: 'center',
            render: (_, row) => <LeaveBars row={row} />,
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="92%"
            style={{ top: 24, maxWidth: 1500 }}
            styles={{
                body: { padding: 0, background: 'linear-gradient(180deg, #fffbf3 0%, #ffffff 60%)' },
                content: { padding: 0, overflow: 'hidden', borderRadius: 20 },
            }}
            closeIcon={null}
            destroyOnClose
            centered={false}
        >
            <div className="relative px-7 pt-5 pb-4 border-b border-slate-200/60 bg-gradient-to-br from-amber-50/40 via-white to-blue-50/30">
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all backdrop-blur-sm"
                    >
                        <CloseIcon size={14} className="text-slate-500" />
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 rounded-md bg-amber-100/80">
                        <Coins size={12} className="text-amber-700" />
                    </div>
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-[0.2em]">
                        İzin Bakiyesi
                    </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
                    İzin Bakiyesi Detayı
                </h2>
                <p className="text-[12px] text-slate-500 max-w-2xl">
                    PRIMARY ekibinizdeki çalışanların yıllık izin (gün) ve mazeret izni (saat) durumu.
                    Birikmiş hak, bu yıl kullanılan ve kalan bakiyeler kişi bazlı.
                </p>
            </div>

            <div className="px-7 py-5 space-y-5">
                {loading && (
                    <div className="text-center py-10 text-slate-500">Yükleniyor...</div>
                )}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
                        Hata: {error}
                    </div>
                )}
                {!loading && !error && data && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Calendar size={11} className="text-blue-500" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Toplam Yıllık Kalan</span>
                                </div>
                                <div className="text-3xl font-black text-blue-800 tabular-nums">{summary.total_annual_remaining || 0}<span className="text-base text-slate-400 ml-1">gün</span></div>
                                <div className="text-[10px] text-slate-500 mt-1">Ort. {summary.avg_annual_per_employee || 0} g/kişi</div>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Clock size={11} className="text-amber-500" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Toplam Mazeret Kalan</span>
                                </div>
                                <div className="text-3xl font-black text-amber-800 tabular-nums">{summary.total_excuse_remaining || 0}<span className="text-base text-slate-400 ml-1">sa</span></div>
                                <div className="text-[10px] text-slate-500 mt-1">Ort. {summary.avg_excuse_per_employee || 0} sa/kişi</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Çalışan</span>
                                </div>
                                <div className="text-3xl font-black text-slate-800 tabular-nums">{summary.total_employees || 0}<span className="text-base text-slate-400 ml-1">kişi</span></div>
                            </div>
                        </div>

                        {showDeptFilter && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <Building2 size={13} className="text-amber-600" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Departman Filtresi</span>
                                    {selectedDepts.length > 0 && (
                                        <button onClick={() => setSelectedDepts([])}
                                            className="ml-auto text-[10px] font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1"
                                        >
                                            <CloseIcon size={10} /> Tümünü Sıfırla
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {departmentList.map((d) => {
                                        const isActive = selectedDepts.length === 0 || selectedDepts.includes(d.name);
                                        return (
                                            <button key={d.name} onClick={() => toggleDept(d.name)}
                                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${isActive
                                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                {d.name}
                                                <span className="ml-1.5 text-[9px] tabular-nums opacity-70">({d.count})</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2.5 flex-wrap p-3 rounded-xl bg-slate-50/60 border border-slate-200/60">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                                <FilterIcon size={11} /> Filtre
                            </div>
                            <Input
                                placeholder="Çalışan veya departman ara..."
                                prefix={<SearchIcon size={12} className="text-slate-400" />}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-xs"
                                allowClear
                                size="small"
                            />
                            <Segmented
                                value={sortBy}
                                onChange={setSortBy}
                                size="small"
                                options={[
                                    { value: 'annual_remaining_desc', label: <span className="flex items-center gap-1 text-[11px]"><SortDesc size={10} /> Yıllık Kalan</span> },
                                    { value: 'annual_remaining_asc', label: <span className="flex items-center gap-1 text-[11px]"><SortAsc size={10} /> Yıllık Kalan</span> },
                                    { value: 'annual_used_desc', label: <span className="text-[11px]">Yıllık Kullan.</span> },
                                    { value: 'excuse_remaining_desc', label: <span className="text-[11px]">Mazeret Kalan</span> },
                                    { value: 'excuse_used_desc', label: <span className="text-[11px]">Mazeret Kullan.</span> },
                                    { value: 'name', label: <span className="text-[11px]">Ad</span> },
                                    { value: 'department', label: <span className="text-[11px]">Dept</span> },
                                ]}
                            />
                            <span className="ml-auto text-[10px] text-slate-500">
                                Gösterilen: <span className="font-bold text-slate-700 tabular-nums">{filtered.length}</span> / {employees.length}
                            </span>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            {filtered.length === 0 ? (
                                <div className="py-10">
                                    <Empty description={
                                        (search || selectedDepts.length > 0)
                                            ? "Eşleşen çalışan yok"
                                            : "Ekibinizde çalışan yok"
                                    } />
                                </div>
                            ) : (
                                <Table
                                    columns={columns}
                                    dataSource={filtered}
                                    rowKey={(r) => r.employee_id}
                                    pagination={false}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
