import { useState, useEffect } from 'react';
import { Clock, CalendarPlus, ArrowDownLeft, BarChart3 } from 'lucide-react';
import api from '../../services/api';
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

export default function OvertimeRequestsTab({ onDataChange, refreshTrigger }) {
  const { hasPermission } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('my_requests');
  const [subordinates, setSubordinates] = useState([]);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const fetchSubordinates = async () => {
      try {
        const res = await api.get('/employees/subordinates/');
        const subs = Array.isArray(res.data) ? res.data : res.data.results || [];
        setSubordinates(subs);
        setIsManager(subs.length > 0 || hasPermission('APPROVAL_OVERTIME'));
      } catch {
        setIsManager(hasPermission('APPROVAL_OVERTIME'));
      }
    };
    fetchSubordinates();
  }, [hasPermission]);

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
        </SubTabButton>
        <SubTabButton
          active={activeSubTab === 'assign'}
          onClick={() => setActiveSubTab('assign')}
          icon={<CalendarPlus size={16} />}
        >
          Mesai Ata
        </SubTabButton>
        <SubTabButton
          active={activeSubTab === 'incoming'}
          onClick={() => setActiveSubTab('incoming')}
          icon={<ArrowDownLeft size={16} />}
        >
          Gelen Talepler
        </SubTabButton>
        <SubTabButton
          active={activeSubTab === 'analytics'}
          onClick={() => setActiveSubTab('analytics')}
          icon={<BarChart3 size={16} />}
        >
          Analiz
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
