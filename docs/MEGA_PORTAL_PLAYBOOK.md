# Mega Portal Playbook

> **Single Source of Truth** — Compaction sonrasi bile once bu dosyayi oku, "Next feature"i buradan belirle.
> Her feature adimi bittiginde bu dosyayi guncellemeden bir sonraki feature'a gecme.

---

## 0) Strict Mode (Walkthrough > Verify > Fix > Deploy > Next)

### Kurallar
- Bir feature bitmeden (dogrulama + gerekirse fix + deploy kontrol) bir sonrakine gecme
- Her feature sonunda kullanicidan **"OK"** bekle. OK yoksa ilerleme
- Kod degisikligi gerekiyorsa: once **PLAN yaz**, kullanicidan onay iste; onay yoksa implement yapma
- Push = Railway deploy olabilir. Push sonrasi Railway deployment status/log kontrol sart
- Deploy bozulursa rollback opsiyonunu not et
- Railway CLI/komutlarinda sorun olursa kullaniciya sor

### Cikti Sablonu (Her Feature Icin)
```
A) Feature ID + Ad
B) Ne ise yarar? (kisa)
C) UI: route/page, component'ler, API cagrilari
D) Backend: endpoint'ler, servis fonksiyonlari, modeller, celery
E) Yetkiler/gating: permission code'lar
F) Risk/edge cases/failure modes
G) Manual test checklist (5-10 adim)
```

---

## 1) Feature Inventory (v3 — 88 Feature, 14 Kategori)

### Auth & RBAC (5)
- AUTH-01: JWT Login (Giris)
- AUTH-02: Token Refresh
- AUTH-03: RBAC Permission System
- AUTH-04: Role Management
- AUTH-05: Password Change

### Organization & Employees (9)
- ORG-01: Departman Yonetimi
- ORG-02: Pozisyon Yonetimi
- ORG-03: Calisan CRUD
- ORG-04: Calisan Detay Profili
- ORG-05: Kisisel Profil
- ORG-06: Sirket Rehberi
- ORG-07: Yonetici Hiyerarsisi (Matrix)
- ORG-08: Calisan Etiketleri
- ORG-09: Org Chart Drag & Drop (Surukle-Birak Atama)

### Work Schedules & Calendar (9)
- CAL-01: WorkSchedule (Legacy)
- CAL-02: Fiscal Calendar Sistemi
- CAL-03: Schedule Template Yonetimi
- CAL-04: Gun Bazli Sablon Atamasi
- CAL-05: Gunluk Program Override
- CAL-06: Resmi Tatiller
- CAL-07: Kisisel Takvim
- CAL-08: Mali Donem (Fiscal Period)
- CAL-09: get_day_rules() Motor

### Attendance Engine (12)
- ATT-01: Kart ile Giris/Cikis (Toggle Shift)
- ATT-02: Mesai Hesaplama Motoru
- ATT-03: Canli Puantaj Durumu
- ATT-04: Kisisel Mesai Takibi
- ATT-05: Mesai Onay Sureci
- ATT-06: Devamsizlik Tespiti
- ATT-07: Gece Vardiya Destegi
- ATT-08: Gece Yarisi Reset
- ATT-09: Tolerance/Snapping
- ATT-10: Mola Analizi
- ATT-11: Istatistikler
- ATT-12: Puantaj Tablosu

### Gate Integration (3)
- GATE-01: Secure Gate Endpoint (Fernet)
- GATE-02: Gate Event Loglari
- GATE-03: Gate Service

### Overtime Requests (3)
- OT-01: Mesai Talebi Olusturma
- OT-02: Mesai Talebi Onay/Red
- OT-03: Mesai Talebi Listesi

### Leave Requests (7)
- LV-01: Izin/Dis Gorev Talebi Olusturma
- LV-02: Izin Talebi Onay/Red
- LV-03: Yillik Izin Bakiye Yonetimi
- LV-04: Izin Turu Yonetimi
- LV-05: Escalation (Yukseltme)
- LV-06: Izin Iptali & Iade
- LV-07: Takim Izin Gecmisi

### Meal Requests (2)
- ML-01: Yemek Talebi Olusturma
- ML-02: Yemek Siparis Yonetimi

### Cardless Entry (2)
- CE-01: Kartsiz Giris Talebi
- CE-02: Kartsiz Giris Onay

### Approvals & Workflows (8)
- APR-01: Onay Zinciri Motoru
- APR-02: Talep Yonetim Paneli
- APR-03: Vekalet Yonetimi
- APR-04: Karar Gecmisi
- APR-05: Time-Lock & Override Prevention
- APR-06: Uygun Onaylayanlar Listesi
- APR-07: Talep Analitikleri
- APR-08: Override Decision

### Notifications (2)
- NOT-01: Bildirim Sistemi
- NOT-02: Etkinlik Hatirlaticilari

### Reporting & Analytics (7)
- RPT-01: Aylik Raporlar
- RPT-02: Aylik Is Ozeti (Summary)
- RPT-03: Hedef Hesaplama
- RPT-04: Dashboard Analitikleri
- RPT-05: Takim Karsilastirma
- RPT-06: Aylik Mutabakat Raporu
- RPT-07: Kumulatif Bakiye Takibi

### System Health & Admin Tools (17)
- SYS-01: Sistem Sagligi Dashboard
- SYS-02: Servis Yonetimi
- SYS-03: Attendance Debugger
- SYS-04: Veri Yonetimi
- SYS-05: Sistem Ayarlari
- SYS-06: Sistem Kaynaklari Izleme
- SYS-07: Puantaj Teshis
- SYS-08: Yetki Teshis
- SYS-09: Toplu Hesaplama Tetikleme
- SYS-10: Regression Test Runner
- SYS-11: Sentetik Veri Uretici
- SYS-12: Takvim Temizligi
- SYS-13: Sistem Sifirlama
- SYS-14: Metadata Temizligi
- SYS-15: Veri Denetimi
- SYS-16: Compliance Yenileme
- SYS-17: Talep Temizligi

### External Programs (2)
- EXT-01: Harici Program Yonetimi
- EXT-02: Harici Auth (Login/Verify)

### Walkthrough Sirasi (Dependency Order)
```
Auth > Org > Calendar > Attendance > Gate > Overtime > Leave > Meal >
Cardless > Approvals > Notifications > Reports > Admin > External
```

---

## 2) Progress Board

| Feature | Status | Commits | Deploy | Notes |
|---------|--------|---------|--------|-------|
| AUTH-01 | DONE | ab627bd, cdd5e8a | Railway autodeploy OK | Forgot password popup, remember-me default true, bg image restored, copyright updated |
| AUTH-02 | DONE | (no changes) | — | Verified: refresh, queue, expire redirect all OK |
| AUTH-03 | DONE | df334dd | Railway autodeploy OK | RBAC Deep Audit completed + AUTH-03A excluded_permissions fix |
| AUTH-04 | DONE | — | — | RoleViewSet + PermissionViewSet → PAGE_EMPLOYEES required (FIX-18), SEC-38/39 tests |
| AUTH-05 | DONE | — | — | change_password same-password rejection, SEC-40 test |
| ORG-01 | PENDING | — | — | |
| ORG-02 | PENDING | — | — | |
| ORG-03 | PENDING | — | — | |
| ORG-04 | PENDING | — | — | |
| ORG-05 | PENDING | — | — | |
| ORG-06 | PENDING | — | — | |
| ORG-07 | DONE | BE: 9fb028e, 5be42ac, 5bbedc0 / FE: 43f5f15, a50cd23, 9e345ef | Railway autodeploy OK | CROSS→SECONDARY rename, reports_to→PRIMARY migration, ManagerAssignmentSection shared component, zorunlu birincil yönetici validasyonu (board exempt), duplicate/self-assignment prevention, toast notifications |
| ORG-08 | PENDING | — | — | |
| ORG-09 | DONE | BE: 433f71b, 3351339, dfcb462, 85cb3aa / FE: 319f293, d67390b, 8b22bea, 431b463 | Railway autodeploy OK | Native HTML5 D&D, useOrgChartDnD hook, ReassignConfirmModal, OrgChartContextMenu, ACTION_ORG_CHART_MANAGER_ASSIGN permission, SEC-20~30 tests |
| CAL-01 | PENDING | — | — | |
| CAL-02 | PENDING | — | — | |
| CAL-03 | PENDING | — | — | |
| CAL-04 | PENDING | — | — | |
| CAL-05 | PENDING | — | — | |
| CAL-06 | PENDING | — | — | |
| CAL-07 | PENDING | — | — | |
| CAL-08 | PENDING | — | — | |
| CAL-09 | PENDING | — | — | |
| ATT-01 | PENDING | — | — | |
| ATT-02 | PENDING | — | — | |
| ATT-03 | PENDING | — | — | |
| ATT-04 | PENDING | — | — | |
| ATT-05 | PENDING | — | — | |
| ATT-06 | PENDING | — | — | |
| ATT-07 | PENDING | — | — | |
| ATT-08 | PENDING | — | — | |
| ATT-09 | PENDING | — | — | |
| ATT-10 | PENDING | — | — | |
| ATT-11 | PENDING | — | — | |
| ATT-12 | PENDING | — | — | |
| GATE-01 | PENDING | — | — | |
| GATE-02 | PENDING | — | — | |
| GATE-03 | PENDING | — | — | |
| OT-01 | PENDING | — | — | |
| OT-02 | PENDING | — | — | |
| OT-03 | PENDING | — | — | |
| LV-01 | PENDING | — | — | |
| LV-02 | PENDING | — | — | |
| LV-03 | PENDING | — | — | |
| LV-04 | PENDING | — | — | |
| LV-05 | PENDING | — | — | |
| LV-06 | PENDING | — | — | |
| LV-07 | PENDING | — | — | |
| ML-01 | PENDING | — | — | |
| ML-02 | PENDING | — | — | |
| CE-01 | PENDING | — | — | |
| CE-02 | PENDING | — | — | |
| APR-01 | PENDING | — | — | |
| APR-02 | PENDING | — | — | |
| APR-03 | PENDING | — | — | |
| APR-04 | PENDING | — | — | |
| APR-05 | PENDING | — | — | |
| APR-06 | PENDING | — | — | |
| APR-07 | PENDING | — | — | |
| APR-08 | PENDING | — | — | |
| NOT-01 | PENDING | — | — | |
| NOT-02 | PENDING | — | — | |
| RPT-01 | PENDING | — | — | |
| RPT-02 | PENDING | — | — | |
| RPT-03 | PENDING | — | — | |
| RPT-04 | PENDING | — | — | |
| RPT-05 | PENDING | — | — | |
| RPT-06 | PENDING | — | — | |
| RPT-07 | PENDING | — | — | |
| SYS-01 | PENDING | — | — | |
| SYS-02 | PENDING | — | — | |
| SYS-03 | PENDING | — | — | |
| SYS-04 | PENDING | — | — | |
| SYS-05 | PENDING | — | — | |
| SYS-06 | PENDING | — | — | |
| SYS-07 | PENDING | — | — | |
| SYS-08 | PENDING | — | — | |
| SYS-09 | PENDING | — | — | |
| SYS-10 | DONE | BE: 8f9f104, 6266f0d, 108ebc9, 723b19a, 8df0c94, c5d37ac, 597dc4b, f4215b4, 8d0f793 / FE: 28b9646, 8b94ee5 | Railway autodeploy OK | SecurityAuditRunner 36 test (SEC-31,32,34~37 eklendi), SecurityAuditTab UI, test data cleanup, crash-proof infra, FIX-01~03 RBAC fix'leri |
| SYS-11 | PENDING | — | — | |
| SYS-12 | PENDING | — | — | |
| SYS-13 | PENDING | — | — | |
| SYS-14 | PENDING | — | — | |
| SYS-15 | PENDING | — | — | |
| SYS-16 | PENDING | — | — | |
| SYS-17 | PENDING | — | — | |
| EXT-01 | PENDING | — | — | |
| EXT-02 | PENDING | — | — | |

