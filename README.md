# 🏋️ Steelset

**Česká iOS aplikace na zapisování tréninků v posilovně**

Steelset vede série, opakování, váhy a pokrok v čase. Napojuje se na Apple
Health a Apple Watch (tep, import tréninků), umí Live Activity během tréninku
a kalendář odcvičených dnů.

![Expo](https://img.shields.io/badge/Expo-SDK%2056-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.85-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-proprietary-red)

---

## ✨ Hlavní funkce

- Zápis tréninku: série, opakování, váhy, odpočet mezi sériemi, supersérie
- Plány a pokrok se skóre a odhadem 1RM
- Anatomická svalová mapa, objem a trend po jednotlivých svalech
- Kalendář odcvičených dnů
- Apple Health a Apple Watch: tep, import tréninků, grafy tepu po cvicích
- Živá aktivita na zamčené obrazovce a v Dynamic Island
- Záloha na iCloud, export do CSV

---

## 🛠️ Tech Stack

| Vrstva     | Technologie                        |
|------------|------------------------------------|
| Základ     | Expo SDK 56, React Native 0.85     |
| Jazyk      | TypeScript 6.0                     |
| Nativní    | HealthKit, Live Activity, iCloud   |
| Build      | EAS Build, TestFlight              |

---

## 📁 Struktura projektu

```
steelset/
├── src/              # obrazovky a logika
├── modules/          # nativní moduly
├── targets/          # rozšíření pro Live Activity
├── assets/           # obrázky a ikony
├── scripts/          # pomocné skripty
└── __tests__/        # testy
```

---

## 🏷️ Interní názvy

Slug v EAS je `setly` a identifikátor balíčku `cz.setly.app`. Jsou historické
a **nemění se** - přejmenování by znamenalo nové vydání v App Store. Klíč
uložených dat je `steelset-store-v1`; data z verzí před přejmenováním se
načtou ze starého klíče.

---

## 📚 Dokumentace

| Dokument | K čemu |
|---|---|
| `AGENTS.md` | kompletní kontext pro vývoj: názvosloví, doménová pravidla, brány před buildem, stav |
| `docs/00-stav-projektu.md` | živý stav: co je hotové, co se dělá, co je dál a na co si dát pozor |
| `docs/01-todo.md` | rozdělaná práce s postupem: účty a klíče pro monetizaci, zásady soukromí, watchOS |
| `docs/03-rozhodovaci-dennik.md` | co bylo kdy rozhodnuto a proč. Nové rozhodnutí je nový záznam |
| `SHIP.md` | postup vydání |
| `TESTFLIGHT.md` | poznámky k TestFlightu |

---

## 🚀 Instalace (lokální vývoj)

```bash
git clone https://github.com/Terms4Ever/steelset.git
cd steelset
npm install
npx expo start --web
```

Brány, které musí projít, než se cokoli buildí:

```bash
npx tsc --noEmit
npx jest
npx expo export --platform web
```

Nativní funkce - HealthKit, Live Activity, iCloud - ve webovém náhledu
nefungují. Ověřují se až v TestFlightu.

---

## 📦 Nasazení

**Build a odeslání do TestFlightu:**

```bash
npm i -g eas-cli && eas login
eas build --platform ios --profile production --non-interactive --auto-submit
```

Profily buildů jsou v [eas.json](eas.json), postup vydání v [SHIP.md](SHIP.md)
a poznámky k TestFlightu v [TESTFLIGHT.md](TESTFLIGHT.md).

**Kompletní kontext pro vývoj**, včetně pravidel a stavu projektu, je
v [AGENTS.md](AGENTS.md).

---

## 📄 Licence

Proprietární software. Veškerá práva vyhrazena. Viz [LICENSE](LICENSE).
