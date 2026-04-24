import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Dropdown, Input, Button, Popconfirm, message } from 'antd';
import { Star, Plus, Trash2, Check } from 'lucide-react';

/**
 * FavoriteViews — localStorage tabanlı kayıtlı görünümler.
 *
 * Kullanıcı mevcut filtre state'ini "Favori" olarak kaydedebilir, sonra
 * dropdown'dan hızlıca seçebilir. Her favori bir URL query string olarak
 * saklanır (paylaşılabilir link formatıyla tutarlı).
 *
 * Props:
 *   getCurrentState() — şu anki query state'i string olarak döndürür (örn: '?period=-1&dept=3')
 *   onApply(queryString) — favori seçildiğinde callback
 */

const STORAGE_KEY = 'mega_analytics_favorite_views';
const MAX_FAVORITES = 10;

function loadFavorites() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveFavorites(list) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
        // quota aşımı vb.
    }
}

export default function FavoriteViews({ getCurrentState, onApply, activeQueryString = '' }) {
    const [favorites, setFavorites] = useState(() => loadFavorites());
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');

    // Başka sekmedeki değişikliklerle senkron kal
    useEffect(() => {
        const handler = (e) => {
            if (e.key === STORAGE_KEY) {
                setFavorites(loadFavorites());
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const addFavorite = useCallback(() => {
        const name = (newName || '').trim();
        if (!name) {
            message.warning('Lütfen bir ad girin');
            return;
        }
        if (favorites.length >= MAX_FAVORITES) {
            message.warning(`En fazla ${MAX_FAVORITES} favori kaydedilebilir`);
            return;
        }
        if (favorites.some((f) => f.name === name)) {
            message.warning('Bu adda bir favori zaten var');
            return;
        }
        const query = typeof getCurrentState === 'function' ? getCurrentState() : '';
        const next = [...favorites, { name, query, savedAt: Date.now() }];
        setFavorites(next);
        saveFavorites(next);
        setNewName('');
        setAdding(false);
        message.success(`"${name}" favori olarak kaydedildi`);
    }, [newName, favorites, getCurrentState]);

    const removeFavorite = useCallback((name) => {
        const next = favorites.filter((f) => f.name !== name);
        setFavorites(next);
        saveFavorites(next);
    }, [favorites]);

    const applyFavorite = useCallback((query, name) => {
        if (typeof onApply === 'function') {
            onApply(query);
            message.success(`"${name}" uygulandı`);
        }
    }, [onApply]);

    const items = useMemo(() => {
        if (favorites.length === 0) {
            return [{
                key: 'empty',
                label: <div className="px-2 py-1 text-xs text-slate-400">Henüz favori yok</div>,
                disabled: true,
            }];
        }

        const favItems = favorites.map((fav) => ({
            key: fav.name,
            label: (
                <div className="flex items-center justify-between gap-4 min-w-[260px]">
                    <button
                        className="flex-1 text-left"
                        onClick={(e) => {
                            e.stopPropagation();
                            applyFavorite(fav.query, fav.name);
                        }}
                    >
                        <div className="flex items-center gap-2">
                            {fav.query === activeQueryString && (
                                <Check size={12} className="text-emerald-500" />
                            )}
                            <span className="text-xs font-medium text-slate-700">{fav.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                            {fav.query || '(boş filtre)'}
                        </div>
                    </button>
                    <Popconfirm
                        title="Sil?"
                        onConfirm={(e) => {
                            e?.stopPropagation();
                            removeFavorite(fav.name);
                        }}
                        okText="Sil"
                        cancelText="İptal"
                    >
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            aria-label="Favori sil"
                        >
                            <Trash2 size={12} />
                        </button>
                    </Popconfirm>
                </div>
            ),
        }));

        return favItems;
    }, [favorites, activeQueryString, applyFavorite, removeFavorite]);

    const menu = {
        items: [
            ...items,
            { type: 'divider' },
            {
                key: 'add',
                label: adding ? (
                    <div className="flex items-center gap-1 px-1 py-1 min-w-[240px]" onClick={(e) => e.stopPropagation()}>
                        <Input
                            size="small"
                            placeholder="Favori adı..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onPressEnter={addFavorite}
                            autoFocus
                            maxLength={30}
                        />
                        <Button size="small" type="primary" onClick={addFavorite}>
                            Kaydet
                        </Button>
                    </div>
                ) : (
                    <button
                        className="flex items-center gap-2 px-2 py-1 text-xs text-indigo-600 font-medium hover:bg-indigo-50 rounded w-full"
                        onClick={(e) => { e.stopPropagation(); setAdding(true); }}
                    >
                        <Plus size={12} />
                        Mevcut görünümü favori olarak kaydet
                    </button>
                ),
            },
        ],
    };

    return (
        <Dropdown
            menu={menu}
            placement="bottomRight"
            trigger={['click']}
            onOpenChange={(open) => { if (!open) { setAdding(false); setNewName(''); } }}
        >
            <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded-lg border border-slate-200/80 hover:border-amber-200 transition-colors"
                title="Favori görünümler"
            >
                <Star size={11} />
                Favoriler
                {favorites.length > 0 && (
                    <span className="ml-0.5 px-1 py-0 text-[9px] bg-amber-100 text-amber-700 rounded-full">
                        {favorites.length}
                    </span>
                )}
            </button>
        </Dropdown>
    );
}
