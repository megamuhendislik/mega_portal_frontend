import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Clock, Users, User, RefreshCw, CalendarPlus,
} from 'lucide-react';
import { Select, Spin, Empty, Tooltip } from 'antd';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getIstanbulTodayDate, toIstanbulParts, getIstanbulToday } from '../../utils/dateUtils';
import OTDayDetailDrawer from './OTDayDetailDrawer';
import CreateAssignmentModal from './CreateAssignmentModal';

// --- Constants ---

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const DAY_HEADERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// Status colors for inline styles (avoiding dynamic Tailwind classes)
const STATUS_COLORS = {
  APPROVED: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', dot: '#10b981' },
  PENDING: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', dot: '#f59e0b' },
  POTENTIAL: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', dot: '#3b82f6' },
  ASSIGNED: { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', dot: '#8b5cf6' },
  REJECTED: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', dot: '#ef4444' },
};

// --- Fiscal Period Helpers ---

function getCurrentFiscalPeriod() {
  const now = getIstanbulTodayDate();
  const parts = toIstanbulParts(now);
  const y = parts.year, m = parts.month, d = parts.day;
  if (d >= 26) {
    if (m === 12) return { month: 1, year: y + 1 };
    return { month: m + 1, year: y };
  }
  return { month: m, year: y };
}

function generateFiscalDays(fiscalMonth, fiscalYear) {
  const days = [];
  let startMonth = fiscalMonth - 1;
  let startYear = fiscalYear;
  if (startMonth === 0) {
    startMonth = 12;
    startYear = fiscalYear - 1;
  }
  const startDate = new Date(startYear, startMonth - 1, 26);
  const endDate = new Date(fiscalYear, fiscalMonth - 1, 25);
  const todayStr = getIstanbulToday();
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    const p = toIstanbulParts(current);
    days.push({
      date: dateStr,
      day: p.day,
      month: p.month,
      year: p.year,
      dayOfWeek: (current.getDay() + 6) % 7, // Monday=0
      isToday: dateStr === todayStr,
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

// --- Cell info extraction ---

function getCellStatuses(dateStr, calendarData) {
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

// --- Team mode: aggregate all employees' data for a date ---

function getTeamCellInfo(dateStr, teamCalendarMap) {
  // teamCalendarMap: { employeeId: { calendar: {...}, name: '...' } }
  const members = [];
  let totalHours = 0;
  const allStatuses = new Set();

  if (!teamCalendarMap) return { members: [], totalHours: 0, statuses: [] };

  Object.entries(teamCalendarMap).forEach(([empId, empData]) => {
    const cal = empData.calendar || {};
    const dayInfo = cal[dateStr];
    if (!dayInfo) return;

    const memberStatuses = [];
    let memberHours = 0;

    if (dayInfo.approved_hours > 0) { memberStatuses.push('APPROVED'); memberHours += dayInfo.approved_hours; allStatuses.add('APPROVED'); }
    if (dayInfo.pending_hours > 0) { memberStatuses.push('PENDING'); memberHours += dayInfo.pending_hours; allStatuses.add('PENDING'); }
    if (dayInfo.potential_hours > 0) { memberStatuses.push('POTENTIAL'); memberHours += dayInfo.potential_hours; allStatuses.add('POTENTIAL'); }
    if (dayInfo.rejected_hours > 0) { memberStatuses.push('REJECTED'); allStatuses.add('REJECTED'); }
    if (dayInfo.assigned_hours > 0) { memberStatuses.push('ASSIGNED'); allStatuses.add('ASSIGNED'); }

    if (memberStatuses.length > 0) {
      members.push({
        employeeId: empId,
        name: empData.name || 'Bilinmeyen',
        initials: empData.initials || '?',
        statuses: memberStatuses,
        hours: memberHours,
      });
      totalHours += memberHours;
    }
  });

  return { members, totalHours, statuses: Array.from(allStatuses) };
}

// Primary status color for cell background
function getPrimaryCellStyle(statuses) {
  if (statuses.length === 0) return {};
  const primary = statuses[0];
  const cfg = STATUS_COLORS[primary];
  if (!cfg) return {};
  return { backgroundColor: cfg.bg, borderColor: cfg.border };
}

// --- Summary Card Component ---
function SummaryCard({ label, value, colorDot, glowColor }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-3 backdrop-blur-sm border border-white/10 group hover:border-white/20 transition-all duration-300"
      style={{ background: `linear-gradient(135deg, ${glowColor || colorDot}08 0%, transparent 60%)` }}
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${colorDot}, transparent)` }} />
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-2.5 h-2.5 rounded-full shadow-lg"
          style={{ backgroundColor: colorDot, boxShadow: `0 0 8px ${colorDot}60` }}
        />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-black text-white tabular-nums tracking-tight">
        {typeof value === 'number' ? value.toFixed(1) : value}
        <span className="text-[10px] font-bold text-gray-500 ml-1">sa</span>
      </div>
    </div>
  );
}


// ================= MAIN COMPONENT =================

export default function UnifiedOvertimePanel() {
  const { hasPermission, user } = useAuth();

  // --- State ---
  const [mode, setMode] = useState('team'); // 'team' | 'personal'
  const [fiscalPeriod, setFiscalPeriod] = useState(() => getCurrentFiscalPeriod());
  const [loading, setLoading] = useState(true);

  // Team members
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Calendar data
  const [personalCalendar, setPersonalCalendar] = useState({});
  const [teamCalendarMap, setTeamCalendarMap] = useState({}); // { empId: { calendar, name, initials } }

  // Weekly OT
  const [weeklyOtStatus, setWeeklyOtStatus] = useState(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState(null);
  const [drawerData, setDrawerData] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Assignment modal
  const [assignModal, setAssignModal] = useState(false);

  // Available fiscal periods (for navigation bounds)
  const [availablePeriods, setAvailablePeriods] = useState([]);

  // --- Computed ---
  const isPersonalMode = mode === 'personal';
  const isTeamMode = mode === 'team';
  const targetEmployeeId = isPersonalMode && selectedEmployee ? selectedEmployee : user?.employee_id;

  // --- Fetch team members ---
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get('/employees/subordinates/');
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setTeamMembers(data);
        if (data.length > 0 && !selectedEmployee) {
          setSelectedEmployee(data[0].id);
        }
      } catch (err) {
        console.error('Team fetch error:', err);
      }
    };
    fetchTeam();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Fetch fiscal periods ---
  useEffect(() => {
    api.get('/overtime-assignments/fiscal-periods/')
      .then(res => setAvailablePeriods(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAvailablePeriods([getCurrentFiscalPeriod()]));
  }, []);

  // --- Fetch calendar data ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (isTeamMode) {
        // Team mode: fetch all subordinates' calendars in parallel
        if (teamMembers.length === 0) {
          setLoading(false);
          return;
        }
        const promises = teamMembers.map(m =>
          api.get('/overtime-requests/employee-ot-calendar/', {
            params: { employee_id: m.id, fiscal_month: fiscalPeriod.month, fiscal_year: fiscalPeriod.year },
          }).then(res => ({
            id: m.id,
            name: `${m.first_name} ${m.last_name}`,
            initials: `${(m.first_name || '')[0] || ''}${(m.last_name || '')[0] || ''}`.toUpperCase(),
            calendar: res.data.calendar || res.data || {},
          })).catch(() => ({
            id: m.id,
            name: `${m.first_name} ${m.last_name}`,
            initials: `${(m.first_name || '')[0] || ''}${(m.last_name || '')[0] || ''}`.toUpperCase(),
            calendar: {},
          }))
        );
        const results = await Promise.all(promises);
        const map = {};
        results.forEach(r => { map[r.id] = { calendar: r.calendar, name: r.name, initials: r.initials }; });
        setTeamCalendarMap(map);
      } else {
        // Personal mode
        if (!targetEmployeeId) { setLoading(false); return; }
        const [calRes, otRes] = await Promise.allSettled([
          api.get('/overtime-requests/employee-ot-calendar/', {
            params: { employee_id: targetEmployeeId, fiscal_month: fiscalPeriod.month, fiscal_year: fiscalPeriod.year },
          }),
          api.get(`/overtime-requests/weekly-ot-status/?employee_id=${targetEmployeeId}`),
        ]);
        if (calRes.status === 'fulfilled') {
          setPersonalCalendar(calRes.value.data.calendar || calRes.value.data || {});
        }
        if (otRes.status === 'fulfilled') {
          setWeeklyOtStatus(otRes.value.data);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isTeamMode, teamMembers, targetEmployeeId, fiscalPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Fiscal period navigation ---
  const handlePrevPeriod = () => {
    setFiscalPeriod(prev => {
      const m = prev.month === 1 ? 12 : prev.month - 1;
      const y = prev.month === 1 ? prev.year - 1 : prev.year;
      return { month: m, year: y };
    });
    setDrawerOpen(false);
    setDrawerData(null);
  };

  const handleNextPeriod = () => {
    setFiscalPeriod(prev => {
      const m = prev.month === 12 ? 1 : prev.month + 1;
      const y = prev.month === 12 ? prev.year + 1 : prev.year;
      return { month: m, year: y };
    });
    setDrawerOpen(false);
    setDrawerData(null);
  };

  // --- Calendar grid ---
  const fiscalDays = useMemo(
    () => generateFiscalDays(fiscalPeriod.month, fiscalPeriod.year),
    [fiscalPeriod]
  );
  const weeks = useMemo(() => organizeIntoWeeks(fiscalDays), [fiscalDays]);

  // --- Summary stats ---
  const summary = useMemo(() => {
    let approved = 0, pending = 0, assigned = 0, potential = 0;

    if (isTeamMode) {
      Object.values(teamCalendarMap).forEach(empData => {
        const cal = empData.calendar || {};
        Object.values(cal).forEach(day => {
          if (day && typeof day === 'object') {
            approved += day.approved_hours || 0;
            pending += day.pending_hours || 0;
            assigned += day.assigned_hours || 0;
            potential += day.potential_hours || 0;
          }
        });
      });
    } else {
      Object.values(personalCalendar).forEach(day => {
        if (day && typeof day === 'object') {
          approved += day.approved_hours || 0;
          pending += day.pending_hours || 0;
          assigned += day.assigned_hours || 0;
          potential += day.potential_hours || 0;
        }
      });
    }

    return { approved, pending, assigned, potential };
  }, [isTeamMode, teamCalendarMap, personalCalendar]);

  // --- Day click ---
  const handleDayClick = useCallback(async (day) => {
    if (!day) return;
    setDrawerDate(day.date);
    setDrawerOpen(true);
    setDrawerLoading(true);

    try {
      if (isTeamMode) {
        // Collect day data for each team member that has data on this date
        const memberData = {};
        for (const [empId, empData] of Object.entries(teamCalendarMap)) {
          const dayInfo = (empData.calendar || {})[day.date];
          if (dayInfo) {
            memberData[empData.name] = {
              employeeId: empId,
              requests: dayInfo.requests || [],
              assignments: dayInfo.assignments || [],
              potentials: dayInfo.potentials || [],
            };
          }
        }
        setDrawerData(memberData);
      } else {
        // Personal mode: fetch single employee
        const params = {
          employee_id: targetEmployeeId,
          fiscal_month: fiscalPeriod.month,
          fiscal_year: fiscalPeriod.year,
        };
        const res = await api.get('/overtime-requests/employee-ot-calendar/', { params });
        const cal = res.data.calendar || res.data || {};
        const dayInfo = cal[day.date] || {};

        const empName = selectedEmployee
          ? teamMembers.find(m => m.id === selectedEmployee)
            ? `${teamMembers.find(m => m.id === selectedEmployee).first_name} ${teamMembers.find(m => m.id === selectedEmployee).last_name}`
            : 'Kişisel'
          : 'Kişisel';

        setDrawerData({
          [empName]: {
            requests: dayInfo.requests || [],
            assignments: dayInfo.assignments || [],
            potentials: dayInfo.potentials || [],
          },
        });
      }
    } catch {
      setDrawerData({});
    } finally {
      setDrawerLoading(false);
    }
  }, [isTeamMode, teamCalendarMap, targetEmployeeId, selectedEmployee, teamMembers, fiscalPeriod]);

  // --- Drawer refresh ---
  const handleDrawerRefresh = useCallback(() => {
    fetchData();
    if (drawerDate) {
      handleDayClick({ date: drawerDate });
    }
  }, [fetchData, drawerDate, handleDayClick]);

  // --- Render Team Cell ---
  const renderTeamCell = (day, idx) => {
    if (!day) {
      return (
        <div key={`empty-${idx}`} className="min-h-[80px] bg-white/[0.02] rounded-lg border border-white/5" />
      );
    }

    const cellInfo = getTeamCellInfo(day.date, teamCalendarMap);
    const isSelected = drawerDate === day.date && drawerOpen;
    const isWeekend = day.dayOfWeek >= 5;

    const cellStyle = cellInfo.statuses.length > 0 ? getPrimaryCellStyle(cellInfo.statuses) : {};

    return (
      <div
        key={day.date}
        onClick={() => handleDayClick(day)}
        className={`min-h-[80px] rounded-lg p-1.5 cursor-pointer transition-all duration-200 border relative group
          ${isWeekend && cellInfo.statuses.length === 0 ? 'bg-red-500/[0.04] border-red-500/10' : 'border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03]'}
          ${isSelected ? 'ring-2 ring-violet-500/70 border-violet-500/30 bg-violet-500/[0.06]' : ''}
          ${day.isToday && !isSelected ? 'ring-1 ring-blue-400/40 border-blue-400/20' : ''}
        `}
        style={cellInfo.statuses.length > 0 ? { ...cellStyle, transition: 'all 0.2s ease' } : {}}
      >
        {/* Day number + hours */}
        <div className="flex items-start justify-between">
          <span className={`text-[11px] font-bold leading-none ${
            day.isToday
              ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-blue-500/30'
              : isWeekend ? 'text-red-400/60' : 'text-gray-500 group-hover:text-gray-300'
          }`}>
            {day.day}
          </span>
          {cellInfo.totalHours > 0 && (
            <span className="text-[9px] font-bold text-gray-500 tabular-nums bg-white/5 px-1 rounded">
              {cellInfo.totalHours.toFixed(1)}
            </span>
          )}
        </div>

        {/* Member avatars */}
        {cellInfo.members.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-0.5">
            {cellInfo.members.slice(0, 4).map((member) => {
              const primaryStatus = member.statuses[0];
              const color = STATUS_COLORS[primaryStatus]?.dot || '#6b7280';
              return (
                <Tooltip key={member.employeeId} title={`${member.name}: ${member.hours.toFixed(1)} sa`}>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-black/30 shadow-sm transition-transform duration-150 hover:scale-110 hover:z-10"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}
                  >
                    {member.initials}
                  </div>
                </Tooltip>
              );
            })}
            {cellInfo.members.length > 4 && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-400 bg-white/10 ring-1 ring-white/10">
                +{cellInfo.members.length - 4}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- Render Personal Cell ---
  const renderPersonalCell = (day, idx) => {
    if (!day) {
      return (
        <div key={`empty-${idx}`} className="min-h-[72px] bg-white/[0.02] rounded-lg border border-white/5" />
      );
    }

    const cellInfo = getCellStatuses(day.date, personalCalendar);
    const isSelected = drawerDate === day.date && drawerOpen;
    const isWeekend = day.dayOfWeek >= 5;

    const cellStyle = cellInfo.statuses.length > 0 ? getPrimaryCellStyle(cellInfo.statuses) : {};

    return (
      <div
        key={day.date}
        onClick={() => handleDayClick(day)}
        className={`min-h-[72px] rounded-lg p-1.5 cursor-pointer transition-all duration-200 border relative group
          ${isWeekend && cellInfo.statuses.length === 0 ? 'bg-red-500/[0.04] border-red-500/10' : 'border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03]'}
          ${isSelected ? 'ring-2 ring-violet-500/70 border-violet-500/30 bg-violet-500/[0.06]' : ''}
          ${day.isToday && !isSelected ? 'ring-1 ring-blue-400/40 border-blue-400/20' : ''}
        `}
        style={cellInfo.statuses.length > 0 ? { ...cellStyle, transition: 'all 0.2s ease' } : {}}
      >
        {/* Day number */}
        <div className="flex items-start justify-between">
          <span className={`text-[11px] font-bold leading-none ${
            day.isToday
              ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-blue-500/30'
              : isWeekend ? 'text-red-400/60' : 'text-gray-500 group-hover:text-gray-300'
          }`}>
            {day.day}
          </span>
          {cellInfo.totalHours > 0 && (
            <span className="text-[9px] font-bold text-gray-500 tabular-nums bg-white/5 px-1 rounded">
              {cellInfo.totalHours.toFixed(1)}
            </span>
          )}
        </div>

        {/* Status dots */}
        {cellInfo.statuses.length > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex gap-1">
            {cellInfo.statuses.map((status) => {
              const color = STATUS_COLORS[status]?.dot || '#6b7280';
              return (
                <div
                  key={status}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}50` }}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ================= RENDER =================
  return (
    <div className="space-y-4">
      {/* Top Controls: Mode toggle + Employee selector + Assign button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setMode('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              isTeamMode
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={14} />
            Tüm Ekip
          </button>
          <button
            onClick={() => setMode('personal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              isPersonalMode
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User size={14} />
            Kişisel
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Employee selector (personal mode only) */}
          {isPersonalMode && teamMembers.length > 0 && (
            <Select
              showSearch
              optionFilterProp="label"
              value={selectedEmployee}
              onChange={(val) => {
                setSelectedEmployee(val);
                setDrawerOpen(false);
                setDrawerData(null);
              }}
              style={{ minWidth: 220 }}
              placeholder="Personel seçiniz..."
              className="ot-panel-select"
              options={teamMembers.map(m => ({
                value: m.id,
                label: `${m.first_name} ${m.last_name}`,
              }))}
            />
          )}

          {/* Assign OT button */}
          <button
            onClick={() => setAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-500/20 transition-all"
          >
            <CalendarPlus size={15} />
            Mesai Ata
          </button>
        </div>
      </div>

      {/* Fiscal Period Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 backdrop-blur-sm relative overflow-hidden">
        {/* Subtle gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.03] via-transparent to-purple-500/[0.03] pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={handlePrevPeriod}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ChevronLeft size={18} className="text-gray-400" />
          </button>
          <div className="text-center min-w-[130px]">
            <div className="font-bold text-white text-base tracking-tight">
              {MONTH_NAMES[fiscalPeriod.month - 1]} {fiscalPeriod.year}
            </div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Mali Dönem</div>
          </div>
          <button
            onClick={handleNextPeriod}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ChevronRight size={18} className="text-gray-400" />
          </button>
          <button
            onClick={fetchData}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200 ml-1"
            title="Yenile"
          >
            <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Weekly OT indicator (personal mode) */}
        {isPersonalMode && weeklyOtStatus && !weeklyOtStatus.is_unlimited && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Haftalık Mesai</div>
              <div className="text-xs font-bold text-white tabular-nums">
                {weeklyOtStatus.used_hours}/{weeklyOtStatus.limit_hours} sa
              </div>
            </div>
            <div className="w-10 h-10 relative">
              <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(100, (weeklyOtStatus.used_hours / weeklyOtStatus.limit_hours) * 100) * 0.942} 94.2`}
                  stroke={
                    weeklyOtStatus.used_hours / weeklyOtStatus.limit_hours > 0.9 ? '#ef4444' :
                    weeklyOtStatus.used_hours / weeklyOtStatus.limit_hours > 0.7 ? '#f59e0b' : '#22c55e'
                  }
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-300">
                {Math.round(Math.min(100, (weeklyOtStatus.used_hours / weeklyOtStatus.limit_hours) * 100))}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Onaylı" value={summary.approved} colorDot="#10b981" glowColor="#10b981" />
        <SummaryCard label="Bekleyen" value={summary.pending} colorDot="#f59e0b" glowColor="#f59e0b" />
        <SummaryCard label="Atanmış" value={summary.assigned} colorDot="#8b5cf6" glowColor="#8b5cf6" />
        <SummaryCard label="Algılanan" value={summary.potential} colorDot="#3b82f6" glowColor="#3b82f6" />
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin size="large" tip={<span className="text-gray-400">Takvim yükleniyor...</span>} />
        </div>
      ) : (isPersonalMode && !targetEmployeeId) ? (
        <div className="py-16">
          <Empty description={<span className="text-gray-500">Personel seçiniz</span>} />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 backdrop-blur-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_HEADERS.map((name, i) => (
              <div
                key={name}
                className={`text-center text-[10px] font-bold uppercase tracking-wider py-1.5 ${
                  i >= 5 ? 'text-red-400/60' : 'text-gray-500'
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
                {week.map((day, di) =>
                  isTeamMode
                    ? renderTeamCell(day, `${wi}-${di}`)
                    : renderPersonalCell(day, `${wi}-${di}`)
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} /> Onaylı
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} /> Bekleyen
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }} /> Algılanan
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} /> Reddedilen
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#8b5cf6' }} /> Atanmış
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <div className="w-4 h-4 rounded ring-1 ring-blue-400/50" /> Bugün
            </div>
          </div>
        </div>
      )}

      {/* OT Day Detail Drawer */}
      <OTDayDetailDrawer
        open={drawerOpen}
        date={drawerDate}
        dayDataByMember={drawerData}
        loading={drawerLoading}
        onClose={() => { setDrawerOpen(false); setDrawerData(null); }}
        onRefresh={handleDrawerRefresh}
        isManager={hasPermission('APPROVAL_OVERTIME') || isTeamMode}
        isTeamMode={isTeamMode}
      />

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        isOpen={assignModal}
        onClose={() => setAssignModal(false)}
        onSuccess={() => {
          setAssignModal(false);
          fetchData();
        }}
        teamMembers={teamMembers}
      />
    </div>
  );
}
