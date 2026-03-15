import { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, Tooltip, message } from 'antd';
import {
  Clock, AlertTriangle, CalendarPlus, Loader2,
  Save, Check, ShieldAlert, Users, X, FileText, Info,
  Pencil, Eye, Calendar, Users2, ShieldX,
  CircleCheck, Activity, CircleDot, ArrowRight, UserCheck
} from 'lucide-react';
import api from '../../services/api';
import { getIstanbulToday } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

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
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  EXPIRED: 'bg-slate-100 text-slate-400',
};

const STATUS_LABELS = {
  APPROVED: 'Onaylı',
  PENDING: 'Bekliyor',
  POTENTIAL: 'Potansiyel',
  REJECTED: 'Reddedildi',
  CANCELLED: 'İptal',
  ASSIGNED: 'Atandı',
  EXPIRED: 'Süresi Doldu',
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
//  FIELD LABEL HELPER (with tooltip)
// ═══════════════════════════════════════════════════

const FieldLabel = ({ text, tooltip, required }) => (
  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
    {text} {required && <span className="text-red-400">*</span>}
    <Tooltip title={tooltip} placement="top">
      <Info size={12} className="text-slate-400 cursor-help hover:text-blue-400 transition-colors" />
    </Tooltip>
  </label>
);

// ═══════════════════════════════════════════════════
//  SMART DEFAULT HOURS HELPER
// ═══════════════════════════════════════════════════

function getDefaultHours(dates) {
  if (dates.length === 0) return 6;
  const allWeekend = dates.every(d => {
    const day = new Date(d + 'T00:00:00').getDay();
    return day === 0 || day === 6;
  });
  if (allWeekend) return 12;
  return 6;
}

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════

export default function OTAssignmentCreator({ onAssignmentCreated, parentTeamTab }) {
  // Team data state — sync with parent if provided
  const [teamTab, setTeamTab] = useState(parentTeamTab || 'primary');
  const [primaryTeam, setPrimaryTeam] = useState([]);
  const [secondaryTeam, setSecondaryTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);

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
  const [hoursPerDay, setHoursPerDay] = useState(6);
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

  // My assignments (Atamalarım) state
  const [myAssignments, setMyAssignments] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);

  // Team assignments (Ekip Atamaları) state
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [teamAssignmentsLoading, setTeamAssignmentsLoading] = useState(false);

  // Unified assignment section filters
  const [allFilter, setAllFilter] = useState('ASSIGNED');
  const [managerFilter, setManagerFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  // Detail & Edit modal state
  const [detailModal, setDetailModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ max_duration_hours: 1, task_description: '', notes: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Auth context for current user
  const { user: currentUser } = useAuth();

  // Sync with parent team tab when it changes
  useEffect(() => {
    if (parentTeamTab) {
      setTeamTab(parentTeamTab);
      setSelectedEmployeeId(null);
    }
  }, [parentTeamTab]);

  // --- Fetch team data on mount ---
  useEffect(() => {
    const fetchTeams = async () => {
      setTeamLoading(true);
      try {
        const [primaryRes, secondaryRes] = await Promise.allSettled([
          api.get('/employees/subordinates/', { params: { relationship_type: 'PRIMARY' } }),
          api.get('/employees/subordinates/', { params: { relationship_type: 'SECONDARY' } }),
        ]);
        if (primaryRes.status === 'fulfilled') {
          const data = Array.isArray(primaryRes.value.data) ? primaryRes.value.data : primaryRes.value.data.results || [];
          setPrimaryTeam(data.map(s => ({
            id: s.id,
            name: s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.full_name || s.name || `Çalışan #${s.id}`,
            department: typeof s.department === 'object' ? s.department?.name : (s.department || ''),
          })));
        }
        if (secondaryRes.status === 'fulfilled') {
          const data = Array.isArray(secondaryRes.value.data) ? secondaryRes.value.data : secondaryRes.value.data.results || [];
          setSecondaryTeam(data.map(s => ({
            id: s.id,
            name: s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.full_name || s.name || `Çalışan #${s.id}`,
            department: typeof s.department === 'object' ? s.department?.name : (s.department || ''),
          })));
        }
      } catch {
        // handled individually by allSettled
      }
      setTeamLoading(false);
    };
    fetchTeams();
  }, []);

  // Derive employees from active team tab
  const employees = teamTab === 'primary' ? primaryTeam : secondaryTeam;

  // Resolve selected employee object
  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees?.find(e => e.id === selectedEmployeeId) || null;
  }, [selectedEmployeeId, employees]);

  // --- Reset form when employee changes ---
  useEffect(() => {
    setSelectedDates([]);
    setHoursPerDay(6);
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

  // --- Fetch my created assignments (Atamalarım) ---
  const fetchMyAssignments = useCallback(async () => {
    try {
      const res = await api.get('/overtime-assignments/', {
        params: { scope: 'created_by_me', page_size: 100 }
      });
      const data = res.data?.results || res.data || [];
      setMyAssignments(Array.isArray(data) ? data : []);
    } catch { setMyAssignments([]); }
  }, []);

  useEffect(() => { fetchMyAssignments(); }, [fetchMyAssignments]);

  // --- Fetch team assignments (Ekip Atamaları) ---
  const fetchTeamAssignments = useCallback(async () => {
    setTeamAssignmentsLoading(true);
    try {
      const res = await api.get('/overtime-assignments/team/', {
        params: { scope: 'managed', page_size: 100 }
      });
      const data = res.data?.results || res.data || [];
      setTeamAssignments(Array.isArray(data) ? data : []);
    } catch { setTeamAssignments([]); }
    setTeamAssignmentsLoading(false);
  }, []);

  useEffect(() => { fetchTeamAssignments(); }, [fetchTeamAssignments]);

  // --- Busy days lookup ---
  const busyMap = useMemo(() => {
    const map = {};
    busyDays
      .filter(b => b.status !== 'CANCELLED')
      .forEach(b => { map[b.date] = b; });
    return map;
  }, [busyDays]);

  // --- Combined + filtered assignments (Tüm Atamalar) ---
  const allAssignmentsCombined = useMemo(() => {
    const map = new Map();
    [...myAssignments, ...teamAssignments].forEach(a => {
      if (!map.has(a.id)) map.set(a.id, a);
    });
    let list = Array.from(map.values());
    // Status filter
    if (allFilter === 'ASSIGNED') list = list.filter(a => a.status === 'ASSIGNED');
    // Manager filter
    if (managerFilter !== 'ALL') list = list.filter(a => String(a.assigned_by) === managerFilter);
    // Employee filter
    if (employeeFilter !== 'ALL') list = list.filter(a => String(a.employee || a.employee_id) === employeeFilter);
    // Sort by date desc
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }, [myAssignments, teamAssignments, allFilter, managerFilter, employeeFilter]);

  // Unique managers for filter dropdown
  const uniqueManagers = useMemo(() => {
    const map = new Map();
    [...myAssignments, ...teamAssignments].forEach(a => {
      if (a.assigned_by && a.assigned_by_name) {
        map.set(String(a.assigned_by), a.assigned_by_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [myAssignments, teamAssignments]);

  // Unique employees for filter dropdown
  const uniqueEmployees = useMemo(() => {
    const map = new Map();
    [...myAssignments, ...teamAssignments].forEach(a => {
      const empId = a.employee || a.employee_id;
      if (empId && a.employee_name) {
        map.set(String(empId), a.employee_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [myAssignments, teamAssignments]);

  // --- Unified table rows: merge requests + unclaimed assignments ---
  const unifiedRows = useMemo(() => {
    const rows = [];
    const requestDates = new Set();

    // Add all OvertimeRequests
    for (const item of assignments) {
      const date = item.overtime_date || item.date;
      requestDates.add(date);
      const busy = busyMap[date];
      rows.push({
        ...item,
        _date: date,
        _assignedBy: item.source_type === 'INTENDED' && busy ? busy.manager_name : null,
        _maxHours: item.source_type === 'INTENDED' && busy ? busy.max_hours : null,
        _requestedHours: item.duration_hours != null
          ? parseFloat(item.duration_hours)
          : item.duration_minutes != null
          ? parseFloat(item.duration_minutes) / 60
          : item.duration_seconds != null
          ? parseFloat(item.duration_seconds) / 3600
          : null,
        _type: 'request',
      });
    }

    // Add unclaimed assignments (ASSIGNED/EXPIRED from busyDays)
    for (const busy of busyDays) {
      if ((busy.status === 'ASSIGNED' || busy.status === 'EXPIRED') && !requestDates.has(busy.date)) {
        rows.push({
          id: `asgn-${busy.date}`,
          _date: busy.date,
          _assignedBy: busy.manager_name,
          _maxHours: busy.max_hours,
          _requestedHours: null,
          status: busy.status,
          source_type: 'INTENDED',
          task_description: busy.task_description,
          _type: 'assignment',
        });
      }
    }

    rows.sort((a, b) => (b._date || '').localeCompare(a._date || ''));
    return rows;
  }, [assignments, busyDays, busyMap]);

  // --- Calendar generation ---
  const { weeks } = useMemo(() => {
    if (!fiscalPeriod?.current) return { weeks: [] };
    const days = generateFiscalDays(fiscalPeriod.current.start, fiscalPeriod.current.end);
    return { weeks: organizeIntoWeeks(days) };
  }, [fiscalPeriod]);

  // --- Selection handlers ---
  const toggleDate = useCallback((dateStr) => {
    setSelectedDates(prev => {
      let next;
      if (prev.includes(dateStr)) {
        next = prev.filter(d => d !== dateStr);
      } else {
        next = [...prev, dateStr].sort();
      }
      setHoursPerDay(getDefaultHours(next));
      return next;
    });
    setConfirmOverLimit(false);
    setError('');
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDates([]);
    setHoursPerDay(6);
    setConfirmOverLimit(false);
    setError('');
  }, []);

  const removeDate = useCallback((dateStr) => {
    setSelectedDates(prev => {
      const next = prev.filter(d => d !== dateStr);
      setHoursPerDay(getDefaultHours(next));
      return next;
    });
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
  // --- Cancel my assignment ---
  const handleCancelMyAssignment = async (a) => {
    if (!window.confirm(`${a.employee_name || 'Çalışan'} - ${a.date} atamasını iptal etmek istiyor musunuz?`)) return;
    setCancellingId(a.id);
    try {
      await api.post(`/overtime-assignments/${a.id}/cancel/`);
      fetchMyAssignments();
      fetchTeamAssignments();
      onAssignmentCreated?.();
    } catch (err) {
      message.error(err.response?.data?.error || 'İptal sırasında hata oluştu.');
    }
    setCancellingId(null);
  };

  // --- Cancel from detail modal ---
  const handleCancelFromDetail = async (a) => {
    if (!window.confirm(`${a.employee_name || 'Çalışan'} - ${a.date} atamasını iptal etmek istiyor musunuz?`)) return;
    setCancellingId(a.id);
    try {
      await api.post(`/overtime-assignments/${a.id}/cancel/`);
      setDetailModal(null);
      fetchMyAssignments();
      fetchTeamAssignments();
      onAssignmentCreated?.();
      message.success('Atama iptal edildi.');
    } catch (err) {
      message.error(err.response?.data?.error || 'İptal sırasında hata oluştu.');
    }
    setCancellingId(null);
  };

  // --- Open edit modal ---
  const openEditModal = (a) => {
    setEditForm({
      max_duration_hours: a.max_duration_hours || 1,
      task_description: a.task_description || '',
      notes: a.notes || '',
    });
    setEditModal(a);
  };

  // --- Submit edit ---
  const handleEditSubmit = async () => {
    if (!editModal) return;
    setEditSubmitting(true);
    try {
      await api.patch(`/overtime-assignments/${editModal.id}/update/`, {
        max_duration_hours: editForm.max_duration_hours,
        task_description: editForm.task_description,
        notes: editForm.notes,
      });
      message.success('Atama güncellendi.');
      setEditModal(null);
      setDetailModal(null);
      fetchMyAssignments();
      fetchTeamAssignments();
      onAssignmentCreated?.();
    } catch (err) {
      const data = err.response?.data;
      message.error(data?.error || data?.detail || 'Güncelleme sırasında hata oluştu.');
    }
    setEditSubmitting(false);
  };

  // --- Override assignment (PRIMARY over SECONDARY / hierarchical) ---
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideConfirmModal, setOverrideConfirmModal] = useState(null);

  const handleOverride = async (a, reason) => {
    setCancellingId(a.id);
    try {
      await api.post(`/overtime-assignments/${a.id}/override/`, {
        action: 'cancel',
        reason: reason || '',
      });
      setOverrideConfirmModal(null);
      setOverrideReason('');
      setDetailModal(null);
      fetchMyAssignments();
      fetchTeamAssignments();
      onAssignmentCreated?.();
      message.success('Atama override edildi (ezildi).');
    } catch (err) {
      message.error(err.response?.data?.error || 'Override sırasında hata oluştu.');
    }
    setCancellingId(null);
  };

  // --- Check if assignment is owned by current user ---
  const isOwnAssignment = useCallback((a) => {
    if (!currentUser) return false;
    return a.assigned_by === currentUser.id;
  }, [currentUser]);

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
      onAssignmentCreated?.();
      fetchAssignments();
      fetchMyAssignments();
      fetchTeamAssignments();
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

  // --- Handle busy day click → open detail modal ---
  const handleBusyDayClick = useCallback((day) => {
    // Find assignment from combined list
    const allAssignments = [...myAssignments, ...teamAssignments];
    const match = allAssignments.find(a =>
      a.date === day.date &&
      (a.employee === selectedEmployeeId || a.employee_id === selectedEmployeeId)
    );
    if (match) {
      setDetailModal(match);
    } else {
      // Fallback: show busyMap info in a minimal way
      const info = busyMap[day.date];
      if (info) {
        setDetailModal({
          date: day.date,
          employee_name: selectedEmployee?.name || '—',
          assigned_by_name: info.manager_name || '—',
          max_duration_hours: info.max_hours,
          status: info.status || 'ASSIGNED',
          task_description: info.task_description || '',
        });
      }
    }
  }, [myAssignments, teamAssignments, selectedEmployeeId, selectedEmployee, busyMap]);

  // --- Render calendar cell ---
  const renderCell = (day, idx) => {
    if (!day) {
      return <div key={`empty-${idx}`} className="h-9" />;
    }

    const isBusy = !!busyMap[day.date];
    const busyInfo = busyMap[day.date];
    const isSelected = selectedDates.includes(day.date);
    // Busy dates are always clickable (open detail), only past+not-busy are disabled
    const isDisabled = day.isPast && !isBusy;

    let cellClasses = 'h-9 w-full rounded-lg text-xs font-bold relative flex items-center justify-center transition-all duration-150 ';

    if (isBusy) {
      cellClasses += 'bg-blue-50 text-blue-500 ring-1 ring-blue-300 cursor-pointer hover:bg-blue-100 hover:ring-blue-400';
    } else if (day.isPast) {
      cellClasses += 'bg-slate-100 text-slate-300 cursor-not-allowed';
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
        onClick={() => isBusy ? handleBusyDayClick(day) : toggleDate(day.date)}
        title={
          isBusy
            ? `Dolu — ${busyInfo?.manager_name || 'Atanmış'} (detay için tıklayın)`
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
      {/* ===== TEAM TABS + EMPLOYEE SELECTOR ===== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
        {/* Team Tabs — hide when parent already controls team selection */}
        {!parentTeamTab && (
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            <Tooltip title="Doğrudan yöneticiniz olduğunuz çalışanlar" placement="top">
              <button
                onClick={() => { setTeamTab('primary'); setSelectedEmployeeId(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  teamTab === 'primary'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users size={14} className="inline mr-1.5" />
                Ana Ekip ({primaryTeam.length})
              </button>
            </Tooltip>
            <Tooltip title="İkincil yönetici olarak atandığınız çalışanlar (sadece ek mesai)" placement="top">
              <button
                onClick={() => { setTeamTab('secondary'); setSelectedEmployeeId(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  teamTab === 'secondary'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users size={14} className="inline mr-1.5" />
                İkincil Ekip ({secondaryTeam.length})
              </button>
            </Tooltip>
          </div>
        )}

        {/* Team loading state */}
        {teamLoading && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 size={16} className="text-violet-500 animate-spin" />
            <span className="text-sm text-slate-500">Ekip yükleniyor...</span>
          </div>
        )}

        {/* Secondary team empty state */}
        {!teamLoading && teamTab === 'secondary' && secondaryTeam.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <Users size={24} className="mx-auto text-amber-400 mb-2" />
            <p className="text-sm font-bold text-amber-700">Henüz ikincil ekibiniz bulunmamaktadır</p>
            <p className="text-xs text-amber-500 mt-1">İkincil yönetici olarak atandığınızda burada çalışanlar görünecektir</p>
          </div>
        )}

        {/* Employee Selector */}
        {!teamLoading && employees.length > 0 && (
          <div>
            <FieldLabel
              text="Personel"
              tooltip="Ek mesai atamak istediğiniz çalışanı seçin. Sadece ekibinizdeki çalışanları görebilirsiniz."
            />
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
        )}
      </div>

      {/* ===== EMPTY STATE (no employee selected) ===== */}
      {!selectedEmployeeId && !teamLoading && employees.length > 0 && (
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
                            <Tooltip title="Çalışanın bu hafta için toplam ek mesai saati. Haftalık limit genellikle 30 saattir." placement="top">
                              <Info size={11} className="text-slate-400 cursor-help" />
                            </Tooltip>
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
                          : `Mali Dönem`}
                      </span>
                      <Tooltip title="Mavi ile işaretli günler daha önce atanmış, mor günler yeni seçiminiz. Geçmiş günlere atama yapılamaz." placement="top">
                        <Info size={12} className="text-slate-400 cursor-help" />
                      </Tooltip>
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
                          {selectedEmployee?.name || `Çalışan`}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate">
                          {typeof selectedEmployee?.department === 'object' ? selectedEmployee.department.name : (selectedEmployee?.department || '')}
                        </p>
                      </div>
                    </div>

                    {/* Hours per day */}
                    <div>
                      <FieldLabel
                        text={`Saat / Gün`}
                        tooltip="Her gün için atanacak ek mesai süresi (saat). 0.5 ile 12 saat arasında."
                      />
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
                      <FieldLabel
                        text={`Görev Açıklaması`}
                        tooltip="Çalışanın yapacağı işin kısa açıklaması. Bu metin çalışana bildirim olarak gönderilir."
                        required
                      />
                      <textarea
                        rows="3"
                        maxLength={500}
                        value={taskDescription}
                        onChange={e => setTaskDescription(e.target.value)}
                        placeholder={`Yapılacak işin açıklaması...`}
                        className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none transition-all"
                      />
                      <p className="text-[9px] text-slate-400 text-right mt-0.5">
                        {taskDescription.length}/500
                      </p>
                    </div>

                    {/* Notes (optional) */}
                    <div>
                      <FieldLabel
                        text="Not"
                        tooltip="Ek notlar (opsiyonel)"
                      />
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
                          Haftalık fazla çalışma sınırı aşılacak
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
                          <span>{selectedDates.length > 0 ? `${selectedDates.length} Gün İçin Ata` : `Tarih Seçin`}</span>
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
                  ) : unifiedRows.length === 0 ? (
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
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2 px-3">Atayan</th>
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2 px-3">Süre</th>
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2 px-3">Durum</th>
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2 px-3">Kaynak</th>
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2 px-3">Görev</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unifiedRows.map((row, idx) => (
                            <tr key={row.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-3 text-xs font-medium text-slate-700">
                                {row._date ? formatShortDate(row._date) : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-600">
                                {row._assignedBy || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-xs font-medium text-slate-700">
                                {row._requestedHours != null ? (
                                  <span>
                                    {row._requestedHours.toFixed(1)} sa
                                    {row._maxHours != null && (
                                      <span className="text-[10px] text-slate-400 ml-1">/ max {parseFloat(row._maxHours).toFixed(1)}</span>
                                    )}
                                  </span>
                                ) : row._maxHours != null ? (
                                  <span className="text-slate-500">max {parseFloat(row._maxHours).toFixed(1)} sa</span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[row.status] || 'bg-slate-100 text-slate-500'}`}>
                                  {STATUS_LABELS[row.status] || row.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${SOURCE_STYLES[row.source_type] || 'bg-slate-100 text-slate-500'}`}>
                                  {SOURCE_LABELS[row.source_type] || row.source_type || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-600 max-w-[200px] truncate">
                                {row.task_description || '-'}
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

      {/* ===== TÜM ATAMALAR ===== */}
      {(myAssignments.length > 0 || teamAssignments.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Users2 size={16} className="text-slate-400" />
              Tüm Atamalar
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">
                {allAssignmentsCombined.length}
              </span>
            </h3>
            <div className="flex gap-1">
              {['ASSIGNED', 'ALL'].map(f => (
                <button key={f} onClick={() => setAllFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    allFilter === f ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {f === 'ASSIGNED' ? 'Aktif' : 'Tümü'}
                </button>
              ))}
            </div>
          </div>

          {/* Filters row */}
          {(uniqueManagers.length > 1 || uniqueEmployees.length > 1) && (
            <div className="flex gap-3 flex-wrap">
              {uniqueManagers.length > 1 && (
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
                >
                  <option value="ALL">Tüm Yöneticiler</option>
                  {uniqueManagers.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              )}
              {uniqueEmployees.length > 1 && (
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
                >
                  <option value="ALL">Tüm Çalışanlar</option>
                  {uniqueEmployees.map(emp => (
                    <option key={emp.value} value={emp.value}>{emp.label}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {teamAssignmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-400" />
              <span className="ml-2 text-sm text-slate-400">Yükleniyor...</span>
            </div>
          ) : allAssignmentsCombined.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              {allFilter === 'ASSIGNED' ? 'Aktif atama yok.' : 'Atama bulunmuyor.'}
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {allAssignmentsCombined.map(a => {
                const statusColors = {
                  ASSIGNED: 'border-sky-200 bg-sky-50/50',
                  CLAIMED: 'border-purple-200 bg-purple-50/50',
                  EXPIRED: 'border-red-200 bg-red-50/30',
                  CANCELLED: 'border-slate-200 bg-slate-50/30',
                };
                const statusBadge = {
                  ASSIGNED: 'bg-sky-100 text-sky-700',
                  CLAIMED: 'bg-purple-100 text-purple-700',
                  EXPIRED: 'bg-red-100 text-red-600',
                  CANCELLED: 'bg-slate-100 text-slate-500',
                };
                const statusLabels = { ASSIGNED: 'Atandı', CLAIMED: 'Talep Edildi', EXPIRED: 'Süresi Doldu', CANCELLED: 'İptal' };
                const d = new Date(a.date + 'T00:00:00');
                const isMine = isOwnAssignment(a);
                const todayStr = getIstanbulToday();
                const isPast = a.date < todayStr;
                const isToday = a.date === todayStr;
                const rd = a.request_detail;
                const hasClaimed = rd?.claimed;
                const hasAttendance = rd?.has_attendance;
                const reqStatus = rd?.request_status;
                const actualHours = rd?.actual_ot_hours;

                return (
                  <div key={a.id}
                    className={`rounded-xl border transition-all bg-white cursor-pointer hover:shadow-md ${statusColors[a.status] || statusColors.CANCELLED}`}
                    onClick={() => setDetailModal(a)}
                  >
                    {/* Top Row: Date + Employee + Actions */}
                    <div className="flex items-start gap-3 p-3 pb-2">
                      {/* Date pill */}
                      <div className={`w-14 flex-shrink-0 rounded-lg p-1.5 text-center ${isToday ? 'bg-violet-600 text-white' : isPast ? 'bg-slate-100' : 'bg-violet-50'}`}>
                        <div className={`text-lg font-black leading-tight ${isToday ? 'text-white' : 'text-slate-800'}`}>{d.getDate()}</div>
                        <div className={`text-[9px] font-bold uppercase ${isToday ? 'text-violet-200' : 'text-slate-400'}`}>
                          {d.toLocaleDateString('tr-TR', { month: 'short' })}
                        </div>
                        <div className={`text-[8px] font-bold ${isToday ? 'text-violet-200' : 'text-slate-300'}`}>
                          {d.toLocaleDateString('tr-TR', { weekday: 'short' })}
                        </div>
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-slate-800 truncate">{a.employee_name || '—'}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold flex-shrink-0 ${statusBadge[a.status] || statusBadge.CANCELLED}`}>
                            {statusLabels[a.status] || a.status}
                          </span>
                        </div>
                        {a.task_description && (
                          <div className="text-[11px] text-slate-500 truncate mb-1">{a.task_description}</div>
                        )}
                        {/* Info chips row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600">
                            <Clock size={10} /> {a.max_duration_hours} sa
                          </span>
                          {a.assigned_by_name && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 text-[10px] font-medium text-slate-500">
                              <UserCheck size={10} /> {a.assigned_by_name}
                            </span>
                          )}
                          {hasClaimed && reqStatus && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              reqStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                              reqStatus === 'REJECTED' ? 'bg-red-50 text-red-600' :
                              reqStatus === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                              'bg-slate-50 text-slate-500'
                            }`}>
                              {reqStatus === 'APPROVED' ? <><Check size={10} /> Onaylı</> :
                               reqStatus === 'REJECTED' ? <><X size={10} /> Reddedildi</> :
                               reqStatus === 'PENDING' ? <><Clock size={10} /> Onay Bekliyor</> :
                               reqStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1 flex-shrink-0">
                        {isMine && a.status === 'ASSIGNED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(a); }}
                            title="Düzenle"
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold transition-colors flex items-center gap-1">
                            <Pencil size={12} /> Düzenle
                          </button>
                        )}
                        {isMine && a.status === 'ASSIGNED' && a.can_cancel !== false && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancelMyAssignment(a); }}
                            disabled={cancellingId === a.id}
                            title="İptal Et"
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold transition-colors flex items-center gap-1 disabled:opacity-50">
                            <X size={12} /> {cancellingId === a.id ? '...' : 'İptal'}
                          </button>
                        )}
                        {!isMine && a.can_override && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setOverrideConfirmModal(a); setOverrideReason(''); }}
                            disabled={cancellingId === a.id}
                            title="Kararı Ez (Override)"
                            className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-[10px] font-bold transition-colors flex items-center gap-1 disabled:opacity-50">
                            <ShieldX size={12} /> Override
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailModal(a); }}
                          title="Detay"
                          className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 text-[10px] font-bold transition-colors flex items-center gap-1">
                          <Eye size={12} /> Detay
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Realization info (only if attendance exists or claimed) */}
                    {(hasAttendance || hasClaimed) && (
                      <div className="flex items-center gap-3 px-3 pb-2.5 pt-0">
                        <div className="w-14 flex-shrink-0" /> {/* spacer matching date col */}
                        <div className={`flex-1 flex items-center gap-2.5 flex-wrap px-2.5 py-1.5 rounded-lg text-[10px] ${
                          hasAttendance ? 'bg-emerald-50/70' : 'bg-slate-50'
                        }`}>
                          {hasAttendance && rd.check_in && (
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <ArrowRight size={10} className="text-emerald-500" />
                              Giriş: <strong>{new Date(rd.check_in).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</strong>
                            </span>
                          )}
                          {hasAttendance && rd.check_out && (
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <ArrowRight size={10} className="text-red-400 rotate-180" />
                              Çıkış: <strong>{new Date(rd.check_out).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</strong>
                            </span>
                          )}
                          {actualHours != null && actualHours > 0 && (
                            <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700">
                              <Activity size={10} /> Fiili: {actualHours} sa
                            </span>
                          )}
                          {actualHours === 0 && hasAttendance && (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                              <Info size={10} /> EK mesai yok
                            </span>
                          )}
                          {hasClaimed && rd.requested_hours != null && (
                            <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                              <FileText size={10} /> Talep: {rd.requested_hours} sa
                            </span>
                          )}
                          {hasClaimed && rd.target_approver_name && (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <UserCheck size={10} /> {rd.target_approver_name}
                            </span>
                          )}
                          {!hasAttendance && hasClaimed && (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                              <Info size={10} /> Henüz giriş kaydı yok
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== DETAIL MODAL ===== */}
      {detailModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <Eye size={18} className="text-violet-500" />
                Atama Detayı
              </h3>
              <button onClick={() => setDetailModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Employee & Department */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Users size={18} className="text-violet-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">{detailModal.employee_name || '—'}</div>
                  <div className="text-xs text-slate-500">{detailModal.employee_department || '—'}</div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tarih</div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    {(() => {
                      try {
                        const d = new Date(detailModal.date + 'T00:00:00');
                        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' });
                      } catch { return detailModal.date; }
                    })()}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Max Süre</div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    {detailModal.max_duration_hours} saat
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Durum</div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold ${STATUS_STYLES[detailModal.status] || 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABELS[detailModal.status] || detailModal.status}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Atayan</div>
                  <div className="text-sm font-bold text-slate-800">{detailModal.assigned_by_name || '—'}</div>
                </div>
              </div>

              {/* Task Description */}
              {detailModal.task_description && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Görev Açıklaması</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{detailModal.task_description}</div>
                </div>
              )}

              {/* Notes */}
              {detailModal.notes && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Notlar</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{detailModal.notes}</div>
                </div>
              )}

              {/* ── Lifecycle / Gerçekleşme Bilgisi ── */}
              {detailModal.request_detail && (
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    <Activity size={12} /> Yaşam Döngüsü
                  </div>

                  {/* Step indicators */}
                  <div className="flex items-center gap-1 text-[11px]">
                    {/* Step 1: Atandı */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-100 text-violet-700 font-bold">
                      <CircleDot size={12} /> Atandı
                    </div>
                    <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />

                    {/* Step 2: Talep */}
                    {detailModal.request_detail.claimed ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
                        <CircleCheck size={12} /> Talep Edildi
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-400 font-bold">
                        <CircleDot size={12} /> Bekleniyor
                      </div>
                    )}
                    <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />

                    {/* Step 3: Onay durumu */}
                    {detailModal.request_detail.claimed ? (
                      detailModal.request_detail.request_status === 'APPROVED' ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                          <Check size={12} /> Onaylandı
                        </div>
                      ) : detailModal.request_detail.request_status === 'REJECTED' ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 font-bold">
                          <X size={12} /> Reddedildi
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">
                          <Clock size={12} /> Onay Bekliyor
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-300 font-bold">
                        <CircleDot size={12} /> —
                      </div>
                    )}
                  </div>

                  {/* Claimed request details */}
                  {detailModal.request_detail.claimed && (
                    <div className="bg-blue-50/60 rounded-xl p-3 space-y-2">
                      <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">Talep Bilgileri</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {detailModal.request_detail.requested_hours != null && (
                          <div>
                            <span className="text-slate-400">Talep Edilen:</span>{' '}
                            <span className="font-bold text-slate-700">{detailModal.request_detail.requested_hours} saat</span>
                          </div>
                        )}
                        {detailModal.request_detail.source_type && (
                          <div>
                            <span className="text-slate-400">Kaynak:</span>{' '}
                            <span className="font-bold text-slate-700">
                              {detailModal.request_detail.source_type === 'INTENDED' ? 'Planlı' :
                               detailModal.request_detail.source_type === 'POTENTIAL' ? 'Algılanan' :
                               detailModal.request_detail.source_type === 'MANUAL' ? 'Manuel' :
                               detailModal.request_detail.source_type}
                            </span>
                          </div>
                        )}
                        {detailModal.request_detail.start_time && (
                          <div>
                            <span className="text-slate-400">Başlangıç:</span>{' '}
                            <span className="font-bold text-slate-700">
                              {new Date(detailModal.request_detail.start_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        {detailModal.request_detail.end_time && (
                          <div>
                            <span className="text-slate-400">Bitiş:</span>{' '}
                            <span className="font-bold text-slate-700">
                              {new Date(detailModal.request_detail.end_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        {detailModal.request_detail.target_approver_name && (
                          <div className="col-span-2">
                            <span className="text-slate-400">Onaylayıcı:</span>{' '}
                            <span className="font-bold text-slate-700 inline-flex items-center gap-1">
                              <UserCheck size={12} className="text-blue-500" />
                              {detailModal.request_detail.target_approver_name}
                            </span>
                          </div>
                        )}
                        {detailModal.request_detail.reason && (
                          <div className="col-span-2">
                            <span className="text-slate-400">Sebep:</span>{' '}
                            <span className="text-slate-600">{detailModal.request_detail.reason}</span>
                          </div>
                        )}
                        {detailModal.request_detail.approved_at && (
                          <div className="col-span-2 text-[11px] text-emerald-600">
                            Onaylanma: {new Date(detailModal.request_detail.approved_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {detailModal.request_detail.rejected_at && (
                          <div className="col-span-2 text-[11px] text-red-600">
                            Reddedilme: {new Date(detailModal.request_detail.rejected_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actual attendance / realization */}
                  {detailModal.request_detail.has_attendance ? (
                    <div className="bg-emerald-50/60 rounded-xl p-3 space-y-2">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1 flex items-center gap-1">
                        <CircleCheck size={12} /> Gerçekleşme Bilgisi
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {detailModal.request_detail.check_in && (
                          <div>
                            <span className="text-slate-400">Giriş:</span>{' '}
                            <span className="font-bold text-slate-700">
                              {new Date(detailModal.request_detail.check_in).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        {detailModal.request_detail.check_out && (
                          <div>
                            <span className="text-slate-400">Çıkış:</span>{' '}
                            <span className="font-bold text-slate-700">
                              {new Date(detailModal.request_detail.check_out).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        {detailModal.request_detail.actual_ot_hours != null && (
                          <div>
                            <span className="text-slate-400">Fiili EK Mesai:</span>{' '}
                            <span className="font-extrabold text-emerald-700">{detailModal.request_detail.actual_ot_hours} saat</span>
                          </div>
                        )}
                        {detailModal.request_detail.normal_hours != null && (
                          <div>
                            <span className="text-slate-400">Normal Mesai:</span>{' '}
                            <span className="font-bold text-slate-700">{detailModal.request_detail.normal_hours} saat</span>
                          </div>
                        )}
                        {detailModal.request_detail.attendance_status && (
                          <div className="col-span-2">
                            <span className="text-slate-400">Puantaj Durumu:</span>{' '}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${STATUS_STYLES[detailModal.request_detail.attendance_status] || 'bg-slate-100 text-slate-500'}`}>
                              {STATUS_LABELS[detailModal.request_detail.attendance_status] || detailModal.request_detail.attendance_status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2 text-xs text-slate-400">
                      <Info size={14} className="flex-shrink-0" />
                      Henüz giriş/çıkış kaydı bulunmuyor.
                    </div>
                  )}
                </div>
              )}

              {/* Fallback: OT Request Status (when request_detail not available) */}
              {!detailModal.request_detail && detailModal.overtime_request_status && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ek Mesai Talebi</div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold ${STATUS_STYLES[detailModal.overtime_request_status] || 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABELS[detailModal.overtime_request_status] || detailModal.overtime_request_status}
                  </span>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                {detailModal.created_at && (
                  <span>Oluşturulma: {new Date(detailModal.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                )}
                {detailModal.updated_at && (
                  <span>Güncelleme: {new Date(detailModal.updated_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            </div>

            {/* Footer Actions — own assignment: edit + cancel */}
            {isOwnAssignment(detailModal) && detailModal.status === 'ASSIGNED' && (
              <div className="flex items-center gap-2 p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <button
                  onClick={() => openEditModal(detailModal)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors"
                >
                  <Pencil size={14} />
                  Düzenle
                </button>
                {detailModal.can_cancel !== false && (
                  <button
                    onClick={() => handleCancelFromDetail(detailModal)}
                    disabled={cancellingId === detailModal.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    <X size={14} />
                    {cancellingId === detailModal.id ? 'İptal Ediliyor...' : 'İptal Et'}
                  </button>
                )}
              </div>
            )}

            {/* Footer Actions — override: PRIMARY can override SECONDARY's assignment */}
            {!isOwnAssignment(detailModal) && detailModal.can_override && (
              <div className="p-5 border-t border-slate-100 bg-orange-50/50 rounded-b-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs text-orange-700">
                  <ShieldX size={14} className="flex-shrink-0" />
                  <span className="font-bold">Bu atamayı ezebilirsiniz (override). Atayan: {detailModal.assigned_by_name}</span>
                </div>
                <button
                  onClick={() => { setOverrideConfirmModal(detailModal); setOverrideReason(''); }}
                  disabled={cancellingId === detailModal.id}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
                >
                  <ShieldX size={14} />
                  {cancellingId === detailModal.id ? 'İşleniyor...' : 'Kararı Ez (Override)'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {editModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <Pencil size={18} className="text-blue-500" />
                Atama Düzenle
              </h3>
              <button onClick={() => setEditModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Info */}
            <div className="px-5 pt-4 pb-2">
              <div className="text-sm font-bold text-slate-800">{editModal.employee_name || '—'}</div>
              <div className="text-xs text-slate-400">
                {(() => {
                  try {
                    const d = new Date(editModal.date + 'T00:00:00');
                    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' });
                  } catch { return editModal.date; }
                })()}
              </div>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Max Duration Hours */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Maksimum Süre (saat)</label>
                <input
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={editForm.max_duration_hours}
                  onChange={(e) => setEditForm(prev => ({ ...prev, max_duration_hours: parseFloat(e.target.value) || 0.5 }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>

              {/* Task Description */}
              {(() => {
                const todayStr = getIstanbulToday();
                const isPast = editModal.date < todayStr;
                return !isPast ? (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Görev Açıklaması</label>
                    <textarea
                      value={editForm.task_description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, task_description: e.target.value }))}
                      rows={3}
                      maxLength={500}
                      placeholder="Görev açıklaması..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                    <div className="text-[10px] text-slate-400 text-right mt-0.5">{editForm.task_description.length}/500</div>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                    Geçmiş tarihli atamanın görev açıklaması düzenlenemez.
                  </div>
                );
              })()}

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Notlar</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="İsteğe bağlı notlar..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {editSubmitting ? (
                  <><Loader2 size={14} className="animate-spin" /> Kaydediliyor...</>
                ) : (
                  <><Save size={14} /> Kaydet</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== OVERRIDE CONFIRM MODAL ===== */}
      {overrideConfirmModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOverrideConfirmModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-orange-100 bg-orange-50/50 rounded-t-2xl">
              <h3 className="text-base font-bold text-orange-800 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <ShieldX size={18} className="text-orange-600" />
                Atamayı Ez (Override)
              </h3>
              <button onClick={() => setOverrideConfirmModal(null)} className="p-1.5 rounded-lg hover:bg-orange-100 text-orange-400 hover:text-orange-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1">
                <div className="text-sm font-bold text-orange-800">
                  {overrideConfirmModal.employee_name} — {(() => {
                    try {
                      return new Date(overrideConfirmModal.date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                    } catch { return overrideConfirmModal.date; }
                  })()}
                </div>
                <div className="text-xs text-orange-600">
                  Atayan: <span className="font-bold">{overrideConfirmModal.assigned_by_name}</span> · Max: {overrideConfirmModal.max_duration_hours} sa
                </div>
              </div>

              <div className="text-xs text-slate-600">
                Bu atama başka bir yönetici tarafından oluşturulmuş. Override ile atamayı iptal edeceksiniz.
                Atayan yöneticiye ve çalışana bildirim gönderilecektir.
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Override Sebebi (opsiyonel)
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Neden bu atamayı eziyorsunuz?"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => setOverrideConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={() => handleOverride(overrideConfirmModal, overrideReason)}
                disabled={cancellingId === overrideConfirmModal.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {cancellingId === overrideConfirmModal.id ? (
                  <><Loader2 size={14} className="animate-spin" /> İşleniyor...</>
                ) : (
                  <><ShieldX size={14} /> Onayla ve Ez</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
