import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'moment/locale/tr';

moment.locale('tr');

const YearCalendar = ({
    year,
    onYearChange,
    holidays = new Set(),
    selectedDates = new Set(),
    onMonthClick,
    onDateClick,
    onRangeSelect, // Callback for range selection (start, end)
    customDayRenderer
}) => {
    // Explicitly defining Turkish months to ensure localization consistency
    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    const currentYear = year || new Date().getFullYear();

    // Drag Selection State
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handlePrevYear = () => {
        if (onYearChange) onYearChange(currentYear - 1);
    };

    const handleNextYear = () => {
        if (onYearChange) onYearChange(currentYear + 1);
    };

    const handleMouseDown = (date) => {
        if (!onRangeSelect) return;
        setDragStart(date);
        setDragEnd(date);
        setIsDragging(true);
    };

    const handleMouseEnter = (date) => {
        if (!isDragging) return;
        setDragEnd(date);
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (onRangeSelect && dragStart && dragEnd) {
            // Ensure chronological order
            const start = moment(dragStart).isBefore(moment(dragEnd)) ? dragStart : dragEnd;
            const end = moment(dragStart).isBefore(moment(dragEnd)) ? dragEnd : dragStart;
            onRangeSelect(start, end);
        }
        setDragStart(null);
        setDragEnd(null);
    };

    // Check Global Mouse Up
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) handleMouseUp();
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isDragging, dragStart, dragEnd]);


    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in duration-500 select-none">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">{currentYear}</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrevYear}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={handleNextYear}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {months.map((monthName, index) => {
                    const monthDate = moment().year(currentYear).month(index);
                    const daysInMonth = monthDate.daysInMonth();
                    const startDay = monthDate.startOf('month').day(); // 0=Sun
                    // Adjust for Monday start (Turkey)
                    const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;

                    const days = [];
                    for (let i = 0; i < adjustedStartDay; i++) days.push(null);
                    for (let i = 1; i <= daysInMonth; i++) days.push(i);

                    return (
                        <div
                            key={monthName}
                            onClick={() => onMonthClick && onMonthClick(monthDate.toDate())}
                            className={`rounded-xl p-4 transition-all border border-transparent ${onMonthClick ? 'cursor-pointer hover:bg-slate-50 hover:border-indigo-100 hover:shadow-sm' : ''}`}
                        >
                            <h3 className={`font-bold text-base text-slate-800 mb-3 ${onMonthClick ? 'group-hover:text-indigo-600' : ''}`}>{monthName}</h3>
                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs">
                                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                                    <span key={d} className="text-slate-400 font-medium py-1">{d}</span>
                                ))}
                                {days.map((d, i) => {
                                    if (!d) return <div key={i}></div>;

                                    const currentDayDate = moment([currentYear, index, d]);
                                    const dateStr = currentDayDate.format('YYYY-MM-DD');

                                    // Optimization: Calculate props efficiently
                                    const isToday = currentDayDate.isSame(moment(), 'day');
                                    const isHoliday = holidays.has(dateStr);
                                    const isSelected = selectedDates.has(dateStr);
                                    const isWeekend = currentDayDate.day() === 0 || currentDayDate.day() === 6;

                                    let isInDragRange = false;
                                    if (isDragging && dragStart && dragEnd) {
                                        const s = moment(dragStart).isBefore(moment(dragEnd)) ? dragStart : dragEnd;
                                        const e = moment(dragStart).isBefore(moment(dragEnd)) ? dragEnd : dragStart;
                                        isInDragRange = currentDayDate.isBetween(moment(s).subtract(1, 'day'), moment(e).add(1, 'day'));
                                    }

                                    return (
                                        <CalendarDay
                                            key={dateStr}
                                            day={d}
                                            dateStr={dateStr}
                                            isToday={isToday}
                                            isHoliday={isHoliday}
                                            isSelected={isSelected}
                                            isWeekend={isWeekend}
                                            isInDragRange={isInDragRange}
                                            onMouseDown={handleMouseDown}
                                            onMouseEnter={handleMouseEnter}
                                            onMouseUp={handleMouseUp}
                                            onDateClick={onDateClick}
                                            isDragging={isDragging} // Passed to prevent click during drag
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Memoized Sub-Component for Performance
// Only re-renders if props change (e.g. isInDragRange toggles)
const CalendarDay = React.memo(({
    day, dateStr, isToday, isHoliday, isSelected, isWeekend, isInDragRange,
    onMouseDown, onMouseEnter, onMouseUp, onDateClick, isDragging
}) => {
    let className = "aspect-square rounded-md flex items-center justify-center transition-all font-medium relative overflow-hidden cursor-pointer";

    if (isInDragRange) {
        className += " bg-indigo-200 text-indigo-800 ring-2 ring-indigo-400 z-10";
    } else if (isSelected) {
        className += " bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200 scale-110 z-10";
    } else if (isToday) {
        className += " bg-indigo-50 text-indigo-700 font-bold border border-indigo-200";
    } else if (isHoliday) {
        className += " bg-red-100 text-red-700 font-bold ring-1 ring-red-200";
    } else if (isWeekend) {
        className += " bg-slate-100 text-slate-500";
    } else {
        className += " text-slate-600 hover:bg-indigo-50";
    }

    return (
        <div
            className={className}
            title={isHoliday ? 'Resmi Tatil' : ''}
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(dateStr);
            }}
            onMouseEnter={() => onMouseEnter(dateStr)}
            onMouseUp={onMouseUp}
            onClick={(e) => {
                e.stopPropagation();
                if (!isDragging && onDateClick) {
                    onDateClick(dateStr);
                }
            }}
        >
            {day}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison if needed, but shallow comparison usually fine for primitives
    return (
        prevProps.isInDragRange === nextProps.isInDragRange &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isHoliday === nextProps.isHoliday &&
        prevProps.dateStr === nextProps.dateStr &&
        prevProps.isDragging === nextProps.isDragging
        // Note: isDragging change will trigger re-render for ALL, which is expected 
        // because we use it in onClick.
        // Optimization: We could remove isDragging from props and check a ref?
        // But drag start/end happens once. The issue was MOUSE MOVE causing re-renders.
    );
});

export default YearCalendar;
