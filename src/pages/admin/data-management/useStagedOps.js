import { useState, useCallback } from 'react';

/**
 * useStagedOps — Veri Yönetimi v2 client-side staged operations.
 *
 * DayEditPanel artık her ekle/düzenle/sil işleminde API'yi anında çağırmak
 * yerine bir "operation" objesi üretir ve burada kuyruğa ekler. Kullanıcı
 * alttaki aksiyon barından [Kaydet]'e bastığında tüm kuyruk tek bir
 * apply_changeset isteği olarak gönderilir.
 *
 * Her op şu sözleşmeye uyar (backend apply_changeset/preview_changeset ile bire bir):
 *   { record_type, op_type, target_pk, payload }
 * Ayrıca yalnızca UI için iki ek alan taşınır:
 *   _clientId : liste key'i için benzersiz id
 *   _label    : kısa, insan-okur etiket (ör: "+ Kart 2026-05-26 08:00→17:00")
 * Bu iki alan POST'tan önce strip edilmelidir.
 */
export default function useStagedOps() {
    const [pendingOps, setPendingOps] = useState([]);

    const addOp = useCallback((op) => {
        if (!op) return;
        const clientId =
            (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        setPendingOps((prev) => [
            ...prev,
            { _clientId: clientId, ...op },
        ]);
    }, []);

    const removeOp = useCallback((index) => {
        setPendingOps((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const clearOps = useCallback(() => {
        setPendingOps([]);
    }, []);

    return {
        pendingOps,
        addOp,
        removeOp,
        clearOps,
        count: pendingOps.length,
    };
}

/**
 * stripClientFields — _clientId / _label gibi UI-özel alanları temizleyip
 * backend'in beklediği saf op listesini döner.
 */
export function stripClientFields(ops) {
    return (ops || []).map((op) => {
        const copy = { ...op };
        delete copy._clientId;
        delete copy._label;
        return copy;
    });
}
