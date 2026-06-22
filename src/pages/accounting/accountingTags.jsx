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

// Çalışan durumu rozeti (Genel Bakış)
export const RosterStatusTag = ({ status }) => {
    const cfg = ROSTER_STATUS[status] || { label: status || '—', color: 'default' };
    return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

// İzin / mesai talep durumu rozeti
export const RequestStatusTag = ({ status, statusDisplay }) => {
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
