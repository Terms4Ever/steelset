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

TestFlight build 31, verze 1.0.0. Aplikace není veřejně v App Store.

Build 27 prošel testem na zařízení a issues #1 až #14 jsou zavřené. V kódu je
navíc #16 (widgety, výběr zadavatele v S31). Build 28 jel interaktivně, App Group
i profily pro aplikaci a rozšíření se zaregistrovaly, ale kompilace widgetů spadla
na jediném výrazu, který Swift nezvládl otypovat. Výraz je rozepsaný a build 29
prošel neinteraktivně a je v TestFlightu. Na telefonu ale widgety data neviděly:
rozšíření nemělo oprávnění k App Group (S32). Oprava je v buildu 31: stažený .ipa
nese `group.cz.setly.app` v profilu i podpisu aplikace i widgetů. Zadavatel 29. 9.
otestoval základní funkčnost: widgety na ploše ukazují data a vypadají dobře. Zbývá
ověřit ťuknutí do widgetů a Live Activity při tréninku.

## Issues

Sekce jsou dané a jiné se nepřidávají: `## Problém` (nebo `## Cíl`),
`## Jak to poznat`, `## Hotovo, když`, `## Kde to žije`, `## Snímky`. Jeden
checklist pod „Hotovo, když", tělo do 40 řádků, šablona je
v `.github/ISSUE_TEMPLATE/ukol.md`. Zavřené issue má checklist odškrtaný,
komentáře mají do pěti řádků a snímky před a po leží
v `docs/snimky/<číslo issue>-<název>/`. Syrový nápad bez nadpisů kontrolu
neshodí, tvar mu dodá agent. Hlídá to kontrola z `nastroje`: hned při zakládání
a změně issue (štítek `tvar nesedí` a komentář, co chybí) a znovu při pushi.
Běží jen nad issue od vlastníka a spolupracovníků, ne nad cizím hlášením.

Issue uzavírá agent po ověření všech podmínek dokončení a úspěšném CI
předávaného commitu. Pouze ověření, které agent nemůže sám skutečně provést,
předá zadavateli s důvodem a konkrétním postupem; takové issue uzavírá
zadavatel po osobním testu (S28).

## Sada pravidel

Primární sadu `nastroje` určuje `.pravidla.json`. Stejnou příslušnost
uvádí odznak v README, začátek `AGENTS.md` a název společné kontroly
`Pravidla nastroje` ve workflow `Kontroly`.
Společné kontroly se dál načítají z `Terms4Ever/nastroje` přes `@main`.
GitHub topic pro tuto sadu je `pravidla-nastroje` (S27).

## Co je hotové

- Zápis tréninků: série, opakování, váhy, odpočet mezi sériemi, supersérie,
  přetahování hodnoty mezi sériemi, číselná klávesnice, která se nevnucuje
- Plány a pokrok, skóre a odhad 1RM; plán z odcvičeného tréninku, pořadí cviků
  v tréninku i plánu, nabídka zvýšení váhy při zaseknutí místo automatiky
- Správa cviků i mimo trénink s měkkým mazáním, které nerozbije historii
- Anatomická svalová mapa, čtrnáct svalů a šikmé břišní, sheet s objemem a trendem
- Kalendář odcvičených dnů
- Apple Health: čtení tepu, import tréninků, automatická detekce, úklid
- Grafy tepu a tep po jednotlivých cvicích
- Živá aktivita na zamčené obrazovce a v Dynamic Island
- Záloha na iCloud s ukazatelem stavu v Profilu, export do CSV. Přihlášení přes Apple
  je pryč (#19, S34), přenos na nový telefon dělá záloha. Data z Apple Health do zálohy
  nejdou a po obnovení se načtou znovu z Health (S36)
- Onboarding
- Monetizace: aplikace zdarma s reklamami, předplatné Steelset Pro je vypne
- Uklizený kořen repozitáře, postup vydání v `02-vydani.md`, testy v `tests/`

Všechno z toho ověřené na zařízení v buildu 27 (#1 až #14).

## Co se dělá

- #16 - widgety podle výběru zadavatele (S31): Tento týden, Týdenní cíl, Poslední
  trénink, Kalendář měsíce, Tělesná váha, Plány tento týden a Série po partiích.
  Data jim aplikace zapisuje do App Group, cíl se nastavuje v Profilu a váha se
  čte z Apple Health. Na zařízení ověřené zobrazení dat, zbývá ťuknutí a Live Activity.
- #15 - aplikace pro Apple Watch (S38): start tréninku v telefonu ji spustí, ukazuje čas,
  tep, kalorie a odpočinek, ukončení funguje oběma směry a trénink uloží do Health.
  Hotové v kódu, Swift ověří až build; ten musí jet interaktivně (nový target).

## Co je dál

Rozepsané i s postupem v `01-todo.md`. Ve zkratce:

- Vydání v App Storu (#18), pořadí kroků v `02-vydani.md` (Cesta do App Store).
  Blokuje ho chybějící doména se zásadami soukromí, záloha tepu z Health do iCloudu
  (pravidlo 5.1.3) a monetizace bez účtů: AdMob, RevenueCat, smlouva o placených
  aplikacích. Do té doby běží testovací jednotky Googlu, které vydělávají nulu.
- Aplikace pro watchOS (#15): spuštění tréninku i na hodinkách a jediná cesta
  k tepu v reálném čase.
- Podklady pro App Store: snímky obrazovek a popis, před veřejným vydáním.

## Na co si dát pozor

Historická jména se pletou. Složka projektu je `primed/`, slug v EAS `setly`,
identifikátor balíčku `cz.setly.app`, aplikace se jmenuje Steelset. Slug ani
identifikátor balíčku se nepřejmenovávají, tabulka v `AGENTS.md` říká proč.
Klíč uložených dat už `steelset-store-v1` je, starý `setly-store-v1` se jen
čte jako fallback (S7 v deníku). Všechno ostatní, co uživatel uvidí, Steelset
je: název, schéma odkazů, jméno exportu i souboru zálohy.

Workflow `Kontroly` na GitHubu shodí každý push, který sáhne na kód a nesáhne
na `docs/`. Dokumentace tedy patří do stejné dávky jako změna, ne až za ni,
a po pushi se ověřuje, že běh doopravdy prošel (S12 v deníku).

Nativní části se z Windows otestovat nedají. TestFlight je test.

App Privacy v App Store Connectu se už nesmí vyplnit jako „Data Not Collected".
Aplikace má reklamy a předplatné, takže se přiznává AdMob i RevenueCat. Staré
návody radily opak a byly proto smazané (S19 v deníku).

Dokud v prostředí chybí klíč RevenueCatu, nejde si Pro koupit, a tedy ani ověřit,
jak aplikace vypadá bez reklam. Na to je v Profilu skrytý přepínač: sedm ťuknutí
na řádek s verzí odemkne sekci Jen pro testování. Objeví se jen tehdy, když
nákupy nejsou dostupné, takže po zapojení obchodu zmizí sám.

Reklamy ani nákupy se v prohlížeči nespustí. Balíčky mají varianty `.web`, které
se tváří jako neplatící uživatel bez reklam, takže náhled zůstává použitelný,
ale chování reklam se ověřuje jen na zařízení.
