import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ArrowLeft, X, AlertCircle, FileText, Clock, Briefcase, Utensils, CreditCard, ChevronRight, Check } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ... (Inside Component)


const CreateRequestModal = ({ isOpen, onClose, onSuccess, requestTypes, initialData }) => {
    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState(null); // 'LEAVE', 'OVERTIME', 'MEAL'

    useEffect(() => {
        if (isOpen && initialData) {
            if (initialData.type === 'OVERTIME') {
                handleTypeSelect('OVERTIME');
                // Wait a tick for state update if strictly needed, but here we can set form directly
                setOvertimeForm(prev => ({
                    ...prev,
                    date: initialData.data.date,
                    start_time: initialData.data.start_time ? initialData.data.start_time.substring(0, 5) : '',
                    end_time: initialData.data.end_time ? initialData.data.end_time.substring(0, 5) : '',
                    reason: initialData.data.reason || '',
                    attendance: initialData.data.attendance || null
                }));
            }
        }
    }, [isOpen, initialData]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [unclaimedOvertime, setUnclaimedOvertime] = useState([]);

    // Form States
    const [leaveForm, setLeaveForm] = useState({
        request_type: '',
        start_date: '',
        end_date: '',
        reason: '',
        destination: '',
        contact_phone: '',
        send_to_substitute: false
    });

    const [overtimeForm, setOvertimeForm] = useState({
        potentialId: null, // Was 'attendance'
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
        needs_transportation: false,
        transport_description: '',
        needs_accommodation: false,
        send_to_substitute: false
    });

    const [cardlessEntryForm, setCardlessEntryForm] = useState({
        date: new Date().toISOString().split('T')[0],
        check_in_time: '',
        check_out_time: '',
        reason: '',
        send_to_substitute: false
    });

    // Cardless entry: schedule info for the selected date
    const [cardlessSchedule, setCardlessSchedule] = useState(null);
    const [cardlessScheduleLoading, setCardlessScheduleLoading] = useState(false);

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
            setUnclaimedOvertime([]);
            // Reset forms
            setOvertimeForm({
                attendance: null,
                date: new Date().toISOString().split('T')[0],
                start_time: '',
                end_time: '',

                reason: '',
                send_to_substitute: false
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedType === 'OVERTIME') {
            fetchUnclaimedOvertime();
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

    const fetchUnclaimedOvertime = async () => {
        try {
            const res = await api.get('/attendance/overtime_requests/unclaimed/'); // Note: ensure URL matches backend ViewSet path
            setUnclaimedOvertime(res.data);
        } catch (error) {
            console.error('Error fetching unclaimed overtime:', error);
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
            if (selectedType === 'LEAVE') {
                await api.post('/leave/requests/', leaveForm);
            } else if (selectedType === 'OVERTIME') {
                if (overtimeForm.potentialId) {
                    // Mevcut POTENTIAL talebi PENDING'e dönüştür (submit endpoint)
                    await api.post(`/overtime-requests/${overtimeForm.potentialId}/submit/`, {
                        start_time: overtimeForm.start_time,
                        end_time: overtimeForm.end_time,
                        reason: overtimeForm.reason,
                        send_to_substitute: overtimeForm.send_to_substitute
                    });
                } else {
                    // Manuel yeni talep oluştur (PENDING olarak)
                    await api.post('/overtime-requests/', {
                        date: overtimeForm.date,
                        start_time: overtimeForm.start_time,
                        end_time: overtimeForm.end_time,
                        reason: overtimeForm.reason,
                        is_manual: true,
                        send_to_substitute: overtimeForm.send_to_substitute
                    });
                }
            } else if (selectedType === 'MEAL') {
                await api.post('/meal-requests/', mealForm);
            } else if (selectedType === 'EXTERNAL_DUTY') {
                // Find the request type ID for External Duty
                const typeObj = requestTypes.find(t => t.category === 'EXTERNAL_DUTY');
                if (!typeObj) throw new Error('Dış Görev talep türü bulunamadı.');

                await api.post('/leave/requests/', {
                    request_type: typeObj.id,
                    start_date: externalDutyForm.start_date,
                    end_date: externalDutyForm.end_date,
                    start_time: externalDutyForm.start_time || null,
                    end_time: externalDutyForm.end_time || null,
                    reason: externalDutyForm.reason,
                    destination: externalDutyForm.destination,
                    trip_type: externalDutyForm.trip_type,
                    needs_transportation: externalDutyForm.needs_transportation,
                    transport_description: externalDutyForm.needs_transportation ? externalDutyForm.transport_description : '',
                    needs_accommodation: externalDutyForm.needs_accommodation,
                    send_to_substitute: externalDutyForm.send_to_substitute
                });
            } else if (selectedType === 'CARDLESS_ENTRY') {
                await api.post('/cardless-entry-requests/', cardlessEntryForm);
            }

            onSuccess();
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

        const available = effective + limit;
        const lastLeave = user.last_annual_leave_date || null;
        return { balance, held, limit, available, lastLeave, entitlement, used, reserved, effective, daysToAccrual, nextLeave, usedThisYear };
    };

    // Helper to calculate duration in days
    const calculateDuration = () => {
        if (!leaveForm.start_date || !leaveForm.end_date) return 0;
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
        return isAnnualLeave && balance && duration > 0 && (duration > balance.available);
    };
    const isInsufficientBalance = selectedType === 'LEAVE' && getInsufficientBalanceState();

    const renderLeaveForm = () => {
        const balance = getLeaveBalance();
        const duration = calculateDuration();
        const selectedTypeObj = requestTypes.find(t => t.id == leaveForm.request_type);
        const isAnnualLeave = selectedTypeObj && selectedTypeObj.code === 'ANNUAL_LEAVE';

        const isInsufficient = isInsufficientBalance;

        return (
            <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                {/* Balance Info Box */}
                {isAnnualLeave && balance && (
                    <div className={`p-4 rounded-xl border ${isInsufficient ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'} transition-colors`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Briefcase size={18} className={isInsufficient ? 'text-red-600' : 'text-blue-600'} />
                            <h4 className={`font-bold ${isInsufficient ? 'text-red-700' : 'text-blue-700'}`}>Yıllık İzin Bakiyesi</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center mb-2">
                            <div className="bg-white/60 p-2 rounded-lg">
                                <span className="block text-xs text-slate-500 font-bold uppercase">ANA BAKİYE</span>
                                <span className="block font-black text-slate-700 text-lg">{balance.balance}</span>
                            </div>
                            <div className={`p-2 rounded-lg bg-indigo-50 ring-1 ring-indigo-100`}>
                                <span className={`block text-xs font-bold uppercase text-indigo-700`}>YILLIK İZİN YENİLEMESİNE KALAN</span>
                                <span className={`block font-black text-lg text-indigo-700`}>{balance.daysToAccrual !== undefined ? `${balance.daysToAccrual} Gün` : '-'}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                            <div className="bg-white/40 p-1.5 rounded flex justify-between px-2">
                                <span className="text-slate-500 font-bold">BU YIL KULLANILAN</span>
                                <span className="text-amber-600 font-bold">{balance.usedThisYear}</span>
                            </div>
                            <div className="bg-white/40 p-1.5 rounded flex justify-between px-2">
                                <span className="text-slate-500 font-bold">SIRADAKİ İZİN</span>
                                <span className="text-blue-600 font-bold">
                                    {balance.nextLeave ? (
                                        <span title={`${balance.nextLeave.start_date} (${balance.nextLeave.total_days} gün)`}>
                                            {balance.nextLeave.start_date.split('-').slice(1).reverse().join('.')}
                                        </span>
                                    ) : '-'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white/40 p-1.5 rounded flex justify-between px-3">
                                <span className="text-slate-500">Avans Limiti:</span>
                                <span className="font-bold text-slate-700">{balance.limit} gün</span>
                            </div>
                            <div className="bg-white/40 p-1.5 rounded flex justify-between px-3">
                                <span className="text-slate-500">Max Talep:</span>
                                <span className={`font-bold ${isInsufficient ? 'text-red-600' : 'text-blue-600'}`}>{balance.available} gün</span>
                            </div>
                        </div>
                        {isInsufficient && (
                            <div className="mt-2 text-xs text-red-600 font-bold flex items-center gap-1">
                                <AlertCircle size={12} />
                                Yetersiz bakiye! Talep oluşturamazsınız. ({duration} gün talep, {balance.available} gün mevcut)
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">İzin Türü <span className="text-red-500">*</span></label>
                    <select
                        required
                        value={leaveForm.request_type}
                        onChange={e => setLeaveForm({ ...leaveForm, request_type: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                    >
                        <option value="">Seçiniz</option>
                        {requestTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Başlangıç <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="date"
                            value={leaveForm.start_date}
                            onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Bitiş <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="date"
                            value={leaveForm.end_date}
                            onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                        />
                    </div>
                </div>

                {/* Duration Display */}
                {leaveForm.start_date && leaveForm.end_date && (
                    <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                        <span>Toplam Süre:</span>
                        <span className="font-bold text-slate-700">{calculateDuration()} Gün</span>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Açıklama <span className="text-red-500">*</span></label>
                    <textarea
                        required
                        rows="3"
                        value={leaveForm.reason}
                        onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none font-medium text-slate-700"
                        placeholder="İzin gerekçenizi detaylıca belirtiniz..."
                    ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Gidilecek Yer</label>
                        <input
                            value={leaveForm.destination}
                            onChange={e => setLeaveForm({ ...leaveForm, destination: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                            placeholder="Opsiyonel"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">İletişim Telefonu</label>
                        <input
                            value={leaveForm.contact_phone}
                            onChange={e => setLeaveForm({ ...leaveForm, contact_phone: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                            placeholder="Opsiyonel"
                        />
                    </div>
                </div>


                <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100 transition-all hover:bg-blue-50">
                    <input
                        type="checkbox"
                        id="send_to_sub_leave"
                        checked={leaveForm.send_to_substitute}
                        onChange={e => setLeaveForm({ ...leaveForm, send_to_substitute: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="send_to_sub_leave" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                        Vekil yöneticiye de gönder
                    </label>
                </div>
            </div >
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
                onClick={() => handleTypeSelect('OVERTIME')}
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




    const renderOvertimeForm = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            {/* Overtime Selection (Radio Buttons) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    Mesai Seçimi
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {/* Manual Entry Option */}
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${!overtimeForm.potentialId ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/20' : 'bg-transparent border-slate-200 hover:bg-white hover:border-slate-300'}`}>
                        <div className="pt-0.5">
                            <input
                                type="radio"
                                name="overtime_selection"
                                value=""
                                checked={!overtimeForm.potentialId}
                                onChange={() => {
                                    setOvertimeForm(prev => ({
                                        ...prev,
                                        potentialId: null,
                                        date: new Date().toISOString().split('T')[0],
                                        start_time: '',
                                        end_time: '',
                                        reason: ''
                                    }));
                                }}
                                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-slate-700">Manuel Giriş</span>
                            <span className="block text-xs text-slate-500 mt-0.5">Kendi belirlediğiniz tarih ve saat için talep oluşturun.</span>
                        </div>
                    </label>

                    {/* Unclaimed Options */}
                    {unclaimedOvertime.map(u => {
                        const isSelected = overtimeForm.potentialId === u.id;
                        return (
                            <label key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-amber-50 border-amber-500 shadow-sm ring-1 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-amber-300'}`}>
                                <div className="pt-0.5">
                                    <input
                                        type="radio"
                                        name="overtime_selection"
                                        value={u.id}
                                        checked={isSelected}
                                        onChange={() => {
                                            // u is now OvertimeRequest object
                                            setOvertimeForm({
                                                potentialId: u.id,
                                                date: u.date, // field is 'date' in OvertimeRequest
                                                start_time: u.start_time ? u.start_time.substring(0, 5) : '',
                                                end_time: u.end_time ? u.end_time.substring(0, 5) : '',
                                                reason: u.reason || '',
                                                send_to_substitute: false
                                            });
                                        }}
                                        className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-sm font-bold text-slate-700">
                                            {new Date(u.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                            {Math.round(u.duration_seconds / 60)} dk
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                        <Clock size={12} />
                                        {u.start_time?.substring(0, 5)} - {u.end_time?.substring(0, 5)}
                                    </div>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
                <input
                    required
                    type="date"
                    value={overtimeForm.date}
                    onChange={e => setOvertimeForm({ ...overtimeForm, date: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium text-slate-700"
                />
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Başlangıç Saati <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="time"
                        value={overtimeForm.start_time}
                        onChange={e => setOvertimeForm({ ...overtimeForm, start_time: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium text-slate-700"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Bitiş Saati <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="time"
                        value={overtimeForm.end_time}
                        onChange={e => setOvertimeForm({ ...overtimeForm, end_time: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium text-slate-700"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Açıklama <span className="text-red-500">*</span></label>
                <textarea
                    required
                    rows="3"
                    value={overtimeForm.reason}
                    onChange={e => setOvertimeForm({ ...overtimeForm, reason: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all resize-none font-medium text-slate-700"
                    placeholder="Fazla mesai gerekçenizi belirtiniz..."
                ></textarea>
            </div>


            <div className="flex items-center gap-2 p-3 bg-amber-50/50 rounded-xl border border-amber-100 transition-all hover:bg-amber-50">
                <input
                    type="checkbox"
                    id="send_to_sub_ot"
                    checked={overtimeForm.send_to_substitute}
                    onChange={e => setOvertimeForm({ ...overtimeForm, send_to_substitute: e.target.checked })}
                    className="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="send_to_sub_ot" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    Vekil yöneticiye de gönder
                </label>
            </div>
        </div >
    );

    const renderMealForm = () => {
        // Tarih sınırları: 2 hafta geri, 2 gün ileri
        const today = new Date();
        const minDate = new Date(today);
        minDate.setDate(minDate.getDate() - 14);
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 2);
        const minStr = minDate.toISOString().split('T')[0];
        const maxStr = maxDate.toISOString().split('T')[0];

        return (
            <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                <div className="bg-emerald-50 p-4 rounded-xl flex items-start gap-3 text-emerald-800 text-sm border border-emerald-100">
                    <Check className="shrink-0 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-bold">Otomatik Onay</h4>
                        <p className="mt-1">Yemek talepleriniz için yönetici onayı gerekmez. Talebiniz direkt olarak idari işlere iletilecektir.</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="date"
                        value={mealForm.date}
                        min={minStr}
                        max={maxStr}
                        onChange={e => setMealForm({ ...mealForm, date: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium text-slate-700"
                    />
                    <p className="text-xs text-slate-400 mt-1">Varsayılan bugün. Geçmişe yönelik düzeltme için farklı tarih seçebilirsiniz.</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Yemek Tercihi / Açıklama <span className="text-red-500">*</span></label>
                    <textarea
                        required
                        rows="3"
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none font-medium text-slate-700"
                        placeholder="Örn: Vejetaryen menü, Diyet kola vb."
                        value={mealForm.description}
                        onChange={e => setMealForm({ ...mealForm, description: e.target.value })}
                    ></textarea>
                </div>
            </div>
        );
    };

    const calculateExternalDutyDuration = () => {
        if (!externalDutyForm.start_date || !externalDutyForm.end_date) return 0;
        const start = new Date(externalDutyForm.start_date);
        const end = new Date(externalDutyForm.end_date);
        if (isNaN(start) || isNaN(end)) return 0;
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const renderExternalDutyForm = () => {
        const duration = calculateExternalDutyDuration();
        return (
            <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                {/* Info Note */}
                <div className="bg-purple-50 p-4 rounded-xl flex items-start gap-3 text-purple-800 text-sm border border-purple-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-bold">Mesai Hesaplama</h4>
                        <p className="mt-1">Görev tarihleri içinde normal mesai saatlerine denk gelen saatler <strong>normal mesai</strong>, mesai dışı saatler <strong>ek mesai (fazla mesai)</strong> olarak değerlendirilecektir.</p>
                    </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Başlangıç Tarihi <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="date"
                            value={externalDutyForm.start_date}
                            onChange={e => setExternalDutyForm({ ...externalDutyForm, start_date: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Bitiş Tarihi <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="date"
                            value={externalDutyForm.end_date}
                            min={externalDutyForm.start_date}
                            onChange={e => setExternalDutyForm({ ...externalDutyForm, end_date: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                        />
                    </div>
                </div>

                {/* Duration Display */}
                {externalDutyForm.start_date && externalDutyForm.end_date && (
                    <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                        <span>Toplam Görev Süresi:</span>
                        <span className="font-bold text-purple-700">{duration} Gün</span>
                    </div>
                )}

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Başlangıç Saati <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="time"
                            value={externalDutyForm.start_time}
                            onChange={e => setExternalDutyForm({ ...externalDutyForm, start_time: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Bitiş Saati <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="time"
                            value={externalDutyForm.end_time}
                            onChange={e => setExternalDutyForm({ ...externalDutyForm, end_time: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                        />
                    </div>
                </div>

                {/* Destination */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Gidilecek Yer <span className="text-red-500">*</span></label>
                    <input
                        required
                        value={externalDutyForm.destination}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, destination: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                        placeholder="Örn: Müşteri ziyareti, Eğitim..."
                    />
                </div>

                {/* Trip Type */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Görev Yeri Türü</label>
                    <select
                        value={externalDutyForm.trip_type}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, trip_type: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium text-slate-700"
                    >
                        <option value="NONE">Belirtilmedi</option>
                        <option value="INNER_CITY">Şehir İçi</option>
                        <option value="OUT_OF_CITY">Şehir Dışı</option>
                    </select>
                </div>

                {/* Reason */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Açıklama <span className="text-red-500">*</span></label>
                    <textarea
                        required
                        rows="3"
                        value={externalDutyForm.reason}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, reason: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none font-medium text-slate-700"
                        placeholder="Şirket dışı görevin gerekçesini belirtiniz..."
                    ></textarea>
                </div>

                {/* Transportation & Accommodation Checkboxes */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700">Ek Talepler</h4>

                    {/* Transportation */}
                    <div className={`p-3.5 rounded-xl border transition-all ${externalDutyForm.needs_transportation
                        ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="needs_transportation"
                                checked={externalDutyForm.needs_transportation}
                                onChange={e => setExternalDutyForm({ ...externalDutyForm, needs_transportation: e.target.checked })}
                                className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                            />
                            <label htmlFor="needs_transportation" className="text-sm font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2">
                                🚗 Ulaşım Talep Ediyorum
                            </label>
                        </div>
                        {externalDutyForm.needs_transportation && (
                            <div className="mt-3 ml-8 animate-in slide-in-from-top-2 duration-200">
                                <textarea
                                    rows="2"
                                    value={externalDutyForm.transport_description}
                                    onChange={e => setExternalDutyForm({ ...externalDutyForm, transport_description: e.target.value })}
                                    className="w-full p-3 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none font-medium text-slate-700 text-sm"
                                    placeholder="Ulaşım detayları (uçak, otobüs, araç talebi vb.)"
                                ></textarea>
                            </div>
                        )}
                    </div>

                    {/* Accommodation */}
                    <div className={`p-3.5 rounded-xl border transition-all ${externalDutyForm.needs_accommodation
                        ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="needs_accommodation"
                                checked={externalDutyForm.needs_accommodation}
                                onChange={e => setExternalDutyForm({ ...externalDutyForm, needs_accommodation: e.target.checked })}
                                className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                            />
                            <label htmlFor="needs_accommodation" className="text-sm font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2">
                                🏨 Konaklama Talep Ediyorum
                            </label>
                        </div>
                    </div>
                </div>

                {/* Send to Substitute */}
                <div className="flex items-center gap-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100 transition-all hover:bg-purple-50">
                    <input
                        type="checkbox"
                        id="send_to_sub_duty"
                        checked={externalDutyForm.send_to_substitute}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, send_to_substitute: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="send_to_sub_duty" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                        Vekil yöneticiye de gönder
                    </label>
                </div>
            </div>
        );
    };

    const isCardlessWorkDay = cardlessSchedule?.is_work_day !== false;
    const scheduleStart = cardlessSchedule?.start_time || null;
    const scheduleEnd = cardlessSchedule?.end_time || null;

    const renderCardlessEntryForm = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
                <input
                    required
                    type="date"
                    value={cardlessEntryForm.date}
                    onChange={e => {
                        setCardlessEntryForm({ ...cardlessEntryForm, date: e.target.value, check_in_time: '', check_out_time: '' });
                    }}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                />
            </div>

            {/* Schedule info banner */}
            {cardlessScheduleLoading && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 animate-pulse">
                    Mesai bilgisi yükleniyor...
                </div>
            )}

            {!cardlessScheduleLoading && cardlessSchedule && !isCardlessWorkDay && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                    <AlertCircle size={18} className="text-red-500 shrink-0" />
                    <span className="text-sm font-medium text-red-700">
                        {cardlessSchedule.reason || 'Seçilen tarih mesai günü değildir. Lütfen başka bir tarih seçin.'}
                    </span>
                </div>
            )}

            {!cardlessScheduleLoading && isCardlessWorkDay && scheduleStart && scheduleEnd && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2">
                    <Clock size={16} className="text-purple-500 shrink-0" />
                    <span className="text-sm font-medium text-purple-700">
                        Mesai saatleri: <strong>{scheduleStart}</strong> – <strong>{scheduleEnd}</strong> · Saatler bu aralık dışına çıkamaz
                    </span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Giriş Saati <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="time"
                        value={cardlessEntryForm.check_in_time}
                        min={scheduleStart || undefined}
                        max={scheduleEnd || undefined}
                        disabled={!isCardlessWorkDay}
                        onChange={e => setCardlessEntryForm({ ...cardlessEntryForm, check_in_time: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Çıkış Saati <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="time"
                        value={cardlessEntryForm.check_out_time}
                        min={scheduleStart || undefined}
                        max={scheduleEnd || undefined}
                        disabled={!isCardlessWorkDay}
                        onChange={e => setCardlessEntryForm({ ...cardlessEntryForm, check_out_time: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Açıklama <span className="text-red-500">*</span></label>
                <textarea
                    required
                    rows="3"
                    value={cardlessEntryForm.reason}
                    disabled={!isCardlessWorkDay}
                    onChange={e => setCardlessEntryForm({ ...cardlessEntryForm, reason: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Kartsız giriş gerekçesini belirtiniz..."
                ></textarea>
            </div>

            <div className="flex items-center gap-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100 transition-all hover:bg-purple-50">
                <input
                    type="checkbox"
                    id="send_to_sub_cardless"
                    checked={cardlessEntryForm.send_to_substitute}
                    disabled={!isCardlessWorkDay}
                    onChange={e => setCardlessEntryForm({ ...cardlessEntryForm, send_to_substitute: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="send_to_sub_cardless" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    Vekil yöneticiye de gönder
                </label>
            </div>
        </div>
    );

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
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
                                            selectedType === 'MEAL' ? 'Yemek Talebi' : 'Şirket Dışı Görev'}
                            </h2>
                            <p className="text-slate-500 text-xs mt-0.5 font-medium">
                                {step === 1 ? 'Talep türünü seçiniz' : 'Bilgileri doldurunuz'}
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
                            {selectedType === 'LEAVE' && renderLeaveForm()}
                            {selectedType === 'OVERTIME' && renderOvertimeForm()}
                            {selectedType === 'MEAL' && renderMealForm()}
                            {selectedType === 'EXTERNAL_DUTY' && renderExternalDutyForm()}
                            {selectedType === 'CARDLESS_ENTRY' && renderCardlessEntryForm()}
                        </form>
                    )}
                </div>

                {/* Footer */}
                {step === 2 && (
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
                            disabled={loading || isInsufficientBalance || (selectedType === 'CARDLESS_ENTRY' && !isCardlessWorkDay)}
                            className={`px-8 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 text-sm
                                ${selectedType === 'LEAVE' ? 'bg-blue-600 hover:bg-blue-700' :
                                    selectedType === 'OVERTIME' ? 'bg-amber-500 hover:bg-amber-600' :
                                        selectedType === 'EXTERNAL_DUTY' ? 'bg-purple-600 hover:bg-purple-700' :
                                            selectedType === 'CARDLESS_ENTRY' ? 'bg-purple-600 hover:bg-purple-700' :
                                                'bg-emerald-600 hover:bg-emerald-700'}
                                ${(loading || isInsufficientBalance) ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
                            `}
                        >
                            {loading ? 'Gönderiliyor...' : (
                                <>
                                    <Check size={18} />
                                    Talep Oluştur
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default CreateRequestModal;
