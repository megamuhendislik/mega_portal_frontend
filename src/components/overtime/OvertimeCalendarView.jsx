import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Clock, PenLine, Users, RefreshCw
} from 'lucide-react';
import { Select, Progress, Spin, Empty, Modal, Input, message } from 'antd';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import OTDayDetailPanel from './OTDayDetailPanel';
import OverrideConfirmModal from './OverrideConfirmModal';
import CreateAssignmentModal from './CreateAssignmentModal';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DAY_HEADERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// Get current fiscal period based on today's date
function getCurrentFiscalPeriod() {
  const now = new Date();
  // Use Istanbul timezone
  const istanbulStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  const [y, m, d] = istanbulStr.split('-').map(Number);

  // If day >= 26, we're in next month's fiscal period
  if (d >= 26) {
    if (m === 12) return { month: 1, year: y + 1 };
    return { month: m + 1, year: y };
  }
  return { month: m, year: y };
}

// Generate days for a fiscal period (26th of prev month to 25th of target month)
function generateFiscalDays(fiscalMonth, fiscalYear) {
  const days = [];

  // Start: 26th of previous month
  let startMonth = fiscalMonth - 1;
  let startYear = fiscalYear;
  if (startMonth === 0) {
    startMonth = 12;
    startYear = fiscalYear - 1;
  }

  // End: 25th of target month
  const startDate = new Date(startYear, startMonth - 1, 26);
  const endDate = new Date(fiscalYear, fiscalMonth - 1, 25);

  const current = new Date(startDate);
  while (current <= endDate) {
    days.push({
      date: current.toLocaleDateString('en-CA'),
      day: current.getDate(),
      month: current.getMonth() + 1,
      year: current.getFullYear(),
      // Monday=0, Sunday=6
      dayOfWeek: (current.getDay() + 6) % 7,
      isToday: current.toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }),
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
}

// Organize days into weeks (starting Monday)
function organizeIntoWeeks(days) {
  if (days.length === 0) return [];

  const weeks = [];
  let currentWeek = new Array(7).fill(null);

  // Fill in leading empty cells
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

  // Push last partial week if any
  if (currentWeek.some(d => d !== null)) {
    weeks.push(currentWeek);
  }

  return weeks;
}

// Get cell status colors/indicators from calendar data for a given date
function getCellInfo(dateStr, calendarData) {
  if (!calendarData || !calendarData[dateStr]) {
    return { statuses: [], totalHours: 0, hasData: false };
  }

  const dayInfo = calendarData[dateStr];
  const statuses = [];
  let totalHours = 0;

  if (dayInfo.approved_hours > 0) {
    statuses.push('APPROVED');
    totalHours += dayInfo.approved_hours;
  }
  if (dayInfo.pending_hours > 0) {
    statuses.push('PENDING');
    totalHours += dayInfo.pending_hours;
  }
  if (dayInfo.potential_hours > 0) {
    statuses.push('POTENTIAL');
    totalHours += dayInfo.potential_hours;
  }
  if (dayInfo.rejected_hours > 0) {
    statuses.push('REJECTED');
  }
  if (dayInfo.assigned_hours > 0 && !statuses.includes('APPROVED') && !statuses.includes('PENDING')) {
    statuses.push('ASSIGNED');
  }

  return { statuses, totalHours, hasData: true, dayInfo };
}

// Status dot colors
const STATUS_DOT_COLORS = {
  APPROVED: 'bg-emerald-500',
  PENDING: 'bg-amber-400',
  POTENTIAL: 'bg-blue-400',
  REJECTED: 'bg-red-400',
  ASSIGNED: 'bg-purple-400',
};

// Cell background for primary status
function getCellBackground(statuses) {
  if (statuses.length === 0) return '';
  const primary = statuses[0];
  switch (primary) {
    case 'APPROVED': return 'bg-emerald-50 border-emerald-200';
    case 'PENDING': return 'bg-amber-50 border-amber-200';
    case 'POTENTIAL': return 'bg-blue-50 border-blue-200';
    case 'REJECTED': return 'bg-red-50 border-red-200';
    case 'ASSIGNED': return 'bg-purple-50 border-purple-200';
    default: return '';
  }
}

export default function OvertimeCalendarView({ mode = 'personal' }) {
  const { hasPermission, user } = useAuth();
  const isManagerMode = mode === 'manager';

  // Fiscal period state
  const [fiscalPeriod, setFiscalPeriod] = useState(() => getCurrentFiscalPeriod());
  const [availablePeriods, setAvailablePeriods] = useState([]);

  // Data
  const [calendarData, setCalendarData] = useState({});
  const [weeklyOtStatus, setWeeklyOtStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Manager mode: employee selection
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Detail panel
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetailData, setDayDetailData] = useState(null);
  const [dayDetailLoading, setDayDetailLoading] = useState(false);

  // Modals
  const [claimModal, setClaimModal] = useState({ open: false, data: null });
  const [claimReason, setClaimReason] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);

  const [manualModal, setManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ date: '', start_time: '', end_time: '', reason: '' });
  const [manualLoading, setManualLoading] = useState(false);

  const [assignModal, setAssignModal] = useState(false);

  const [overrideModal, setOverrideModal] = useState({ visible: false, assignment: null });

  // Determine target employee id
  const targetEmployeeId = useMemo(() => {
    if (isManagerMode && selectedEmployee) return selectedEmployee;
    if (user?.employee_id) return user.employee_id;
    return null;
  }, [isManagerMode, selectedEmployee, user]);

  // Fetch available fiscal periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await api.get('/overtime-assignments/fiscal-periods/');
        const periods = Array.isArray(res.data) ? res.data : [];
        setAvailablePeriods(periods);
      } catch {
        // Use current period as fallback
        const cur = getCurrentFiscalPeriod();
        setAvailablePeriods([cur]);
      }
    };
    fetchPeriods();
  }, []);

  // Fetch team members for manager mode
  useEffect(() => {
    if (!isManagerMode) return;
    const fetchTeam = async () => {
      try {
        const res = await api.get('/employees/subordinates/');
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setTeamMembers(data);
        // Auto-select first member if none selected
        if (data.length > 0 && !selectedEmployee) {
          setSelectedEmployee(data[0].id);
        }
      } catch (err) {
        console.error('Team fetch error:', err);
      }
    };
    fetchTeam();
  }, [isManagerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch calendar data
  const fetchCalendarData = useCallback(async () => {
    if (!targetEmployeeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {
        employee_id: targetEmployeeId,
        fiscal_month: fiscalPeriod.month,
        fiscal_year: fiscalPeriod.year,
      };
      const [calRes, otRes] = await Promise.allSettled([
        api.get('/overtime-requests/employee-ot-calendar/', { params }),
        api.get(`/overtime-requests/weekly-ot-status/?employee_id=${targetEmployeeId}`),
      ]);

      if (calRes.status === 'fulfilled') {
        setCalendarData(calRes.value.data.calendar || calRes.value.data || {});
      }
      if (otRes.status === 'fulfilled') {
        setWeeklyOtStatus(otRes.value.data);
      }
    } catch (err) {
      console.error('Calendar data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [targetEmployeeId, fiscalPeriod]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Fiscal period navigation
  const canGoPrev = useMemo(() => {
    if (availablePeriods.length === 0) return true;
    const cur = getCurrentFiscalPeriod();
    // Allow going back 1 period from current
    const prevMonth = cur.month === 1 ? 12 : cur.month - 1;
    const prevYear = cur.month === 1 ? cur.year - 1 : cur.year;
    return !(fiscalPeriod.month === prevMonth && fiscalPeriod.year === prevYear);
  }, [fiscalPeriod, availablePeriods]);

  const canGoNext = useMemo(() => {
    const cur = getCurrentFiscalPeriod();
    const nextMonth = cur.month === 12 ? 1 : cur.month + 1;
    const nextYear = cur.month === 12 ? cur.year + 1 : cur.year;
    return !(fiscalPeriod.month === nextMonth && fiscalPeriod.year === nextYear);
  }, [fiscalPeriod]);

  const handlePrevPeriod = () => {
    setFiscalPeriod(prev => {
      const m = prev.month === 1 ? 12 : prev.month - 1;
      const y = prev.month === 1 ? prev.year - 1 : prev.year;
      return { month: m, year: y };
    });
    setSelectedDay(null);
    setDayDetailData(null);
  };

  const handleNextPeriod = () => {
    setFiscalPeriod(prev => {
      const m = prev.month === 12 ? 1 : prev.month + 1;
      const y = prev.month === 12 ? prev.year + 1 : prev.year;
      return { month: m, year: y };
    });
    setSelectedDay(null);
    setDayDetailData(null);
  };

  // Generate calendar grid
  const fiscalDays = useMemo(
    () => generateFiscalDays(fiscalPeriod.month, fiscalPeriod.year),
    [fiscalPeriod]
  );
  const weeks = useMemo(() => organizeIntoWeeks(fiscalDays), [fiscalDays]);

  // Day click handler
  const handleDayClick = useCallback(async (day) => {
    if (!day) return;
    setSelectedDay(day.date);
    setDayDetailLoading(true);

    try {
      const params = {
        employee_id: targetEmployeeId,
        date: day.date,
      };
      const res = await api.get('/overtime-requests/employee-ot-calendar/', {
        params: { ...params, fiscal_month: fiscalPeriod.month, fiscal_year: fiscalPeriod.year }
      });

      const cal = res.data.calendar || res.data || {};
      const dayInfo = cal[day.date] || {};

      setDayDetailData({
        date: day.date,
        requests: dayInfo.requests || [],
        assignments: dayInfo.assignments || [],
        potentials: dayInfo.potentials || [],
      });
    } catch {
      setDayDetailData({
        date: day.date,
        requests: [],
        assignments: [],
        potentials: [],
      });
    } finally {
      setDayDetailLoading(false);
    }
  }, [targetEmployeeId, fiscalPeriod]);

  // Claim potential OT
  const handleClaim = async () => {
    if (!claimModal.data) return;
    setClaimLoading(true);
    try {
      const payload = { reason: claimReason || 'Talep' };
      if (claimModal.data.overtime_request_id) {
        payload.overtime_request_id = claimModal.data.overtime_request_id;
      } else if (claimModal.data.id) {
        payload.overtime_request_id = claimModal.data.id;
      }
      await api.post('/overtime-requests/claim-potential/', payload);
      message.success('Talep başarıyla gönderildi');
      setClaimModal({ open: false, data: null });
      setClaimReason('');
      fetchCalendarData();
      if (selectedDay) {
        handleDayClick({ date: selectedDay });
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Talep hatası');
    } finally {
      setClaimLoading(false);
    }
  };

  // Manual OT entry
  const handleManualEntry = async () => {
    if (!manualForm.date || !manualForm.start_time || !manualForm.end_time) {
      message.warning('Tüm alanları doldurunuz');
      return;
    }
    if (!manualForm.reason.trim()) {
      message.warning('Açıklama giriniz');
      return;
    }
    setManualLoading(true);
    try {
      await api.post('/overtime-requests/manual-entry/', manualForm);
      message.success('Manuel mesai talebi oluşturuldu');
      setManualModal(false);
      setManualForm({ date: '', start_time: '', end_time: '', reason: '' });
      fetchCalendarData();
    } catch (err) {
      message.error(err.response?.data?.error || 'Manuel giriş hatası');
    } finally {
      setManualLoading(false);
    }
  };

  // Summary stats
  const summary = useMemo(() => {
    let approved = 0, pending = 0, rejected = 0, potential = 0;
    if (calendarData && typeof calendarData === 'object') {
      Object.values(calendarData).forEach(day => {
        if (day && typeof day === 'object') {
          approved += day.approved_hours || 0;
          pending += day.pending_hours || 0;
          rejected += day.rejected_hours || 0;
          potential += day.potential_hours || 0;
        }
      });
    }
    return { approved, pending, rejected, potential };
  }, [calendarData]);

  // Weekly OT progress
  const weeklyProgress = useMemo(() => {
    if (!weeklyOtStatus || weeklyOtStatus.is_unlimited) return null;
    const pct = weeklyOtStatus.limit_hours > 0
      ? Math.min(100, (weeklyOtStatus.used_hours / weeklyOtStatus.limit_hours) * 100)
      : 0;
    let strokeColor = '#22c55e'; // green
    if (pct > 90) strokeColor = '#ef4444'; // red
    else if (pct > 70) strokeColor = '#f59e0b'; // amber
    return { pct, strokeColor };
  }, [weeklyOtStatus]);

  // Render a single calendar cell
  const renderCell = (day, dayIndex) => {
    if (!day) {
      return (
        <div key={`empty-${dayIndex}`} className="min-h-[72px] bg-slate-50/50 rounded-lg" />
      );
    }

    const cellInfo = getCellInfo(day.date, calendarData);
    const isSelected = selectedDay === day.date;
    const isWeekend = day.dayOfWeek >= 5;

    let cellBg = 'bg-white border-slate-100 hover:border-slate-300';
    if (cellInfo.hasData && cellInfo.statuses.length > 0) {
      cellBg = getCellBackground(cellInfo.statuses);
    } else if (isWeekend) {
      cellBg = 'bg-red-50/30 border-slate-100';
    }

    const todayRing = day.isToday ? 'ring-2 ring-blue-400 ring-offset-1' : '';
    const selectedBorder = isSelected ? 'border-blue-500 shadow-md' : '';

    return (
      <div
        key={day.date}
        onClick={() => handleDayClick(day)}
        className={`
          min-h-[72px] border rounded-lg p-1.5 cursor-pointer transition-all relative
          ${cellBg} ${todayRing} ${selectedBorder}
        `}
      >
        {/* Day number */}
        <div className="flex items-start justify-between">
          <span className={`text-xs font-bold leading-none ${
            day.isToday
              ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center'
              : isWeekend ? 'text-red-400' : 'text-slate-600'
          }`}>
            {day.day}
          </span>
          {/* Total hours */}
          {cellInfo.totalHours > 0 && (
            <span className="text-[9px] font-bold text-slate-500">
              {cellInfo.totalHours.toFixed(1)}sa
            </span>
          )}
        </div>

        {/* Status dots */}
        {cellInfo.statuses.length > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex gap-0.5">
            {cellInfo.statuses.map((status) => (
              <div
                key={status}
                className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[status] || 'bg-slate-300'}`}
                title={status}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Action Buttons + Employee Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setManualModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <PenLine size={15} /> Manuel Mesai Talebi
          </button>
          {isManagerMode && (
            <button
              onClick={() => setAssignModal(true)}
              className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <Users size={15} /> Mesai Ata
            </button>
          )}
        </div>

        {/* Manager mode: employee selector */}
        {isManagerMode && teamMembers.length > 0 && (
          <Select
            showSearch
            optionFilterProp="label"
            value={selectedEmployee}
            onChange={(val) => {
              setSelectedEmployee(val);
              setSelectedDay(null);
              setDayDetailData(null);
            }}
            style={{ minWidth: 220 }}
            placeholder="Personel seçiniz..."
            options={teamMembers.map(m => ({
              value: m.id,
              label: `${m.first_name} ${m.last_name}`,
            }))}
          />
        )}
      </div>

      {/* Fiscal Period Selector + Weekly OT */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevPeriod}
            disabled={!canGoPrev}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <div className="text-center">
            <div className="font-bold text-slate-800">
              {MONTH_NAMES[fiscalPeriod.month - 1]} {fiscalPeriod.year}
            </div>
            <div className="text-[10px] text-slate-400">Mali Dönem</div>
          </div>
          <button
            onClick={handleNextPeriod}
            disabled={!canGoNext}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
          >
            <ChevronRight size={18} className="text-slate-600" />
          </button>
          <button
            onClick={fetchCalendarData}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors ml-1"
            title="Yenile"
          >
            <RefreshCw size={14} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Weekly OT Progress */}
        {weeklyProgress && weeklyOtStatus && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Haftalık Mesai</div>
              <div className="text-xs font-bold text-slate-700">
                {weeklyOtStatus.used_hours}/{weeklyOtStatus.limit_hours} sa
              </div>
            </div>
            <Progress
              type="circle"
              percent={Math.round(weeklyProgress.pct)}
              size={42}
              strokeColor={weeklyProgress.strokeColor}
              format={(pct) => <span className="text-[10px] font-bold">{pct}%</span>}
            />
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin size="large" tip="Takvim yükleniyor..." />
        </div>
      ) : !targetEmployeeId ? (
        <div className="py-16">
          <Empty description="Personel seçiniz" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_HEADERS.map((name, i) => (
              <div
                key={name}
                className={`text-center text-[10px] font-bold uppercase tracking-wider py-1.5 ${
                  i >= 5 ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Week rows */}
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day, di) => renderCell(day, `${wi}-${di}`))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Onaylı
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Bekleyen
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Algılanan
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" /> Reddedilen
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Atanmış
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <div className="w-4 h-4 rounded border-2 border-blue-400" /> Bugün
            </div>
          </div>
        </div>
      )}

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className="mt-2">
          {dayDetailLoading ? (
            <div className="flex items-center justify-center py-8 bg-white border border-slate-200 rounded-xl">
              <Spin tip="Yükleniyor..." />
            </div>
          ) : dayDetailData ? (
            <OTDayDetailPanel
              dayData={dayDetailData}
              onClose={() => { setSelectedDay(null); setDayDetailData(null); }}
              onClaim={(pot) => setClaimModal({ open: true, data: pot })}
              onOverride={(asgn) => setOverrideModal({ visible: true, assignment: asgn })}
              onRefresh={() => {
                fetchCalendarData();
                if (selectedDay) handleDayClick({ date: selectedDay });
              }}
              isManager={isManagerMode || hasPermission('APPROVAL_OVERTIME')}
              isOwnData={!isManagerMode || selectedEmployee === user?.employee_id}
            />
          ) : null}
        </div>
      )}

      {/* Period Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Onaylı</div>
          <div className="text-lg font-black text-emerald-700 mt-0.5">{summary.approved.toFixed(1)} sa</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Bekleyen</div>
          <div className="text-lg font-black text-amber-700 mt-0.5">{summary.pending.toFixed(1)} sa</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Reddedilen</div>
          <div className="text-lg font-black text-red-700 mt-0.5">{summary.rejected.toFixed(1)} sa</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Algılanan</div>
          <div className="text-lg font-black text-blue-700 mt-0.5">{summary.potential.toFixed(1)} sa</div>
        </div>
      </div>

      {/* Claim Modal (inline) */}
      <Modal
        open={claimModal.open}
        onCancel={() => { setClaimModal({ open: false, data: null }); setClaimReason(''); }}
        onOk={handleClaim}
        confirmLoading={claimLoading}
        title={
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            <span>Algılanan Mesai Talep Et</span>
          </div>
        }
        okText="Talep Et"
        cancelText="Vazgeç"
      >
        {claimModal.data && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <div className="font-medium">
                {claimModal.data.start_time && claimModal.data.end_time
                  ? `${claimModal.data.start_time.slice(0, 5)} - ${claimModal.data.end_time.slice(0, 5)}`
                  : 'Algılanan mesai'}
              </div>
              <div className="text-xs mt-1">
                Süre: {claimModal.data.actual_overtime_hours || (claimModal.data.actual_overtime_seconds ? (claimModal.data.actual_overtime_seconds / 3600).toFixed(1) : '0')} sa
              </div>
            </div>

            {weeklyOtStatus && !weeklyOtStatus.is_unlimited && (
              <div className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                weeklyOtStatus.is_over_limit
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                Haftalık Mesai: {weeklyOtStatus.used_hours}/{weeklyOtStatus.limit_hours} sa
                {weeklyOtStatus.is_over_limit
                  ? ' — Limit aşıldı!'
                  : ` — Kalan: ${weeklyOtStatus.remaining_hours} sa`}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Açıklama</label>
              <Input.TextArea
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                placeholder="Açıklama (opsiyonel)..."
                rows={2}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Manual Entry Modal (inline) */}
      <Modal
        open={manualModal}
        onCancel={() => { setManualModal(false); setManualForm({ date: '', start_time: '', end_time: '', reason: '' }); }}
        onOk={handleManualEntry}
        confirmLoading={manualLoading}
        title={
          <div className="flex items-center gap-2">
            <PenLine size={18} className="text-amber-500" />
            <span>Manuel Ek Mesai Girişi</span>
          </div>
        }
        okText="Talep Oluştur"
        cancelText="Vazgeç"
      >
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Tarih</label>
              <input
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Başlangıç</label>
              <input
                type="time"
                value={manualForm.start_time}
                onChange={(e) => setManualForm(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Bitiş</label>
              <input
                type="time"
                value={manualForm.end_time}
                onChange={(e) => setManualForm(prev => ({ ...prev, end_time: e.target.value }))}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Açıklama *</label>
            <Input.TextArea
              value={manualForm.reason}
              onChange={(e) => setManualForm(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Yapılan işin açıklaması..."
              rows={2}
            />
          </div>
        </div>
      </Modal>

      {/* Override Confirm Modal */}
      <OverrideConfirmModal
        visible={overrideModal.visible}
        assignment={overrideModal.assignment}
        onClose={() => setOverrideModal({ visible: false, assignment: null })}
        onSuccess={() => {
          fetchCalendarData();
          if (selectedDay) handleDayClick({ date: selectedDay });
        }}
      />

      {/* Create Assignment Modal (manager) */}
      {isManagerMode && (
        <CreateAssignmentModal
          isOpen={assignModal}
          onClose={() => setAssignModal(false)}
          onSuccess={() => {
            setAssignModal(false);
            fetchCalendarData();
          }}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
}
