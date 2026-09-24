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

TestFlight build 27, verze 1.0.0. Aplikace není veřejně v App Store.

Build 27 nese opravy z testu na zařízení (#6, #12, #13, #14) a správu cviků (#11).
Čeká na ověření na zařízení: oba sheety s klávesnicí, plovoucí lišta, přetahování
hodnot a tažení keypadu. Gesta a klávesnice se z Windows ověřit nedají.


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

## Sada pravidel

Primární sadu `nastroje` určuje `.pravidla.json`. Stejnou příslušnost
uvádí odznak v README, začátek `AGENTS.md` a workflow `Pravidla / nastroje`.
Společné kontroly se dál načítají z `Terms4Ever/nastroje` přes `@main`.
GitHub topic pro tuto sadu je `pravidla-nastroje` (S27).

## Co je hotové

- Zápis tréninků: série, opakování, váhy, odpočet mezi sériemi, supersérie
- Plány a pokrok, skóre a odhad 1RM
- Anatomická svalová mapa, čtrnáct svalů, sheet s objemem a trendem
- Kalendář odcvičených dnů
- Apple Health: čtení tepu, import tréninků, automatická detekce, úklid
- Grafy tepu a tep po jednotlivých cvicích
- Živá aktivita na zamčené obrazovce a v Dynamic Island
- Přihlášení přes Apple, záloha na iCloud, export do CSV
- Onboarding
- Monetizace: aplikace zdarma s reklamami, předplatné Steelset Pro je vypne
- Uklizený kořen repozitáře: postup vydání je v `02-vydani.md`, testy v `tests/`
  jako v ostatních repozitářích, zbytky po šabloně Expo jsou pryč (S18, S20 v deníku)

## Co se dělá

Plní se otevřené issues z GitHubu (#1 až #14). Hotové v kódu a čekající na
ověření na zařízení:

- #2 a #6 - číselná klávesnice v tréninku: neotevírá se při odškrtávání
  předvyplněných sérií, jde zavřít křížkem, tažením dolů i ťuknutím mimo buňky
  (S8 v deníku), při zavření sjede dolů i s lištou odpočtu (S23 v deníku)
  a při tažení jede za prstem (S24 v deníku)
- #4 - hodnoty s jednotkou se nezalamují, objemy mají oddělovač tisíců
  (S9 v deníku)
- #5 - z odcvičeného tréninku jde udělat plán, včetně supersérií
  (S10 v deníku)
- #1 - cviky jdou přejmenovat (i vestavěné) a nové jméno platí všude
  (S11 v deníku)
- #3 - pořadí cviků jde měnit v tréninku i v plánu, supersérie se hýbe celá
  (S13 v deníku)
- #10 - z repozitáře zmizely zbytky po šabloně Expo (S14 v deníku)
- #9 - plán už váhu sám nenavyšuje, místo toho nabídne zvýšení při zaseknutí
  (S15 v deníku)
- #8 - hodnotu jde přetáhnout prstem z jedné série do druhé (S16 v deníku)
- #7 - šikmé břišní jsou na mapě vlastní partie s vlastním sheetem a přibyly
  čtyři cviky, které na ně padají (S17 v deníku)
- #12 - ze sheetu Nastavení cviku vede cesta ven křížkem, obsah roluje a sheet
  ustoupí klávesnici; stejně i sheet přejmenování (S21 v deníku)
- #14 - plovoucí lišta běžícího tréninku už nesedí na tlačítkách, výšku hlásí
  sama a ťuknutí vedle ní projde na obsah (S22 v deníku)

- #13 - přetahování hodnot mezi sériemi stojí na `react-native-gesture-handler`
  místo ručního `PanResponder`, haptika se ozve už při aktivaci a cíl je vidět
  i na hotové sérii (S24 v deníku)

- #11 - cviky jdou spravovat i mimo trénink: Profil otevře katalog v režimu správy,
  detail umí jméno, partie, jednostrannost a u vlastních i vybavení a typ měření.
  Mazání je měkké, takže smazaný cvik nezmizí z historie (S25 v deníku)

Gesta jsou jediná část, kterou z Windows neověřím: syntetické pointer eventy
gesture-handler na webu neřídí. Přetahování i tažení keypadu tedy čekají na
TestFlight.

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

Workflow `Pravidla / nastroje` na GitHubu shodí každý push, který sáhne na kód a nesáhne
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
