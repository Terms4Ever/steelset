# Stránka v App Storu

**Stav 20. 10. 2026:** texty níže jsou vložené v App Store Connectu u verze 1.0 (angličtina
je hlavní jazyk, čeština jako druhá lokalizace) i v Informacích o aplikaci, včetně kategorie
a odkazů na podporu a soukromí podle jazyka. Věkové hodnocení a prohlášení jsou vyplněné
(tabulka dole). Snímky jsou v `docs/prilohy/app-store/`.

Texty pro App Store Connect, česky a anglicky (#18, #20). Slovenský obchod ukazuje češtinu.
Co se tu změní, se přepíše i v App Store Connectu, ať se texty nerozejdou. Limity: název
a podtitul 30 znaků, propagační text 170, popis 4000, klíčová slova 100 bajtů (diakritika
bere dva). Slova z názvu se do klíčových slov neopakují, App Store je počítá i tak.

Popis nesmí slibovat nic, co aplikace neumí: každý bod níže odpovídá obrazovce nebo funkci
v kódu. Odkazy na podmínky a soukromí jsou v popisu povinně (pravidla 3.1.2 a 5.1.1).

## Čeština

**Název** (30 znaků): Steelset: deník do posilovny

**Podtitul** (30 znaků): Série, váhy, tep a pokrok

**Propagační text** (170 znaků):
Zapiš sérii dvěma ťuknutími, odpočet běží sám a hodinky měří tep i kalorie. Silový deník bez
účtu, data zůstávají v telefonu.

**Klíčová slova** (100 bajtů):
cviky,série,váhy,trénink,1RM,fitness,síla,kulturistika,posilování,činky,plán,Apple Watch,tep

**Popis:**

Steelset je silový deník do posilovny. Zapisuješ série, opakování a váhy, aplikace hlídá
odpočet, počítá objem a ukáže, kdy je čas přidat váhu.

ZÁPIS TRÉNINKU
- Série zapíšeš z vlastní klávesnice, hodnoty se předvyplní z minula
- Odpočet mezi sériemi, který přežije zamknutý telefon, a jeho ukazatel na zamčené obrazovce
- Supersérie, cviky s vlastní vahou i s přídavkem nebo asistencí
- Návrh na přidání váhy, když tři tréninky zvládneš na stejné

PLÁNY
- Ověřené plány pro začátek, nebo vlastní plány z cviků, které děláš
- Plán jde udělat z odcvičeného tréninku

POKROK
- Silové skóre, odhad 1RM a osobní rekordy
- Objem po partiích a svalová mapa podle sérií v týdnu
- Kalendář tréninků a týdenní cíl

APPLE WATCH A APPLE HEALTH
- Trénink spuštěný v telefonu se rozběhne i na hodinkách: tep, kalorie a odpočet na zápěstí
- Hodinky uloží trénink do aplikace Zdraví jako silový trénink
- Tep z hodinek u každého tréninku a cviku, import tréninků z Health, tělesná váha z vážení

DALŠÍ
- Widgety na plochu
- Záloha do vlastního iCloudu, na novém iPhonu se tréninky vrátí samy
- Export do CSV, kilogramy i libry, čeština a angličtina
- Bez účtu a bez registrace

STEELSET PRO
Aplikace je celá zdarma s reklamami. Předplatné Steelset Pro reklamy vypne, měsíčně nebo
ročně, se sedmi dny zdarma. Platba proběhne přes Apple ID po potvrzení nákupu. Předplatné
se automaticky obnovuje, pokud ho nezrušíš nejpozději 24 hodin před koncem období; zrušit
jde v Nastavení iPhonu v části Předplatná.

Podmínky použití: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Ochrana soukromí: https://tomas.saroun.me/steelset/soukromi/

## English

**Name** (30): Steelset: Gym Workout Log

**Subtitle** (30): Sets, reps, weights, progress

**Promotional text** (170):
Log a set in two taps, the rest timer runs on its own and your watch tracks heart rate and
calories. A strength log with no account, your data stays on your phone.

**Keywords** (100 bytes):
tracker,weightlifting,strength,lifting,training,1RM,reps,sets,bodybuilding,fitness,watch,heart

**Description:**

Steelset is a strength training log for the gym. Log sets, reps and weights, and the app runs
your rest timer, adds up your volume and tells you when it is time to add weight.

LOGGING
- Enter sets on a custom keypad, values prefill from last time
- Rest timer that survives a locked phone, with a countdown on the Lock Screen
- Supersets, bodyweight exercises with added weight or assistance
- A nudge to add weight once you have done the same weight for three workouts

PLANS
- Proven plans to get started, or your own plans from the exercises you do
- Turn a finished workout into a plan

PROGRESS
- Strength score, estimated 1RM and personal records
- Volume by muscle group and a muscle map of your weekly sets
- Workout calendar and a weekly goal

APPLE WATCH AND APPLE HEALTH
- A workout started on your phone starts on your watch too: heart rate, calories and rest timer
  on your wrist
- The watch saves the workout to Health as strength training
- Heart rate from your watch for every workout and exercise, workout import from Health,
  bodyweight from your weigh-ins

MORE
- Home Screen widgets
- Backup to your own iCloud, workouts come back on a new iPhone by themselves
- CSV export, kilograms and pounds, English and Czech
- No account, no sign-up

STEELSET PRO
The app is completely free with ads. A Steelset Pro subscription removes the ads, monthly or
yearly, with a 7-day free trial. Payment is charged to your Apple ID when you confirm the
purchase. The subscription renews automatically unless cancelled at least 24 hours before the
end of the period; cancel in your iPhone Settings under Subscriptions.

Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://tomas.saroun.me/steelset/privacy/

## Snímky obrazovky

Pět snímků pro iPhone 6,9" (1320 × 2868) v každém jazyce, v `docs/prilohy/app-store/cs/`
a `en/`: Dnešek, živý trénink, Pokrok, detail tréninku s tepem a Kalendář. Jsou z webového
exportu aplikace s ukázkovými daty (šest týdnů Push, Pull, Legs), ne z telefonu. Znovu:

```bash
npx expo export --platform web
node scripts/app-store-snimky/serve.mjs dist
node scripts/app-store-snimky/shots.mjs cs docs/prilohy/app-store/cs
node scripts/app-store-snimky/shots.mjs en docs/prilohy/app-store/en
```

`serve.mjs` běží na portu 8090 a musí běžet při focení. Vývojový server se nehodí: ukazuje
vývojářské hlášky přes obrazovku. Po exportu `git checkout -- tsconfig.json`.

## Další pole

| Pole | Hodnota |
|---|---|
| Kategorie | Zdraví a fitness (Health & Fitness), vedlejší žádná |
| URL podpory | https://tomas.saroun.me/steelset/podpora/ (anglicky https://tomas.saroun.me/steelset/support/) |
| URL zásad soukromí | https://tomas.saroun.me/steelset/soukromi/ (anglicky https://tomas.saroun.me/steelset/privacy/) |
| Copyright | 2026 Tomáš Šaroun |
| Věkové hodnocení | 9+ (Brazílie 12+, Korea ALL): reklama ano, zdraví a wellness ano, vše ostatní žádné; kategorie Not Applicable |
| Obsah třetích stran | ne |
| Regulovaný zdravotnický prostředek | ne, v žádné zemi |
