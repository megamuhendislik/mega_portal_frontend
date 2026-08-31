const BASE_APPLY_CONFIRMATION =
    'DIKKAT: Tum degisiklikler kalici olarak uygulanacak!\n\n' +
    'Dry-run raporundaki tum split duzeltmeleri, normal mesai yeniden hesaplamalari,\n' +
    'Fazla Mesai ayarlamalari ve aylik ozet guncellemeleri veritabanina yazilacak.\n\n' +
    'Bu islem geri alinamaz. Devam etmek istiyor musunuz?';

export const FRC_STATUS_RETENTION_MS = 90_000_000;
export const FRC_POLL_INTERVAL_MS = 5_000;

export function getFrcPollMaxAttempts(interval = FRC_POLL_INTERVAL_MS) {
    const intervalMs = Number(interval);
    const safeInterval = Number.isFinite(intervalMs) && intervalMs > 0
        ? intervalMs
        : FRC_POLL_INTERVAL_MS;
    return Math.ceil(FRC_STATUS_RETENTION_MS / safeInterval);
}

export function createFrcOperationEpochFence() {
    let activeEpoch = 0;
    return {
        begin() {
            activeEpoch += 1;
            return activeEpoch;
        },
        invalidate() {
            activeEpoch += 1;
            return activeEpoch;
        },
        isCurrent(epoch) {
            return Number.isInteger(epoch) && epoch === activeEpoch;
        },
    };
}

export function startFrcSupersedingRequest(operationFence, request) {
    if (
        !operationFence
        || typeof operationFence.begin !== 'function'
        || typeof operationFence.isCurrent !== 'function'
    ) {
        throw new TypeError('Geçerli FRC operation fence gerekli.');
    }
    if (typeof request !== 'function') {
        throw new TypeError('FRC request fonksiyonu gerekli.');
    }

    const epoch = operationFence.begin();
    let response;
    try {
        response = Promise.resolve(request());
    } catch (error) {
        response = Promise.reject(error);
    }
    return {
        response,
        isCurrent: () => operationFence.isCurrent(epoch),
    };
}

export function getFrcMessagePresentation(observationEnded) {
    return observationEnded === true
        ? { severity: 'warning', role: 'status' }
        : { severity: 'error', role: 'alert' };
}

function isPlainObject(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

export function getFrcFullResultValidationError(payload, expectedIdentity = {}) {
    const identity = typeof expectedIdentity === 'object'
        && expectedIdentity !== null
        ? expectedIdentity
        : { runId: expectedIdentity };

    if (!isPlainObject(payload) || payload.full_result_available !== true) {
        return 'Tam sonuç kullanılabilirliği backend tarafından doğrulanmadı.';
    }
    if (
        identity.runId !== undefined
        && identity.runId !== null
        && String(payload.run_id || '') !== String(identity.runId)
    ) {
        return 'Tam sonuç farklı bir staged koşuya ait.';
    }
    if (
        identity.taskId !== undefined
        && identity.taskId !== null
        && String(payload.task_id || '') !== String(identity.taskId)
    ) {
        return 'Tam sonuç farklı bir görev kimliğine ait.';
    }
    if (!isPlainObject(payload.summary)) {
        return 'Tam sonuç özet alanı geçerli bir nesne değil.';
    }
    if (!Array.isArray(payload.employees)) {
        return 'Tam sonuç çalışanlar alanı geçerli bir dizi değil.';
    }
    if (typeof payload.text_log !== 'string') {
        return 'Tam sonuç metin günlüğü geçerli bir string değil.';
    }
    return null;
}

function normalizeCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
}

