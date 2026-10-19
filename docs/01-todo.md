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

### [ ] RevenueCat: projekt, entitlement a nabídka

Na `revenuecat.com` (zdarma do obratu 2 500 dolarů měsíčně) založit projekt,
propojit ho s App Store Connectem, vytvořit:

- entitlement s identifikátorem **`pro`** (přesně takhle, kód ho hledá podle
  jména v `PRO_ENTITLEMENT`)
- nabídku (offering) s měsíčním a ročním balíčkem

Veřejný klíč pro App Store patří do `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.

Tenhle bod musí být hotový **dřív, než aplikace půjde do veřejného prodeje**.
Do té doby je v Profilu skrytý přepínač předplatného pro testování, který se
schovává právě podmínkou na chybějící klíč (rozhodnutí S7). Ve veřejné verzi
bez klíče by z něj byla skutečná díra.

### [ ] App Store Connect: skupina předplatného a produkty

Vytvořit skupinu předplatného a v ní dva produkty, měsíční a roční. Návrh cen,
který čeká na potvrzení:

- měsíčně 79 Kč
- ročně 590 Kč, tedy úspora 38 procent
- sedm dní zdarma na začátku

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
