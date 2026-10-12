import test from 'node:test';
import assert from 'node:assert/strict';

import {
    ADMIN_REQUIRED_TAG,
    ADMIN_SUBMIT_NOTE,
    DUTY_ADMIN_APPROVAL_NOTE,
    adminQueueReason,
    approvalReasonLine,
    buildApprovalStages,
    dutyAdminApprovalNote,
    dutyFormAdminNotice,
    employeeAdminNotice,
    findAdminApprovalPreview,
    formatWeekOverrun,
    managerAdminNotice,
    willNeedAdminApproval,
} from './overtimeApprovalStage.js';

const HOUR = 3600;

const preview = {
    required: true,
    applies: true,
    week_start: '2026-09-21',
    week_end: '2026-09-27',
    week_total_seconds: 34 * HOUR,
    limit_seconds: 30 * HOUR,
    over_seconds: 4 * HOUR,
};

test('hafta aşımı satırı: aynı ay ve ay geçişi', () => {
    assert.equal(formatWeekOverrun(preview), '21-27.09 haftası 34sa, sınır 30sa (4sa fazla)');
    assert.equal(
        formatWeekOverrun({ week_start: '2026-09-28', week_end: '2026-10-04', week_total_seconds: 47 * HOUR, limit_seconds: 30 * HOUR, over_seconds: 17 * HOUR }),
        '28.09-04.10 haftası 47sa, sınır 30sa (17sa fazla)',
    );
    assert.equal(
        formatWeekOverrun({ week_start: '2026-09-21', week_end: '2026-09-27', week_total_seconds: 30.5 * HOUR, limit_seconds: 30 * HOUR, over_seconds: 1800 }),
        '21-27.09 haftası 30sa 30dk, sınır 30sa (30dk fazla)',
    );
    assert.equal(formatWeekOverrun(null), '');
});

test('çalışana açıklama: nedeni rakamla söyler', () => {
    assert.equal(
        employeeAdminNotice(preview),
        '21-27.09 haftasında dış görevler dahil fazla mesainiz 34sa oluyor, haftalık sınır 30sa. '
        + 'Bu yüzden talep, yöneticiniz onayladıktan sonra sistem yöneticisinin de onayına gidecek.',
    );
    assert.equal(employeeAdminNotice({ ...preview, required: false }), null);
    assert.equal(employeeAdminNotice({ required: false, applies: false }), null);
    assert.equal(employeeAdminNotice(null), null);
    // Hafta bilgisi eksikse yalnız sonuç cümlesi
    assert.equal(
        employeeAdminNotice({ required: true }),
        'Bu yüzden talep, yöneticiniz onayladıktan sonra sistem yöneticisinin de onayına gidecek.',
    );
});

test('yöneticiye açıklama', () => {
    assert.equal(
        managerAdminNotice(preview),
        'Onayınızdan sonra bu talep sistem yöneticisine gidecek. 21-27.09 haftasında dış görevler dahil fazla mesai 34sa oluyor, sınır 30sa.',
    );
    assert.equal(
        managerAdminNotice(preview, { approverIsAdmin: true }),
        'Sistem yöneticisi olduğunuz için ikinci onay gerekmez, onayınızla talep tamamlanır. 21-27.09 haftasında dış görevler dahil fazla mesai 34sa oluyor, sınır 30sa.',
    );
    assert.equal(managerAdminNotice({ ...preview, required: false }), null);
    assert.equal(managerAdminNotice(undefined), null);
});

test('dış görev formu: tek hafta düz cümle, çok hafta liste', () => {
    const one = dutyFormAdminNotice({
        required: true,
        weeks: [
            { week_start: '2026-09-21', week_end: '2026-09-27', total_seconds: 45 * HOUR, limit_seconds: 30 * HOUR, over_seconds: 15 * HOUR, required: true },
            { week_start: '2026-09-28', week_end: '2026-10-04', total_seconds: 5 * HOUR, limit_seconds: 30 * HOUR, over_seconds: 0, required: false },
        ],
    });
    assert.equal(
        one.text,
        '21-27.09 haftasında fazla mesainiz 45sa oluyor, haftalık sınır 30sa. '
        + 'Bu yüzden görevin fazla mesaisi, yöneticiniz onayladıktan sonra sistem yöneticisinin de onayına gidecek.',
    );
    assert.deepEqual(one.items, []);

    const many = dutyFormAdminNotice({
        required: true,
        weeks: [
            { week_start: '2026-09-21', week_end: '2026-09-27', total_seconds: 45 * HOUR, limit_seconds: 30 * HOUR, over_seconds: 15 * HOUR, required: true },
            { week_start: '2026-09-28', week_end: '2026-10-04', total_seconds: 32 * HOUR, limit_seconds: 30 * HOUR, over_seconds: 2 * HOUR, required: true },
        ],
    });
    assert.match(many.text, /^Bu haftalarda fazla mesainiz sınırı aşıyor\./);
    assert.deepEqual(many.items, [
        '21-27.09 haftası 45sa, sınır 30sa (15sa fazla)',
        '28.09-04.10 haftası 32sa, sınır 30sa (2sa fazla)',
    ]);

    assert.equal(dutyFormAdminNotice({ required: false, weeks: [] }), null);
    assert.equal(dutyFormAdminNotice(null), null);
});

