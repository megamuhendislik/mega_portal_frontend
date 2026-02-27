import { useState } from 'react';
import { Clock, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MyOvertimeSubTab from './overtime/MyOvertimeSubTab';
import TeamOvertimeSubTab from './overtime/TeamOvertimeSubTab';

const SubTabButton = ({ active, onClick, children, icon }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2
            ${active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
    >
        {icon}
        {children}
    </button>
);

const AssignedOvertimeTab = () => {
    const { hasPermission } = useAuth();
    const [subTab, setSubTab] = useState('mine');
    const isManager = hasPermission('APPROVAL_OVERTIME');

    return (
        <div className="space-y-6">
            {/* Sub-tab navigation */}
            <div className="flex gap-2">
                <SubTabButton
                    active={subTab === 'mine'}
                    onClick={() => setSubTab('mine')}
                    icon={<Clock size={16} />}
                >
                    Benim Ek Mesailerim
                </SubTabButton>
                {isManager && (
                    <SubTabButton
                        active={subTab === 'team'}
                        onClick={() => setSubTab('team')}
                        icon={<Users size={16} />}
                    >
                        Ekibimin Ek Mesaileri
                    </SubTabButton>
                )}
            </div>

            {/* Content */}
            {subTab === 'mine' && <MyOvertimeSubTab />}
            {subTab === 'team' && isManager && <TeamOvertimeSubTab />}
        </div>
    );
};

export default AssignedOvertimeTab;
