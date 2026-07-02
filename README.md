# Steelset 🏋️

Česká iOS appka na zapisování tréninků v gymu — série, opakování, váhy, pokrok,
Apple Health/Watch (tep, import tréninků), Live Activity, kalendář.

> Interní názvy: EAS slug `setly`, bundle `cz.setly.app` — historické, neměnit.
> Kompletní kontext pro vývoj (i pro Claude Code) je v **[AGENTS.md](AGENTS.md)**.

## Setup na novém PC

```bash
git clone https://github.com/Terms4Ever/steelset.git
cd steelset
npm install
```

Vývoj (web náhled): `npx expo start --web`
Brány před buildem: `npx tsc --noEmit` · `npx jest` · `npx expo export --platform web`

## Build → TestFlight

```bash
npm i -g eas-cli && eas login   # účet terms4e
eas build --platform ios --profile production --non-interactive --auto-submit
```

Nativní funkce (HealthKit, Live Activity, iCloud) se testují jen přes TestFlight.
Detaily, pravidla a stav projektu: [AGENTS.md](AGENTS.md).
