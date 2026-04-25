import React, { useState, useEffect, useCallback } from 'react';
import { Segmented } from 'antd';
import { LayoutGrid, Maximize2 } from 'lucide-react';

/**
 * DensityToggle — Kompakt / Rahat görünüm togglesi.
 * LocalStorage'da kullanıcı tercihini saklar; <body> data-density attribute'unu set eder.
 *
 * CSS hooks (Tailwind/global):
 *   body[data-density="compact"] .analytics-* { padding ve font küçülür }
 */

const STORAGE_KEY = 'mega_analytics_density';

export function getDensity() {
    try {
        return localStorage.getItem(STORAGE_KEY) || 'comfortable';
    } catch {
        return 'comfortable';
    }
}

export function setDensity(value) {
    try {
        localStorage.setItem(STORAGE_KEY, value);
        document.body.setAttribute('data-density', value);
    } catch {
        /* quota / SSR */
    }
}

export default function DensityToggle({ size = 'small' }) {
    const [density, setDensityState] = useState(getDensity);

    useEffect(() => {
        document.body.setAttribute('data-density', density);
        return () => {
            // Sayfa terk edilirse default'a dön
            document.body.removeAttribute('data-density');
        };
    }, [density]);

    const handleChange = useCallback((value) => {
        setDensityState(value);
        setDensity(value);
    }, []);

    return (
        <Segmented
            value={density}
            onChange={handleChange}
            size={size}
            options={[
                {
                    value: 'comfortable',
                    label: (
                        <div className="flex items-center gap-1 px-1">
                            <Maximize2 size={11} />
                            <span className="text-[11px]">Rahat</span>
                        </div>
                    ),
                },
                {
                    value: 'compact',
                    label: (
                        <div className="flex items-center gap-1 px-1">
                            <LayoutGrid size={11} />
                            <span className="text-[11px]">Kompakt</span>
                        </div>
                    ),
                },
            ]}
        />
    );
}
