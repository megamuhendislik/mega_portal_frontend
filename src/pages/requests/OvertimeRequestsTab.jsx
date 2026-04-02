import { useState, useEffect, useCallback } from 'react';
import { Clock, CalendarPlus, ArrowDownLeft, BarChart3, Info } from 'lucide-react';
import { Tooltip } from 'antd';
import api from '../../services/api';
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

export default function OvertimeRequestsTab({ onDataChange, refreshTrigger, primaryCount = 0, secondaryCount = 0, teamCountsLoading = false, searchText = '' }) {
  const [activeSubTab, setActiveSubTab] = useState('my_requests');
  const hasAnyTeam = primaryCount > 0 || secondaryCount > 0;
  // APPROVAL_* tüm rollere verildiği için yönetici tespitinde kullanılmaz
  const isManager = hasAnyTeam;

  // Lazy mount: component mounts on first visit, stays alive after (display:none hides it)
  const [mounted, setMounted] = useState({ my_requests: true });

  // ── Shared team data: fetch ONCE here, pass to children ──
  const needsTeamFetch = hasAnyTeam;
  const [sharedTeamData, setSharedTeamData] = useState({ primary: [], secondary: [], loading: needsTeamFetch });

  useEffect(() => {
    if (!needsTeamFetch) return;
    let cancelled = false;
    const fetchTeams = async () => {
      try {
        const [priRes, secRes] = await Promise.allSettled([
          api.get('/employees/subordinates/', { params: { relationship_type: 'PRIMARY' } }),
          api.get('/employees/subordinates/', { params: { relationship_type: 'SECONDARY' } }),
        ]);
        if (cancelled) return;
        const toList = (res) => {
          if (res.status !== 'fulfilled') return [];
          const data = Array.isArray(res.value.data) ? res.value.data : res.value.data.results || [];
          return data.map(s => ({
            id: s.id,
            name: s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.full_name || s.name || `Çalışan #${s.id}`,
            department: typeof s.department === 'object' ? s.department?.name : (s.department || ''),
          }));
        };
        setSharedTeamData({ primary: toList(priRes), secondary: toList(secRes), loading: false });
      } catch {
        if (!cancelled) setSharedTeamData(prev => ({ ...prev, loading: false }));
      }
    };
    fetchTeams();
    return () => { cancelled = true; };
  }, [needsTeamFetch]);

  const switchTab = useCallback((tab) => {
    setActiveSubTab(tab);
    setMounted(prev => prev[tab] ? prev : { ...prev, [tab]: true });
  }, []);

  // Hâlâ ekip bilgisi yükleniyorsa: skeleton göster
  if (teamCountsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 w-28 bg-slate-100 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-slate-50 rounded-xl" />
      </div>
    );
  }

  // Normal çalışan — mevcut görünüm (yalnızca yükleme bittikten sonra)
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
          onClick={() => switchTab('my_requests')}
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
            onClick={() => switchTab('assign')}
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
            onClick={() => switchTab('incoming')}
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
          onClick={() => switchTab('analytics')}
          icon={<BarChart3 size={16} />}
        >
          Analiz
          <Tooltip title="Ekibinizin ek mesai istatistiklerini ve performans göstergelerini inceleyin.">
            <Info size={13} className="text-slate-400 cursor-help" />
          </Tooltip>
        </SubTabButton>
      </div>

      {/* İçerik — display:none ile sekmeler gizlenir; bir kez mount edilen bileşen canlı kalır */}
      <div style={{ display: activeSubTab === 'my_requests' ? 'block' : 'none' }}>
        <OvertimeCalendarView mode="personal" />
      </div>

      {hasAnyTeam && (
        <div style={{ display: activeSubTab === 'assign' ? 'block' : 'none' }}>
          {mounted.assign && (
            <OTAssignmentCreator
              onAssignmentCreated={onDataChange}
              sharedPrimaryTeam={sharedTeamData.primary}
              sharedSecondaryTeam={sharedTeamData.secondary}
              sharedTeamLoading={sharedTeamData.loading}
            />
          )}
        </div>
      )}

      {hasAnyTeam && (
        <div style={{ display: activeSubTab === 'incoming' ? 'block' : 'none' }}>
          {mounted.incoming && (
            <IncomingRequestsTab
              filterType="overtime"
              refreshTrigger={refreshTrigger}
              parentSearchText={searchText}
            />
          )}
        </div>
      )}

      <div style={{ display: activeSubTab === 'analytics' ? 'block' : 'none' }}>
        {mounted.analytics && <TeamOvertimeAnalytics />}
      </div>
    </div>
  );
}
