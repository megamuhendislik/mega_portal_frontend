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

## 1) Feature Inventory (v2 — 87 Feature, 14 Kategori)

### Auth & RBAC (5)
- AUTH-01: JWT Login (Giris)
- AUTH-02: Token Refresh
- AUTH-03: RBAC Permission System
- AUTH-04: Role Management
- AUTH-05: Password Change

### Organization & Employees (8)
- ORG-01: Departman Yonetimi
- ORG-02: Pozisyon Yonetimi
- ORG-03: Calisan CRUD
- ORG-04: Calisan Detay Profili
- ORG-05: Kisisel Profil
- ORG-06: Sirket Rehberi
- ORG-07: Yonetici Hiyerarsisi (Matrix)
- ORG-08: Calisan Etiketleri

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
| AUTH-02 | PENDING | — | — | Next up |
| AUTH-03 | PENDING | — | — | |
| AUTH-04 | PENDING | — | — | |
| AUTH-05 | PENDING | — | — | |
| ORG-01 | PENDING | — | — | |
| ORG-02 | PENDING | — | — | |
| ORG-03 | PENDING | — | — | |
| ORG-04 | PENDING | — | — | |
| ORG-05 | PENDING | — | — | |
| ORG-06 | PENDING | — | — | |
| ORG-07 | PENDING | — | — | |
| ORG-08 | PENDING | — | — | |
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
| SYS-10 | PENDING | — | — | |
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

## 6) Next Feature

**AUTH-02 — Token Refresh**

Walkthrough sirasi: Auth > Org > Calendar > Attendance > Gate > Overtime > Leave > Meal > Cardless > Approvals > Notifications > Reports > Admin > External
