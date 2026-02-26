import React from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, format } from 'date-fns';
import { Spin } from 'antd';

/**
 * Saniye cinsinden sureyi okunabilir formata cevirir.
 * Ornek: 3660 -> "1s1dk", 7200 -> "2s", 1800 -> "30dk"
 */
const formatHours = (sec) => {
    if (!sec || sec < 60) return null;
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if (h === 0) return `${m}dk`;
    if (m === 0) return `${h}s`;
    return `${h}s${m}dk`;
};

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/**
 * getDay(date) => 0=Pazar, 1=Pazartesi ... 6=Cumartesi
 * Biz Pazartesi=0, Pazar=6 istiyoruz.
 */
const getMondayBasedIndex = (date) => {
    const d = getDay(date);
    return d === 0 ? 6 : d - 1;
};

/**
 * Bir gun icin arka plan ve border siniflarini belirler.
 * Oncelik: leave > missing > has_ot_request > normal veri > hafta sonu > bos
 */
const getDayStyles = (data, isWeekend) => {
    const hasStats = data.normal > 0 || data.ot > 0 || data.missing > 0;
    const hasLeave = data.leave;
    const hasOtReq = data.has_ot_request;

    // Izin gunu — mavi
    if (hasLeave) {
        return 'bg-blue-50 border-blue-200';
    }

    // Eksik saat — kirmizi
    if (data.missing > 0) {
        return 'bg-red-50 border-red-200';
    }

    // Mesai talebi — amber/sari
    if (hasOtReq) {
        return 'bg-amber-50 border-amber-200';
    }

    // Normal is gunu, veri var — yesil
    if (hasStats) {
        return 'bg-emerald-50 border-emerald-200';
    }

    // Hafta sonu, kayit yok — gri
    if (isWeekend) {
        return 'bg-slate-50 border-slate-100';
    }

    // Kayit yok — beyaz
    return 'bg-white border-slate-100';
};

export default function CalendarGrid({
    currentMonth,
    monthlyData = {},
    selectedDate,
    onDayClick,
    loading,
}) {
    if (loading) {
        return (
            <div className="h-[300px] md:h-[450px] flex items-center justify-center">
                <Spin size="large" tip="Takvim yükleniyor..." />
            </div>
        );
    }

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Ayin ilk gununden once kac bos hucre gerekiyor (Pazartesi bazli)
    const paddingCount = getMondayBasedIndex(monthStart);
    const paddingArray = Array(paddingCount).fill(null);

    const today = new Date();

    return (
        <div>
            {/* Hafta gunu basliklari */}
            <div className="grid grid-cols-7 mb-3 border-b pb-2">
                {WEEKDAY_LABELS.map((d) => (
                    <div
                        key={d}
                        className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider"
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* Takvim grid */}
            <div className="grid grid-cols-7 gap-2 md:gap-3">
                {/* Bos padding hucreleri */}
                {paddingArray.map((_, i) => (
                    <div key={`pad-${i}`} />
                ))}

                {/* Gun kartlari */}
                {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isToday = isSameDay(day, today);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const dayOfWeek = getDay(day);
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                    const data = monthlyData[dateStr] || {
                        normal: 0,
                        ot: 0,
                        missing: 0,
                        status: null,
                        leave: null,
                        has_ot_request: false,
                    };
                    const hasStats = data.normal > 0 || data.ot > 0 || data.missing > 0;
                    const hasLeave = data.leave;
                    const hasOtReq = data.has_ot_request;

                    const bgBorderClass = getDayStyles(data, isWeekend);

                    // Secili gun ve bugun ring'leri
                    let ringClass = '';
                    if (isSelected) {
                        ringClass = 'ring-2 ring-blue-500 border-blue-500';
                    } else if (isToday) {
                        ringClass = 'ring-2 ring-indigo-300';
                    }

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => onDayClick?.(day)}
                            className={`
                                relative min-h-[90px] md:min-h-[100px] border rounded-xl p-2 md:p-2.5
                                cursor-pointer transition-all duration-150
                                hover:scale-[1.03] hover:shadow-md group
                                ${bgBorderClass}
                                ${ringClass}
                                ${!isSelected && !isToday ? 'hover:border-blue-300' : ''}
                            `}
                        >
                            {/* Ust satir: Gun numarasi + Badge'ler */}
                            <div className="flex justify-between items-start mb-1">
                                <span
                                    className={`text-sm md:text-base font-bold leading-none ${
                                        isWeekend ? 'text-red-400' : 'text-slate-700'
                                    }`}
                                >
                                    {format(day, 'd')}
                                </span>

                                <div className="flex gap-0.5 flex-wrap justify-end">
                                    {hasLeave && (
                                        <span className="text-[7px] md:text-[8px] px-1 py-0.5 rounded font-bold bg-green-100 text-green-700">
                                            IZIN
                                        </span>
                                    )}
                                    {hasOtReq && (
                                        <span className="text-[7px] md:text-[8px] px-1 py-0.5 rounded font-bold bg-amber-100 text-amber-700">
                                            FM
                                        </span>
                                    )}
                                    {data.status === 'MANUAL' && (
                                        <span className="text-[7px] md:text-[8px] px-1 py-0.5 rounded font-bold bg-purple-100 text-purple-700">
                                            MANUAL
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Izin tipi badge */}
                            {hasLeave && (
                                <div
                                    className={`text-[8px] md:text-[9px] px-1.5 py-0.5 rounded mb-1 font-medium truncate ${
                                        hasLeave.status === 'APPROVED'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                >
                                    {hasLeave.type}
                                </div>
                            )}

                            {/* Istatistik badge'leri */}
                            {hasStats ? (
                                <div className="space-y-0.5 mt-auto">
                                    {data.normal > 0 && (
                                        <div className="bg-green-50 text-green-700 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded flex justify-between font-medium">
                                            <span>N:</span>
                                            <span>{formatHours(data.normal)}</span>
                                        </div>
                                    )}
                                    {data.ot > 0 && (
                                        <div className="bg-amber-50 text-amber-700 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded flex justify-between font-medium">
                                            <span>FM:</span>
                                            <span>{formatHours(data.ot)}</span>
                                        </div>
                                    )}
                                    {data.missing > 0 && (
                                        <div className="bg-red-50 text-red-700 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded flex justify-between font-medium">
                                            <span>E:</span>
                                            <span>{formatHours(data.missing)}</span>
                                        </div>
                                    )}
                                </div>
                            ) : !hasLeave ? (
                                <div className="flex justify-center items-center h-full pb-4 text-[10px] md:text-xs text-slate-300 group-hover:text-blue-500 font-medium mt-2">
                                    Kayıt Yok
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
