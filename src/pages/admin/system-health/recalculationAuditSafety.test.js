import test from 'node:test';
import assert from 'node:assert/strict';

const safetyModule = await import('./recalculationAuditSafety.js');

test('kısmi TYR sonucunu uygulamaya kapatır', () => {
    assert.match(
        safetyModule.getFrcApplyBlockReason({
            _partial_note: '1/3 grup sonucu alınamadı — rapor kısmi.',
        }),
        /1\/3 grup sonucu alınamadı/,
    );
    assert.equal(
        safetyModule.getFrcApplyBlockReason({
            run_id: 'sealed-run',
            _complete_group: true,
            _staged_run_status: 'STAGED',
            _full_result_verified: true,
            summary: { protected_days_skipped: 2 },
        }),
        null,
    );
    assert.match(
        safetyModule.getFrcApplyBlockReason({ cache_token: 'legacy-only' }),
        /mühürlü staged/i,
    );
    assert.match(
        safetyModule.getFrcApplyBlockReason({
            run_id: 'sealed-run',
            parallel_chunks: 3,
            _complete_group: false,
            _staged_run_status: 'STAGED',
            _full_result_verified: true,
        }),
        /eksiksiz grup/i,
    );
    assert.match(
        safetyModule.getFrcApplyBlockReason({
            run_id: 'sealed-run',
            _complete_group: true,
            _staged_run_status: 'STAGING',
            _full_result_verified: true,
        }),
        /STAGED/i,
    );
    assert.match(
        safetyModule.getFrcApplyBlockReason({
            run_id: 'sealed-run',
            _complete_group: true,
            _staged_run_status: 'STAGED',
        }),
        /tam sonuç/i,
    );
});

test('chunk birleştirme yalnız eksiksiz ve aynı run grubunu kabul eder', () => {
    const chunks = [
        {
            task_id: 'task-1',
            run_id: 'sealed-run',
            summary: { total_days_changed: 2, warnings: ['a'] },
            employees: [{ id: 1 }],
            text_log: 'bir',
            elapsed: 12,
            full_result_available: true,
        },
        {
            task_id: 'task-2',
            run_id: 'sealed-run',
            summary: { total_days_changed: 3, warnings: ['b'] },
            employees: [{ id: 2 }],
            text_log: 'iki',
            elapsed: 17,
            full_result_available: true,
        },
    ];

    const merged = safetyModule.mergeFrcChunkResults(chunks, {
        expectedChunks: 2,
        runId: 'sealed-run',
        runStatus: 'STAGED',
        taskIds: ['task-1', 'task-2'],
    });
    assert.equal(merged.summary.total_days_changed, 5);
    assert.deepEqual(merged.summary.warnings, ['a', 'b']);
    assert.deepEqual(merged.employees, [{ id: 1 }, { id: 2 }]);
    assert.equal(merged.parallel_chunks, 2);
    assert.equal(merged._complete_group, true);
    assert.equal(merged._staged_run_status, 'STAGED');
    assert.equal(merged._full_result_verified, true);

    assert.equal(
        safetyModule.mergeFrcChunkResults(chunks.slice(0, 1), {
            expectedChunks: 2,
            runId: 'sealed-run',
            runStatus: 'STAGED',
        }),
        null,
    );
    assert.equal(
        safetyModule.mergeFrcChunkResults([
            chunks[0],
            { ...chunks[1], run_id: 'other-run' },
        ], {
            expectedChunks: 2,
            runId: 'sealed-run',
            runStatus: 'STAGED',
        }),
        null,
    );
    assert.equal(
        safetyModule.mergeFrcChunkResults([
            chunks[0],
            { ...chunks[1], task_id: 'wrong-task' },
        ], {
            expectedChunks: 2,
            runId: 'sealed-run',
            runStatus: 'STAGED',
            taskIds: ['task-1', 'task-2'],
        }),
        null,
    );
    assert.equal(
        safetyModule.mergeFrcChunkResults([
            chunks[0],
            { ...chunks[1], full_result_available: false },
        ], {
            expectedChunks: 2,
            runId: 'sealed-run',
            runStatus: 'STAGED',
            taskIds: ['task-1', 'task-2'],
        }),
        null,
    );
});

