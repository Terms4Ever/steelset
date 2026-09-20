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

---

## S11 - Cviky jdou přejmenovat a obrazovky si jména berou z jednoho místa (19. 9. 2026)

**Stav.** Přejmenovat cvik nešlo. Vlastní cvik měl jméno ve svém záznamu, ale
UI na to nemělo pole; vestavěné cviky jsou konstanty v `src/data/exercises.ts`.
Zároveň dvě obrazovky (editor plánu a Profil, odkud se exportuje CSV) volaly
selektor bez přepisů, takže tam zůstávaly původní partie - a zůstala by i
původní jména.

**Rozhodnutí.** Nový stav `exerciseNames: Record<string, string>` vedle
`exerciseMuscles`, aplikovaný v `allExercises`. Vestavěný cvik dostává přepis,
vlastní cvik se přejmenuje rovnou ve svém záznamu - dvě evidence téhož jména
by se rozešly. Prázdné jméno nebo jméno shodné s původním přepis ruší, takže
„Obnovit původní" nepotřebuje zvláštní akci a v datech nezůstává balast.

**Proč to nic nerozbije.** Tréninky, plány, rekordy i svalová mapa odkazují na
cvik přes `exerciseId`. Jméno je jen popisek.

**Hlavní změna je jinde.** Místo dalšího ručního volání selektoru přibyly hooky
`useExercisesById()` a `useAllExercises()` a všech devět obrazovek je teď
používá. Ruční volání byla ta chyba: stačilo zapomenout jeden přepis a na
obrazovce zůstalo staré jméno nebo partie. Hook nemá jak zapomenout.

**Kde se jméno mění.** V sheetu „Nastavení cviku" v živém tréninku a tužkou
u cviku ve výběru cviků. Prázdné jméno se neuloží.

**Past.** `exerciseNames` musí být v `partialize` i ve `wipeAll`. Bez
`partialize` by se přejmenování nedostalo ani do zálohy na iCloud, ta ukládá
celý uložený stav. Hlídá to test, který po přejmenování čte uložená data.

---

## S12 - Nadpis commitu nese číslo issue a každá dávka sahá na docs (20. 9. 2026)

