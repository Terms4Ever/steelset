# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Steelset - gym/workout tracker (iOS, Expo)

Česká mobilní appka na zapisování tréninků v gymu (série/opakování/váhy), sledování pokroku,
Apple Health/Watch integrace, Live Activity. Cíl: App Store. Jazyk UI: **čeština**.

## KRITICKÉ - názvosloví (historie přejmenování, nenech se zmást)

| Co | Hodnota | Pozn. |
|---|---|---|
| Aktuální název appky | **Steelset** | display name i App Store název (ověřeně volný, uložený v ASC) |
| Složka projektu | `primed/` | historický název, NEPŘEJMENOVÁVAT |
| EAS slug | `setly` | NEMĚNIT - vázaný na EAS projekt |
| Bundle ID | `cz.setly.app` | NEMĚNIT - provisioning, TestFlight |
| Widget bundle | `cz.setly.app.widget` | Live Activity extension |
| Persist klíč | `setly-store-v1` | NEMĚNIT - uživatelé by přišli o data |
| Historická jména | Pulse → Setly → Liftbook → Steelset | stará jména se mohou objevit v komentářích/assetech |

## Stack

Expo SDK 56 · Expo Router (`src/app/`) · TypeScript strict · RN 0.85 · New Architecture ·
zustand + persist (AsyncStorage) · jest-expo · react-native-svg ·
@kingstinct/react-native-healthkit v14 · react-native-cloud-storage (iCloud) ·
expo-apple-authentication · @bacons/apple-targets (widget) · lokální expo modul (ActivityKit).

Design tokeny (`src/constants/theme.ts`): bg `#0A0B0D`, surface `#15171B/#1E2127`,
akcent `#00E07A`, Inter, tabulární číslice. Vizuály vznikají v Claude Design projektu
"Steelset - Hi-Fi Mobile UI" (ikona = zelené pozadí + tmavá fajfka + logbook čárky - DRŽET).

## Struktura (klíčové soubory)

- `src/app/(tabs)/` - Dnešek (index), Plány, Pokrok, Kalendář, Profil
- `src/app/workout.tsx` - živý zápis tréninku (keypad, rest timer, +KG, supersérie, Live Activity)
- `src/app/history/[id].tsx` - detail tréninku (HR graf, per-cvik tep, BW zápisy)
- `src/app/health-import.tsx` - import tréninků z Apple Health
- `src/store/useStore.ts` - zustand store + persist/migrace (merge!) + selektory
- `src/lib/calc.ts` - objemy, e1RM, PR, perExerciseHr, hrWindow, detailní svaly
- `src/lib/health.ts` - HealthKit wrapper (POZOR: jen ČTENÍ, viz níže)
- `src/lib/liveActivity.ts` - JS wrapper Live Activity (no-op mimo iOS)
- `modules/live-activity/` - lokální expo modul (ActivityKit bridge, Swift)
- `targets/widgets/` - widget extension (SwiftUI UI Live Activity; ActivityAttributes
  struct MUSÍ být 1:1 shodný s tím v modules/live-activity)
- `src/app/muscle-map.tsx` - anatomická svalová mapa (období, ťuk na sval → sheet, alerty)
- `src/components/` - MuscleMapChart (anatomický SVG, heat buckety, onPressMuscle), HrChart, LineChart, MiniWorkoutBar, ui

## Doménová pravidla (porušení = rozbitá uživatelská data)

1. **Váha se ukládá VŽDY jako celková v kg** (`SetEntry.weight`). U `weighted_bw` cviků
   (shyby/dipy) uživatel zadává/vidí jen PŘÍDAVEK (+KG sloupec, minus = asistence);
   převod přes `Workout.bodyweightKg` (snapshot při startWorkout). `bodyweight_reps`
   (kliky) mají váhu skrytou a `weight` MUSÍ zůstat null (jinak fantomový objem).
2. **HealthKit: appka do Health NEZAPISUJE tréninky** (zaneřádilo to Kondici).
   Jen čte (tep, tréninky, váha) + `deleteMyHealthWorkouts()` maže vlastní staré zápisy.
   HealthKit v14 API: `queryQuantitySamples` chce POVINNÝ `limit` (0 = vše) a datumové
   okno v `filter.date.{startDate,endDate}`; workout typ je ČÍSELNÝ enum (50 = silový).
3. **Jeden trénink = jeden záznam**: živý zápis (série) + tep z hodinek se slučují.
   `localCoversWindow()` skrývá Health tréninky překrývající lokálně zapsané (dedup).
   Import má dedup přes `healthUuid`; odmítnuté nabídky v `dismissedHealth`.
