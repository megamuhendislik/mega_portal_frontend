import React from 'react';
import { Tag } from 'antd';
import {
    ROSTER_STATUS,
    REQUEST_STATUS_COLORS,
    REQUEST_STATUS_LABELS,
    DIRECTION_LABELS,
    MEAL_STATUS,
    CARDLESS_STATUS,
} from './accountingFormat';
import { ADMIN_PENDING_LABEL, ADMIN_REJECTED_LABEL } from '../../utils/overtimeApprovalStage';

// Çalışan durumu rozeti (Genel Bakış)
export const RosterStatusTag = ({ status }) => {
    const cfg = ROSTER_STATUS[status] || { label: status || '—', color: 'default' };
    return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

// İzin / mesai talep durumu rozeti
export const RequestStatusTag = ({ status, statusDisplay, approvalStage }) => {
    if (approvalStage === 'ADMIN' && status === 'PENDING') return <Tag color="purple">{ADMIN_PENDING_LABEL}</Tag>;
    if (approvalStage === 'REJECTED_BY_ADMIN') return <Tag color="red">{ADMIN_REJECTED_LABEL}</Tag>;
    const color = REQUEST_STATUS_COLORS[status] || 'default';
    const label = statusDisplay || REQUEST_STATUS_LABELS[status] || status || '—';
    return <Tag color={color}>{label}</Tag>;
};

// Kart yön rozeti (Giriş / Çıkış)
export const DirectionTag = ({ direction }) => {
    const cfg = DIRECTION_LABELS[direction] || { label: direction || '—', color: 'default' };
    return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

// Yemek talebi durum rozeti
export const MealStatusTag = ({ status, statusDisplay }) => {
    const cfg = MEAL_STATUS[status] || { label: statusDisplay || status || '—', color: 'default' };
    return <Tag color={cfg.color}>{statusDisplay || cfg.label}</Tag>;
};

// Kartsız giriş talebi durum rozeti
export const CardlessStatusTag = ({ status, statusDisplay }) => {
    const cfg = CARDLESS_STATUS[status] || { label: statusDisplay || status || '—', color: 'default' };
    return <Tag color={cfg.color}>{statusDisplay || cfg.label}</Tag>;
};
