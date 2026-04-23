import React, { useState } from 'react';
import { Dropdown, Button, message } from 'antd';
import {
    Download,
    FileSpreadsheet,
    FileText,
    Image as ImageIcon,
    FileDown,
} from 'lucide-react';

/**
 * Dışa aktarım menüsü — Excel/PDF/CSV/PNG dropdown'ı.
 *
 * Props:
 *  - onExport(format) — async callback, format: 'excel'|'pdf'|'csv'|'png'
 *  - formats — gösterilecek format listesi (default: hepsi)
 *  - disabled
 *  - size — AntD Button size
 *  - label — buton yazısı (default: "Dışa Aktar")
 *  - placement — dropdown konumu
 *
 * Faz 1: onExport verilmezse "yakında" mesajı gösterir (stub).
 * Faz 5: gerçek export backend entegrasyonu.
 */

const FORMAT_META = {
    excel: { label: 'Excel (.xlsx)', icon: <FileSpreadsheet size={14} /> },
    pdf: { label: 'PDF (.pdf)', icon: <FileDown size={14} /> },
    csv: { label: 'CSV (.csv)', icon: <FileText size={14} /> },
    png: { label: 'PNG (grafik)', icon: <ImageIcon size={14} /> },
};

export default function ExportMenu({
    onExport,
    formats = ['excel', 'pdf', 'csv', 'png'],
    disabled = false,
    size = 'middle',
    label = 'Dışa Aktar',
    placement = 'bottomRight',
    buttonProps = {},
}) {
    const [loadingKey, setLoadingKey] = useState(null);

    const handleClick = async ({ key }) => {
        setLoadingKey(key);
        try {
            if (onExport) {
                await onExport(key);
            } else {
                message.info(`${FORMAT_META[key]?.label || key} dışa aktarımı yakında aktif olacak.`);
            }
        } catch (err) {
            const msg = err?.message || err?.response?.data?.detail || 'Dışa aktarım başarısız oldu.';
            message.error(msg);
        } finally {
            setLoadingKey(null);
        }
    };

    const items = formats
        .filter((key) => FORMAT_META[key])
        .map((key) => ({
            key,
            label: FORMAT_META[key].label,
            icon: FORMAT_META[key].icon,
        }));

    if (items.length === 0) return null;

    return (
        <Dropdown
            menu={{ items, onClick: handleClick }}
            disabled={disabled}
            placement={placement}
            trigger={['click']}
        >
            <Button
                icon={<Download size={14} />}
                size={size}
                loading={loadingKey !== null}
                disabled={disabled}
                {...buttonProps}
            >
                {label}
            </Button>
        </Dropdown>
    );
}
