import React, { useState, useEffect, useMemo, useRef } from 'react';
import moment from 'moment';
import api from '../services/api';
import { Filter, Users } from 'lucide-react';

const EVENT_COLORS = {
    LEAVE_REQUEST: { bg: 'bg-cyan-400', text: 'text-cyan-900', border: 'border-cyan-500' },
    EXTERNAL_DUTY: { bg: 'bg-purple-400', text: 'text-purple-900', border: 'border-purple-500' },
    OVERTIME_REQUEST: { bg: 'bg-emerald-400', text: 'text-emerald-900', border: 'border-emerald-500' },
    OVERTIME_PENDING: { bg: 'bg-amber-400', text: 'text-amber-900', border: 'border-amber-500' },
    HEALTH_REPORT: { bg: 'bg-pink-400', text: 'text-pink-900', border: 'border-pink-500' },
    CARDLESS_ENTRY: { bg: 'bg-orange-400', text: 'text-orange-900', border: 'border-orange-500' },
    ABSENCE: { bg: 'bg-red-400', text: 'text-red-900', border: 'border-red-500' },
};

const EVENT_LABELS = {
    LEAVE_REQUEST: 'İzin',
    EXTERNAL_DUTY: 'Dış Görev',
    OVERTIME_REQUEST: 'Ek Mesai',
    HEALTH_REPORT: 'Sağ. Rap.',
    CARDLESS_ENTRY: 'Kartsız',
    ABSENCE: 'Devamsız',
};

