# Ověření

Co testy a kontroly dokazují a co ne. Testy hlídají čistou logiku mimo
obrazovky; rozhraní se ověřuje v náhledu na webu a nativní části až
v TestFlightu.

## Testy

Jest přes `jest-expo`, soubory `tests/*.test.ts`, spouští se `npx jest`
(v CI `npm test`). Komponenty ani obrazovky netestují.

| Sada | Testů | Co hlídá |
|---|---|---|
| `store.test.ts` | 48 | celý průběh tréninku od plánu po historii, zvýšení váhy až po třech trénincích na stejné (#9), supersérie v plánu, přejmenování, pořadí a mazání cviků bez rozbití historie |
| `calc.test.ts` | 37 | odhad 1RM, objem jen z dokončených sérií, rekordy, série týdnů, objem po partiích, skóre síly a trend |
| `copyValue.test.ts` | 16 | přetahování hodnoty mezi sériemi: na kterou sérii prst míří, co se zkopíruje u cviku s vlastní vahou |
| `format.test.ts` | 16 | zápis vlastní váhy (`BW +N`, `BW -N`), česká čísla a tisíce, jednotka se neodtrhne od čísla |
| `reorder.test.ts` | 15 | přesouvání cviků, supersérie se přesouvá celá |
| `routineFromWorkout.test.ts` | 13 | plán z odcvičeného tréninku: nejčastější počet opakování, pořadí cviků |
| `stall.test.ts` | 13 | stagnace: tři tréninky na stejné váze bez přidaných opakování |
| `muscleMap.test.ts` | 9 | svalová mapa, šikmé břišní jako vlastní oblast |
| `exerciseUsage.test.ts` | 7 | kde se cvik používá, cvik v koši se počítá jako použitý |
| `prefill.test.ts` | 7 | předvyplnění sérií z minula, váha se sama nenavyšuje |
| `keypad.test.ts` | 5 | fokus klávesnice po smazání série |
| `storeKeys.test.ts` | 5 | přechod ze starého klíče `setly-store-v1`, smazaná data se nevzkřísí (S7) |
| `monetization.test.ts` | 3 | Pro bez spojení s obchodem nedostane reklamy, nákup bez obchodu selže bezpečně |
| `csv.test.ts` | 2 | export do CSV: nedokončené tréninky vynechá, zvláštní znaky ošetří |

Běh 24. 9. 2026: 14 sad, 196 testů, všechny prošly.

## Kde běží

| Místo | Co běží | Co ne |
|---|---|---|
| CI, job `Testy aplikace` ve workflow `Kontroly` | `npm test` na Node 24 po každém pushi (od S26) | typy a web export |
| pre-push hook z `~/.git-hooks` | pravidla commitů, README, dokumentace | testy ani typy |
| ručně před commitem | brány z `AGENTS.md`: `npx tsc --noEmit`, `npx jest`, `npx expo export --platform web` | |

Push projde i s rozbitým testem; spadne až job `Testy aplikace` na GitHubu. Proto se
po každém pushi ověřuje, že běh doopravdy prošel.

## Co ověřeno není

- **Obrazovky.** Ověřují se v náhledu na webu přes text v DOM a snímky, ne
  testem. `Alert.alert` na webu nefunguje.
- **Gesta.** Přetahování hodnot a tažení keypadu řídí gesture-handler, který
  syntetické události na webu neposlouchá. Logiku cíle hlídá
  `copyValue.test.ts`, samotné gesto jen TestFlight.
- **Nativní části**: HealthKit, Live Activity a widget, záloha na iCloud,
  Sign in with Apple. Jen na zařízení, v Profilu je diagnostika Apple Health.
- **Reklamy a nákupy.** V prohlížeči se nespustí a dokud chybí klíč
  RevenueCatu, nejde Pro koupit ani na zařízení.
- **Typy a web export mimo tenhle počítač.** V CI se nepouští, jen ručně
  jako brána před commitem.