export function getFrcApplyBlockReason(result) {
    const partialNote = result?._partial_note;
    if (partialNote) return `Kısmi rapor uygulanamaz: ${partialNote}`;
    if (!result?.run_id) {
        return (
            'Bu rapor mühürlü staged koşuya bağlı değil; güvenli şekilde ' +
            'uygulanamaz. Yeni bir Tam Yeniden Hesaplama (SIMÜLASYON) çalıştırın.'
        );
    }
    if (result?._complete_group !== true) {
        return (
            'Bu rapor eksiksiz grup manifestiyle doğrulanmadı; tek veya kısmi ' +
            'chunk sonucu uygulanamaz. Simülasyonu yeniden çalıştırın.'
        );
    }
    if (result?._staged_run_status !== 'STAGED') {
        return (
            'Mühürlü koşu henüz STAGED durumunda değil; tüm gruplar kalıcı ' +
            'staging kaydını tamamlamadan uygulama yapılamaz.'
        );
    }
    if (result?._full_result_verified !== true) {
        return (
            'Tam sonuç doğrulanmadı; yalnız metadata içeren veya süresi dolmuş ' +
            'bir rapor uygulanamaz. Yeni bir simülasyon çalıştırın.'
        );
    }
    return null;
}

export function mergeFrcChunkResults(results, {
    expectedChunks,
    runId,
    runStatus,
    taskIds,
} = {}) {
    const expected = normalizeCount(expectedChunks);
    const expectedTaskIds = Array.isArray(taskIds)
        ? taskIds.map((taskId) => String(taskId || ''))
        : [];
    if (
        !expected
        || !runId
        || runStatus !== 'STAGED'
        || !Array.isArray(results)
        || results.length !== expected
        || (expectedTaskIds.length > 0 && expectedTaskIds.length !== expected)
        || results.some((result, index) => getFrcFullResultValidationError(
            result,
            {
                runId,
                taskId: expectedTaskIds.length ? expectedTaskIds[index] : undefined,
            },
        ) !== null)
    ) {
        return null;
    }

    const employees = results.flatMap((result) => (
        Array.isArray(result.employees) ? result.employees : []
    ));
    const summary = {};
    for (const result of results) {
        for (const [key, value] of Object.entries(result.summary || {})) {
            if (typeof value === 'number' && Number.isFinite(value)) {
                summary[key] = (summary[key] || 0) + value;
            } else if (Array.isArray(value)) {
                summary[key] = (summary[key] || []).concat(value);
            } else if (summary[key] === undefined) {
                summary[key] = value;
            }
        }
    }
    const elapsedValues = results
        .map((result) => Number(result.elapsed))
        .filter(Number.isFinite);
    const textLog = results.map((result, index) => (
        `═══════ GRUP ${index + 1}/${expected} ═══════\n${result.text_log || ''}`
    )).join('\n\n');

    return {
        ...results[0],
        run_id: String(runId),
        summary,
        employees,
        text_log: textLog,
        mode: results[0]?.mode || 'dry_run',
        date_range: results[0]?.date_range,
        elapsed: elapsedValues.length ? Math.max(...elapsedValues) : 0,
        parallel_chunks: expected,
        _complete_group: true,
        _staged_run_status: runStatus,
        _full_result_verified: true,
    };
}

export function selectFrcParallelFailure(settledResults) {
    const rejected = Array.isArray(settledResults)
        ? settledResults.filter((item) => item?.status === 'rejected')
        : [];
    const terminalFailure = rejected.find(
        (item) => item.reason?.frcObservationEnded !== true,
    );
    return terminalFailure?.reason || rejected[0]?.reason || null;
}

export function getFrcGroupValidationError(manifest, {
    operation,
    runId,
    taskIds,
    applyAttempt,
    stageGeneration,
    requiredRunStatus,
} = {}) {
    if (manifest?.status !== 'GROUP') return 'Görev grup manifesti bulunamadı.';
    if (
        manifest.complete_dispatch !== true
        || manifest.dispatch_status !== 'DISPATCHED'
    ) {
        return 'Görev grubunun tamamı kuyruğa alınmadı.';
    }
    if (operation && manifest.operation !== operation) {
        return 'Görev grup türü beklenen işlemle eşleşmiyor.';
    }
    if (runId && String(manifest.run_id || '') !== String(runId)) {
        return 'Görev grubu farklı bir staged koşuya ait.';
    }
    const expectedIds = Array.isArray(taskIds)
        ? taskIds.filter(Boolean).map(String)
        : [];
    const manifestIds = Array.isArray(manifest.tasks)
        ? manifest.tasks.map((task) => task?.task_id).filter(Boolean).map(String)
        : [];
    if (
        !manifestIds.length
        || new Set(manifestIds).size !== manifestIds.length
        || (
            expectedIds.length
            && (
                expectedIds.length !== manifestIds.length
                || expectedIds.some((taskId) => !manifestIds.includes(taskId))
            )
        )
    ) {
        return 'Görev kimlikleri eksik, tekrarlı veya manifestle eşleşmiyor.';
    }
    if (requiredRunStatus && manifest.run_status !== requiredRunStatus) {
        return `Kalıcı koşu durumu ${requiredRunStatus} değil (${manifest.run_status || '-'}).`;
    }
    if (
        stageGeneration !== undefined
        && stageGeneration !== null
        && String(manifest.stage_generation || '') !== String(stageGeneration)
    ) {
        return 'Preview generation tokenı kalıcı koşuyla eşleşmiyor.';
    }
    if (applyAttempt !== undefined && applyAttempt !== null) {
        const expectedAttempt = Number(applyAttempt);
        if (
            Number(manifest.apply_attempt) !== expectedAttempt
            || Number(manifest.run_apply_attempt) !== expectedAttempt
        ) {
            return 'Apply generation tokenı kalıcı koşuyla eşleşmiyor.';
        }
    }
    return null;
}

