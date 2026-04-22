import React from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';

export function EmptyState({ icon: Icon = BarChart3, message = 'Veri bulunamadı' }) {
    return (
        <div className="text-center py-16 text-slate-400">
            <Icon size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">{message}</p>
        </div>
    );
}

export function ErrorState({ message = 'Veri yüklenirken hata oluştu.', onRetry }) {
    return (
        <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium mb-3">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                    <RefreshCw size={14} />
                    Tekrar Dene
                </button>
            )}
        </div>
    );
}

export function LoadingSkeleton({ rows = 3 }) {
    return (
        <div className="space-y-4 animate-pulse p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
            </div>
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="h-52 bg-slate-100 rounded-2xl" />
            ))}
        </div>
    );
}
