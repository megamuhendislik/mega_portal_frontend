import test from 'node:test';
import assert from 'node:assert/strict';

import {
    ADMIN_PENDING_LABEL,
    ADMIN_PENDING_STATUS,
    ADMIN_REJECTED_STATUS,
    ADMIN_SENT_MESSAGE,
    DUTY_ADMIN_APPROVAL_NOTE,
    adminQueueTotals,
    buildAdminDecisionPayload,
    buildApprovalStages,
    canAdminDecide,
    describeQueueSource,
    dutyAdminApprovalNote,
    formatAdminLimitSnapshot,
    formatWeekRange,
    interpretApprovalResponse,
    isAwaitingAdmin,
    isManagerActionable,
    normalizeAdminQueue,
    resolveStatusKey,
    validateAdminDecision,
} from './overtimeApprovalStage.js';

const HOUR = 3600;

const adminPending = {
    id: 7,
    status: 'PENDING',
    requires_admin_approval: true,
    approval_stage: 'ADMIN',
    manager_approved_by_name: 'Sabri Özgür Sipahi',
    manager_approved_at: '2026-09-29T10:22:00+03:00',
    admin_decision_by_name: null,
    admin_decision_at: null,
    is_actionable: true,
};

test('sistem yöneticisini bekleyen talep ayrı durum anahtarı alır, ham status değişmez', () => {
    assert.equal(isAwaitingAdmin(adminPending), true);
    assert.equal(resolveStatusKey(adminPending), ADMIN_PENDING_STATUS);
    assert.equal(adminPending.status, 'PENDING');
    assert.equal(ADMIN_PENDING_LABEL, 'Sistem Yöneticisinde');
});

test('sistem yöneticisinin reddi ayrı etiketlenir; aşamasız talep ham status ile kalır', () => {
    assert.equal(resolveStatusKey({ status: 'REJECTED', approval_stage: 'REJECTED_BY_ADMIN' }), ADMIN_REJECTED_STATUS);
    assert.equal(resolveStatusKey({ status: 'PENDING', approval_stage: null }), 'PENDING');
    assert.equal(resolveStatusKey({ status: 'APPROVED', approval_stage: 'COMPLETED' }), 'APPROVED');
    assert.equal(resolveStatusKey({ status: 'PENDING', approval_stage: 'MANAGER' }), 'PENDING');
});

test('ADMIN aşamasındaki talep yönetici için aksiyonsuz, yalnız sistem yöneticisi karar verir', () => {
    assert.equal(isManagerActionable(adminPending), false);
    assert.equal(isManagerActionable({ status: 'PENDING', is_actionable: true }), true);
    assert.equal(isManagerActionable({ status: 'PENDING', is_actionable: false }), false);
    assert.equal(canAdminDecide(adminPending, true), true);
    assert.equal(canAdminDecide(adminPending, false), false);
    assert.equal(canAdminDecide({ status: 'PENDING', approval_stage: 'MANAGER' }, true), false);
    assert.equal(canAdminDecide({ status: 'APPROVED', approval_stage: 'COMPLETED' }, true), false);
});

test('hafta aralığı aynı ayda kısaltılır, ay değişince iki tarih yazılır', () => {
    assert.equal(formatWeekRange('2026-09-21', '2026-09-27'), '21-27.09');
    assert.equal(formatWeekRange('2026-09-28', '2026-10-04'), '28.09-04.10');
});

test('sınır özeti hafta, toplam, sınır ve aşımı Xsa Ydk biçiminde verir', () => {
    const text = formatAdminLimitSnapshot({
        week_start: '2026-09-21', week_end: '2026-09-27',
        limit_seconds: 30 * HOUR, week_total_seconds: 47 * HOUR, over_seconds: 17 * HOUR,
    });
    assert.equal(text, '21-27.09 haftası: 47sa (sınır 30sa)');
    assert.equal(formatAdminLimitSnapshot(null), '');
});

test('iki aşama: yönetici onayladı, sistem yöneticisi bekliyor', () => {
    const [manager, admin] = buildApprovalStages(adminPending);
    assert.equal(manager.title, 'Yönetici Onayı');
    assert.equal(manager.state, 'done');
    assert.equal(manager.by, 'Sabri Özgür Sipahi');
    assert.equal(admin.title, 'Sistem Yöneticisi Onayı');
    assert.equal(admin.state, 'pending');
    assert.equal(admin.stateLabel, 'Bekliyor');
});

