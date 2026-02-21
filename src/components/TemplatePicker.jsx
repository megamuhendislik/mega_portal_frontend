import React from 'react';
import { Eraser, Paintbrush } from 'lucide-react';

const TemplatePicker = ({ templates, selectedId, onSelect, eraserActive, onEraserToggle }) => {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase mr-1 flex items-center gap-1">
                <Paintbrush size={14} /> Fırça:
            </span>
            {templates.map(t => (
                <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                        selectedId === t.id && !eraserActive
                            ? 'shadow-lg scale-105'
                            : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{
                        backgroundColor: t.color + '20',
                        color: t.color,
                        borderColor: selectedId === t.id && !eraserActive ? t.color : 'transparent'
                    }}
                >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                    {t.is_default && <span className="text-[9px] opacity-60">(V)</span>}
                </button>
            ))}
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button
                onClick={onEraserToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                    eraserActive
                        ? 'border-slate-800 bg-slate-100 text-slate-800 shadow-lg scale-105'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
                <Eraser size={14} />
                Silgi
            </button>
        </div>
    );
};

export default TemplatePicker;
