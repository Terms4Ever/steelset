# Setly -> TestFlight / App Store (iOS)

Build i podpis běží v cloudu přes **EAS Build** - **Mac nepotřebuješ**. Já jsem připravil
veškerou konfiguraci; níže jsou jen kroky, které vyžadují **tvoje** přihlášení (Expo + Apple) -
ta za tebe technicky zadat nemůžu.

Odhad času: ~25-40 min (z toho ~15-20 min běží build v cloudu, můžeš odejít).

---

## Co je hotové (nemusíš řešit)

- `app.json`: název **Setly**, `bundleIdentifier` **cz.setly.app**, `buildNumber` 1, verze 1.0.0,
  ikona (1024 bez alfa kanálu + iOS dark/tinted varianty), splash, `ITSAppUsesNonExemptEncryption: false`
  (přeskočí dotaz na export compliance), `supportsTablet: false` (nepotřebuješ iPad screenshoty).
- `eas.json`: profily `production` (store .ipa) a `submit`.
- `expo-doctor` 21/21, 41 testů zelených, web build bez chyb.

> Chceš jiné bundle ID (např. svoje doména)? Změň `ios.bundleIdentifier` v `app.json` PŘED prvním buildem.

---

## 0. Předpoklady

- Zaplacený Apple Developer účet (máš ✓).
- Účet na **expo.dev** (zdarma) - https://expo.dev/signup.
- Node 18+ (máš).

```bash
npm install -g eas-cli
```

## 1. Přihlášení a propojení projektu

```bash
cd C:\laragon\www\primed
eas login                 # tvůj Expo účet
eas init                  # vytvoří projectId a zapíše ho do app.json (extra.eas.projectId)
```

## 2. Build iOS (cloud)

```bash
eas build --platform ios --profile production
```

Co se stane / na co se zeptá:
- **"Do you want to log in to your Apple account?"** -> ano. Přihlas se Apple ID (tvůj dev účet).
- EAS si **sám vytvoří** Distribution certifikát + Provisioning Profile a zaregistruje bundle ID
  (nemusíš nic ručně v Apple Developer portálu).
- Nabídne **vytvořit App Store Connect app record** (pokud ještě není) -> ano.
- Build poběží v cloudu ~15-20 min. Na konci dostaneš odkaz a `.ipa`.

## 3. App Store Connect API klíč (pro automatický submit - doporučeno)

App Store Connect -> **Users and Access** -> **Integrations** -> **App Store Connect API** ->
**Generate API Key**:
- Role: **App Manager** (stačí).
- Stáhni `.p8` soubor (jde stáhnout jen jednou!), poznamenej **Key ID** a **Issuer ID**.

Pak doplň do `eas.json` do `submit.production.ios` (cesty/ID nahraď svými):

```json
"submit": {
  "production": {
    "ios": {
      "ascApiKeyPath": "./asc-api-key.p8",
      "ascApiKeyId": "XXXXXXXXXX",
      "ascApiKeyIssuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }
}
```

> `asc-api-key.p8` **necommituj** do gitu (je v `.gitignore`). Alternativa bez klíče: `eas submit`
> se umí zeptat na Apple ID + app-specific password interaktivně.

## 4. Submit do TestFlightu

```bash
eas submit --platform ios --profile production --latest
```

Nahraje poslední build do App Store Connect. Zpracování na Apple straně ~5-15 min
(přijde ti e-mail "Ready to Test").

## 5. Spuštění TestFlightu

V **App Store Connect** -> tvoje appka -> **TestFlight**:
1. U buildu vyplň **"What to Test"** + **Export Compliance** (vyjde automaticky jako bez šifrování).
2. **Internal Testing** -> přidej sebe / testery (do 100 lidí, bez schvalování Applem) -> dostanou
   pozvánku do appky **TestFlight** (z App Store).
3. (Volitelně) **External Testing** = veřejný odkaz, ale vyžaduje krátký review od Applu (~1 den).

Hotovo - appka běží na reálném iPhonu přes TestFlight.

---

## App Privacy (vyplň v App Store Connect než půjdeš do produkce)

Setly **nesbírá žádná data** - vše je lokálně v telefonu, žádný účet, server ani analytika.
V App Store Connect -> App Privacy zvol **"Data Not Collected"**. Výrazně to zjednoduší schválení.

## Verzování dalších buildů

`eas.json` má `appVersionSource: remote` + `autoIncrement: true` -> build number se zvyšuje
automaticky při každém buildu. Při nové verzi appky zvyš `version` v `app.json` (např. 1.0.1).

## Pro ostrý App Store (až po TestFlightu)

Stejný build jde "Submit for Review": vyplň metadata (název, popis, klíčová slova, kategorie
Zdraví a fitness), nahraj **screenshoty** (6.7" 1290×2796 a 6.5") a app icon (už máš), pošli k review.
Návrh metadat je v `SHIP.md`.

## Build s novými capabilities (Sign in with Apple + iCloud) - DŮLEŽITÉ

Tyhle dvě featury přidávají iOS capabilities, které musí být v provisioning profilu. EAS je
**doregistruje jen v interaktivním režimu** (skutečný terminál) - ne v `--non-interactive`.

Spusť v PowerShellu/Terminálu (NE přes automatizaci):

```bash
cd C:\laragon\www\primed
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

Při credentials kroku EAS zjistí chybějící capabilities a zeptá se:
- **„Add the following capabilities to your App ID: Sign In with Apple, iCloud?"** -> **Y**
- **„Reuse/Generate provisioning profile?"** -> **Y** (přegeneruje s capabilities)
- Pokud si vyžádá Apple přihlášení -> přihlas se (2FA). Často to zvládne přes ASC API klíč bez 2FA.

Pak build ~15-20 min, submit, a v TestFlightu naskočí (jsi v internal groupe).

> Pozn.: build #2 spadl právě proto, že běžel non-interactive a profil neměl tyto capabilities.
> Interaktivní průchod to vyřeší napoprvé.

## EAS build kredity (free tier)

Free plán má omezený počet buildů/měsíc. Když uvidíš *„You've reached your included build credits
this billing period"*, buildy jsou blokované do **resetu billing period** (měsíčně) nebo do
**upgradu plánu**. Stav/datum resetu: https://expo.dev/accounts/terms4e/settings/billing

## Časté problémy

- **"Bundle identifier is not available"** -> někdo už `cz.setly.app` zabral; změň `ios.bundleIdentifier`.
- **Build failed na credentials** -> spusť `eas credentials` a nech EAS vygenerovat certifikát znovu.
- **Submit: missing compliance** -> už řešeno přes `ITSAppUsesNonExemptEncryption: false`.
- **Icon rejected (alpha)** -> už řešeno (ikona je bez alfa kanálu).
