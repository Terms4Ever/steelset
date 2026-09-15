# Rozhodovací deník

Co bylo kdy rozhodnuto a proč. Nové rozhodnutí je nový záznam, staré se
nepřepisuje. Deník začíná 15. 9. 2026, starší rozhodnutí jsou popsaná
v `AGENTS.md` a v historii commitů.

---

## S1 - Historické názvy se nepřejmenovávají (dřívější rozhodnutí, zapsáno 15. 9. 2026)

**Stav.** Aplikace se za život jmenovala Pulse, Setly, Liftbook a nakonec
Steelset. Složka projektu je `primed/`, slug v EAS `setly`, identifikátor
balíčku `cz.setly.app`, klíč pro uložená data `setly-store-v1`.

**Rozhodnutí.** Nic z toho se nemění.

**Proč.** Slug a identifikátor balíčku jsou vázané na projekt v EAS,
na provisioning a na TestFlight. Klíč pro uložená data by po změně znamenal,
že uživatelé přijdou o všechny zapsané tréninky.

---

## S2 - Aplikace do Apple Health nezapisuje (dřívější rozhodnutí, zapsáno 15. 9. 2026)

**Rozhodnutí.** Steelset z Health jen čte: tep, tréninky a váhu. Nezapisuje
tréninky zpět.

**Proč.** Zápis zaneřádil Kondici duplicitními záznamy. Funkce
`deleteMyHealthWorkouts()` maže vlastní staré zápisy z doby, kdy se ještě
zapisovalo.

---

## S3 - Váha se ukládá vždy jako celková v kilogramech (dřívější rozhodnutí, zapsáno 15. 9. 2026)

**Rozhodnutí.** `SetEntry.weight` je vždy celková váha v kg.

**Proč.** U cviků s vlastní vahou a přídavkem (shyby, dipy) uživatel zadává
jen přídavek, ale ukládat dvě různé veličiny do jednoho pole by rozbilo
výpočet objemu. Převod jde přes `Workout.bodyweightKg`, který se uloží při
startu tréninku.

**Past.** U cviků čistě s vlastní vahou (kliky) musí `weight` zůstat null,
jinak vznikne fantomový objem.

---

## S4 - Jen krátké pomlčky (dřívější rozhodnutí, zapsáno 15. 9. 2026)

**Rozhodnutí.** Dlouhá ani polovičná pomlčka se nepoužívá nikde: v textech
aplikace, na GitHubu, v dokumentech ani v odpovědích zadavateli.

**Proč.** Výslovné přání zadavatele. Od 15. 9. 2026 to platí ve všech jeho
repozitářích a vynucuje to kontrola z `Terms4Ever/nastroje`.

---

## S5 - README drží společnou kostru (15. 9. 2026)

**Rozhodnutí.** README se srovnalo do kostry sdílené všemi repozitáři
a hlídá ho kontrola z `Terms4Ever/nastroje` při každém pushi.

**Proč.** Sedm repozitářů mělo sedm různých README, tenhle patřil k nejkratším:
dvě sekce, žádná zmínka o tom, z čeho je aplikace postavená.
