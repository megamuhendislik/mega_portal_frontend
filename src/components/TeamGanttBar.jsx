import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

const STATUS_CONFIG = {
    LEAVE: {
        color: '#22d3ee',
        bgClass: 'bg-cyan-400',
        label: 'İzin',
    },
    OT: {
        color: '#a78bfa',
        bgClass: 'bg-violet-400',
        label: 'Ek Mesai',
    },
    ABSENT: {
        color: '#f87171',
        bgClass: 'bg-red-400',
        label: 'Devamsız',
    },
    HEALTH: {
        color: '#f472b6',
        bgClass: 'bg-pink-400',
        label: 'Sağlık Raporu',
    },
};

const DAY_COL_WIDTH = 32;
const NAME_COL_MIN_WIDTH = 140;

const TeamGanttBar = ({ startDate, endDate, currentDate }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tooltip, setTooltip] = useState(null);

    // Generate array of days between startDate and endDate
    const days = useMemo(() => {
        const result = [];
        const start = moment(startDate);
        const end = moment(endDate);
        let current = start.clone();
        while (current.isSameOrBefore(end, 'day')) {
            result.push({
                date: current.format('YYYY-MM-DD'),
                dayNum: current.date(),
                dayName: current.format('dd'),
                isWeekend: current.day() === 0 || current.day() === 6,
                isToday: current.isSame(moment(currentDate), 'day'),
            });
            current.add(1, 'day');
        }
        return result;
    }, [startDate, endDate, currentDate]);

    // Build a lookup: employee id -> date -> status
    const statusMap = useMemo(() => {
        if (!data) return {};
        const map = {};

        (data.employees || []).forEach((emp) => {
            const empMap = {};

            // Process events for this employee
            (emp.events || []).forEach((evt) => {
                const evtStart = moment(evt.start);
                const evtEnd = moment(evt.end);
                let day = evtStart.clone();

                while (day.isSameOrBefore(evtEnd, 'day')) {
                    const dateStr = day.format('YYYY-MM-DD');
                    if (evt.type === 'LEAVE_REQUEST') {
                        empMap[dateStr] = 'LEAVE';
                    } else if (evt.type === 'OVERTIME_ASSIGNMENT' || evt.type === 'OVERTIME_REQUEST') {
                        // Only set OT if not already marked as LEAVE
                        if (!empMap[dateStr]) {
                            empMap[dateStr] = 'OT';
                        }
                    } else if (evt.type === 'HEALTH_REPORT') {
                        empMap[dateStr] = 'HEALTH';
                    }
                    day.add(1, 'day');
                }
            });

            // Process ABSENT from daily_summary
            if (data.daily_summary) {
                Object.entries(data.daily_summary).forEach(([dateStr, summary]) => {
                    if (summary.absent > 0 && !empMap[dateStr]) {
                        // Check if this employee is in the absent list for this day.
                        // Since daily_summary is aggregate, we mark absent only if no other status.
                        // We will use a secondary pass below.
                    }
                });
            }

            map[emp.id] = empMap;
        });

        // Second pass: mark ABSENT from daily_summary for employees without events on that day
        // daily_summary is aggregate (count), so we cannot pinpoint which employee is absent.
        // We rely on events; if an employee has no events and daily_summary shows absences,
        // we cannot definitively assign absent to specific employees from aggregate data alone.
        // However, if an employee has an ABSENCE-type event, it would already be handled above.
        // For the aggregate absent count, we skip per-employee assignment as the API
        // response format uses aggregate counts.

        return map;
    }, [data]);

    // Fetch team timeline data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const start = moment(startDate).format('YYYY-MM-DD');
                const end = moment(endDate).format('YYYY-MM-DD');
                const resp = await api.get(`/calendar-events/team-timeline/?start=${start}&end=${end}`);
                setData(resp.data);
            } catch (err) {
                console.error('TeamGanttBar fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate]);

    const getStatusForCell = (empId, dateStr) => {
        return statusMap[empId]?.[dateStr] || null;
    };

    const handleCellMouseEnter = (e, empName, status) => {
        if (!status) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top - 6,
            text: `${empName} - ${STATUS_CONFIG[status]?.label || status}`,
        });
    };

    const handleCellMouseLeave = () => {
        setTooltip(null);
    };

    const employeeCount = data?.employees?.length || 0;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setCollapsed((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer select-none"
            >
                <div className="flex items-center gap-3">
                    <Users size={18} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-700">Ekip Gorunumu</span>
                    {employeeCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                            {employeeCount}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Color Legend */}
                    <div className="hidden sm:flex items-center gap-3">
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <div key={key} className="flex items-center gap-1.5">
                                <span
                                    className={`w-3 h-3 rounded-sm ${cfg.bgClass}`}
                                />
                                <span className="text-[11px] text-slate-500 font-medium">
                                    {cfg.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Chevron */}
                    {collapsed ? (
                        <ChevronDown size={16} className="text-slate-400" />
                    ) : (
                        <ChevronUp size={16} className="text-slate-400" />
                    )}
                </div>
            </button>

            {/* Collapsible Body */}
            {!collapsed && (
                <div className="border-t border-slate-200">
                    {loading && !data && (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                            <span className="ml-2 text-sm text-slate-500">Yukleniyor...</span>
                        </div>
                    )}

                    {!loading && (!data || employeeCount === 0) && (
                        <div className="py-10 text-center">
                            <Users size={36} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm text-slate-400">Ekip verisi bulunamadi.</p>
                        </div>
                    )}

                    {data && employeeCount > 0 && (
                        <div className="flex overflow-x-auto">
                            {/* Sticky left column: employee names */}
                            <div
                                className="flex-shrink-0 border-r border-slate-200 bg-white z-10"
                                style={{ minWidth: NAME_COL_MIN_WIDTH }}
                            >
                                {/* Day header placeholder */}
                                <div className="h-10 border-b border-slate-200 flex items-end px-3 pb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Calisan
                                    </span>
                                </div>
                                {/* Employee name rows */}
                                {data.employees.map((emp) => (
                                    <div
                                        key={emp.id}
                                        className="h-9 flex items-center px-3 border-b border-slate-50 hover:bg-slate-50 transition-colors"
                                    >
                                        <span className="text-xs font-medium text-slate-700 truncate">
                                            {emp.name}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Scrollable day columns */}
                            <div className="flex-1 overflow-x-auto">
                                <div style={{ minWidth: days.length * DAY_COL_WIDTH }}>
                                    {/* Day headers */}
                                    <div className="flex h-10 border-b border-slate-200">
                                        {days.map((d) => (
                                            <div
                                                key={d.date}
                                                className={`flex flex-col items-center justify-end pb-0.5 border-r border-slate-100 ${
                                                    d.isToday
                                                        ? 'bg-indigo-50'
                                                        : d.isWeekend
                                                        ? 'bg-slate-50'
                                                        : ''
                                                }`}
                                                style={{
                                                    width: DAY_COL_WIDTH,
                                                    minWidth: DAY_COL_WIDTH,
                                                }}
                                            >
                                                <span
                                                    className={`text-[9px] font-medium ${
                                                        d.isToday
                                                            ? 'text-indigo-600'
                                                            : d.isWeekend
                                                            ? 'text-slate-400'
                                                            : 'text-slate-400'
                                                    }`}
                                                >
                                                    {d.dayName}
                                                </span>
                                                <span
                                                    className={`text-[11px] font-bold ${
                                                        d.isToday
                                                            ? 'text-indigo-700'
                                                            : d.isWeekend
                                                            ? 'text-slate-400'
                                                            : 'text-slate-600'
                                                    }`}
                                                >
                                                    {d.dayNum}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Employee rows */}
                                    {data.employees.map((emp) => (
                                        <div
                                            key={emp.id}
                                            className="flex h-9 border-b border-slate-50"
                                        >
                                            {days.map((d) => {
                                                const status = getStatusForCell(emp.id, d.date);
                                                const cfg = status ? STATUS_CONFIG[status] : null;

                                                return (
                                                    <div
                                                        key={d.date}
                                                        className={`flex items-center justify-center border-r border-slate-50 ${
                                                            d.isToday
                                                                ? 'bg-indigo-50/40'
                                                                : d.isWeekend
                                                                ? 'bg-slate-50/60'
                                                                : ''
                                                        }`}
                                                        style={{
                                                            width: DAY_COL_WIDTH,
                                                            minWidth: DAY_COL_WIDTH,
                                                        }}
                                                        onMouseEnter={(e) =>
                                                            handleCellMouseEnter(e, emp.name, status)
                                                        }
                                                        onMouseLeave={handleCellMouseLeave}
                                                    >
                                                        {cfg && (
                                                            <div
                                                                className={`w-6 h-6 rounded-md ${cfg.bgClass}`}
                                                                style={{ opacity: 0.85 }}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="fixed z-50 bg-slate-800 text-white px-2.5 py-1.5 rounded-lg shadow-lg text-[11px] font-medium pointer-events-none whitespace-nowrap"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    {tooltip.text}
                </div>
            )}
        </div>
    );
};

export default TeamGanttBar;
