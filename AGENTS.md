# Steelset - pokyny pro agenty

Sada pravidel: `nastroje` (určuje `.pravidla.json`).
Zdroj pravidel: https://github.com/Terms4Ever/nastroje.

Česká mobilní appka na zapisování tréninků v posilovně: série, opakování, váhy,
pokrok, Apple Health a Watch, Live Activity. Cíl je App Store, jazyk rozhraní
čeština.

**Expo se mění.** Před psaním kódu si otevři dokumentaci přesně pro verzi SDK:
https://docs.expo.dev/versions/v56.0.0/

Obecná pravidla (commity, README, dokumentace, issues, migrace) jsou
v `~/.claude/CLAUDE.md` a nepřepisují se sem. Aktuální stav projektu je
v `docs/00-stav-projektu.md`, ne tady.

## Stack a struktura

Expo SDK 56, Expo Router (`src/app/`), TypeScript strict, RN 0.85, New
Architecture, zustand s persistem (AsyncStorage), jest-expo, react-native-svg,
HealthKit v14, react-native-cloud-storage (iCloud), Sign in with Apple,
`@bacons/apple-targets` pro widget a lokální expo modul pro ActivityKit.

Design tokeny jsou v `src/constants/theme.ts`: pozadí `#0A0B0D`, plochy
`#15171B` a `#1E2127`, akcent `#00E07A`, Inter, tabulkové číslice. Ikona je
zelené pozadí, tmavá fajfka a čárky zápisníku, to se drží.

**Názvosloví, ať tě historie nezmate:**

| Co | Hodnota | Poznámka |
|---|---|---|
| Název appky | Steelset | zobrazovaný i v App Store Connect |
| Složka projektu | `primed/` | historický název, nepřejmenovávat |
| EAS slug | `setly` | vázaný na projekt v EAS, neměnit |
| Bundle ID | `cz.setly.app` | provisioning a TestFlight, neměnit |
| Widget bundle | `cz.setly.app.widget` | rozšíření pro Live Activity |
| Klíč persistu | `steelset-store-v1` | od 19. 9. 2026; starý `setly-store-v1` se čte jako záloha (`src/lib/storeKeys.ts`) |
| Stará jména | Pulse, Setly, Liftbook | mohou být v komentářích a v assetech |

Klíčové soubory:

- `src/app/(tabs)/` - Dnešek, Plány, Pokrok, Kalendář, Profil
- `src/app/workout.tsx` - živý zápis tréninku (keypad, odpočet, +KG, supersérie)
- `src/app/history/[id].tsx` - detail tréninku (graf tepu, tep po cvicích)
- `src/app/health-import.tsx` - import tréninků z Apple Health
- `src/app/muscle-map.tsx` a `src/components/MuscleMapChart.tsx` - svalová mapa
- `src/store/useStore.ts` - store, persist s migracemi (`merge`) a selektory
- `src/lib/calc.ts` - objemy, odhad 1RM, rekordy, okna tepu, detailní svaly
- `src/lib/health.ts` - obal HealthKitu, `src/lib/liveActivity.ts` - obal Live Activity
- `modules/live-activity/` a `targets/widgets/` - Swift most a widget; struktura
  `ActivityAttributes` musí být v obou místech shodná

## Doménová pravidla

Porušení těchhle pravidel rozbije uživatelská data, ne jen vzhled.

1. **Váha se ukládá vždy jako celková v kilogramech.** U cviků s vlastní vahou
   zadává uživatel jen přídavek (minus je asistence), převod jde přes snímek
   `Workout.bodyweightKg`. U cviků na opakování musí `weight` zůstat `null`,
   jinak vznikne fantomový objem.
2. **Do Apple Health se nezapisuje.** Appka jen čte tep, tréninky a váhu;
   `deleteMyHealthWorkouts()` uklízí vlastní staré zápisy. Zapisování zaneřádilo
   Kondici, proto je zakázané.
3. **Jeden trénink je jeden záznam.** Živý zápis a tep z hodinek se slučují,
   `localCoversWindow()` skrývá překryvy, import hlídá duplicity přes `healthUuid`.
4. **Úprava tréninku nesmí useknout tep.** `editWorkout` drží okno přes
   `editEndAt`, `hrWindow()` má zálohu na rozsah řady kvůli starým záznamům.
5. **Odpočet stojí na časovém razítku** (`restEndAt`), ne na intervalu, aby
   přežil pozadí.
6. **Migrace persistu patří do `merge`** v useStore: hluboké slučování nastavení,
   doplnění snímků váhy, úklid přechodných polí.
7. **Prázdný živý trénink se nezahazuje potichu**, zvlášť když nese data z Health.

## Brány před commitem

```bash
npx tsc --noEmit
npx jest
npx expo export --platform web
```

Náhled na webu: konfigurace `primed-web` v `.claude/launch.json`. Pozor, dev
server Expa přepisuje `tsconfig.json` a maže `expo-env.d.ts`; po zavření náhledu
`git checkout -- tsconfig.json`. Na webu nefunguje `Alert.alert` a `Pressable`
nejde spolehlivě klikat syntetickými událostmi, takže se ověřuje přes text v DOM
a snímky.

## Nasazení

```bash
eas build --platform ios --profile production --non-interactive --auto-submit
```

- Neinteraktivně to projde, dokud se nepřidává nová capability nebo bundle ID.
  Pak musí zadavatel jednou spustit `eas build` interaktivně ve svém terminálu.
- Klíč pro App Store Connect leží na serverech EAS, v repozitáři žádné tajemství
  není. Do webu App Store Connect přístup nemáme, stav buildu hlásí zadavatel.
- Číslo buildu inkrementuje EAS i u neúspěšného pokusu. Kredity jsou omezené,
  změny se dávkují.
- Nativní věci (HealthKit, Live Activity, iCloud) nejdou zkusit z Windows.
  TestFlight je test. V Profilu je diagnostika Apple Health pro ladění na zařízení.

## Jak se domlouváme

- Zadavatel chce vidět změnu rozhraní na webu ještě před buildem, tedy snímek.
- Po nasazení na TestFlight mu napiš číslovaný seznam, co má otestovat.
- Po jeho testu opravit nahlášené a pustit adversariální review; opakovaně to
  našlo skutečné chyby.
- **Nadpis commitu končí číslem issue v závorce**: `Popis změny (#4)`, u více
  issues `(#2, #6)`. Bez čísla jen commity, které k žádnému issue nepatří.
  `Closes` a `Fixes` se nepoužívají; issue se uzavírá až po ověření výsledku.
- **Osobní test zadavatele je nutný pouze pro ověření, které agent nemůže
  sám skutečně provést.** Agent nejprve provede dostupné kontroly a do issue
  napíše, co zbývá otestovat, proč to nemůže ověřit a přesný postup testu.
  Takové issue zůstává otevřené a uzavře ho zadavatel po svém testu.
  Pokud agent ověří všechny podmínky dokončení a CI předávaného commitu
  projde, uzavře issue sám. Platí to i pro změny aplikace, které umí plně
  ověřit; dokumentace ani technický úkol samy o sobě osobní test nevyžadují.
- **Po každém pushi ověř běh Kontroly na GitHubu.** Místní hook z
  `~/.git-hooks` pustí jen společné kontroly, testy ne; ty běží až v jobu
  `Testy aplikace`. Úspěšný push proto není totéž co zelená kontrola
  (`docs/04-overeni.md`).
