# 🚀 RAILWAY DEPLOYMENT CHECKLIST

## ✅ ŞU ANDA YAPTIKLARIMIZ (FRONTEND KODU)
- [x] `vite.config.js` Railway için ayarlandı
- [x] `railway.json` oluşturuldu
- [x] `.env.production` oluşturuldu
- [x] `.gitignore` güncellendi

## 📦 RAILWAY'DE YAPILACAKLAR

### 1️⃣ BACKEND SERVİSİNİ BULUN/OLUŞTURUN
- [ ] Railway Dashboard → Sol menü → Backend servisini seçin
- [ ] Eğer backend servisi yoksa, önce backend'i deploy edin!
- [ ] Backend servisinin "Settings" → "Domains" bölümünden URL'ini kopyalayın
- [ ] URL'i not alın: `https://backend-production-xxxx.up.railway.app`

### 2️⃣ BACKEND SERVİSİNDE VARIABLES EKLEYIN
- [ ] Backend servisinde "Variables" sekmesine gidin
- [ ] "Add" butonuna tıklayın (önerilen değişkenleri otomatik ekler)
- [ ] Şu değişkenleri düzeltin:
  ```
  CORS_ALLOWED_ORIGINS = https://web-production-6fe6a.up.railway.app,http://localhost:5173
  CSRF_TRUSTED_ORIGINS = https://web-production-6fe6a.up.railway.app
  ALLOWED_HOSTS = .railway.app,web-production-6fe6a.up.railway.app
  SECRET_KEY = [Kendiniz random 50+ karakter key oluşturun]
  DEBUG = False
  ```

### 3️⃣ FRONTEND SERVİSİNDE VARIABLE EKLEYIN
- [ ] Frontend (web) servisine geri dönün
- [ ] "Variables" sekmesine gidin
- [ ] "New Variable" butonuna tıklayın
- [ ] Şunu ekleyin:
  ```
  Name: VITE_API_URL
  Value: https://[BACKEND-URL].up.railway.app/api
  ```
  (Adım 1'de kopyaladığınız backend URL'ini kullanın, sonuna /api ekleyin)

### 4️⃣ KODU GİTHUB'A PUSH EDİN
- [ ] Terminal'de şu komutları çalıştırın:
  ```powershell
  git add .
  git commit -m "Configure Railway deployment"
  git push origin main
  ```

### 5️⃣ RAILWAY'DE REDEPLOY
- [ ] Railway otomatik deploy başlatacak
- [ ] "Deployments" sekmesinde ilerlemeyi izleyin
- [ ] "Deployment successful" görene kadar bekleyin

### 6️⃣ TEST EDİN
- [ ] Frontend URL'i açın: https://web-production-6fe6a.up.railway.app
- [ ] Login sayfası açılmalı
- [ ] Giriş yapmayı deneyin
- [ ] Browser Console'da (F12) hata olup olmadığını kontrol edin
- [ ] Network sekmesinde API isteklerinin backend'e gittiğini görmelisiniz

## 🐛 SORUN GİDERME

### CORS Hatası Alıyorsanız:
- Backend'deki CORS_ALLOWED_ORIGINS'i kontrol edin
- Frontend URL'inin https:// ile başladığından emin olun
- Sonunda slash (/) OLMASIN

### API İstekleri Çalışmıyorsa:
- VITE_API_URL'in doğru olduğunu kontrol edin
- Backend servisinin online olduğunu kontrol edin
- Backend'in /api endpoint'inin çalıştığını test edin

### 500 Hatası Alıyorsanız:
- Backend logs'larını kontrol edin
- Database bağlantısını kontrol edin
- SECRET_KEY'in ayarlı olduğunu kontrol edin

## 📝 ÖNEMLİ NOTLAR

1. **Backend URL'ini doğru yazın**: Sonuna `/api` eklemeyi unutmayın!
2. **HTTPS kullanın**: Production'da http:// DEĞİL, https:// kullanın
3. **Slash eklemeyin**: URL'in sonunda slash (/) OLMASIN
4. **Her deploy sonrası**: Her iki servisi de redeploy etmeniz gerekebilir
5. **Environment variables**: Değişiklik yaptıktan sonra servis otomatik redeploy olur

## 🎯 BAŞARI KRİTERLERİ

✅ Frontend açılıyor
✅ Backend'e API istekleri gidiyor
✅ CORS hatası yok
✅ Login çalışıyor
✅ Browser console'da hata yok