4. **Úpravy tréninku**: `editWorkout` u záznamů s HR zachovává okno přes `editEndAt`
   (transientní - strhává se ve finishWorkout i v persist merge). `hrWindow()` má
   fallback na rozsah HR řady (staré záznamy se sbaleným oknem).
5. **Rest timer je timestamp-based** (`restEndAt`), ne interval - přežívá pozadí.
   Dokončení hlídá `check()` v intervalu + AppState 'active' (ref synchronně nulovat!).
6. Persist migrace jdou do `merge` v useStore (deep-merge settings, doplnění
   `bodyweightKg` snapshotů, úklid `editEndAt`).
7. `finishWorkout` nezahazuje prázdný živý trénink potichu (guard v onFinish + keep
   pravidla pro záznamy s Health daty).

## Workflow / brány (VŽDY před buildem)

```
npx tsc --noEmit                 # 0 chyb
npx jest                         # všechny testy (aktuálně 62)
npx expo export --platform web   # bundling check
```

Web preview: `.claude/launch.json` config `primed-web` (expo web na :8081).
POZOR: expo web dev server PŘEPISUJE `tsconfig.json` a maže `expo-env.d.ts` -
po zavření preview `git checkout -- tsconfig.json`, případně obnovit expo-env.d.ts
(`/// <reference types="expo/types" />`). `src/css-modules.d.ts` drží tsc zelené.
Web klik-testy: Alert.alert na webu nefunguje; RN Pressable nejde spolehlivě klikat
syntetickými eventy - ověřovat přes DOM text (preview_eval) a screenshoty.

## Build & TestFlight (EAS)

- `eas build --platform ios --profile production --non-interactive --auto-submit`
  - funguje CELÉ neinteraktivně, dokud se nepřidává nová capability/bundle id.
- Nová capability nebo nový target ⇒ credentials selžou neinteraktivně (PŘED uploadem,
  kredit se nespálí) ⇒ uživatel musí jednou spustit `eas build` INTERAKTIVNĚ ve svém
  terminálu (odpovědi: reuse cert Y, generate profile Y). Pak zase vše neinteraktivně.
- Submit: ascAppId `6785685354` v eas.json; ASC API klíč je NA EAS SERVERECH (žádná
  tajemství v repu). Do App Store Connect webu přístup nemáme - stav buildů hlásí uživatel.
- buildNumber inkrementuje EAS remotely (i failnutý pokus spálí číslo, ne kredit).
- Kredity: free tier ~15 buildů/měsíc - NEplýtvat, batchovat změny.
- Nativní iOS věci (HealthKit, Live Activity, iCloud) NEJDE testovat z Windows -
  TestFlight JE test. V Profilu je "Test Apple Health (diagnostika)" pro on-device debug.

## Proces s uživatelem (česky, řídí se tímhle)

- **Pomlčky: VŽDY krátká "-"**, nikdy dlouhé "–" ani "—". Platí pro UI texty v appce,
  GitHub (popis, README), dokumenty i odpovědi uživateli. (Výslovné přání uživatele.)
- Uživatel chce VIDĚT změny UI na webu PŘED buildem (screenshot z preview).
- Po nasazení na TestFlight mu napsat CO otestovat (číslovaný seznam).
- Po jeho device-testu opravit nahlášené + pustit adversariální review fleet
  (Workflow: review dimenze → verify každý nález) - opakovaně našel reálné bugy.
- Commitovat po každém celku; **pushovat na GitHub** (origin = Terms4Ever/steelset, privátní).

## Stav (červenec 2026)

TestFlight build 19 (v1.0.0). Hotové: zápis tréninků, plány, pokrok (skóre/1RM),
anatomická svalová mapa (/muscle-map: 13 svalů, heat buckety, sheet s objemem/trendem/
top cviky, alerty; stará pill-mapa smazána), úprava partií u cviku (store.exerciseMuscles
overrides, sheet ve workout), kalendář, Apple Health (čtení tepu, import, auto-detekce
banner, úklid), HR grafy + per-cvik tep, +KG u shybů, Live Activity (Dynamic Island +
lock screen: název/čas/série/odpočet), Steelset rebrand, Sign in with Apple, iCloud
záloha, CSV export, onboarding.

Odložené/nápady: watchOS appka (živý tep - jediná cesta k real-time BPM), App Store
listing (screenshoty, popis) před veřejným vydáním, RevenueCat/IAP pro "Steelset Pro".
