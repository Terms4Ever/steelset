# Stav projektu

Živý stav. Přepisuje se, nepřidává. Podrobný kontext pro vývoj je
v `AGENTS.md`, tenhle soubor říká, kde se právě je.

<!-- generovano nastroji, needitovat -->
```
verze:            1.0.0
běhové prostředí: Expo ~56.0.12
hlavní větev:     main
```
<!-- konec generovaneho bloku -->

## Kde to stojí

TestFlight build 19, verze 1.0.0. Aplikace není veřejně v App Store.

## Co je hotové

- Zápis tréninků: série, opakování, váhy, odpočet mezi sériemi, supersérie
- Plány a pokrok, skóre a odhad 1RM
- Anatomická svalová mapa, třináct svalů, sheet s objemem a trendem
- Kalendář odcvičených dnů
- Apple Health: čtení tepu, import tréninků, automatická detekce, úklid
- Grafy tepu a tep po jednotlivých cvicích
- Živá aktivita na zamčené obrazovce a v Dynamic Island
- Přihlášení přes Apple, záloha na iCloud, export do CSV
- Onboarding
- Monetizace: aplikace zdarma s reklamami, předplatné Steelset Pro je vypne

## Co se dělá

Plní se otevřené issues z GitHubu (#1 až #10). Hotové v kódu a čekající na
ověření na zařízení:

- #2 a #6 - číselná klávesnice v tréninku: neotevírá se při odškrtávání
  předvyplněných sérií a jde zavřít křížkem, tažením dolů i ťuknutím mimo
  buňky (S8 v deníku)
- #4 - hodnoty s jednotkou se nezalamují, objemy mají oddělovač tisíců
  (S9 v deníku)
- #5 - z odcvičeného tréninku jde udělat plán, včetně supersérií
  (S10 v deníku)
- #1 - cviky jdou přejmenovat (i vestavěné) a nové jméno platí všude
  (S11 v deníku)

## Co je dál

Rozepsané i s postupem v `01-todo.md`. Ve zkratce:

- Spustit monetizaci naostro: účty a klíče pro AdMob a RevenueCat, produkty
  a ceny v App Store Connectu. Do té doby běží testovací jednotky Googlu,
  které vydělávají nulu.
- Stránka se zásadami ochrany soukromí, paywall na ni odkazuje.
- Aplikace pro watchOS. Jediná cesta k tepu v reálném čase.
- Podklady pro App Store: snímky obrazovek a popis, před veřejným vydáním.

## Na co si dát pozor

Historická jména se pletou. Složka projektu je `primed/`, slug v EAS `setly`,
identifikátor balíčku `cz.setly.app`, aplikace se jmenuje Steelset. Slug ani
identifikátor balíčku se nepřejmenovávají, tabulka v `AGENTS.md` říká proč.
Klíč uložených dat už `steelset-store-v1` je, starý `setly-store-v1` se jen
čte jako fallback (S7 v deníku). Všechno ostatní, co uživatel uvidí, Steelset
je: název, schéma odkazů, jméno exportu i souboru zálohy.

Kontrola „Kontroly" na GitHubu shodí každý push, který sáhne na kód a nesáhne
na `docs/`. Dokumentace tedy patří do stejné dávky jako změna, ne až za ni,
a po pushi se ověřuje, že běh doopravdy prošel (S12 v deníku).

Nativní části se z Windows otestovat nedají. TestFlight je test.

Reklamy ani nákupy se v prohlížeči nespustí. Balíčky mají varianty `.web`, které
se tváří jako neplatící uživatel bez reklam, takže náhled zůstává použitelný,
ale chování reklam se ověřuje jen na zařízení.
