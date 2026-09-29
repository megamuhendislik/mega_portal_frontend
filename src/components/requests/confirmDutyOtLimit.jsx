import React from 'react';
import { Modal } from 'antd';

import { DutyOtLimitWarningMessage } from './DutyOtLimitWarning';
import { dutyWarningTitle } from '../../utils/dutyOtLimitWarning';

// Yönetici onaylarsa true döner.
export const confirmDutyOtLimit = (warning) => new Promise(resolve => {
    Modal.confirm({
        title: dutyWarningTitle(warning),
        width: 600,
        content: <DutyOtLimitWarningMessage warning={warning} />,
        okText: 'Onayla',
        cancelText: 'Vazgeç',
        maskClosable: false,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
    });
});
