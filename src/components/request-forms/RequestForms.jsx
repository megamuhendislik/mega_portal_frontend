import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Clock, Briefcase, Check, ChevronDown, CalendarDays, User, Zap, PenLine, MapPin, Car, Building2, Wallet, ChevronLeft, ChevronRight as ChevronRightIcon, Home, Users, FileText, Copy, Landmark, Info } from 'lucide-react';
import { getIstanbulToday, getIstanbulDateOffset, toIstanbulParts } from '../../utils/dateUtils';
import SmartDatePicker from '../common/SmartDatePicker';

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
    birthdayBalance,
    holidays,
}) => {
    const balance = leaveBalance;
    const selectedTypeObj = requestTypes.find(t => t.id == leaveForm.request_type);
    const isSpecialLeave = typeof leaveForm.request_type === 'string' && leaveForm.request_type.startsWith('SPECIAL:');
    const specialLeaveCode = isSpecialLeave ? leaveForm.request_type.split(':')[1] : null;
    const isAnnualLeave = !isSpecialLeave && selectedTypeObj && selectedTypeObj.code === 'ANNUAL_LEAVE';
    const isExcuseLeave = !isSpecialLeave && selectedTypeObj && selectedTypeObj.code === 'EXCUSE_LEAVE';
    const isBirthdayLeave = !isSpecialLeave && selectedTypeObj && selectedTypeObj.code === 'BIRTHDAY_LEAVE';
    const isInsufficient = isSpecialLeave ? false : isInsufficientBalance;

    // Proactive overlap detection
    const conflictingLeaves = React.useMemo(() => {
        if (!recentLeaveHistory?.length || !leaveForm.start_date) return [];
        const reqStart = leaveForm.start_date;
        const reqEnd = leaveForm.end_date || leaveForm.start_date;
        return recentLeaveHistory.filter(h =>
            ['PENDING', 'APPROVED', 'ESCALATED'].includes(h.status) &&
            h.start_date <= reqEnd && h.end_date >= reqStart
        );
    }, [recentLeaveHistory, leaveForm.start_date, leaveForm.end_date]);

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
                                    <span className="text-slate-500">İşe Giriş:</span>
                                    <span className="font-bold text-slate-700">{new Date(entitlementInfo.hired_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}</span>
                                </div>
                            )}
                            <div className="bg-white/40 p-1.5 rounded flex justify-between px-3">
                                <span className="text-slate-500">Kıdem:</span>
                                <span className="font-bold text-slate-700">{entitlementInfo.years_of_service} Yıl</span>
                            </div>
                            <div className="bg-white/40 p-1.5 rounded flex justify-between px-3">
                                <span className="text-slate-500">Yıllık Hak:</span>
                                <span className="font-bold text-emerald-600">{entitlementInfo.entitlement_tier} Gün</span>
                            </div>
                        </div>
                    )}
                    {/* Yil Bazli Detay */}
                    {entitlementInfo?.entitlements?.length > 0 && (
                        <details className="mt-3 bg-white/50 rounded-lg border border-blue-100 overflow-hidden">
                            <summary className="px-3 py-2 text-xs font-bold text-blue-700 cursor-pointer hover:bg-blue-50/50 transition-colors select-none">
                                Yıl Bazlı İzin Detayı ({entitlementInfo.entitlements.length} yıl)
                            </summary>
                            <div className="px-3 pb-3 space-y-1.5">
                                {entitlementInfo.entitlements.map((ent, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-100">
                                        <span className="font-bold text-slate-700">{ent.year}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-500">Hak: <span className="font-bold text-slate-700">{ent.days_entitled}</span></span>
                                            <span className="text-slate-500">Kullanılan: <span className="font-bold text-amber-600">{ent.days_used}</span></span>
                                            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${ent.remaining > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {ent.remaining} kalan
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                    {/* FIFO Kesinti Preview */}
                    {fifoPreview?.breakdown_list?.length > 0 && (
                        <div className="mt-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-3">
                            <h4 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1.5">
                                📋 Bu Talep İçin Yıl Bazlı Kesinti
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-slate-500 border-b border-blue-200">
                                            <th className="text-left py-1 pr-2">Yıl</th>
                                            <th className="text-center py-1 px-1">Hak</th>
                                            <th className="text-center py-1 px-1">Kullanılan</th>
                                            <th className="text-center py-1 px-1">Kalan</th>
                                            <th className="text-center py-1 px-1">Kesinti</th>
                                            <th className="text-center py-1 px-1">Sonrası</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fifoPreview.breakdown_list.map((row, i) => (
                                            <tr key={i} className={`border-b border-blue-100 ${row.to_deduct > 0 ? 'bg-amber-50/50' : ''}`}>
                                                <td className="py-1.5 pr-2 font-bold text-slate-700">{row.year}</td>
                                                <td className="text-center text-slate-600">{row.days_entitled}</td>
                                                <td className="text-center text-amber-600">{row.days_used}</td>
                                                <td className="text-center text-slate-700 font-semibold">{row.remaining_before}</td>
                                                <td className="text-center">
                                                    {row.to_deduct > 0
                                                        ? <span className="text-red-600 font-bold">-{row.to_deduct}</span>
                                                        : <span className="text-slate-400">—</span>
                                                    }
                                                </td>
                                                <td className="text-center">
                                                    <span className={`font-bold ${row.remaining_after > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {row.remaining_after}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {fifoPreview.breakdown_list.filter(r => r.to_deduct > 0).length > 1 && (
                                <p className="text-[10px] text-blue-600 mt-2 font-medium">
                                    ℹ️ {fifoPreview.breakdown_list.filter(r => r.to_deduct > 0).length} farklı yıldan kesilecek → {fifoPreview.breakdown_list.filter(r => r.to_deduct > 0).length} ayrı dilekçe oluşacak
                                </p>
                            )}
                        </div>
                    )}
                    {entitlementInfo && !entitlementInfo.has_entitlement && (
                        <div className="mt-2 text-xs text-red-600 font-bold flex items-start gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                            <div>
                                <p>Yıllık izin hakediş kaydınız bulunmamaktadır.</p>
                                <p className="text-[10px] font-normal text-red-500 mt-1">
                                    Yöneticiniz veya İK birimi, <strong>Personel</strong> sayfasından ilgili çalışanı seçip
                                    <strong> İzin Yönetimi</strong> sekmesinden yıl bazlı hak edişlerinizi tanımlayabilir.
                                </p>
                            </div>
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
                            <span className="block font-black text-slate-700 text-lg">{(() => { const h = Math.floor(excuseBalance.hours_entitled); const m = Math.round((excuseBalance.hours_entitled - h) * 60); return m > 0 ? `${h}sa ${m}dk` : `${h}sa`; })()}</span>
                        </div>
                        <div className="bg-white/60 p-2 rounded-lg">
                            <span className="block text-xs text-slate-500 font-bold uppercase">KULLANILAN</span>
                            <span className="block font-black text-amber-700 text-lg">{(() => { const h = Math.floor(excuseBalance.hours_used); const m = Math.round((excuseBalance.hours_used - h) * 60); return m > 0 ? `${h}sa ${m}dk` : `${h}sa`; })()}</span>
                        </div>
                        <div className={`p-2 rounded-lg ${excuseBalance.hours_remaining <= 0 ? 'bg-red-100 ring-1 ring-red-200' : 'bg-emerald-50 ring-1 ring-emerald-100'}`}>
                            <span className="block text-xs font-bold uppercase text-slate-500">KALAN</span>
                            <span className={`block font-black text-lg ${excuseBalance.hours_remaining <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                {(() => { const h = Math.floor(excuseBalance.hours_remaining); const m = Math.round((excuseBalance.hours_remaining - h) * 60); return m > 0 ? `${h}sa ${m}dk` : `${h}sa`; })()}
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
                        <span>0sa</span>
                        <span>{(() => { const h = Math.floor(excuseBalance.hours_entitled); const m = Math.round((excuseBalance.hours_entitled - h) * 60); return m > 0 ? `${h}sa ${m}dk` : `${h}sa`; })()}</span>
                    </div>

                    {/* Son Kullanım */}
                    {excuseBalance.recent_requests?.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-xs bg-white/50 p-2 rounded-lg border border-orange-100">
                            <CalendarDays size={12} className="text-orange-500 shrink-0" />
                            <span className="text-slate-500">Son Kullanım:</span>
                            <span className="font-bold text-slate-700">
                                {new Date(excuseBalance.recent_requests[0].date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })}
                            </span>
                            <span className="text-slate-400">
                                ({(() => { const v = excuseBalance.recent_requests[0].hours; const h = Math.floor(v); const m = Math.round((v - h) * 60); return m > 0 ? `${h}sa ${m}dk` : `${h}sa`; })()})
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

            {/* Birthday Leave Balance Box */}
            {isBirthdayLeave && birthdayBalance && (
                <div className="p-4 rounded-xl border bg-pink-50 border-pink-100 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🎂</span>
                        <h4 className="font-bold text-pink-700">Doğum Günü İzni</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center mb-2">
                        <div className="bg-white/60 p-2 rounded-lg">
                            <span className="block text-xs text-slate-500 font-bold uppercase">HAK</span>
                            <span className="block font-black text-slate-700 text-lg">1 Gün</span>
                        </div>
                        <div className={`p-2 rounded-lg ${birthdayBalance.is_used ? 'bg-red-100 ring-1 ring-red-200' : 'bg-emerald-50 ring-1 ring-emerald-100'}`}>
                            <span className="block text-xs font-bold uppercase text-slate-500">DURUM</span>
                            <span className={`block font-black text-lg ${birthdayBalance.is_used ? 'text-red-600' : 'text-emerald-700'}`}>
                                {birthdayBalance.is_used ? 'Kullanıldı' : 'Kullanılabilir'}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-pink-600 mt-1">
                        Doğum günü izninizi sadece {birthdayBalance.birth_month_name} ayında, 1 günlük olarak kullanabilirsiniz.
                    </p>
                    {birthdayBalance.is_used && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded-lg text-xs text-red-700 font-bold flex items-center gap-1">
                            <AlertCircle size={14} /> Bu yılın doğum günü izni hakkınız kullanılmıştır.
                        </div>
                    )}
                </div>
            )}

            {/* Gecmis Izin Talepleri */}
            {recentLeaveHistory && recentLeaveHistory.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                        <Clock size={12} />
                        Aktif İzin Talepleriniz ({recentLeaveHistory.length})
                    </h4>
                    <div className="space-y-1.5">
                        {recentLeaveHistory.slice(0, 5).map((h, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        h.status === 'APPROVED' ? 'bg-emerald-500' :
                                        h.status === 'REJECTED' ? 'bg-red-500' :
                                        h.status === 'PENDING' ? 'bg-amber-500' : 'bg-slate-400'
                                    }`} />
                                    <span className="font-medium text-slate-700 truncate">{h.leave_type_name || h.request_type_detail?.name || 'İzin'}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-slate-400">
                                        {h.start_date ? new Date(h.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' }) : '-'}
                                    </span>
                                    <span className="text-slate-500 font-bold">{h.total_days} gün</span>
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                        h.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                                        h.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                        h.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {h.status === 'APPROVED' ? 'Onaylı' :
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
                        .filter(t => {
                            const allowed = ['ANNUAL_LEAVE', 'EXCUSE_LEAVE'];
                            if (birthdayBalance?.is_birthday_month && !birthdayBalance?.is_used) {
                                allowed.push('BIRTHDAY_LEAVE');
                            }
                            return allowed.includes(t.code);
                        })
                        .filter((t, i, arr) => arr.findIndex(x => x.code === t.code) === i)
                        .map(t => (
                            <option key={t.id} value={t.id}>{t.name}{t.code === 'BIRTHDAY_LEAVE' ? ' 🎂' : ''}</option>
                        ))}
                    <optgroup label="Özel İzinler">
                        <option value="SPECIAL:PATERNITY">Babalık İzni (5 gün)</option>
                        <option value="SPECIAL:BEREAVEMENT">Ölüm İzni (3 gün)</option>
                        <option value="SPECIAL:UNPAID">Ücretsiz İzin</option>
                        <option value="SPECIAL:MARRIAGE">Evlilik İzni (3 gün)</option>
                    </optgroup>
                </select>
            </div>

            {/* Özel İzinler: Babalık/Ölüm/Evlilik/Ücretsiz */}
            {isSpecialLeave ? (
                <div className="space-y-4">
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <p className="text-sm font-bold text-indigo-700">
                            {specialLeaveCode === 'PATERNITY' && 'Babalık İzni — 5 takvim günü'}
                            {specialLeaveCode === 'BEREAVEMENT' && 'Ölüm İzni — 3 takvim günü'}
                            {specialLeaveCode === 'MARRIAGE' && 'Evlilik İzni — 3 takvim günü'}
                            {specialLeaveCode === 'UNPAID' && 'Ücretsiz İzin — başlangıç ve bitiş tarihi girin'}
                        </p>
                        <p className="text-xs text-indigo-500 mt-1">Bu izin muhasebe tarafından onaylanacaktır.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Başlangıç Tarihi <span className="text-red-500">*</span></label>
                        <SmartDatePicker
                            mode="single"
                            value={leaveForm.start_date}
                            onChange={(dateStr) => {
                                const updates = { ...leaveForm, start_date: dateStr };
                                if (specialLeaveCode !== 'UNPAID') {
                                    const durationMap = { PATERNITY: 5, BEREAVEMENT: 3, MARRIAGE: 3 };
                                    const dur = durationMap[specialLeaveCode] || 3;
                                    const sd = new Date(dateStr);
                                    sd.setDate(sd.getDate() + dur - 1);
                                    updates.end_date = sd.toISOString().split('T')[0];
                                }
                                setLeaveForm(updates);
                            }}
                            holidays={holidays}
                            leaveHistory={recentLeaveHistory}
                            accentColor="indigo"
                        />
                    </div>
                    {specialLeaveCode === 'UNPAID' ? (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Bitiş Tarihi <span className="text-red-500">*</span></label>
                            <SmartDatePicker
                                mode="single"
                                value={leaveForm.end_date}
                                minDate={leaveForm.start_date}
                                onChange={(dateStr) => setLeaveForm({ ...leaveForm, end_date: dateStr })}
                                holidays={holidays}
                                leaveHistory={recentLeaveHistory}
                                accentColor="indigo"
                                showLegend={false}
                            />
                        </div>
                    ) : leaveForm.start_date ? (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-sm text-blue-700">
                                Bitiş Tarihi: <strong>{new Date(leaveForm.end_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}</strong>
                                {' '}({({PATERNITY: 5, BEREAVEMENT: 3, MARRIAGE: 3})[specialLeaveCode]} takvim günü)
                            </p>
                        </div>
                    ) : null}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Açıklama</label>
                        <textarea
                            value={leaveForm.reason}
                            onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                            rows={3}
                            placeholder="Açıklama (opsiyonel)..."
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 resize-none"
                        />
                    </div>
                </div>

            ) : isBirthdayLeave ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
                        {(() => {
                            const today = getIstanbulToday();
                            const [yr] = today.split('-').map(Number);
                            const bm = birthdayBalance?.birth_month;
                            const minDate = bm ? `${yr}-${String(bm).padStart(2, '0')}-01` : today;
                            // Last day of birth month
                            const lastDay = bm ? new Date(yr, bm, 0).getDate() : 28;
                            const maxDate = bm ? `${yr}-${String(bm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` : today;
                            return (
                                <SmartDatePicker
                                    mode="single"
                                    value={leaveForm.start_date}
                                    minDate={minDate}
                                    maxDate={maxDate}
                                    onChange={(dateStr) => setLeaveForm({ ...leaveForm, start_date: dateStr, end_date: dateStr })}
                                    holidays={holidays}
                                    leaveHistory={recentLeaveHistory}
                                    accentColor="pink"
                                />
                            );
                        })()}
                    </div>
                    <div className="p-2.5 bg-pink-50 rounded-lg border border-pink-100 flex items-center gap-2">
                        <span className="text-base">🎂</span>
                        <span className="text-sm font-bold text-pink-700">1 günlük doğum günü izni (tam gün)</span>
                    </div>
                </div>
            ) : isExcuseLeave ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
                        {(() => {
                            // 2 mali dönem geriye: ayın 26'sından önceysek 3 ay geri, sonrasıysak 2 ay geri (26'sı dahil)
                            const [_yr, _mo, curDay] = getIstanbulToday().split('-').map(Number);
                            const curYear = _yr;
                            const curMonth = _mo - 1; // 0-based
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
                                <SmartDatePicker
                                    mode="single"
                                    value={leaveForm.start_date}
                                    minDate={minDate}
                                    maxDate={maxDate}
                                    onChange={(dateStr) => setLeaveForm({ ...leaveForm, start_date: dateStr, end_date: dateStr })}
                                    holidays={holidays}
                                    leaveHistory={recentLeaveHistory}
                                    accentColor="orange"
                                />
                            );
                        })()}
                    </div>
                    {/* İzin günü uyarısı */}
                    {excuseBalance?.schedule_info?.is_off_day && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-sm font-bold text-red-700">Bu tarih çalışma günü değil.</p>
                            <p className="text-xs text-red-500 mt-0.5">Mazeret izni sadece normal çalışma günlerinde oluşturulabilir.</p>
                        </div>
                    )}

                    {/* Vardiya bilgisi */}
                    {excuseBalance?.schedule_info && !excuseBalance.schedule_info.is_off_day && excuseBalance.schedule_info.shift_start && (
                        <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-xs text-blue-700">Vardiya: <strong>{excuseBalance.schedule_info.shift_start} - {excuseBalance.schedule_info.shift_end}</strong> — Saat seçimi bu aralıkta olmalıdır.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Saat Aralığı <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Başlangıç</label>
                                <input
                                    type="time"
                                    value={leaveForm.start_time || ''}
                                    min={excuseBalance?.schedule_info?.shift_start || undefined}
                                    max={excuseBalance?.schedule_info?.shift_end || undefined}
                                    onChange={e => setLeaveForm({ ...leaveForm, start_time: e.target.value })}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                    required
                                    disabled={excuseBalance?.schedule_info?.is_off_day}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Bitiş</label>
                                <input
                                    type="time"
                                    value={leaveForm.end_time || ''}
                                    min={excuseBalance?.schedule_info?.shift_start || undefined}
                                    max={excuseBalance?.schedule_info?.shift_end || undefined}
                                    onChange={e => setLeaveForm({ ...leaveForm, end_time: e.target.value })}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                    required
                                    disabled={excuseBalance?.schedule_info?.is_off_day}
                                />
                            </div>
                        </div>
                        {leaveForm.start_time && leaveForm.end_time && (() => {
                            const [sh, sm] = leaveForm.start_time.split(':').map(Number);
                            const [eh, em] = leaveForm.end_time.split(':').map(Number);
                            const rawMinutes = (eh * 60 + em) - (sh * 60 + sm);
                            if (rawMinutes <= 0) return <p className="text-xs text-red-600 font-bold mt-2">Bitiş saati başlangıçtan sonra olmalı.</p>;

                            // Vardiya dışı kontrolü
                            const si2 = excuseBalance?.schedule_info;
                            if (si2?.shift_start && si2?.shift_end) {
                                const [ssH, ssM] = si2.shift_start.split(':').map(Number);
                                const [seH, seM] = si2.shift_end.split(':').map(Number);
                                const shiftStartMin = ssH * 60 + ssM;
                                const shiftEndMin = seH * 60 + seM;
                                const startMin = sh * 60 + sm;
                                const endMin = eh * 60 + em;
                                if (endMin <= shiftStartMin || startMin >= shiftEndMin) {
                                    return <p className="text-xs text-red-600 font-bold mt-2">Seçilen saatler vardiya ({si2.shift_start}-{si2.shift_end}) dışında. Mazeret izni vardiya saatleri içinde olmalıdır.</p>;
                                }
                            }

                            // Öğle arası düşümü (takvimden gelen lunch_start/lunch_end)
                            let lunchDeductMinutes = 0;
                            const si = excuseBalance?.schedule_info;
                            if (si?.lunch_start && si?.lunch_end) {
                                const [ls, lm] = si.lunch_start.split(':').map(Number);
                                const [le, lem] = si.lunch_end.split(':').map(Number);
                                const lunchStartMin = ls * 60 + lm;
                                const lunchEndMin = le * 60 + lem;
                                const startMin = sh * 60 + sm;
                                const endMin = eh * 60 + em;
                                const overlapStart = Math.max(startMin, lunchStartMin);
                                const overlapEnd = Math.min(endMin, lunchEndMin);
                                if (overlapEnd > overlapStart) {
                                    lunchDeductMinutes = overlapEnd - overlapStart;
                                }
                            }

                            const hours = (rawMinutes - lunchDeductMinutes) / 60;
                            if (hours <= 0) return <p className="text-xs text-red-600 font-bold mt-2">Seçilen aralık tamamen öğle arası içinde.</p>;
                            const fmtHM = (v) => { const h = Math.floor(v); const m = Math.round((v - h) * 60); return `${h}:${String(m).padStart(2, '0')}`; };
                            if (hours > 4.5) return <p className="text-xs text-red-600 font-bold mt-2">Günlük mazeret izni en fazla 4 saat 30 dakika olabilir. ({fmtHM(hours)})</p>;
                            const remaining = excuseBalance ? (excuseBalance.hours_remaining - hours) : null;
                            return (
                                <div className="p-2.5 bg-orange-50 rounded-lg mt-2 border border-orange-100 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-orange-600" />
                                        <span className="text-sm font-bold text-orange-700">{fmtHM(hours)} mazeret izni</span>
                                    </div>
                                    {lunchDeductMinutes > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <span>Öğle arası düşüldü: {si.lunch_start}–{si.lunch_end}</span>
                                            <span className="font-bold text-slate-600">(-{Math.floor(lunchDeductMinutes / 60) > 0 ? `${Math.floor(lunchDeductMinutes / 60)}sa ` : ''}{lunchDeductMinutes % 60 > 0 ? `${lunchDeductMinutes % 60}dk` : ''})</span>
                                        </div>
                                    )}
                                    {excuseBalance && (
                                        <div className="flex items-center justify-between text-xs bg-white/60 p-1.5 rounded">
                                            <span className="text-slate-500">Bu taleple kalacak:</span>
                                            <span className={`font-black ${remaining < 0 ? 'text-red-600' : remaining <= 4.5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {fmtHM(remaining)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih Aralığı <span className="text-red-500">*</span></label>
                    <SmartDatePicker
                        mode="range"
                        value={leaveForm.start_date && leaveForm.end_date ? [leaveForm.start_date, leaveForm.end_date] : null}
                        onChange={([start, end]) => {
                            if (start && end) {
                                setLeaveForm({ ...leaveForm, start_date: start, end_date: end });
                            } else {
                                setLeaveForm({ ...leaveForm, start_date: start || '', end_date: '' });
                            }
                        }}
                        holidays={holidays}
                        leaveHistory={recentLeaveHistory}
                        accentColor="blue"
                    />
                </div>
            )}

            {/* Overlap Warning */}
            {conflictingLeaves.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 mb-1.5">
                        <AlertCircle size={16} className="text-red-600 shrink-0" />
                        <span className="text-sm font-bold text-red-700">Tarih Çakışması!</span>
                    </div>
                    <p className="text-xs text-red-600 mb-2">Seçtiğiniz tarih aralığında mevcut izin talepleriniz var:</p>
                    <div className="space-y-1">
                        {conflictingLeaves.map((h, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-white/70 p-2 rounded-lg">
                                <span className="font-medium text-slate-700">{h.leave_type_name || h.request_type_detail?.name || 'İzin'}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">
                                        {h.start_date ? new Date(h.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' }) : ''}
                                        {h.end_date && h.end_date !== h.start_date ? ` - ${new Date(h.end_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })}` : ''}
                                    </span>
                                    <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                        h.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                                        h.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {h.status === 'APPROVED' ? 'Onaylı' : h.status === 'PENDING' ? 'Bekliyor' : h.status}
                                    </span>
                                </div>
                            </div>
                        ))}
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
                                <span className="text-slate-600">{year} yılından</span>
                                <span className="font-bold text-indigo-700">{days} gün</span>
                            </div>
                        ))}
                    </div>
                    {fifoPreview.shortfall > 0 && (
                        <div className="mt-2 text-xs text-red-600 font-bold flex items-center gap-1">
                            <AlertCircle size={12} />
                            {fifoPreview.shortfall} gün eksik bakiye!
                        </div>
                    )}
                </div>
            )}

            {!isSpecialLeave && (
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
            )}

            {!isSpecialLeave && !isBirthdayLeave && !isExcuseLeave && (
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
            )}


            {!isSpecialLeave && approverDropdown}

            {!isSpecialLeave && <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100 transition-all hover:bg-blue-50">
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
            </div>}
        </div >
    );
};

// ============================================================
// OvertimeRequestForm (Yeni: 3 yollu mesai talep sistemi)
// Props:
//   overtimeForm, setOvertimeForm, claimableData, claimableLoading,
//   onClaimIntended, onClaimPotential, claimingId,
//   manualOpen, setManualOpen, approverDropdown,
//   availableApprovers, selectedApproverId, onApproverSelect
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
    availableApprovers = [],
    selectedApproverId,
    onApproverSelect,
    holidays,
    calendarLeaveHistory,
}) => {
    const [claimConfirm, setClaimConfirm] = useState(null); // { type: 'INTENDED'|'POTENTIAL', id, ... }
    const [claimReason, setClaimReason] = useState('');

    const intended = claimableData?.intended || [];
    const potential = claimableData?.potential || [];
    const hasClaimable = intended.length > 0 || potential.length > 0;

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short', timeZone: 'Europe/Istanbul' });
    };

    const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.round((seconds % 3600) / 60);
        if (hours > 0 && minutes > 0) return `${hours} sa ${minutes} dk`;
        if (hours > 0) return `${hours} saat`;
        return `${minutes} dk`;
    };

    // POTENTIAL'leri gün bazlı grupla
    const potentialByDay = useMemo(() => {
        const map = {};
        for (const item of (potential || [])) {
            if (!map[item.date]) map[item.date] = { date: item.date, items: [], is_today: item.is_today };
            map[item.date].items.push(item);
        }
        return Object.values(map);
    }, [potential]);

    const [claimSelectedIds, setClaimSelectedIds] = useState({});

    const handleClaimClick = (type, item) => {
        if (type === 'POTENTIAL' && item._dayGroup) {
            // Gün bazlı grup — tüm segment'ler seçili olarak başla
            const allIds = item._dayGroup.items.map(i => i.overtime_request_id || i.attendance_id);
            setClaimSelectedIds(prev => ({ ...prev, [item.date]: allIds }));
        }
        setClaimConfirm({ type, ...item });
        setClaimReason('');
    };

    const handleConfirmClaim = () => {
        if (!claimConfirm) return;
        if (claimConfirm.type === 'INTENDED') {
            onClaimIntended(claimConfirm.assignment_id, claimReason);
        } else {
            // Seçili ID'ler ve çıkarılanlar
            const dayGroup = claimConfirm._dayGroup;
            const allIds = dayGroup ? dayGroup.items.map(i => i.overtime_request_id || i.attendance_id) : [];
            const selectedIds = claimSelectedIds[claimConfirm.date] || allIds;
            const excludedIds = allIds.filter(id => !selectedIds.includes(id));
            onClaimPotential(claimConfirm.attendance_id, claimReason, selectedIds, excludedIds);
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
                                            {item.is_rejected && item.rejection_reason && (
                                                <div className="flex items-center gap-1.5 text-red-600">
                                                    <span className="font-semibold">Önceki red:</span> {item.rejection_reason}
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
                                                    : item.is_rejected
                                                        ? 'bg-red-500 text-white hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-red-500/20'
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
                                                {item.is_rejected ? 'Tekrar Talep Et' : 'Talep Et'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* POTENTIAL items — gün bazlı gruplanmış (amber) */}
                        {potentialByDay.map(dayGroup => {
                            const totalSeconds = dayGroup.items.reduce((s, i) => s + (i.actual_overtime_seconds || 0), 0);
                            const firstItem = dayGroup.items[0];
                            return (
                                <div
                                    key={`potential-day-${dayGroup.date}`}
                                    className="p-4 bg-white border border-amber-200 rounded-xl hover:border-amber-400 transition-all"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                    Planlanmamış
                                                </span>
                                                <span className="text-sm font-bold text-slate-700">
                                                    {formatDate(dayGroup.date)}
                                                </span>
                                                {dayGroup.is_today && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Bugün</span>
                                                )}
                                                {dayGroup.items.length > 1 && (
                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{dayGroup.items.length} segment</span>
                                                )}
                                            </div>
                                            <div className="space-y-1 text-xs text-slate-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} className="text-amber-500" />
                                                    <span>Toplam: <strong className="text-amber-700">{formatDuration(totalSeconds)}</strong></span>
                                                </div>
                                                {dayGroup.items.map(seg => (
                                                    <div key={seg.overtime_request_id || seg.attendance_id} className="flex items-center gap-1.5 text-slate-500">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                                        <span>{seg.start_time?.slice(0,5) || '?'} - {seg.end_time?.slice(0,5) || '?'}</span>
                                                        <span className="text-slate-400">({formatDuration(seg.actual_overtime_seconds)})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleClaimClick('POTENTIAL', { ...firstItem, _dayGroup: dayGroup })}
                                            disabled={claimingId === firstItem.attendance_id}
                                            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                claimingId === firstItem.attendance_id
                                                    ? 'bg-amber-100 text-amber-600 cursor-wait'
                                                    : 'bg-amber-500 text-white hover:bg-amber-600 hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-amber-500/20'
                                            }`}
                                        >
                                            {claimingId === firstItem.attendance_id ? (
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
                            );
                        })}
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
                            </p>
                        </div>
                    </div>

                    {/* Segment checkbox'ları (çoklu segment varsa) */}
                    {claimConfirm._dayGroup && claimConfirm._dayGroup.items.length > 1 && (
                        <div className="mb-3 space-y-1.5">
                            <label className="block text-xs font-bold text-blue-700">Segmentler</label>
                            {claimConfirm._dayGroup.items.map(seg => {
                                const segId = seg.overtime_request_id || seg.attendance_id;
                                const selIds = claimSelectedIds[claimConfirm.date] || [];
                                const isChecked = selIds.includes(segId);
                                return (
                                    <label key={segId} className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all text-xs ${isChecked ? 'bg-white border-amber-300' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                                setClaimSelectedIds(prev => {
                                                    const cur = prev[claimConfirm.date] || [];
                                                    const next = isChecked ? cur.filter(id => id !== segId) : [...cur, segId];
                                                    return { ...prev, [claimConfirm.date]: next };
                                                });
                                            }}
                                            className="accent-amber-600 w-3.5 h-3.5"
                                        />
                                        <span className="font-bold text-slate-700">{seg.start_time?.slice(0,5)} - {seg.end_time?.slice(0,5)}</span>
                                        <span className="text-slate-400">({formatDuration(seg.actual_overtime_seconds)})</span>
                                    </label>
                                );
                            })}
                            <p className="text-[11px] text-blue-500">
                                {(claimSelectedIds[claimConfirm.date] || []).length}/{claimConfirm._dayGroup.items.length} seçili
                                {(claimSelectedIds[claimConfirm.date] || []).length < claimConfirm._dayGroup.items.length && ' — çıkarılanlar ayrı tutulacak'}
                            </p>
                        </div>
                    )}

                    {/* Manager selector for employees with 2+ managers */}
                    {availableApprovers.length > 1 && (
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-blue-700 mb-1.5 flex items-center gap-1">
                                <Users size={13} className="text-blue-500" />
                                Onay Yöneticisi <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-1.5">
                                {availableApprovers.map(a => (
                                    <label
                                        key={a.id}
                                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all text-xs ${
                                            selectedApproverId === a.id
                                                ? 'bg-white border-blue-400 ring-1 ring-blue-400/30'
                                                : 'bg-white/60 border-blue-100 hover:border-blue-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="claim_approver"
                                            value={a.id}
                                            checked={selectedApproverId === a.id}
                                            onChange={() => onApproverSelect?.(a.id)}
                                            className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-bold text-slate-700">{a.name}</span>
                                            <span className="text-blue-500 ml-1">
                                                {a.relationship === 'PRIMARY' ? '(Asıl)' : a.relationship === 'SECONDARY' ? '(İkincil)' : a.relationship === 'CROSS' ? '(Çapraz)' : ''}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {!selectedApproverId && (
                                <p className="text-[11px] text-amber-600 font-medium mt-1">
                                    Lütfen bir onay yöneticisi seçin.
                                </p>
                            )}
                        </div>
                    )}

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
                            disabled={availableApprovers.length > 1 && !selectedApproverId}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center gap-1.5 ${
                                availableApprovers.length > 1 && !selectedApproverId
                                    ? 'bg-blue-300 text-white cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
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
                            <SmartDatePicker
                                mode="single"
                                value={overtimeForm.date}
                                onChange={(dateStr) => setOvertimeForm({ ...overtimeForm, date: dateStr })}
                                holidays={holidays}
                                leaveHistory={calendarLeaveHistory}
                                accentColor="blue"
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
export const MealRequestForm = ({ mealForm, setMealForm, holidays, calendarLeaveHistory }) => {
    // Tarih sınırları: 2 mali ay geri (~75 gün), 2 gün ileri (backend ile uyumlu)
    const minStr = getIstanbulDateOffset(-75);
    const maxStr = getIstanbulDateOffset(2);

    return (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div className="bg-emerald-50 p-4 rounded-xl flex items-start gap-3 text-emerald-800 text-sm border border-emerald-100">
                <Check className="shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="font-bold">Otomatik Onay</h4>
                    <p className="mt-1">Yemek talepleriniz için yönetici onayı gerekmez. Talebiniz direkt olarak sipariş sorumlusuna iletilecektir.</p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
                <SmartDatePicker
                    mode="single"
                    value={mealForm.date}
                    minDate={minStr}
                    maxDate={maxStr}
                    onChange={(dateStr) => setMealForm({ ...mealForm, date: dateStr })}
                    accentColor="emerald"
                    showLegend={false}
                />
                <p className="text-xs text-slate-400 mt-1">Varsayılan bugün. Geçmişe yönelik düzeltme için farklı tarih seçebilirsiniz.</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Yemek Tercihi / Açıklama <span className="text-red-500">*</span></label>
                <textarea
                    required
                    rows="3"
                    maxLength={1000}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none font-medium text-slate-700"
                    placeholder="Örn: Vejetaryen menü, Diyet kola vb."
                    value={mealForm.description}
                    onChange={e => setMealForm({ ...mealForm, description: e.target.value })}
                ></textarea>
                <p className="text-xs text-slate-400 mt-1 text-right">{mealForm.description?.length || 0}/1000</p>
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
    dutyHoursPreview,
    dutyHoursLoading,
    fetchDutyHoursPreview,
    weeklyOtForDuty,
    holidays,
    calendarLeaveHistory,
}) => {
    const [currentStep, setCurrentStep] = useState(0);

    // Fetch duty hours preview when reaching the summary step (step 7)
    useEffect(() => {
        if (currentStep === 7 && fetchDutyHoursPreview) {
            fetchDutyHoursPreview();
        }
    }, [currentStep]);

    // Debounced preview fetch when date segments change on Step 1
    const segmentsJson = JSON.stringify(externalDutyForm.date_segments || []);
    useEffect(() => {
        if (currentStep !== 1) return;
        const segments = externalDutyForm.date_segments || [];
        const allFilled = segments.every(s => s.start_time && s.end_time);
        if (allFilled && segments.length > 0 && fetchDutyHoursPreview) {
            const timer = setTimeout(() => fetchDutyHoursPreview(), 600);
            return () => clearTimeout(timer);
        }
    }, [segmentsJson, currentStep]);

    // Step definitions (all possible steps)
    const ALL_STEPS = {
        0: { id: 0, label: 'Görev Tipi', icon: Briefcase },
        1: { id: 1, label: 'Tarih & Çalışma Saatleri', icon: CalendarDays },
        2: { id: 2, label: 'Lokasyon', icon: MapPin },
        3: { id: 3, label: 'Görev Detayı', icon: FileText },
        4: { id: 4, label: 'Ulaşım', icon: Car },
        5: { id: 5, label: 'Konaklama', icon: Building2 },
        6: { id: 6, label: 'Bütçe & Belge', icon: Wallet },
        7: { id: 7, label: 'Özet', icon: Check },
    };

    // Which steps are active per duty category
    const STEP_MAP = {
        REMOTE_WORK:       [0, 1, 3, 7],
        SITE_VISIT:        [0, 1, 2, 3, 4, 5, 6, 7],
        CUSTOMER_VISIT:    [0, 1, 2, 3, 4, 5, 6, 7],
        INSTITUTION_VISIT: [0, 1, 2, 3, 4, 5, 6, 7],
        TRAINING:          [0, 1, 2, 3, 7],
        MEETING:           [0, 1, 2, 3, 7],
        OTHER:             [0, 1, 2, 3, 4, 5, 6, 7],
        '':                [0],
    };

    const taskType = externalDutyForm.task_type || '';
    const activeStepIds = STEP_MAP[taskType] || STEP_MAP[''];
    const activeSteps = activeStepIds.map(id => ALL_STEPS[id]);
    const currentStepIndex = activeStepIds.indexOf(currentStep);
    const TOTAL_ACTIVE = activeSteps.length;

    const goNext = () => {
        const idx = activeStepIds.indexOf(currentStep);
        if (idx < activeStepIds.length - 1) setCurrentStep(activeStepIds[idx + 1]);
    };
    const goPrev = () => {
        const idx = activeStepIds.indexOf(currentStep);
        if (idx > 0) setCurrentStep(activeStepIds[idx - 1]);
    };

    const taskTypeLabels = {
        REMOTE_WORK: 'Evden Çalışma',
        SITE_VISIT: 'Saha Ziyareti',
        TRAINING: 'Eğitim',
        MEETING: 'Toplantı',
        CUSTOMER_VISIT: 'Müşteri Ziyareti',
        INSTITUTION_VISIT: 'Kurum Ziyareti',
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

    // -- Step 0: Görev Tipi Seçimi --
    const dutyCategories = [
        {
            key: 'REMOTE_WORK',
            label: 'Evden Çalışma',
            desc: 'Uzaktan / evden çalışma kaydı',
            icon: Home,
            color: 'emerald',
        },
        {
            key: 'FIELD',
            label: 'Saha Görevi',
            desc: 'Müşteri ziyareti, saha kontrolü vb.',
            icon: MapPin,
            color: 'purple',
        },
        {
            key: 'EVENT',
            label: 'Toplantı / Eğitim',
            desc: 'Dış toplantı veya eğitim katılımı',
            icon: Users,
            color: 'blue',
        },
        {
            key: 'INSTITUTION',
            label: 'Kurum Ziyareti',
            desc: 'Resmi kurum, firma veya kuruluş ziyareti',
            icon: Landmark,
            color: 'amber',
        },
    ];

    const handleDutyCategorySelect = (category) => {
        let newTaskType = '';
        if (category === 'REMOTE_WORK') newTaskType = 'REMOTE_WORK';
        else if (category === 'FIELD') newTaskType = 'SITE_VISIT';
        else if (category === 'EVENT') newTaskType = 'MEETING';
        else if (category === 'INSTITUTION') newTaskType = 'INSTITUTION_VISIT';

        setExternalDutyForm({ ...externalDutyForm, task_type: newTaskType });
        // Jump to next step after selection
        const nextSteps = STEP_MAP[newTaskType] || [0];
        if (nextSteps.length > 1) setCurrentStep(nextSteps[1]);
    };

    const getSelectedCategory = () => {
        const t = externalDutyForm.task_type;
        if (t === 'REMOTE_WORK') return 'REMOTE_WORK';
        if (['SITE_VISIT', 'CUSTOMER_VISIT', 'OTHER'].includes(t)) return 'FIELD';
        if (['TRAINING', 'MEETING'].includes(t)) return 'EVENT';
        if (t === 'INSTITUTION_VISIT') return 'INSTITUTION';
        return '';
    };

    const colorMap = {
        emerald: { card: 'border-emerald-200 bg-emerald-50/50', active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-lg shadow-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-700' },
        purple:  { card: 'border-purple-200 bg-purple-50/50',  active: 'border-purple-500 bg-purple-50 ring-2 ring-purple-200 shadow-lg shadow-purple-100',  icon: 'text-purple-600',  text: 'text-purple-700' },
        blue:    { card: 'border-blue-200 bg-blue-50/50',    active: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-lg shadow-blue-100',    icon: 'text-blue-600',    text: 'text-blue-700' },
        amber:   { card: 'border-amber-200 bg-amber-50/50',  active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200 shadow-lg shadow-amber-100',  icon: 'text-amber-600',  text: 'text-amber-700' },
    };

    const Step0 = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div className="bg-purple-50 p-4 rounded-xl flex items-start gap-3 text-purple-800 text-sm border border-purple-100">
                <Briefcase className="shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="font-bold">Görev Tipi Seçin</h4>
                    <p className="mt-1">Görev tipine göre form adımları otomatik olarak ayarlanacaktır.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dutyCategories.map(cat => {
                    const CatIcon = cat.icon;
                    const selected = getSelectedCategory() === cat.key;
                    const cm = colorMap[cat.color];
                    return (
                        <button key={cat.key} type="button"
                            onClick={() => handleDutyCategorySelect(cat.key)}
                            className={`p-5 rounded-xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                selected ? cm.active : `${cm.card} hover:shadow-md`
                            }`}>
                            <CatIcon size={28} className={cm.icon} />
                            <h4 className={`font-bold mt-3 ${cm.text}`}>{cat.label}</h4>
                            <p className="text-xs text-slate-500 mt-1">{cat.desc}</p>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // -- Step 1: Tarih & Çalışma Saatleri (birleşik) --
    const Step1 = () => {
        const segments = externalDutyForm.date_segments || [];

        const updateSegment = (index, field, value) => {
            const updated = [...segments];
            updated[index] = { ...updated[index], [field]: value };
            setExternalDutyForm(prev => ({ ...prev, date_segments: updated }));
        };

        const applyToAll = () => {
            if (segments.length === 0) return;
            const first = segments[0];
            if (!first.start_time || !first.end_time) return;
            const updated = segments.map(seg => ({
                ...seg,
                start_time: first.start_time,
                end_time: first.end_time,
            }));
            setExternalDutyForm(prev => ({ ...prev, date_segments: updated }));
        };

        const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

        return (
            <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                <div className="bg-purple-50 p-4 rounded-xl flex items-start gap-3 text-purple-800 text-sm border border-purple-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-bold">Mesai Hesaplama</h4>
                        <p className="mt-1">Dış görevde öğle molası düşülmez, tüm süre çalışma sayılır. Vardiya saatleri içindeki süre <strong>normal mesai</strong>, vardiya dışındaki süre <strong>ek mesai</strong> olarak değerlendirilir. Tatil/hafta sonu günlerinde tüm süre ek mesai sayılır.</p>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih Aralığı <span className="text-red-500">*</span></label>
                    <SmartDatePicker
                        mode="range"
                        value={externalDutyForm.start_date && externalDutyForm.end_date
                            ? [externalDutyForm.start_date, externalDutyForm.end_date]
                            : null}
                        onChange={([start, end]) => {
                            setExternalDutyForm(prev => ({ ...prev, start_date: start || '', end_date: end || '' }));
                        }}
                        holidays={holidays}
                        leaveHistory={calendarLeaveHistory}
                        accentColor="purple"
                    />
                </div>
                {externalDutyForm.start_date && externalDutyForm.end_date && (
                    <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                        <span>Toplam Görev Süresi:</span>
                        <span className="font-bold text-purple-700">{duration} Gün</span>
                    </div>
                )}

                {/* Gün bazlı çalışma saatleri — tarih seçilince otomatik gösterilir */}
                {segments.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <Clock size={16} className="text-indigo-500" />
                                Gün Bazlı Çalışma Saatleri
                            </div>
                            {segments.length > 1 && (
                                <button type="button" onClick={applyToAll}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors">
                                    <Copy size={14} /> İlk günü tümüne uygula
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            {segments.map((seg, i) => {
                                const _segP = toIstanbulParts(seg.date + 'T00:00:00');
                                const dayName = _segP ? DAY_NAMES[_segP.dayOfWeek] : '';
                                const dateLabel = new Date(seg.date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' });
                                const dayPreview = dutyHoursPreview?.days?.find(dp => dp.date === seg.date);

                                return (
                                    <div key={seg.date} className={`p-3 rounded-xl border transition-all ${
                                        dayPreview?.is_off_day ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'
                                    }`}>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="w-28">
                                                <span className="font-bold text-sm text-slate-700">{dateLabel}</span>
                                                <span className="block text-[10px] text-slate-400">{dayName}</span>
                                            </div>

                                            {dayPreview && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    dayPreview.is_off_day ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {dayPreview.is_off_day ? 'Tatil' : `Vardiya ${dayPreview.shift_start}-${dayPreview.shift_end}`}
                                                </span>
                                            )}

                                            <div className="flex items-center gap-2 ml-auto">
                                                <input type="time" value={seg.start_time}
                                                    onChange={e => updateSegment(i, 'start_time', e.target.value)}
                                                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium w-28 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                                                <span className="text-slate-400 text-sm">&rarr;</span>
                                                <input type="time" value={seg.end_time}
                                                    onChange={e => updateSegment(i, 'end_time', e.target.value)}
                                                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium w-28 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                                            </div>
                                        </div>

                                        {dayPreview && seg.start_time && seg.end_time && (
                                            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100 text-xs flex-wrap">
                                                {dayPreview.normal_work_minutes > 0 && (
                                                    <span className="text-emerald-600 font-bold">
                                                        Normal: {Math.floor(dayPreview.normal_work_minutes / 60)}s {dayPreview.normal_work_minutes % 60}dk
                                                    </span>
                                                )}
                                                {dayPreview.overtime_minutes > 0 && (
                                                    <span className="text-amber-600 font-bold">
                                                        Ek Mesai: {Math.floor(dayPreview.overtime_minutes / 60)}s {dayPreview.overtime_minutes % 60}dk
                                                    </span>
                                                )}
                                                {dayPreview.overtime_segments?.length > 0 && (
                                                    <span className="text-slate-400 text-[10px]">
                                                        ({dayPreview.overtime_segments.map(s => `${s.start}-${s.end}`).join(' + ')})
                                                    </span>
                                                )}
                                                {dayPreview && !dayPreview.is_off_day && dayPreview.shift_target_minutes > 0 && (
                                                    <span className="text-[10px] text-slate-400">Hedef: {Math.floor(dayPreview.shift_target_minutes / 60)}s {dayPreview.shift_target_minutes % 60}dk</span>
                                                )}
                                                {dayPreview?.is_off_day && (
                                                    <span className="text-[10px] text-red-400 font-medium">Tatil / hafta sonu — tümü ek mesai</span>
                                                )}
                                                {dayPreview?.existing_card_minutes > 0 && (
                                                    <div className="w-full mt-1 pt-1 border-t border-dashed border-slate-200 flex items-center gap-3 flex-wrap">
                                                        <span className="text-[10px] text-blue-500 font-bold">
                                                            Mevcut kart: {dayPreview.existing_card_records?.map(c => `${c.check_in}-${c.check_out}`).join(', ')} ({Math.floor(dayPreview.existing_card_minutes / 60)}s {dayPreview.existing_card_minutes % 60}dk)
                                                        </span>
                                                        <span className="text-[10px] text-purple-600 font-bold">
                                                            Birleşik → Normal: {Math.floor(dayPreview.combined_normal_minutes / 60)}s {dayPreview.combined_normal_minutes % 60}dk
                                                            {dayPreview.combined_ot_minutes > 0 && ` + OT: ${Math.floor(dayPreview.combined_ot_minutes / 60)}s ${dayPreview.combined_ot_minutes % 60}dk`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {dutyHoursPreview && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="text-center">
                                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Görev Normal Mesai</span>
                                        <span className="block font-black text-emerald-600 text-lg">
                                            {Math.floor(dutyHoursPreview.totals.total_normal_work_minutes / 60)}s {dutyHoursPreview.totals.total_normal_work_minutes % 60}dk
                                        </span>
                                    </div>
                                    <div className="text-center">
                                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Görev Ek Mesai</span>
                                        <span className="block font-black text-amber-600 text-lg">
                                            {Math.floor(dutyHoursPreview.totals.total_overtime_minutes / 60)}s {dutyHoursPreview.totals.total_overtime_minutes % 60}dk
                                        </span>
                                    </div>
                                </div>
                                {dutyHoursPreview.totals.existing_card_minutes > 0 && (
                                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                                        <span className="block text-[10px] text-purple-400 font-bold uppercase mb-1">Birleşik Hesaplama (Kart + Görev)</span>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <span className="block text-[10px] text-slate-400">Kart</span>
                                                <span className="block font-bold text-blue-600">
                                                    {Math.floor(dutyHoursPreview.totals.existing_card_minutes / 60)}s {dutyHoursPreview.totals.existing_card_minutes % 60}dk
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-slate-400">Normal</span>
                                                <span className="block font-bold text-emerald-600">
                                                    {Math.floor(dutyHoursPreview.totals.combined_normal_minutes / 60)}s {dutyHoursPreview.totals.combined_normal_minutes % 60}dk
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-slate-400">Ek Mesai</span>
                                                <span className="block font-bold text-amber-600">
                                                    {Math.floor(dutyHoursPreview.totals.combined_ot_minutes / 60)}s {dutyHoursPreview.totals.combined_ot_minutes % 60}dk
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {dutyHoursPreview && (() => {
                            const firstWorkingDay = dutyHoursPreview.days?.find(d => !d.is_off_day);
                            const shiftTargetMin = firstWorkingDay?.shift_target_minutes;
                            const hasOffDay = dutyHoursPreview.days?.some(d => d.is_off_day);
                            return (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1.5">
                                    <div className="flex items-start gap-2">
                                        <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
                                        <div className="space-y-1">
                                            <p className="font-bold">Hesaplama Kuralları</p>
                                            <ul className="list-disc pl-4 space-y-0.5 text-blue-700">
                                                <li>Dış görevde öğle molası düşülmez, tüm süre çalışma sayılır</li>
                                                <li>Vardiya saatleri içindeki görev süresi <strong>normal mesai</strong> olarak yazılır</li>
                                                <li>Vardiya saatleri dışındaki görev süresi <strong>ek mesai</strong> olarak değerlendirilir</li>
                                                <li>Ek mesai, haftalık limit dahilinde otomatik onaylanır</li>
                                                {hasOffDay && <li>Tatil/hafta sonu günlerinde tüm süre <strong>ek mesai</strong> sayılır</li>}
                                                <li>Aynı gün kart verisi varsa birleştirilir</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {dutyHoursLoading && (
                            <div className="text-center py-2">
                                <div className="animate-pulse text-sm text-indigo-400">Hesaplanıyor...</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

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

    // -- Step 3: Görev Detayı (adapts to task_type) --
    const Step3 = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            {/* Sub-type dropdown — only for FIELD category */}
            {['SITE_VISIT', 'CUSTOMER_VISIT', 'OTHER'].includes(externalDutyForm.task_type) && (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Görev Alt Türü <span className="text-red-500">*</span></label>
                    <select value={externalDutyForm.task_type}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, task_type: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium text-slate-700">
                        <option value="SITE_VISIT">Saha Ziyareti</option>
                        <option value="CUSTOMER_VISIT">Müşteri Ziyareti</option>
                        <option value="OTHER">Diğer</option>
                    </select>
                </div>
            )}
            {/* Sub-type dropdown for EVENT category */}
            {['TRAINING', 'MEETING'].includes(externalDutyForm.task_type) && (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Etkinlik Türü <span className="text-red-500">*</span></label>
                    <select value={externalDutyForm.task_type}
                        onChange={e => setExternalDutyForm({ ...externalDutyForm, task_type: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium text-slate-700">
                        <option value="MEETING">Toplantı</option>
                        <option value="TRAINING">Eğitim</option>
                    </select>
                </div>
            )}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {externalDutyForm.task_type === 'REMOTE_WORK' ? 'Yapılacak İş Açıklaması' : 'Görev Açıklaması'} <span className="text-red-500">*</span>
                </label>
                <textarea required rows="4" value={externalDutyForm.duty_description}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, duty_description: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none font-medium text-slate-700"
                    placeholder={externalDutyForm.task_type === 'REMOTE_WORK'
                        ? 'Evden çalışma süresince yapılacak işleri yazınız...'
                        : 'Görevin detaylı açıklamasını yazınız...'} />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">İletişim Telefonu</label>
                <input type="tel" value={externalDutyForm.contact_phone}
                    onChange={e => setExternalDutyForm({ ...externalDutyForm, contact_phone: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700"
                    placeholder="Örn: 0532 123 45 67" />
            </div>
            {/* Approver + Substitute — shown here for REMOTE_WORK & EVENT (they skip Step 6) */}
            {['REMOTE_WORK', 'TRAINING', 'MEETING'].includes(externalDutyForm.task_type) && (
                <>
                    {approverDropdown}
                    <div className="flex items-center gap-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100 transition-all hover:bg-purple-50">
                        <input type="checkbox" id="send_to_sub_duty_v3"
                            checked={externalDutyForm.send_to_substitute}
                            onChange={e => setExternalDutyForm({ ...externalDutyForm, send_to_substitute: e.target.checked })}
                            className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer" />
                        <label htmlFor="send_to_sub_duty_v3" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                            Vekil yöneticiye de gönder
                        </label>
                    </div>
                </>
            )}
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

    // -- Step 7: Özet (adapts to task_type) --
    const Step7 = () => {
        const summaryColorMap = {
            purple: { border: 'border-purple-100', bg: 'bg-purple-50/30', text: 'text-purple-700' },
            blue:   { border: 'border-blue-100',   bg: 'bg-blue-50/30',   text: 'text-blue-700' },
            green:  { border: 'border-green-100',  bg: 'bg-green-50/30',  text: 'text-green-700' },
            amber:  { border: 'border-amber-100',  bg: 'bg-amber-50/30',  text: 'text-amber-700' },
            emerald:{ border: 'border-emerald-100', bg: 'bg-emerald-50/30', text: 'text-emerald-700' },
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

        const isRemote = externalDutyForm.task_type === 'REMOTE_WORK';
        const isEvent = ['TRAINING', 'MEETING'].includes(externalDutyForm.task_type);

        return (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                <div className={`p-3 rounded-xl border text-center ${isRemote ? 'bg-emerald-50 border-emerald-100' : 'bg-purple-50 border-purple-100'}`}>
                    <h4 className={`text-sm font-bold ${isRemote ? 'text-emerald-700' : 'text-purple-700'}`}>
                        {isRemote ? 'Evden Çalışma Özeti' : isEvent ? 'Toplantı/Eğitim Özeti' : 'Görev Özeti'}
                    </h4>
                    <p className={`text-xs mt-0.5 ${isRemote ? 'text-emerald-600' : 'text-purple-600'}`}>Bilgileri kontrol edip formu gönderebilirsiniz</p>
                </div>
                <SummaryCard title="Görev Tipi" icon={Briefcase} color={isRemote ? 'emerald' : 'purple'}>
                    <SummaryRow label="Tür" value={taskTypeLabels[externalDutyForm.task_type] || ''} />
                </SummaryCard>
                <SummaryCard title="Tarih & Saat" icon={CalendarDays}>
                    <SummaryRow label="Tarih" value={`${externalDutyForm.start_date} - ${externalDutyForm.end_date}`} />
                    <SummaryRow label="Saat" value={
                        (externalDutyForm.date_segments || []).filter(s => s.start_time && s.end_time).length > 0
                            ? `${(externalDutyForm.date_segments || []).filter(s => s.start_time && s.end_time).length} gün tanımlı`
                            : externalDutyForm.start_time && externalDutyForm.end_time ? `${externalDutyForm.start_time} - ${externalDutyForm.end_time}` : ''
                    } />
                    <SummaryRow label="Süre" value={duration ? `${duration} Gün` : ''} />
                </SummaryCard>
                {/* Tahmini Mesai Hesaplaması */}
                {dutyHoursPreview ? (
                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30">
                        <h4 className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-2">
                            <Clock size={16} /> Tahmini Mesai Hesaplaması
                        </h4>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-center">
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">Normal Mesai</span>
                                <span className="block font-black text-emerald-600 text-lg">
                                    {Math.floor(dutyHoursPreview.totals.total_normal_work_minutes / 60)}s {dutyHoursPreview.totals.total_normal_work_minutes % 60}dk
                                </span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-amber-100 text-center">
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">Ek Mesai</span>
                                <span className="block font-black text-amber-600 text-lg">
                                    {Math.floor(dutyHoursPreview.totals.total_overtime_minutes / 60)}s {dutyHoursPreview.totals.total_overtime_minutes % 60}dk
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            {dutyHoursPreview.days.map((day, i) => (
                                <div key={i} className={`flex items-center justify-between text-xs p-2.5 rounded-lg border ${
                                    day.is_off_day ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'
                                }`}>
                                    <div className="w-20">
                                        <span className="font-bold text-slate-700">
                                            {new Date(day.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })}
                                        </span>
                                        <span className="block text-[10px] text-slate-400">{day.day_name}</span>
                                    </div>
                                    <span className="text-slate-500 w-24 text-center">{day.duty_start} - {day.duty_end}</span>
                                    <div className="w-20 text-center">
                                        {day.normal_work_minutes > 0 ? (
                                            <span className="text-emerald-600 font-bold">
                                                {Math.floor(day.normal_work_minutes / 60)}s {day.normal_work_minutes % 60}dk
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">&mdash;</span>
                                        )}
                                    </div>
                                    <div className="w-24 text-right">
                                        {day.overtime_minutes > 0 ? (
                                            <div>
                                                <span className="text-amber-600 font-bold">
                                                    {Math.floor(day.overtime_minutes / 60)}s {day.overtime_minutes % 60}dk
                                                </span>
                                                {day.overtime_segments.length > 0 && (
                                                    <span className="block text-[9px] text-slate-400">
                                                        {day.overtime_segments.map(s => `${s.start}-${s.end}`).join(' + ')}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">&mdash;</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400 text-center">
                            Toplam {dutyHoursPreview.totals.total_days} {"\u0067ü\u006e"} ({dutyHoursPreview.totals.working_days} {"\u0069ş"} {"\u0067ü\u006eü"}, {dutyHoursPreview.totals.off_days} tatil)
                        </div>
                    </div>
                ) : dutyHoursLoading ? (
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 text-center">
                        <div className="animate-pulse text-sm text-slate-400">Mesai hesaplanıyor...</div>
                    </div>
                ) : null}
                {dutyHoursPreview?.totals?.total_overtime_minutes > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={externalDutyForm.include_overtime}
                                onChange={(e) => setExternalDutyForm(prev => ({ ...prev, include_overtime: e.target.checked }))}
                                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-sm font-medium text-amber-800">Ek mesai saatlerini talep et</span>
                        </label>
                        <div className="text-xs text-amber-600 mt-1 ml-6">
                            Toplam OT: {Math.round(dutyHoursPreview.totals.total_overtime_minutes / 60 * 10) / 10} saat
                        </div>
                        {weeklyOtForDuty && !weeklyOtForDuty.is_unlimited && (
                            <div className="text-xs mt-1 ml-6">
                                <span className={weeklyOtForDuty.is_over_limit ? 'text-red-600' : 'text-amber-600'}>
                                    Haftalık: {weeklyOtForDuty.used_hours}/{weeklyOtForDuty.limit_hours} sa — Kalan: {weeklyOtForDuty.remaining_hours} sa
                                </span>
                                {weeklyOtForDuty.remaining_hours < dutyHoursPreview.totals.total_overtime_minutes / 60 && (
                                    <div className="text-red-600 font-medium mt-0.5">
                                        Haftalık limit aşılacak — OT kısmı potansiyel olarak kalacak
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {dutyHoursPreview && (() => {
                    const firstWorkingDay = dutyHoursPreview.days?.find(d => !d.is_off_day);
                    const shiftTargetMin = firstWorkingDay?.shift_target_minutes;
                    const hasOffDay = dutyHoursPreview.days?.some(d => d.is_off_day);
                    return (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1.5">
                            <div className="flex items-start gap-2">
                                <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
                                <div className="space-y-1">
                                    <p className="font-bold">Hesaplama Kuralları</p>
                                    <ul className="list-disc pl-4 space-y-0.5 text-blue-700">
                                        <li>Dış görevde öğle molası düşülmez, tüm süre çalışma sayılır</li>
                                        {shiftTargetMin > 0 && (
                                            <li>Günlük mesai hedefine ({Math.floor(shiftTargetMin / 60)}s {shiftTargetMin % 60 > 0 ? `${shiftTargetMin % 60}dk` : ''}) kadar <strong>normal mesai</strong> yazılır</li>
                                        )}
                                        <li>Hedefi aşan süre <strong>ek mesai</strong> olarak otomatik onaylanır</li>
                                        {hasOffDay && <li>Tatil/hafta sonu günlerinde tüm süre <strong>ek mesai</strong> sayılır</li>}
                                        <li>Aynı gün kart verisi varsa birleştirilir</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                {!isRemote && (
                    <SummaryCard title="Lokasyon" icon={MapPin}>
                        <SummaryRow label="Şehir" value={`${externalDutyForm.duty_city} ${externalDutyForm.duty_district}`.trim()} />
                        <SummaryRow label="Adres" value={externalDutyForm.duty_address} />
                        <SummaryRow label="Firma" value={externalDutyForm.duty_company} />
                    </SummaryCard>
                )}
                <SummaryCard title={isRemote ? 'Çalışma Detayı' : 'Görev Detayı'} icon={FileText}>
                    <SummaryRow label="Açıklama" value={externalDutyForm.duty_description} />
                    <SummaryRow label="Telefon" value={externalDutyForm.contact_phone} />
                </SummaryCard>
                {!isRemote && !isEvent && externalDutyForm.needs_transportation && (
                    <SummaryCard title="Ulaşım" icon={Car}>
                        <SummaryRow label="Tür" value={transportTypeLabels[externalDutyForm.transport_type] || ''} />
                        <SummaryRow label="Plaka" value={externalDutyForm.transport_plate} />
                        <SummaryRow label="Sürücü" value={externalDutyForm.transport_driver} />
                        <SummaryRow label="Not" value={externalDutyForm.transport_description} />
                    </SummaryCard>
                )}
                {!isRemote && !isEvent && externalDutyForm.needs_accommodation && (
                    <SummaryCard title="Konaklama" icon={Building2}>
                        <SummaryRow label="Yer" value={externalDutyForm.accommodation_name} />
                        <SummaryRow label="Gece" value={externalDutyForm.accommodation_nights > 0 ? `${externalDutyForm.accommodation_nights} gece` : ''} />
                        <SummaryRow label="Not" value={externalDutyForm.accommodation_notes} />
                    </SummaryCard>
                )}
                {!isRemote && !isEvent && (
                    <SummaryCard title="Bütçe & Onay" icon={Wallet}>
                        <SummaryRow label="Bütçe" value={externalDutyForm.budget_amount ? `${externalDutyForm.budget_amount} TL` : ''} />
                        <SummaryRow label="Görev Yeri" value={tripTypeLabels[externalDutyForm.trip_type] || ''} />
                        <SummaryRow label="Vekil" value={externalDutyForm.send_to_substitute ? 'Evet' : 'Hayır'} />
                    </SummaryCard>
                )}
            </div>
        );
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0: return Step0();
            case 1: return Step1();
            case 2: return Step2();
            case 3: return Step3();
            case 4: return Step4();
            case 5: return Step5();
            case 6: return Step6();
            case 7: return Step7();
            default: return Step0();
        }
    };

    return (
        <div className="space-y-5">
            {/* Step Indicator Pills */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {activeSteps.map((s, idx) => {
                    const StepIcon = s.icon;
                    const isActive = currentStep === s.id;
                    const isDone = currentStepIndex > idx;
                    return (
                        <button key={s.id} type="button" onClick={() => setCurrentStep(s.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                isActive
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200 scale-105'
                                    : isDone
                                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}>
                            {isDone ? <Check size={12} /> : <StepIcon size={12} />}
                            <span className="hidden sm:inline">{s.label}</span>
                            <span className="sm:hidden">{idx + 1}</span>
                        </button>
                    );
                })}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStepIndex + 1) / TOTAL_ACTIVE) * 100}%` }} />
            </div>

            {/* Step Content */}
            <div className="min-h-[200px]">
                {renderStep()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-2">
                <button type="button" onClick={goPrev} disabled={currentStepIndex <= 0}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        currentStepIndex <= 0
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-purple-700 bg-purple-50 hover:bg-purple-100 active:scale-95'
                    }`}>
                    <ChevronLeft size={16} /> Geri
                </button>
                {currentStepIndex < TOTAL_ACTIVE - 1 && currentStep !== 0 && (() => {
                    // Step 1 (Tarih & Çalışma Saatleri): tüm günlere saat girilmeden İleri basılamaz
                    const step1Disabled = currentStep === 1 && !(
                        (externalDutyForm.date_segments || []).length > 0 &&
                        (externalDutyForm.date_segments || []).every(s => s.start_time && s.end_time)
                    );
                    return (
                        <button type="button" onClick={goNext} disabled={step1Disabled}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                                step1Disabled
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    : 'text-white bg-purple-600 hover:bg-purple-700 active:scale-95'
                            }`}>
                            İleri <ChevronRightIcon size={16} />
                        </button>
                    );
                })()}
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
    holidays,
    calendarLeaveHistory,
}) => (
    <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
            {(() => {
                const maxDate = getIstanbulToday();
                const minDate = getIstanbulDateOffset(-75);
                return (
                    <SmartDatePicker
                        mode="single"
                        value={cardlessEntryForm.date}
                        minDate={minDate}
                        maxDate={maxDate}
                        onChange={(dateStr) => {
                            setCardlessEntryForm({ ...cardlessEntryForm, date: dateStr, check_in_time: '', check_out_time: '' });
                        }}
                        holidays={holidays}
                        leaveHistory={calendarLeaveHistory}
                        accentColor="purple"
                    />
                );
            })()}
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
                    disabled={!isCardlessWorkDay || cardlessScheduleLoading}
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
                    disabled={!isCardlessWorkDay || cardlessScheduleLoading}
                    onChange={e => setCardlessEntryForm({ ...cardlessEntryForm, check_out_time: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                />
            </div>
        </div>

        {cardlessEntryForm.check_in_time && cardlessEntryForm.check_out_time && cardlessEntryForm.check_in_time >= cardlessEntryForm.check_out_time && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500 shrink-0" />
                <span className="text-sm font-medium text-amber-700">Çıkış saati giriş saatinden sonra olmalıdır.</span>
            </div>
        )}

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
