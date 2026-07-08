import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, View } from 'react-native';
import Animated, { SlideInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { LoggedExercise, MUSCLE_GROUP_OPTIONS, MuscleGroup, SetEntry, SetType } from '@/data/types';
import { isPR, lastPerformance, MS } from '@/lib/calc';
import { dayName, fmtBwWeight, fmtClock, fmtDateShort, fmtNum, fmtWeight, fromDisplayWeight, toDisplayWeight, unitIncrement } from '@/lib/format';
import { haptic } from '@/lib/haptic';
import { heartRateFor } from '@/lib/health';
import { liveActivity } from '@/lib/liveActivity';
import { activeWorkout, exercisesById as exByIdSel, useStore } from '@/store/useStore';

const SET_TAG_COLOR: Record<SetType, string> = {
  W: palette.amber,
  R: palette.textDim,
  D: palette.heatCold,
  F: palette.red,
};

type Focus = { ex: number; set: number; field: 'weight' | 'reps' } | null;

export default function Workout() {
  const router = useRouter();
  const workouts = useStore((s) => s.workouts);
  const activeId = useStore((s) => s.activeWorkoutId);
  const custom = useStore((s) => s.customExercises);
  const increment = useStore((s) => s.settings.increment);
  const incrementLb = useStore((s) => s.settings.incrementLb);
  const restDefault = useStore((s) => s.settings.restDefaultSec);
  const unit = useStore((s) => s.settings.unit);
  const bodyweightSetting = useStore((s) => s.settings.bodyweightKg);
  const { updateSet, addSet, toggleSetDone, removeSet, removeActiveExercise, finishWorkout, discardWorkout, startWorkout, linkSuperset, setWorkoutDate, setWorkoutHr, setExerciseMuscles } = useStore();
  const exerciseMuscles = useStore((s) => s.exerciseMuscles);
  const healthEnabled = useStore((s) => s.settings.healthEnabled);
  const insets = useSafeAreaInsets();

  const active = useMemo(() => activeWorkout({ workouts, activeWorkoutId: activeId }), [workouts, activeId]);
  const exById = useMemo(() => exByIdSel({ customExercises: custom, exerciseMuscles }), [custom, exerciseMuscles]);
  const showsW = (exId: string) => {
    const t = exById[exId]?.tracking;
    return t === undefined || t === 'weight_reps' || t === 'weighted_bw' || t === 'distance_time';
  };
  // weighted-bodyweight (shyby/dipy): weight is stored as TOTAL kg, the user enters/sees only the ADDED
  // part (+KG column) — negative = assisted. Bodyweight comes from the workout snapshot.
  const isBw = (exId: string) => exById[exId]?.tracking === 'weighted_bw';
  const bwKg = active?.bodyweightKg ?? bodyweightSetting;

  const [, setTick] = useState(0);
  const [focus, setFocus] = useState<Focus>(null);
  const [draft, setDraft] = useState('');
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [pr, setPr] = useState<string | null>(null);
  // exercise-settings sheet: muscles + unilateral flag draft
  const [muscleEdit, setMuscleEdit] = useState<{ exId: string; primary: MuscleGroup; secondary: MuscleGroup[]; unilateral: boolean } | null>(null);
  // rest is timestamp-based so it keeps counting real time across backgrounding
  const restLeft = restEndAt != null ? Math.max(0, Math.ceil((restEndAt - Date.now()) / 1000)) : null;
  const restEndRef = useRef<number | null>(null);
  restEndRef.current = restEndAt;

  useEffect(() => {
    // fire the rest-complete haptic + clear the banner as soon as the timer elapses — driven by the
    // 1s tick and by AppState 'active', so it stays correct after the app was backgrounded (single source).
    const check = () => {
      if (restEndRef.current != null && Date.now() >= restEndRef.current) {
        restEndRef.current = null; // synchronous guard so a second check() (interval + AppState) can't double-fire
        haptic.medium();
        setRestEndAt(null);
      }
    };
    const id = setInterval(() => {
      setTick((t) => t + 1);
      check();
    }, 1000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        setTick((t) => t + 1);
        check();
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  useEffect(() => {
    if (!pr) return;
    const id = setTimeout(() => setPr(null), 2800);
    return () => clearTimeout(id);
  }, [pr]);
  // Live Activity (Dynamic Island / lock screen): start for live workouts, keep sets + rest in sync
  useEffect(() => {
    if (!active || active.manual) return;
    const done = active.exercises.reduce((n, le) => n + le.sets.filter((s) => s.done).length, 0);
    const total = active.exercises.reduce((n, le) => n + le.sets.length, 0);
    liveActivity.startFor(active.id, active.name, active.startedAt, done, total);
    liveActivity.update(done, total, restEndAt);
  }, [active, restEndAt]);

  if (!active) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
        <Txt size={type.h1} weight="bold">
          Žádný aktivní trénink
        </Txt>
        <Pressable
          onPress={() => {
            startWorkout(null);
          }}
          style={{ marginTop: 16, backgroundColor: palette.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.md }}>
          <Txt size={type.body} weight="bold" color={palette.bg}>
            Začít volný trénink
          </Txt>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Txt color={palette.textDim}>Zpět</Txt>
        </Pressable>
      </SafeAreaView>
    );
  }

  const elapsed = Math.floor((Date.now() - active.startedAt) / 1000);
  const doneCount = active.exercises.reduce((n, le) => n + le.sets.filter((s) => s.done).length, 0);
  const totalSets = active.exercises.reduce((n, le) => n + le.sets.length, 0);

  const groups: Record<string, number[]> = {};
  active.exercises.forEach((le, i) => {
    if (le.supersetGroup) (groups[le.supersetGroup] ||= []).push(i);
  });
  const groupLetter: Record<string, string> = {};
  Object.keys(groups).forEach((g, i) => (groupLetter[g] = String.fromCharCode(65 + i)));
  const supTag = (le: LoggedExercise, i: number) =>
    le.supersetGroup ? `${groupLetter[le.supersetGroup]}${groups[le.supersetGroup].indexOf(i) + 1}` : null;

  // weight is stored canonically in kg (TOTAL for weighted-bodyweight); displayed/entered in the user's
  // unit — and for weighted-bodyweight the user sees/enters only the ADDED part (negative = assisted).
  const toDisp = (v: number | null, field: 'weight' | 'reps', exId: string) =>
    v === null || v === undefined
      ? null
      : field !== 'weight'
        ? v
        : toDisplayWeight(isBw(exId) ? v - bwKg : v, unit);
  const fromDisp = (raw: number, field: 'weight' | 'reps', exId: string) =>
    field !== 'weight' ? raw : isBw(exId) ? bwKg + fromDisplayWeight(raw, unit) : fromDisplayWeight(raw, unit);


  const cellValue = (ex: number, set: number, field: 'weight' | 'reps'): string => {
    if (focus && focus.ex === ex && focus.set === set && focus.field === field) return draft;
    const d = toDisp(active.exercises[ex].sets[set][field], field, active.exercises[ex].exerciseId);
    return d === null ? '' : fmtNum(d, 2).replace(',', '.');
  };

  const focusCell = (ex: number, set: number, field: 'weight' | 'reps') => {
    const d = toDisp(active.exercises[ex].sets[set][field], field, active.exercises[ex].exerciseId);
    setDraft(d === null ? '' : String(Math.round(d * 100) / 100));
    setFocus({ ex, set, field });
  };

  const writeDraft = (next: string) => {
    setDraft(next);
    if (!focus) return;
    const raw = next === '' || next === '.' || next === '-' ? null : Number(next.replace(',', '.'));
    const val =
      raw === null || Number.isNaN(raw)
        ? null
        : fromDisp(raw, focus.field, active.exercises[focus.ex].exerciseId);
    updateSet(focus.ex, focus.set, { [focus.field]: val });
  };

  const key = (k: string) => {
    if (!focus) return;
    haptic.tap();
    if (k === 'del') return writeDraft(draft.slice(0, -1));
    if (k === '.') return writeDraft(draft.includes('.') ? draft : draft === '' ? '0.' : draft + '.');
    writeDraft(draft + k);
  };
  const step = (d: number) => {
    if (!focus) return;
    haptic.tap();
    const bwFocused = focus.field === 'weight' && isBw(active.exercises[focus.ex].exerciseId);
    // added weight may go negative down to -bodyweight (assisted); everything else floors at 0
    const min = bwFocused ? -Math.round(toDisplayWeight(bwKg, unit) * 100) / 100 : 0;
    const cur = Number(draft.replace(',', '.')) || 0;
    const v = Math.max(min, Math.round((cur + d) * 100) / 100);
    writeDraft(focus.field === 'weight' ? String(v) : String(Math.round(Math.max(0, v))));
  };
  const next = () => {
    if (!focus) return;
    const le = active.exercises[focus.ex];
    if (focus.field === 'weight') return focusCell(focus.ex, focus.set, 'reps');
    // move to next undone set in same exercise, else next exercise
    const ns = le.sets.findIndex((s, i) => i > focus.set && !s.done);
    if (ns !== -1) return focusCell(focus.ex, ns, showsW(le.exerciseId) ? 'weight' : 'reps');
    const ne = active.exercises.findIndex((x, i) => i > focus.ex && x.sets.some((s) => !s.done));
    if (ne !== -1) {
      const nx = active.exercises[ne];
      return focusCell(ne, nx.sets.findIndex((s) => !s.done), showsW(nx.exerciseId) ? 'weight' : 'reps');
    }
    setFocus(null);
  };

  const commit = (ex: number, set: number) => {
    const s = active.exercises[ex].sets[set];
    if (s.done) {
      haptic.tap();
      return toggleSetDone(ex, set);
    }
    const exId = active.exercises[ex].exerciseId;
    const showW = showsW(exId);
    const bwEx = isBw(exId);
    // weighted-bodyweight: empty weight = plain BW (+0), so only reps are required there
    if ((showW && !bwEx && (!s.weight || !s.reps)) || ((!showW || bwEx) && !s.reps)) {
      haptic.warning();
      return focusCell(ex, set, showW && !bwEx && !s.weight ? 'weight' : 'reps');
    }
    const effWeight = s.weight ?? (bwEx ? bwKg : null);
    const wasPR = showW && isPR(workouts, exId, effWeight, s.reps);
    updateSet(ex, set, { done: true, doneAt: Date.now(), ...(bwEx && s.weight == null ? { weight: bwKg } : {}) });
    if (!active.manual) setRestEndAt(Date.now() + restDefault * 1000);
    if (wasPR) {
      haptic.success();
      setPr(`Nový rekord! ${bwEx ? fmtBwWeight(effWeight!, bwKg, unit) : fmtWeight(effWeight!, unit)} × ${s.reps}`);
    } else {
      haptic.light();
    }
    // advance focus
    const le = active.exercises[ex];
    const ns = le.sets.findIndex((x, i) => i > set && !x.done);
    if (ns !== -1) focusCell(ex, ns, showW ? 'weight' : 'reps');
    else setFocus(null);
  };

  const onFinish = () => {
    const w = active;
    // don't silently discard: a live workout with no completed set stays put + asks the user
    const hasDone = w.exercises.some((le) => le.sets.some((s) => s.done));
    if (!w.manual && !hasDone) {
      haptic.warning();
      Alert.alert(
        'Žádná hotová série',
        'Označ aspoň jednu sérii zeleným ✓ (ťukni kolečko vpravo u série) a pak dej Hotovo. Nebo trénink zahoď.',
        [
          { text: 'Pokračovat v zápisu', style: 'cancel' },
          { text: 'Zahodit trénink', style: 'destructive', onPress: () => { liveActivity.end(); discardWorkout(); router.replace('/'); } },
        ],
      );
      return;
    }
    liveActivity.end();
    finishWorkout();
    router.replace('/');
    // Apple Health: pull the heart rate the Watch recorded (read-only; we never write workouts).
    if (w && !w.manual && healthEnabled) {
      const start = w.startedAt;
      const end = Date.now();
      heartRateFor(start, end).then((hr) => {
        if (hr.avg || hr.max || hr.kcal || hr.series.length) setWorkoutHr(w.id, hr.avg, hr.max, hr.series.length ? hr.series : undefined, hr.kcal);
      });
    }
  };
  const onDiscard = () => {
    liveActivity.end();
    discardWorkout();
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top }}>
      {/* top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-down" size={26} color={palette.textDim} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Txt size={type.h2} weight="bold">
            {active.name}
          </Txt>
          {active.manual ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 1 }}>
              <Pressable onPress={() => setWorkoutDate(active.startedAt - MS.DAY)} hitSlop={8}>
                <Ionicons name="chevron-back" size={16} color={palette.textDim} />
              </Pressable>
              <Txt size={type.caption} weight="semibold" color={palette.accent}>
                {dayName(active.startedAt)} {fmtDateShort(active.startedAt)}
              </Txt>
              <Pressable onPress={() => active.startedAt + MS.DAY <= Date.now() && setWorkoutDate(active.startedAt + MS.DAY)} hitSlop={8}>
                <Ionicons name="chevron-forward" size={16} color={active.startedAt + MS.DAY <= Date.now() ? palette.textDim : palette.surface3} />
              </Pressable>
            </View>
          ) : (
            <Txt size={type.caption} weight="medium" num color={palette.textMute}>
              {fmtClock(elapsed)} · {doneCount}/{totalSets} sérií
            </Txt>
          )}
        </View>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {active.exercises.length === 0 && (
          <Txt size={type.body} weight="medium" color={palette.textMute} style={{ marginTop: 20, textAlign: 'center' }}>
            Volný trénink - přidej první cvik.
          </Txt>
        )}

        {active.exercises.map((le, ex) => {
          const exDef = exById[le.exerciseId];
          const showW = showsW(le.exerciseId);
          const repsLbl = exDef?.tracking === 'time' ? 'ČAS (s)' : 'OPAK.';
          const prev = lastPerformance(workouts, le.exerciseId);
          const tag = supTag(le, ex);
          const grouped = !!le.supersetGroup;
          const contWithPrev = grouped && active.exercises[ex - 1]?.supersetGroup === le.supersetGroup;
          return (
            <View
              key={`${le.exerciseId}-${ex}`}
              style={{
                marginTop: ex === 0 ? 8 : contWithPrev ? 8 : 22,
                borderLeftWidth: grouped ? 3 : 0,
                borderLeftColor: palette.accent,
                paddingLeft: grouped ? 12 : 0,
                marginLeft: grouped ? 2 : 0,
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() =>
                    exDef &&
                    setMuscleEdit({
                      exId: le.exerciseId,
                      primary: exDef.primary,
                      secondary: exDef.secondary ?? [],
                      unilateral: !!exDef.unilateral,
                    })
                  }>
                  <Txt size={type.caption} weight="bold" color={palette.accent} style={{ letterSpacing: 1 }}>
                    {tag ? `SUPERSÉRIE ${tag}` : `CVIK ${ex + 1}/${active.exercises.length}`}
                  </Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Txt size={type.h1} weight="bold">
                      {exDef?.name ?? 'Cvik'}
                    </Txt>
                    <Ionicons name="pencil-outline" size={13} color={palette.textMute} />
                  </View>
                  {exDef && (
                    <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginTop: 1 }} numberOfLines={1}>
                      {[exDef.primary, ...(exDef.secondary ?? [])].join(' · ')}
                      {exDef.unilateral ? ' · 1-str.' : ''}
                    </Txt>
                  )}
                </Pressable>
                <Pressable
                  hitSlop={6}
                  onPress={() =>
                    Alert.alert('Odebrat cvik?', exDef?.name ?? 'Cvik', [
                      { text: 'Zrušit', style: 'cancel' },
                      { text: 'Odebrat', style: 'destructive', onPress: () => { setFocus(null); removeActiveExercise(ex); } },
                    ])
                  }
                  style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={22} color={palette.textMute} />
                </Pressable>
              </View>

              {/* column headers */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 6 }}>
                <Txt size={type.caption} weight="semibold" color={palette.textMute} style={{ width: 40 }}>
                  SÉRIE
                </Txt>
                {showW && (
                  <Txt size={type.caption} weight="semibold" color={palette.textMute} style={{ flex: 1, textAlign: 'center' }}>
                    {isBw(le.exerciseId) ? `+${unit.toUpperCase()}` : unit.toUpperCase()}
                  </Txt>
                )}
                <Txt size={type.caption} weight="semibold" color={palette.textMute} style={{ flex: 1, textAlign: 'center' }}>
                  {repsLbl}
                </Txt>
                <View style={{ width: 48 }} />
              </View>

              {le.sets.map((s, si) => {
                const p = prev?.[si];
                // per-set delta vs the same set last session, shown once the set is done (+5 kg / +2 opak.)
                const dW = s.done && p?.weight != null && s.weight != null ? toDisplayWeight(s.weight - p.weight, unit) : null;
                const dR = s.done && p?.reps != null && s.reps != null ? s.reps - p.reps : null;
                return (
                  <View
                    key={si}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: s.done ? palette.accentDeep : palette.surface,
                      borderRadius: radius.sm,
                      paddingVertical: 9,
                      paddingHorizontal: 6,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: s.done ? 'transparent' : palette.hairline,
                    }}>
                    <Pressable
                      onPress={() => cycleType(updateSet, ex, si, s)}
                      style={{ width: 40, alignItems: 'center' }}>
                      <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: s.done ? 'transparent' : palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                        <Txt size={type.label} weight="bold" color={s.type === 'R' ? palette.text : SET_TAG_COLOR[s.type]}>
                          {s.type === 'R' ? String(workingIndex(le.sets, si)) : s.type}
                        </Txt>
                      </View>
                    </Pressable>

                    {showW && (
                      <Cell focused={isFocus(focus, ex, si, 'weight')} value={cellValue(ex, si, 'weight')} ghost={p?.weight != null ? fmtNum(toDisplayWeight(isBw(le.exerciseId) ? p.weight - bwKg : p.weight, unit), 2).replace(',', '.') : ''} done={s.done} delta={dW} onPress={() => focusCell(ex, si, 'weight')} />
                    )}
                    <Cell focused={isFocus(focus, ex, si, 'reps')} value={cellValue(ex, si, 'reps')} ghost={p?.reps != null ? String(p.reps) : ''} done={s.done} delta={dR} deltaInt onPress={() => focusCell(ex, si, 'reps')} />

                    <Pressable onLongPress={() => removeSet(ex, si)} onPress={() => commit(ex, si)} style={{ width: 48, alignItems: 'center' }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: s.done ? palette.accent : 'transparent', borderWidth: s.done ? 0 : 2, borderColor: palette.surface3, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark" size={20} color={s.done ? palette.bg : palette.textMute} />
                      </View>
                    </Pressable>
                  </View>
                );
              })}

              <Pressable onPress={() => addSet(ex)} style={{ paddingVertical: 11, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: palette.hairline, borderStyle: 'dashed' }}>
                <Txt size={type.label} weight="semibold" color={palette.textDim}>
                  + Přidat sérii
                </Txt>
              </Pressable>

              {ex < active.exercises.length - 1 &&
                (() => {
                  const linked = grouped && active.exercises[ex + 1]?.supersetGroup === le.supersetGroup;
                  return (
                    <Pressable
                      onPress={() => {
                        haptic.tap();
                        linkSuperset(ex);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginTop: 6 }}>
                      <Ionicons name={linked ? 'unlink-outline' : 'git-merge-outline'} size={14} color={linked ? palette.textMute : palette.accent} />
                      <Txt size={type.caption} weight="semibold" color={linked ? palette.textMute : palette.accent}>
                        {linked ? 'Zrušit supersérii' : 'Supersérie s dalším cvikem'}
                      </Txt>
                    </Pressable>
                  );
                })()}
            </View>
          );
        })}

        <Pressable
          onPress={() => router.push('/exercises?target=workout')}
          style={{ marginTop: 20, paddingVertical: 14, alignItems: 'center', borderRadius: radius.md, backgroundColor: palette.surface2 }}>
          <Txt size={type.body} weight="bold" color={palette.accent}>
            + Přidat cvik
          </Txt>
        </Pressable>

        <View style={{ height: 1, backgroundColor: palette.hairline, marginTop: 24, marginBottom: 20 }} />

        <Pressable
          onPress={onFinish}
          style={({ pressed }) => ({ paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderRadius: radius.md, backgroundColor: palette.accent, opacity: pressed ? 0.85 : 1 })}>
          <Ionicons name="checkmark-circle" size={20} color={palette.bg} />
          <Txt size={17} weight="bold" color={palette.bg}>
            Ukončit trénink
          </Txt>
        </Pressable>

        <Pressable
          onPress={onDiscard}
          style={({ pressed }) => ({ marginTop: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, borderRadius: radius.md, backgroundColor: palette.surface2, opacity: pressed ? 0.85 : 1 })}>
          <Ionicons name="trash-outline" size={17} color={palette.red} />
          <Txt size={type.label} weight="semibold" color={palette.red}>
            Zahodit trénink
          </Txt>
        </Pressable>
      </ScrollView>

      {pr && (
        <Animated.View key={pr} entering={ZoomIn.duration(280)} style={{ position: 'absolute', left: space.xl, right: space.xl, bottom: focus ? 322 : 28, backgroundColor: palette.accent, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="trophy" size={20} color={palette.bg} />
          <Txt size={type.body} weight="bold" color={palette.bg}>
            {pr}
          </Txt>
        </Animated.View>
      )}

      {restLeft !== null && restLeft > 0 && !pr && (
        <Animated.View entering={SlideInDown.duration(220)} style={{ position: 'absolute', left: space.xl, right: space.xl, bottom: focus ? 322 : 28, backgroundColor: palette.surface2, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: palette.hairline }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="timer-outline" size={18} color={palette.accent} />
            <Txt size={type.body} weight="bold" num>
              Odpočinek {fmtClock(restLeft)}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <RestBtn label="-15" onPress={() => setRestEndAt((e) => Math.max(Date.now(), (e ?? Date.now()) - 15000))} />
            <RestBtn label="+15" onPress={() => setRestEndAt((e) => Math.max(Date.now(), e ?? Date.now()) + 15000)} />
            <RestBtn label="Přeskočit" onPress={() => setRestEndAt(null)} />
          </View>
        </Animated.View>
      )}

      {focus && (
        <Animated.View entering={SlideInDown.duration(180)}>
          <Keypad onKey={key} onStep={step} onNext={next} inc={focus.field === 'reps' ? { full: 5, half: 1 } : unitIncrement(unit, increment, incrementLb)} />
        </Animated.View>
      )}

      {/* muscle-reassignment sheet */}
      {muscleEdit && (
        <Pressable
          onPress={() => setMuscleEdit(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: palette.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: space.xl, paddingBottom: 34, borderWidth: 1, borderColor: palette.hairline }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: palette.surface3, alignSelf: 'center', marginBottom: 12 }} />
            <Txt size={type.h1} weight="bold">
              Nastavení cviku
            </Txt>
            <Txt size={type.label} weight="medium" color={palette.textMute} style={{ marginTop: 2 }}>
              {exById[muscleEdit.exId]?.name ?? 'Cvik'} - změna platí všude (i v historii a mapě)
            </Txt>

            <Txt size={type.caption} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginTop: space.lg, marginBottom: 8 }}>
              HLAVNÍ PARTIE
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MUSCLE_GROUP_OPTIONS.map((m) => {
                const on = muscleEdit.primary === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMuscleEdit({ ...muscleEdit, primary: m, secondary: muscleEdit.secondary.filter((x) => x !== m) })}
                    style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: on ? palette.accent : palette.surface2 }}>
                    <Txt size={type.label} weight="bold" color={on ? palette.bg : palette.textDim}>
                      {m}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>

            <Txt size={type.caption} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginTop: space.lg, marginBottom: 8 }}>
              VEDLEJŠÍ (volitelné)
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MUSCLE_GROUP_OPTIONS.filter((m) => m !== muscleEdit.primary).map((m) => {
                const on = muscleEdit.secondary.includes(m);
                return (
                  <Pressable
                    key={m}
                    onPress={() =>
                      setMuscleEdit({
                        ...muscleEdit,
                        secondary: on ? muscleEdit.secondary.filter((x) => x !== m) : [...muscleEdit.secondary, m],
                      })
                    }
                    style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: on ? palette.accentDeep : palette.surface2, borderWidth: 1, borderColor: on ? palette.accent : 'transparent' }}>
                    <Txt size={type.label} weight="semibold" color={on ? palette.accent : palette.textDim}>
                      {m}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setMuscleEdit({ ...muscleEdit, unilateral: !muscleEdit.unilateral })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: space.lg, backgroundColor: palette.surface2, borderRadius: radius.md, padding: space.lg }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  backgroundColor: muscleEdit.unilateral ? palette.accent : 'transparent',
                  borderWidth: muscleEdit.unilateral ? 0 : 2,
                  borderColor: palette.surface3,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {muscleEdit.unilateral && <Ionicons name="checkmark" size={16} color={palette.bg} />}
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={type.body} weight="semibold">
                  Jednostranný cvik
                </Txt>
                <Txt size={type.caption} weight="medium" color={palette.textMute}>
                  Cvičíš každou stranu zvlášť - objem se počítá 2×
                </Txt>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                setExerciseMuscles(muscleEdit.exId, muscleEdit.primary, muscleEdit.secondary, muscleEdit.unilateral);
                haptic.light();
                setMuscleEdit(null);
              }}
              style={({ pressed }) => ({ marginTop: space.lg, paddingVertical: 14, alignItems: 'center', borderRadius: radius.md, backgroundColor: palette.accent, opacity: pressed ? 0.85 : 1 })}>
              <Txt size={type.body} weight="bold" color={palette.bg}>
                Uložit nastavení cviku
              </Txt>
            </Pressable>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

