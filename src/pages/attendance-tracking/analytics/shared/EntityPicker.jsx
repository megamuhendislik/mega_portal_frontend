import React, { useMemo } from 'react';
import { Select } from 'antd';

/**
 * EntityPicker — Karışık varlık seçici (kişi, dept ort, şirket ort, pozisyon ort).
 *
 * Props:
 *   value: string[]  — kompakt key'ler ['p:1', 'd:5', 'c', 'j:3']
 *   onChange: (newValue) => void
 *   employees: [{id, name}]
 *   departments: [{id, name}]
 *   positions: [{id, name | title}]
 */
export default function EntityPicker({
    value = [],
    onChange,
    employees = [],
    departments = [],
    positions = [],
    placeholder = 'Kişi, departman ortalaması, şirket ortalaması veya pozisyon ortalaması ekle…',
}) {
    const options = useMemo(() => {
        const groups = [];
        if (employees.length) {
            groups.push({
                label: <span className="font-bold text-slate-600 text-xs">👤 Çalışanlar</span>,
                options: employees.map((e) => ({
                    value: `p:${e.id}`,
                    label: e.name || e.full_name || `#${e.id}`,
                    searchText: (e.name || e.full_name || '').toLowerCase(),
                })),
            });
        }
        if (departments.length) {
            groups.push({
                label: <span className="font-bold text-slate-600 text-xs">🏢 Departman Ortalamaları</span>,
                options: departments.map((d) => ({
                    value: `d:${d.id}`,
                    label: `${d.name} (ort.)`,
                    searchText: d.name.toLowerCase(),
                })),
            });
        }
        groups.push({
            label: <span className="font-bold text-slate-600 text-xs">🌐 Şirket Ortalaması</span>,
            options: [{
                value: 'c',
                label: 'Tüm Şirket (ort.)',
                searchText: 'şirket sirket tüm tum',
            }],
        });
        if (positions.length) {
            groups.push({
                label: <span className="font-bold text-slate-600 text-xs">💼 Pozisyon Ortalamaları</span>,
                options: positions.map((p) => ({
                    value: `j:${p.id}`,
                    label: `${p.name || p.title} (ort.)`,
                    searchText: (p.name || p.title || '').toLowerCase(),
                })),
            });
        }
        return groups;
    }, [employees, departments, positions]);

    return (
        <Select
            mode="multiple"
            value={value}
            onChange={onChange}
            options={options}
            placeholder={placeholder}
            size="middle"
            showSearch
            filterOption={(input, option) => {
                if (!option?.searchText) return false;
                return option.searchText.includes(input.toLowerCase());
            }}
            style={{ width: '100%', minWidth: 320 }}
            maxTagCount="responsive"
            allowClear
        />
    );
}