test('iki aşama: tamamlanan, sistem yöneticisince reddedilen, yöneticide bekleyen', () => {
    const done = buildApprovalStages({
        ...adminPending, status: 'APPROVED', approval_stage: 'COMPLETED',
        admin_decision_by_name: 'Admin Kişi', admin_decision_at: '2026-09-30T09:00:00+03:00',
    });
    assert.deepEqual(done.map(s => s.state), ['done', 'done']);
    assert.equal(done[1].by, 'Admin Kişi');

    const rejected = buildApprovalStages({ ...adminPending, status: 'REJECTED', approval_stage: 'REJECTED_BY_ADMIN' });
    assert.deepEqual(rejected.map(s => s.state), ['done', 'rejected']);

    const atManager = buildApprovalStages({
        status: 'PENDING', requires_admin_approval: true, approval_stage: 'MANAGER',
        manager_approved_at: null,
    });
    assert.deepEqual(atManager.map(s => s.state), ['pending', 'waiting']);

    const managerRejected = buildApprovalStages({
        status: 'REJECTED', requires_admin_approval: true, approval_stage: 'MANAGER',
    });
    assert.deepEqual(managerRejected.map(s => s.state), ['rejected', 'skipped']);
});

test('ikinci onay gerekmeyen talepte aşama listesi boş', () => {
    assert.deepEqual(buildApprovalStages({ status: 'APPROVED', requires_admin_approval: false }), []);
    assert.deepEqual(buildApprovalStages(null), []);
});

test('yönetici onayı sistem yöneticisine giderse bilgi mesajı ve ADMIN iyimser güncellemesi', () => {
    const out = interpretApprovalResponse({ status: 'PENDING', approval_stage: 'ADMIN', message: 'x' });
    assert.equal(out.sentToAdmin, true);
    assert.equal(out.level, 'info');
    assert.equal(out.message, ADMIN_SENT_MESSAGE);
    assert.deepEqual(out.patch, {
        status: 'PENDING', approval_stage: 'ADMIN', requires_admin_approval: true, is_actionable: false,
    });
    assert.match(ADMIN_SENT_MESSAGE, /sistem yöneticisi onayına gönderildi/);
});

test('normal onay yanıtında başarı ve APPROVED iyimser güncellemesi', () => {
    for (const data of [{ status: 'APPROVED' }, undefined, {}]) {
        const out = interpretApprovalResponse(data);
        assert.equal(out.sentToAdmin, false);
        assert.equal(out.level, 'success');
        assert.deepEqual(out.patch, { status: 'APPROVED', is_actionable: false });
    }
});

test('dış görev uyarısına sistem yöneticisi notu yalnız gerekiyorsa eklenir', () => {
    assert.equal(dutyAdminApprovalNote({ admin_approval_required: true }), DUTY_ADMIN_APPROVAL_NOTE);
    assert.match(DUTY_ADMIN_APPROVAL_NOTE, /sistem yöneticisi onayına gidecek/);
    assert.equal(dutyAdminApprovalNote({ admin_approval_required: false }), null);
    assert.equal(dutyAdminApprovalNote(null), null);
});

test('sistem yöneticisi kararı: ret gerekçesi zorunlu, yük doğru kurulur', () => {
    assert.equal(validateAdminDecision('reject', '  '), 'Reddetme sebebi girin');
    assert.equal(validateAdminDecision('reject', 'Bütçe yok'), null);
    assert.equal(validateAdminDecision('approve', ''), null);
    assert.equal(validateAdminDecision('delete', ''), 'Geçersiz işlem');
    assert.deepEqual(buildAdminDecisionPayload('approve', ''), { action: 'approve' });
    assert.deepEqual(buildAdminDecisionPayload('reject', ' Bütçe yok '), { action: 'reject', reason: 'Bütçe yok' });
});

test('kuyruk: sayfalı/sayfasız yanıt, kaynak etiketi ve toplamlar', () => {
    assert.equal(normalizeAdminQueue([{ id: 1 }]).length, 1);
    assert.equal(normalizeAdminQueue({ results: [{ id: 1 }, { id: 2 }] }).length, 2);
    assert.deepEqual(normalizeAdminQueue(null), []);

    assert.equal(describeQueueSource({ source: 'DUTY', duty_request_id: 1089 }), 'Dış görev #1089');
    assert.equal(describeQueueSource({ related_leave_request: 1089 }), 'Dış görev #1089');
    assert.equal(describeQueueSource({ source: 'INTENDED' }), 'Planlı atama');
    assert.equal(describeQueueSource({ source: 'CARD' }), 'Kart');
    assert.equal(describeQueueSource({ source: 'MANUAL', source_label: 'Manuel giriş' }), 'Manuel giriş');

    assert.deepEqual(adminQueueTotals([{ duration_seconds: 17 * HOUR }, { duration_seconds: 5.5 * HOUR }]), {
        count: 2, totalSeconds: 22.5 * HOUR,
    });
});