function isFocus(f: Focus, ex: number, set: number, field: 'weight' | 'reps') {
  return !!f && f.ex === ex && f.set === set && f.field === field;
}
function workingIndex(sets: SetEntry[], si: number) {
  let n = 0;
  for (let i = 0; i <= si; i++) if (sets[i].type !== 'W') n++;
  return n;
}
const TYPE_CYCLE: SetType[] = ['R', 'W', 'D', 'F'];
function cycleType(updateSet: any, ex: number, si: number, s: SetEntry) {
  const nextType = TYPE_CYCLE[(TYPE_CYCLE.indexOf(s.type) + 1) % TYPE_CYCLE.length];
  updateSet(ex, si, { type: nextType });
}

function Cell({
  focused,
  value,
  ghost,
  done,
  onPress,
  delta,
  deltaInt,
}: {
  focused: boolean;
  value: string;
  ghost: string;
  done: boolean;
  onPress: () => void;
  delta?: number | null;
  deltaInt?: boolean;
}) {
  // vs-last-session delta shown under the number once the set is done (+5 / -2,5)
  const showDelta = done && delta != null && Math.abs(delta) > 0.004;
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ minWidth: 64, paddingVertical: 6, borderRadius: 10, alignItems: 'center', backgroundColor: focused ? palette.surface3 : 'transparent', borderWidth: focused ? 1 : 0, borderColor: palette.accent }}>
        <Txt size={20} weight="bold" num color={value ? (done ? palette.accent : palette.text) : palette.textGhost}>
          {value || ghost || '-'}
        </Txt>
        {showDelta && (
          <Txt size={10} weight="bold" num color={delta! > 0 ? palette.accent : palette.red} style={{ marginTop: -1 }}>
            {delta! > 0 ? '+' : ''}
            {deltaInt ? String(Math.round(delta!)) : fmtNum(delta!, 2)}
          </Txt>
        )}
      </View>
    </Pressable>
  );
}

function RestBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: palette.surface3, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill }}>
      <Txt size={type.caption} weight="semibold" color={palette.textDim}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Keypad({ onKey, onStep, onNext, inc }: { onKey: (k: string) => void; onStep: (d: number) => void; onNext: () => void; inc: { full: number; half: number } }) {
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
  return (
    <View style={{ backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.hairline, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
        <Stepper label={`-${fmtNum(inc.full, 2)}`} onPress={() => onStep(-inc.full)} />
        <Stepper label={`-${fmtNum(inc.half, 2)}`} onPress={() => onStep(-inc.half)} />
        <Stepper label={`+${fmtNum(inc.half, 2)}`} onPress={() => onStep(inc.half)} />
        <Stepper label={`+${fmtNum(inc.full, 2)}`} onPress={() => onStep(inc.full)} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 3, flexDirection: 'row', flexWrap: 'wrap' }}>
          {KEYS.map((k) => (
            <Pressable key={k} onPress={() => onKey(k)} style={{ width: '33.33%', height: 52, alignItems: 'center', justifyContent: 'center' }}>
              {k === 'del' ? <Ionicons name="backspace-outline" size={24} color={palette.text} /> : <Txt size={24} weight="semibold" num>{k}</Txt>}
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onNext} style={{ flex: 1, marginLeft: 8, marginVertical: 4, backgroundColor: palette.accent, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={type.h2} weight="bold" color={palette.bg}>
            Další
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: palette.surface2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill }}>
      <Txt size={type.label} weight="semibold" num color={palette.textDim}>
        {label}
      </Txt>
    </Pressable>
  );
}