export function getFrcGroupIdentity(source) {
    const runId = source?.run_id;
    const operation = source?.operation;
    if (!runId || !['preview', 'apply'].includes(operation)) return null;
    if (operation === 'preview') {
        const stageGeneration = source?.stage_generation;
        if (!stageGeneration) return null;
        return {
            runId: String(runId),
            operation,
            stageGeneration: String(stageGeneration),
        };
    }
    const applyAttempt = Number(source?.apply_attempt);
    if (!Number.isInteger(applyAttempt) || applyAttempt < 1) return null;
    return {
        runId: String(runId),
        operation,
        applyAttempt,
    };
}

export function buildFrcGroupStatusPath(identity, {
    taskId,
    group = false,
    cancel = false,
    full = false,
} = {}) {
    if (!identity?.runId || !['preview', 'apply'].includes(identity.operation)) {
        throw new Error('Exact FRC grup kimliği yok.');
    }
    const params = new URLSearchParams({
        run_id: String(identity.runId),
        operation: identity.operation,
    });
    if (identity.operation === 'preview') {
        if (!identity.stageGeneration) {
            throw new Error('Preview generation tokenı yok.');
        }
        params.set('stage_generation', String(identity.stageGeneration));
    } else {
        const applyAttempt = Number(identity.applyAttempt);
        if (!Number.isInteger(applyAttempt) || applyAttempt < 1) {
            throw new Error('Apply generation tokenı yok.');
        }
        params.set('apply_attempt', String(applyAttempt));
    }
    if (taskId) params.set('task_id', String(taskId));
    if (group) params.set('group', 'true');
    if (cancel) params.set('cancel', 'true');
    if (full) params.set('full', 'true');
    return `/system/health-check/full-recalculation-status/?${params.toString()}`;
}

export function classifyFrcGroupDispatchStatus(manifest) {
    if (manifest?.dispatch_status === 'DISPATCHING') return 'dispatching';
    if (
        manifest?.dispatch_status === 'DISPATCHED'
        && manifest?.complete_dispatch === true
    ) return 'ready';
    if (manifest?.dispatch_status === 'CANCEL_REQUESTED') return 'cancelled';
    if (manifest?.dispatch_status === 'DISPATCH_FAILED') return 'failed';
    return 'unknown';
}

export function classifyFrcPollStatus(status) {
    if (status === 'RUNNING') return 'running';
    if (status === 'COMPLETED') return 'completed';
    if (status === 'FAILED') return 'failed';
    if (['CANCELLED', 'NOT_FOUND', 'NO_TASK'].includes(status)) {
        return 'terminal_missing';
    }
    return 'unknown';
}

export function getProtectedDayInfo(result) {
    const summary = result?.summary || {};
    const primaryDetails = summary.protected_day_details;
    const fallbackDetails = summary.protected_days_skipped_details;
    return {
        count: normalizeCount(summary.protected_days_skipped),
        details: Array.isArray(primaryDetails)
            ? primaryDetails
            : (Array.isArray(fallbackDetails) ? fallbackDetails : []),
    };
}

