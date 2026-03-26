import React from 'react';
import { Tooltip } from 'antd';
import { HelpCircle } from 'lucide-react';

export default function InfoTooltip({ text, className = '' }) {
    return (
        <Tooltip
            title={<span className="text-xs leading-relaxed">{text}</span>}
            placement="top"
            overlayClassName="max-w-[300px]"
            overlayInnerStyle={{ borderRadius: '12px', padding: '8px 12px' }}
        >
            <HelpCircle size={13} className={`text-slate-300 hover:text-slate-500 cursor-help transition-colors shrink-0 ${className}`} />
        </Tooltip>
    );
}
