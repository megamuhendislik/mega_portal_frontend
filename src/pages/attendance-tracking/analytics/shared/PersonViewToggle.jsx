import React from 'react';
import { Segmented } from 'antd';
import { AlertTriangle, Users } from 'lucide-react';

/**
 * PersonViewToggle — Anomali Bazlı / Kişi Bazlı görünüm seçici.
 *
 * Props:
 *  - value: 'anomaly' | 'person'
 *  - onChange: (next) => void
 */
export default function PersonViewToggle({ value, onChange }) {
    return (
        <Segmented
            value={value}
            onChange={onChange}
            size="small"
            options={[
                {
                    value: 'anomaly',
                    label: (
                        <span className="flex items-center gap-1.5 px-1 text-xs">
                            <AlertTriangle size={12} /> Anomali Bazlı
                        </span>
                    ),
                },
                {
                    value: 'person',
                    label: (
                        <span className="flex items-center gap-1.5 px-1 text-xs">
                            <Users size={12} /> Kişi Bazlı
                        </span>
                    ),
                },
            ]}
        />
    );
}
