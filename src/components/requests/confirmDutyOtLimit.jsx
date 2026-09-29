import React from 'react';
import { Modal } from 'antd';
import { AlertTriangle } from 'lucide-react';

import { DutyOtLimitWarningMessage } from './DutyOtLimitWarning';
import { dutyWarningTitle } from '../../utils/dutyOtLimitWarning';

// Promise<boolean>: yönetici "Eminim, Onayla" derse true.
export const confirmDutyOtLimit = (warning) => new Promise(resolve => {
    Modal.confirm({
        title: (
            <span className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                {dutyWarningTitle(warning)}
            </span>
        ),
        icon: null,
        width: 640,
        content: <DutyOtLimitWarningMessage warning={warning} />,
        okText: 'Eminim, Onayla',
        cancelText: 'Vazgeç',
        closable: false,
        maskClosable: false,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
    });
});