---

## 3) Feature Logs

### AUTH-01 — JWT Login (Giris)
- **Status:** DONE
- **What we changed:**
  - "Sifremi Unuttum?" placeholder link -> bilgilendirme popup'i (yetkili sifre degistirir, sonra Profil'den guncelle)
  - "Beni Hatirla" default `false` -> `true` (localStorage kullanarak sekmeler arasi oturum korunur)
  - Login arka plan fotoğrafi geri getirildi: CDN URL -> local `public/login-bg.jpg`
  - Copyright guncellendi: "© 2025 Mega Insaat A.S." -> "© 2026 Mega Muhendislik Musavirlik Tic. Ltd. Sti."
- **Commits:** `ab627bd` (popup + remember-me), `cdd5e8a` (bg image + copyright)
- **Files changed:** `src/pages/Login.jsx`, `public/login-bg.jpg` (new)
- **Manual checks:**
  - Login sayfasi aciliyor, sol tarafta kopru/insaat fotoğrafi gorunuyor
  - "Beni Hatirla" default isretli
  - "Sifremi Unuttum?" tiklaninca popup aciliyor, "Anladim" ile kapaniyor
  - Copyright dogru: "© 2026 Mega Muhendislik Musavirlik Tic. Ltd. Sti."
  - Login flow calisiyor (dogru/yanlis sifre)
- **Deploy notes:** Railway autodeploy tetiklendi, frontend NIXPACKS build

### AUTH-02 — Token Refresh
- **Status:** DONE (no code changes needed)
- **What we verified:**
  - Access token bozulunca tek bir `POST /api/token/refresh/` cagrisi yapildi, orijinal istek retry edildi
  - Paralel 401'lerde `failedQueue` pattern calisti: tek refresh + queue'dan retry
  - Invalid refresh token'da tum token'lar temizlendi, `/login`'e redirect oldu
- **Commits:** Yok (degisiklik gerekmedi)
- **Files changed:** Yok
- **Manual checks:** Kullanici tarafindan prod'da dogrulandi
- **Deploy notes:** Deploy yok

### ORG-07 — Yonetici Hiyerarsisi (Matrix)
- **Status:** DONE
- **What we changed:**
  - **Phase 1 — Model Refactoring:**
    - EmployeeManager.relationship_type: `CROSS` → `SECONDARY` rename (migration 0119)
    - `reports_to` field → ilk PRIMARY manager'dan otomatik sync (migration 0120)
    - Frontend'te tum CROSS referanslari SECONDARY'ye guncellendi
  - **Phase 2 — Validation & Shared Component:**
    - `ManagerAssignmentSection.jsx` (YENİ): Primary/Secondary yonetici atama icin paylasilan component
    - Backend `validate_manager_entries()` + `is_board_exempt()` helper fonksiyonlari
    - EmployeeCreateSerializer.validate() + EmployeeUpdateSerializer.validate(): zorunlu birincil yonetici (board exempt), duplicate/self-assignment prevention, row-level alan kontrolu
    - Employees.jsx + EmployeeDetail.jsx: ~170 satir tekrarli inline kod → shared component
    - `alert()` → `react-hot-toast` (toast.success/error)
    - Inline validasyon: kirmizi border + "Zorunlu"/"Tekrar" hata mesajlari
    - Board muafiyet: dept.code BOARD* veya pos.key BOARD_* ise birincil yonetici opsiyonel
- **Commits:**
  - Backend: `9fb028e` (CROSS→SECONDARY rename), `5be42ac` (reports_to sync migration), `5bbedc0` (serializer validation)
  - Frontend: `43f5f15` (CROSS→SECONDARY UI), `a50cd23` (reports_to field removal), `9e345ef` (shared component + validation)
- **Files changed:**
  - Backend: `core/models.py`, `core/serializers.py`, `core/migrations/0119_*`, `core/migrations/0120_*`
  - Frontend: `src/components/ManagerAssignmentSection.jsx` (NEW), `src/pages/Employees.jsx`, `src/pages/EmployeeDetail.jsx`
