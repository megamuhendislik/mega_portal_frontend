# Backend CORS Ayarları Güncelleme Rehberi

## Railway Backend Servisinizde Variables Bölümüne Ekleyin:

1. **CORS_ALLOWED_ORIGINS** değişkenini güncelleyin:
   ```
   CORS_ALLOWED_ORIGINS=https://web-production-6fe6a.up.railway.app,http://localhost:5173
   ```

2. **CSRF_TRUSTED_ORIGINS** değişkenini güncelleyin:
   ```
   CSRF_TRUSTED_ORIGINS=https://web-production-6fe6a.up.railway.app
   ```

3. **ALLOWED_HOSTS** değişkenini güncelleyin:
   ```
   ALLOWED_HOSTS=.railway.app,web-production-6fe6a.up.railway.app
   ```

## Adım Adım Railway'de Yapılacaklar:

### BACKEND SERVİSİ:
1. Railway Dashboard'a gidin
2. Backend servisinizi seçin (mega_portal_backend)
3. "Variables" sekmesine tıklayın
4. Yukarıdaki 3 değişkeni ekleyin/güncelleyin
5. "Settings" → "Domains" bölümünden backend URL'inizi kopyalayın
   (Örn: https://mega-portal-backend-production-xxxx.up.railway.app)

### FRONTEND SERVİSİ:
1. Frontend servisinizi seçin (web)
2. "Variables" sekmesine tıklayın
3. "New Variable" butonuna tıklayın
4. İsim: `VITE_API_URL`
5. Değer: `https://[BACKEND-URL].up.railway.app/api`
   (Backend URL'inizi buraya yazın)
6. Kaydedin

### SON ADIMLAR:
1. Her iki servisi de yeniden deploy edin (redeploy)
2. Frontend: https://web-production-6fe6a.up.railway.app adresinden test edin
3. Browser console'da network isteklerini kontrol edin
4. CORS hatası almamalısınız

## Sorun Giderme:

Eğer CORS hatası alırsanız:
- Backend servisindeki CORS_ALLOWED_ORIGINS'i kontrol edin
- Frontend URL'inin tam olarak doğru yazıldığından emin olun
- https:// ile başladığından emin olun (http:// DEĞİL)
- Sonunda slash (/) OLMASIN

Eğer API çağrıları çalışmıyorsa:
- Browser Console'da Network sekmesini açın
- API isteklerinin hangi URL'e gittiğini kontrol edin
- VITE_API_URL'in doğru ayarlandığından emin olun
- Backend servisinin online olduğunu kontrol edin
