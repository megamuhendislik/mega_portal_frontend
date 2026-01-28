import React, { useMemo } from 'react';
import moment from 'moment';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'moment/locale/tr';

moment.locale('tr');

const YearCalendar = ({
    year,
    onYearChange,
    holidays = new Set(),
    onMonthClick,
    customDayRenderer
}) => {
    // Explicitly defining Turkish months to ensure localization consistency
    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    const currentYear = year || new Date().getFullYear();

    const handlePrevYear = () => {
        if (onYearChange) onYearChange(currentYear - 1);
    };

    const handleNextYear = () => {
        if (onYearChange) onYearChange(currentYear + 1);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in duration-500">
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
                    // 0(Sun) -> 6, 1(Mon) -> 0
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
                                    const isToday = currentDayDate.isSame(moment(), 'day');
                                    const isBeforeToday = currentDayDate.isBefore(moment(), 'day');
                                    const isHoliday = holidays.has(dateStr);
                                    const isWeekend = currentDayDate.day() === 0 || currentDayDate.day() === 6;

                                    let className = "aspect-square rounded-md flex items-center justify-center transition-all font-medium relative overflow-hidden";
                                    let style = {};

                                    if (customDayRenderer) {
                                        // Allow external override if needed
                                    }

                                    // 1. Base Colors
                                    if (isToday) {
                                        className += " bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200";
                                    } else if (isHoliday) {
                                        className += " bg-red-100 text-red-700 font-bold ring-1 ring-red-200";
                                    } else if (isWeekend) {
                                        className += " bg-slate-100 text-slate-500";
                                    } else {
                                        className += " text-slate-600 hover:bg-indigo-50";
                                    }

                                    return (
                                        <div key={i} className={className} style={style} title={isHoliday ? 'Resmi Tatil' : ''}>
                                            {d}
                                        </div>
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

export default YearCalendar;
