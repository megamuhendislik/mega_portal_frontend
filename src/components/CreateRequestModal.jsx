// ... (Imports)
import { useAuth } from '../context/AuthContext';

// ... (Inside Component)
const { user } = useAuth();

// Helper to calculate balance
const getLeaveBalance = () => {
    if (!user) return null;
    const ent = user.annual_leave_entitlement || 0;
    const used = user.annual_leave_used || 0;
    const limit = user.annual_leave_advance_limit || 0;
    const remaining = ent - used;
    const available = remaining + limit;
    return { ent, used, limit, remaining, available };
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

const renderLeaveForm = () => {
    const balance = getLeaveBalance();
    const duration = calculateDuration();
    const selectedTypeObj = requestTypes.find(t => t.id == leaveForm.request_type);
    const isAnnualLeave = selectedTypeObj && selectedTypeObj.code === 'ANNUAL_LEAVE'; // Ensure code matches backend

    const isInsufficient = isAnnualLeave && balance && (duration > balance.available);

    return (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            {/* Balance Info Box */}
            {isAnnualLeave && balance && (
                <div className={`p-4 rounded-xl border ${isInsufficient ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'} transition-colors`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Briefcase size={18} className={isInsufficient ? 'text-red-600' : 'text-blue-600'} />
                        <h4 className={`font-bold ${isInsufficient ? 'text-red-700' : 'text-blue-700'}`}>Yıllık İzin Bakiyesi</h4>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-white/60 p-2 rounded-lg">
                            <span className="block text-xs text-slate-500">Hak Edilen</span>
                            <span className="block font-bold text-slate-700">{balance.ent} gün</span>
                        </div>
                        <div className="bg-white/60 p-2 rounded-lg">
                            <span className="block text-xs text-slate-500">Kullanılan</span>
                            <span className="block font-bold text-slate-700">{balance.used} gün</span>
                        </div>
                        <div className="bg-white/60 p-2 rounded-lg">
                            <span className="block text-xs text-slate-500">Avans</span>
                            <span className="block font-bold text-slate-700">{balance.limit} gün</span>
                        </div>
                        <div className={`p-2 rounded-lg ${isInsufficient ? 'bg-red-100 ring-1 ring-red-200' : 'bg-blue-100 ring-1 ring-blue-200'}`}>
                            <span className={`block text-xs ${isInsufficient ? 'text-red-600' : 'text-blue-600'}`}>Kullanılabilir</span>
                            <span className={`block font-bold ${isInsufficient ? 'text-red-700' : 'text-blue-700'}`}>{balance.available} gün</span>
                        </div>
                    </div>
                    {isInsufficient && (
                        <div className="mt-2 text-xs text-red-600 font-bold flex items-center gap-1">
                            <AlertCircle size={12} />
                            Talep edilen süre ({duration} gün) bakiyenizi aşıyor!
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
                    id="notify_subs_leave"
                    checked={leaveForm.notify_substitutes}
                    onChange={e => setLeaveForm({ ...leaveForm, notify_substitutes: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="notify_subs_leave" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    İlgili Yöneticinin Vekillerini de Bilgilendir
                </label>
            </div>
        </div >
    );
};

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
        notify_substitutes: false
    });

    const [overtimeForm, setOvertimeForm] = useState({
        potentialId: null, // Was 'attendance'
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',

        reason: '',
        notify_substitutes: false
    });

    const [mealForm, setMealForm] = useState({
        description: ''
    });

    const [externalDutyForm, setExternalDutyForm] = useState({
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        reason: '',
        destination: '',
        trip_type: 'NONE', // INNER_CITY, OUT_OF_CITY
        budget_amount: '',
        transport_description: ''
    });

    const [cardlessEntryForm, setCardlessEntryForm] = useState({
        date: new Date().toISOString().split('T')[0],
        check_in_time: '',
        check_out_time: '',
        reason: ''
    });

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
                notify_substitutes: false
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedType === 'OVERTIME') {
            fetchUnclaimedOvertime();
        }
    }, [selectedType]);

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
                    // Claim Existing Potential Request -> Updated to PENDING
                    await api.patch(`/overtime-requests/${overtimeForm.potentialId}/`, {
                        start_time: overtimeForm.start_time, // Allow editing
                        end_time: overtimeForm.end_time,
                        reason: overtimeForm.reason,
                        status: 'PENDING',
                        notify_substitutes: overtimeForm.notify_substitutes
                    });
                } else {
                    // Create New Manual Request
                    await api.post('/overtime-requests/', {
                        ...overtimeForm,
                        is_manual: true
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
                    start_date: externalDutyForm.date,
                    end_date: externalDutyForm.date, // Single day assumption
                    reason: externalDutyForm.reason,
                    destination: externalDutyForm.destination,
                    // New Fields
                    trip_type: externalDutyForm.trip_type,
                    budget_amount: externalDutyForm.budget_amount,
                    transport_description: externalDutyForm.transport_description
                });
            } else if (selectedType === 'CARDLESS_ENTRY') {
                await api.post('/cardless-entry-requests/', cardlessEntryForm);
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error creating request:', err);
            setError(err.response?.data?.detail || err.response?.data?.error || 'Talep oluşturulurken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
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

    const renderLeaveForm = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
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
                    id="notify_subs_leave"
                    checked={leaveForm.notify_substitutes}
                    onChange={e => setLeaveForm({ ...leaveForm, notify_substitutes: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="notify_subs_leave" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    İlgili Yöneticinin Vekillerini de Bilgilendir
                </label>
            </div>
        </div >
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
                                                notify_substitutes: false
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
                    id="notify_subs_ot"
                    checked={overtimeForm.notify_substitutes}
                    onChange={e => setOvertimeForm({ ...overtimeForm, notify_substitutes: e.target.checked })}
                    className="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="notify_subs_ot" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    İlgili Yöneticinin Vekillerini de Bilgilendir
                </label>
            </div>
        </div >
    );

    const renderMealForm = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div className="bg-emerald-50 p-4 rounded-xl flex items-start gap-3 text-emerald-800 text-sm border border-emerald-100">
                <Utensils className="shrink-0 mt-0.5" size={18} />
                <p>Yemek talebi oluşturarak bugünkü yemek listesine adınızı yazdırabilirsiniz. Lütfen özel tercihiniz varsa belirtiniz.</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Yemek Tercihi / Açıklama <span className="text-red-500">*</span></label>
                <textarea
                    required
                ></textarea>
            </div>
        </div>
    );

    const renderExternalDutyForm = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
                <input
                    required
                    type="date"
                    value={externalDutyForm.date}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, date: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                />
            </div>

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

            <div className="grid grid-cols-2 gap-5">
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
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Bütçe / Ödenek</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={externalDutyForm.budget_amount}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, budget_amount: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-medium text-slate-700"
                        placeholder="0.00 TL"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Ulaşım ve Konaklama Detayları</label>
                <textarea
                    rows="2"
                    value={externalDutyForm.transport_description}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, transport_description: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none font-medium text-slate-700"
                    placeholder="Uçak, otobüs, otel vb. detayları..."
                ></textarea>
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
                            disabled={loading}
                            className={`px-8 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 text-sm
                                ${selectedType === 'LEAVE' ? 'bg-blue-600 hover:bg-blue-700' :
                                    selectedType === 'OVERTIME' ? 'bg-amber-500 hover:bg-amber-600' :
                                        selectedType === 'EXTERNAL_DUTY' ? 'bg-purple-600 hover:bg-purple-700' :
                                            selectedType === 'CARDLESS_ENTRY' ? 'bg-purple-600 hover:bg-purple-700' :
                                                'bg-emerald-600 hover:bg-emerald-700'}
                                ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
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
