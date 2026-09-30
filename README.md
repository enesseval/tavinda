# Tavında — v0

"Demir tavında dövülür." Ders programını takvimden okuyan, işleri teslim tarihine göre günlere dağıtan ve iş yaklaştıkça ısınan öğrenci planlayıcısı. v0 tamamen yereldir: sunucu, hesap, ödeme ve ağ çağrısı yok.

Stack: Expo SDK 54 (React Native 0.81, Xcode 26 ile derlenir) · TypeScript strict · expo-router · NativeWind · expo-sqlite · Reanimated · FlashList · date-fns (tr).

## Çalıştırma

Proje Expo SDK 54'te: Xcode 26.3 ile derlenebilen son sürüm (SDK 57, Xcode 27 gerektiriyor). App Store'daki Expo Go yalnızca en güncel SDK'yı açtığı için bu proje Expo Go ile açılmaz. Telefonda denemek için:

- **TestFlight** (önerilen): aşağıdaki adımlarla yükle, TestFlight uygulamasından kur.
- **Geliştirme build'i**: Mac'e iPhone USB ile bağlıyken `npx expo run:ios --device`.

Geliştirici menüsündeki (Profil › Geliştirici) "Demo dönem yükle" ile anında dolu bir dönem görebilirsin.

## Kontroller

```bash
npx tsc --noEmit        # tip kontrolü (typed routes dahil)
npx jest                # domain + migration + tüm ekranların duman testi
npx expo-doctor         # bağımlılık / config
npx expo export -p ios  # üretim bundle'ı
```

## Xcode ile TestFlight

Önkoşul: Mac, Xcode, CocoaPods, App Store Connect'te bu bundle id ile açılmış bir uygulama kaydı.

1. `.env` dosyasına (bkz. `.env.example`; git'e girmez, Expo CLI otomatik okur) ekle:
   ```bash
   IOS_BUNDLE_ID=com.<senin-onekin>.tavinda
   APPLE_TEAM_ID=<10 haneli Team ID>
   ```
   Ya da `app.config.ts` içindeki `com.REPLACE.tavinda` değerini doğrudan değiştir.
2. `npm run ios:release` — build numarasını artırır (`app.config.ts` → `BUILD_NUMBER`) ve `ios/` klasörünü sıfırdan üretir (pod install dahil).
3. `npm run ios:open` — `.xcworkspace`'i Xcode'da açar.
4. Xcode: Signing & Capabilities → "Automatically manage signing" açık, Team seçili.
5. Üstte hedef olarak **Any iOS Device (arm64)** seç.
6. **Product › Archive**.
7. Organizer açılınca **Distribute App › App Store Connect › Upload**.
8. App Store Connect › TestFlight: build işlendikten sonra (5–15 dk) şifreleme sorusu çıkmaz (`ITSAppUsesNonExemptEncryption = false`); build'i **Internal Testing** grubuna ekle.

Her yeni yükleme için 2. adımdan tekrar başla; build numarası otomatik artar.

## Yapı

```
src/domain   saf kurallar (gün sınırı, pencere, ısı, erteleme, reconcile, widget snapshot) — React/Expo yok
src/db       SQLite: numaralı migration'lar (PRAGMA user_version), repository, demo seed
src/services eylemler, saat (zaman yolculuğu), bildirimler, takvim okuma
src/theme    tokens.ts (tüm tasarım token'ları), tema sağlayıcı
src/i18n     tr.ts (tüm metinler), tarih biçimleri
src/app      expo-router ekranları
```

Kurallar: şema değişikliği = yeni migration dosyası (uygulanmış olanı düzenleme). Gün hesabı yalnızca `LocalDate` ('YYYY-MM-DD') ve cut-off ile yapılır; UTC / `toISOString()` kullanılmaz.
