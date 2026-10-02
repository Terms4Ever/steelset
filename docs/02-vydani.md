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

Poslední taková změna: **App Group `group.cz.setly.app` pro aplikaci i rozšíření
s widgety (#16, S30, S32)**. Build, který ji přináší poprvé, musí jet interaktivně.

Pozor, neinteraktivní build capability sice zapne („Synced capabilities: Enabled:
App Groups"), ale **nepropojí ji s konkrétní skupinou**: hlásí „Skipping capability
identifier syncing because the current Apple authentication session is not using
Cookies". Profil pak nesouhlasí s oprávněními a Xcode build shodí až při podepisování,
tedy za kredit. Propojení („Linked: group.cz.setly.app") umí jen přihlášení Apple ID
v interaktivním buildu. Build 30 se proto zrušil ještě ve frontě a běžel znovu jako 31.

Že build oprávnění opravdu nese, jde ověřit na staženém `.ipa` bez telefonu:
`embedded.mobileprovision` a podpis binárky aplikace i `PlugIns/SteelsetWidgets.appex`
musí obsahovat `group.cz.setly.app`.

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

## Cesta do App Store (#18)

Rozbor z 2. 10. 2026. Pořadí dává smysl, protože pozdější kroky čekají na dřívější:
bez domény není zásad soukromí ani `app-ads.txt`, bez smlouvy o placených aplikacích
nejdou založit produkty předplatného, bez produktů nemá RevenueCat co nabízet.

**Dělá zadavatel (účty, smlouvy, peníze):**

1. Koupit doménu (`steelset.cz` 2. 10. neexistuje). Web na ní potřebuje tři věci:
   zásady soukromí (paywall odkazuje na `/soukromi`), stránku podpory s kontaktem
   (App Store Connect ji vyžaduje) a `app-ads.txt` od AdMobu. Bez `app-ads.txt` na
   doméně uvedené v App Storu jako web vývojáře AdMob omezí reklamy.
2. V App Store Connectu podepsat smlouvu o placených aplikacích (Paid Applications),
   doplnit bankovní účet a daňový formulář. Bez toho předplatné neprodá nic.
3. Status obchodníka podle DSA. Aplikace s reklamami a předplatným v EU znamená
   nejspíš obchodníka; Apple pak na stránce aplikace zveřejní adresu, telefon a e-mail.
   Rozhodnutí a údaje jsou zadavatele.
4. AdMob a RevenueCat podle `01-todo.md`. K AdMobu navíc zpráva o souhlasu
   (Privacy & messaging, GDPR): kód ji volá přes `AdsConsent.gatherConsent()`, ale
   bez nastavené zprávy se nic neukáže a v EU poběží reklamy jen omezeně. Klíče
   patří do proměnných prostředí EAS (`eas env`), ne do repozitáře.
5. Skupina předplatného a dva produkty, ceny potvrdit (návrh v `01-todo.md`).
   První předplatné se posílá ke kontrole spolu s verzí aplikace.

**Dělá se v kódu:**

6. Záloha do iCloudu (`src/lib/sync.ts`) posílá celý persist store, tedy i tep
   (`avgHr`, `maxHr`, `hrSeries`) a historii vážení z Health. Pravidlo 5.1.3 (ii)
   říká, že aplikace „may not store personal health information in iCloud".
   Data z Health se ze zálohy musí vynechat a po obnovení načíst znovu z Health.
7. Přihlášení přes Apple jen uloží jméno a e-mail a ukáže je v Profilu. Sběr dat
   bez účelu je proti 5.1.1 (iii). Buď pryč (i s capability), nebo mu dát účel.
8. `app.json` žádá o zápis do Health (`NSHealthUpdateUsageDescription`) kvůli úklidu
   zápisů ze starých verzí. Ty měli jen testeři, veřejná verze to nepotřebuje
   a kontrola se na nevyužitý zápis ptá.
9. Release build ověřit na TestFlightu: skutečné reklamy, skrytý přepínač Pro
   v Profilu zmizel (schovává ho jen chybějící klíč RevenueCatu, S7).

**V App Store Connectu před odesláním:**

10. App Privacy podle sekce níže.
11. Popis musí obsahovat odkaz na podmínky (standardní EULA Applu) a na zásady
    soukromí, odkaz na soukromí patří i do pole Privacy Policy URL (5.1.1 i).
12. Věkové hodnocení podle nového dotazníku, kategorie, klíčová slova, snímky.
13. Poznámka pro kontrolu: bez Apple Health a hodinek se tep neukáže, předplatné
    jde vyzkoušet v sandboxu. Vydání nastavit na ruční, ať jde vydat až po kontrole.

---

## App Privacy: pozor, aplikace už data sbírá

Do zavedení reklam platilo „Data Not Collected". **To už neplatí a vyplnit to tak
by byla nepravdivá deklarace vůči Applu.** Od verze s monetizací je potřeba přiznat:

- **AdMob** sbírá identifikátor pro reklamy a údaje o užívání pro cílení reklam
- **RevenueCat** zpracovává nákupy, tedy identifikátor nákupu a stav předplatného
- tréninková data zůstávají v telefonu, případně v iCloudu uživatele, a nikam se neposílají;
  data z Apple Health do iCloudu nesmí (krok 6 výše)
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
- **Snímky:** vyrobit z běžící aplikace (Dnešek, zápis tréninku, Pokrok, widgety),
  povinná sada je pro 6,9" iPhone, bere 1320 × 2868 i 1290 × 2796

---

## Časté problémy

| Hláška | Co s tím |
|---|---|
| Build failed na credentials | nová capability, viz výše, jeden interaktivní průchod |
| „Bundle identifier is not available" | identifikátor zabral někdo jiný, nemá nastat, `cz.setly.app` je náš |
| Submit hlásí missing compliance | vyřešeno v `app.json` přes `ITSAppUsesNonExemptEncryption: false` |
| Ikona zamítnutá kvůli alfa kanálu | vyřešeno, ikona je bez alfa kanálu |
| Widgety na telefonu jen hlásí „Otevři Steelset", i když aplikace běží | rozšíření s widgety nemá oprávnění k App Group. `@bacons/apple-targets` ji převezme od aplikace, jen když má `targets/widgets/expo-target.config.json` vlastní klíč `entitlements`; proto je tam výslovně. Ověřit jde bez buildu: `npx expo config --type introspect` musí u `cz.setly.app.widget` ukázat `group.cz.setly.app` (build 29) |
| „the compiler is unable to type-check this expression in reasonable time" | Swift ve widgetu: dlouhý řetězec `map`/`filter`/`sorted` nebo výraz s n-ticemi a smíšenými literály. Rozepsat na kroky s pojmenovaným typem. Z Windows se nepozná, spadne až v buildu a stojí kredit (build 28) |

Nativní funkce, tedy HealthKit, Live Activity a iCloud, ve webovém náhledu
nefungují. Ověřují se až v TestFlightu.
