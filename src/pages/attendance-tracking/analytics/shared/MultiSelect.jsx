import React from 'react';
import { Select } from 'antd';

/**
 * Çoklu seçim dropdown'ı — AntD Select wrapper.
 * Departman/rol/pozisyon/kişi için tutarlı multi-select stili sağlar.
 *
 * Props:
 *  - value — string[] veya number[]
 *  - onChange(values) — seçim değişimi
 *  - options — [{ value, label }] veya AntD options formatı
 *  - placeholder
 *  - maxTagCount — inline gösterilecek etiket sayısı (default: 2)
 *  - maxTagPlaceholder — taşanlar için özel görüntü
 *  - allowClear, disabled, size
 *  - style, className
 *  - showSearch — arama kutusu (default: true)
 */
export default function MultiSelect({
    value = [],
    onChange,
    options = [],
    placeholder = 'Seçiniz',
    maxTagCount = 2,
    maxTagPlaceholder,
    allowClear = true,
    disabled = false,
    size = 'middle',
    style = {},
    className = '',
    showSearch = true,
    mode = 'multiple',
    ...rest
}) {
    const normalizedValue = Array.isArray(value) ? value : value != null ? [value] : [];

    const resolvedMaxTagPlaceholder =
        maxTagPlaceholder ??
        ((omitted) => `+${omitted.length} daha`);

    return (
        <Select
            mode={mode}
            value={normalizedValue}
            onChange={onChange}
            options={options}
            placeholder={placeholder}
            maxTagCount={maxTagCount}
            maxTagPlaceholder={resolvedMaxTagPlaceholder}
            allowClear={allowClear}
            disabled={disabled}
            size={size}
            style={{ minWidth: 200, ...style }}
            className={className}
            showSearch={showSearch}
            optionFilterProp="label"
            filterOption={(input, option) => {
                const label = option?.label ?? '';
                return String(label).toLowerCase().includes(input.toLowerCase());
            }}
            {...rest}
        />
    );
}
