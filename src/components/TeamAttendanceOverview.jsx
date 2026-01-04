import React from 'react';
import { User, Clock, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const TeamAttendanceOverview = ({ teamData, onMemberClick }) => {
    // teamData = [{ id, name, status: 'IN'/'OUT', lastActionTime, totalTodayMinutes, avatar? }]

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Ekip Özeti</h3>
                <span className="text-xs font-medium text-slate-500">{teamData.length} Kişi</span>
            </div>
            <div className="divide-y divide-slate-100">
                {teamData.map((member) => (
                    <div
                        key={member.id}
                        onClick={() => onMemberClick(member.id)}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                                member.status === 'IN' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                            )}>
                                {member.avatar || <User size={18} />}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                                    {member.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className={clsx(
                                        "w-2 h-2 rounded-full",
                                        member.status === 'IN' ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                                    )}></span>
                                    {member.status === 'IN' ? 'İçeride' : 'Dışarıda'}
                                    {member.lastActionTime && ` • ${member.lastActionTime}`}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex gap-6 items-center">
                                <div className="text-right min-w-[80px]">
                                    <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Bugün</p>
                                    <p className="text-sm font-bold text-slate-800 font-mono">
                                        {Math.floor(member.totalTodayMinutes / 60)}s {member.totalTodayMinutes % 60}dk
                                    </p>
                                </div>
                                <div className="text-right hidden md:block min-w-[80px]">
                                    <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Bu Ay</p>
                                    <p className="text-sm font-bold text-blue-600 font-mono">
                                        {member.monthWorkedHours || 0} Sa
                                    </p>
                                </div>
                                <div className="text-right hidden md:block min-w-[80px]">
                                    <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Onaylı FM</p>
                                    <p className="text-sm font-bold text-emerald-600 font-mono">
                                        {member.monthApprovedDTO || 0} dk
                                    </p>
                                </div>
                                {parseInt(member.monthPendingDTO) > 0 && (
                                    <div className="text-right hidden md:block min-w-[80px]">
                                        <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Bekleyen</p>
                                        <p className="text-sm font-bold text-orange-500 font-mono">
                                            {member.monthPendingDTO} dk
                                        </p>
                                    </div>
                                )}
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                    </div>
                ))}
                {teamData.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        Ekip üyesi bulunamadı.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamAttendanceOverview;