test('tam sonuç yalnız açık kullanılabilirlik işareti ve eksiksiz şemayla kabul edilir', () => {
    assert.match(
        safetyModule.getFrcFullResultValidationError({
            status: 'COMPLETED',
            run_id: 'sealed-run',
            summary: { total_days_changed: 3 },
        }, { runId: 'sealed-run' }),
        /tam sonuç/i,
    );
    assert.equal(
        safetyModule.getFrcFullResultValidationError({
            full_result_available: true,
            run_id: 'sealed-run',
            summary: {},
            employees: [],
            text_log: '',
        }, { runId: 'sealed-run' }),
        null,
    );
    assert.match(
        safetyModule.getFrcFullResultValidationError({
            full_result_available: true,
            run_id: 'other-run',
            summary: {},
            employees: [],
            text_log: '',
        }, { runId: 'sealed-run' }),
        /farklı/i,
    );
    assert.match(
        safetyModule.getFrcFullResultValidationError({
            full_result_available: true,
            task_id: 'wrong-task',
            run_id: 'sealed-run',
            summary: {},
            employees: [],
            text_log: '',
        }, { runId: 'sealed-run', taskId: 'task-1' }),
        /farklı/i,
    );
    assert.match(
        safetyModule.getFrcFullResultValidationError({
            full_result_available: true,
            task_id: 'task-1',
            run_id: 'sealed-run',
            summary: [],
            employees: [],
            text_log: '',
        }, { runId: 'sealed-run', taskId: 'task-1' }),
        /özet/i,
    );
});

test('poll bütçesi backend sonuç saklama süresiyle aynıdır', () => {
    assert.equal(safetyModule.FRC_STATUS_RETENTION_MS, 90_000_000);
    assert.equal(safetyModule.FRC_POLL_INTERVAL_MS, 5_000);
    assert.equal(safetyModule.getFrcPollMaxAttempts(), 18_000);
    assert.equal(safetyModule.getFrcPollMaxAttempts(10_000), 9_000);
    assert.equal(
        safetyModule.getFrcPollMaxAttempts(7_000),
        Math.ceil(90_000_000 / 7_000),
    );
});

test('grup manifesti task, run, durum ve apply attempt bütünlüğünü doğrular', () => {
    const manifest = {
        status: 'GROUP',
        operation: 'apply',
        run_id: 'sealed-run',
        apply_attempt: 4,
        run_apply_attempt: 4,
        run_status: 'APPLIED',
        complete_dispatch: true,
        dispatch_status: 'DISPATCHED',
        tasks: [{ task_id: 'a' }, { task_id: 'b' }],
    };
    assert.equal(
        safetyModule.getFrcGroupValidationError(manifest, {
            operation: 'apply',
            runId: 'sealed-run',
            taskIds: ['a', 'b'],
            applyAttempt: 4,
            requiredRunStatus: 'APPLIED',
        }),
        null,
    );
    assert.match(
        safetyModule.getFrcGroupValidationError({
            ...manifest,
            tasks: [{ task_id: 'a' }],
        }, {
            operation: 'apply',
            runId: 'sealed-run',
            taskIds: ['a', 'b'],
            applyAttempt: 4,
            requiredRunStatus: 'APPLIED',
        }),
        /Görev kimlikleri/,
    );
    assert.match(
        safetyModule.getFrcGroupValidationError({
            ...manifest,
            run_apply_attempt: 3,
        }, {
            operation: 'apply',
            runId: 'sealed-run',
            taskIds: ['a', 'b'],
            applyAttempt: 4,
            requiredRunStatus: 'APPLIED',
        }),
        /generation tokenı/,
    );
});

