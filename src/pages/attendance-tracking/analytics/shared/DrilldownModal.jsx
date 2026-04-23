import React, { useState, useMemo } from 'react';
import { Modal, Input, Table, Radio, Button, Empty, Tag } from 'antd';
import { Search as SearchIcon, X as CloseIcon, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Generic detay modalı — tüm KPI'lar için kullanılabilir.
 * EfficiencyDetailModal pattern'inin generic'leştirilmiş hali.
 *
 * Props:
 *  - open, onClose — Modal state
 *  - title, subtitle — başlık
 *  - columns — AntD Table column tanımları
 *  - data — satır verisi
 *  - groupBy — opsiyonel field adı (örn: 'department'), gruplu görünüm için
 *  - groupLabel — groupBy field'ının başlığı (örn: 'Departman')
 *  - searchFields — arama yapılacak field listesi
 *  - extraActions — filter bar'a ek butonlar (ReactNode)
 *  - footer — özel footer içeriği
 *  - width — modal genişliği
 *  - rowKey — satır key'i (default: id)
 *  - pageSize — sayfa başına satır
 *  - summary — AntD Table summary prop'u (opsiyonel)
 */
export default function DrilldownModal({
    open,
    onClose,
    title,
    subtitle,
    columns,
    data = [],
    groupBy,
    groupLabel = 'Grup',
    searchFields = [],
    extraActions,
    footer = null,
    width = '90%',
    rowKey = 'id',
    pageSize = 20,
    summary,
}) {
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState(groupBy ? 'flat' : 'flat');
    const [expandedGroups, setExpandedGroups] = useState({});

    const filteredData = useMemo(() => {
        if (!search) return data;
        const q = search.toLowerCase();
        return data.filter((row) =>
            searchFields.some((field) => {
                const value = row[field];
                if (value == null) return false;
                return String(value).toLowerCase().includes(q);
            })
        );
    }, [data, search, searchFields]);

    const groupedData = useMemo(() => {
        if (viewMode !== 'grouped' || !groupBy) return null;
        const groups = {};
        filteredData.forEach((row) => {
            const key = row[groupBy] || '—';
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
        });
        return groups;
    }, [filteredData, viewMode, groupBy]);

    const toggleAll = (expand) => {
        if (!groupedData) return;
        const next = {};
        Object.keys(groupedData).forEach((k) => {
            next[k] = expand;
        });
        setExpandedGroups(next);
    };

    const toggleGroup = (key) => {
        setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const resolveRowKey = (row) => {
        if (typeof rowKey === 'function') return rowKey(row);
        return row[rowKey] ?? row.id ?? row.key ?? JSON.stringify(row);
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={footer}
            width={width}
            closeIcon={<CloseIcon size={16} />}
            destroyOnClose
            title={
                <div>
                    <div className="text-lg font-semibold text-slate-800">{title}</div>
                    {subtitle && <div className="mt-0.5 text-sm font-normal text-slate-500">{subtitle}</div>}
                </div>
            }
        >
            <div className="mb-4 flex flex-wrap items-center gap-3">
                {searchFields.length > 0 && (
                    <Input
                        placeholder="Ara..."
                        prefix={<SearchIcon size={14} className="text-slate-400" />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-xs"
                        allowClear
                    />
                )}

                {groupBy && (
                    <Radio.Group
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value)}
                        size="small"
                    >
                        <Radio.Button value="flat">Toplu Liste</Radio.Button>
                        <Radio.Button value="grouped">{groupLabel} Bazlı</Radio.Button>
                    </Radio.Group>
                )}

                {viewMode === 'grouped' && groupedData && (
                    <>
                        <Button size="small" onClick={() => toggleAll(true)}>Tümünü Aç</Button>
                        <Button size="small" onClick={() => toggleAll(false)}>Tümünü Kapat</Button>
                    </>
                )}

                <Tag color="blue" className="ml-auto">{filteredData.length} kayıt</Tag>
                {extraActions}
            </div>

            {filteredData.length === 0 ? (
                <Empty description={search ? 'Arama sonucu bulunamadı' : 'Kayıt bulunamadı'} />
            ) : viewMode === 'grouped' && groupedData ? (
                <div className="space-y-3">
                    {Object.entries(groupedData).map(([groupKey, rows]) => {
                        const isExpanded = !!expandedGroups[groupKey];
                        return (
                            <div key={groupKey} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between bg-slate-50 px-4 py-2.5 text-left hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleGroup(groupKey)}
                                >
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        <span className="font-semibold text-slate-700">{groupKey}</span>
                                        <span className="text-xs text-slate-400">({rows.length})</span>
                                    </div>
                                </button>
                                {isExpanded && (
                                    <Table
                                        columns={columns}
                                        dataSource={rows}
                                        pagination={false}
                                        size="small"
                                        rowKey={resolveRowKey}
                                        summary={summary}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    pagination={filteredData.length > pageSize ? { pageSize } : false}
                    size="small"
                    rowKey={resolveRowKey}
                    summary={summary}
                    scroll={{ x: 'max-content' }}
                />
            )}
        </Modal>
    );
}
