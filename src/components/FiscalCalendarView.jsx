import React, { useState, useEffect } from 'react';
import api from '../services/api';
import moment from 'moment';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import DailyConfigModal from './DailyConfigModal';
import TemplatePicker from './TemplatePicker';

const FiscalCalendarView = ({
    calendarId,
    // Paint mode props
    paintMode = false,
    templates = [],
    dayAssignments = {},       // { 'YYYY-MM-DD': { template_id, template_name, template_color } }
    defaultTemplateColor = '#3b82f6',
    onPaintDay,                // (dateStr, templateId|null) => void
    onBulkPaint,               // (startDate, endDate, templateId|null) => void
    year: externalYear,        // optional controlled year
    onYearChange,              // optional year change callback
}) => {
    const [internalYear, setInternalYear] = useState(new Date().getFullYear());
    const year = externalYear || internalYear;
    const setYear = onYearChange || setInternalYear;

    const [holidays, setHolidays] = useState(new Set());
    const [overrides, setOverrides] = useState({});
    const [loading, setLoading] = useState(false);

    // Paint mode state
    const [selectedBrushId, setSelectedBrushId] = useState(null);
    const [eraserActive, setEraserActive] = useState(false);
    const [bulkStart, setBulkStart] = useState('');
    const [bulkEnd, setBulkEnd] = useState('');

    // Override mode state
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        fetchData();
    }, [year, calendarId]);

    // Auto-select first template as brush
    useEffect(() => {
        if (paintMode && templates.length > 0 && !selectedBrushId) {
            setSelectedBrushId(templates[0].id);
        }
    }, [paintMode, templates]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const startStr = `${year}-01-01`;
            const endStr = `${year}-12-31`;
            const calParam = calendarId ? `&calendar=${calendarId}` : '';

            const requests = [
                api.get(`/calendar-events/?start=${startStr}&end=${endStr}&view_mode=all`)
            ];

            if (!paintMode) {
                requests.push(api.get(`/attendance/daily-overrides/?start_date=${startStr}&end_date=${endStr}${calParam}`));
            }

            const responses = await Promise.all(requests);

            const hSet = new Set();
            responses[0].data.filter(e => e.status === 'HOLIDAY').forEach(e => {
                hSet.add(moment(e.start).format('YYYY-MM-DD'));
            });
            setHolidays(hSet);

            if (!paintMode && responses[1]) {
                const ovMap = {};
                responses[1].data.forEach(o => { ovMap[o.date] = o; });
                setOverrides(ovMap);
            }
        } catch (error) {
            console.error("Calendar data error:", error);
        } finally {
            setLoading(false);
        }
    };

    const getMonths = () => {
        return Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            name: moment().month(i).format('MMMM'),
            start: moment([year, i, 1]),
            end: moment([year, i, 1]).endOf('month')
        }));
    };

    const getDaysArray = (start, end) => {
        const arr = [];
        const dt = start.clone();
        while (dt <= end) { arr.push(dt.clone()); dt.add(1, 'd'); }
        return arr;
    };

    const handleDayClick = (dateStr) => {
        if (paintMode) {
            if (eraserActive) {
                onPaintDay && onPaintDay(dateStr, null);
            } else if (selectedBrushId) {
                onPaintDay && onPaintDay(dateStr, selectedBrushId);
            }
        } else {
            setSelectedDate(moment(dateStr).toDate());
            setShowConfigModal(true);
        }
    };

    const handleNewClick = () => {
        setSelectedDate(null);
        setShowConfigModal(true);
    };

    const handleDeleteOverride = async (override) => {
        if (!window.confirm(`${moment(override.date).format('DD MMMM YYYY')} tarihindeki ozel ayar silinecek. Emin misiniz?`)) return;
        try {
            await api.delete(`/attendance/daily-overrides/${override.id}/`);
            await fetchData();
        } catch (error) {
            alert('Silme hatasi: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleBulkAssign = () => {
        if (!bulkStart || !bulkEnd) return;
        if (eraserActive) {
            onBulkPaint && onBulkPaint(bulkStart, bulkEnd, null);
        } else if (selectedBrushId) {
            onBulkPaint && onBulkPaint(bulkStart, bulkEnd, selectedBrushId);
        }
    };

    const handleMonthPaint = (monthIndex) => {
        // monthIndex is 0-based (0=Jan, 11=Dec)
        const start = moment([year, monthIndex, 1]).format('YYYY-MM-DD');
        const end = moment([year, monthIndex, 1]).endOf('month').format('YYYY-MM-DD');
        if (eraserActive) {
            onBulkPaint && onBulkPaint(start, end, null);
        } else if (selectedBrushId) {
            onBulkPaint && onBulkPaint(start, end, selectedBrushId);
        }
    };

    const overrideList = Object.values(overrides).sort((a, b) => a.date.localeCompare(b.date));

    const renderMonth = (monthData) => {
        const days = getDaysArray(monthData.start, monthData.end);
        const firstDayOfWeek = monthData.start.isoWeekday();
        const emptySlots = firstDayOfWeek - 1;

        return (
            <div key={monthData.month} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div
                    className={`p-2.5 bg-slate-50 border-b border-slate-100 ${paintMode && (selectedBrushId || eraserActive) ? 'cursor-pointer hover:bg-indigo-50 transition-colors group' : ''}`}
                    onClick={() => paintMode && (selectedBrushId || eraserActive) && handleMonthPaint(monthData.month - 1)}
                    title={paintMode && (selectedBrushId || eraserActive) ? `Tüm ${monthData.name} ayını boya` : undefined}
                >
                    <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                        {monthData.name} {year}
                        {paintMode && (selectedBrushId || eraserActive) && (
                            <span className="text-[10px] font-normal text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                tıkla → tüm ay
                            </span>
                        )}
                    </h3>
                </div>

                <div className="p-2 grid grid-cols-7 gap-0.5 flex-1 content-start">
                    {['Pt', 'Sa', 'Ca', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                        <div key={d} className="text-center text-[10px] text-slate-400 font-bold mb-0.5">{d}</div>
                    ))}

                    {Array.from({ length: emptySlots }, (_, i) => (
                        <div key={`empty-${i}`} className="h-8" />
                    ))}

                    {days.map(day => {
                        const dStr = day.format('YYYY-MM-DD');
                        const isPublicHoliday = holidays.has(dStr);
                        const isWeekend = day.day() === 0 || day.day() === 6;

                        if (paintMode) {
                            const assignment = dayAssignments[dStr];
                            const templateColor = assignment?.template_color || defaultTemplateColor;
                            const hasAssignment = !!assignment;

                            let bgStyle = {};
                            let borderStyle = {};
                            let textClass = 'text-slate-700';

                            if (isPublicHoliday) {
                                bgStyle = { backgroundColor: '#fef2f2' };
                                borderStyle = { borderColor: '#fecaca' };
                                textClass = 'text-red-600 font-bold';
                            } else if (hasAssignment) {
                                bgStyle = { backgroundColor: templateColor + '18' };
                                borderStyle = { borderColor: templateColor + '60' };
                                textClass = 'font-medium';
                            } else if (isWeekend) {
                                bgStyle = { backgroundColor: defaultTemplateColor + '08' };
                                borderStyle = { borderColor: defaultTemplateColor + '20' };
                                textClass = 'text-slate-400';
                            } else {
                                bgStyle = { backgroundColor: defaultTemplateColor + '0A' };
                                borderStyle = { borderColor: 'transparent' };
                            }

                            let tooltipText = dStr;
                            if (assignment) tooltipText += `\nŞablon: ${assignment.template_name}`;
                            if (isPublicHoliday) tooltipText += '\nResmi Tatil';

                            return (
                                <div
                                    key={dStr}
                                    onClick={() => handleDayClick(dStr)}
                                    className={`${textClass} border rounded-md p-0.5 text-center text-[11px] cursor-pointer transition-all flex items-center justify-center h-8 relative hover:shadow-sm hover:scale-105`}
                                    style={{ ...bgStyle, ...borderStyle }}
                                    title={tooltipText}
                                >
                                    <span>{day.date()}</span>
                                    {hasAssignment && (
                                        <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: templateColor }} />
                                    )}
                                </div>
                            );
                        } else {
                            // OVERRIDE MODE
                            const override = overrides[dStr];
                            let bgClass = "bg-white hover:bg-slate-50 text-slate-700";
                            let borderClass = "border-transparent";

                            if (override) {
                                if (override.is_off) {
                                    bgClass = "bg-red-50 text-red-600 font-bold";
                                    borderClass = "border-red-200";
                                } else {
                                    bgClass = "bg-emerald-50 text-emerald-700 font-bold";
                                    borderClass = "border-emerald-200";
                                }
                            } else if (isPublicHoliday) {
                                bgClass = "bg-red-50 text-red-600 font-bold";
                                borderClass = "border-red-100";
                            } else if (isWeekend) {
                                bgClass = "bg-slate-100/50 text-slate-400";
                            }

                            let tooltipText = dStr;
                            if (override && !override.is_off) {
                                tooltipText = `${dStr}\nMesai: ${override.start_time?.slice(0,5) || '?'} - ${override.end_time?.slice(0,5) || '?'}`;
                                if (override.lunch_start && override.lunch_end) {
                                    tooltipText += `\nOgle: ${override.lunch_start.slice(0,5)} - ${override.lunch_end.slice(0,5)}`;
                                }
                                if (override.description) tooltipText += `\n${override.description}`;
                            } else if (override?.is_off) {
                                tooltipText = `${dStr}\nTATIL${override.description ? ': ' + override.description : ''}`;
                            } else if (isPublicHoliday) {
                                tooltipText = `${dStr}\nResmi Tatil`;
                            }

                            return (
                                <div
                                    key={dStr}
                                    onClick={() => handleDayClick(dStr)}
                                    className={`${bgClass} border ${borderClass} rounded-md p-0.5 text-center text-[11px] cursor-pointer transition-all flex flex-col items-center justify-center h-8 relative group`}
                                    title={tooltipText}
                                >
                                    <span>{day.date()}</span>
                                    {override && !override.is_off && (
                                        <Clock size={6} className="absolute bottom-0 right-0.5 text-emerald-600" />
                                    )}
                                    {(override?.is_off || isPublicHoliday) && (
                                        <span className="w-1 h-1 bg-red-400 rounded-full absolute bottom-0"></span>
                                    )}
                                </div>
                            );
                        }
                    })}
                </div>
            </div>
        );
    };

    const months = getMonths();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Paint Mode Toolbar */}
            {paintMode && (
                <div className="mb-4 space-y-3">
                    <TemplatePicker
                        templates={templates}
                        selectedId={selectedBrushId}
                        onSelect={(id) => { setSelectedBrushId(id); setEraserActive(false); }}
                        eraserActive={eraserActive}
                        onEraserToggle={() => { setEraserActive(!eraserActive); setSelectedBrushId(null); }}
                    />

                    {/* Bulk Assignment */}
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200 flex-wrap">
                        <span className="text-xs font-bold text-slate-500">Toplu Atama:</span>
                        <input type="date" value={bulkStart} onChange={e => setBulkStart(e.target.value)}
                            className="px-2 py-1 border rounded text-xs focus:ring-1 ring-indigo-500 outline-none" />
                        <span className="text-slate-400">-</span>
                        <input type="date" value={bulkEnd} onChange={e => setBulkEnd(e.target.value)}
                            className="px-2 py-1 border rounded text-xs focus:ring-1 ring-indigo-500 outline-none" />
                        <button onClick={handleBulkAssign}
                            disabled={!bulkStart || !bulkEnd || (!selectedBrushId && !eraserActive)}
                            className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                            Uygula
                        </button>

                        <div className="w-px h-5 bg-slate-300 mx-1" />
                        <span className="text-xs font-bold text-slate-500">Hızlı Ay:</span>
                        <div className="flex gap-1 flex-wrap">
                            {Array.from({ length: 12 }, (_, i) => (
                                <button key={i} onClick={() => handleMonthPaint(i)}
                                    disabled={!selectedBrushId && !eraserActive}
                                    className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-30 transition-colors"
                                    title={`${moment().month(i).format('MMMM')} ${year} — tüm ayı boya`}>
                                    {moment().month(i).format('MMM')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Override Mode Toolbar */}
            {!paintMode && (
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setYear(year - 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                                <ChevronLeft size={18} />
                            </button>
                            <span className="px-3 font-bold text-lg text-slate-800">{year}</span>
                            <button onClick={() => setYear(year + 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <button onClick={handleNewClick}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                            <Plus size={16} /> Yeni Ekle
                        </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-200 inline-flex items-center justify-center"><Clock size={5} className="text-emerald-600" /></span>
                            Ozel Mesai
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-red-50 border border-red-200"></span>
                            Tatil
                        </div>
                    </div>
                </div>
            )}

            {/* Year Navigation for Paint Mode */}
            {paintMode && (
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setYear(year - 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                            <ChevronLeft size={18} />
                        </button>
                        <span className="px-3 font-bold text-lg text-slate-800">{year}</span>
                        <button onClick={() => setYear(year + 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 ml-auto">
                        {templates.map(t => (
                            <div key={t.id} className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                                {t.name}
                            </div>
                        ))}
                        <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-red-50 border border-red-200"></span>
                            Resmi Tatil
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar Grid */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">Yukleniyor...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {months.map(renderMonth)}
                </div>
            )}

            {/* Override List Table (only in override mode) */}
            {!paintMode && (
                <div className="mt-6">
                    <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                        <CalendarIcon size={16} className="text-indigo-600" />
                        Tanimli Ozel Gunler
                        {overrideList.length > 0 && (
                            <span className="text-xs font-normal text-slate-400">({overrideList.length} kayit)</span>
                        )}
                    </h4>

                    {overrideList.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                            <p className="text-sm text-slate-500">Henuz ozel gun tanimlanmamis.</p>
                            <p className="text-xs text-slate-400 mt-1">Takvimden bir gune tiklayarak veya "Yeni Ekle" butonu ile baslayabilirsiniz.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Tarih</th>
                                        <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Durum</th>
                                        <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Saatler</th>
                                        <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Aciklama</th>
                                        <th className="text-right px-4 py-2.5 font-bold text-slate-600 text-xs">Islemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {overrideList.map(ov => (
                                        <tr key={ov.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-2.5 font-medium text-slate-800">
                                                {moment(ov.date).format('DD MMM YYYY, ddd')}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                {ov.is_off ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                                                        Tatil
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <Clock size={10} /> Ozel Mesai
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-600">
                                                {ov.is_off ? (
                                                    <span className="text-slate-400">-</span>
                                                ) : (
                                                    <span>
                                                        {ov.start_time?.slice(0,5) || '?'} - {ov.end_time?.slice(0,5) || '?'}
                                                        {ov.lunch_start && ov.lunch_end && (
                                                            <span className="text-slate-400 ml-2 text-xs">
                                                                (Ogle: {ov.lunch_start.slice(0,5)}-{ov.lunch_end.slice(0,5)})
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[200px] truncate">
                                                {ov.description || '-'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleDayClick(ov.date)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Duzenle"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteOverride(ov)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Config Modal (only in override mode) */}
            {!paintMode && showConfigModal && (
                <DailyConfigModal
                    date={selectedDate}
                    calendarId={calendarId}
                    initialOverride={selectedDate ? overrides[moment(selectedDate).format('YYYY-MM-DD')] : null}
                    isHoliday={selectedDate ? holidays.has(moment(selectedDate).format('YYYY-MM-DD')) : false}
                    onClose={() => setShowConfigModal(false)}
                    onSuccess={() => {
                        setShowConfigModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default FiscalCalendarView;