test('exact grup yolları preview/apply generation kimliğini taşır', () => {
    const previewIdentity = safetyModule.getFrcGroupIdentity({
        run_id: 'run a/b',
        operation: 'preview',
        stage_generation: 'gen + 1',
    });
    const previewPath = safetyModule.buildFrcGroupStatusPath(
        previewIdentity,
        { taskId: 'task/1', full: true },
    );
    assert.match(previewPath, /run_id=run\+a%2Fb/);
    assert.match(previewPath, /operation=preview/);
    assert.match(previewPath, /stage_generation=gen\+%2B\+1/);
    assert.match(previewPath, /task_id=task%2F1/);
    assert.match(previewPath, /full=true/);

    const applyIdentity = safetyModule.getFrcGroupIdentity({
        run_id: 'sealed-run',
        operation: 'apply',
        apply_attempt: 4,
    });
    assert.match(
        safetyModule.buildFrcGroupStatusPath(
            applyIdentity,
            { group: true, cancel: true },
        ),
        /apply_attempt=4.*group=true.*cancel=true/,
    );
    assert.equal(
        safetyModule.getFrcGroupIdentity({
            run_id: 'sealed-run',
            operation: 'preview',
        }),
        null,
    );
});

test('DISPATCHING geçici, yalnız eksiksiz DISPATCHED grup hazırdır', () => {
    assert.equal(
        safetyModule.classifyFrcGroupDispatchStatus({
            dispatch_status: 'DISPATCHING',
            complete_dispatch: false,
        }),
        'dispatching',
    );
    assert.equal(
        safetyModule.classifyFrcGroupDispatchStatus({
            dispatch_status: 'DISPATCHED',
            complete_dispatch: true,
        }),
        'ready',
    );
    assert.equal(
        safetyModule.classifyFrcGroupDispatchStatus({
            dispatch_status: 'DISPATCH_FAILED',
        }),
        'failed',
    );
});

test('poll durumlarını bütün terminal hallerle sınıflandırır', () => {
    assert.equal(safetyModule.classifyFrcPollStatus('RUNNING'), 'running');
    assert.equal(safetyModule.classifyFrcPollStatus('COMPLETED'), 'completed');
    assert.equal(safetyModule.classifyFrcPollStatus('FAILED'), 'failed');
    for (const status of ['CANCELLED', 'NOT_FOUND', 'NO_TASK']) {
        assert.equal(
            safetyModule.classifyFrcPollStatus(status),
            'terminal_missing',
        );
    }
    assert.equal(safetyModule.classifyFrcPollStatus('UNKNOWN'), 'unknown');
});

test('korumalı gün özetini güvenli varsayılanlarla normalize eder', () => {
    assert.deepEqual(
        safetyModule.getProtectedDayInfo({
            summary: {
                protected_days_skipped: 2,
                protected_day_details: [
                    { employee_id: 7, date: '2026-07-29' },
                ],
            },
        }),
        {
            count: 2,
            details: [{ employee_id: 7, date: '2026-07-29' }],
        },
    );
    assert.deepEqual(
        safetyModule.getProtectedDayInfo({
            summary: {
                protected_days_skipped: -4,
                protected_day_details: 'geçersiz',
            },
        }),
        { count: 0, details: [] },
    );
});

test('uygulama onayı korumalı günlerin değişmeden kalacağını açıklar', () => {
    const message = safetyModule.buildFrcApplyConfirmation(3);

    assert.match(message, /3 korumalı gün/);
    assert.match(message, /değişmeden bırakılacak/);
    assert.doesNotMatch(
        safetyModule.buildFrcApplyConfirmation(0),
        /korumalı gün/,
    );
});

test('yalnız geçici axios poll hataları yeniden denenir', () => {
    assert.equal(
        safetyModule.shouldRetryFrcPollError(new Error('Task FAILED'), 1, 10, 100),
        false,
    );
    assert.equal(
        safetyModule.shouldRetryFrcPollError(
            { isAxiosError: true, message: 'temporary timeout' },
            1,
            10,
            100,
        ),
        true,
    );
    assert.equal(
        safetyModule.shouldRetryFrcPollError(
            { isAxiosError: true, response: { status: 403 } },
            1,
            10,
            100,
        ),
        false,
    );
});

test('geçici poll hatası 12 hata sonrasında da bütçe boyunca terminalleşmez', () => {
    const transientError = {
        isAxiosError: true,
        response: { status: 503 },
    };

    assert.equal(
        safetyModule.shouldRetryFrcPollError(
            transientError,
            12,
            10,
            100,
        ),
        true,
    );
    assert.equal(
        safetyModule.shouldRetryFrcPollError(
            transientError,
            50_000,
            99,
            100,
        ),
        true,
    );
});

