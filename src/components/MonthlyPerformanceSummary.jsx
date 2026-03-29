import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Clock, AlertTriangle, Briefcase, MinusCircle, CheckCircle, Scale, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { Popover, Tooltip } from 'antd';
import { getIstanbulMonth, getIstanbulYear } from '../utils/dateUtils';

// Saniye → "H:MM" formatı
function fmtSec(s) {
    if (!s) return '0:00';
    const neg = s < 0;
    const totalMin = Math.round(Math.abs(s) / 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const sign = neg ? '-' : '';
    return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

// Ondalık saat → "H:MM" formatı (örn: 163.5 → "163:30")
function fmtHours(h) {
    if (!h || h === 0) return '0:00';
    const neg = h < 0;
    const abs = Math.abs(parseFloat(h));
    const hours = Math.floor(abs);
    const mins = Math.round((abs - hours) * 60);
    const sign = neg ? '-' : '';
    return `${sign}${hours}:${String(mins).padStart(2, '0')}`;
}

const EffortDetailPopover = ({ stats }) => {
    if (!stats) return null;
    const rows = [
        { label: 'Aylık Hedef', value: stats.targetDisplay },
        { label: 'Bugüne Kadar Hedef', value: stats.pastTargetDisplay },
        { type: 'divider' },
        { label: 'Normal Çalışma', value: stats.completedDisplay },
        { label: 'Onaylı OT', value: stats.overtimeDisplay },
    ];
    if (stats._dutySec > 0) {
        rows.push({ label: 'Dış Görev', value: stats.dutyDisplay, color: 'text-indigo-600' });
    }
    if (stats._leaveSec > 0) {
        rows.push({ label: 'İzin', value: stats.leaveDisplay, color: 'text-cyan-600' });
    }
    if (stats._hrSec > 0) {
        rows.push({ label: 'Rapor', value: stats.healthReportDisplay, color: 'text-sky-600' });
    }
    rows.push(
        { label: stats.hasCredited ? 'Toplam Efor' : 'Onaylı Toplam', value: stats.hasCredited ? stats.displayTotalDisplay : stats.netWorkDisplay, bold: true },
        { type: 'divider' },
        {
            label: stats.isNetNeutral ? 'Durum' : (stats.isNetSurplus ? 'Net Fazla' : 'Net Eksik'),
            value: stats.isNetNeutral
                ? 'Hedefe Ulaşıldı'
                : `${stats.isNetSurplus ? '+' : '-'}${stats.netBalanceForLabelDisplay}`,
            bold: true,
            color: stats.isNetNeutral ? 'text-slate-600' : (stats.isNetSurplus ? 'text-emerald-600' : 'text-rose-600')
        },
    );

    if (stats._otPendingSec > 0 || stats._otPotentialSec > 0) {
        rows.push({ type: 'divider' });
        if (stats._otPendingSec > 0) {
            rows.push({ label: 'Bekleyen OT', value: stats.otPendingDisplay, color: 'text-amber-600', muted: true });
        }
        if (stats._otPotentialSec > 0) {
            rows.push({ label: 'Potansiyel OT', value: stats.otPotentialDisplay, color: 'text-slate-500', muted: true });
        }
    }
    if (stats._remainingSec > 0) {
        rows.push({ type: 'divider' });
        rows.push({ label: 'Kalan Tam Çalışılırsa', value: stats.projectionIfFullDisplay, bold: true, color: 'text-indigo-600' });
    }

    return (
        <div className="min-w-[220px] p-1">
            <div className="text-xs font-black text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-500" />
                Aylık Efor Detayı
            </div>
            <div className="space-y-1">
                {rows.map((row, i) =>
                    row.type === 'divider' ? (
                        <div key={i} className="border-t border-slate-100 my-1.5" />
                    ) : (
                        <div key={i} className={`flex justify-between items-center ${row.muted ? 'opacity-70' : ''}`}>
                            <span className={`text-xs ${row.bold ? 'font-black' : 'font-medium'} ${row.color || 'text-slate-600'}`}>
                                {row.label}
                            </span>
                            <span className={`text-xs ${row.bold ? 'font-black' : 'font-semibold'} ${row.color || 'text-slate-800'} tabular-nums`}>
                                {row.value}
                            </span>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

const MonthlyPerformanceSummary = ({ logs, periodSummary, onMonthSelect, onForceRefresh }) => {

    const stats = useMemo(() => {
        if (periodSummary) {
            // Fix: Backend sends 'target_gross' and 'total_work_seconds'
            const targetSec = periodSummary.target_gross || periodSummary.target_seconds || 0;
            const realizedSec = periodSummary.completed_seconds || 0; // Normal work
            const overtimeSec = periodSummary.overtime_seconds || 0;
            const missingSec = periodSummary.missing_seconds || 0;
            const remainingSec = periodSummary.remaining_seconds || 0;

            // Fix: Backend sends 'total_work_seconds', not 'net_work_seconds'
            const netWorkSec = periodSummary.total_work_seconds || periodSummary.net_work_seconds || 0; // Normal + OT

            // Leave, Health Report & Duty credited seconds
            const leaveSec = periodSummary.leave_seconds || 0;
            const healthReportSec = periodSummary.health_report_seconds || 0;
            const dutySec = periodSummary.duty_seconds || 0;
            const potentialOtFromBackend = periodSummary.potential_ot_seconds || 0;
            const creditedSec = leaveSec + healthReportSec + dutySec; // Total credited (İzin + Rapor + Görev)

            // True Balance: cari ay için past_target_balance kullan (gelecek günler dahil değil)
            const netBalanceReal = periodSummary.past_target_balance_seconds ?? periodSummary.net_balance_seconds ?? (netWorkSec - targetSec);

            const breakSec = periodSummary.total_break_seconds || 0;
            const lateSec = periodSummary.total_late_seconds || 0;

            // === SHARED BASE PERCENTAGES (used by BOTH bars for pixel-perfect alignment) ===
            const scale = targetSec > 0 ? targetSec : 1;
            const pBase = (realizedSec / scale) * 100;
            const pBaseDuty = (dutySec / scale) * 100;
            const pBaseLeave = (leaveSec / scale) * 100;
            const pBaseReport = (healthReportSec / scale) * 100;

            // Bar 1 tail: eksik + kalan (fills remaining space to 100%)
            const pMissing = (missingSec / scale) * 100;
            const kalanSec = Math.max(0, targetSec - realizedSec - dutySec - leaveSec - healthReportSec - missingSec);
            const pKalan = (kalanSec / scale) * 100;

            // Bar 2: Total Progress (Normal + Duty + OT + Leave + Report)
            // FIX: netWorkSec (total_work_seconds) already includes duty + leave + HR — NO double counting
            const totalEforSec = netWorkSec;
            const surplusSec = Math.max(0, totalEforSec - targetSec);
            const isSurplus = surplusSec > 0;
            const pTotal = targetSec > 0 ? Math.min(100, (totalEforSec / targetSec) * 100) : 0;

            // Bar 2 tail: OT (after shared base segments)
            const pOT = (overtimeSec / scale) * 100;
            const pPotentialOT = (potentialOtFromBackend / scale) * 100;

            // Legacy compat aliases
            const pCompleted = pBase;
            const pDutyBar1 = pBaseDuty;
            const pLeaveBar1 = pBaseLeave;
            const pReportBar1 = pBaseReport;
            const pRemaining = pKalan;
            const pNormal = pBase;
            const pDuty = pBaseDuty;
            const pLeave = pBaseLeave;
            const pHealthReport = pBaseReport;
            const pOtApproved = pOT;


            let lateCount = 0;
            logs.forEach(log => {
                if ((log.late_seconds || 0) > 0) lateCount++;
            });

            // OT Breakdown from cumulative current month data
            const _otFm = periodSummary.fiscal_month || getIstanbulMonth();
            const _otBd = (periodSummary.cumulative?.breakdown || []).find(b => b.month === _otFm);
            let otApprovedSec = _otBd?.ot_approved || 0;
            let otPendingSec = _otBd?.ot_pending || 0;
            let otPotentialSec = _otBd?.ot_potential || 0;
            // Fallback: if no OvertimeRequest records but attendance has overtime,
            // show attendance overtime as approved (system-calculated)
            if (otApprovedSec + otPendingSec + otPotentialSec === 0 && overtimeSec > 0) {
                otApprovedSec = overtimeSec;
            }
            const otBreakdownTotal = otApprovedSec + otPendingSec + otPotentialSec;

            return {
                // Raw seconds for calculations
                _targetSec: targetSec,
                _realizedSec: realizedSec,
                _dutySec: dutySec,
                _missingSec: missingSec,
                _remainingSec: remainingSec,
                _overtimeSec: overtimeSec,
                _potentialOtSec: potentialOtFromBackend,
                _leaveSec: leaveSec,
                _hrSec: healthReportSec,
                _otPendingSec: otPendingSec,
                _otPotentialSec: otPotentialSec,

                // Display formatted (saniye → Xsa Ydk)
                targetDisplay: fmtSec(targetSec),
                completedDisplay: fmtSec(realizedSec),
                dutyDisplay: fmtSec(dutySec),
                missingDisplay: fmtSec(missingSec),
                remainingDisplay: fmtSec(remainingSec),
                overtimeDisplay: fmtSec(overtimeSec),
                potentialOtDisplay: fmtSec(potentialOtFromBackend),
                netWorkDisplay: fmtSec(netWorkSec),
                netBalanceDisplay: fmtSec(netBalanceReal),
                leaveDisplay: fmtSec(leaveSec),
                healthReportDisplay: fmtSec(healthReportSec),
                displayTotalDisplay: fmtSec(netWorkSec),

                // Legacy compat (bar chart still needs numeric)
                targetHours: (targetSec / 3600).toFixed(1),
                completedHours: (realizedSec / 3600).toFixed(1),
                dutyHours: (dutySec / 3600).toFixed(1),
                missingHours: (missingSec / 3600).toFixed(1),
                remainingHours: (remainingSec / 3600).toFixed(1),
                overtimeHours: (overtimeSec / 3600).toFixed(1),
                netWorkHours: (netWorkSec / 3600).toFixed(1),
                surplusHours: (surplusSec / 3600).toFixed(1),
                netBalanceHours: (netBalanceReal / 3600).toFixed(1),

                isSurplus,
                surplusDisplay: fmtSec(surplusSec),
                breakHours: (breakSec / 3600).toFixed(1),
                lateMinutes: Math.floor(lateSec / 60),

                pCompleted,
                pDutyBar1,
                pLeaveBar1,
                pReportBar1,
                pMissing,
                pRemaining,
                pTotal, pNormal, pDuty, pOtApproved, pLeave, pHealthReport, pPotentialOT, // For Bar 2 stacked segments
                normalHours: (realizedSec / 3600).toFixed(1),
                lateCount,

                // OT Breakdown
                otApprovedDisplay: fmtSec(otApprovedSec),
                otPendingDisplay: fmtSec(otPendingSec),
                otPotentialDisplay: fmtSec(otPotentialSec),
                otTotalDisplay: fmtSec(otBreakdownTotal),
                otApprovedHours: (otApprovedSec / 3600).toFixed(1),
                otPendingHours: (otPendingSec / 3600).toFixed(1),
                otPotentialHours: (otPotentialSec / 3600).toFixed(1),
                otTotalHours: (otBreakdownTotal / 3600).toFixed(1),
                otApprovedPct: otBreakdownTotal > 0 ? (otApprovedSec / otBreakdownTotal) * 100 : 0,
                otPendingPct: otBreakdownTotal > 0 ? (otPendingSec / otBreakdownTotal) * 100 : 0,
                otPotentialPct: otBreakdownTotal > 0 ? (otPotentialSec / otBreakdownTotal) * 100 : 0,
                hasOtBreakdown: otBreakdownTotal > 0,

                // Leave & Health Report credits
                leaveHours: (leaveSec / 3600).toFixed(1),
                healthReportHours: (healthReportSec / 3600).toFixed(1),
                creditedHours: (creditedSec / 3600).toFixed(1),
                hasCredited: creditedSec > 0,
                displayTotalHours: (netWorkSec / 3600).toFixed(1),

                // Projected totals (approved + pending + potential)
                projectedWorkHours: ((netWorkSec + otPendingSec + otPotentialSec) / 3600).toFixed(1),
                pProjected: targetSec > 0 ? Math.min(100, ((netWorkSec + otPendingSec + otPotentialSec) / targetSec) * 100) : 0,
                pPending: targetSec > 0 ? Math.min(100 - pTotal, (otPendingSec / targetSec) * 100) : 0,
                pPotential: targetSec > 0 ? Math.min(100 - Math.min(100, ((totalEforSec + otPendingSec) / targetSec) * 100), (otPotentialSec / targetSec) * 100) : 0,

                // Past target (includes duty)
                pastTargetSec: realizedSec + dutySec + missingSec + leaveSec + healthReportSec,
                pastTargetDisplay: fmtSec(realizedSec + dutySec + missingSec + leaveSec + healthReportSec),
                pastTargetHours: ((realizedSec + dutySec + missingSec + leaveSec + healthReportSec) / 3600).toFixed(1),
                adjustedRemainingHours: (Math.max(0, targetSec - realizedSec - dutySec - leaveSec - healthReportSec - missingSec) / 3600).toFixed(1),

                // Indicator position: past_target (including duty+leave+report credits) as % of full month target
                indicatorLeft: targetSec > 0 ? Math.min(100, ((realizedSec + dutySec + missingSec + leaveSec + healthReportSec) / targetSec) * 100) : 0,

                // Net balance vs past_target (total effort including credits vs expected)
                // Net hesaplar: BUGÜNE KADAR hedefe göre (past_target bazlı, gelecek günler HARİÇ)
                // past_target_balance = total_work - past_target (backend'den)
                // past_target_balance > 0 → ilerde, < 0 → geride
                // Net Eksik = OT hariç past bakiye = past_target_balance - overtime
                // OT ile Net = past_target_balance (OT dahil)
                // Potansiyel ile = past_target_balance + potansiyel
                _pastBalanceSec: netBalanceReal, // raw past_target_balance from backend
                _netDeficitSec: netBalanceReal - overtimeSec, // OT hariç: ne kadar geride/ilerde
                _netWithOtSec: netBalanceReal, // OT dahil
                _netWithPotentialSec: netBalanceReal + potentialOtFromBackend, // potansiyel dahil
                netBalanceForLabelDisplay: fmtSec(Math.abs(overtimeSec - missingSec)),
                netBalanceForLabelHours: (Math.abs(overtimeSec - missingSec) / 3600).toFixed(1),
                isNetSurplus: overtimeSec - missingSec > 0,
                isNetNeutral: Math.abs(overtimeSec - missingSec) < 360, // ±0.1 sa threshold

                // Projection
                projectionIfFullDisplay: fmtSec(netWorkSec + remainingSec),
                projectionIfFullHours: ((netWorkSec + remainingSec) / 3600).toFixed(1),

                // Fiscal month from backend (not JS Date)
                fiscalMonth: periodSummary.fiscal_month || getIstanbulMonth(),

                // Projected work display
                projectedWorkDisplay: fmtSec(netWorkSec + otPendingSec + potentialOtFromBackend),

                cumulative: periodSummary.cumulative ? {
                    carryOver: periodSummary.cumulative.carry_over_seconds,
                    carryOverHours: (periodSummary.cumulative.carry_over_seconds / 3600).toFixed(1),
                    carryOverDisplay: fmtSec(periodSummary.cumulative.carry_over_seconds),

                    prevYearBalance: (periodSummary.cumulative.previous_year_balance_seconds / 3600).toFixed(1),
                    prevYearBalanceDisplay: fmtSec(periodSummary.cumulative.previous_year_balance_seconds),

                    // DB-persisted carry-over: respects settlements (mutabakat → 0)
                    prevMonthCarryOver: ((periodSummary.cumulative_balance_seconds || 0) / 3600).toFixed(1),
                    prevMonthCarryOverDisplay: fmtSec(periodSummary.cumulative_balance_seconds || 0),

                    totalNetBalance: (periodSummary.cumulative.total_net_balance_seconds / 3600).toFixed(1),
                    totalNetBalanceDisplay: fmtSec(periodSummary.cumulative.total_net_balance_seconds),

                    // YTD values
                    ytdTargetHours: (periodSummary.cumulative.ytd_target_seconds / 3600).toFixed(1),
                    ytdTargetDisplay: fmtSec(periodSummary.cumulative.ytd_target_seconds),
                    ytdCompletedHours: (periodSummary.cumulative.ytd_completed_seconds / 3600).toFixed(1),
                    ytdCompletedDisplay: fmtSec(periodSummary.cumulative.ytd_completed_seconds),
                    ytdNetBalanceHours: (periodSummary.cumulative.ytd_net_balance_seconds / 3600).toFixed(1),
                    ytdNetBalanceDisplay: fmtSec(periodSummary.cumulative.ytd_net_balance_seconds),

                    ytdTarget: periodSummary.cumulative.ytd_target_seconds,
                    ytdCompleted: periodSummary.cumulative.ytd_completed_seconds,

                    // YTD total work (normal + OT + leave + health report)
                    ytdTotalWork: periodSummary.cumulative.ytd_total_work_seconds || 0,
                    ytdTotalWorkHours: ((periodSummary.cumulative.ytd_total_work_seconds || 0) / 3600).toFixed(1),
                    ytdTotalWorkDisplay: fmtSec(periodSummary.cumulative.ytd_total_work_seconds || 0),

                    // Annual target
                    annualTargetSeconds: periodSummary.cumulative.annual_target_seconds || 0,
                    annualTargetHours: ((periodSummary.cumulative.annual_target_seconds || 0) / 3600).toFixed(1),
                    annualTargetDisplay: fmtSec(periodSummary.cumulative.annual_target_seconds || 0),

                    // Current fiscal month from backend
                    currentFiscalMonth: periodSummary.cumulative.current_fiscal_month || periodSummary.fiscal_month || getIstanbulMonth(),

                    // System start fiscal month (months before this should be hidden)
                    systemStartFiscalMonth: periodSummary.cumulative.system_start_fiscal_month || 1,

                    // PASSING THE DATA form WITH CUMULATIVE CALCULATION
                    // Cari ay: past_target_balance kullan (gerçekleşmemiş kısımlar eksi sayılmaz)
                    // Gelecek aylar: bakiye 0 (henüz gerçekleşmedi)
                    breakdown: (() => {
                        const cfm = periodSummary.cumulative.current_fiscal_month || periodSummary.fiscal_month || getIstanbulMonth();
                        return (periodSummary.cumulative.breakdown || []).reduce((acc, month, idx) => {
                            const prevBalance = idx === 0
                                ? (periodSummary.cumulative.previous_year_balance_seconds || 0)
                                : acc[idx - 1].cumulativeBalanceRaw;

                            // Gelecek ay: 0, Cari ay: past_target_balance (sadece gerçekleşen), Geçmiş ay: tam bakiye
                            let monthBalance;
                            if (month.month > cfm) {
                                monthBalance = 0;
                            } else if (month.month === cfm) {
                                monthBalance = month.past_target_balance ?? month.balance ?? 0;
                            } else {
                                monthBalance = month.balance || 0;
                            }

                            const currentCumulative = prevBalance + (monthBalance - (month.compensated || 0));

                            acc.push({
                                ...month,
                                cumulativeBalanceRaw: currentCumulative,
                                cumulativeBalance: fmtHours(currentCumulative / 3600)
                            });
                            return acc;
                        }, []);
                    })() || [],


                    // Visualization Helper — use annual target for progress (total work, not just normal)
                    progressPercent: (periodSummary.cumulative.annual_target_seconds || 0) > 0
                        ? ((periodSummary.cumulative.ytd_total_work_seconds || periodSummary.cumulative.ytd_completed_seconds || 0) / periodSummary.cumulative.annual_target_seconds) * 100
                        : 0
                } : null,

                annualLeave: {
                    entitlement: periodSummary.annual_leave_entitlement || 0,
                    used: periodSummary.annual_leave_used || 0,
                    limit: periodSummary.annual_leave_limit || 0,
                    remaining: periodSummary.annual_leave_remaining || 0,
                    daysToRenewal: periodSummary.days_to_next_accrual
                }
            };
        }
        return null;
    }, [logs, periodSummary]);

    // Aylık detaylı kırılım: 3 ay göster, ok ile scroll
    const [monthScrollIndex, setMonthScrollIndex] = useState(0);

    const filteredBreakdown = useMemo(() => {
        if (!stats?.cumulative?.breakdown) return [];
        const systemStart = stats.cumulative.systemStartFiscalMonth || 1;
        return stats.cumulative.breakdown.filter(m => m.month >= systemStart);
    }, [stats]);

    useEffect(() => {
        if (filteredBreakdown.length > 0) {
            const currentFM = stats?.cumulative?.currentFiscalMonth || stats?.fiscalMonth;
            const currentIdx = filteredBreakdown.findIndex(m => m.month === currentFM);
            if (currentIdx >= 0) {
                // Cari ayı ortada göster (3'lü pencerede)
                setMonthScrollIndex(Math.max(0, Math.min(currentIdx - 1, filteredBreakdown.length - 3)));
            }
        }
    }, [filteredBreakdown.length]);

    if (!stats) return <div className="p-4 text-center text-slate-400">Veri hesaplanıyor...</div>;

    return (
        <div className="space-y-8">

            {/* ══════ AYLIK MESAİ DURUMU KART ══════ */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-100 border border-slate-200 overflow-hidden">

                {/* ── HEADER ── */}
                <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">Aylık Mesai Durumu</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Normal çalışma ve fazla mesai dökümü</p>
                        </div>
                        {onForceRefresh && (
                            <button
                                onClick={onForceRefresh}
                                title="Aylık özeti yeniden hesapla"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-slate-800 tabular-nums leading-none">{stats.targetDisplay}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">aylık hedef</div>
                    </div>
                </div>

                {/* ── DUAL BAR SECTION ── */}
                <div className="px-6 pt-5 pb-5">
                    {/* Labels row */}
                    <div className="flex justify-between items-baseline mb-2">
                        <span className="text-xs font-bold text-slate-700">Normal Mesai</span>
                        <span className="text-[11px] text-slate-400 tabular-nums">/ {stats.targetDisplay}</span>
                    </div>

                    {/* === BAR AREA (relative wrapper — indicator % doğrudan bar ile hizalı) === */}
                    <div className="relative">
                        {/* Dashed indicator — repeating-linear-gradient ile, tüm bar alanını kapsar */}
                        {parseFloat(stats.targetHours) > 0 && stats.indicatorLeft > 0.5 && stats.indicatorLeft < 99.5 && (
                            <Popover content={<EffortDetailPopover stats={stats} />} trigger="click" placement="bottomLeft" zIndex={1050}>
                                <div
                                    className="absolute z-30 cursor-pointer group"
                                    style={{ left: `calc(${stats.indicatorLeft}% - 6px)`, top: -2, bottom: -2, width: 12 }}
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2">
                                        <svg width="8" height="5" viewBox="0 0 8 5" className="text-indigo-500 group-hover:text-indigo-700 transition-colors"><polygon points="4,5 0,0 8,0" fill="currentColor" /></svg>
                                    </div>
                                    <div
                                        className="absolute left-1/2 -translate-x-1/2 opacity-60 group-hover:opacity-100 transition-opacity"
                                        style={{ top: 6, bottom: 0, width: 2, backgroundImage: 'repeating-linear-gradient(to bottom, #6366f1, #6366f1 4px, transparent 4px, transparent 8px)' }}
                                    />
                                </div>
                            </Popover>
                        )}

                        {/* Bar 1: Normal Mesai — target = 100%, shrink-0 segmentler */}
                        <div className="h-6 w-full bg-slate-100 rounded-md flex overflow-hidden ring-1 ring-slate-200/50">
                            {stats.pCompleted > 0 && <Tooltip title={`Tamamlanan: ${stats.completedDisplay}`}><div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full shrink-0" style={{ width: `${stats.pCompleted}%` }} /></Tooltip>}
                            {(stats.pDutyBar1 || 0) > 0 && <Tooltip title={`Dış Görev: ${stats.dutyDisplay}`}><div className="bg-gradient-to-r from-violet-400 to-violet-500 h-full shrink-0" style={{ width: `${stats.pDutyBar1}%` }} /></Tooltip>}
                            {stats.pLeaveBar1 > 0 && <Tooltip title={`İzin: ${stats.leaveDisplay}`}><div className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-full shrink-0" style={{ width: `${stats.pLeaveBar1}%` }} /></Tooltip>}
                            {stats.pReportBar1 > 0 && <Tooltip title={`Rapor: ${stats.healthReportDisplay}`}><div className="bg-gradient-to-r from-orange-400 to-orange-500 h-full shrink-0" style={{ width: `${stats.pReportBar1}%` }} /></Tooltip>}
                            {stats.pMissing > 0 && <Tooltip title={`Eksik: ${stats.missingDisplay}`}><div className="h-full shrink-0" style={{ width: `${stats.pMissing}%`, background: 'repeating-linear-gradient(45deg, #fecdd3, #fecdd3 2px, #f43f5e 2px, #f43f5e 4px)' }} /></Tooltip>}
                            {stats.pRemaining > 0.1 && <Tooltip title={`Kalan: ${fmtSec(Math.max(0, stats._targetSec - stats._realizedSec - (stats._dutySec||0) - stats._leaveSec - stats._hrSec - stats._missingSec))}`}><div className="bg-slate-200/60 h-full shrink-0" style={{ width: `${stats.pRemaining}%` }} /></Tooltip>}
                        </div>

                        {/* Bar 1 labels */}
                        <div className="flex justify-between mt-1.5 mb-3 text-[10px] font-semibold tabular-nums">
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-indigo-600">{stats.completedDisplay}</span>
                                {parseFloat(stats.dutyHours || 0) > 0 && <span className="text-violet-500">+{stats.dutyDisplay}</span>}
                                {parseFloat(stats.leaveHours) > 0 && <span className="text-cyan-500">+{stats.leaveDisplay}</span>}
                                {parseFloat(stats.healthReportHours) > 0 && <span className="text-orange-500">+{stats.healthReportDisplay}</span>}
                            </div>
                            <div className="flex gap-2">
                                {parseFloat(stats.missingHours) > 0 && <span className="text-rose-500">-{stats.missingDisplay} eksik</span>}
                                {(() => { const k = Math.max(0, stats._targetSec - stats._realizedSec - (stats._dutySec||0) - stats._leaveSec - stats._hrSec - stats._missingSec); return k > 60 ? <span className="text-slate-400">{fmtSec(k)} kalan</span> : null; })()}
                            </div>
                        </div>

                        {/* Bar 2 label */}
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                Toplam Efor
                                <Tooltip title="Normal + OT + İzin + Rapor. Eksik dahil değil."><Info className="w-3 h-3 text-slate-300 cursor-help" /></Tooltip>
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 tabular-nums">{stats.displayTotalDisplay} <span className="text-slate-300">/ {stats.targetDisplay}</span></span>
                        </div>

                        {/* Bar 2: Toplam Efor — AYNI SCALE (target = 100%), shrink-0 */}
                        {/* Taşma: bar target'ta kesilir, sağ uçta yeşil ++ gösterilir */}
                        {(() => {
                            const sc = stats._targetSec || 1;
                            const pct = (v) => (v / sc) * 100;
                            const totalSec = stats._realizedSec + (stats._dutySec||0) + stats._leaveSec + stats._hrSec + stats._overtimeSec;
                            const potSec = stats._potentialOtSec || 0;
                            const gapSec = Math.max(0, sc - totalSec - potSec);
                            const overflowSec = Math.max(0, totalSec - sc);
                            return (
                                <div className="relative">
                                    <div className="h-6 w-full bg-slate-100 rounded-md flex overflow-hidden ring-1 ring-slate-200/50">
                                        {stats._realizedSec > 0 && <Tooltip title={`Normal: ${stats.completedDisplay}`}><div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full shrink-0" style={{ width: `${pct(stats._realizedSec)}%` }} /></Tooltip>}
                                        {(stats._dutySec||0) > 0 && <Tooltip title={`Dış Görev: ${stats.dutyDisplay}`}><div className="bg-gradient-to-r from-violet-400 to-violet-500 h-full shrink-0" style={{ width: `${pct(stats._dutySec)}%` }} /></Tooltip>}
                                        {stats._leaveSec > 0 && <Tooltip title={`İzin: ${stats.leaveDisplay}`}><div className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-full shrink-0" style={{ width: `${pct(stats._leaveSec)}%` }} /></Tooltip>}
                                        {stats._hrSec > 0 && <Tooltip title={`Rapor: ${stats.healthReportDisplay}`}><div className="bg-gradient-to-r from-orange-400 to-orange-500 h-full shrink-0" style={{ width: `${pct(stats._hrSec)}%` }} /></Tooltip>}
                                        {stats._overtimeSec > 0 && <Tooltip title={`Onaylı OT: ${stats.overtimeDisplay}`}><div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full shrink-0" style={{ width: `${pct(stats._overtimeSec)}%` }} /></Tooltip>}
                                        {potSec > 0 && <Tooltip title={`Potansiyel: ${stats.potentialOtDisplay || fmtSec(potSec)}`}><div className="h-full shrink-0 opacity-50" style={{ width: `${pct(potSec)}%`, background: 'repeating-linear-gradient(-45deg, #d1d5db, #d1d5db 2px, #9ca3af 2px, #9ca3af 4px)' }} /></Tooltip>}
                                        {gapSec > 0 && <Tooltip title={`Hedefe kalan: ${fmtSec(gapSec)}`}><div className="h-full flex-1" style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 4px, #e5e7eb 4px, #e5e7eb 5px)' }} /></Tooltip>}
                                    </div>
                                    {/* Taşma: sağ uçta yeşil ++ badge */}
                                    {overflowSec > 0 && (
                                        <Tooltip title={`Hedef ${fmtSec(overflowSec)} aşıldı`}>
                                            <div className="absolute right-0 top-0 h-6 flex items-center -mr-1">
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-300 rounded-r-md pl-1 pr-1.5 py-0.5 leading-none shadow-sm">++</span>
                                            </div>
                                        </Tooltip>
                                    )}
                                </div>
                            );
                        })()}
                        {/* Bar 2 labels */}
                        <div className="flex justify-between mt-1.5 text-[10px] font-semibold tabular-nums">
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-indigo-600">{stats.completedDisplay}</span>
                                {parseFloat(stats.dutyHours || 0) > 0 && <span className="text-violet-500">+{stats.dutyDisplay}</span>}
                                {parseFloat(stats.leaveHours) > 0 && <span className="text-cyan-500">+{stats.leaveDisplay}</span>}
                                {parseFloat(stats.healthReportHours) > 0 && <span className="text-orange-500">+{stats.healthReportDisplay}</span>}
                                {parseFloat(stats.overtimeHours) > 0 && <span className="text-emerald-500">+{stats.overtimeDisplay}</span>}
                                {(stats._potentialOtSec || 0) > 0 && <span className="text-slate-400">+{stats.potentialOtDisplay || fmtSec(stats._potentialOtSec)} pot.</span>}
                            </div>
                        </div>
                    </div>{/* end relative bar area */}

                    {/* Bugüne kadar net durum — past_target bazlı (gelecek günler HARİÇ) */}
                    {(() => {
                        // past_target_balance: pozitif = ilerde, negatif = geride
                        const bal = stats._pastBalanceSec ?? 0;
                        const isOk = bal >= 0;
                        return (
                            <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-bold ${isOk ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' : 'bg-rose-50/50 border-rose-100 text-rose-700'}`}>
                                {isOk ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                                <span>Bugüne kadar: {isOk ? '+' : '-'}{fmtSec(Math.abs(bal))} {isOk ? 'ilerde' : 'geride'}</span>
                                <span className="text-slate-400 font-medium ml-auto text-[10px]">OT dahil, bugüne kadar hedefe göre</span>
                            </div>
                        );
                    })()}
                </div>

                {/* ── NET DURUM ── */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/50">
                    {[
                        { label: 'OT Hariç', sec: stats._netDeficitSec, tip: 'Bugüne kadar hedef vs normal çalışma (OT hariç)' },
                        { label: 'OT Dahil', sec: stats._netWithOtSec, tip: 'Bugüne kadar hedef vs toplam efor (OT dahil)' },
                        { label: 'Potansiyel ile', sec: stats._netWithPotentialSec, tip: 'Potansiyel OT de eklenince' },
                    ].map((c) => {
                        const v = c.sec ?? 0;
                        const ok = v >= 0; // pozitif = ilerde (past_target_balance bazlı)
                        return (
                            <Tooltip key={c.label} title={c.tip}>
                                <div className="px-4 py-3 text-center cursor-help hover:bg-white/60 transition-colors">
                                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{c.label}</div>
                                    <div className={`text-base font-black tabular-nums ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {Math.abs(v) < 60 ? '0' : `${ok ? '+' : '-'}${fmtSec(Math.abs(v))}`}
                                    </div>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* ── OT BREAKDOWN ── */}
                <div className="px-6 py-5 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-700">Fazla Mesai Dağılımı</span>
                        {stats.hasOtBreakdown && <span className="text-[10px] font-bold text-slate-400 tabular-nums">Toplam: {stats.otTotalDisplay}</span>}
                    </div>
                    {stats.hasOtBreakdown ? (
                        <>
                            <div className="h-5 w-full bg-slate-100 rounded-md flex overflow-hidden ring-1 ring-slate-200/50">
                                {stats.otApprovedPct > 0 && <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full" style={{ width: `${stats.otApprovedPct}%` }} />}
                                {stats.otPendingPct > 0 && <div className="h-full" style={{ width: `${stats.otPendingPct}%`, background: 'repeating-linear-gradient(45deg, #fde68a, #fde68a 2px, #d97706 2px, #d97706 4px)' }} />}
                                {stats.otPotentialPct > 0 && <div className="h-full" style={{ width: `${stats.otPotentialPct}%`, background: 'repeating-linear-gradient(-45deg, #e2e8f0, #e2e8f0 2px, #64748b 2px, #64748b 4px)' }} />}
                            </div>
                            <div className="flex justify-between text-[10px] font-semibold mt-1.5">
                                <span className="text-emerald-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{stats.otApprovedDisplay} onaylı</span>
                                <span className="text-amber-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{stats.otPendingDisplay} bekleyen</span>
                                <span className="text-slate-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>{stats.otPotentialDisplay} potansiyel</span>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-3 text-xs text-slate-400 bg-slate-50 rounded-lg">Bu dönem fazla mesai kaydı yok</div>
                    )}
                </div>
            </div>

            {/* 3. Cumulative / YTD Bar */}
            {stats.cumulative && (
                <div>
                    {/* 3. YILLIK KÜMÜLATİF PERFORMANS DASHBOARD */}
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200 border border-slate-200 p-8 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                                    {getIstanbulYear()} Yıllık Performans
                                </h3>
                                <p className="text-xs text-slate-400 font-medium pl-3.5 mt-1">Yılbaşından bugüne kümülatif durum.</p>
                            </div>
                        </div>

                        {/* Top Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 relative z-10">
                            {/* 1. Devreden (Carry Over) -> Modified to "Previous Month" context */}
                            <div className={`p-5 rounded-2xl border ${parseFloat(stats.cumulative.prevMonthCarryOver) < 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-emerald-50/50 border-emerald-100'} hover:shadow-lg transition-shadow duration-300`}>
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">BİR ÖNCEKİ AYDAN DEVREDEN</div>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-2xl font-black tracking-tighter ${parseFloat(stats.cumulative.prevMonthCarryOver) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {parseFloat(stats.cumulative.prevMonthCarryOver) < 0 ? '' : '+'}{fmtHours(stats.cumulative.prevMonthCarryOver)}
                                    </span>
                                </div>
                            </div>

                            {/* 2. Annual Target (Full Year) */}
                            <div className="p-5 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-shadow duration-300 shadow-sm">
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">YILLIK HEDEF</div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-700 tracking-tighter">{stats.cumulative.annualTargetDisplay}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Bugüne kadar hedef: <span className="font-bold text-slate-600">{stats.cumulative.ytdTargetDisplay}</span></p>
                            </div>

                            {/* 3. YTD Total Work (Normal + OT + Leave + Health Report) */}
                            <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 hover:shadow-lg transition-shadow duration-300 group">
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">YILLIK GERÇEKLEŞEN</div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-indigo-600 tracking-tighter group-hover:scale-105 transition-transform">{stats.cumulative.ytdTotalWorkDisplay}</span>
                                </div>
                                <div className="w-full bg-indigo-100 rounded-full h-1.5 mt-3 overflow-hidden">
                                    <div className="bg-indigo-500 h-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min(100, stats.cumulative.progressPercent)}%` }}></div>
                                </div>
                            </div>

                            {/* 4. YTD Net Balance (Big Result) */}
                            <div className={`p-5 rounded-2xl border ${parseFloat(stats.cumulative.totalNetBalance) >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500 text-white shadow-emerald-500/20 shadow-xl' : 'bg-gradient-to-br from-rose-500 to-red-600 border-rose-500 text-white shadow-rose-500/20 shadow-xl'} flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
                                <div className="absolute top-0 right-0 p-4 opacity-20 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                    <Scale size={64} />
                                </div>
                                <div className="text-[10px] uppercase font-bold text-white/80 mb-2 tracking-widest relative z-10">TOPLAM BAKİYE</div>
                                <div className="flex items-baseline gap-1 relative z-10">
                                    <span className="text-3xl font-black tracking-tighter">
                                        {parseFloat(stats.cumulative.totalNetBalance) > 0 ? '+' : ''}{fmtHours(stats.cumulative.totalNetBalance)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Monthly Breakdown (Chart + Table) */}
                        {stats.cumulative.breakdown && stats.cumulative.breakdown.length > 0 ? (
                            <div className="relative z-10">

                                {/* A. Chart (Tube) */}
                                <div className="mb-8">
                                    <div className="flex flex-wrap justify-between items-end gap-y-1 mb-3 px-1">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest shrink-0 mr-4">AYLIK PUANTAJ GRAFİĞİ</span>
                                        <div className="flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wide">
                                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block"></span><span className="text-slate-500">Normal</span></span>
                                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block"></span><span className="text-slate-500">İzin</span></span>
                                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block"></span><span className="text-slate-500">Onaylı</span></span>
                                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'repeating-linear-gradient(45deg, #fef3c7, #fef3c7 1px, #f59e0b 1px, #f59e0b 2px)' }}></span><span className="text-slate-500">Bekleyen</span></span>
                                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'repeating-linear-gradient(-45deg, #e2e8f0, #e2e8f0 1px, #94a3b8 1px, #94a3b8 2px)' }}></span><span className="text-slate-500">Potansiyel</span></span>
                                            <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-dashed border-slate-400 inline-block"></span><span className="text-slate-500">Hedef</span></span>
                                        </div>
                                    </div>

                                    {(() => {
                                        const currentFiscalIdx = (stats.cumulative.currentFiscalMonth || stats.fiscalMonth || getIstanbulMonth()) - 1;
                                        const systemStartIdx = (stats.cumulative.systemStartFiscalMonth || 1) - 1;
                                        // Only show months from system start to current fiscal month
                                        const visibleMonths = stats.cumulative.breakdown.slice(systemStartIdx);
                                        // Global max for consistent Y-axis scaling across all months
                                        const globalMax = visibleMonths.reduce((mx, m) => {
                                            const otA = m.ot_approved || 0, otP = m.ot_pending || 0;
                                            let otPot = m.ot_potential || 0;
                                            if (!otA && !otP && !otPot && m.overtime > 0) otPot = m.overtime;
                                            const lvSec = (m.leave_seconds || 0) + (m.health_report_seconds || 0);
                                            return Math.max(mx, Math.max(m.target || 0, (m.completed || 0) + lvSec + otA + otP + otPot));
                                        }, 1);
                                        return (
                                    <div className="flex w-full h-32 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50/50 shadow-inner items-end">
                                        {visibleMonths.map((m, idx) => {
                                            const currentFiscalMonth = currentFiscalIdx + 1;
                                            const isCurrentMonth = m.month === currentFiscalMonth;
                                            const isPast = m.month < currentFiscalMonth;

                                            const target = m.target;
                                            const completed = m.completed;
                                            // Cari ay: past_target_balance kullan (gerçekleşmemiş kısımlar eksi sayılmaz)
                                            const balance = isCurrentMonth ? (m.past_target_balance ?? m.balance) : m.balance;

                                            // OT Breakdown (from OvertimeRequest aggregation)
                                            const otApprovedSec = m.ot_approved || 0;
                                            const otPendingSec = m.ot_pending || 0;
                                            let otPotentialSec = m.ot_potential || 0;
                                            if (otApprovedSec + otPendingSec + otPotentialSec === 0 && m.overtime > 0) {
                                                otPotentialSec = m.overtime;
                                            }
                                            const otTotalSec = otApprovedSec + otPendingSec + otPotentialSec;

                                            // Leave/Health Report credited seconds
                                            const leaveCreditSec = (m.leave_seconds || 0) + (m.health_report_seconds || 0);

                                            // Bar percentages using global scale for cross-month comparison
                                            const totalForBar = globalMax;
                                            let pctNormal = 0;
                                            let pctLeave = 0;
                                            let pctMissing = 0;
                                            let pctOtApproved = 0;
                                            let pctOtPending = 0;
                                            let pctOtPotential = 0;

                                            if (target > 0) {
                                                pctNormal = (Math.min(completed, target) / totalForBar) * 100;
                                                pctLeave = (leaveCreditSec / totalForBar) * 100;
                                                pctMissing = completed < target ? ((target - completed) / totalForBar) * 100 : 0;
                                                if (otTotalSec > 0) {
                                                    pctOtApproved = (otApprovedSec / totalForBar) * 100;
                                                    pctOtPending = (otPendingSec / totalForBar) * 100;
                                                    pctOtPotential = (otPotentialSec / totalForBar) * 100;
                                                }
                                            } else if (completed > 0) {
                                                pctNormal = 80;
                                                pctOtApproved = 20;
                                            }

                                            // Colors
                                            const isFuture = !isPast && !isCurrentMonth;
                                            let containerBg = 'bg-transparent';
                                            if (isFuture) containerBg = 'bg-slate-100/60';
                                            else if (completed >= target && target > 0) containerBg = 'bg-emerald-50/30';

                                            const balanceDisplay = fmtSec(Math.abs(balance));
                                            // Cumulative from reduced breakdown
                                            const cumulativeBalanceSec = m.cumulativeBalanceRaw || 0;
                                            const cumulativeDisplay = fmtSec(Math.abs(cumulativeBalanceSec));
                                            const isCumulativePos = (m.cumulativeBalanceRaw || 0) >= 0;

                                            const canClick = !isFuture && onMonthSelect;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex-1 h-full ${containerBg} border-r border-slate-200/50 last:border-r-0 relative group transition-all duration-300 hover:bg-white hover:shadow-xl hover:z-20 hover:-translate-y-1 ${canClick ? 'cursor-pointer' : ''}`}
                                                    onClick={canClick ? () => onMonthSelect(getIstanbulYear(), m.month) : undefined}
                                                >
                                                    {/* Normal Work Bar (Indigo) — sadece gecmis + mevcut */}
                                                    {(isPast || isCurrentMonth) && (
                                                        <div className="absolute bottom-0 left-0 w-full bg-indigo-500 transition-all duration-1000 group-hover:bg-indigo-600"
                                                            style={{ height: `${pctNormal}%` }} />
                                                    )}

                                                    {/* Leave/Report Credit Bar (Cyan) — sadece gecmis + mevcut */}
                                                    {(isPast || isCurrentMonth) && pctLeave > 0 && (
                                                        <div className="absolute left-0 w-full bg-cyan-400 transition-all duration-1000 group-hover:bg-cyan-500"
                                                            style={{ bottom: `${pctNormal}%`, height: `${pctLeave}%` }} />
                                                    )}

                                                    {/* OT Approved (Emerald) — sadece gecmis + mevcut */}
                                                    {(isPast || isCurrentMonth) && pctOtApproved > 0 && (
                                                        <div className="absolute left-0 w-full bg-emerald-400 transition-all duration-1000 group-hover:bg-emerald-500"
                                                            style={{ bottom: `${pctNormal + pctLeave}%`, height: `${pctOtApproved}%` }} />
                                                    )}

                                                    {/* OT Pending (Amber striped) — sadece gecmis + mevcut */}
                                                    {(isPast || isCurrentMonth) && pctOtPending > 0 && (
                                                        <div className="absolute left-0 w-full transition-all duration-1000"
                                                            style={{ bottom: `${pctNormal + pctLeave + pctOtApproved}%`, height: `${pctOtPending}%`, background: 'repeating-linear-gradient(45deg, #fef3c7, #fef3c7 2px, #f59e0b 2px, #f59e0b 4px)' }} />
                                                    )}

                                                    {/* OT Potential (Gray striped) — sadece gecmis + mevcut */}
                                                    {(isPast || isCurrentMonth) && pctOtPotential > 0 && (
                                                        <div className="absolute left-0 w-full transition-all duration-1000"
                                                            style={{ bottom: `${pctNormal + pctLeave + pctOtApproved + pctOtPending}%`, height: `${pctOtPotential}%`, background: 'repeating-linear-gradient(-45deg, #e2e8f0, #e2e8f0 2px, #94a3b8 2px, #94a3b8 4px)' }} />
                                                    )}

                                                    {/* Target dashed reference line */}
                                                    {target > 0 && (
                                                        <div className="absolute left-0 w-full z-20 pointer-events-none" style={{ bottom: `${(target / totalForBar) * 100}%` }}>
                                                            <div className="w-full border-t-2 border-dashed border-slate-400/60" />
                                                        </div>
                                                    )}

                                                    {/* Missing Bar (Rose Striped) - Only for Past/Current */}
                                                    {(isPast || isCurrentMonth) && pctMissing > 0 && (
                                                        <div className="absolute left-0 w-full bg-rose-400/20 transition-all duration-1000"
                                                            style={{
                                                                bottom: `${pctNormal + pctLeave + pctOtApproved + pctOtPending + pctOtPotential}%`,
                                                                height: `${pctMissing}%`,
                                                                backgroundImage: 'linear-gradient(45deg, rgba(244, 63, 94, 0.1) 25%, transparent 25%, transparent 50%, rgba(244, 63, 94, 0.1) 50%, rgba(244, 63, 94, 0.1) 75%, transparent 75%, transparent)',
                                                                backgroundSize: '4px 4px'
                                                            }} />
                                                    )}

                                                    {/* Label Inside */}
                                                    <div className="absolute inset-0 flex flex-col items-center justify-end z-10 pointer-events-none p-1 pb-1">
                                                        <span className={`text-[10px] font-bold mb-0.5 ${isFuture ? 'text-slate-300' : 'text-slate-500/80'} mix-blend-multiply`}>
                                                            {['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][m.month - 1]}
                                                        </span>

                                                        {isPast ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-emerald-500 text-xs font-black leading-none">&#10003;</span>
                                                                <span className={`text-[9px] font-black drop-shadow-sm leading-tight ${balance >= 0 ? 'text-white' : 'text-rose-600/90'}`}>
                                                                    {balance > 0 ? `+${balanceDisplay}` : balance < 0 ? `-${balanceDisplay}` : '0'}
                                                                </span>
                                                            </div>
                                                        ) : isCurrentMonth ? (
                                                            <div className="flex flex-col items-center mt-0.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mb-0.5"></div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] text-slate-300 font-medium">&mdash;</span>
                                                        )}
                                                    </div>

                                                    {/* Tooltip */}
                                                    {isFuture ? (
                                                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-slate-700/90 backdrop-blur-md text-white text-[10px] rounded-lg py-2 px-3 pointer-events-none shadow-xl z-50 whitespace-nowrap">
                                                            <span className="font-medium">Henüz veri yok</span>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-700/90"></div>
                                                        </div>
                                                    ) : (
                                                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-60 bg-slate-900/95 backdrop-blur-md text-white text-[10px] rounded-xl py-4 px-5 pointer-events-none shadow-2xl ring-1 ring-white/10 transform origin-bottom scale-95 group-hover:scale-100 z-50">
                                                            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3">
                                                                <span className="font-bold text-sm text-white">{m.month}. Ay {isCurrentMonth ? '(Güncel)' : ''}</span>
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${balance >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                                    {balance >= 0 ? 'FAZLA' : 'EKSİK'}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between">
                                                                    <span className="text-slate-400">Hedef:</span>
                                                                    <span className="font-mono text-slate-200">{fmtSec(target)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-slate-400">Normal Çalışma:</span>
                                                                    <span className="font-mono font-bold text-indigo-400">{fmtSec(completed)}</span>
                                                                </div>
                                                                {(m.leave_seconds || 0) > 0 && (
                                                                    <div className="flex justify-between">
                                                                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span><span className="text-cyan-400">İzin:</span></span>
                                                                        <span className="font-mono font-bold text-cyan-300">{fmtSec(m.leave_seconds || 0)}</span>
                                                                    </div>
                                                                )}
                                                                {(m.health_report_seconds || 0) > 0 && (
                                                                    <div className="flex justify-between">
                                                                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block"></span><span className="text-sky-400">Rapor:</span></span>
                                                                        <span className="font-mono font-bold text-sky-300">{fmtSec(m.health_report_seconds || 0)}</span>
                                                                    </div>
                                                                )}
                                                                {(otApprovedSec > 0 || otPendingSec > 0 || otPotentialSec > 0) && (
                                                                    <div className="space-y-1.5 pt-1">
                                                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Ek Mesai Detayı</div>
                                                                        {otApprovedSec > 0 && (
                                                                            <div className="flex justify-between">
                                                                                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span><span className="text-emerald-400">Onaylı:</span></span>
                                                                                <span className="font-mono font-bold text-emerald-300">{fmtSec(otApprovedSec)}</span>
                                                                            </div>
                                                                        )}
                                                                        {otPendingSec > 0 && (
                                                                            <div className="flex justify-between">
                                                                                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span><span className="text-amber-400">Bekleyen:</span></span>
                                                                                <span className="font-mono font-bold text-amber-300">{fmtSec(otPendingSec)}</span>
                                                                            </div>
                                                                        )}
                                                                        {otPotentialSec > 0 && (
                                                                            <div className="flex justify-between">
                                                                                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span><span className="text-slate-400">Potansiyel:</span></span>
                                                                                <span className="font-mono font-bold text-slate-300">{fmtSec(otPotentialSec)}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between pt-2 border-t border-white/10 mt-2">
                                                                    <span className="text-white font-bold">Toplam Efor:</span>
                                                                    <span className="font-mono font-black text-white">{fmtSec(m.total_work || 0)}</span>
                                                                </div>
                                                                <div className="flex justify-between pt-1">
                                                                    <span className={balance >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>Net Fark:</span>
                                                                    <span className={`font-mono font-black text-lg ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {balance > 0 ? '+' : balance < 0 ? '-' : ''}{balanceDisplay}
                                                                    </span>
                                                                </div>

                                                                {/* Cumulative Balance Section in Tooltip */}
                                                                {(isPast || isCurrentMonth) && (
                                                                    <div className="flex justify-between pt-2 mt-2 border-t border-white/5 bg-white/5 -mx-5 px-5 py-2 -mb-4 rounded-b-xl">
                                                                        <span className="text-slate-300 font-bold">Kümülatif Bakiye:</span>
                                                                        <span className={`font-mono font-black ${isCumulativePos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                            {isCumulativePos ? '+' : '-'}{cumulativeDisplay}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-slate-900/95"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                        );
                                    })()}
                                </div>

                                {/* B. Table (Detail) — 3 ay göster, ok ile scroll */}
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                        <div className="w-4 h-[1px] bg-slate-200"></div>
                                        AYLIK DETAYLI KIRILIM
                                        <div className="flex-1 h-[1px] bg-slate-200"></div>
                                        <span className="text-[9px] font-medium text-slate-300 normal-case tracking-normal">
                                            {monthScrollIndex + 1}-{Math.min(monthScrollIndex + 3, filteredBreakdown.length)} / {filteredBreakdown.length}
                                        </span>
                                    </h4>

                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                        {/* Yukarı ok */}
                                        {monthScrollIndex > 0 && (
                                            <button
                                                onClick={() => setMonthScrollIndex(prev => Math.max(0, prev - 1))}
                                                className="w-full flex items-center justify-center py-1.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 transition-colors group"
                                            >
                                                <ChevronUp size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                                            </button>
                                        )}
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                                    <th className="px-6 py-4">Ay</th>
                                                    <th className="px-4 py-4 text-center">Hedef</th>
                                                    <th className="px-4 py-4 text-center">Toplam Efor</th>
                                                    <th className="px-4 py-4 text-center text-rose-500">Eksik</th>
                                                    <th className="px-4 py-4 text-center text-emerald-500">Ek Mesai <span className="text-[8px] text-slate-400 font-normal">(O/B/P)</span></th>
                                                    <th className="px-4 py-4 text-right">Net Fark</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredBreakdown
                                                    .slice(monthScrollIndex, monthScrollIndex + 3)
                                                    .map((m) => {
                                                        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
                                                        const currentFiscalMonth = stats.cumulative.currentFiscalMonth || stats.fiscalMonth || getIstanbulMonth();
                                                        const isPast = m.month < currentFiscalMonth;
                                                        const isCurrent = m.month === currentFiscalMonth;
                                                        const isFuture = m.month > currentFiscalMonth;

                                                        const targetH = fmtSec(m.target);
                                                        const totalWorkH = fmtSec(m.total_work || 0);
                                                        const missingH = fmtSec(m.missing);
                                                        const missingRaw = (m.missing || 0) / 3600;
                                                        // Net Fark: cari ay→past_target_balance (hedefe kadar), geçmiş→tam bakiye
                                                        const currentFM = stats.cumulative?.currentFiscalMonth || stats.fiscalMonth || getIstanbulMonth();
                                                        const monthNetSec = m.month === currentFM
                                                            ? (m.past_target_balance ?? m.balance ?? 0)
                                                            : (m.balance ?? 0);
                                                        const monthNetH = fmtSec(Math.abs(monthNetSec));
                                                        const isMonthNetPositive = monthNetSec >= 0;

                                                        const canClickRow = !isFuture && onMonthSelect;
                                                        return (
                                                            <tr key={m.month} className={`transition-colors group ${isFuture ? 'opacity-40' : ''} ${isCurrent ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'} ${canClickRow ? 'cursor-pointer hover:bg-indigo-50/30' : ''}`}
                                                                onClick={canClickRow ? () => onMonthSelect(getIstanbulYear(), m.month) : undefined}>
                                                                <td className="px-6 py-4 font-bold text-slate-700 flex items-center gap-2">
                                                                    {isPast ? (
                                                                        <span className="text-emerald-500 text-sm">&#10003;</span>
                                                                    ) : isCurrent ? (
                                                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                                                    ) : (
                                                                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                                                    )}
                                                                    <span className={isFuture ? 'text-slate-400' : ''}>{monthNames[m.month - 1]}</span>
                                                                </td>
                                                                <td className="px-4 py-4 text-center font-mono text-slate-500 text-[11px]">{targetH}</td>
                                                                <td className="px-4 py-4 text-center font-mono font-bold text-slate-700 text-[11px]">
                                                                    {isFuture ? <span className="text-slate-300">&mdash;</span> : <>{totalWorkH}</>}
                                                                </td>
                                                                <td className="px-4 py-4 text-center font-mono font-medium text-rose-500 text-[11px]">
                                                                    {isFuture ? <span className="text-slate-300">&mdash;</span> : (missingRaw > 0 ? `-${missingH}` : '-')}
                                                                </td>
                                                                <td className="px-4 py-4 text-center">
                                                                    {isFuture ? (
                                                                        <span className="text-slate-300">&mdash;</span>
                                                                    ) : (
                                                                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold">
                                                                            <span className="text-emerald-600">{fmtSec(m.ot_approved || 0)}</span>
                                                                            <span className="text-slate-300">/</span>
                                                                            <span className="text-amber-600">{fmtSec(m.ot_pending || 0)}</span>
                                                                            <span className="text-slate-300">/</span>
                                                                            <span className="text-slate-500">{fmtSec(m.ot_potential || 0)}</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-4 text-right">
                                                                    {isFuture ? (
                                                                        <span className="text-slate-300 text-xs">&mdash;</span>
                                                                    ) : (
                                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black tracking-tight ${isMonthNetPositive ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'}`}>
                                                                            {isMonthNetPositive && monthNetSec > 0 ? '+' : monthNetSec < 0 ? '-' : ''}{monthNetH}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                        {/* Aşağı ok */}
                                        {monthScrollIndex < filteredBreakdown.length - 3 && (
                                            <button
                                                onClick={() => setMonthScrollIndex(prev => Math.min(filteredBreakdown.length - 3, prev + 1))}
                                                className="w-full flex items-center justify-center py-1.5 bg-slate-50 hover:bg-slate-100 border-t border-slate-200 transition-colors group"
                                            >
                                                <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 text-center text-xs text-slate-400 py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                <div className="mb-3 opacity-50"><Briefcase size={32} className="mx-auto text-slate-300" /></div>
                                Henüz yıllık veri oluşmadı.
                            </div>
                        )}
                    </div>
                </div>
            )}


        </div>
    );
};

export default MonthlyPerformanceSummary;
