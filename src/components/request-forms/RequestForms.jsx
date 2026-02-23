import React from 'react';
import { AlertCircle, Clock, Briefcase, Check } from 'lucide-react';

// ============================================================
// LeaveRequestForm
// Props:
//   leaveForm, setLeaveForm, requestTypes, leaveBalance,
//   duration, isInsufficientBalance, approverDropdown
// ============================================================
export const LeaveRequestForm = ({
    leaveForm,
    setLeaveForm,
    requestTypes,
    leaveBalance,
    duration,
    isInsufficientBalance,
    approverDropdown,
    entitlementInfo,
    workingDaysInfo,
}) => {
    const balance = leaveBalance;
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
                    {/* Kidem ve Hakedis Bilgisi */}
                    {entitlementInfo && (
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white/40 p-1.5 rounded flex justify-between px-3">
                                <span className="text-slate-500">Kidem:</span>
                                <span className="font-bold text-slate-700">{entitlementInfo.years_of_service} Yil</span>
                            </div>
                            <div className="bg-white/40 p-1.5 rounded flex justify-between px-3">
                                <span className="text-slate-500">Yillik Hak:</span>
                                <span className="font-bold text-emerald-600">{entitlementInfo.entitlement_tier} Gun</span>
                            </div>
                        </div>
                    )}
                    {entitlementInfo && !entitlementInfo.has_entitlement && (
                        <div className="mt-2 text-xs text-red-600 font-bold flex items-center gap-1 bg-red-50 p-2 rounded">
                            <AlertCircle size={12} />
                            Yillik izin hakedis kaydiniz bulunmamaktadir. Lutfen IK ile iletisime gecin.
                        </div>
                    )}
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
                    {requestTypes.filter(t => t.category !== 'EXTERNAL_DUTY').map(t => (
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
                    {workingDaysInfo ? (
                        <span className="font-bold text-slate-700">
                            {workingDaysInfo.working_days} Çalışma Günü
                            <span className="font-normal text-slate-400 ml-1">({workingDaysInfo.calendar_days} takvim günü)</span>
                        </span>
                    ) : (
                        <span className="font-bold text-slate-700">{duration} Gün</span>
                    )}
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


            {approverDropdown}

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

// ============================================================
// OvertimeRequestForm
// Props:
//   overtimeForm, setOvertimeForm, unclaimedOvertime, approverDropdown
// ============================================================
export const OvertimeRequestForm = ({
    overtimeForm,
    setOvertimeForm,
    unclaimedOvertime,
    approverDropdown,
}) => (
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


        {approverDropdown}

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

// ============================================================
// MealRequestForm
// Props:
//   mealForm, setMealForm
// ============================================================
export const MealRequestForm = ({ mealForm, setMealForm }) => {
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

// ============================================================
// ExternalDutyForm
// Props:
//   externalDutyForm, setExternalDutyForm, duration, approverDropdown
// ============================================================
export const ExternalDutyForm = ({
    externalDutyForm,
    setExternalDutyForm,
    duration,
    approverDropdown,
}) => (
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

        {/* Approver Selection */}
        {approverDropdown}

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

// ============================================================
// CardlessEntryForm
// Props:
//   cardlessEntryForm, setCardlessEntryForm, cardlessSchedule,
//   cardlessScheduleLoading, isCardlessWorkDay, scheduleStart,
//   scheduleEnd, approverDropdown
// ============================================================
export const CardlessEntryForm = ({
    cardlessEntryForm,
    setCardlessEntryForm,
    cardlessScheduleLoading,
    cardlessSchedule,
    isCardlessWorkDay,
    scheduleStart,
    scheduleEnd,
    approverDropdown,
}) => (
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

        {approverDropdown}

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