**Stav.** Prvních pět commitů k issues mělo odkaz na issue až v těle zprávy
(„Řeší #1."). Zadavatel to vytkl: v jeho ostatních repozitářích je číslo
v nadpisu, v závorce na konci - „Web se ptá na měření návštěvnosti, dřív než
cokoli načte (#3)".

**Rozhodnutí.** Nadpis commitu končí číslem issue v závorce, u více issues
`(#2, #6)`. Klíčová slova `Closes` a `Fixes` se nepoužívají: issue zavírá
zadavatel, až změnu ověří na TestFlightu, a GitHub by ji zavřel už při pushi.

**Co to odhalilo.** Commit, který tohle pravidlo zapsal do `AGENTS.md`, jako
jediný z dávky neprošel kontrolou (běh 13, commit `02d2468`). Kontrola
dokumentace z `Terms4Ever/nastroje` odmítne každou dávku, která sáhne na kód
a nesáhne na `docs/`. Za kód se počítá cokoli mimo `docs/`, tedy i `AGENTS.md`.

**Past.** V klonu, kde se tady pracuje, nejsou nainstalované místní hooky, takže
push projde i s dávkou bez dokumentace a chyba se ukáže až v Akcích na GitHubu.
Po každém pushi se proto kouká na výsledek běhu, ne jen na to, že push prošel.
Křížek na `02d2468` už zůstane: kontrola porovnává rozsah toho jednoho pushe
a opravit by to šlo jen přepisem historie.

---

## S13 - Pořadí cviků se mění šipkami a supersérie se hýbe jako blok (20. 9. 2026)

**Stav.** Trénink i plán ukazovaly cviky v pořadí z plánu a měnit se nedalo.
Cvik šel jen odebrat nebo přidat na konec. Když je v posilovně obsazený stroj,
uživatel nemá co dělat.

**Rozhodnutí: šipky, ne tažení.** Issue nabízelo i režim „Seřadit" s tažením.
Šipky nahoru a dolů vyhrály: tažení by se v živém tréninku pralo se svislým
rolováním a s gestem na zavření klávesnice, a na jeden přesun o místo je to
zbytečně jemná práce. Na obou obrazovkách vypadají stejně.

**Supersérie je blok.** Souvislý úsek cviků se stejným `supersetGroup` se hýbe
celý a přeskakuje celý sousední blok. Jinak by se supersérie roztrhla na dva
kusy přerušené cizím cvikem, což je stav, který `linkSuperset` neumí vyrobit.
Logika je v `src/lib/reorder.ts` (`blockAt`, `canMove`, `moveBlock`), čistá
a otestovaná, a používá ji trénink i editor plánu.

**Fokus klávesnice.** Fokus drží index cviku, takže by po přesunu psaní mířilo
jinam. `moveBlock` vrací i `order` (na novém indexu původní index) a obrazovka
si přes `remapIndex` posune fokus s cvikem.

**Klíče bez indexu.** `key` byl index, po přesunu by se stav komponent přilepil
k jiné pozici. `stableKeys` dává klíč z `exerciseId` a pořadí výskytu - stejný
cvik může být v tréninku dvakrát.

**Uložení pořadí do plánu.** Po přesunu v tréninku spuštěném z plánu se nahoře
nabídne „Uložit do plánu". Ukládá se jen pořadí: cvik přidaný v tréninku se do
plánu nedoplní a cvik, který se necvičil, z něj nezmizí, jen spadne na konec.
Tlačítko neslibuje víc, než dělá.

**Past.** Tři tlačítka vedle sebe (nahoru, dolů, křížek) sebrala názvu cviku
tolik místa, že se „Tlak nad hlavu (OHP)" zalomil na dva řádky. Šipky jsou
proto nad sebou v jednom sloupci širokém 32 px. Souvisí s S9 - dlouhý název
vedle pružného bloku je v téhle appce opakovaný zdroj ošklivého zalomení.

---

## S14 - Zbytky po šabloně Expo jsou pryč (20. 9. 2026)

**Stav.** V repozitáři ležely soubory ze startovací šablony Expo, na které
nevedl odkaz z kódu ani z `app.json`: komponenty `external-link`, `hint-row`,
`collapsible`, `animated-icon`, `web-badge`, `themed-text`, `themed-view`,
obrázky s logem Reactu a Expa, ikony pro tabbar a pro Android a skript
`reset-project`, který maže zdrojáky šablony.

**Rozhodnutí.** Smazáno, celkem 27 souborů. Navíc oproti seznamu v issue:

- `src/hooks/` zmizel celý. `use-theme.ts` měl podle issue zůstat, jenže ho
  volaly jen `themed-text`, `themed-view` a `collapsible` - tedy samé mazané
  soubory. Se šablonou odešly i `use-color-scheme.ts` a `.web.ts`.
- `src/css-modules.d.ts` byl kvůli `animated-icon.web.tsx`, který jediný
  importoval `.module.css`. Zmínka o něm zmizela i z `AGENTS.md`.
- `Colors`, `ThemeColor`, `Fonts` a `Spacing` v `src/constants/theme.ts` nesly
  komentář „legacy shape kept so default-template imports keep compiling".
  Ty importy už neexistují. `palette`, `radius`, `space`, `type` a `font`
  zůstávají, na nich appka stojí.

**Co se nedělalo.** `assets/images/icon.png` nikdo nepoužívá (`app.json` míří na
`steelset-icon.png`), ale v seznamu v issue není a na ikony se bez výslovného
zadání nesahá. Zůstává. Odkazy na stará jména v `app.json`, na které issue
upozorňovalo, už tam nejsou - vyřešil je rebrand (S7).

**Ověřeno.** tsc čistý, 142 testů, web export projde. V prohlížeči všech devět
obrazovek naběhne, konzole je čistá a nic si nesahá na chybějící obrázek.

---

## S15 - Plán váhu nenavyšuje, appka nabídne zvýšení při zaseknutí (20. 9. 2026)

**Stav.** Plán s „automatickou progresí" si při spuštění sám přičetl `increment`,
když minule všechny série splnily cílová opakování. Předvyplněná váha pak byla
číslo, které uživatel nikdy nezvedl, a nikdo se ho neptal.

**Rozhodnutí.** `buildPrefilledExercise` váhu jen opisuje z posledního výkonu.
Přepínač v editoru plánu a odznak v seznamu plánů jsou pryč. Pole `autoProgress`
v datech zůstává kvůli starým plánům a záloze na iCloud, jen ho nikdo nečte -
hlídá to test, který ho nastaví na `true` a čeká, že se nic nenavýší.

**Co je zaseknutí.** Stejná nejtěžší pracovní váha ve třech trénincích po sobě
a opakování se za tu dobu nezlepšila. „Nezlepšila" se měří jen mezi krajními
tréninky té trojice, takže jeden slabší den nabídku nezdrží a přidané opakování
ji naopak hned ukončí. Zahřívací a nedokončené série se nepočítají. Čistá funkce
je `detectStall` v `src/lib/stall.ts`, práh `STALL_SESSIONS = 3`.

**Proč tři.** Dva tréninky ještě nejsou vzorec, čtyři už jsou zbytečně dlouhé
čekání. Práh je konstanta a funkce ho bere i parametrem, takže se dá změnit bez
zásahu do UI.

**Kde se nabízí.** V živém tréninku u konkrétního cviku, nad sériemi: „3× po sobě
100 kg. Zkusit 102,5 kg?" s akcí „Zvýšit" a křížkem. Ne jako upozornění na
Dnešku - rozhodnutí o váze dává smysl ve chvíli, kdy člověk stojí u činky.
„Zvýšit" předvyplní vyšší váhu do všech nedokončených pracovních sérií cviku.
Odmítnutí platí do konce tréninku a nikam se neukládá; příště se nabídne znovu,
protože zaseknutí pořád trvá.

**Vypínač.** `settings.stallAlerts`, výchozí zapnuto, v Profilu jako „Nabízet
zvýšení váhy". Do `merge` nebylo potřeba nic dopisovat - `settings` se slučují
přes `{ ...current.settings, ...persisted.settings }`, takže nový klíč dostane
výchozí hodnotu sám.

**Past.** U cviků s vlastní vahou (shyby, dipy) se porovnává celková váha, do
které se počítá i tělesná váha z `Workout.bodyweightKg`. Když si uživatel změní
tělesnou váhu, série se rozejdou a zaseknutí se nenajde. Radši nic nenabídnout
než nabídnout blbost, takže to zůstává.

---

## S16 - Hodnota se přetáhne prstem z jedné série do druhé (20. 9. 2026)

**Stav.** Buňka uměla jen ťuknutí: fokus a keypad. Opsat 60 kg z první série do
druhé znamenalo ťuknout a přepsat ručně.

**Rozhodnutí: podržet a táhnout.** Gesto se ozbrojí až po 260 ms držení prstu.
Do té doby je buňka obyčejné tlačítko a svislé tažení patří rolování stránky.
Bez téhle prodlevy by se přetahování s rolováním pralo, protože série jsou pod
sebou a obě gesta jsou svislá. Jakmile se gesto chytne, `onPanResponderTerminationRequest`
vrací false, takže ho ScrollView nemůže sebrat.

**Proč PanResponder a ne gesture-handler.** `react-native-gesture-handler` má na
tohle `activateAfterLongPress`, ale chtěl by `GestureHandlerRootView` kolem celé
aplikace. To je zásah do kořene, který se z Windows neověří. PanResponder stačí
a je to stejná volba jako u zavírání klávesnice (S8).

**Cíl se hledá podle změřených řádků.** `dropIndex` bere svislé středy řádků
(každý řádek si je hlásí přes `onLayout`) a vybírá ten nejbližší k místu, kam
prst dotáhl. První verze dělila posun jednou společnou výškou, což je špatně:
dokončená série si pod číslem nese ještě rozdíl proti minule, takže je o kus
vyšší a u delších cviků by se cíl minul o řádek. Dokud se pozice nezměří, jede
se podle náhradní výšky. Vedlejší efekt téhle cesty je užitečný: táhne se jen
uvnitř jednoho sloupce jednoho cviku, takže váha nemůže skončit v opakováních
ani u jiného cviku - ne proto, že by to kontrola zakázala, ale protože na to
gesto nedosáhne.

**Co se kopíruje.** Hodnota tak, jak je uložená, tedy u váhy celkové kilogramy.
U cviků s vlastní vahou je `Workout.bodyweightKg` pro celý trénink stejný, takže
zkopírovaná celková váha dá v +KG sloupci přesně ten přídavek, který uživatel
viděl u zdroje. Čistá část je `valueToCopy` v `src/lib/copyValue.ts`.

**Dokončené série jdou přepsat.** Ťuknutím se dokončená série upravit dá už dnes,
tak by bylo divné, aby zrovna přetažení couvlo. Zdroj se nikdy nemění.

**Zpětná vazba.** Zdroj zešedne a orámuje se přerušovaně, cíl se zvýrazní zeleně.
Haptika cvakne při chycení a při zapsání. Prázdná zdrojová buňka nemá co dát,
takže se cíl nezvýrazní a puštění nic neudělá.

**Past.** PanResponder se v buňce vyrábí jen jednou. Při tažení se rodič
překresluje na každý posun a nová instance by měla vlastní prázdný `gestureState`,
takže by puštění hlásilo posun 0 a hodnota by se zapsala zpátky do zdroje.
Callbacky proto chodí přes ref.

---

## S17 - Šikmé břišní jsou vlastní partie na svalové mapě (20. 9. 2026)

**Stav.** Mapa znala třináct oblastí. Šikmé břišní byly na siluetě nakreslené,
ale patřily do skupiny `Břicho`, takže se barvily jeho číslem a ťuknutí otevřelo
sheet břicha. Objem z úklonů a rotací spadl do jednoho pytle s crunchi.

**Rozhodnutí: přidat jen šikmé břišní, ne adduktory ani dělení ramen.** Uživatel
si ze tří nabídek vybral tuhle. Mapa má tedy čtrnáct oblastí. Adduktory zůstávají
nakreslené pod kvadricepsy a ramena jedna oblast; kdyby se to později mělo měnit,
postup je stejný jako tady.

**Stará data se nehnou.** `DETAIL_DEFAULT` pro `Břicho` žádný záznam nemá, takže
cvik uložený s partií `Břicho` pořád vychází jako `Břicho`. Nic se nemigruje a
žádný existující záznam se nepřepisuje.

**Vlastní cviky se poznají podle názvu.** `detailByName` umí u skupiny `Břicho`
klíčová slova šikmé, oblique, twist, dřevorubec, woodchop, úklon, side bend a
boční. Vlastní cvik pojmenovaný „Úklony s jednoručkou" a uložený pod břichem tak
spadne na šikmé sám, stejně jako to dělá mrtvý tah u zad a nohou.

**Past, na kterou se přišlo při testech.** Heuristika podle názvu platí i pro
vedlejší partie. Nový cvik „Dřevorubec na kladce" má vedlejší `Břicho`, ale název
obsahuje klíčové slovo, takže by i tahle půlka spadla na šikmé a přímý břišní sval
by z rotací neměl nic. Proto mají `russian-twist`, `cable-woodchop` a `side-plank`
v `DETAIL_OVERRIDES` natvrdo `Břicho: 'Břicho'` - konkrétní cvik vyhrává nad
heuristikou.

**Přibyly čtyři cviky do katalogu.** Ruský twist, Dřevorubec na kladce, Úklony
s jednoručkou a Boční prkno. Bez nich by nová oblast neměla z čeho svítit a
uživatel by si musel každý cvik na šikmé založit ručně.

**Nová pojistka v testech.** `muscleMap.test.ts` hlídá dvě věci, které se dají
snadno porušit: každá oblast mapy musí jít u cviku vybrat, a každá partie
z katalogu cviků musí mít na mapě své místo. Cvik s partií, kterou mapa nezná,
by jinak mlčky zmizel z objemu.
