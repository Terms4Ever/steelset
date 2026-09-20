# Co zbývá udělat

Seznam rozdělané práce. Odškrtává se přepsáním `[ ]` na `[x]` a doplněním data.

---

## Spustit monetizaci naostro

Kód pro reklamy i předplatné je hotový a ověřený, ale běží na testovacích
jednotkách Googlu, které vydělávají nulu. Chybí účty a klíče. Bez nich se
nedá vydat verze, která by něco vydělala.

### [ ] AdMob: založit aplikaci a reklamní jednotky

Na `admob.google.com` přidat aplikaci pro identifikátor `cz.setly.app`
a vytvořit tři jednotky: banner, interstitial, app open.

Výsledkem jsou čtyři hodnoty, které patří do proměnných prostředí:

| Proměnná | Co do ní patří |
|---|---|
| `EXPO_PUBLIC_ADMOB_BANNER_IOS` | ID banneru |
| `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS` | ID celoobrazovkové reklamy |
| `EXPO_PUBLIC_ADMOB_APP_OPEN_IOS` | ID reklamy při otevření |
| (do `app.json`) | App ID, nahradí testovací `ca-app-pub-3940256099942544~1458002511` |

Dokud `EXPO_PUBLIC_ADMOB_BANNER_IOS` chybí, `src/lib/ads.ts` sám přepne na
testovací jednotky. Přepínač je jen tahle jedna proměnná.

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

## [ ] Stránka se zásadami ochrany soukromí

Paywall odkazuje na `https://steelset.cz/soukromi`, ta stránka zatím
neexistuje. U aplikace s reklamami a předplatným ji Apple vyžaduje, bez ní
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