test('bütçe sınırındaki geçici hata kontrollü gözlem-sonu yoluna bırakılır', () => {
    const transientError = {
        isAxiosError: true,
        message: 'temporary timeout',
    };

    assert.equal(
        safetyModule.shouldRetryFrcPollError(
            transientError,
            50_000,
            100,
            100,
        ),
        true,
    );
    assert.equal(
        safetyModule.shouldRetryFrcPollError(
            transientError,
            50_001,
            101,
            100,
        ),
        false,
    );
});

test('paralel grupta gerçek terminal hata gözlem-sonundan önce gösterilir', () => {
    const observationEnded = new Error('İzleme sona erdi');
    observationEnded.frcObservationEnded = true;
    const backendFailed = new Error('Grup 2 backend FAILED');
    const settled = [
        { status: 'rejected', reason: observationEnded },
        { status: 'rejected', reason: backendFailed },
        { status: 'fulfilled', value: { task_id: 'task-3' } },
    ];

    assert.equal(
        safetyModule.selectFrcParallelFailure(settled),
        backendFailed,
    );
    assert.equal(
        safetyModule.selectFrcParallelFailure([
            { status: 'rejected', reason: observationEnded },
        ]),
        observationEnded,
    );
});

test('yeni FRC operation epoch eski recovery callbacklerini geçersiz kılar', () => {
    const fence = safetyModule.createFrcOperationEpochFence();
    const recoveryEpoch = fence.begin();

    assert.equal(fence.isCurrent(recoveryEpoch), true);

    const manualPreviewEpoch = fence.begin();
    assert.equal(fence.isCurrent(recoveryEpoch), false);
    assert.equal(fence.isCurrent(manualPreviewEpoch), true);

    fence.invalidate();
    assert.equal(fence.isCurrent(manualPreviewEpoch), false);
});

test('cancel isteği API çağrılmadan önce eski recovery epochunu geçersiz kılar', async () => {
    const fence = safetyModule.createFrcOperationEpochFence();
    const recoveryEpoch = fence.begin();
    let recoveryWasCurrentWhenRequestStarted = true;

    const cancellation = safetyModule.startFrcSupersedingRequest(
        fence,
        () => {
            recoveryWasCurrentWhenRequestStarted = fence.isCurrent(
                recoveryEpoch,
            );
            return Promise.resolve({ status: 'CANCEL_REQUESTED' });
        },
    );

    assert.equal(recoveryWasCurrentWhenRequestStarted, false);
    assert.equal(cancellation.isCurrent(), true);
    assert.deepEqual(
        await cancellation.response,
        { status: 'CANCEL_REQUESTED' },
    );
});

test('DISPATCHING recovery geçici ağ hatasından sonra exact manifesti izlemeye devam eder', async () => {
    let fetchCount = 0;
    const result = await safetyModule.pollFrcDispatchUntilSettled({
        initialManifest: {
            dispatch_status: 'DISPATCHING',
            complete_dispatch: false,
        },
        maxAttempts: 3,
        pause: async () => {},
        fetchManifest: async () => {
            fetchCount += 1;
            if (fetchCount === 1) {
                throw {
                    isAxiosError: true,
                    response: { status: 503 },
                };
            }
            return {
                dispatch_status: 'DISPATCHED',
                complete_dispatch: true,
            };
        },
    });

    assert.equal(fetchCount, 2);
    assert.equal(result.state, 'ready');
    assert.equal(result.exhausted, false);
});

test('gözlem bütçesi sonu hata değil uyarı sunumu kullanır', () => {
    assert.deepEqual(
        safetyModule.getFrcMessagePresentation(true),
        { severity: 'warning', role: 'status' },
    );
    assert.deepEqual(
        safetyModule.getFrcMessagePresentation(false),
        { severity: 'error', role: 'alert' },
    );
});