const FILTER_CONFIG = [
    { key: 'leaves', label: 'İzinler', activeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { key: 'overtime', label: 'Ek Mesai', activeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'healthReports', label: 'Sağlık Raporu', activeClass: 'bg-pink-50 text-pink-700 border-pink-200' },
    { key: 'cardless', label: 'Kartsız Giriş', activeClass: 'bg-orange-50 text-orange-700 border-orange-200' },
    { key: 'absences', label: 'Devamsızlık', activeClass: 'bg-red-50 text-red-700 border-red-200' },
];

const DAY_WIDTH = 42;
const NAME_WIDTH = 170;
const ROW_HEIGHT = 64;

const TeamTimeline = ({ startDate, endDate }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        leaves: true, overtime: true, healthReports: true, cardless: true, absences: true,
    });
    const [hoveredEvent, setHoveredEvent] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const scrollRef = useRef(null);
    const todayRef = useRef(null);

    // Generate days array for the month
    const days = useMemo(() => {
        const result = [];
        const start = moment(startDate);
        const end = moment(endDate);
        let current = start.clone();
        while (current.isSameOrBefore(end, 'day')) {
            result.push({
                date: current.format('YYYY-MM-DD'),
                day: current.date(),
                dayName: current.format('dd'),
                isWeekend: current.day() === 0 || current.day() === 6,
                isToday: current.isSame(moment(), 'day'),
            });
            current.add(1, 'day');
        }
        return result;
    }, [startDate, endDate]);

    // Holiday sets
    const holidaySet = useMemo(() => {
        if (!data?.holidays) return new Set();
        return new Set(data.holidays.map(h => h.date));
    }, [data]);

    const holidayMap = useMemo(() => {
        if (!data?.holidays) return {};
        const map = {};
        data.holidays.forEach(h => { map[h.date] = h; });
        return map;
    }, [data]);

    useEffect(() => { fetchTimeline(); }, [startDate, endDate, filters]);

    // Scroll to today column on first load
    useEffect(() => {
        if (todayRef.current && scrollRef.current) {
            const containerLeft = scrollRef.current.getBoundingClientRect().left;
            const todayLeft = todayRef.current.getBoundingClientRect().left;
            scrollRef.current.scrollLeft = todayLeft - containerLeft - 200;
        }
    }, [data]);

    const fetchTimeline = async () => {
        setLoading(true);
        try {
            let url = `/calendar-events/team-timeline/?start=${moment(startDate).format('YYYY-MM-DD')}&end=${moment(endDate).format('YYYY-MM-DD')}`;
            if (filters.leaves) url += '&include_leaves=true';
            if (filters.overtime) url += '&include_overtime=true';
            if (filters.healthReports) url += '&include_health_reports=true';
            if (filters.cardless) url += '&include_cardless=true';
            if (filters.absences) url += '&include_absences=true';
            const resp = await api.get(url);
            setData(resp.data);
        } catch (err) {
            console.error('Team timeline error:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFilter = (key) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Convert employee events to renderable bars
    const getEventBars = (events) => {
        if (!events?.length) return [];
        const bars = [];
        const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));

        sorted.forEach(evt => {
            const startIdx = days.findIndex(d => d.date >= evt.start);
            let endIdx = days.findIndex(d => d.date > evt.end);
            if (endIdx === -1) endIdx = days.length;
            if (startIdx === -1 || startIdx >= days.length) return;

            const colorKey = evt.type === 'OVERTIME_REQUEST' && evt.status === 'PENDING' ? 'OVERTIME_PENDING' : evt.type;
            bars.push({
                ...evt,
                startIdx: Math.max(0, startIdx),
                endIdx,
                span: endIdx - Math.max(0, startIdx),
                colorKey,
            });
        });
        return bars;
    };

    const handleMouseEnter = (evt, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
        setHoveredEvent(evt);
    };

    // Loading state
    if (loading && !data) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-slate-500 font-medium">Ekip takvimi yükleniyor...</span>
            </div>
        );
    }

    // Empty state
    if (!data || !data.employees?.length) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
                <Users size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Ekibinizde henüz kimse yok.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-300">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 p-4 border-b border-slate-100 bg-slate-50/50">
                <Filter size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Filtreler:</span>
                {FILTER_CONFIG.map(f => (
                    <button
                        key={f.key}
                        onClick={() => toggleFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            filters[f.key] ? f.activeClass : 'bg-white text-slate-400 border-slate-200'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
                <span className="ml-auto text-xs text-slate-400 font-medium">{data.employees.length} kişi</span>
            </div>

            {/* Timeline Grid */}
            <div className="flex">
                {/* Fixed Name Column */}
                <div className="flex-shrink-0 border-r border-slate-200 bg-white z-10" style={{ width: NAME_WIDTH }}>
                    <div className="h-14 border-b border-slate-200 flex items-end px-3 pb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Çalışan</span>
                    </div>
                    {data.employees.map((emp) => (
                        <div key={emp.id} className="border-b border-slate-100 flex flex-col justify-center px-3 hover:bg-slate-50 transition-colors" style={{ height: ROW_HEIGHT }}>
                            <span className="text-sm font-bold text-slate-800 truncate">{emp.name}</span>
                            <span className="text-[11px] text-slate-400 truncate">{emp.department}</span>
                        </div>
                    ))}
                    <div className="h-12 flex items-center px-3 bg-slate-50 border-t border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Özet</span>
                    </div>
                </div>

                {/* Scrollable Days Area */}
                <div ref={scrollRef} className="flex-1 overflow-x-auto">
                    <div style={{ minWidth: days.length * DAY_WIDTH }}>
                        {/* Day Headers */}
                        <div className="flex h-14 border-b border-slate-200 sticky top-0 bg-white z-10">
                            {days.map((d) => (
                                <div
                                    key={d.date}
                                    ref={d.isToday ? todayRef : null}
                                    className={`flex flex-col items-center justify-end pb-1 border-r border-slate-100 ${
                                        d.isToday ? 'bg-indigo-50' :
                                        holidaySet.has(d.date) ? 'bg-red-50' :
                                        d.isWeekend ? 'bg-slate-50' : ''
                                    }`}
                                    style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                                    title={holidayMap[d.date]?.name || ''}
                                >
                                    <span className={`text-[10px] font-medium ${
                                        d.isToday ? 'text-indigo-600' :
                                        holidaySet.has(d.date) ? 'text-red-500' :
                                        d.isWeekend ? 'text-slate-400' : 'text-slate-400'
                                    }`}>{d.dayName}</span>
                                    <span className={`text-sm font-bold ${
                                        d.isToday ? 'bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center' :
                                        holidaySet.has(d.date) ? 'text-red-600' :
                                        d.isWeekend ? 'text-slate-400' : 'text-slate-700'
                                    }`}>{d.day}</span>
                                </div>
                            ))}
                        </div>

                        {/* Employee Rows */}
                        {data.employees.map((emp) => {
                            const bars = getEventBars(emp.events);
                            return (
                                <div key={emp.id} className="flex border-b border-slate-100 relative" style={{ height: ROW_HEIGHT }}>
                                    {/* Day cell backgrounds */}
                                    {days.map((d) => (
                                        <div
                                            key={d.date}
                                            className={`border-r border-slate-50 ${
                                                d.isToday ? 'bg-indigo-50/30' :
                                                holidaySet.has(d.date) ? 'bg-red-50/30' :
                                                d.isWeekend ? 'bg-slate-50/50' : ''
                                            }`}
                                            style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                                        />
                                    ))}
                                    {/* Event bars */}
                                    <div className="absolute inset-0 flex items-center" style={{ pointerEvents: 'none' }}>
                                        <div className="relative w-full h-12 px-0.5">
                                            {bars.map((bar, idx) => {
                                                const colors = EVENT_COLORS[bar.colorKey] || EVENT_COLORS.LEAVE_REQUEST;
                                                const left = bar.startIdx * DAY_WIDTH + 2;
                                                const width = bar.span * DAY_WIDTH - 4;
                                                const row = idx < 3 ? idx : 2;
                                                const top = row * 15 + 1;
                                                return (
                                                    <div
                                                        key={`${bar.type}-${bar.start}-${idx}`}
                                                        className={`absolute ${colors.bg} ${colors.text} rounded text-[9px] font-bold flex items-center px-1.5 cursor-pointer shadow-sm border ${colors.border} hover:shadow-md hover:brightness-110 transition-all`}
                                                        style={{
                                                            left, top, height: 14,
                                                            width: Math.max(width, DAY_WIDTH - 4),
                                                            opacity: 0.9,
                                                            pointerEvents: 'auto',
                                                        }}
                                                        onMouseEnter={(e) => handleMouseEnter(bar, e)}
                                                        onMouseLeave={() => setHoveredEvent(null)}
                                                    >
                                                        <span className="truncate">
                                                            {EVENT_LABELS[bar.type] || bar.title}
                                                            {bar.total_days > 1 ? ` (${bar.total_days}g)` : ''}
                                                            {bar.duration_hours ? ` ${bar.duration_hours}sa` : ''}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Summary Row */}
                        <div className="flex h-12 bg-slate-50 border-t border-slate-200">
                            {days.map((d) => {
                                const summary = data.daily_summary?.[d.date];
                                const total = summary ? (
                                    (summary.on_leave || 0) + (summary.on_ot || 0) + (summary.absent || 0) +
                                    (summary.on_health_report || 0) + (summary.on_cardless || 0) + (summary.on_external_duty || 0)
                                ) : 0;

                                return (
                                    <div
                                        key={d.date}
                                        className={`border-r border-slate-100 flex flex-col items-center justify-center text-[9px] font-bold ${
                                            d.isToday ? 'bg-indigo-50' : ''
                                        }`}
                                        style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                                        title={summary ? `İzinli: ${summary.on_leave || 0}, OT: ${summary.on_ot || 0}, SR: ${summary.on_health_report || 0}, Devamsız: ${summary.absent || 0}` : ''}
                                    >
                                        {summary?.on_leave > 0 && <span className="text-cyan-600">{summary.on_leave}İ</span>}
                                        {summary?.on_ot > 0 && <span className="text-emerald-600">{summary.on_ot}M</span>}
                                        {summary?.absent > 0 && <span className="text-red-600">{summary.absent}D</span>}
                                        {summary?.on_health_report > 0 && <span className="text-pink-600">{summary.on_health_report}S</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {hoveredEvent && (
                <div
                    className="fixed z-50 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs max-w-xs pointer-events-none"
                    style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}
                >
                    <div className="font-bold">{hoveredEvent.title}</div>
                    <div className="text-slate-300 mt-0.5">
                        {hoveredEvent.start === hoveredEvent.end
                            ? moment(hoveredEvent.start).format('D MMMM')
                            : `${moment(hoveredEvent.start).format('D MMM')} - ${moment(hoveredEvent.end).format('D MMM')}`
                        }
                    </div>
                    {hoveredEvent.duration_hours > 0 && (
                        <div className="text-slate-300">{hoveredEvent.duration_hours} saat</div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs">
                {Object.entries(EVENT_COLORS).filter(([key]) => key !== 'OVERTIME_PENDING').map(([key, c]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <span className={`w-3 h-2 rounded-sm ${c.bg}`}></span>
                        <span className="text-slate-500 font-medium">{EVENT_LABELS[key] || key}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-sm bg-amber-400"></span>
                    <span className="text-slate-500 font-medium">OT Bekleyen</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                    <span className="w-4 h-4 rounded bg-red-50 border border-red-200"></span>
                    <span className="text-slate-500 font-medium">Resmi Tatil</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-indigo-50 border border-indigo-200"></span>
                    <span className="text-slate-500 font-medium">Bugün</span>
                </div>
            </div>
        </div>
    );
};

export default TeamTimeline;