export function buildFrcApplyConfirmation(protectedDaysSkipped = 0) {
    const count = normalizeCount(protectedDaysSkipped);
    if (!count) return BASE_APPLY_CONFIRMATION;
    return (
        `${BASE_APPLY_CONFIRMATION}\n\n` +
        `⚠️ ${count} korumalı gün güvenlik nedeniyle yeniden hesaplanmadı ve ` +
        'değişmeden bırakılacak.'
    );
}

export function shouldRetryFrcPollError(
    error,
    consecutiveErrors,
    attempts,
    maxAttempts,
) {
    if (!error?.isAxiosError) return false;
    const responseStatus = error?.response?.status;
    if (responseStatus && responseStatus < 500) return false;
    // Sınırdaki hata caller'ın kontrollü gözlem-sonu yoluna ulaşsın; while
    // guard'ı yeni bir poll başlatmadan döngüyü bitirir.
    return attempts <= maxAttempts;
}

export async function pollFrcDispatchUntilSettled({
    initialManifest,
    fetchManifest,
    pause,
    maxAttempts = getFrcPollMaxAttempts(),
    isActive = () => true,
}) {
    if (typeof fetchManifest !== 'function') {
        throw new TypeError('Dispatch manifest fetch fonksiyonu gerekli.');
    }
    const wait = typeof pause === 'function' ? pause : async () => {};
    const limit = Math.max(0, Math.trunc(Number(maxAttempts) || 0));
    let manifest = initialManifest;
    let state = classifyFrcGroupDispatchStatus(manifest);
    let attempts = 0;
    let consecutiveErrors = 0;

    while (isActive() && state === 'dispatching' && attempts < limit) {
        attempts += 1;
        await wait();
        if (!isActive()) break;
        try {
            manifest = await fetchManifest();
            consecutiveErrors = 0;
            state = classifyFrcGroupDispatchStatus(manifest);
        } catch (error) {
            consecutiveErrors += 1;
            if (!shouldRetryFrcPollError(
                error,
                consecutiveErrors,
                attempts,
                limit,
            )) throw error;
        }
    }

    return {
        manifest,
        state,
        attempts,
        exhausted: state === 'dispatching' && attempts >= limit,
        active: isActive(),
    };
}

function hasItems(value) {
    return Array.isArray(value) && value.length > 0;
}

const FRC_COMPLETED_DAY_STATUSES = new Set([
    'RECALCULATED',
    'RECALCULATED_PROTECTED',
]);
const FRC_CARD_INPUT_REQUIRED_STATUS = 'UNMATCHED_GATE_INPUT_REQUIRED';

export function getFrcDayDisplayState(day) {
    if (!day || typeof day !== 'object') {
        return {
            hasChange: false,
            needsReview: false,
            needsCardInput: false,
            isUnprocessed: true,
            isClean: false,
        };
    }

    const recalcStatus = typeof day.recalc_status === 'string'
        ? day.recalc_status.toUpperCase()
        : '';
    const hasChange = Boolean(
        day.has_diff
        || hasItems(day.ch)
        || day.is_ghost,
    );
    const needsCardInput = recalcStatus === FRC_CARD_INPUT_REQUIRED_STATUS;
    const needsReview = !needsCardInput && Boolean(
        day.protected_skip
        || day.is_ghost
        || day.day_balance_ok === false
        || recalcStatus === 'FAILED'
        || recalcStatus === 'MANUAL_REVIEW_REQUIRED'
        || hasItems(day.request_math_manual_reviews)
        || hasItems(day.gate_manual_reviews)
        || hasItems(day.frc_scope_warnings)
    );
    const hasSnapshots = Boolean(
        day.before && typeof day.before === 'object'
        && day.after && typeof day.after === 'object',
    );
    const isUnprocessed = Boolean(
        !needsCardInput
        && (
            day.is_future
            || !hasSnapshots
            || (
                !needsReview
                && !FRC_COMPLETED_DAY_STATUSES.has(recalcStatus)
            )
        )
    );

    return {
        hasChange,
        needsReview,
        needsCardInput,
        isUnprocessed,
        isClean: (
            !hasChange
            && !needsReview
            && !needsCardInput
            && !isUnprocessed
        ),
    };
}