test('show_all_days sonucu temiz çalışanları değişen çalışan sayısına katmaz', () => {
    const result = {
        employees: [
            { id: 1, cd: 2, days: [{ has_diff: true }] },
            { id: 2, cd: 0, days: [] },
            {
                id: 3,
                cd: 0,
                days: [{ request_math_manual_reviews: [{ code: 'AMBIGUOUS' }] }],
            },
            { id: 4, cd: 0, protected_skips: 1, days: [] },
            { id: 5, cd: 0, balance_ok: false, days: [] },
            {
                id: 6,
                cd: 0,
                monthly_changed: true,
                staged_months: ['2026-08'],
                days: [],
            },
            {
                id: 7,
                cd: 0,
                days: [{
                    recalc_status: 'MANUAL_REVIEW_REQUIRED',
                    gate_manual_reviews: [{ code: 'UNMATCHED_GATE_EVENT' }],
                }],
            },
        ],
    };

    assert.deepEqual(
        safetyModule.getFrcEmployeeGroups(result),
        {
            changed: [result.employees[0]],
            monthlyOnly: [result.employees[5]],
            reviewOnly: [
                result.employees[2],
                result.employees[3],
                result.employees[4],
                result.employees[6],
            ],
        },
    );
});

test('tam yeniden hesaplama görünümü varsayılan olarak temiz çalışanları da listeler', () => {
    const result = {
        employees: [
            { id: 1, cd: 2, days: [{ has_diff: true }] },
            { id: 2, cd: 0, days: [{ date: '2026-08-01', has_diff: false }] },
            {
                id: 3,
                cd: 0,
                days: [{ request_math_manual_reviews: [{ code: 'AMBIGUOUS' }] }],
            },
            { id: 4, cd: 0, monthly_changed: true, staged_months: ['2026-08'] },
        ],
    };

    assert.deepEqual(
        safetyModule.getFrcEmployeeDisplay(result),
        result.employees,
    );
});

test('yalnız değişenler filtresi temiz çalışanı saklar, değişen ve inceleme gerekenleri korur', () => {
    const result = {
        employees: [
            { id: 1, cd: 1, days: [] },
            { id: 2, cd: 0, days: [{ date: '2026-08-01', has_diff: false }] },
            { id: 3, cd: 0, protected_skips: 1, days: [] },
            { id: 4, cd: 0, monthly_changed: true, staged_months: ['2026-08'] },
        ],
    };

    assert.deepEqual(
        safetyModule.getFrcEmployeeDisplay(result, true),
        [result.employees[0], result.employees[2], result.employees[3]],
    );
});

test('günün manuel talep, gate ve kapsam bulgularını görünür satırlara çevirir', () => {
    const findings = safetyModule.getFrcDayReviewFindings({
        request_math_manual_reviews: [{
            code: 'SELECTED_GEOMETRY_INVALID',
            request_id: 442391,
            detail: 'segment süresi fiziksel kanıtla uyuşmuyor',
        }],
        gate_manual_reviews: [{
            code: 'UNMATCHED_GATE_EVENT',
            events: [{ direction: 'IN', time: '08:02:11' }],
        }],
        frc_scope_warnings: [{
            code: 'OUT_OF_SCOPE_NEIGHBOR',
            detail: 'komşu gün aralık dışı',
        }],
    });

    assert.equal(findings.length, 3);
    assert.match(findings[0].label, /Talep #442391/);
    assert.match(findings[0].detail, /fiziksel kanıt/);
    assert.match(findings[1].label, /Kart olayı/);
    assert.match(findings[1].detail, /IN 08:02:11/);
    assert.match(findings[2].label, /Kapsam uyarısı/);
    assert.match(findings[2].detail, /komşu gün/);
});

test('eksik veya bozuk çalışan listesi güvenli boş gruplar döndürür', () => {
    assert.deepEqual(
        safetyModule.getFrcEmployeeGroups({ employees: 'invalid' }),
        { changed: [], monthlyOnly: [], reviewOnly: [] },
    );
    assert.deepEqual(
        safetyModule.getFrcEmployeeGroups(null),
        { changed: [], monthlyOnly: [], reviewOnly: [] },
    );
    assert.deepEqual(
        safetyModule.getFrcEmployeeDisplay({ employees: 'invalid' }),
        [],
    );
    assert.deepEqual(safetyModule.getFrcEmployeeDisplay(null), []);
});
