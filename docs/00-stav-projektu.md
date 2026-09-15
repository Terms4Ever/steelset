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

Nic rozdělaného.

## Co je dál

- Aplikace pro watchOS. Jediná cesta k tepu v reálném čase.
- Podklady pro App Store: snímky obrazovek a popis, před veřejným vydáním.
- Zprovoznit monetizaci naostro. Kód je hotový, chybí účty a klíče: jednotky
  z AdMobu, veřejný klíč RevenueCatu, produkty a ceny v App Store Connectu.
  Do té doby běží testovací jednotky Googlu, které vydělávají nulu.
- Vlastní stránka se zásadami soukromí. Paywall na ni odkazuje a Apple ji
  u aplikace s reklamami a předplatným vyžaduje.

## Na co si dát pozor

Historická jména se pletou. Složka projektu je `primed/`, slug v EAS `setly`,
identifikátor balíčku `cz.setly.app`, aplikace se jmenuje Steelset. Nic z toho
se nepřejmenovává, tabulka v `AGENTS.md` říká proč.

Nativní části se z Windows otestovat nedají. TestFlight je test.

Reklamy ani nákupy se v prohlížeči nespustí. Balíčky mají varianty `.web`, které
se tváří jako neplatící uživatel bez reklam, takže náhled zůstává použitelný,
ale chování reklam se ověřuje jen na zařízení.
