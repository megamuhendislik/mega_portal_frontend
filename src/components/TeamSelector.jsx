import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, ChevronDown } from 'lucide-react';

const TeamSelector = ({ selectedId, onSelect, className = "" }) => {
    const { user } = useAuth();
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);

    // Determine correct Employee ID (Handle structure: { employee: {id} } vs { id })
    const employeeId = user?.employee?.id || user?.id;

    useEffect(() => {
        if (employeeId) {
            fetchTeam();
        } else {
            setLoading(false);
        }
    }, [user, employeeId]);

    const fetchTeam = async () => {
        try {
            // First add self
            const self = {
                id: employeeId,
                first_name: user?.first_name || 'Ben',
                last_name: user?.last_name || '',
                job_position: { name: 'Ben' }
            };

            const response = await api.get(`/employees/${employeeId}/team/`);

            // Combine: Self + Team
            const teamData = [self, ...(Array.isArray(response.data) ? response.data : [])];

            // Filter invalid (null/undefined/no-id) FIRST
            const validTeam = teamData.filter(m => m && m.id);

            // Ensure unique IDs
            const uniqueTeam = validTeam.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);

            setTeam(uniqueTeam);
        } catch (error) {
            console.error('Failed to fetch team:', error);
            // Fallback to just self if error
            setTeam([{
                id: employeeId,
                first_name: user?.first_name || 'Ben',
                last_name: user?.last_name || '',
                job_position: { name: 'Ben' }
            }]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>;

    // REMOVED: if (team.length <= 1) return null; 
    // We want to verify it renders even if empty.

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                    value={selectedId || ''}
                    onChange={(e) => onSelect(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 appearance-none min-w-[200px] cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
                >
                    {team.map(member => (
                        <option key={member.id} value={member.id}>
                            {Number(member.id) === Number(employeeId) ? '👤 Ben' : `${member.first_name} ${member.last_name}`}
                        </option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );
};

export default TeamSelector;