test('dış görev onay uyarısı notu hafta ve aşımla', () => {
    const warning = {
        admin_approval_required: true,
        weeks: [
            { week_start: '2026-09-21', week_end: '2026-09-27', over_seconds: 15 * HOUR, admin_required: true },
            { week_start: '2026-09-28', week_end: '2026-10-04', over_seconds: 0, admin_required: false },
        ],
    };
    assert.equal(
        dutyAdminApprovalNote(warning),
        'Sınırı aşan fazla mesai (21-27.09, 15sa) onayınızdan sonra sistem yöneticisine gidecek.',
    );
    warning.weeks[1] = { week_start: '2026-09-28', week_end: '2026-10-04', over_seconds: 2 * HOUR, admin_required: true };
    assert.equal(
        dutyAdminApprovalNote(warning),
        'Sınırı aşan fazla mesai (21-27.09, 15sa; 28.09-04.10, 2sa) onayınızdan sonra sistem yöneticisine gidecek.',
    );
    // Hafta bilgisi gelmezse (eski backend) genel not
    assert.equal(dutyAdminApprovalNote({ admin_approval_required: true }), DUTY_ADMIN_APPROVAL_NOTE);
    assert.equal(dutyAdminApprovalNote({ admin_approval_required: false, weeks: warning.weeks }), null);
});

test('sistem yöneticisi kuyruğu neden satırı', () => {
    assert.equal(
        adminQueueReason({
            admin_limit_snapshot: {
                week_start: '2026-09-21', week_end: '2026-09-27',
                week_total_seconds: 47 * HOUR, limit_seconds: 30 * HOUR, over_seconds: 17 * HOUR,
            },
            manager_approved_by_name: 'Sabri Özgür Sipahi',
            manager_approved_at: '2026-09-29T14:10:00+03:00',
        }),
        '21-27.09 haftası 47sa, sınır 30sa (17sa fazla). Yönetici onayı: Sabri Özgür Sipahi, 29.09 14:10.',
    );
    assert.equal(adminQueueReason({}), '');
});

test('talep yöneticideyken sistem yöneticisi onayı gerekecek mi', () => {
    const req = { status: 'PENDING', admin_approval_preview: preview };
    assert.equal(willNeedAdminApproval(req), true);
    assert.equal(willNeedAdminApproval({ ...req, manager_approved_at: '2026-09-29T10:00:00+03:00' }), false);
    assert.equal(willNeedAdminApproval({ ...req, approval_stage: 'ADMIN' }), false);
    assert.equal(willNeedAdminApproval({ ...req, status: 'APPROVED' }), false);
    assert.equal(willNeedAdminApproval({ status: 'PENDING', admin_approval_preview: null }), false);
    assert.equal(willNeedAdminApproval({ status: 'PENDING' }), false);
});

test('önizlemeli talepte aşamalar: yönetici bekliyor, sistem yöneticisi gerekecek', () => {
    const [manager, admin] = buildApprovalStages({ status: 'PENDING', admin_approval_preview: preview });
    assert.equal(manager.state, 'pending');
    assert.equal(admin.state, 'upcoming');
    assert.equal(admin.stateLabel, 'Gerekecek');
    assert.equal(approvalReasonLine({ status: 'PENDING', admin_approval_preview: preview }), '21-27.09 haftası 34sa, sınır 30sa (4sa fazla)');
    assert.deepEqual(buildApprovalStages({ status: 'PENDING', admin_approval_preview: { ...preview, required: false } }), []);
});

test('oluşturma yanıtında önizlemeyi bulur', () => {
    assert.equal(findAdminApprovalPreview({ id: 1, admin_approval_preview: preview }), preview);
    assert.equal(findAdminApprovalPreview({ request: { admin_approval_preview: preview } }), preview);
    assert.equal(findAdminApprovalPreview({ results: [{ admin_approval_preview: preview }] }), preview);
    assert.equal(findAdminApprovalPreview({ requests: [{ id: 2 }, { admin_approval_preview: preview }] }), preview);
    assert.equal(findAdminApprovalPreview({ id: 3 }), null);
    assert.equal(findAdminApprovalPreview(null), null);
});

test('etiket ve gönderim notu metinleri', () => {
    assert.equal(ADMIN_REQUIRED_TAG, 'Sistem yöneticisi onayı gerekecek');
    assert.equal(ADMIN_SUBMIT_NOTE, 'Talebiniz yönetici onayından sonra sistem yöneticisine gidecek.');
});

test('applies=false (kural kapsam dışı) ise hiçbir açıklama yok', () => {
    const outOfScope = {
        required: true, applies: false,
        week_start: null, week_end: null, week_total_seconds: null, limit_seconds: null, over_seconds: null,
    };
    assert.equal(employeeAdminNotice(outOfScope), null);
    assert.equal(managerAdminNotice(outOfScope), null);
    assert.equal(willNeedAdminApproval({ status: 'PENDING', admin_approval_preview: outOfScope }), false);
    assert.equal(employeeAdminNotice({ required: false, applies: false, week_total_seconds: null }), null);
});
