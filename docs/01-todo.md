# Co zbývá udělat

Seznam rozdělané práce. Odškrtává se přepsáním `[ ]` na `[x]` a doplněním data.

---

## Spustit monetizaci naostro

Kód pro reklamy i předplatné je hotový a ověřený, ale běží na testovacích
jednotkách Googlu, které vydělávají nulu. Chybí účty a klíče. Bez nich se
nedá vydat verze, která by něco vydělala.

### [x] AdMob: založit aplikaci a reklamní jednotky (19. 10. 2026)

Účet vydavatele `pub-7354938030435296`, aplikace Steelset pro iOS (zatím bez
propojení s obchodem, AdMob ji zkontroluje až po vydání). Hodnoty jsou veřejné,
každá je beztak v binárce aplikace:

| Kde | Hodnota |
|---|---|
| `app.json`, `iosAppId` | `ca-app-pub-7354938030435296~3775723271` |
| EAS `production`, `EXPO_PUBLIC_ADMOB_BANNER_IOS` | `ca-app-pub-7354938030435296/2789944665` |
| EAS `production`, `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS` | `ca-app-pub-7354938030435296/1955550151` |
| EAS `production`, `EXPO_PUBLIC_ADMOB_APP_OPEN_IOS` | `ca-app-pub-7354938030435296/6210314923` |

Dokud `EXPO_PUBLIC_ADMOB_BANNER_IOS` chybí, `src/lib/ads.ts` sám přepne na
testovací jednotky. Proměnné jsou jen v prostředí `production` a profil
`production` v `eas.json` ho výslovně načítá, takže **od dalšího buildu běží
v TestFlightu skutečné reklamy**. Na vlastní reklamy neklikat, AdMob to bere
jako podvod; na testování slouží testovací zařízení v nastavení AdMobu.

`app-ads.txt` běží na https://tomas.saroun.me/app-ads.txt (tomas.saroun.me T14).

### [ ] AdMob: zpráva o souhlasu podle GDPR

V AdMobu, Ochrana soukromí a sdělení, založit a zveřejnit zprávu GDPR pro
aplikaci Steelset, česky a anglicky. Kód ji ukáže přes `AdsConsent.gatherConsent()`;
bez zveřejněné zprávy se nic neukáže a v EU poběží jen omezené reklamy.

Deník reklam v buildu 41 to potvrdil: `consent-update-failed ... no form(s) configured
for the input app ID` a banner pak `googleMobileAds/no-fill`. SDK běží, bez zprávy
o souhlasu ale Google v EU reklamy nedá.

Účet AdMob je schválený od 19. 10. 2026. Stránka Ochrana soukromí a sdělení
se ale v Chromu zadavatele načte prázdná: skripty `user-messaging/app.dart.js`
z `www.gstatic.com` dostanou v Chromu 503, mimo Chrome 200. Nejspíš je blokuje
některé z blokovačů reklam v Chromu; před dalším pokusem je vypnout pro
`admob.google.com`.

### [x] RevenueCat: projekt, entitlement a nabídka (19. 10. 2026)

Projekt `Steelset` na app.revenuecat.com (plán zdarma do 2 500 dolarů měsíčně,
bez karty), účet zadavatele. V něm:

| Co | Hodnota |
|---|---|
| aplikace | `Steelset (App Store)`, bundle `cz.setly.app` |
| klíč pro in-app nákupy | `SubscriptionKey_4C4BHM8Q26.p8` z App Store Connectu, „Valid credentials“; soubor má zadavatel, v repozitáři není |
| produkty | `cz.setly.app.pro.monthly`, `cz.setly.app.pro.yearly` |
| entitlement | **`pro`** (kód ho hledá v `PRO_ENTITLEMENT`), oba produkty připojené |
| nabídka | `default`, aktuální, balíčky `$rc_monthly` a `$rc_annual` |
| veřejný klíč | EAS `production`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_...`) |

Klíč vložil zadavatel. S ním se skrytý přepínač Pro v Profilu (S7) od dalšího
buildu schová a nákup v TestFlightu jde přes sandbox Applu. Produkty hlásí
„Could not check“: bez klíče App Store Connect API je RevenueCat neověří ani
nenaimportuje ceny. Nákupu to nevadí, ceny bere aplikace přímo z obchodu.

Volitelné: v App Store Connectu (Informace o aplikaci) nastavit oznámení
serveru Applu na adresu z RevenueCatu (aplikace, Apple Server Notification
URL); stav předplatného se pak aktualizuje i bez otevření aplikace.

### [x] App Store Connect: skupina předplatného a produkty (19. 10. 2026)

Skupina `Steelset Pro` (ID 22493692), název pro uživatele česky i anglicky
„Steelset Pro“. Oba produkty ve všech 175 zemích, s českým i anglickým názvem
a popisem a se sedmi dny zdarma pro nové předplatitele (bez konce nabídky):

| Produkt | Apple ID | Cena |
|---|---|---|
| `cz.setly.app.pro.monthly`, 1 měsíc | 6824557268 | 79 Kč (2,99 $, 2,99 €) |
| `cz.setly.app.pro.yearly`, 1 rok | 6824559912 | 589 Kč (22,99 $, 24,99 €) |

Ceny potvrdil zadavatel. 590 Kč Apple nenabízí, nejblíž je 589 Kč (úspora
38 procent proti 948 Kč za dvanáct měsíců). Ostatní země přepočítal Apple.
Úroveň 1 je měsíční, 2 roční; přeřadit jde jen přetažením.

Před odesláním ke kontrole chybí u každého produktu snímek obrazovky
s nákupem (Review Information). První předplatné jde ke kontrole jen spolu
s novou verzí aplikace.

Ceny se nikde v kódu nepíšou. Paywall je čte z obchodu, včetně délky zkušební
doby, takže změna ceny nevyžaduje nový build.

---

## [x] Stránka se zásadami ochrany soukromí (2. 10. 2026)

Běží na https://tomas.saroun.me/steelset/soukromi/ (repozitář tomas.saroun.me, #2),
paywall na ni odkazuje od #19. Dřív vedl odkaz na neexistující `steelset.cz`. U aplikace s reklamami a předplatným ji Apple vyžaduje, bez ní
přijde zamítnutí při kontrole.

Musí popsat aspoň tohle:

- tréninková data zůstávají v telefonu, případně v iCloudu uživatele
- AdMob sbírá identifikátory pro reklamy, souhlas se řeší přes dotaz podle GDPR
  a přes povolení sledování od Applu
- RevenueCat zpracovává nákupy
- Apple Health se jen čte, nic se do něj nezapisuje

---

## [ ] Aplikace pro watchOS

Jediná cesta, jak dostat tep v reálném čase. Dnes se tep načítá až po tréninku
z Apple Health, takže během cvičení není vidět.

## [ ] Podklady pro App Store

Snímky obrazovek a popis aplikace. Až před veřejným vydáním, na TestFlight
nejsou potřeba.
