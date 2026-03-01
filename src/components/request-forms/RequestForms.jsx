import React, { useState } from 'react';
import { AlertCircle, Clock, Briefcase, Check, ChevronDown, CalendarDays, User, Zap, PenLine, MapPin, Car, Building2, Wallet, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

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
    recentLeaveHistory,
    fifoPreview,
    excuseBalance,
}) => {
    const balance = leaveBalance;
    const selectedTypeObj = requestTypes.find(t => t.id == leaveForm.request_type);
    const isAnnualLeave = selectedTypeObj && selectedTypeObj.code === 'ANNUAL_LEAVE';
    const isExcuseLeave = selectedTypeObj && selectedTypeObj.code === 'EXCUSE_LEAVE';
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

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white/40 p-1.5 rounded flex justify-between px-3">
                            <span className="text-slate-500">Avans Limiti:</span>
                            <span className="font-bold text-slate-700">{balance.limit} gün</span>
                        </div>
                        <div className="bg-white/40 p-1.5 rounded flex justify-between px-3">
                            <span className="text-slate-500">Avans Kullanılan:</span>
                            <span className="font-bold text-amber-600">{balance.advanceUsed || 0} gün</span>
                        </div>
                        <div className="bg-white/40 p-1.5 rounded flex justify-between px-3">
                            <span className="text-slate-500">Max Talep:</span>
                            <span className={`font-bold ${isInsufficient ? 'text-red-600' : 'text-blue-600'}`}>{balance.available} gün</span>
                        </div>
                    </div>
                    {/* Bu Taleple Kalacak Preview */}
                    {duration > 0 && (
                        <div className="mt-2 flex items-center justify-between text-xs bg-white/50 p-2 rounded-lg border border-blue-100">
                            <span className="text-slate-500 font-medium">Bu taleple kalacak:</span>
                            <span className={`font-black ${(balance.available - duration) < 0 ? 'text-red-600' : (balance.available - duration) <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {balance.available - duration} gün
                            </span>
                        </div>
                    )}
                    {/* Avans İzin Uyarısı */}
                    {balance && duration > 0 && (balance.effective || balance.balance || 0) < duration && (balance.advanceRemaining || balance.limit || 0) > 0 && (balance.available || 0) >= duration && (
                        <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <span className="text-amber-500 text-base leading-none mt-0.5">&#9888;</span>
                                <div>
                                    <p className="text-xs font-bold text-amber-800">Avans İzin Kullanılacak</p>
                                    <p className="text-[11px] text-amber-700 mt-0.5">
                                        Bu talep mevcut bakiyenizi aşıyor. Gelecek yılınızdan <strong>{Math.ceil(duration - Math.max(0, balance.effective || balance.balance || 0))}</strong> gün avans olarak kullanılacaktır.
                                        {(balance.advanceUsed || 0) > 0 && <span className="block mt-0.5 text-[10px]">(Mevcut avans borcu: {balance.advanceUsed} gün)</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Kidem ve Hakedis Bilgisi */}
                    {entitlementInfo && (
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            {entitlementInfo.hired_date && (
                                <div className="bg-white/40 p-1.5 rounded flex justify-between px-3">
                                    <span className="text-slate-500">Ise Giris:</span>
                                    <span className="font-bold text-slate-700">{new Date(entitlementInfo.hired_date).toLocaleDateString('tr-TR')}</span>
                                </div>
                            )}
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
                    {/* Yil Bazli Detay */}
                    {entitlementInfo?.entitlements?.length > 0 && (
                        <details className="mt-3 bg-white/50 rounded-lg border border-blue-100 overflow-hidden">
                            <summary className="px-3 py-2 text-xs font-bold text-blue-700 cursor-pointer hover:bg-blue-50/50 transition-colors select-none">
                                Yil Bazli Izin Detayi ({entitlementInfo.entitlements.length} yil)
                            </summary>
                            <div className="px-3 pb-3 space-y-1.5">
                                {entitlementInfo.entitlements.map((ent, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-100">
                                        <span className="font-bold text-slate-700">{ent.year}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-500">Hak: <span className="font-bold text-slate-700">{ent.days_entitled}</span></span>
                                            <span className="text-slate-500">Kullanilan: <span className="font-bold text-amber-600">{ent.days_used}</span></span>
                                            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${ent.remaining > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {ent.remaining} kalan
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </details>
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

            {/* Excuse Leave Balance Box */}
            {isExcuseLeave && excuseBalance && (
                <div className="p-4 rounded-xl border bg-orange-50 border-orange-100 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={18} className="text-orange-600" />
                        <h4 className="font-bold text-orange-700">Mazeret İzni Bakiyesi</h4>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div className="bg-white/60 p-2 rounded-lg">
                            <span className="block text-xs text-slate-500 font-bold uppercase">TOPLAM HAK</span>
                            <span className="block font-black text-slate-700 text-lg">{excuseBalance.hours_entitled} sa</span>
                        </div>
                        <div className="bg-white/60 p-2 rounded-lg">
                            <span className="block text-xs text-slate-500 font-bold uppercase">KULLANILAN</span>
                            <span className="block font-black text-amber-700 text-lg">{excuseBalance.hours_used} sa</span>
                        </div>
                        <div className={`p-2 rounded-lg ${excuseBalance.hours_remaining <= 0 ? 'bg-red-100 ring-1 ring-red-200' : 'bg-emerald-50 ring-1 ring-emerald-100'}`}>
                            <span className="block text-xs font-bold uppercase text-slate-500">KALAN</span>
                            <span className={`block font-black text-lg ${excuseBalance.hours_remaining <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                {excuseBalance.hours_remaining} sa
                            </span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${excuseBalance.hours_remaining <= 4.5 ? 'bg-red-400' : 'bg-orange-400'}`}
                            style={{ width: `${Math.min(100, (excuseBalance.hours_used / excuseBalance.hours_entitled) * 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>0 sa</span>
                        <span>{excuseBalance.hours_entitled} sa</span>
                    </div>

                    {/* Son Kullanım */}
                    {excuseBalance.recent_requests?.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-xs bg-white/50 p-2 rounded-lg border border-orange-100">
                            <CalendarDays size={12} className="text-orange-500 shrink-0" />
                            <span className="text-slate-500">Son Kullanım:</span>
                            <span className="font-bold text-slate-700">
                                {new Date(excuseBalance.recent_requests[0].date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-slate-400">
                                ({excuseBalance.recent_requests[0].hours} sa)
                            </span>
                            <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                excuseBalance.recent_requests[0].status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                                excuseBalance.recent_requests[0].status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {excuseBalance.recent_requests[0].status === 'APPROVED' ? 'Onaylı' :
                                 excuseBalance.recent_requests[0].status === 'PENDING' ? 'Bekliyor' : excuseBalance.recent_requests[0].status}
                            </span>
                        </div>
                    )}

                    {excuseBalance.hours_remaining <= 0 && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded-lg text-xs text-red-700 font-bold flex items-center gap-1">
                            <AlertCircle size={14} /> Bu yılın mazeret izni kotası dolmuştur.
                        </div>
                    )}
                </div>
            )}

            {/* Gecmis Izin Talepleri */}
            {recentLeaveHistory && recentLeaveHistory.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                        <Clock size={12} />
                        Son Izin Talepleriniz
                    </h4>
                    <div className="space-y-1.5">
                        {recentLeaveHistory.map((h, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        h.status === 'APPROVED' ? 'bg-emerald-500' :
                                        h.status === 'REJECTED' ? 'bg-red-500' :
                                        h.status === 'PENDING' ? 'bg-amber-500' : 'bg-slate-400'
                                    }`} />
                                    <span className="font-medium text-slate-700 truncate">{h.leave_type_name || h.request_type_detail?.name || 'Izin'}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-slate-400">
                                        {h.start_date ? new Date(h.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '-'}
                                    </span>
                                    <span className="text-slate-500 font-bold">{h.total_days} gun</span>
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                        h.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                                        h.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                        h.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {h.status === 'APPROVED' ? 'Onayli' :
                                         h.status === 'REJECTED' ? 'Red' :
                                         h.status === 'PENDING' ? 'Bekliyor' : h.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
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
                    {requestTypes
                        .filter(t => ['ANNUAL_LEAVE', 'EXCUSE_LEAVE'].includes(t.code))
                        .filter((t, i, arr) => arr.findIndex(x => x.code === t.code) === i)
                        .map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                </select>
            </div>

            {/* Mazeret İzni: Tek tarih + Saat Aralığı */}
            {isExcuseLeave ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
                        {(() => {
                            // 2 mali dönem geriye: ayın 26'sından önceysek 3 ay geri, sonrasıysak 2 ay geri (26'sı dahil)
                            const now = new Date();
                            const curYear = now.getFullYear();
                            const curMonth = now.getMonth(); // 0-based
                            const curDay = now.getDate();
                            // Mali dönem: 26-25 cycle. Şu anki mali ay hesabı
                            let fiscalMonth, fiscalYear;
                            if (curDay >= 26) {
                                fiscalMonth = curMonth + 1; // next month is fiscal month
                                fiscalYear = curMonth === 11 ? curYear + 1 : curYear;
                            } else {
                                fiscalMonth = curMonth; // current month is fiscal month
                                fiscalYear = curYear;
                            }
                            // 2 mali dönem geri = fiscalMonth - 2
                            let minFiscalMonth = fiscalMonth - 2;
                            let minFiscalYear = fiscalYear;
                            if (minFiscalMonth <= 0) {
                                minFiscalMonth += 12;
                                minFiscalYear -= 1;
                            }
                            // O mali dönemin başlangıcı: önceki ayın 26'sı
                            let minStartMonth = minFiscalMonth - 1; // 0-based prev month
                            let minStartYear = minFiscalYear;
                            if (minStartMonth <= 0) {
                                minStartMonth += 12;
                                minStartYear -= 1;
                            }
                            const minDate = `${minStartYear}-${String(minStartMonth).padStart(2, '0')}-26`;
                            // Yıl sonuna kadar
                            const maxDate = `${curYear}-12-31`;
                            return (
                                <input
                                    required
                                    type="date"
                                    value={leaveForm.start_date}
                                    min={minDate}
                                    max={maxDate}
                                    onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value, end_date: e.target.value })}
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all font-medium text-slate-700"
                                />
                            );
                        })()}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Saat Aralığı <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Başlangıç</label>
                                <input
                                    type="time"
                                    value={leaveForm.start_time || ''}
                                    onChange={e => setLeaveForm({ ...leaveForm, start_time: e.target.value })}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Bitiş</label>
                                <input
                                    type="time"
                                    value={leaveForm.end_time || ''}
                                    onChange={e => setLeaveForm({ ...leaveForm, end_time: e.target.value })}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                    required
                                />
                            </div>
                        </div>
                        {leaveForm.start_time && leaveForm.end_time && (() => {
                            const [sh, sm] = leaveForm.start_time.split(':').map(Number);
                            const [eh, em] = leaveForm.end_time.split(':').map(Number);
                            const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
                            if (hours <= 0) return <p className="text-xs text-red-600 font-bold mt-2">Bitiş saati başlangıçtan sonra olmalı.</p>;
                            if (hours > 4.5) return <p className="text-xs text-red-600 font-bold mt-2">Günlük mazeret izni en fazla 4.5 saat olabilir. ({hours.toFixed(1)} saat)</p>;
                            const remaining = excuseBalance ? (excuseBalance.hours_remaining - hours) : null;
                            return (
                                <div className="p-2.5 bg-orange-50 rounded-lg mt-2 border border-orange-100 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-orange-600" />
                                        <span className="text-sm font-bold text-orange-700">{hours.toFixed(1)} saat mazeret izni</span>
                                    </div>
                                    {excuseBalance && (
                                        <div className="flex items-center justify-between text-xs bg-white/60 p-1.5 rounded">
                                            <span className="text-slate-500">Bu taleple kalacak:</span>
                                            <span className={`font-black ${remaining < 0 ? 'text-red-600' : remaining <= 4.5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {remaining.toFixed(1)} sa
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            ) : (
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
            )}

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

            {/* FIFO Preview */}
            {isAnnualLeave && fifoPreview && fifoPreview.breakdown && Object.keys(fifoPreview.breakdown).length > 0 && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 animate-in fade-in duration-300">
                    <h4 className="text-xs font-bold text-indigo-700 mb-2">Bu Talepte Kesilecek:</h4>
                    <div className="space-y-1">
                        {Object.entries(fifoPreview.breakdown).map(([year, days]) => (
                            <div key={year} className="flex justify-between text-xs bg-white/70 p-2 rounded-lg">
                                <span className="text-slate-600">{year} yilindan</span>
                                <span className="font-bold text-indigo-700">{days} gun</span>
                            </div>
                        ))}
                    </div>
                    {fifoPreview.shortfall > 0 && (
                        <div className="mt-2 text-xs text-red-600 font-bold flex items-center gap-1">
                            <AlertCircle size={12} />
                            {fifoPreview.shortfall} gun eksik bakiye!
                        </div>
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
// OvertimeRequestForm (Yeni: 3 yollu mesai talep sistemi)
// Props:
//   overtimeForm, setOvertimeForm, claimableData, claimableLoading,
//   onClaimIntended, onClaimPotential, claimingId,
//   manualOpen, setManualOpen, approverDropdown
// ============================================================
export const OvertimeRequestForm = ({
    overtimeForm,
    setOvertimeForm,
    claimableData,
    claimableLoading,
    onClaimIntended,
    onClaimPotential,
    claimingId,
    manualOpen,
    setManualOpen,
    approverDropdown,
}) => {
    const [claimConfirm, setClaimConfirm] = useState(null); // { type: 'INTENDED'|'POTENTIAL', id, ... }
    const [claimReason, setClaimReason] = useState('');

    const intended = claimableData?.intended || [];
    const potential = claimableData?.potential || [];
    const hasClaimable = intended.length > 0 || potential.length > 0;

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' });
    };

    const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.round((seconds % 3600) / 60);
        if (hours > 0 && minutes > 0) return `${hours} sa ${minutes} dk`;
        if (hours > 0) return `${hours} saat`;
        return `${minutes} dk`;
    };

    const handleClaimClick = (type, item) => {
        setClaimConfirm({ type, ...item });
        setClaimReason('');
    };

    const handleConfirmClaim = () => {
        if (!claimConfirm) return;
        if (claimConfirm.type === 'INTENDED') {
            onClaimIntended(claimConfirm.assignment_id, claimReason);
        } else {
            onClaimPotential(claimConfirm.attendance_id, claimReason);
        }
        setClaimConfirm(null);
        setClaimReason('');
    };

    return (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            {/* ===== SECTION 1: Claimable Overtime (INTENDED + POTENTIAL) ===== */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Zap size={18} className="text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-800">Talep Edilebilir Ek Mesailer</h3>
                </div>

                {claimableLoading && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 animate-pulse flex items-center gap-2">
                        <Clock size={16} className="animate-spin" />
                        Mesai bilgileri yükleniyor...
                    </div>
                )}

                {!claimableLoading && !hasClaimable && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 flex items-center gap-2">
                        <CalendarDays size={16} />
                        Talep edilebilir ek mesai bulunamadı. Manuel giriş yapabilirsiniz.
                    </div>
                )}

                {!claimableLoading && hasClaimable && (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                        {/* INTENDED items (green) */}
                        {intended.map(item => (
                            <div
                                key={`intended-${item.assignment_id}`}
                                className="p-4 bg-white border border-emerald-200 rounded-xl hover:border-emerald-400 transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                Planlı
                                            </span>
                                            <span className="text-sm font-bold text-slate-700">
                                                {formatDate(item.date)}
                                            </span>
                                            {item.is_today && (
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Bugün</span>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-xs text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <User size={12} className="text-slate-400" />
                                                <span>Yönetici: <strong>{item.manager_name}</strong></span>
                                                <span className="text-slate-300">|</span>
                                                <span>Maks: <strong>{item.max_duration_hours} saat</strong></span>
                                            </div>
                                            {item.task_description && (
                                                <div className="flex items-start gap-1.5">
                                                    <Briefcase size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                                    <span>Görev: {item.task_description}</span>
                                                </div>
                                            )}
                                            {item.actual_overtime_seconds > 0 ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} className="text-emerald-500" />
                                                    <span>Gerçekleşen: <strong className="text-emerald-700">{formatDuration(item.actual_overtime_seconds)}</strong></span>
                                                    {item.shift_end_time && item.check_out_time && (
                                                        <span className="text-slate-400">({item.shift_end_time} - {item.check_out_time})</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Clock size={12} />
                                                    <span>Henüz gerçekleşen mesai yok</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleClaimClick('INTENDED', item)}
                                        disabled={item.actual_overtime_seconds <= 0 || claimingId === item.assignment_id}
                                        className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            item.actual_overtime_seconds <= 0
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : claimingId === item.assignment_id
                                                    ? 'bg-emerald-100 text-emerald-600 cursor-wait'
                                                    : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-emerald-500/20'
                                        }`}
                                    >
                                        {claimingId === item.assignment_id ? (
                                            <>
                                                <Clock size={13} className="animate-spin" />
                                                Gönderiliyor...
                                            </>
                                        ) : (
                                            <>
                                                <Check size={13} />
                                                Talep Et
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* POTENTIAL items (amber) */}
                        {potential.map(item => (
                            <div
                                key={`potential-${item.attendance_id}`}
                                className="p-4 bg-white border border-amber-200 rounded-xl hover:border-amber-400 transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                Planlanmamış
                                            </span>
                                            <span className="text-sm font-bold text-slate-700">
                                                {formatDate(item.date)}
                                            </span>
                                            {item.is_today && (
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Bugün</span>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-xs text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={12} className="text-amber-500" />
                                                <span>Gerçekleşen: <strong className="text-amber-700">{formatDuration(item.actual_overtime_seconds)}</strong></span>
                                                {item.shift_end_time && item.check_out_time && (
                                                    <span className="text-slate-400">({item.shift_end_time} - {item.check_out_time})</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleClaimClick('POTENTIAL', item)}
                                        disabled={claimingId === item.attendance_id}
                                        className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            claimingId === item.attendance_id
                                                ? 'bg-amber-100 text-amber-600 cursor-wait'
                                                : 'bg-amber-500 text-white hover:bg-amber-600 hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-amber-500/20'
                                        }`}
                                    >
                                        {claimingId === item.attendance_id ? (
                                            <>
                                                <Clock size={13} className="animate-spin" />
                                                Gönderiliyor...
                                            </>
                                        ) : (
                                            <>
                                                <Check size={13} />
                                                Talep Et
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ===== Claim Confirmation Dialog ===== */}
            {claimConfirm && (
                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-start gap-2 mb-3">
                        <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-blue-800">Talep Onayı</h4>
                            <p className="text-xs text-blue-700 mt-1">
                                <strong>{formatDate(claimConfirm.date)}</strong> tarihli ek mesaiyi talep etmek istediğinize emin misiniz?
                                Bu gün için tekrar talep oluşturamazsınız.
                            </p>
                        </div>
                    </div>
                    <textarea
                        rows="2"
                        value={claimReason}
                        onChange={e => setClaimReason(e.target.value)}
                        className="w-full p-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none font-medium text-slate-700 text-sm mb-3"
                        placeholder="Açıklama (isteğe bağlı)..."
                    />
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => { setClaimConfirm(null); setClaimReason(''); }}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                        >
                            Vazgeç
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmClaim}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
                        >
                            <Check size={14} />
                            Onayla ve Talep Et
                        </button>
                    </div>
                </div>
            )}

            {/* ===== Divider ===== */}
            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">veya</span>
                </div>
            </div>

            {/* ===== SECTION 2: Manual Entry (Collapsible) ===== */}
            <div className={`border-2 rounded-xl transition-all ${manualOpen ? 'border-red-300 bg-red-50/30' : 'border-slate-200 hover:border-red-200'}`}>
                <button
                    type="button"
                    onClick={() => setManualOpen(!manualOpen)}
                    className="w-full p-4 flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${manualOpen ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                            <PenLine size={18} />
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-slate-800">Manuel Giriş</span>
                            <span className="block text-xs text-slate-500">Kart kaydı olmadan saat girişi yapın</span>
                        </div>
                    </div>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${manualOpen ? 'bg-red-100 text-red-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                        <ChevronDown size={16} />
                    </div>
                </button>

                {manualOpen && (
                    <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Warning */}
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700">
                                Manuel giriş sadece kart kaydı olmayan durumlar için kullanılmalıdır. Vardiya saatleriyle çakışan girişler reddedilecektir.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
                            <input
                                required={manualOpen}
                                type="date"
                                value={overtimeForm.date}
                                onChange={e => setOvertimeForm({ ...overtimeForm, date: e.target.value })}
                                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-all font-medium text-slate-700"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Başlangıç <span className="text-red-500">*</span></label>
                                <input
                                    required={manualOpen}
                                    type="time"
                                    value={overtimeForm.start_time}
                                    onChange={e => setOvertimeForm({ ...overtimeForm, start_time: e.target.value })}
                                    className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-all font-medium text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Bitiş <span className="text-red-500">*</span></label>
                                <input
                                    required={manualOpen}
                                    type="time"
                                    value={overtimeForm.end_time}
                                    onChange={e => setOvertimeForm({ ...overtimeForm, end_time: e.target.value })}
                                    className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-all font-medium text-slate-700"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Açıklama (zorunlu) <span className="text-red-500">*</span></label>
                            <textarea
                                required={manualOpen}
                                rows="3"
                                value={overtimeForm.reason}
                                onChange={e => setOvertimeForm({ ...overtimeForm, reason: e.target.value })}
                                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-all resize-none font-medium text-slate-700"
                                placeholder="Manuel ek mesai gerekçenizi ayrıntılı belirtiniz..."
                            />
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
                    </div>
                )}
            </div>
        </div>
    );
};

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
// ExternalDutyForm — 7-Step Stepper
// Props:
//   externalDutyForm, setExternalDutyForm, duration, approverDropdown
// ============================================================
export const ExternalDutyForm = ({
    externalDutyForm,
    setExternalDutyForm,
    duration,
    approverDropdown,
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const TOTAL_STEPS = 7;

    const steps = [
        { num: 1, label: 'Tarih & Saat', icon: CalendarDays },
        { num: 2, label: 'Lokasyon', icon: MapPin },
        { num: 3, label: 'Görev Detayı', icon: Briefcase },
        { num: 4, label: 'Ulaşım', icon: Car },
        { num: 5, label: 'Konaklama', icon: Building2 },
        { num: 6, label: 'Bütçe & Belge', icon: Wallet },
        { num: 7, label: 'Özet', icon: Check },
    ];

    const goNext = () => setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
    const goPrev = () => setCurrentStep(s => Math.max(s - 1, 1));

    const taskTypeLabels = {
        SITE_VISIT: 'Saha Ziyareti',
        TRAINING: 'Eğitim',
        MEETING: 'Toplantı',
        CUSTOMER_VISIT: 'Müşteri Ziyareti',
        OTHER: 'Diğer',
    };
    const transportTypeLabels = {
        COMPANY_CAR: 'Şirket Aracı',
        PERSONAL_CAR: 'Kişisel Araç',
        BUS: 'Otobüs',
        PLANE: 'Uçak',
        TRAIN: 'Tren',
        OTHER: 'Diğer',
    };
    const tripTypeLabels = {
        NONE: 'Belirtilmedi',
        INNER_CITY: 'Şehir İçi',
        OUT_OF_CITY: 'Şehir Dışı',
    };

    // -- Step 1: Tarih & Saat --
    const Step1 = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div className="bg-purple-50 p-4 rounded-xl flex items-start gap-3 text-purple-800 text-sm border border-purple-100">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="font-bold">Mesai Hesaplama</h4>
                    <p className="mt-1">Görev tarihleri içinde normal mesai saatlerine denk gelen saatler <strong>normal mesai</strong>, mesai dışı saatler <strong>ek mesai (fazla mesai)</strong> olarak değerlendirilecektir.</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Başlangıç Tarihi <span className="text-red-500">*</span></label>
                    <input required type="date" value={externalDutyForm.start_date}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, start_date: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Bitiş Tarihi <span className="text-red-500">*</span></label>
                    <input required type="date" value={externalDutyForm.end_date} min={externalDutyForm.start_date}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, end_date: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700" />
                </div>
            </div>
            {externalDutyForm.start_date && externalDutyForm.end_date && (
                <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                    <span>Toplam Görev Süresi:</span>
                    <span className="font-bold text-purple-700">{duration} Gün</span>
                </div>
            )}
            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Başlangıç Saati <span className="text-red-500">*</span></label>
                    <input required type="time" value={externalDutyForm.start_time}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, start_time: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Bitiş Saati <span className="text-red-500">*</span></label>
                    <input required type="time" value={externalDutyForm.end_time}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, end_time: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700" />
                </div>
            </div>
        </div>
    );

    // -- Step 2: Lokasyon --
    const Step2 = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">İl <span className="text-red-500">*</span></label>
                    <input required value={externalDutyForm.duty_city}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, duty_city: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                        placeholder="Örn: İstanbul" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">İlçe</label>
                    <input value={externalDutyForm.duty_district}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, duty_district: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                        placeholder="Örn: Kadıköy" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Adres</label>
                <textarea rows="2" value={externalDutyForm.duty_address}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, duty_address: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none font-medium text-slate-700"
                    placeholder="Açık adres (opsiyonel)" />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Ziyaret Edilen Firma / Kurum</label>
                <input value={externalDutyForm.duty_company}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, duty_company: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                    placeholder="Örn: ABC Mühendislik A.Ş." />
            </div>
        </div>
    );

    // -- Step 3: Görev Detayı --
    const Step3 = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Görev Türü <span className="text-red-500">*</span></label>
                <select value={externalDutyForm.task_type}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, task_type: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium text-slate-700">
                    <option value="">Seçiniz...</option>
                    <option value="SITE_VISIT">Saha Ziyareti</option>
                    <option value="TRAINING">Eğitim</option>
                    <option value="MEETING">Toplantı</option>
                    <option value="CUSTOMER_VISIT">Müşteri Ziyareti</option>
                    <option value="OTHER">Diğer</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Görev Açıklaması <span className="text-red-500">*</span></label>
                <textarea required rows="4" value={externalDutyForm.duty_description}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, duty_description: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none font-medium text-slate-700"
                    placeholder="Görevin detaylı açıklamasını yazınız..." />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">İletişim Telefonu</label>
                <input type="tel" value={externalDutyForm.contact_phone}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, contact_phone: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                    placeholder="Örn: 0532 123 45 67" />
            </div>
        </div>
    );

    // -- Step 4: Ulaşım --
    const Step4 = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div className={`p-4 rounded-xl border transition-all ${externalDutyForm.needs_transportation
                ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-200'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="needs_transportation_v2"
                        checked={externalDutyForm.needs_transportation}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, needs_transportation: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer" />
                    <label htmlFor="needs_transportation_v2" className="text-sm font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2">
                        <Car size={18} className="text-purple-600" /> Ulaşım Talep Ediyorum
                    </label>
                </div>
            </div>
            {externalDutyForm.needs_transportation && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Ulaşım Türü</label>
                        <select value={externalDutyForm.transport_type}
                            onChange={e => setExternalDutyForm({ ...externalDutyForm, transport_type: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium text-slate-700">
                            <option value="">Seçiniz...</option>
                            <option value="COMPANY_CAR">Şirket Aracı</option>
                            <option value="PERSONAL_CAR">Kişisel Araç</option>
                            <option value="BUS">Otobüs</option>
                            <option value="PLANE">Uçak</option>
                            <option value="TRAIN">Tren</option>
                            <option value="OTHER">Diğer</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Araç Plakası</label>
                            <input value={externalDutyForm.transport_plate}
                                onChange={e => setExternalDutyForm({ ...externalDutyForm, transport_plate: e.target.value })}
                                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                                placeholder="Örn: 34 ABC 123" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Sürücü</label>
                            <input value={externalDutyForm.transport_driver}
                                onChange={e => setExternalDutyForm({ ...externalDutyForm, transport_driver: e.target.value })}
                                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                                placeholder="Sürücü adı soyadı" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Ulaşım Notları</label>
                        <textarea rows="2" value={externalDutyForm.transport_description}
                            onChange={e => setExternalDutyForm({ ...externalDutyForm, transport_description: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none font-medium text-slate-700"
                            placeholder="Ulaşım detayları (uçak, otobüs, araç talebi vb.)" />
                    </div>
                </div>
            )}
        </div>
    );

    // -- Step 5: Konaklama --
    const Step5 = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div className={`p-4 rounded-xl border transition-all ${externalDutyForm.needs_accommodation
                ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-200'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="needs_accommodation_v2"
                        checked={externalDutyForm.needs_accommodation}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, needs_accommodation: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer" />
                    <label htmlFor="needs_accommodation_v2" className="text-sm font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2">
                        <Building2 size={18} className="text-purple-600" /> Konaklama Talep Ediyorum
                    </label>
                </div>
            </div>
            {externalDutyForm.needs_accommodation && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Otel / Konaklama Yeri</label>
                        <input value={externalDutyForm.accommodation_name}
                            onChange={e => setExternalDutyForm({ ...externalDutyForm, accommodation_name: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                            placeholder="Otel veya konaklama yeri adı" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Gece Sayısı</label>
                        <input type="number" min="0" value={externalDutyForm.accommodation_nights}
                            onChange={e => setExternalDutyForm({ ...externalDutyForm, accommodation_nights: parseInt(e.target.value) || 0 })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                            placeholder="0" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Konaklama Notları</label>
                        <textarea rows="2" value={externalDutyForm.accommodation_notes}
                            onChange={e => setExternalDutyForm({ ...externalDutyForm, accommodation_notes: e.target.value })}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none font-medium text-slate-700"
                            placeholder="Ek talepler, tercihler vb." />
                    </div>
                </div>
            )}
        </div>
    );

    // -- Step 6: Bütçe & Belge --
    const Step6 = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tahmini Bütçe (TL)</label>
                <input type="number" min="0" step="0.01" value={externalDutyForm.budget_amount}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, budget_amount: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                    placeholder="Örn: 2500.00" />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Görev Yeri Türü</label>
                <select value={externalDutyForm.trip_type}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, trip_type: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium text-slate-700">
                    <option value="NONE">Belirtilmedi</option>
                    <option value="INNER_CITY">Şehir İçi</option>
                    <option value="OUT_OF_CITY">Şehir Dışı</option>
                </select>
            </div>
            {approverDropdown}
            <div className="flex items-center gap-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100 transition-all hover:bg-purple-50">
                <input type="checkbox" id="send_to_sub_duty_v2"
                    checked={externalDutyForm.send_to_substitute}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, send_to_substitute: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer" />
                <label htmlFor="send_to_sub_duty_v2" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    Vekil yöneticiye de gönder
                </label>
            </div>
        </div>
    );

    // -- Step 7: Özet --
    const Step7 = () => {
        const summaryColorMap = {
            purple: { border: 'border-purple-100', bg: 'bg-purple-50/30', text: 'text-purple-700' },
            blue:   { border: 'border-blue-100',   bg: 'bg-blue-50/30',   text: 'text-blue-700' },
            green:  { border: 'border-green-100',  bg: 'bg-green-50/30',  text: 'text-green-700' },
            amber:  { border: 'border-amber-100',  bg: 'bg-amber-50/30',  text: 'text-amber-700' },
        };
        const SummaryCard = ({ title, icon: Icon, children, color = 'purple' }) => {
            const sc = summaryColorMap[color] || summaryColorMap.purple;
            return (
                <div className={`p-4 rounded-xl border ${sc.border} ${sc.bg}`}>
                    <h4 className={`text-sm font-bold ${sc.text} mb-2 flex items-center gap-2`}>
                        <Icon size={16} /> {title}
                    </h4>
                    <div className="space-y-1 text-sm text-slate-700">{children}</div>
                </div>
            );
        };
        const SummaryRow = ({ label, value }) => value ? (
            <div className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium">{value}</span>
            </div>
        ) : null;

        return (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                    <h4 className="text-sm font-bold text-purple-700">Görev Özeti</h4>
                    <p className="text-xs text-purple-600 mt-0.5">Bilgileri kontrol edip formu gönderebilirsiniz</p>
                </div>
                <SummaryCard title="Tarih & Saat" icon={CalendarDays}>
                    <SummaryRow label="Tarih" value={`${externalDutyForm.start_date} - ${externalDutyForm.end_date}`} />
                    <SummaryRow label="Saat" value={externalDutyForm.start_time && externalDutyForm.end_time ? `${externalDutyForm.start_time} - ${externalDutyForm.end_time}` : ''} />
                    <SummaryRow label="Süre" value={duration ? `${duration} Gün` : ''} />
                </SummaryCard>
                <SummaryCard title="Lokasyon" icon={MapPin}>
                    <SummaryRow label="Şehir" value={`${externalDutyForm.duty_city} ${externalDutyForm.duty_district}`.trim()} />
                    <SummaryRow label="Adres" value={externalDutyForm.duty_address} />
                    <SummaryRow label="Firma" value={externalDutyForm.duty_company} />
                </SummaryCard>
                <SummaryCard title="Görev Detayı" icon={Briefcase}>
                    <SummaryRow label="Görev Türü" value={taskTypeLabels[externalDutyForm.task_type] || ''} />
                    <SummaryRow label="Açıklama" value={externalDutyForm.duty_description} />
                    <SummaryRow label="Telefon" value={externalDutyForm.contact_phone} />
                </SummaryCard>
                {externalDutyForm.needs_transportation && (
                    <SummaryCard title="Ulaşım" icon={Car}>
                        <SummaryRow label="Tür" value={transportTypeLabels[externalDutyForm.transport_type] || ''} />
                        <SummaryRow label="Plaka" value={externalDutyForm.transport_plate} />
                        <SummaryRow label="Sürücü" value={externalDutyForm.transport_driver} />
                        <SummaryRow label="Not" value={externalDutyForm.transport_description} />
                    </SummaryCard>
                )}
                {externalDutyForm.needs_accommodation && (
                    <SummaryCard title="Konaklama" icon={Building2}>
                        <SummaryRow label="Yer" value={externalDutyForm.accommodation_name} />
                        <SummaryRow label="Gece" value={externalDutyForm.accommodation_nights > 0 ? `${externalDutyForm.accommodation_nights} gece` : ''} />
                        <SummaryRow label="Not" value={externalDutyForm.accommodation_notes} />
                    </SummaryCard>
                )}
                <SummaryCard title="Bütçe & Onay" icon={Wallet}>
                    <SummaryRow label="Bütçe" value={externalDutyForm.budget_amount ? `${externalDutyForm.budget_amount} TL` : ''} />
                    <SummaryRow label="Görev Yeri" value={tripTypeLabels[externalDutyForm.trip_type] || ''} />
                    <SummaryRow label="Vekil" value={externalDutyForm.send_to_substitute ? 'Evet' : 'Hayır'} />
                </SummaryCard>
            </div>
        );
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <Step1 />;
            case 2: return <Step2 />;
            case 3: return <Step3 />;
            case 4: return <Step4 />;
            case 5: return <Step5 />;
            case 6: return <Step6 />;
            case 7: return <Step7 />;
            default: return <Step1 />;
        }
    };

    return (
        <div className="space-y-5">
            {/* Step Indicator Pills */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {steps.map((s) => {
                    const StepIcon = s.icon;
                    const isActive = currentStep === s.num;
                    const isDone = currentStep > s.num;
                    return (
                        <button key={s.num} type="button" onClick={() => setCurrentStep(s.num)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                isActive
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200 scale-105'
                                    : isDone
                                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}>
                            {isDone ? <Check size={12} /> : <StepIcon size={12} />}
                            <span className="hidden sm:inline">{s.label}</span>
                            <span className="sm:hidden">{s.num}</span>
                        </button>
                    );
                })}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }} />
            </div>

            {/* Step Content */}
            <div className="min-h-[200px]">
                {renderStep()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-2">
                <button type="button" onClick={goPrev} disabled={currentStep === 1}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        currentStep === 1
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-purple-700 bg-purple-50 hover:bg-purple-100 active:scale-95'
                    }`}>
                    <ChevronLeft size={16} /> Geri
                </button>
                {currentStep < TOTAL_STEPS && (
                    <button type="button" onClick={goNext}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all shadow-sm">
                        İleri <ChevronRightIcon size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

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
