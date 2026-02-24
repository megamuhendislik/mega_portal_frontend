import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, ChevronDown } from 'lucide-react';

const TeamSelector = ({ selectedId, onSelect, className = "" }) => {
    const { user } = useAuth();
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);

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
            const response = await api.get('/dashboard/team_hierarchy/');
            const data = Array.isArray(response.data) ? response.data : [];

            // Kendisini hariç tut, sadece subordinate'lar
            const subordinates = data.filter(m => m && m.id && Number(m.id) !== Number(employeeId));

            setTeam(subordinates);
        } catch (error) {
            console.error('Failed to fetch team:', error);
            setTeam([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>;

    // Kimse bağlı değilse ekip seçici gösterme
    if (team.length === 0) return null;

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                    value={selectedId || ''}
                    onChange={(e) => onSelect(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 appearance-none min-w-[200px] cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
                >
                    <option value="">Ekip Üyesi Seçin</option>
                    {team.map(member => (
                        <option key={member.id} value={member.id}>
                            {member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim()}
                        </option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );
};

export default TeamSelector;
