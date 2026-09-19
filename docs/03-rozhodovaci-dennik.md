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

---

## S8 - Číselná klávesnice se otevírá jen při psaní a jde zavřít (19. 9. 2026)

**Stav.** Klávesnice v živém tréninku vyskakovala i tehdy, když uživatel jen
odškrtával předvyplněné série: `commit()` po dokončení série vždy posunul
fokus na další nedokončenou. Zavřít ji přitom nešlo, takže zakryla spodní
polovinu obrazovky. Fokus navíc drží index série, takže po smazání dřívější
série ukazoval na jinou sérii a psaní by upravilo cizí data.

**Rozhodnutí.** Fokus se po odškrtnutí posouvá jen tehdy, když už klávesnice
otevřená byla. Zavřít ji jde třemi způsoby: křížkem v jejím záhlaví, tažením
za úchyt dolů a ťuknutím mimo buňky. Po smazání série se fokus zruší (pokud
se psalo do smazané), nebo se posune o jednu zpět.

**Proč.** Otevřená klávesnice je signál „uživatel právě píše". Odškrtávání
série je jiné gesto než zápis hodnoty, a když je plán předvyplněný, je to
jediné, co uživatel v sérii dělá.

**Jak.** Tažení řeší `PanResponder` z React Native, ne
`react-native-gesture-handler`. Ten je sice v projektu jako závislost, ale
nikde se nepoužívá a jeho gesta vyžadují `GestureHandlerRootView` v kořenovém
rozvržení. Kvůli jednomu tažení se nevyplatí měnit kořen aplikace.

Ťuknutí mimo buňky odchytává `Pressable` uvnitř `ScrollView`, který obaluje
obsah tréninku. Buňky a tlačítka si stisk vezmou dřív, protože jsou hlouběji
ve stromu, takže jim obal nic nebere.

Čistá část logiky fokusu je v `src/lib/keypad.ts` a hlídá ji
`__tests__/keypad.test.ts`.

**Co se nedělalo.** Issue #2 zvažovalo nastavení „Po dokončení série přejít na
další". Nepřidalo se: po opravě dělá klávesnice přesně to, co uživatel čeká,
a přepínač by byl nastavení navíc bez zřejmého užitku.

**Past.** Hláška o rekordu a lišta odpočtu se nad klávesnicí umisťovaly na
pevných `bottom: 322`. Jakmile klávesnice dostala záhlaví, bylo číslo špatně,
takže se výška teď měří přes `onLayout`.

---

## S9 - Číslo a jednotka drží pohromadě, tisíce se oddělují (19. 9. 2026)

**Stav.** `fmtWeight` a `fmtBwWeight` oddělovaly číslo a jednotku běžnou
mezerou. Vedle bloku s `flex: 1` (název cviku nebo tréninku) se hodnota při
dlouhém názvu stlačila a „kg" skočilo na druhý řádek. Objemy bez oddělovače
(„53082 kg") byly navíc tak široké, že ve třísloupcovém shrnutí kalendáře
přetekly přes oddělovač do sousedních sloupců.

**Rozhodnutí.** Mezi číslem a jednotkou je nezlomitelná mezera (`NBSP`,
`U+00A0`) a tisíce se oddělují taky nezlomitelnou mezerou: „53 082 kg". Platí
i pro „tep/min", „kcal" a „tep". Hodnoty vedle pružného bloku mají
`numberOfLines={1}` a `flexShrink: 0`, takže se zalamuje název, ne číslo.

**Proč.** Číslo s jednotkou je jedna informace, rozdělit ji je vždy chyba.
Oddělovač tisíců není jen kosmetika: šestimístný objem se bez něj v appce
čte špatně a nevejde se.

**Jak.** `fmtGrouped` v `src/lib/format.ts` vkládá oddělovač, `fmtWeight` ho
používá. `fmtNum` zůstává beze změny - používají ho buňky v zápisu tréninku
a krokovače u klávesnice, kde by oddělovač překážel.

**Past.** `adjustsFontSizeToFit` funguje na iOSu, ale react-native-web ho
ignoruje, takže v náhledu na webu se dlouhá hodnota nezmenší. Dlaždice
v Pokroku a sloupce v Kalendáři proto volí velikost písma podle délky
řetězce, což platí všude stejně; zmenšování na iOSu zůstalo jako pojistka.

**Co zbývá ověřit na zařízení.** Zvětšené systémové písmo v iOSu (Dynamic
Type) se z Windows nasimulovat nedá.

---

## S10 - Plán z tréninku nese i supersérie, váhy ne (19. 9. 2026)

**Stav.** Plán šel založit jen prázdný nebo ze startovacích programů. Z
odcvičeného tréninku se plán udělat nedal, i když je to nejpřirozenější cesta:
uživatel si trénink poskládá v posilovně a chce ho příště zopakovat.

**Rozhodnutí.** V detailu tréninku je akce „Uložit jako plán". Převod bere
cviky v pořadí tréninku, jen ty s aspoň jednou hotovou pracovní sérií.
`targetSets` je počet hotových pracovních sérií bez zahřívacích, `targetReps`
nejčastější počet opakování (při shodě vyšší). Automatická progrese je
vypnutá.

**Váhy se do plánu neukládají.** Předvyplní je při spuštění
`buildPrefilledExercise` z posledního výkonu, takže plán nezastarává. Kdyby si
plán váhy pamatoval, po pár týdnech by táhl uživatele zpátky na staré číslo.

**Supersérie.** `RoutineExercise` dostal volitelné `supersetGroup` a
`startWorkout` skupinu přenáší zpátky do živého tréninku. Druhá varianta ze
zadání (na ztrátu jen upozornit) by znamenala, že plán vzniklý ze skutečného
tréninku cvičí něco jiného, než co uživatel odcvičil. Pole je volitelné, takže
stará data ani startovací plány se nemění.

Osamocenou skupinu (druhý cvik z ní už v plánu není) zahodí
`normalizeSupersets` při spuštění, stejně jako v živém tréninku. V editoru
plánu je supersérie vidět jako značka A1, A2.

**Navíc.** Trénink spuštěný z plánu (`routineId`) nabízí i „Aktualizovat
plán", s potvrzením - přepisuje cizí záznam.

**Co se nedělalo.** Volitelná nabídka „Uložit jako plán" hned po ukončení
tréninku. Ukončení tréninku má být tečka, ne další otázka; akce v detailu
tréninku je dostupná pořád.

**Past.** Obecné názvy („Rychlý trénink", „Zápis tréninku") se jako název
plánu nehodí, plán z nich dostane název „Nový plán" a editor se otevře rovnou
s polem na přejmenování.
