import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ArrowLeft, X, AlertCircle, FileText, Clock, Briefcase, Utensils, CreditCard, ChevronRight, Check, Users } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    LeaveRequestForm,
    OvertimeRequestForm,
    MealRequestForm,
    ExternalDutyForm,
    CardlessEntryForm,
} from './request-forms/RequestForms';

// ... (Inside Component)


const CreateRequestModal = ({ isOpen, onClose, onSuccess, requestTypes, initialData, onOvertimeTabSwitch }) => {
    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState(null); // 'LEAVE', 'OVERTIME', 'MEAL'

    useEffect(() => {
        if (isOpen && initialData) {
            if (initialData.type === 'OVERTIME') {
                handleTypeSelect('OVERTIME');
                setOvertimeForm(prev => ({
                    ...prev,
                    date: initialData.data.date,
                    start_time: initialData.data.start_time ? initialData.data.start_time.substring(0, 5) : '',
                    end_time: initialData.data.end_time ? initialData.data.end_time.substring(0, 5) : '',
                    reason: initialData.data.reason || '',
                    attendance: initialData.data.attendance || null
                }));
                setOvertimeManualOpen(true);
            }
        }
    }, [isOpen, initialData]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Claimable overtime data (INTENDED + POTENTIAL)
    const [claimableData, setClaimableData] = useState(null);
    const [claimableLoading, setClaimableLoading] = useState(false);
    const [claimingId, setClaimingId] = useState(null);

    // Track manual section open state for footer visibility
    const [overtimeManualOpen, setOvertimeManualOpen] = useState(false);

    // Form States
    const [leaveForm, setLeaveForm] = useState({
        request_type: '',
        start_date: '',
        end_date: '',
        reason: '',
        destination: '',
        contact_phone: '',
        send_to_substitute: false,
        start_time: '',
        end_time: '',
    });

    const [overtimeForm, setOvertimeForm] = useState({
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        reason: '',
        send_to_substitute: false
    });

    const [mealForm, setMealForm] = useState({
        date: new Date().toISOString().split('T')[0],
        description: ''
    });

    const [externalDutyForm, setExternalDutyForm] = useState({
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        reason: '',
        destination: '',
        trip_type: 'NONE',
        task_type: '',
        needs_transportation: false,
        transport_description: '',
        transport_type: '',
        transport_plate: '',
        transport_driver: '',
        needs_accommodation: false,
        accommodation_name: '',
        accommodation_nights: 0,
        accommodation_notes: '',
        duty_city: '',
        duty_district: '',
        duty_address: '',
        duty_company: '',
        duty_description: '',
        budget_amount: '',
        send_to_substitute: false,
        contact_phone: '',
    });

    const [cardlessEntryForm, setCardlessEntryForm] = useState({
        date: new Date().toISOString().split('T')[0],
        check_in_time: '',
        check_out_time: '',
        reason: '',
        send_to_substitute: false
    });

    // Approver selection
    const [availableApprovers, setAvailableApprovers] = useState([]);
    const [selectedApproverId, setSelectedApproverId] = useState(null);
    const [approversLoading, setApproversLoading] = useState(false);

    // Cardless entry: schedule info for the selected date
    const [cardlessSchedule, setCardlessSchedule] = useState(null);
    const [cardlessScheduleLoading, setCardlessScheduleLoading] = useState(false);

    // Approver substitute info
    const [approverSubstitutes, setApproverSubstitutes] = useState([]);

    // Entitlement info (FIX-3)
    const [entitlementInfo, setEntitlementInfo] = useState(null);

    // Working days info (FIX-4)
    const [workingDaysInfo, setWorkingDaysInfo] = useState(null);
    const [workingDaysLoading, setWorkingDaysLoading] = useState(false);

    // Recent leave history
    const [recentLeaveHistory, setRecentLeaveHistory] = useState([]);

    // FIFO Preview
    const [fifoPreview, setFifoPreview] = useState(null);

    // Excuse leave balance
    const [excuseBalance, setExcuseBalance] = useState(null);

    useEffect(() => {
        if (selectedType !== 'CARDLESS_ENTRY' || !cardlessEntryForm.date) {
            setCardlessSchedule(null);
            return;
        }
        const fetchSchedule = async () => {
            setCardlessScheduleLoading(true);
            try {
                const res = await api.get(`/cardless-entry-requests/schedule-info/?date=${cardlessEntryForm.date}`);
                setCardlessSchedule(res.data);
                // Auto-fill times if it's a work day
                if (res.data.is_work_day && res.data.start_time && res.data.end_time) {
                    setCardlessEntryForm(prev => ({
                        ...prev,
                        check_in_time: prev.check_in_time || res.data.start_time,
                        check_out_time: prev.check_out_time || res.data.end_time
                    }));
                }
            } catch {
                setCardlessSchedule(null);
            } finally {
                setCardlessScheduleLoading(false);
            }
        };
        fetchSchedule();
    }, [cardlessEntryForm.date, selectedType]);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedType(null);
            setError(null);
            setClaimableData(null);
            setClaimingId(null);
            setOvertimeManualOpen(false);
            setAvailableApprovers([]);
            setSelectedApproverId(null);
            setEntitlementInfo(null);
            setWorkingDaysInfo(null);
            setRecentLeaveHistory([]);
            setFifoPreview(null);
            setExcuseBalance(null);
            setApproverSubstitutes([]);
            // Reset forms
            setOvertimeForm({
                date: new Date().toISOString().split('T')[0],
                start_time: '',
                end_time: '',
                reason: '',
                send_to_substitute: false
            });
        }
    }, [isOpen]);

    // Fetch available approvers when type is selected (not MEAL)
    useEffect(() => {
        if (!selectedType || selectedType === 'MEAL') {
            setAvailableApprovers([]);
            setSelectedApproverId(null);
            return;
        }
        const fetchApprovers = async () => {
            setApproversLoading(true);
            try {
                const typeMap = { LEAVE: 'LEAVE', OVERTIME: 'OVERTIME', EXTERNAL_DUTY: 'EXTERNAL_DUTY', CARDLESS_ENTRY: 'CARDLESS_ENTRY' };
                const res = await api.get(`/available-approvers/?type=${typeMap[selectedType] || 'LEAVE'}`);
                setAvailableApprovers(res.data || []);
                // Tek yönetici varsa otomatik seç
                if (res.data && res.data.length === 1) {
                    setSelectedApproverId(res.data[0].id);
                } else {
                    setSelectedApproverId(null);
                }
            } catch {
                setAvailableApprovers([]);
                setSelectedApproverId(null);
            } finally {
                setApproversLoading(false);
            }
        };
        fetchApprovers();
    }, [selectedType]);

    // Secili yoneticinin vekillerini getir
    useEffect(() => {
        if (!selectedApproverId) { setApproverSubstitutes([]); return; }
        api.get(`/substitute-authority/?search=${selectedApproverId}`)
            .then(res => {
                const today = new Date().toISOString().split('T')[0];
                const active = (res.data?.results || res.data || []).filter(s =>
                    s.principal === selectedApproverId || s.principal_id === selectedApproverId
                ).filter(s => s.valid_from <= today && s.valid_to >= today);
                setApproverSubstitutes(active);
            })
            .catch(() => setApproverSubstitutes([]));
    }, [selectedApproverId]);

    // Fetch claimable overtime when OVERTIME is selected
    useEffect(() => {
        if (selectedType === 'OVERTIME') {
            fetchClaimableOvertime();
        }
    }, [selectedType]);

    const [leaveStats, setLeaveStats] = useState(null);

    useEffect(() => {
        const fetchLeaveStats = async () => {
            // Only fetch if leave type is selected and it looks like it might be annual leave (or just fetch always for LEAVE type)
            if (selectedType === 'LEAVE' && leaveForm.request_type) {
                const typeObj = requestTypes.find(t => t.id == leaveForm.request_type);
                if (typeObj && typeObj.code === 'ANNUAL_LEAVE') {
                    try {
                        const res = await api.get('/attendance/monthly_summary/');
                        setLeaveStats(res.data);
                    } catch (e) {
                        console.error("Failed to fetch leave stats", e);
                    }
                }
            }
        };
        fetchLeaveStats();
    }, [selectedType, leaveForm.request_type, requestTypes]);

    // FIX-3: Fetch entitlement info
    useEffect(() => {
        const fetchEntitlement = async () => {
            if (selectedType === 'LEAVE') {
                try {
                    const res = await api.get('/leave/requests/my-entitlement/');
                    setEntitlementInfo(res.data);
                } catch (e) {
                    console.error("Failed to fetch entitlement info", e);
                    setEntitlementInfo(null);
                }
            } else {
                setEntitlementInfo(null);
            }
        };
        fetchEntitlement();
    }, [selectedType]);

    // Fetch recent leave history
    useEffect(() => {
        if (selectedType === 'LEAVE') {
            api.get('/leave/requests/my_requests/')
                .then(res => {
                    const data = res.data?.results || res.data || [];
                    setRecentLeaveHistory(data.slice(0, 5));
                })
                .catch(() => setRecentLeaveHistory([]));
        } else {
            setRecentLeaveHistory([]);
        }
    }, [selectedType]);

    // FIX-4: Fetch working days info (debounced)
    useEffect(() => {
        if (selectedType !== 'LEAVE' || !leaveForm.start_date || !leaveForm.end_date) {
            setWorkingDaysInfo(null);
            return;
        }

        const typeObj = requestTypes.find(t => t.id == leaveForm.request_type);
        if (!typeObj || typeObj.code !== 'ANNUAL_LEAVE') {
            setWorkingDaysInfo(null);
            return;
        }

        const timer = setTimeout(async () => {
            setWorkingDaysLoading(true);
            try {
                const res = await api.get(`/leave/requests/calculate-days/?start_date=${leaveForm.start_date}&end_date=${leaveForm.end_date}`);
                setWorkingDaysInfo(res.data);
            } catch (e) {
                console.error("Failed to calculate working days", e);
                setWorkingDaysInfo(null);
            } finally {
                setWorkingDaysLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [selectedType, leaveForm.start_date, leaveForm.end_date, leaveForm.request_type, requestTypes]);

    // Fetch excuse leave balance when EXCUSE_LEAVE is selected
    useEffect(() => {
        const selectedTypeObj = requestTypes.find(t => t.id == leaveForm.request_type);
        if (selectedTypeObj?.code === 'EXCUSE_LEAVE') {
            api.get('/leave/requests/excuse-balance/')
                .then(res => setExcuseBalance(res.data))
                .catch(() => setExcuseBalance(null));
        } else {
            setExcuseBalance(null);
        }
    }, [leaveForm.request_type, requestTypes]);

    // FIFO Preview fetch
    useEffect(() => {
        if (selectedType !== 'LEAVE' || !workingDaysInfo?.working_days) {
            setFifoPreview(null);
            return;
        }

        const typeObj = requestTypes.find(t => t.id == leaveForm.request_type);
        if (!typeObj || typeObj.code !== 'ANNUAL_LEAVE') {
            setFifoPreview(null);
            return;
        }

        const days = workingDaysInfo.working_days;
        if (days <= 0) {
            setFifoPreview(null);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await api.get(`/leave/requests/fifo-preview/?days=${days}`);
                setFifoPreview(res.data);
            } catch (e) {
                console.error("Failed to fetch FIFO preview", e);
                setFifoPreview(null);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [selectedType, leaveForm.request_type, workingDaysInfo, requestTypes]);

    const fetchClaimableOvertime = async () => {
        setClaimableLoading(true);
        try {
            const res = await api.get('/overtime-assignments/claimable/');
            setClaimableData(res.data);
        } catch (error) {
            console.error('Error fetching claimable overtime:', error);
            setClaimableData({ intended: [], potential: [] });
        } finally {
            setClaimableLoading(false);
        }
    };

    // Handler: Claim INTENDED overtime (assignment)
    const handleClaimIntended = async (assignmentId, reason) => {
        setClaimingId(assignmentId);
        setError(null);
        try {
            await api.post(`/overtime-assignments/${assignmentId}/claim/`, { reason });
            // Remove the claimed item from the list
            setClaimableData(prev => ({
                ...prev,
                intended: (prev?.intended || []).filter(i => i.assignment_id !== assignmentId),
            }));
            onSuccess(null); // Trigger parent refresh (no specific approver name)
        } catch (err) {
            console.error('Error claiming intended overtime:', err);
            const data = err.response?.data;
            const errorMsg = data?.detail || data?.error || 'Talep oluşturulurken bir hata oluştu.';
            setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
        } finally {
            setClaimingId(null);
        }
    };

    // Handler: Claim POTENTIAL overtime (from attendance)
    const handleClaimPotential = async (attendanceId, reason) => {
        setClaimingId(attendanceId);
        setError(null);
        try {
            await api.post('/overtime-requests/create_from_attendance/', { attendance_id: attendanceId, reason });
            // Remove the claimed item from the list
            setClaimableData(prev => ({
                ...prev,
                potential: (prev?.potential || []).filter(p => p.attendance_id !== attendanceId),
            }));
            onSuccess(null); // Trigger parent refresh
        } catch (err) {
            console.error('Error claiming potential overtime:', err);
            const data = err.response?.data;
            const errorMsg = data?.detail || data?.error || 'Talep oluşturulurken bir hata oluştu.';
            setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
        } finally {
            setClaimingId(null);
        }
    };

    if (!isOpen) return null;

    const handleTypeSelect = (type) => {
        setSelectedType(type);
        setStep(2);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let response;

            const approverPayload = selectedApproverId ? { target_approver_id: selectedApproverId } : {};

            if (selectedType === 'LEAVE') {
                const leavePayload = { ...leaveForm, ...approverPayload };
                // Mazeret izni: end_date = start_date, include start_time/end_time
                const leaveTypeObj = requestTypes.find(t => t.id == leaveForm.request_type);
                if (leaveTypeObj?.code === 'EXCUSE_LEAVE') {
                    leavePayload.end_date = leavePayload.start_date;
                }
                // Remove empty time fields for non-excuse leave
                if (!leaveTypeObj || leaveTypeObj.code !== 'EXCUSE_LEAVE') {
                    delete leavePayload.start_time;
                    delete leavePayload.end_time;
                }
                response = await api.post('/leave/requests/', leavePayload);
            } else if (selectedType === 'OVERTIME') {
                // Only manual entry uses the form submit
                response = await api.post('/overtime-requests/manual-entry/', {
                    date: overtimeForm.date,
                    start_time: overtimeForm.start_time,
                    end_time: overtimeForm.end_time,
                    reason: overtimeForm.reason,
                    ...approverPayload
                });
            } else if (selectedType === 'MEAL') {
                response = await api.post('/meal-requests/', mealForm);
            } else if (selectedType === 'EXTERNAL_DUTY') {
                // Find the request type ID for External Duty
                const typeObj = requestTypes.find(t => t.category === 'EXTERNAL_DUTY');
                if (!typeObj) throw new Error('Dış Görev talep türü bulunamadı.');

                response = await api.post('/leave/requests/', {
                    request_type: typeObj.id,
                    start_date: externalDutyForm.start_date,
                    end_date: externalDutyForm.end_date,
                    start_time: externalDutyForm.start_time || null,
                    end_time: externalDutyForm.end_time || null,
                    reason: externalDutyForm.duty_description || externalDutyForm.reason || 'Şirket dışı görev',
                    destination: externalDutyForm.destination || `${externalDutyForm.duty_city} ${externalDutyForm.duty_district}`.trim(),
                    trip_type: externalDutyForm.trip_type,
                    task_type: externalDutyForm.task_type || null,
                    budget_amount: externalDutyForm.budget_amount || null,
                    contact_phone: externalDutyForm.contact_phone,
                    needs_transportation: externalDutyForm.needs_transportation,
                    transport_description: externalDutyForm.needs_transportation ? externalDutyForm.transport_description : '',
                    transport_type: externalDutyForm.needs_transportation ? externalDutyForm.transport_type : '',
                    transport_plate: externalDutyForm.needs_transportation ? externalDutyForm.transport_plate : '',
                    transport_driver: externalDutyForm.needs_transportation ? externalDutyForm.transport_driver : '',
                    needs_accommodation: externalDutyForm.needs_accommodation,
                    accommodation_name: externalDutyForm.needs_accommodation ? externalDutyForm.accommodation_name : '',
                    accommodation_nights: externalDutyForm.needs_accommodation ? externalDutyForm.accommodation_nights : 0,
                    accommodation_notes: externalDutyForm.needs_accommodation ? externalDutyForm.accommodation_notes : '',
                    duty_city: externalDutyForm.duty_city,
                    duty_district: externalDutyForm.duty_district,
                    duty_address: externalDutyForm.duty_address,
                    duty_company: externalDutyForm.duty_company,
                    duty_description: externalDutyForm.duty_description,
                    send_to_substitute: externalDutyForm.send_to_substitute,
                    ...approverPayload,
                });
            } else if (selectedType === 'CARDLESS_ENTRY') {
                response = await api.post('/cardless-entry-requests/', { ...cardlessEntryForm, ...approverPayload });
            }

            // Hedef onaylayıcı bilgisini al
            const data = response?.data;
            const approverName = data?.target_approver_name || null;

            onSuccess(approverName);
            onClose();
        } catch (err) {
            console.error('Error creating request:', err);
            const data = err.response?.data;
            const errorMsg = data?.detail || data?.error || data?.balance?.[0] || data?.balance || data?.date?.[0] || data?.date || 'Talep oluşturulurken bir hata oluştu.';
            setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
        } finally {
            setLoading(false);
        }
    };

    const { user } = useAuth();

    // Helper to calculate balance
    const getLeaveBalance = () => {
        if (!user) return null;
        const balance = user.annual_leave_balance || 0;
        const held = user.held_annual_leave || 0;
        const limit = user.annual_leave_advance_limit || 0;

        const entitlement = user.annual_leave_entitlement || 0;
        const used = user.annual_leave_used || 0;
        const reserved = user.annual_leave_reserved || 0;
        const effective = user.effective_balance !== undefined ? user.effective_balance : balance;

        // New fields
        let daysToAccrual = user.days_to_next_accrual;

        // Prefer live stats if available
        if (leaveStats) {
            daysToAccrual = leaveStats.days_to_next_accrual;
        }

        const nextLeave = user.next_leave_request;
        const usedThisYear = user.annual_leave_used_this_year || 0;

        const advanceUsed = user.annual_leave_advance_used || 0;
        const advanceRemaining = Math.max(0, limit - advanceUsed);
        const available = effective + advanceRemaining;
        const lastLeave = user.last_annual_leave_date || null;
        return { balance, held, limit, available, lastLeave, entitlement, used, reserved, effective, daysToAccrual, nextLeave, usedThisYear, advanceUsed, advanceRemaining };
    };

    // Helper to calculate duration in days
    const calculateDuration = () => {
        if (!leaveForm.start_date || !leaveForm.end_date) return 0;
        // FIX-4: Çalışma günü bilgisi varsa onu kullan
        if (workingDaysInfo && workingDaysInfo.working_days !== undefined) {
            return workingDaysInfo.working_days;
        }
        const start = new Date(leaveForm.start_date);
        const end = new Date(leaveForm.end_date);
        if (isNaN(start) || isNaN(end)) return 0;
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    // Component-level balance insufficiency check (for submit button disable)
    const getInsufficientBalanceState = () => {
        const balance = getLeaveBalance();
        const duration = calculateDuration();
        const selectedTypeObj = requestTypes.find(t => t.id == leaveForm.request_type);
        const isAnnualLeave = selectedTypeObj && selectedTypeObj.code === 'ANNUAL_LEAVE';
        if (isAnnualLeave && balance && duration > 0 && (duration > balance.available)) return true;

        // Mazeret izni bakiye kontrolü
        const isExcuseLeave = selectedTypeObj && selectedTypeObj.code === 'EXCUSE_LEAVE';
        if (isExcuseLeave && excuseBalance) {
            if (excuseBalance.hours_remaining <= 0) return true;
            if (leaveForm.start_time && leaveForm.end_time) {
                const [sh, sm] = leaveForm.start_time.split(':').map(Number);
                const [eh, em] = leaveForm.end_time.split(':').map(Number);
                const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
                if (hours > 0 && hours > excuseBalance.hours_remaining) return true;
            }
        }
        return false;
    };
    const isInsufficientBalance = selectedType === 'LEAVE' && getInsufficientBalanceState();

    const getRelationshipLabel = (rel) => ({
        'PRIMARY': 'Birincil Yönetici',
        'SECONDARY': 'İkincil Yönetici',
        'DEPT_ASSIGNMENT': 'Birim Görev Yöneticisi',
        'DEPT_MANAGER': 'Departman Yöneticisi',
        'DEPT_HIERARCHY': 'Üst Birim Yöneticisi',
    }[rel] || 'Yönetici');

    const renderApproverDropdown = () => {
        if (selectedType === 'MEAL') return null;
        if (approversLoading) {
            return (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 animate-pulse flex items-center gap-2">
                    <Users size={16} />
                    Yöneticiler yükleniyor...
                </div>
            );
        }
        if (availableApprovers.length === 0) return null;
        if (availableApprovers.length === 1) {
            const approver = availableApprovers[0];
            return (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-blue-600" />
                        <span className="text-sm font-bold text-blue-700">Onaya Gidecek Kişi</span>
                    </div>
                    <div className="ml-6">
                        <div className="text-sm font-bold text-slate-800">{approver.name}</div>
                        <div className="text-xs text-blue-600 mt-0.5">
                            {getRelationshipLabel(approver.relationship)}
                            {approver.department_name && ` · ${approver.department_name}`}
                            {approver.via && ` — ${approver.via}`}
                        </div>
                    </div>
                    {/* Vekil bilgisi gosterimi */}
                    {approverSubstitutes.length > 0 && (
                        <div className="mt-3 ml-6 p-2.5 bg-white/60 rounded-lg border border-blue-100 text-xs text-slate-600">
                            <span className="font-bold text-blue-600">Aktif Vekil:</span>{' '}
                            {approverSubstitutes.map((s, i) => (
                                <span key={i}>
                                    {s.substitute_name || s.substitute?.full_name}
                                    <span className="text-slate-400"> ({new Date(s.valid_from).toLocaleDateString('tr-TR')} - {new Date(s.valid_to).toLocaleDateString('tr-TR')})</span>
                                    {i < approverSubstitutes.length - 1 && ', '}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        // Multiple approvers - radio kartlari
        return (
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Users size={14} className="text-blue-500" />
                    Onay Yöneticisi Seçin <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                    {availableApprovers.map(a => (
                        <label
                            key={a.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                selectedApproverId === a.id
                                    ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400/30'
                                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                            }`}
                        >
                            <input
                                type="radio"
                                name="approver_selection"
                                value={a.id}
                                checked={selectedApproverId === a.id}
                                onChange={() => setSelectedApproverId(a.id)}
                                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-800">{a.name}</div>
                                <div className="text-xs text-blue-600">
                                    {getRelationshipLabel(a.relationship)}
                                    {a.via && ` — ${a.via}`}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
                {/* Secili yoneticinin vekil bilgisi */}
                {selectedApproverId && approverSubstitutes.length > 0 && (
                    <div className="mt-2 p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-600">
                        <span className="font-bold text-blue-600">Aktif Vekil:</span>{' '}
                        {approverSubstitutes.map((s, i) => (
                            <span key={i}>
                                {s.substitute_name || s.substitute?.full_name}
                                <span className="text-slate-400"> ({new Date(s.valid_from).toLocaleDateString('tr-TR')} - {new Date(s.valid_to).toLocaleDateString('tr-TR')})</span>
                                {i < approverSubstitutes.length - 1 && ', '}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderTypeSelection = () => (
        <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={() => handleTypeSelect('LEAVE')}
                className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all text-left flex items-center gap-5"
            >
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shrink-0">
                    <FileText size={28} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-0.5">İzin Talebi</h3>
                    <p className="text-sm text-slate-500">Yıllık izin, mazeret izni veya hastalık izni.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <ChevronRight size={18} />
                </div>
            </button>

            <button
                onClick={() => {
                    if (onOvertimeTabSwitch) {
                        onClose();
                        onOvertimeTabSwitch();
                    } else {
                        handleTypeSelect('OVERTIME');
                    }
                }}
                className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 transition-all text-left flex items-center gap-5"
            >
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform shrink-0">
                    <Clock size={28} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-0.5">Fazla Mesai</h3>
                    <p className="text-sm text-slate-500">Planlanan veya gerçekleşen fazla mesai.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <ChevronRight size={18} />
                </div>
            </button>

            <button
                onClick={() => handleTypeSelect('EXTERNAL_DUTY')}
                className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 transition-all text-left flex items-center gap-5"
            >
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform shrink-0">
                    <Briefcase size={28} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-0.5">Şirket Dışı Görev</h3>
                    <p className="text-sm text-slate-500">Müşteri ziyareti, eğitim veya dış görevlendirme.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <ChevronRight size={18} />
                </div>
            </button>

            <button
                onClick={() => handleTypeSelect('MEAL')}
                className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all text-left flex items-center gap-5"
            >
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shrink-0">
                    <Utensils size={28} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-0.5">Yemek Talebi</h3>
                    <p className="text-sm text-slate-500">Bugün için yemek tercihi veya talebi.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <ChevronRight size={18} />
                </div>
            </button>

            <button
                onClick={() => handleTypeSelect('CARDLESS_ENTRY')}
                className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 transition-all text-left flex items-center gap-5"
            >
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform shrink-0">
                    <CreditCard size={28} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-0.5">Kartsız Giriş</h3>
                    <p className="text-sm text-slate-500">Kartınızı unuttuysanız manuel giriş/çıkış talebi oluşturun.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <ChevronRight size={18} />
                </div>
            </button>
        </div>
    );

    // Computed values for cardless entry (used in submit button disabled check)
    const isCardlessWorkDay = cardlessSchedule?.is_work_day !== false;
    const scheduleStart = cardlessSchedule?.start_time || null;
    const scheduleEnd = cardlessSchedule?.end_time || null;

    // Computed value for external duty duration
    const externalDutyDuration = (() => {
        if (!externalDutyForm.start_date || !externalDutyForm.end_date) return 0;
        const start = new Date(externalDutyForm.start_date);
        const end = new Date(externalDutyForm.end_date);
        if (isNaN(start) || isNaN(end)) return 0;
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    })();

    // For overtime: only show footer submit when manual section is open
    const showOvertimeSubmit = selectedType === 'OVERTIME' && overtimeManualOpen;

    // Shared approver dropdown element (passed as prop to form components)
    const approverDropdownElement = renderApproverDropdown();

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {step === 1 ? 'Yeni Talep Oluştur' :
                                    selectedType === 'LEAVE' ? 'İzin Talebi' :
                                        selectedType === 'OVERTIME' ? 'Fazla Mesai Talebi' :
                                            selectedType === 'MEAL' ? 'Yemek Talebi' :
                                                selectedType === 'CARDLESS_ENTRY' ? 'Kartsız Giriş Talebi' : 'Şirket Dışı Görev'}
                            </h2>
                            <p className="text-slate-500 text-xs mt-0.5 font-medium">
                                {step === 1 ? 'Talep türünü seçiniz' :
                                    selectedType === 'OVERTIME' ? 'Mevcut mesaileri talep edin veya manuel giriş yapın' :
                                        'Bilgileri doldurunuz'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
                            <AlertCircle className="shrink-0 mt-0.5" size={18} />
                            <p>{error}</p>
                        </div>
                    )}

                    {step === 1 && renderTypeSelection()}

                    {step === 2 && (
                        <form id="requestForm" onSubmit={handleSubmit}>
                            {selectedType === 'LEAVE' && (
                                <LeaveRequestForm
                                    leaveForm={leaveForm}
                                    setLeaveForm={setLeaveForm}
                                    requestTypes={requestTypes}
                                    leaveBalance={getLeaveBalance()}
                                    duration={calculateDuration()}
                                    isInsufficientBalance={isInsufficientBalance}
                                    approverDropdown={approverDropdownElement}
                                    entitlementInfo={entitlementInfo}
                                    workingDaysInfo={workingDaysInfo}
                                    recentLeaveHistory={recentLeaveHistory}
                                    fifoPreview={fifoPreview}
                                    excuseBalance={excuseBalance}
                                />
                            )}
                            {selectedType === 'OVERTIME' && (
                                <OvertimeRequestForm
                                    overtimeForm={overtimeForm}
                                    setOvertimeForm={setOvertimeForm}
                                    claimableData={claimableData}
                                    claimableLoading={claimableLoading}
                                    onClaimIntended={handleClaimIntended}
                                    onClaimPotential={handleClaimPotential}
                                    claimingId={claimingId}
                                    manualOpen={overtimeManualOpen}
                                    setManualOpen={setOvertimeManualOpen}
                                    approverDropdown={approverDropdownElement}
                                />
                            )}
                            {selectedType === 'MEAL' && (
                                <MealRequestForm
                                    mealForm={mealForm}
                                    setMealForm={setMealForm}
                                />
                            )}
                            {selectedType === 'EXTERNAL_DUTY' && (
                                <ExternalDutyForm
                                    externalDutyForm={externalDutyForm}
                                    setExternalDutyForm={setExternalDutyForm}
                                    duration={externalDutyDuration}
                                    approverDropdown={approverDropdownElement}
                                />
                            )}
                            {selectedType === 'CARDLESS_ENTRY' && (
                                <CardlessEntryForm
                                    cardlessEntryForm={cardlessEntryForm}
                                    setCardlessEntryForm={setCardlessEntryForm}
                                    cardlessScheduleLoading={cardlessScheduleLoading}
                                    cardlessSchedule={cardlessSchedule}
                                    isCardlessWorkDay={isCardlessWorkDay}
                                    scheduleStart={scheduleStart}
                                    scheduleEnd={scheduleEnd}
                                    approverDropdown={approverDropdownElement}
                                />
                            )}
                        </form>
                    )}
                </div>

                {/* Footer - Show for all types except OVERTIME without manual open */}
                {step === 2 && (selectedType !== 'OVERTIME' || showOvertimeSubmit) && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all text-sm"
                        >
                            İptal
                        </button>
                        <button
                            form="requestForm"
                            type="submit"
                            disabled={loading || isInsufficientBalance || (selectedType === 'CARDLESS_ENTRY' && !isCardlessWorkDay) || (availableApprovers.length > 1 && !selectedApproverId && selectedType !== 'MEAL')}
                            className={`px-8 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 text-sm
                                ${selectedType === 'LEAVE' ? 'bg-blue-600 hover:bg-blue-700' :
                                    selectedType === 'OVERTIME' ? 'bg-red-500 hover:bg-red-600' :
                                        selectedType === 'EXTERNAL_DUTY' ? 'bg-purple-600 hover:bg-purple-700' :
                                            selectedType === 'CARDLESS_ENTRY' ? 'bg-purple-600 hover:bg-purple-700' :
                                                'bg-emerald-600 hover:bg-emerald-700'}
                                ${(loading || isInsufficientBalance) ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
                            `}
                        >
                            {loading ? 'Gönderiliyor...' : (
                                <>
                                    <Check size={18} />
                                    {selectedType === 'OVERTIME' ? 'Manuel Talep Gönder' : 'Talep Oluştur'}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Footer for OVERTIME when manual is NOT open - just close button */}
                {step === 2 && selectedType === 'OVERTIME' && !showOvertimeSubmit && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all text-sm"
                        >
                            Kapat
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default CreateRequestModal;
