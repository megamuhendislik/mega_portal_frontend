import React from 'react';
import ReactDOM from 'react-dom';
import { ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { UserPlus, Star } from 'lucide-react';

const ReassignConfirmModal = ({ reassignment, onConfirm, onCancel, isSaving }) => {
    if (!reassignment) return null;

    const { employee, target } = reassignment;
    const isEmployeeTarget = target.type === 'employee';

    const descriptionText = isEmployeeTarget
        ? `${employee.name} adlı personel ${target.name} altına atanacaktır.`
        : `${employee.name} adlı personel ${target.name} departmanına taşınacaktır.`;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                        Personel Atamasını Onayla
                    </h3>
                </div>

                {/* Preview Card */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 mb-4">
                    <div className="flex items-center justify-between gap-3">
                        {/* Employee (left) */}
                        <div className="flex-1 min-w-0 text-center">
                            <p className="font-semibold text-slate-800 truncate">
                                {employee.name}
                            </p>
                            {employee.title && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {employee.title}
                                </p>
                            )}
                        </div>

                        {/* Arrow */}
                        <div className="flex-shrink-0">
                            <ArrowRightIcon className="w-5 h-5 text-slate-400" />
                        </div>

                        {/* Target (right) */}
                        <div className="flex-1 min-w-0 text-center">
                            <p className="font-semibold text-slate-800 truncate">
                                {target.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {isEmployeeTarget ? 'Yeni Yönetici' : 'Yeni Departman'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-6">
                    {descriptionText}
                </p>

                {/* Buttons */}
                {isEmployeeTarget ? (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-700">Atama tipini seçin:</p>
                        <button
                            type="button"
                            onClick={() => onConfirm('PRIMARY')}
                            disabled={isSaving}
                            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            {isSaving ? 'Kaydediliyor...' : 'Birincil Yönetici Olarak Ata'}
                        </button>
                        <button
                            type="button"
                            onClick={() => onConfirm('SECONDARY')}
                            disabled={isSaving}
                            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Star className="w-4 h-4" />
                            {isSaving ? 'Kaydediliyor...' : 'İkincil Yönetici Olarak Ata'}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSaving}
                            className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            İptal
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            İptal
                        </button>
                        <button
                            type="button"
                            onClick={() => onConfirm('PRIMARY')}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? 'Kaydediliyor...' : 'Onayla'}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ReassignConfirmModal;
