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

---

## S6 - Aplikace zdarma s reklamami, předplatné je vypne (15. 9. 2026)

**Rozhodnutí.** Steelset zůstává celý zdarma. Předplatné Steelset Pro nepřidává
funkce, jen odstraňuje reklamy. Nabídka je měsíční a roční, roční předvybraná.
Reklamy jsou záměrně agresivní: bannery na všech hlavních obrazovkách včetně
zápisu tréninku, celoobrazovková reklama po uloženém tréninku a po návratu
z pozadí.

**Proč.** Placená aplikace bez publika nevydělá nic. Zdarma s reklamami dá
důvod stáhnout si ji a předplatné prodává klid, ne funkce. Zamykat zápis sérií
za paywall by z deníku udělalo ukázku.

**Meze, které se nepřekročily.** Reklama při načítání aplikace je proti
pravidlům AdMobu a hrozí za ni zablokování účtu. Na spuštění je určený formát
app open, ten se použil. Banner v zápisu tréninku se skrývá, když je otevřená
numerická klávesnice, protože reklama nalepená nad číselníkem sbírá omylné
kliky, a to AdMob zakazuje také. Souhlas podle GDPR běží před dotazem na
sledování od Applu, v tomto pořadí to Google vyžaduje.

**Past.** Zjišťování předplatného vrací `null`, když odpověď není k dispozici,
a volající si v tom případě nechá uloženou hodnotu. Kdyby se neznámý stav
vyhodnotil jako neplatící, stačil by výpadek sítě a platícímu uživateli by
naskočily reklamy.

**Past podruhé.** Nativní moduly se na webu nezabalí ani přes podmíněný
`require`, Metro si je najde statickou analýzou a překlad spadne. Řeší to
soubory s příponou `.web`, ne podmínky uvnitř kódu.

---

## S7 - Klíč uložených dat je `steelset-store-v1` (19. 9. 2026)

**Stav.** Zápisník se ukládal pod klíčem `setly-store-v1`. S1 říkal, že se
nepřejmenovává, protože by uživatelé přišli o tréninky.

**Rozhodnutí.** Klíč se přejmenoval na `steelset-store-v1`. Starý klíč se při
prvním čtení zkopíruje do nového a zůstane ležet jako záložní kopie -
nepřepisuje se a nemaže. Zápis míří vždy jen na nový klíč. Kód je v
`src/lib/storeKeys.ts`, chování hlídá `__tests__/storeKeys.test.ts`.

**Proč.** Původní důvod pro S1 byla ztráta dat, ne samotný klíč. Převod přes
čtecí fallback tu ztrátu ruší a navíc je vratný: kdyby se změna vracela zpět,
stará kopie v telefonu pořád je.

**Past.** Smazání všech dat v Profilu jen přepíše stav na prázdný, klíč z
úložiště neodstraňuje. Kdyby ho mazalo, fallback by při dalším spuštění
smazané tréninky vzkřísil ze staré kopie.

**Co zůstává.** Slug v EAS `setly` a identifikátor balíčku `cz.setly.app` se
nemění, důvody z S1 u nich platí dál. Jméno `setly-store-v1` proto v kódu
zůstává na jednom místě, jako název starého klíče, který se čte. Stejně tak
`/setly-backup.json` v `cloudsync.ts`, což je záloha na iCloudu ze starších
verzí - čte se, nikdy nezapisuje.
