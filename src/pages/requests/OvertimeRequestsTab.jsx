import { useState } from 'react';
import { Clock, CalendarPlus, ArrowDownLeft, BarChart3, Info } from 'lucide-react';
import { Tooltip } from 'antd';
import { useAuth } from '../../context/AuthContext';
import OvertimeCalendarView from '../../components/overtime/OvertimeCalendarView';
import OTAssignmentCreator from '../../components/overtime/OTAssignmentCreator';
import IncomingRequestsTab from './IncomingRequestsTab';
import TeamOvertimeAnalytics from '../../components/TeamOvertimeAnalytics';

const SubTabButton = ({ active, onClick, children, icon, badge }) => (
  <button
    onClick={onClick}
    className={`relative px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 outline-none
      ${active
        ? 'bg-violet-50 text-violet-700 shadow-sm border border-violet-200'
        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
      }`}
  >
    {icon && <span className={active ? 'text-violet-500' : 'text-slate-400'}>{icon}</span>}
    {children}
    {badge > 0 && (
      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold
        ${active ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
        {badge}
      </span>
    )}
  </button>
);

export default function OvertimeRequestsTab({ onDataChange, refreshTrigger, primaryCount = 0, secondaryCount = 0 }) {
  const { hasPermission } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('my_requests');
  const hasAnyTeam = primaryCount > 0 || secondaryCount > 0;
  const isManager = hasAnyTeam || hasPermission('APPROVAL_OVERTIME');

  // Normal çalışan — mevcut görünüm
  if (!isManager) {
    return <OvertimeCalendarView mode="personal" />;
  }

  // Yönetici — 4 alt sekme
  return (
    <div className="space-y-6">
      {/* Alt sekme navigasyonu */}
      <div className="flex gap-2 flex-wrap">
        <SubTabButton
          active={activeSubTab === 'my_requests'}
          onClick={() => setActiveSubTab('my_requests')}
          icon={<Clock size={16} />}
        >
          Taleplerim
          <Tooltip title="Kendi ek mesai taleplerinizi görüntüleyin, yeni talep oluşturun veya potansiyel mesaileri talep edin.">
            <Info size={13} className="text-slate-400 cursor-help" />
          </Tooltip>
        </SubTabButton>
        {hasAnyTeam && (
          <SubTabButton
            active={activeSubTab === 'assign'}
            onClick={() => setActiveSubTab('assign')}
            icon={<CalendarPlus size={16} />}
          >
            Mesai Ata
            <Tooltip title="Ekibinizdeki çalışanlara ek mesai atayın. Takvimden tarih seçerek toplu atama yapabilirsiniz.">
              <Info size={13} className="text-slate-400 cursor-help" />
            </Tooltip>
          </SubTabButton>
        )}
        {hasAnyTeam && (
          <SubTabButton
            active={activeSubTab === 'incoming'}
            onClick={() => setActiveSubTab('incoming')}
            icon={<ArrowDownLeft size={16} />}
          >
            Gelen Talepler
            <Tooltip title="Ekibinizden gelen ek mesai taleplerini inceleyin, onaylayın veya reddedin.">
              <Info size={13} className="text-slate-400 cursor-help" />
            </Tooltip>
          </SubTabButton>
        )}
        <SubTabButton
          active={activeSubTab === 'analytics'}
          onClick={() => setActiveSubTab('analytics')}
          icon={<BarChart3 size={16} />}
        >
          Analiz
          <Tooltip title="Ekibinizin ek mesai istatistiklerini ve performans göstergelerini inceleyin.">
            <Info size={13} className="text-slate-400 cursor-help" />
          </Tooltip>
        </SubTabButton>
      </div>

      {/* İçerik */}
      {activeSubTab === 'my_requests' && (
        <OvertimeCalendarView mode="personal" />
      )}

      {activeSubTab === 'assign' && (
        <OTAssignmentCreator onAssignmentCreated={onDataChange} />
      )}

      {activeSubTab === 'incoming' && (
        <IncomingRequestsTab
          filterType="overtime"
          refreshTrigger={refreshTrigger}
        />
      )}

      {activeSubTab === 'analytics' && (
        <TeamOvertimeAnalytics />
      )}
    </div>
  );
}