export function frcDayNeedsLazyDetail(day) {
    if (!day || typeof day !== 'object') return false;
    const hasAttendanceRows = Boolean(
        day?.before?.recs?.length || day?.after?.recs?.length,
    );
    const hasGateEvents = Boolean(day?.gate_events?.length);
    if (getFrcDayDisplayState(day).needsCardInput) {
        // Bu durum eşleşmemiş Gate kanıtı + mevcut CARD/SPLIT projeksiyonu
        // gerektirir. Motor logu ağır kanıt yerine geçmez; iki veri kümesi de
        // görünür olana kadar salt-okunur gün detayını yükle.
        return !hasAttendanceRows || !hasGateEvents;
    }
    return !hasAttendanceRows && !hasGateEvents;
}

function employeeNeedsReview(employee) {
    if (!employee || typeof employee !== 'object') return false;
    if (normalizeCount(employee.ghost) > 0) return true;
    if (normalizeCount(employee.protected_skips) > 0) return true;
    if (employee.balance_ok === false) return true;
    if (hasItems(employee.anomalies)) return true;
    return (Array.isArray(employee.days) ? employee.days : []).some(
        (day) => getFrcDayDisplayState(day).needsReview,
    );
}

function employeeNeedsCardInput(employee) {
    if (!employee || typeof employee !== 'object') return false;
    return (Array.isArray(employee.days) ? employee.days : []).some(
        (day) => getFrcDayDisplayState(day).needsCardInput,
    );
}

export function getFrcEmployeeGroups(result) {
    const employees = Array.isArray(result?.employees) ? result.employees : [];
    const changed = employees.filter((employee) => normalizeCount(employee?.cd) > 0);
    const monthlyOnly = employees.filter((employee) => (
        normalizeCount(employee?.cd) === 0
        && (employee?.monthly_changed === true || hasItems(employee?.staged_months))
    ));
    const reviewOnly = employees.filter((employee) => (
        normalizeCount(employee?.cd) === 0
        && employee?.monthly_changed !== true
        && !hasItems(employee?.staged_months)
        && employeeNeedsReview(employee)
    ));
    const inputRequired = employees.filter(employeeNeedsCardInput);
    return { changed, monthlyOnly, reviewOnly, inputRequired };
}

export function getFrcEmployeeDisplay(result, onlyChanges = false) {
    const employees = (Array.isArray(result?.employees) ? result.employees : [])
        .filter((employee) => employee && typeof employee === 'object');
    if (!onlyChanges) return employees;
    return employees.filter((employee) => (
        normalizeCount(employee?.cd) > 0
        || employee?.monthly_changed === true
        || hasItems(employee?.staged_months)
        || employeeNeedsReview(employee)
        || employeeNeedsCardInput(employee)
    ));
}

function findingDetail(value) {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    return value.detail || value.message || value.reason || value.code || '';
}

export function getFrcDayReviewFindings(day) {
    if (!day || typeof day !== 'object') return [];
    const requestFindings = (Array.isArray(day.request_math_manual_reviews)
        ? day.request_math_manual_reviews
        : []).map((review) => ({
        type: 'request',
        label: `Talep #${review?.request_id ?? '-'} · ${review?.code || review?.reason || 'MANUAL_REVIEW_REQUIRED'}`,
        detail: findingDetail(review),
    }));
    const gateFindings = (Array.isArray(day.gate_manual_reviews)
        ? day.gate_manual_reviews
        : []).map((review) => ({
        type: 'gate',
        label: `Kart olayı · ${review?.code || review?.reason || 'MANUAL_REVIEW_REQUIRED'}`,
        detail: Array.isArray(review?.events)
            ? review.events.map((event) => (
                `${event?.direction || '?'} ${event?.time || '-'}`
            )).join(', ')
            : findingDetail(review),
    }));
    const scopeFindings = (Array.isArray(day.frc_scope_warnings)
        ? day.frc_scope_warnings
        : []).map((warning) => ({
        type: 'scope',
        label: `Kapsam uyarısı · ${warning?.code || 'FRC_SCOPE_WARNING'}`,
        detail: findingDetail(warning),
    }));
    return [...requestFindings, ...gateFindings, ...scopeFindings];
}
