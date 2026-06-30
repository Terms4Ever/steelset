# Setly — odeslání do App Store / Google Play

Silový tréninkový deník. Expo (React Native) SDK 56, TypeScript, lokální data (offline-first,
žádný účet). Vše níže je připravené — chybí už jen kroky, které vyžadují **tvoje** vývojářské účty.

## Stav

- ✅ Plně funkční appka: onboarding, knihovna cviků + tvorba vlastních, plány (CRUD + auto-progrese),
  logování s prefill z minula, rest timer, PR detekce, historie, silové skóre, grafy, muscle heatmap,
  CSV export, nastavení (kg/lb, přírůstek, odpočinek).
- ✅ Data se ukládají (zustand + AsyncStorage), přežijí restart.
- ✅ Ikona (1024×1024, bez alfa kanálu) + iOS dark/tinted varianty + Android adaptivní.
- ✅ 41 unit/integračních testů (`npm test`), TypeScript bez chyb (`npx tsc --noEmit`), `expo-doctor` 21/21.
- ⏳ Co musíš udělat ty (vyžaduje účty): EAS build + nahrání do obchodů.

## Lokální spuštění

```bash
npm install
npm run web          # web preview v prohlížeči
npm start            # Expo dev server → naskenuj QR v aplikaci Expo Go (iOS/Android)
npm test             # 41 testů
npx tsc --noEmit     # typecheck
```

## Předpoklady pro vydání

1. **Apple Developer Program** — 99 USD / rok (apple.com/developer). Nutné pro App Store.
2. **Google Play Console** — jednorázově 25 USD (play.google.com/console). Nutné pro Google Play.
3. **Expo účet** (zdarma) — expo.dev. EAS Build kompiluje v cloudu (nepotřebuješ macOS).
4. `npm install -g eas-cli`

## Build & odeslání (EAS)

```bash
eas login
eas init                       # propojí projekt s tvým Expo účtem (vytvoří projectId)

# iOS — EAS umí vyrobit i podepsat v cloudu (provede tě Apple přihlášením)
eas build --platform ios --profile production
eas submit --platform ios      # nahraje do App Store Connect / TestFlight

# Android
eas build --platform android --profile production
eas submit --platform android  # nahraje do Google Play (potřebuje service-account JSON)
```

`eas.json` (profily `development` / `preview` / `production`) i `app.json` (verze, identifikátory) jsou hotové.

## Před prvním buildem zkontroluj v `app.json`

- `ios.bundleIdentifier` a `android.package` = `cz.setly.app` — **změň na svou doménu**, pokud chceš jinou.
- `version` = `1.0.0`, `ios.buildNumber` = `1`, `android.versionCode` = `1`.
- `ITSAppUsesNonExemptEncryption: false` (appka nepoužívá vlastní šifrování) — ušetří dotaz při submitu.

## Metadata do obchodu (návrh, CZ)

- **Název:** Setly
- **Podtitul:** Silový deník, který ví, kdy jsi připravený
- **Kategorie:** Zdraví a fitness
- **Klíčová slova:** posilovna, silový trénink, deník, série, progresivní zátěž, 1RM, plán, činka
- **Popis:** Rychlé zapisování sérií, plány s automatickou progresí, sledování pokroku, silové skóre,
  objem podle svalů, export dat (CSV). Plně v češtině, data zůstávají v telefonu.
- **Soukromí (App Privacy / Data safety):** **No data collected.** Vše je lokálně v zařízení,
  appka neposílá data na server, nemá účet ani analytiku. (Toto výrazně zjednoduší schválení.)
- **Věkové hodnocení:** 4+ / Everyone.
- **Screenshoty:** vyrob z běžící appky (Dnešek, logování, Pokrok) v požadovaných rozměrech
  (6.7" iPhone 1290×2796, atd.).

## Pozn. k webovému náhledu

`dist/` je statický web export (jen pro náhled). `dist/router.php` umožňuje čisté URL při lokálním
servírování přes PHP. Pro reálný vývoj používej `npm start` (Expo Go) nebo `npm run web`.
