# Vydání do TestFlightu a App Store

Build i podpis běží v cloudu přes EAS Build, Mac není potřeba. Windows stačí.

---

## Brány před každým buildem

```bash
npx tsc --noEmit
npx jest
npx expo export --platform web
```

Když kterákoli spadne, build se nespouští. Každý pokus o build spálí číslo buildu.

---

## Build a odeslání

```bash
eas build --platform ios --profile production --non-interactive --auto-submit
```

Proběhne celé bez zásahu, dokud se nepřidává nová capability ani nový target.
Build trvá zhruba 15 až 20 minut, submit navazuje sám.

Kde co je:

| Věc | Kde |
|---|---|
| Profily buildů a submitu | `eas.json` |
| `ascAppId` pro submit | `eas.json`, hodnota `6785685354` |
| Klíč k App Store Connect API | na serverech EAS, v repozitáři není a nikdy nebude |
| Verze aplikace | `app.json`, klíč `version` |
| Číslo buildu | zvyšuje EAS sám (`appVersionSource: remote`) |

Slug `setly` ani identifikátor `cz.setly.app` se nemění. Jsou historické a vázané
na EAS projekt, provisioning i záznam v App Store Connectu.

---

## Nová capability nebo nový target

Přidání capability (Sign in with Apple, iCloud, HealthKit) nebo nového targetu
znamená, že provisioning profil musí vzniknout znovu. To EAS neudělá
neinteraktivně: credentials selžou ještě před uploadem, takže se kredit nespálí,
ale build neproběhne.

Řešení je jeden interaktivní průchod ve skutečném terminálu:

```bash
eas build --platform ios --profile production
```

Na dotazy odpovědět: přidat capability do App ID ano, přegenerovat provisioning
profil ano, certifikát znovu použít ano. Pak jede zase všechno neinteraktivně.

---

## Kredity

Free plán má zhruba patnáct buildů měsíčně. Hláška „You've reached your included
build credits this billing period" znamená stop do resetu období nebo do upgradu.
Stav na https://expo.dev/accounts/terms4e/settings/billing

Neúspěšný build kredit nespálí, ale spálí číslo buildu. Změny se proto dávkují.

---

## TestFlight

Po submitu zpracování na straně Applu trvá pět až patnáct minut, pak přijde e-mail
„Ready to Test". V App Store Connectu u buildu vyplnit „What to Test" a export
compliance (vyjde automaticky jako bez šifrování, `ITSAppUsesNonExemptEncryption`
je v `app.json`). Interní testování je do sta lidí bez schvalování Applem, externí
vyžaduje krátký review.

Do webu App Store Connectu nemáme přístup, stav buildů hlásí zadavatel.

---

## App Privacy: pozor, aplikace už data sbírá

Do zavedení reklam platilo „Data Not Collected". **To už neplatí a vyplnit to tak
by byla nepravdivá deklarace vůči Applu.** Od verze s monetizací je potřeba přiznat:

- **AdMob** sbírá identifikátor pro reklamy a údaje o užívání pro cílení reklam
- **RevenueCat** zpracovává nákupy, tedy identifikátor nákupu a stav předplatného
- tréninková data zůstávají v telefonu, případně v iCloudu uživatele, a nikam se neposílají
- Apple Health se jen čte, nic se do něj nezapisuje

Bez stránky se zásadami ochrany soukromí (`docs/01-todo.md`) Apple aplikaci
s reklamami a předplatným zamítne.

---

## Podklady pro App Store

Až před veřejným vydáním, na TestFlight nejsou potřeba. Návrh, který čeká na potvrzení:

- **Název:** Steelset
- **Podtitul:** Silový deník, který ví, kdy jsi připravený
- **Kategorie:** Zdraví a fitness
- **Klíčová slova:** posilovna, silový trénink, deník, série, progresivní zátěž, 1RM, plán, činka
- **Popis:** Rychlé zapisování sérií, plány s automatickou progresí, sledování pokroku,
  silové skóre, objem podle svalů, export dat. Celé v češtině, tréninková data zůstávají v telefonu.
- **Věkové hodnocení:** 4+
- **Snímky:** vyrobit z běžící aplikace (Dnešek, zápis tréninku, Pokrok), rozměr
  pro 6,7" iPhone je 1290 × 2796

---

## Časté problémy

| Hláška | Co s tím |
|---|---|
| Build failed na credentials | nová capability, viz výše, jeden interaktivní průchod |
| „Bundle identifier is not available" | identifikátor zabral někdo jiný, nemá nastat, `cz.setly.app` je náš |
| Submit hlásí missing compliance | vyřešeno v `app.json` přes `ITSAppUsesNonExemptEncryption: false` |
| Ikona zamítnutá kvůli alfa kanálu | vyřešeno, ikona je bez alfa kanálu |

Nativní funkce, tedy HealthKit, Live Activity a iCloud, ve webovém náhledu
nefungují. Ověřují se až v TestFlightu.
