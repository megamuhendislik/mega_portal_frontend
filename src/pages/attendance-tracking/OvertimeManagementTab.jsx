import { useState, useEffect, useCallback, useMemo } from 'react';
import { Select } from 'antd';
import {
  Clock, AlertTriangle, CalendarPlus, Loader2,
  Save, Check, ShieldAlert, Users, X, FileText
} from 'lucide-react';
import api from '../../services/api';
import { getIstanbulToday } from '../../utils/dateUtils';

// ═══════════════════════════════════════════════════
//  FISCAL CALENDAR HELPERS
// ═══════════════════════════════════════════════════

function generateFiscalDays(startDate, endDate) {
  const days = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const todayStr = getIstanbulToday();

  while (current <= end) {
    const dateStr = current.toLocaleDateString('en-CA');
    days.push({
      date: dateStr,
      day: current.getDate(),
      month: current.getMonth() + 1,
      dayOfWeek: (current.getDay() + 6) % 7, // Monday=0, Sunday=6
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      isWeekend: current.getDay() === 0 || current.getDay() === 6,
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function organizeIntoWeeks(days) {
  if (days.length === 0) return [];
  const weeks = [];
  let currentWeek = new Array(7).fill(null);

  const firstDow = days[0].dayOfWeek;
  for (let i = 0; i < firstDow; i++) {
    currentWeek[i] = null;
  }

  for (const day of days) {
    currentWeek[day.dayOfWeek] = day;
    if (day.dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  }

  if (currentWeek.some(d => d !== null)) {
    weeks.push(currentWeek);
  }

  return weeks;
}

const DAY_HEADERS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

function formatShortDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

// ═══════════════════════════════════════════════════
//  STATUS / SOURCE PILL HELPERS
// ═══════════════════════════════════════════════════

const STATUS_STYLES = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  POTENTIAL: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS = {
  APPROVED: 'Onaylı',
  PENDING: 'Bekliyor',
  POTENTIAL: 'Potansiyel',
  REJECTED: 'Reddedildi',
  CANCELLED: 'İptal',
};

const SOURCE_STYLES = {
  INTENDED: 'bg-indigo-100 text-indigo-700',
  POTENTIAL: 'bg-amber-100 text-amber-700',
  MANUAL: 'bg-violet-100 text-violet-700',
};

const SOURCE_LABELS = {
  INTENDED: 'Planlı',
  POTENTIAL: 'Algılanan',
  MANUAL: 'Manuel',
};

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════

export default function OvertimeManagementTab({ employees, onRefresh }) {
  // Employee selection
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // Data state
  const [fiscalPeriod, setFiscalPeriod] = useState(null);
  const [busyDays, setBusyDays] = useState([]);
  const [weeklyOt, setWeeklyOt] = useState(null);
  const [loading, setLoading] = useState(false);

  // Selection state
  const [selectedDates, setSelectedDates] = useState([]);

  // Form state
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [taskDescription, setTaskDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [confirmOverLimit, setConfirmOverLimit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Assignments table state
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // Resolve selected employee object
  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees?.find(e => e.id === selectedEmployeeId) || null;
  }, [selectedEmployeeId, employees]);

  // --- Reset form when employee changes ---
  useEffect(() => {
    setSelectedDates([]);
    setHoursPerDay(2);
    setTaskDescription('');
    setNotes('');
    setError('');
    setSuccess(false);
    setConfirmOverLimit(false);
    setSubmitting(false);
  }, [selectedEmployeeId]);

  // --- Fetch data when employee changes ---
  const fetchData = useCallback(async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);

    try {
      const [fiscalRes, busyRes, weeklyRes] = await Promise.allSettled([
        api.get('/overtime-assignments/fiscal-periods/'),
        api.get(`/overtime-assignments/busy-days/${selectedEmployeeId}/`),
        api.get('/overtime-requests/weekly-ot-status/', {
          params: { employee_id: selectedEmployeeId },
        }),
      ]);

      if (fiscalRes.status === 'fulfilled') {
        setFiscalPeriod(fiscalRes.value.data);
      }
      if (busyRes.status === 'fulfilled') {
        setBusyDays(Array.isArray(busyRes.value.data) ? busyRes.value.data : []);
      }
      if (weeklyRes.status === 'fulfilled') {
        setWeeklyOt(weeklyRes.value.data);
      }
    } catch {
      // Errors handled individually by allSettled
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Fetch assignments for selected employee ---
  const fetchAssignments = useCallback(async () => {
    if (!selectedEmployeeId) return;
    setAssignmentsLoading(true);
    try {
      const res = await api.get('/overtime-requests/', {
        params: {
          employee_id: selectedEmployeeId,
          status: 'APPROVED,PENDING,POTENTIAL',
        },
      });
      const data = res.data?.results || res.data || [];
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // --- Busy days lookup ---
  const busyMap = useMemo(() => {
    const map = {};
    busyDays
      .filter(b => b.status !== 'CANCELLED')
      .forEach(b => { map[b.date] = b; });
    return map;
  }, [busyDays]);

  // --- Calendar generation ---
  const { weeks } = useMemo(() => {
    if (!fiscalPeriod?.current) return { weeks: [] };
    const days = generateFiscalDays(fiscalPeriod.current.start, fiscalPeriod.current.end);
    return { weeks: organizeIntoWeeks(days) };
  }, [fiscalPeriod]);

  // --- Selection handlers ---
  const toggleDate = useCallback((dateStr) => {
    setSelectedDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      }
      return [...prev, dateStr].sort();
    });
    setConfirmOverLimit(false);
    setError('');
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDates([]);
    setConfirmOverLimit(false);
    setError('');
  }, []);

  const removeDate = useCallback((dateStr) => {
    setSelectedDates(prev => prev.filter(d => d !== dateStr));
    setConfirmOverLimit(false);
    setError('');
  }, []);

  // --- Weekly OT calculations ---
  const newHours = selectedDates.length * hoursPerDay;
  const currentUsed = weeklyOt?.used_hours || 0;
  const weeklyLimit = weeklyOt?.limit_hours || 30;
  const isUnlimited = weeklyOt?.is_unlimited || false;
  const projectedTotal = currentUsed + newHours;
  const isOverLimit = !isUnlimited && projectedTotal > weeklyLimit;
  const progressPercent = isUnlimited ? 0 : Math.min(100, (projectedTotal / weeklyLimit) * 100);
  const currentPercent = isUnlimited ? 0 : Math.min(100, (currentUsed / weeklyLimit) * 100);

  const progressColor = useMemo(() => {
    if (isUnlimited) return 'bg-emerald-500';
    const ratio = projectedTotal / weeklyLimit;
    if (ratio > 0.9) return 'bg-red-500';
    if (ratio > 0.7) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [projectedTotal, weeklyLimit, isUnlimited]);

  const currentBarColor = useMemo(() => {
    if (isUnlimited) return 'bg-emerald-500';
    const ratio = currentUsed / weeklyLimit;
    if (ratio > 0.9) return 'bg-red-500';
    if (ratio > 0.7) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [currentUsed, weeklyLimit, isUnlimited]);

  // --- Submit handler ---
  const handleSubmit = async () => {
    setError('');

    if (selectedDates.length === 0) {
      setError('En az bir gün seçiniz.');
      return;
    }
    if (!taskDescription.trim()) {
      setError('Görev açıklaması zorunludur.');
      return;
    }
    if (taskDescription.trim().length > 500) {
      setError('Görev açıklaması en fazla 500 karakter olabilir.');
      return;
    }

    // If over limit and not yet confirmed, set confirm state (first click = amber warning)
    if (isOverLimit && !confirmOverLimit) {
      setConfirmOverLimit(true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employee_id: selectedEmployeeId,
        assignments: selectedDates.map(date => ({
          date,
          max_duration_hours: hoursPerDay,
        })),
        task_description: taskDescription.trim(),
        notes: notes.trim() || '',
      };

      const res = await api.post('/overtime-assignments/bulk-create/', payload);

      if (res.data?.errors?.length) {
        setError(res.data.errors.map(e => e.error || e.detail || JSON.stringify(e)).join('; '));
        setSubmitting(false);
        return;
      }

      // Success state
      setSuccess(true);
      setSubmitting(false);
      onRefresh?.();
      fetchAssignments();
      setTimeout(() => {
        setSuccess(false);
      }, 1500);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        setError(data.errors.map(e => e.error || e.detail || JSON.stringify(e)).join('; '));
      } else {
        setError(data?.error || data?.detail || 'Bir hata oluştu.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- Total calculation text ---
  const totalCalcText = selectedDates.length > 1
    ? `${selectedDates.length} gün × ${hoursPerDay} sa = ${newHours} sa toplam`
    : null;

  // --- Submit button style logic ---
  const getSubmitButtonClasses = () => {
    if (submitting) {
      return 'bg-violet-400 text-white cursor-wait';
    }
    if (isOverLimit && confirmOverLimit) {
      return 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20';
    }
    if (isOverLimit && !confirmOverLimit) {
      return 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20';
    }
    return 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20';
  };

  // --- Render calendar cell ---
  const renderCell = (day, idx) => {
    if (!day) {
      return <div key={`empty-${idx}`} className="h-9" />;
    }

    const isBusy = !!busyMap[day.date];
    const busyInfo = busyMap[day.date];
    const isSelected = selectedDates.includes(day.date);
    const isDisabled = day.isPast || isBusy;

    let cellClasses = 'h-9 w-full rounded-lg text-xs font-bold relative flex items-center justify-center transition-all duration-150 ';

    if (isDisabled && day.isPast) {
      cellClasses += 'bg-slate-100 text-slate-300 cursor-not-allowed';
    } else if (isDisabled && isBusy) {
      cellClasses += 'bg-blue-50 text-blue-400 ring-1 ring-blue-300 cursor-not-allowed';
    } else if (isSelected) {
      cellClasses += 'bg-violet-500 text-white ring-2 ring-violet-400 ring-offset-1 cursor-pointer shadow-sm';
    } else if (day.isWeekend) {
      cellClasses += 'bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer';
    } else {
      cellClasses += 'bg-white text-slate-700 hover:bg-violet-50 hover:text-violet-700 cursor-pointer border border-slate-100';
    }

    if (day.isToday && !isSelected) {
      cellClasses += ' ring-2 ring-violet-300 ring-offset-1';
    }

    return (
      <button
        key={day.date}
        type="button"
        disabled={isDisabled}
        className={cellClasses}
        onClick={() => toggleDate(day.date)}
        title={
          isBusy
            ? `Dolu — ${busyInfo?.manager_name || 'Atanmış'}`
            : day.isPast
            ? 'Geçmiş tarih'
            : isSelected
            ? 'Seçimi kaldır'
            : 'Seç'
        }
      >
        <span>{day.day}</span>
        {isBusy && (
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
        )}
        {isSelected && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-violet-700 flex items-center justify-center">
            <Check size={7} className="text-white" strokeWidth={3} />
          </span>
        )}
      </button>
    );
  };

  // --- Employee select options ---
  const employeeOptions = useMemo(() => {
    if (!employees?.length) return [];
    return employees.map(e => ({
      value: e.id,
      label: `${e.name}${e.department ? ` — ${typeof e.department === 'object' ? e.department.name : e.department}` : ''}`,
    }));
  }, [employees]);

  // ═══════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ===== EMPLOYEE SELECTOR ===== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
          Personel
        </label>
        <Select
          showSearch
          allowClear
          size="large"
          placeholder="Personel seçiniz..."
          optionFilterProp="label"
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          value={selectedEmployeeId}
          onChange={(val) => setSelectedEmployeeId(val ?? null)}
          options={employeeOptions}
          className="w-full"
          style={{ width: '100%' }}
        />
      </div>

      {/* ===== EMPTY STATE (no employee selected) ===== */}
      {!selectedEmployeeId && (
        <div className="bg-white rounded-2xl border border-slate-200/80 py-20 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Users size={28} className="text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-500">
            Ek mesai atamak için bir personel seçin
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Yukarıdaki dropdown'dan bir çalışanı arayabilirsiniz
          </p>
        </div>
      )}

      {/* ===== SUCCESS OVERLAY ===== */}
      {selectedEmployeeId && success && (
        <div className="bg-white rounded-2xl border border-emerald-200 py-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <Check size={32} className="text-emerald-600" strokeWidth={3} />
          </div>
          <p className="text-lg font-bold text-slate-900">Atamalar kaydedildi!</p>
          <p className="text-sm text-slate-500 mt-1">
            {selectedDates.length} gün için ek mesai atandı.
          </p>
        </div>
      )}

      {/* ===== MAIN CONTENT (employee selected, not success) ===== */}
      {selectedEmployeeId && !success && (
        <>
          {/* Loading state */}
          {loading && (
            <div className="bg-white rounded-2xl border border-slate-200/80 py-16 flex items-center justify-center">
              <Loader2 size={24} className="text-violet-500 animate-spin" />
              <span className="ml-2 text-sm text-slate-500">Yükleniyor...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* ===== TWO COLUMN LAYOUT ===== */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ─── LEFT COLUMN: Calendar ─── */}
                <div className="space-y-4">
                  {/* Weekly OT Progress Bar */}
                  {weeklyOt && !isUnlimited && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Haftalık Ek Mesai
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-700">
                            {projectedTotal.toFixed(1)} / {weeklyLimit} sa
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden relative">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${currentBarColor}`}
                            style={{ width: `${currentPercent}%` }}
                          />
                          {newHours > 0 && (
                            <div
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${progressColor} opacity-60`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          )}
                        </div>

                        {/* Breakdown text */}
                        {newHours > 0 && (
                          <div className="text-[10px] text-slate-500">
                            <span className="font-bold text-slate-600">Mevcut: {currentUsed.toFixed(1)} sa</span>
                            <span className="mx-1">+</span>
                            <span className="font-bold text-violet-600">Yeni: {newHours.toFixed(1)} sa</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fiscal Month Calendar Grid */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarPlus size={14} className="text-violet-500" />
                      <span className="text-xs font-bold text-slate-700">
                        {fiscalPeriod?.current
                          ? `${formatShortDate(fiscalPeriod.current.start)} — ${formatShortDate(fiscalPeriod.current.end)}`
                          : 'Mali Dönem'}
                      </span>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1">
                      {DAY_HEADERS.map((name, i) => (
                        <div
                          key={name}
                          className={`text-center text-[10px] font-bold uppercase tracking-wider py-1 ${
                            i >= 5 ? 'text-amber-500' : 'text-slate-400'
                          }`}
                        >
                          {name}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="space-y-1">
                      {weeks.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7 gap-1">
                          {week.map((day, di) => renderCell(day, `${wi}-${di}`))}
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <div className="w-2 h-2 rounded-sm bg-violet-500" /> Seçili
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <div className="w-2 h-2 rounded-sm bg-blue-200 ring-1 ring-blue-300" /> Dolu
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <div className="w-2 h-2 rounded-sm bg-amber-50 border border-amber-200" /> Hafta sonu
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <div className="w-2 h-2 rounded-sm bg-slate-100" /> Geçmiş
                      </div>
                    </div>
                  </div>

                  {/* Selected Dates Summary */}
                  {selectedDates.length > 0 && (
                    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-violet-700">
                          {selectedDates.length} gün seçildi
                        </span>
                        <button
                          onClick={clearSelection}
                          className="text-[10px] font-bold text-violet-500 hover:text-violet-700 transition-colors"
                        >
                          Temizle
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDates.map(dateStr => (
                          <span
                            key={dateStr}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-800 text-[10px] font-bold rounded-full"
                          >
                            {formatShortDate(dateStr)}
                            <button
                              onClick={() => removeDate(dateStr)}
                              className="hover:text-violet-900 transition-colors"
                            >
                              <X size={10} strokeWidth={3} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ─── RIGHT COLUMN: Form ─── */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
                    {/* Selected employee header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-black text-violet-700">
                          {selectedEmployee?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {selectedEmployee?.name || 'Çalışan'}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate">
                          {typeof selectedEmployee?.department === 'object' ? selectedEmployee.department.name : (selectedEmployee?.department || '')}
                        </p>
                      </div>
                    </div>

                    {/* Hours per day */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                        Saat / Gün
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        max="12"
                        step="0.5"
                        value={hoursPerDay}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          setHoursPerDay(isNaN(v) ? 0.5 : Math.max(0.5, Math.min(12, v)));
                          setConfirmOverLimit(false);
                        }}
                        className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none transition-all"
                      />
                      {totalCalcText && (
                        <p className="text-[10px] text-violet-600 font-bold mt-1">{totalCalcText}</p>
                      )}
                    </div>

                    {/* Task description (required) */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                        Görev Açıklaması <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        rows="3"
                        maxLength={500}
                        value={taskDescription}
                        onChange={e => setTaskDescription(e.target.value)}
                        placeholder="Yapılacak işin açıklaması..."
                        className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none transition-all"
                      />
                      <p className="text-[9px] text-slate-400 text-right mt-0.5">
                        {taskDescription.length}/500
                      </p>
                    </div>

                    {/* Notes (optional) */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                        Not (opsiyonel)
                      </label>
                      <textarea
                        rows="2"
                        maxLength={500}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ek notlar..."
                        className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none transition-all"
                      />
                    </div>

                    {/* Limit warning */}
                    {isOverLimit && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />
                          <span className="text-xs font-bold text-red-700">
                            Haftalık limit aşılacak! {projectedTotal.toFixed(1)} / {weeklyLimit} sa ({Math.round(progressPercent)}%)
                          </span>
                        </div>
                        <p className="text-[10px] text-red-600 ml-6">
                          İş Kanunu 41. madde &mdash; haftalık fazla çalışma sınırı riski
                        </p>
                      </div>
                    )}

                    {/* Error */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-red-700">{error}</span>
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || selectedDates.length === 0}
                      className={`w-full py-2.5 font-bold rounded-xl text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${getSubmitButtonClasses()}`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Atanıyor...</span>
                        </>
                      ) : isOverLimit && confirmOverLimit ? (
                        <>
                          <ShieldAlert size={14} />
                          <span>Yine de Ata</span>
                        </>
                      ) : isOverLimit && !confirmOverLimit ? (
                        <>
                          <AlertTriangle size={14} />
                          <span>{selectedDates.length} Gün İçin Ata</span>
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          <span>{selectedDates.length > 0 ? `${selectedDates.length} Gün İçin Ata` : 'Tarih Seçin'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* ===== ASSIGNMENTS & REQUESTS TABLE (full width) ===== */}
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <FileText size={16} className="text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Mevcut Atamalar ve Talepler</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Bu dönem için kayıtlı ek mesai işlemleri</p>
                  </div>
                </div>

                <div className="p-5">
                  {assignmentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="text-violet-500 animate-spin" />
                      <span className="ml-2 text-sm text-slate-500">Yükleniyor...</span>
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <Clock size={20} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Bu dönemde henüz atama/talep yok</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2 px-3">Tarih</th>
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2 px-3">Süre</th>
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2 px-3">Durum</th>
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2 px-3">Kaynak</th>
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2 px-3">Görev</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map((item, idx) => (
                            <tr key={item.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-3 text-xs font-medium text-slate-700">
                                {item.overtime_date || item.date
                                  ? formatShortDate(item.overtime_date || item.date)
                                  : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-xs font-medium text-slate-700">
                                {item.duration_hours != null
                                  ? `${parseFloat(item.duration_hours).toFixed(1)} sa`
                                  : item.max_duration_hours != null
                                  ? `${parseFloat(item.max_duration_hours).toFixed(1)} sa`
                                  : '-'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-500'}`}>
                                  {STATUS_LABELS[item.status] || item.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${SOURCE_STYLES[item.source_type] || 'bg-slate-100 text-slate-500'}`}>
                                  {SOURCE_LABELS[item.source_type] || item.source_type || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-600 max-w-[200px] truncate">
                                {item.task_description || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
