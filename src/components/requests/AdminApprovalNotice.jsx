import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import useAdminApprovalCheck from '../../hooks/useAdminApprovalCheck';
import { employeeAdminNotice } from '../../utils/overtimeApprovalStage';

export const AdminApprovalNotice = ({ text, items = [], size = 'xs', className = '' }) => {
    if (!text) return null;
    const textSize = size === 'sm' ? 'text-sm' : 'text-xs';
    return (
        <div className={`flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 ${textSize} text-blue-800 ${className}`}>
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-blue-600" />
            <div className="space-y-1">
                <p>{text}</p>
                {items.length > 0 && (
                    <ul className="list-disc pl-4">
                        {items.map(item => <li key={item}>{item}</li>)}
                    </ul>
                )}
            </div>
        </div>
    );
};

// Oluşturma formları: tarih + süre belli olunca kontrol eder, gerekiyorsa açıklar.
export const AdminApprovalCheck = ({ employeeId, date, durationSeconds, excludeRequestId, onResult, className }) => {
    const preview = useAdminApprovalCheck({ employeeId, date, durationSeconds, excludeRequestId });
    useEffect(() => {
        onResult?.(preview);
    }, [preview, onResult]);
    // Form kapanınca eski sonuç başka bir talebe taşınmasın.
    useEffect(() => () => onResult?.(null), [onResult]);
    return <AdminApprovalNotice text={employeeAdminNotice(preview)} className={className} />;
};

export default AdminApprovalNotice;