- **Manual checks:**
  - Yeni calisan: birincil yonetici olmadan Step 2 gecilemez
  - Board uyesi: birincil yonetici olmadan kayit olabilir
  - Yonetici secimi: dept + pos otomatik dolur
  - Duplicate: ayni kisi 2 kez secilemez (dropdown'da gorunmez)
  - Bos satir: submit'te kirmizi border + "Zorunlu" hata mesaji
  - Backend: validasyonsuz API istegi → 400 + Turkce hata
  - EmployeeDetail: mevcut yoneticiler dogru yuklenir, ayni kurallar gecerli
  - Build: `npm run build` hatasiz
- **Deploy notes:** Railway autodeploy her iki repo icin tetiklendi

### AUTH-03A — Security Audit Tab + Sidebar Fix + Token Refresh Sync
- **Status:** DONE (AUTH-03 kapsaminda ek calisma)
- **What we changed:**
  - **SecurityAuditTab (FE):** `/admin/system-health` icinde yeni tab — SecurityAuditRunner'i calistir, sonuclari goruntule, test verilerini temizle
  - **FIX-15 Sidebar RBAC fix:** `MainLayout.jsx:146` — `user.all_permissions?.includes(p)` → `hasPermission(p)` (SYSTEM_ADMIN sidebar gorunurlugu duzeltildi)
  - **FIX-16 Token Refresh Permission Sync:** `api.js` refresh interceptor'da `/employees/me/` cagrilarak permission'lar guncelleniyor
  - **DashboardTab unicode fix:** Turkce karakter bozukluklari duzeltildi
- **Commits:**
  - Frontend: `28b9646` (security audit tab + sidebar fix + token refresh sync), `eeffb46` (DashboardTab unicode), `8b94ee5` (test data cleanup button)
- **Files changed:**
  - Frontend: `src/pages/SecurityAuditTab.jsx` (NEW), `src/layouts/MainLayout.jsx`, `src/services/api.js`, `src/pages/DashboardTab.jsx`

### ORG-09 — Org Chart Drag & Drop (Surukle-Birak Atama)
- **Status:** DONE
- **What we changed:**
  - **Phase 1 — Backend Enrichment:**
    - Hierarchy API'ye `department_id` + `job_position_id` eklendi (build_employee_tree)
    - `ACTION_ORG_CHART_MANAGER_ASSIGN` permission olusturuldu (SYSTEM_ADMIN only) — migration 0121
    - Test data: Evren→Aykut, Mehmet→Buse birincil yonetici atamalari — migrations 0122, 0123
  - **Phase 2 — Frontend D&D:**
    - `useOrgChartDnD.js` (YENi): Native HTML5 D&D hook — drag/drop state, API cagrilari, confirmation flow
    - `ReassignConfirmModal.jsx` (YENi): Portal-rendered onay modali, PRIMARY/SECONDARY secimi, loading state
    - `OrgChartContextMenu.jsx` (YENi): Sag tik menu — "Yoneticileri Duzenle" ile ManagerEditModal'i ac
    - `OrganizationChart.jsx`: EmployeeNode + DepartmentNode D&D entegrasyonu, visual feedback (ring, opacity, cursor)
    - Edit mode gating: `ACTION_ORG_CHART_MANAGER_ASSIGN` permission kontrolu
  - **Phase 3 — Bug Fixes:**
    - `isSaving` guard: drag sirasinda API cagrisini engelle
    - Self-assignment defense-in-depth: confirmReassignment icinde ek kontrol
    - Duplicate detection: `setPendingReassignment(null)` eklendi (modal kapanma)
    - Null fallback: `department_id || null`, `job_position_id || null`
    - DepartmentNode: `onMouseDown stopPropagation` (pan/zoom cakismasi)
    - OrgChartContextMenu: viewport kenar tespiti iyilestirmesi
    - ReassignConfirmModal: sadece tiklanan buton loading gosterir
  - **Phase 4 — Security Tests (SEC-20~30):**
    - SEC-20: Yetkisiz employee manager reassignment → 403
    - SEC-21~25: Org chart edit suite (yetkisiz hierarchy erisimi, yetkisiz recalculate, vs.)
    - SEC-26: Employee data integrity audit (hierarchy tutarliligi)
    - SEC-27: Self-assignment prevention → 400
    - SEC-28: Duplicate manager same list → 400
    - SEC-29: Cross-type duplicate (PRIMARY+SECONDARY) → 400
    - SEC-30: Null department_id/job_position_id graceful → not 500
- **Commits:**
  - Backend: `433f71b` (hierarchy API), `3351339` (permission migration 0121), `dfcb462` (manager assignments 0122), `85cb3aa`/`13f9fef` (fix 0123), `c5d37ac` (SEC-20), `597dc4b` (SEC-21~25), `f4215b4` (SEC-26), `8d0f793` (SEC-27~30)
  - Frontend: `319f293` (D&D feature), `d67390b` (context menu + multi-manager), `8b22bea` (edit mode gating), `431b463` (bug fixes + UX)
- **Files changed:**
  - Backend: `core/views.py` (build_employee_tree), `core/security_audit_runner.py` (SEC-20~30), `core/migrations/0121_*`, `0122_*`, `0123_*`
  - Frontend: `src/pages/useOrgChartDnD.js` (NEW), `src/pages/ReassignConfirmModal.jsx` (NEW), `src/pages/OrgChartContextMenu.jsx` (NEW), `src/pages/OrganizationChart.jsx`, `src/pages/ManagerEditModal.jsx`
- **Manual checks:**
  - Edit mode KAPALI → kartlar suruklenemez, pan normal calisir
  - Edit mode ACIK → kart suruklenebilir, hedef mavi/yesil highlight
  - Employee'ye drop → onay modali → PRIMARY/SECONDARY secimi → Onayla → tree refresh
  - Department'a drop → onay modali → "Departmana tasinacak" → Onayla → tree refresh
  - Kendine drop → hicbir sey olmaz
  - Sag tik → "Yoneticileri Duzenle" → ManagerEditModal acilir
  - Cancel → modal kapanir, degisiklik yok
  - API hata → toast mesaji
  - SecurityAuditRunner: 30/30 PASS
  - `npm run build` hatasiz
- **Deploy notes:** Railway autodeploy her iki repo icin tetiklendi

### SYS-10 — Security Audit Runner (Regression Test)
- **Status:** DONE
- **What we changed:**
  - **SecurityAuditRunner (`core/security_audit_runner.py`):** In-process Django APIClient RBAC test framework, 30 test 11 grupta
  - **Test Gruplari (30 test):**
    - Authentication Basics (SEC-01~03): JWT'siz erisim, yanlis credentials, gecerli token
    - Permission Enforcement (SEC-04~06): PAGE_EMPLOYEES gate, yetkisiz CRUD, excluded_permissions
    - Object-Level Security (SEC-07~09): Attendance scope, leave request scope, dashboard IDOR
    - Admin Endpoint Protection (SEC-10~12): SystemSettings, recalculate-all, wipe-all guard
    - IDOR Prevention (SEC-13~16): Attendance employee_id, stats, live-status, PersonalCalendar
    - Rate Limiting (SEC-17~18): Login brute force, anonymous throttle
    - AllowAny Data Leakage (SEC-19): Secure gate error mesaji PII kontrolu
    - Org Chart Edit Suite (SEC-20~25): Yetkisiz reassignment, hierarchy, recalculate, bulk ops
    - Employee Data Integrity (SEC-26): Hierarchy tutarliligi, yetim kayit kontrolu
    - Manager Assignment Edge Cases (SEC-27~30): Self-assign, duplicate, cross-type, null fields
    - Employee CRUD Access (SEC-31~32): Yetkisiz create/delete → 403
  - **Altyapi:**
    - Crash-proof: garantili test data cleanup (try/finally/on_commit)
    - ALLOWED_HOSTS + SECURE_SSL_REDIRECT bypass
    - DEBUG=True for 500 tracebacks during test
    - `/api/cleanup-security-audit-data/` endpoint
    - Frontend SecurityAuditTab: test calistir, sonuclari goruntule, cleanup butonu
  - **Dashboard IDOR Fix (FIX-10 kismen):**
    - `d339cef`: Dashboard stats employee_id ownership check — deny by default
    - `2022d57`: UnboundLocalError fix ('status' variable name collision)
- **Commits:**
  - Backend: `8f9f104` (crash-proof), `6266f0d` (cleanup endpoint), `108ebc9` (SSL redirect fix), `723b19a` (ALLOWED_HOSTS), `8df0c94` (SERVER_NAME), `c5d37ac`→`8d0f793` (SEC-20~30), `d339cef`+`2022d57` (Dashboard IDOR fix)
  - Frontend: `28b9646` (SecurityAuditTab), `8b94ee5` (cleanup button)
- **Files changed:**
  - Backend: `core/security_audit_runner.py` (NEW, ~1370 lines), `core/views.py` (cleanup endpoint + dashboard IDOR fix), `core/urls.py`
  - Frontend: `src/pages/SecurityAuditTab.jsx` (NEW)

### FIX-01~03 — CRITICAL RBAC Fix'leri
- **Status:** DONE
- **What we changed:**
  - **FIX-01 (EmployeeViewSet):** `core/views.py` — `_check_employee_permission()` eklendi: CREATE/UPDATE/PARTIAL_UPDATE icin PAGE_EMPLOYEES, DELETE icin SYSTEM_FULL_ACCESS. LIST/RETRIEVE acik (12+ frontend component bagimli). SEC-02,31,32 testleri eklendi
  - **FIX-02 (SystemSettingsViewSet):** `core/views.py` — `get_permissions()` method'u ile CUD: `IsSystemAdmin`, read: `IsAuthenticated`. `IsSystemAdmin` yeni DRF permission class (`core/permissions.py`). SEC-03,34 testleri eklendi
  - **FIX-03 (FiscalCalendar assigned_employees):** `attendance/views_calendar.py` — `assigned_employees` GET action'ina `_check_schedule_permission` eklendi (PII exposure fix). SEC-35,36,37 testleri eklendi
  - **Security Audit Runner:** 6 yeni test eklendi (SEC-31,32,34,35,36,37), toplam 36 test
- **Files changed:**
  - `core/permissions.py` — `IsSystemAdmin` class eklendi
  - `core/views.py` — EmployeeViewSet CUD permission checks + SystemSettingsViewSet `get_permissions()`
  - `attendance/views_calendar.py` — `assigned_employees` permission check
  - `core/security_audit_runner.py` — SEC-31~37 testleri

### Diger Bug Fix'ler (Playbook disinda yapilan)
- **`a11218c`** — OrgChart: `alert()` → `toast`, profile navigation eklendi
- **`29bf2aa`** — gate-logs router basename fix
- **`d8ea755`** — DailyScheduleOverride import fix + test data cleanup
- **FIX-10 (KISMI):** Dashboard IDOR — `today_summary` + `stats` employee_id ownership check eklendi. Diger IDOR'lar (live-status, calendar-events) henuz fix'lenmedi

---

## 4) Deploy / Railway Checklist

### Her Push Oncesi
- [ ] `npm run build` (frontend) veya `python manage.py test` (backend) calistir
- [ ] Degisiklik izole ve kucuk mu? (small safe commits)
- [ ] Hassas veri yok mu? (.env, token, sifre)

### Her Push Sonrasi
- [ ] Railway deployment status kontrol et (Active/Failed)
- [ ] Loglarda hata var mi bak
- [ ] Degisen sayfa/endpoint'i prod'da test et

### Rollback
- Railway'den onceki basarili deployment'a rollback yapilabilir
- DB migration iceren rollback'larda ayri migration rollback notu yaz
- Frontend-only degisiklikler icin `git revert <commit>` + push yeterli

### Migration Kurallari (Backend)
- Migration'lar geriye donuk uyumlu (backward-compatible) tasarlanmali
- Drop/rename gibi riskli islemler "iki asamali" yapilmali
- Prod'da migration calistirmadan once backup alin
- Migration fail = deploy durur (start.sh icinde). Hizli fix + tekrar deploy

---

## 5) Background Jobs Reference

| Job | Schedule | Features |
|-----|----------|----------|
| daily_midnight_reset | 00:01 daily | ATT-07, ATT-08 |
| process_annual_leave_accruals | 01:00 daily | LV-03 |
| check_fiscal_calendar_alerts | 09:00 daily | CAL-08 |
| monthly_reconciliation_report | 26th @ 09:00 | RPT-06 |
| update_attendance_periodic | Every 30s | ATT-02, ATT-03 |
| check_absenteeism | Every 30s | ATT-06 |

---

## 6) RBAC Deep Audit (AUTH-03)

> **Audit Date:** 2026-02-22 | **Status:** READ-ONLY — no code changes made
> **Scope:** Frontend + Backend + DB, uctan uca yetki sistemi analizi

---

### A) Backend RBAC Enforcement Map

#### Permission Model
- **Single Source of Truth:** `core/permissions.py:get_effective_permission_codes()` (AUTH-03A fix ile eklendi)
- **Resolution:** Role perms (+ inheritance) + direct_permissions - excluded_permissions
- **Bypass:** Superuser → True (her sey), SYSTEM_ADMIN role → True (her sey)
- **DRF Global Default:** `permission_classes = [IsAuthenticated]` (settings.py:117-126)

#### CRITICAL & HIGH Severity Endpoint'ler

| # | ViewSet | Route | Sorun | Seviye |
|---|---------|-------|-------|--------|
| 1 | **EmployeeViewSet** | `/api/employees/` | **NO permission_classes, NO queryset filter.** Herhangi auth user tum calisanlari listeleyebilir, herhangi birini guncelleyebilir, **SILEBILIR** (hard delete + Django User silme) | **CRITICAL** |
| 2 | **SystemSettingsViewSet** | `/api/settings/` | Full CRUD, **NO RBAC.** Herhangi auth user sistem ayarlarini degistirebilir | **CRITICAL** |
| 3 | **FiscalCalendarViewSet** | `/api/attendance/fiscal-calendars/` | Full CRUD, **NO RBAC.** `assign_employees` herhangi calisani takvime atayabilir, `recalculate` toplu hesaplama tetikler | **CRITICAL** |
| 4 | **PersonalCalendarEventViewSet** | `/api/personal-events/` | NO permission_classes, NO queryset filter. Herkesin kisisel etkinliklerinde full CRUD | **HIGH** |
| 5 | **PersonalEventGroupViewSet** | `/api/personal-event-groups/` | Ayni sorun — queryset filter yok | **HIGH** |
| 6 | **FiscalPeriodViewSet** | `/api/attendance/fiscal-periods/` | NO permission_classes. Herkes donem olusturabilir/silebilir (immutability kontrolunu etkiler) | **HIGH** |
| 7 | **DailyScheduleOverrideViewSet** | `/api/attendance/daily-overrides/` | Full CRUD + `bulk_delete` NO RBAC. Toplu silme + recalculation tetikler | **HIGH** |
| 8 | **WorkScheduleViewSet** | `/api/work-schedules/` | Full CRUD, NO RBAC | **HIGH** |
| 9 | **PublicHolidayViewSet** | `/api/public-holidays/` | Full CRUD, NO RBAC | **HIGH** |
| 10 | **MonthlyReportViewSet** | `/api/monthly-reports/` | NO RBAC. Herkes herkes icin Excel/PDF export yapabilir | **HIGH** |
| 11 | **ScheduleTemplateViewSet** | `/api/attendance/schedule-templates/` | Full CRUD, NO RBAC | **HIGH** |
| 12 | **DayTemplateAssignmentViewSet** | `/api/attendance/day-assignments/` | Full CRUD + `bulk_assign`/`bulk_remove` NO RBAC | **HIGH** |
| 13 | **GateEventLogViewSet** | `/api/gate-logs/` | Tum gate log'lari herkese acik | **HIGH** |
| 14 | DepartmentViewSet.`full_debug` | `/api/departments/full_debug/` | Tum dept/role/perm/employee veri dokumu, NO RBAC | **HIGH** |

#### IDOR (Object-Level) Aciklari

| # | Endpoint | Sorun | Seviye |
|---|----------|-------|--------|
| IDOR-01 | `GET /api/attendance/today_summary/?employee_id=X` | Herkes herkesin gunluk puantajini gorebilir. Kod yorumu: "let's assume if you can query, you can view summary" | **HIGH** |
| IDOR-02 | `GET /api/attendance/stats/?employee_id=X` | Herkes herkesin istatistik verisini gorebilir | **HIGH** |
| IDOR-03 | `GET /api/dashboard/stats/?department_id=X` | Herkes herhangi departmanin tum calisan verisini gorebilir | **HIGH** |
| IDOR-04 | `GET /api/monthly-reports/export_excel/?employee_id=X` | Herkes herkes icin detayli rapor export edebilir | **HIGH** |
| IDOR-05 | `GET /api/attendance/live-status/{pk}/status/` | PK ile herkesin canli durumunu sorgulanabilir | MEDIUM |
| IDOR-06 | `GET /api/calendar-events/?employee_id=X` | Baskasinin kisisel takvim etkinlikleri gorulebilir | MEDIUM |

#### Duzgun Korunan Endpoint'ler (OK)

| ViewSet | Koruma | Detay |
|---------|--------|-------|
| AttendanceViewSet | get_queryset scope | superuser→all, manager→team, else→self |
| OvertimeRequestViewSet | queryset + APPROVAL_OVERTIME | Approve/reject/override korunmus |
| MealRequestViewSet | queryset (own) | OK |
| MealOrderViewSet | PAGE_MEAL_ORDERS | Her action'da check |
| CardlessEntryRequestViewSet | queryset + APPROVAL_CARDLESS_ENTRY | views_requests.py versiyonu korunmus |
| LeaveRequestViewSet | queryset + CanManageLeaveRequests + APPROVAL_LEAVE | Object-level perm class var |
| SystemHealthViewSet | SYSTEM_FULL_ACCESS | Her action'da `_check_perm()` |
| SystemDataViewSet | HasDataManagePermission | Custom perm class |
| ExternalProgramViewSet | PAGE_PROGRAM_MANAGEMENT | Her method'da `check_permission()` |
| NotificationViewSet | queryset (own) | OK |
| SubstituteAuthorityViewSet | queryset scope + SYSTEM_FULL_ACCESS | OK |

#### AllowAny Endpoints

| Endpoint | Guvence | Risk |
|----------|---------|------|
| `POST /api/attendance/secure-gate/` | Fernet encryption + event_id dedup. **AMA rate limit yok!** | **MEDIUM** |
| `POST /api/external-auth/login/` | program_key UUID + credentials. **Rate limit yok!** | **MEDIUM** |
| `POST /api/token/` | Rate limit 10/min | LOW |
| `POST /api/token/refresh/` | Refresh token required | LOW |

#### Destructive/Admin Endpoints

| Endpoint | Action | Permission | Seviye |
|----------|--------|------------|--------|
| `DELETE /api/employees/{pk}/` | Hard-delete employee + User | **NONE** | **CRITICAL** |
| `PUT/DELETE /api/settings/{pk}/` | Sistem ayarlari degistir | **NONE** | **CRITICAL** |
| `POST .../fiscal-calendars/{id}/recalculate/` | Toplu attendance recalc | **NONE** | **CRITICAL** |
| `POST .../fiscal-calendars/{id}/generate_periods/` | Donem olustur/sil | **NONE** | **HIGH** |
| `POST .../daily-overrides/bulk_delete/` | Toplu override silme | **NONE** | **HIGH** |
| `POST .../day-assignments/bulk_assign/` | Toplu sablon atama | **NONE** | **HIGH** |
| `POST .../day-assignments/bulk_remove/` | Toplu sablon silme | **NONE** | **HIGH** |
| `POST /api/attendance/recalculate-all/` | Tum calisanlar recalc | SYSTEM_FULL_ACCESS | OK |
| `POST .../wipe_all_employees/` | Tum calisanlari sil | is_superuser | OK |
| DataManagementViewSet | Import/export/backup | PAGE_DATA_MANAGEMENT | OK |

#### Gozlemlenen Sorunlu Patternler
- **Tutarsiz enforcement:** Bazi ViewSet'ler `get_queryset()`'de RBAC, bazilari action-level `has_permission()`, bazilari custom perm class, **cogu hicbir sey yok**
- **`@permission_required` decorator hic kullanilmiyor** — tanimli ama sifir kullanim
- **DRF-level admin perm class yok** — her view ad-hoc `SYSTEM_FULL_ACCESS` kontrol ediyor
- **`CanManageLeaveRequests.has_permission()` her zaman True doner** — sadece `has_object_permission()` korur (list endpoint'leri kapsamaz)

---

### B) DB Role/Permission Data Audit

#### Permission Registry (17 permissions)

| ID | Code | Category | Backend Enforce? | Frontend Enforce? | Durum |
|----|------|----------|-----------------|-------------------|-------|
| 138 | ACTION_ORG_CHART_EDIT | ACTION | **HAYIR** (sadece migration) | EVET (OrgChart.jsx) | BACKEND ORPHAN |
| 139 | FEATURE_BREAK_ANALYSIS | ACTION | **HAYIR** | **HAYIR** (sadece display) | DEAD CODE |
| 142 | APPROVAL_CARDLESS_ENTRY | APPROVAL | EVET (views_requests.py) | HAYIR | OK |
| 143 | APPROVAL_EXTERNAL_TASK | APPROVAL | **HAYIR** (APPROVAL_LEAVE kullaniliyor) | **HAYIR** | DEAD CODE |
| 140 | APPROVAL_LEAVE | APPROVAL | EVET (leave/views.py, views_requests.py) | EVET (Requests.jsx) | OK |
| 141 | APPROVAL_OVERTIME | APPROVAL | EVET (attendance/views.py) | EVET (Requests.jsx) | OK |
| 136 | PAGE_DATA_MANAGEMENT | PAGE | EVET (views_data.py) | EVET (App.jsx) | OK |
| 137 | PAGE_DEBUG | PAGE | **HAYIR** (SYSTEM_FULL_ACCESS) | EVET (App.jsx) | BACKEND ORPHAN |
| 130 | PAGE_EMPLOYEES | PAGE | **HAYIR** (ViewSet RBAC yok!) | EVET (App.jsx) | BACKEND ORPHAN |
| 134 | PAGE_MEAL_ORDERS | PAGE | EVET (views_meal.py) | EVET (App.jsx) | OK |
| 131 | PAGE_ORG_CHART | PAGE | EVET (views.py:628) | EVET (App.jsx) | OK |
| 146 | PAGE_PROGRAM_MANAGEMENT | PAGE | EVET (views_external.py) | EVET (App.jsx) | OK |
| 133 | PAGE_REPORTS | PAGE | **HAYIR** (sadece migration) | EVET (App.jsx) | BACKEND ORPHAN |
| 135 | PAGE_SYSTEM_HEALTH | PAGE | **HAYIR** (SYSTEM_FULL_ACCESS) | EVET (App.jsx) | BACKEND ORPHAN |
| 132 | PAGE_WORK_SCHEDULES | PAGE | **HAYIR** (sadece migration) | EVET (App.jsx) | BACKEND ORPHAN |
| 158 | AUTO_APPROVE | SYSTEM | EVET (attendance/views.py, leave/views.py) | HAYIR | OK |
| 144 | SYSTEM_FULL_ACCESS | SYSTEM | EVET (views_health.py, core/views.py) | EVET (AuthContext.jsx) | OK |
| — | MANAGE_SUBSTITUTE | — | **DB'DE YOK** | EVET (SubstituteManagement.jsx) | PHANTOM |

#### Role Hierarchy (15 roles)

| Key | Perm Count | Emp Count | Inherits From | Not |
|-----|-----------|-----------|---------------|-----|
| SYSTEM_ADMIN | 17 (HEPSI) | **0** | — | UYARI: Kimseye atanmamis! |
| ROLE_PROJECT_MANAGER | 7 | 2 | — | |
| ROLE_DEPARTMENT_MANAGER | 7 | 0 | — | Kullanilmiyor |
| ROLE_CHIEF | 6 | 0 | — | Kullanilmiyor |
| SENIOR_ACCOUNTING | 9 | 0 | — | Kullanilmiyor |
| ROLE_ACCOUNTING | 9 | 0 | — | Kullanilmiyor |
| ROLE_SENIOR_ENGINEER | 4 | 0 | — | Kullanilmiyor |
| ROLE_ENGINEER | 4 | 0 | — | Kullanilmiyor |
| SENIOR_TECHNICIAN | 4 | 0 | — | Kullanilmiyor |
| ROLE_TECHNICIAN | 4 | 0 | — | Kullanilmiyor |
| ROLE_EMPLOYEE | 4 | 13 | — | Ana rol |
| EMPLOYEE | 4 | 12 | — | Cift rol sorunu? |
| EMERGENCY_ADMIN | 2 | 1 | — | SYSTEM_FULL_ACCESS var |
| MANAGER | **0** | 3 | — | UYARI: Permission'siz bos rol! |
| ROLE_CEO | **0** | 1 | — | UYARI: Permission'siz bos rol! |

#### Employee Distribution

| Metrik | Deger |
|--------|-------|
| Toplam calisan | 14 |
| Aktif calisan | 14 |
| Role atanmis | 14 (100%) |
| Direct permission | **0** (kullanilmiyor) |
| Excluded permission | **0** (kullanilmiyor) |
| SYSTEM_FULL_ACCESS sahipleri | 1 (Gate Tester, EMERGENCY_ADMIN uzerinden) |
| Role inheritance | **0** (hic kullanilmiyor) |

#### Phantom / Dead Code Permissions

| Code | Durum | Detay |
|------|-------|-------|
| **MANAGE_SUBSTITUTE** | **PHANTOM** | Frontend'de kontrol ediliyor (SubstituteManagement.jsx:360,366,369) ama **DB'de TANIMLI DEGIL**. `hasPermission('MANAGE_SUBSTITUTE')` her zaman `false` doner → sadece SYSTEM_FULL_ACCESS kullanicilar substitute yonetebilir |
| **APPROVAL_EXTERNAL_TASK** | **DEAD CODE** | 11 role atanmis ama **hicbir view/service'de enforce edilmiyor**. External duty request onaylari aslinda `APPROVAL_LEAVE` kullaniyor (views_requests.py:594) |
| **FEATURE_BREAK_ANALYSIS** | **DEAD CODE** | 4 role atanmis ama backend'de hicbir yerde kontrol edilmiyor. Frontend sadece PermissionsTab'da gosteriyor |
| **PAGE_DEBUG** | **BACKEND ORPHAN** | Frontend route-gate var ama backend debug endpoint'leri `SYSTEM_FULL_ACCESS` kontrol ediyor, `PAGE_DEBUG` degil |
| **PAGE_REPORTS** | **BACKEND ORPHAN** | Frontend route-gate var ama backend report endpoint'leri kontrol etmiyor |
| **PAGE_SYSTEM_HEALTH** | **BACKEND ORPHAN** | Frontend route-gate var ama backend `SYSTEM_FULL_ACCESS` kullaniyor |
| **PAGE_WORK_SCHEDULES** | **BACKEND ORPHAN** | Frontend route-gate var ama backend schedule endpoint'leri kontrol etmiyor |
| **PAGE_EMPLOYEES** | **BACKEND ORPHAN** | Frontend route-gate var ama backend EmployeeViewSet **hic permission kontrolu yok** |

#### Risk Notlari

| # | Risk | Seviye | Aciklama |
|---|------|--------|----------|
| DB-01 | SYSTEM_ADMIN rolu bos | **HIGH** | 17 permission ile en guclu rol ama 0 calisan atanmis. Admin is_superuser ile calisiyor; superuser kalkarsa sadece ROLE_EMPLOYEE yetkisi kalir |
| DB-02 | MANAGER ve ROLE_CEO rolleri permission'siz | **MEDIUM** | 3+1 calisan bu rollerde ama roller 0 permission icerir. Manager fonksiyonu EmployeeManager hiyerarsisi uzerinden calisiyor, role uzerinden degil |
| DB-03 | ROLE_EMPLOYEE vs EMPLOYEE cift rol | **LOW** | Ayni 4 permission, 12 calisan ikisine de atanmis. Birlestirilmeli |
| DB-04 | 9/15 rol kullanilmiyor | **LOW** | Cleanup adayi (test/staging data — prod'da farkli olabilir) |
| DB-05 | Role inheritance kullanilmiyor | **INFO** | inherits_from hicbir rolde dolu degil — flat rol yapisI |
| DB-06 | direct/excluded_permissions kullanilmiyor | **INFO** | 0 calisan bu alanlari kullaniyor |
| DB-07 | ACTION_ORG_CHART_EDIT enforce edilmiyor | **MEDIUM** | DB'de var ama backend'de cagrisi yok (sadece migration) |
| DB-08 | APPROVAL_EXTERNAL_TASK dead code | **MEDIUM** | 11 role atanmis ama hicbir yerde enforce edilmiyor — external duty APPROVAL_LEAVE kullaniyor |
| DB-09 | MANAGE_SUBSTITUTE phantom permission | **MEDIUM** | Frontend kontrol ediyor ama DB'de tanimli degil — daima false doner |
| DB-10 | EMERGENCY_ADMIN = yarim superuser | **MEDIUM** | SYSTEM_FULL_ACCESS sahip → tum admin endpoint'lere erisim, backend'de superuser kadar guclu |
| DB-11 | Test User'da EMPLOYEE role duplicate | **LOW** | employee_roles join tablosunda EMPLOYEE 2 kez atanmis (data quality) |

---

### C) Frontend Gating Consistency

#### Route Permission Map

| Route | Component | FE Permission | BE Enforcement | Tutarli? |
|-------|-----------|---------------|----------------|----------|
| `/` | Dashboard | — | IsAuthenticated | EVET |
| `/profile` | Profile | — | IsAuthenticated | EVET |
| `/company-directory` | CompanyDirectory | — | IsAuthenticated | EVET |
| `/employees` | Employees | PAGE_EMPLOYEES | **NONE (full CRUD acik!)** | **HAYIR — CRITICAL** |
| `/employees/:id` | EmployeeDetail | PAGE_EMPLOYEES | **NONE** | **HAYIR — CRITICAL** |
| `/organization-chart` | OrgChart | PAGE_ORG_CHART | PAGE_ORG_CHART (queryset) | EVET |
| `/attendance` | Attendance | — | IsAuthenticated (queryset scope) | EVET |
| `/attendance-tracking` | AttendanceTracking | — | IsAuthenticated | EVET |
| `/calendar` | CalendarPage | — | IsAuthenticated | EVET |
| `/work-schedules` | WorkSchedules | PAGE_WORK_SCHEDULES | **NONE (full CRUD acik!)** | **HAYIR — HIGH** |
| `/public-holidays` | PublicHolidays | PAGE_WORK_SCHEDULES | **NONE (full CRUD acik!)** | **HAYIR — HIGH** |
| `/requests` | Requests | — | IsAuthenticated + object-level | EVET |
| `/substitute-management` | SubstituteManagement | — | queryset scope | EVET |
| `/reports` | Reports | PAGE_REPORTS | **NONE (export acik!)** | **HAYIR — HIGH** |
| `/admin/system-health` | SystemHealth | PAGE_SYSTEM_HEALTH | SYSTEM_FULL_ACCESS | EVET (BE daha siki) |
| `/admin/service-control` | ServiceControl | PAGE_SYSTEM_HEALTH | SYSTEM_FULL_ACCESS | EVET |
| `/meal-orders` | MealOrders | PAGE_MEAL_ORDERS | PAGE_MEAL_ORDERS | EVET |
| `/system-data-management` | DataManagement | PAGE_DATA_MANAGEMENT | PAGE_DATA_MANAGEMENT | EVET |
| `/debug/attendance` | AttendanceDebugger | PAGE_DEBUG | **NONE** | **HAYIR — HIGH** |
| `/program-management` | ProgramManagement | PAGE_PROGRAM_MANAGEMENT | PAGE_PROGRAM_MANAGEMENT | EVET |

#### Sidebar Bug (Yeni Bulgu)

**MainLayout.jsx:146** — Sidebar filtresi `user.all_permissions?.includes(p)` kullanir, `hasPermission(p)` DEGiL. Bu yuzden:
- Superuser → sidebar tum ogeleri gosterir (line 139 check) ✓
- SYSTEM_ADMIN (non-superuser, SYSTEM_FULL_ACCESS var) → sidebar permission-gated ogeleri **GOSTERMEZ** cunku `includes()` bypass uygulamaz
- Sonuc: SYSTEM_ADMIN kullanicisi sidebar'da admin menuleri goremez ama ProtectedRoute gecebilir

> **UYARI:** Frontend gating guvenlik DEGILDIR — sadece UX. Tum enforcement server-side olmali.

---

### D) Security Review — IDOR, Cache, Cross-cutting

#### Permission Cache

| # | Sorun | Etki | Seviye |
|---|-------|------|--------|
| CACHE-01 | Backend `_flexible_perm_cache` request-scoped | Her request'te DB'den taze. **Sorun yok** | INFO |
| CACHE-02 | Frontend permission sadece login'de fetch | Rol degisimi sonrasi re-login gerekli | **MEDIUM** |
| CACHE-03 | JWT icinde permission yok | Her request DB'den kontrol — **iyi** | INFO |
| CACHE-04 | Token refresh permission'lari yenilemez | `api.js` sadece token gunceller, `/employees/me/` cagirmaz | **MEDIUM** |

#### Self-Approval Prevention

| Workflow | Korunmus? | Detay |
|----------|-----------|-------|
| Overtime approve | **HAYIR** | Manager kendi mesai talebini olusturup onaylayabilir |
| Leave approve | **KISMI** | CanApproveLeaveRequests manager check var ama self-manager-loop korumasi yok |
| Cardless entry | **HAYIR** | Explicit self-check yok |
| AUTO_APPROVE | **TASARIM GEREGI** | AUTO_APPROVE permission'li calisan kendi talebini otomatik onaylar |

#### Rate Limiting Eksikleri

| Endpoint | Durum | Oneri |
|----------|-------|-------|
| `/api/attendance/secure-gate/` | AllowAny + **rate limit YOK** | IP-bazli 60/min ekle |
| `/api/external-auth/login/` | AllowAny + **rate limit YOK** | 10/min ekle |
| `/api/token/refresh/` | Default 300/min | 30/min'e dusur |
| Password change | Default 300/min | 5/min'e dusur |

#### JWT Lifecycle

| Konu | Bulgu | Seviye |
|------|-------|--------|
| Access token suresi | 5 saat — rol revoke edilirse 5 saat erisim devam eder | **MEDIUM** |
| Token blacklisting | Yok — ama `is_active` check backend'de var | LOW |
| Token refresh | Permission'lari yenilemez (sadece token) | **MEDIUM** |

---

### E) RBAC Manuel Test Checklist (15 Adim)

#### Test 1: Yetkisiz URL Erisimi
- **On kosul:** PAGE_EMPLOYEES yetkisi olmayan calisan
- **Adimlar:** (1) Login, (2) Tarayicida `/employees` elle yaz
- **Beklenen:** Frontend "Erisim Reddedildi" + backend 403
- **Gecis/Kalma:** Sayfa acilmiyorsa GECTI

#### Test 2: Rol Degisimi Sonrasi Cache
- **On kosul:** Calisan A — PAGE_REPORTS yetkili rol
- **Adimlar:** (1) A login, (2) `/reports` eris (OK), (3) Admin rolu degistir, (4) A refresh
- **Beklenen:** Refresh sonrasi erisim kesilmeli
- **Gecis/Kalma:** Erisim kesiliyorsa GECTI; hala aciksa KALDI (CACHE-02)

#### Test 3: excluded_permissions Senaryosu
- **On kosul:** Role ile PAGE_EMPLOYEES var + excluded_permissions'a da ekle
- **Adimlar:** (1) Login, (2) `/employees` git, (3) API cagir
- **Beklenen:** Frontend + backend reddeder
- **Gecis/Kalma:** 403 donuyorsa GECTI

#### Test 4: Object-Level Erisim (IDOR)
- **On kosul:** Normal calisan A, farkli departmanda B
- **Adimlar:** (1) A login, (2) `GET /api/attendance/?employee_id={B_id}`
- **Beklenen:** B verileri gorunmemeli
- **Gecis/Kalma:** Bos sonucsa GECTI

#### Test 5: Superuser Bypass
- **On kosul:** Superuser + excluded_permissions
- **Adimlar:** (1) Login, (2) Tum sayfalari gez
- **Beklenen:** Her yer acik (superuser bypass)
- **Gecis/Kalma:** Hepsi aciksa GECTI

#### Test 6: SYSTEM_ADMIN Bypass
- **On kosul:** SYSTEM_ADMIN rolu (non-superuser)
- **Adimlar:** (1) Login, (2) Tum API endpoint'leri test et
- **Beklenen:** Backend her seye erisim vermeli. **Sidebar bug:** menu ogeleri gorunmeyebilir
- **Gecis/Kalma:** API 200 donuyorsa GECTI (sidebar bug ayri ticket)

#### Test 7: JWT'siz API Erisimi
- **On kosul:** Token yok
- **Adimlar:** `curl -X GET https://mega.report/api/employees/`
- **Beklenen:** 401 Unauthorized
- **Gecis/Kalma:** 401 donuyorsa GECTI

#### Test 8: Token Expiry + Refresh
- **On kosul:** Gecerli oturum, access token expire
- **Adimlar:** (1) Expire bekle, (2) Sayfa islemi yap
- **Beklenen:** Otomatik refresh, islem basarili, permission'lar ayni
- **Gecis/Kalma:** Kesintisiz calisiyorsa GECTI

#### Test 9: Cross-Manager Siniri
- **On kosul:** Manager A (Dept X), Calisan C (Dept Y, Manager B)
- **Adimlar:** (1) A login, (2) C'nin leave request'ini onaylamaya calis
- **Beklenen:** 403 (A, C'nin manageri degil)
- **Gecis/Kalma:** 403 donuyorsa GECTI

#### Test 10: AllowAny Veri Sizintisi
- **On kosul:** Auth yok
- **Adimlar:** (1) `POST /api/attendance/secure-gate/` bos, (2) `POST /api/external-auth/login/` bos
- **Beklenen:** Generic hata, PII yok
- **Gecis/Kalma:** Calisan adi/veri sizdirmiyorsa GECTI

#### Test 11: Frontend vs Backend Gap
- **On kosul:** PAGE_WORK_SCHEDULES yetkisi olmayan calisan
- **Adimlar:** (1) Login, (2) Sidebar'da menu gizli (dogru), (3) `curl /api/attendance/schedule-templates/`
- **Beklenen:** API 403 donmeli
- **Gecis/Kalma:** 200 donuyorsa KALDI — **BEKLENEN BUG (FE-01)**

#### Test 12: Role Inheritance
- **On kosul:** Role B inherits from A (A'da PAGE_REPORTS), calisan Role B'de
- **Adimlar:** (1) Login, (2) `/reports` git
- **Beklenen:** Erisim acik (inherit)
- **Not:** Inheritance su an kullanilmiyor (DB-05), test icin setup gerekli

#### Test 13: Direct + Excluded Etkilesimi
- **On kosul:** direct_permissions'a PAGE_REPORTS + excluded_permissions'a da ekle
- **Adimlar:** (1) Login, (2) `/reports` git
- **Beklenen:** Erisim reddedilmeli (excluded kazanir — AUTH-03A fix)

#### Test 14: Bulk Operasyon Kisitlamasi
- **On kosul:** Normal calisan
- **Adimlar:** (1) Login, (2) `POST /api/attendance/recalculate-all/` (3) `DELETE /api/employees/{pk}/`
- **Beklenen:** recalculate-all 403, **AMA employee delete BEKLENEN BUG — suan 200 donecek!**

#### Test 15: Esanlamli Oturum Tutarliligi
- **On kosul:** Calisan iki sekmede login
- **Adimlar:** (1) Sekme 1 login, (2) Admin rol degistir, (3) Sekme 2 refresh
- **Beklenen:** Sekme 2 yeni rolleri gormeli. Backend aninda gecerli (per-request), frontend refresh gerekir

---

### F) Aksiyonlar (FIX PLANLARI — Oncelik Sirasi)

> Asagidaki fix'ler icin ayri PLAN yazilacak, kullanicidan onay bekleniyor.
> **KURAL:** Kod degisikligi yok — sadece plan. Fix gerekirse ayri commit.

#### CRITICAL (Acil)

| # | Baslik | Kapsam | Etki |
|---|--------|--------|------|
| FIX-01 | ~~**EmployeeViewSet'e RBAC ekle**~~ | **DONE** — CUD: PAGE_EMPLOYEES, DELETE: SYSTEM_FULL_ACCESS. READ acik (frontend bagimlilik). SEC-02,31,32 test eklendi | Herkes employee silebilir bugunu kapatir |
| FIX-02 | ~~**SystemSettingsViewSet'e RBAC ekle**~~ | **DONE** — `IsSystemAdmin` perm class eklendi, CUD: IsSystemAdmin, read: IsAuthenticated. SEC-03,34 test eklendi | Sistem ayarlari herkese acik bugunu kapatir |
| FIX-03 | ~~**FiscalCalendarViewSet'e RBAC ekle**~~ | **DONE** — assigned_employees GET'e `_check_schedule_permission` eklendi. SEC-35,36,37 test eklendi | Toplu islemler herkese acik bugunu kapatir |

#### HIGH

| # | Baslik | Kapsam |
|---|--------|--------|
| FIX-04 | PersonalCalendarEvent/Group ViewSet'lere queryset filter ekle | `employee=request.user.employee` |
| FIX-05 | FiscalPeriodViewSet'e RBAC ekle | SYSTEM_FULL_ACCESS |
| FIX-06 | WorkSchedule/PublicHoliday ViewSet'lere RBAC ekle | PAGE_WORK_SCHEDULES (read), SYSTEM_FULL_ACCESS (write) |
| FIX-07 | DailyScheduleOverride/ScheduleTemplate/DayTemplateAssignment'a RBAC ekle | PAGE_WORK_SCHEDULES veya SYSTEM_FULL_ACCESS |
| FIX-08 | MonthlyReportViewSet'e RBAC ekle | PAGE_REPORTS |
| FIX-09 | GateEventLogViewSet'e RBAC ekle | SYSTEM_FULL_ACCESS |
| FIX-10 | ~~IDOR fix: today_summary, stats, dashboard~~ | **KISMI DONE** — Dashboard IDOR fix'lendi (`d339cef`, `2022d57`). live-status, calendar-events IDOR'lari PENDING |
| FIX-11 | Debug endpoint backend perm check | PAGE_DEBUG veya SYSTEM_FULL_ACCESS |
| FIX-12 | DepartmentViewSet.full_debug'a RBAC ekle | SYSTEM_FULL_ACCESS |
| FIX-13 | secure-gate + external-auth'a rate limit ekle | IP-bazli throttle |

#### MEDIUM

| # | Baslik | Kapsam |
|---|--------|--------|
| FIX-14 | Self-approval prevention ekle | OT/Leave/Cardless approve: `if request.employee == obj.employee: reject` |
| FIX-15 | ~~Sidebar hasPermission() bug fix~~ | **DONE** — `28b9646` MainLayout.jsx `includes()` → `hasPermission()` |
| FIX-16 | ~~Token refresh'te permission yenileme~~ | **DONE** — `28b9646` api.js refresh interceptor `/employees/me/` cagiriyor |
| FIX-17 | SYSTEM_ADMIN rolunu birine ata | DB-01 |
| FIX-18 | ~~RoleViewSet/PermissionViewSet'i admin-only yap~~ | **DONE** — PAGE_EMPLOYEES required for list/retrieve |

#### LOW

| # | Baslik | Kapsam |
|---|--------|--------|
| FIX-19 | MANAGER/ROLE_CEO rollerine permission ekle veya kaldir | DB-02 |
| FIX-20 | ROLE_EMPLOYEE/EMPLOYEE birlestirilmesi | DB-03 |
| FIX-21 | Kullanilmayan rolleri temizle (9 adet) | DB-04 |
| FIX-22 | ACTION_ORG_CHART_EDIT / APPROVAL_EXTERNAL_TASK enforce et veya kaldir | DB-07/08 |
| FIX-23 | MANAGE_SUBSTITUTE permission'i DB'ye ekle veya frontend referansini kaldir | DB-09 |
| FIX-24 | FEATURE_BREAK_ANALYSIS dead code temizle veya enforce et | Dead code — 4 role atanmis ama kullanilmiyor |

#### Severity Ozet (Guncellenmis)

| Seviye | Toplam | Kalan | Tamamlanan | En Kritik (Kalan) |
|--------|--------|-------|------------|-------------------|
| **CRITICAL** | 3 | **0** | 3 (FIX-01, FIX-02, FIX-03) | — Hepsi kapatildi |
| **HIGH** | 10 | **9** | 1 (FIX-10 kismi) | PersonalCalendar IDOR, FiscalPeriod, WorkSchedule/Holiday CRUD, Reports export, Gate logs |
| **MEDIUM** | 5 | **2** | 3 (FIX-15, FIX-16, FIX-18) | Self-approval |
| **LOW** | 6 | **6** | 0 | Rol temizligi, unused perms, phantom perms |
| **TOPLAM** | **24** | **17** | **7** | — |

---

## 7) Genel Ilerleme Ozeti

### Tamamlanan Ozellikler (9/88)

| Feature | Kategori | Tarih |
|---------|----------|-------|
| AUTH-01 | Auth & RBAC | JWT Login — popup, remember-me, bg image |
| AUTH-02 | Auth & RBAC | Token Refresh — verify only, no changes needed |
| AUTH-03 | Auth & RBAC | RBAC Deep Audit + excluded_permissions fix + SecurityAuditTab |
| AUTH-04 | Auth & RBAC | Role Management — RoleViewSet + PermissionViewSet PAGE_EMPLOYEES gating |
| AUTH-05 | Auth & RBAC | Password Change — same-password rejection |
| ORG-07 | Organization | Matrix Management — CROSS→SECONDARY, validation, shared component |
| ORG-09 | Organization | Drag & Drop Reassignment — D&D, context menu, SEC-20~30 |
| SYS-10 | System Admin | SecurityAuditRunner — 30 test, 11 group, crash-proof infra |
| FIX-15+16 | RBAC Fix | Sidebar hasPermission + Token refresh permission sync |

### Tamamlanan Guvenlik Fix'leri (7/24)

| Fix | Durum |
|-----|-------|
| FIX-01 | **DONE** — EmployeeViewSet CUD RBAC (PAGE_EMPLOYEES + SYSTEM_FULL_ACCESS) |
| FIX-02 | **DONE** — SystemSettingsViewSet RBAC (IsSystemAdmin perm class) |
| FIX-03 | **DONE** — FiscalCalendarViewSet assigned_employees PII fix |
| FIX-10 | **KISMI** — Dashboard IDOR fix'lendi, diger IDOR'lar PENDING |
| FIX-15 | **DONE** — Sidebar `hasPermission()` bug fix |
| FIX-16 | **DONE** — Token refresh permission sync |
| FIX-18 | **DONE** — RoleViewSet/PermissionViewSet PAGE_EMPLOYEES gating |

### Kalan Is (79 feature + 17 fix)

| Kategori | Toplam | Done | Kalan |
|----------|--------|------|-------|
| Auth & RBAC | 5 | 5 | 0 — Auth fazi tamamlandi |
| Organization | 9 | 2 | 7 (ORG-01~06, ORG-08) |
| Calendar | 9 | 0 | 9 |
| Attendance | 12 | 0 | 12 |
| Gate | 3 | 0 | 3 |
| Overtime | 3 | 0 | 3 |
| Leave | 7 | 0 | 7 |
| Meal | 2 | 0 | 2 |
| Cardless | 2 | 0 | 2 |
| Approvals | 8 | 0 | 8 |
| Notifications | 2 | 0 | 2 |
| Reports | 7 | 0 | 7 |
| System Admin | 17 | 1 | 16 |
| External | 2 | 0 | 2 |
| **TOPLAM** | **88** | **7** | **81** |
| RBAC Fix'ler | 24 | 6 | **18** (0 CRITICAL, 9 HIGH, 3 MEDIUM, 6 LOW) |

### Migration Durumu
- core: 0123 (0118 → 0119, 0120, 0121, 0122, 0123 eklendi)
- attendance: 0043
- leave_requests: 0009

---

## 8) Next Feature

**Sonraki:** BATCH 1 — ORG-01 (Departman Yonetimi)

### Walkthrough Sirasi
```
Auth > Org > Calendar > Attendance > Gate > Overtime > Leave > Meal >
Cardless > Approvals > Notifications > Reports > Admin > External
```

### Oneri: RBAC Fix'ler Oncelikli

> **GUNCELLEME:** 3 CRITICAL RBAC fix (FIX-01, FIX-02, FIX-03) tamamlandi. SEC-31~37 testleri eklendi.
> Bu fix'ler herhangi bir auth user'in employee silebilmesini, sistem ayarlarini degistirebilmesini,
> ve toplu attendance recalculation tetikleyebilmesini engelleyecek.
>
> ~~**Oneri 1 (Guvenlik Oncelikli):** AUTH-04'ten once FIX-01~03 CRITICAL fix'leri yap~~ **TAMAMLANDI**
> **Oneri 2 (Walkthrough Sirasi):** AUTH-04 → AUTH-05 → ORG-01~08 sirasiyla devam et, FIX'leri paralel yap
>
> Her iki durumda da FIX-01~03 en kisa surede implement edilmeli.

### Auth Fazinda Durum
- AUTH-01: DONE ✓
- AUTH-02: DONE ✓
- AUTH-03: DONE ✓ (Deep Audit + SecurityAuditRunner + SecurityAuditTab)
- AUTH-04: DONE ✓ (RoleViewSet + PermissionViewSet → PAGE_EMPLOYEES, FIX-18 uygulandı, SEC-38/39)
- AUTH-05: DONE ✓ (change_password same-password rejection, SEC-40)

### ORG Fazinda Durum
- ORG-07: DONE ✓ (Matrix Management — once yapildi, altyapi)
- ORG-09: DONE ✓ (D&D — ORG-07'nin uzantisi)
- ORG-01~06, ORG-08: PENDING (7 feature)

---

## 9) Sprint Bazli Yol Haritasi (Batch Plani)

> **Tarih:** 2026-02-22 | **Hazirlayan:** Architect Agent (team review)
> **Yaklasim:** Hibrit — CRITICAL fix'ler oncelikli, HIGH fix'ler ilgili feature ile birlikte

### Ozellik Siniflandirmasi

| Kategori | Sayi | Aciklama |
|----------|------|----------|
| TAMAMLANDI | 7 | AUTH-01~03, ORG-07, ORG-09, SYS-10 |
| DOGRULA+FIX | ~55 | Backend+Frontend var, walkthrough ile dogrula + RBAC ekle |
| YENI INSA | ~15-20 | Onemli yeni kod yazimi gerekli |

### BATCH 0 — ACIL GUVENLIK (3 fix + 2 feature) ✅ TAMAMLANDI
**Oncelik: EN YUKSEK | Tum itemlar tamamlandi**

| # | Is | Tip | Tahmini LOC |
|---|--|-----|-------------|
| ~~FIX-01~~ | ~~EmployeeViewSet RBAC~~ | ~~CRITICAL FIX~~ | **DONE** |
| ~~FIX-02~~ | ~~SystemSettingsViewSet RBAC~~ | ~~CRITICAL FIX~~ | **DONE** |
| ~~FIX-03~~ | ~~FiscalCalendarViewSet assigned_employees RBAC~~ | ~~CRITICAL FIX~~ | **DONE** |
| ~~AUTH-04~~ | ~~Role Management~~ | ~~DOGRULA+GELISTIR~~ | **DONE** |
| ~~AUTH-05~~ | ~~Password Change~~ | ~~DOGRULA~~ | **DONE** |

**FIX Implementasyon Detayi (TAMAMLANDI):**
- **FIX-02 DONE:** `core/views.py` → `IsSystemAdmin` DRF perm class eklendi (`core/permissions.py`), CUD: IsSystemAdmin, read: IsAuthenticated
- **FIX-03 DONE:** `attendance/views_calendar.py:96` → `assigned_employees` action'ina `_check_schedule_permission` eklendi
- **FIX-01 DONE:** `core/views.py:944` → CUD: PAGE_EMPLOYEES, DELETE: SYSTEM_FULL_ACCESS. READ acik birakildı (12+ frontend component bagimli). SEC-31,32,34,35,36,37 testleri eklendi
- **AUTH-04 DONE (FIX-18):** `core/views.py` → RoleViewSet + PermissionViewSet list/retrieve → PAGE_EMPLOYEES required. SEC-38/39 testleri eklendi
- **AUTH-05 DONE:** `core/views.py:change_password` → old_password == new_password rejection eklendi. SEC-40 testi eklendi

### BATCH 1 — ORGANIZASYON TEMELI (7 ozellik)
**Bagimlillik: Batch 0 tamamlanmis ✅ | 5/7 paralel**

| # | Ozellik | Tip | Paralel? |
|---|---------|-----|----------|
| ORG-01 | Departman Yonetimi | DOGRULA | Evet |
| ORG-02 | Pozisyon Yonetimi | DOGRULA | Evet |
| ORG-03 | Calisan CRUD | DOGRULA | ORG-01+02 sonrasi |
| ORG-04 | Calisan Detay | DOGRULA | ORG-03 sonrasi |
| ORG-05 | Kisisel Profil | DOGRULA | Evet |
| ORG-06 | Sirket Rehberi | DOGRULA | Evet |
| ORG-08 | Calisan Etiketleri | DOGRULA | Evet |
| ~~FIX-18~~ | ~~RoleViewSet admin-only~~ | ~~FIX-MEDIUM~~ | **DONE** (Batch 0'da tamamlandi) |

### BATCH 2 — TAKVIM & PROGRAM (9 ozellik + 4 fix)
**Bagimlillik: Batch 1 | 3/9 bagimsiz**

| # | Ozellik | Fix |
|---|---------|-----|
| CAL-01 | WorkSchedule (Legacy) | + FIX-06 (RBAC) |
| CAL-06 | Resmi Tatiller | + FIX-06 (RBAC) |
| CAL-02 | Fiscal Calendar | (FIX-03 Batch 0'da) |
| CAL-03 | Schedule Template | + FIX-07 (RBAC) |
| CAL-04 | Gun Bazli Atama | + FIX-07 (RBAC) |
| CAL-05 | Gunluk Override | + FIX-07 (RBAC) |
| CAL-07 | Kisisel Takvim | + FIX-04 (IDOR) |
| CAL-08 | Mali Donem | + FIX-05 (RBAC) |
| CAL-09 | get_day_rules() Motor | — |

### BATCH 3 — PUANTAJ MOTORU + GATE (15 ozellik + 2 fix)
**Bagimlillik: CAL-09 dogrulanmis | 10/15 paralel**

ATT-01~12 + GATE-01~03. FIX-09 (Gate RBAC), FIX-13 (rate limit), FIX-10 kalan IDOR'lar.

### BATCH 4 — TALEPLER & ONAYLAR (22 ozellik + 2 fix)
**Bagimlillik: ATT-02 + ORG-03 | 3 alt grup**

- **4A — Talep Olusturma (paralel):** OT-01, OT-03, LV-01, LV-04, ML-01, CE-01
- **4B — Onay Workflow (sirayla):** APR-01, OT-02, LV-02, CE-02, ML-02, APR-02, APR-08 + FIX-14
- **4C — Ileri Ozellikler:** LV-03, LV-05~07, APR-03~07

### BATCH 5 — RAPORLAMA & BILDIRIMLER (9 ozellik + 2 fix)
**Bagimlillik: ATT + LV dogrulanmis**

NOT-01~02, RPT-01~07 + FIX-08 (Reports RBAC), FIX-11, FIX-12

### BATCH 6 — SISTEM ADMIN & TEMIZLIK (18 ozellik + 6 fix)
**Bagimlillik: YOK — herhangi bir batch ile paralel**

SYS-01~09, SYS-11~17, EXT-01~02 + FIX-17, FIX-19~24

### Batch Ozet Tablosu

| Batch | Isim | Feature | Fix | Paralel Firsat |
|-------|------|---------|-----|----------------|
| 0 | Acil Guvenlik | 2 | 3 CRITICAL | FIX'ler paralel |
| 1 | Organizasyon | 7 | 1 | 5/7 paralel |
| 2 | Takvim | 9 | 4 | 3/9 paralel |
| 3 | Puantaj + Gate | 15 | 2 | 10/15 paralel |
| 4 | Talepler + Onaylar | 22 | 2 | 3 alt grup paralel |
| 5 | Raporlama | 9 | 2 | 7/9 paralel |
| 6 | Admin + Temizlik | 18 | 6 | Tamamen paralel |
| **TOPLAM** | | **81** | **21** | |

---

## 10) Guvenlik Test Kapsam Analizi

> **Tarih:** 2026-02-22 | **Hazirlayan:** QA Analyst Agent (team review)
> **Mevcut Kapsam:** 39 test / 52 gerekli = **%75**

### Mevcut Test Durumu (SEC-01 ~ SEC-40)

| Audit Bulgu | Seviye | Test | Durum |
|-------------|--------|------|-------|
| EmployeeViewSet NO RBAC | CRITICAL | SEC-02, SEC-31, SEC-32 | **DONE** — PATCH + DELETE + CREATE test eklendi |
| SystemSettingsViewSet NO RBAC | CRITICAL | SEC-03, SEC-34 | **DONE** — PATCH + DELETE test eklendi |
| FiscalCalendarViewSet NO RBAC | CRITICAL | SEC-06, SEC-35~37 | **DONE** — POST + recalculate + assign_employees + assigned_employees test eklendi |
| PersonalEventGroupViewSet | HIGH | — | **GAP** |
| IDOR-04: monthly-reports export | HIGH | — | **GAP** |
| IDOR-05: live-status PK | MEDIUM | — | **GAP** |
| IDOR-06: calendar-events | MEDIUM | — | **GAP** |
| Destructive endpoints (7 adet) | CRITICAL-HIGH | — | **GAP** — hic yok |
| AllowAny PII sizintisi | MEDIUM | — | **GAP** |
| Self-approval: Cardless | MEDIUM | — | **GAP** |

### Onerilen Yeni Testler (SEC-31 ~ SEC-49)

**CRITICAL (6 test) — TAMAMLANDI:**
- ~~SEC-31: Employee DELETE → 403~~ **DONE**
- ~~SEC-32: Employee CREATE (yetkisiz) → 403~~ **DONE**
- ~~SEC-34: SystemSettings DELETE → 403~~ **DONE**
- ~~SEC-35: FiscalCalendar recalculate → 403~~ **DONE**
- ~~SEC-36: FiscalCalendar assign_employees → 403~~ **DONE**
- ~~SEC-37: FiscalCalendar assigned_employees GET → 403~~ **DONE**

**AUTH-04/05 (3 test) — TAMAMLANDI:**
- ~~SEC-38: RoleViewSet LIST (yetkisiz) → 403~~ **DONE**
- ~~SEC-39: PermissionViewSet LIST (yetkisiz) → 403~~ **DONE**
- ~~SEC-40: ChangePassword same old/new password → 400~~ **DONE**

**HIGH (9 test):**
- SEC-41: PersonalEventGroup isolation
- SEC-42: DailyScheduleOverride bulk_delete → 403
- SEC-43: DayTemplateAssignment bulk_assign → 403
- SEC-44: DayTemplateAssignment bulk_remove → 403
- SEC-45: MonthlyReport IDOR export
- SEC-46: live-status IDOR
- SEC-47: calendar-events IDOR
- SEC-48: attendance stats IDOR
- SEC-49: dashboard department_id IDOR

**MEDIUM (3 test):**
- SEC-50: AllowAny secure-gate PII kontrolu
- SEC-51: Cardless entry self-approval
- SEC-52: SystemSettings PUT → 403

### FIX-Test Eslesmesi

| FIX | Gerekli Testler |
|-----|-----------------|
| ~~FIX-01~~ | ~~SEC-31, 32~~ **DONE** (SEC-02 mevcut, SEC-31 DELETE, SEC-32 CREATE) |
| ~~FIX-02~~ | ~~SEC-34~~ **DONE** (SEC-03 mevcut, SEC-34 DELETE) |
| ~~FIX-03~~ | ~~SEC-35, 36, 37~~ **DONE** (SEC-06 mevcut, SEC-35 recalculate, SEC-36 assign, SEC-37 assigned_employees) |
| ~~FIX-18~~ | ~~SEC-38, 39~~ **DONE** (RoleViewSet + PermissionViewSet LIST gating) |
| ~~AUTH-05~~ | ~~SEC-40~~ **DONE** (ChangePassword same-password rejection) |
| FIX-04 | SEC-41 |
| FIX-07 | SEC-42, 43, 44 |
| FIX-08+10 | SEC-45~49 |
| FIX-13 | SEC-50 |
| FIX-14 | SEC-51 |

### Mevcut Durum: 39/52 test (%75 kapsam) | Hedef: 52/52 = %100
