import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HrChart } from '@/components/HrChart';
import { PrimaryButton, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { e1rm, exerciseVolumeFor, hrWindow, perExerciseHr, summarizeSets, workoutVolumeEx } from '@/lib/calc';
import { dayName, fmtBwWeight, fmtClock, fmtDateShort, fmtWeight, plural } from '@/lib/format';
import { heartRateFor } from '@/lib/health';
import { exercisesById as exByIdSel, useStore } from '@/store/useStore';

const TAG: Record<string, string> = { W: 'Z', R: '', D: 'D', F: 'F' };

/** "nejlepší 100 kg × 8" - the top set by estimated 1RM, so the summary shows the real effort. */
function bestSetLabel(le: any, ex: any, w: any, unit: any): string {
  const done = le.sets.filter((s: any) => s.done && s.weight != null && s.weight > 0 && s.reps);
  if (done.length < 2) return '';
  // pointless when every set was identical - the summary already says it
  if (done.every((s: any) => s.weight === done[0].weight && s.reps === done[0].reps)) return '';
  const best = done.reduce((a: any, b: any) => (e1rm(b.weight, b.reps) > e1rm(a.weight, a.reps) ? b : a));
  const wLabel = ex?.tracking === 'weighted_bw' ? fmtBwWeight(best.weight, w.bodyweightKg ?? 80, unit) : fmtWeight(best.weight, unit);
  return `nej ${wLabel} × ${best.reps}`;
}

export default function WorkoutDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workouts = useStore((s) => s.workouts);
  const custom = useStore((s) => s.customExercises);
  const exerciseMuscles = useStore((s) => s.exerciseMuscles);
  const unit = useStore((s) => s.settings.unit);
  const deleteWorkout = useStore((s) => s.deleteWorkout);
  const editWorkout = useStore((s) => s.editWorkout);
  const setWorkoutHr = useStore((s) => s.setWorkoutHr);
  const renameWorkout = useStore((s) => s.renameWorkout);
  const healthEnabled = useStore((s) => s.settings.healthEnabled);

  const w = workouts.find((x) => x.id === id);
  const exById = useMemo(() => exByIdSel({ customExercises: custom, exerciseMuscles }), [custom, exerciseMuscles]);
  const [hrLoading, setHrLoading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const saveName = () => {
    if (w && draftName.trim()) renameWorkout(w.id, draftName);
    setRenaming(false);
  };

  const canPullHr = !!w && !w.manual && healthEnabled && !!w.finishedAt;
  const fetchHr = async () => {
    if (!w || !w.finishedAt) return;
    setHrLoading(true);
    const hr = await heartRateFor(w.startedAt, w.finishedAt);
    setHrLoading(false);
    if (hr.avg || hr.max || hr.kcal || hr.series.length) setWorkoutHr(w.id, hr.avg, hr.max, hr.series.length ? hr.series : undefined, hr.kcal);
  };
  // auto-pull once when opening a RECENT workout (Watch HR often syncs shortly after finishing).
  // old workouts without HR are left alone — user can pull manually — so we don't re-query every open.
  useEffect(() => {
    const recent = !!w?.finishedAt && Date.now() - w.finishedAt < 2 * 86400000;
    if (canPullHr && !w?.hrSeries && recent) fetchHr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // effective HR window — falls back to the series' own span for records whose window an older
  // version collapsed during editing (so the graph still shows)
  const hrWin = useMemo(() => (w ? hrWindow(w) : null), [w]);
  // completed-set timestamps → vertical markers on the HR chart. Only keep those inside the window;
  // a set (re)completed while editing gets an edit-time doneAt that would land outside.
  const setMarkers = useMemo(
    () =>
      w && hrWin
        ? w.exercises
            .flatMap((le) => le.sets.map((s) => s.doneAt))
            .filter((t): t is number => typeof t === 'number' && t >= hrWin.start && t <= hrWin.end)
        : [],
    [w, hrWin],
  );
  // per-exercise average HR by index (segmented timeline; see calc.perExerciseHr)
  const exHr = useMemo<(number | null)[]>(() => (w ? perExerciseHr(w) : []), [w]);

  if (!w) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt color={palette.textDim}>Trénink nenalezen.</Txt>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Txt color={palette.accent}>Zpět</Txt>
        </Pressable>
      </SafeAreaView>
    );
  }

  const when = w.finishedAt ?? w.startedAt;
  const durationSec = w.finishedAt && !w.manual ? Math.max(0, Math.round((w.finishedAt - w.startedAt) / 1000)) : 0;
  const metaParts = [
    `${dayName(when)} ${fmtDateShort(when)}`,
    ...(w.exercises.length ? [`${w.exercises.length} cviků`, fmtWeight(workoutVolumeEx(w, exById), unit)] : []),
    ...(durationSec >= 30 ? [fmtClock(durationSec)] : []),
  ];

  const onEdit = () => {
    editWorkout(w.id);
    router.replace('/workout');
  };
  const onDelete = () => {
    Alert.alert('Smazat trénink?', 'Záznam se přesune do koše (Profil → Koš) a po 7 dnech smaže.', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: () => {
          deleteWorkout(w.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={palette.textDim} />
        </Pressable>
        <Txt size={type.h2} weight="bold">
          Detail tréninku
        </Txt>
        <Pressable onPress={onDelete} hitSlop={10}>
          <Ionicons name="trash-outline" size={22} color={palette.red} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {renaming ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={saveName}
              placeholder="Název tréninku"
              placeholderTextColor={palette.textMute}
              style={{ flex: 1, backgroundColor: palette.surface2, borderRadius: radius.sm, color: palette.text, fontFamily: 'Inter_700Bold', fontSize: type.title, paddingHorizontal: 12, paddingVertical: 8 }}
            />
            <Pressable onPress={saveName} hitSlop={8} style={{ width: 38, height: 38, borderRadius: radius.sm, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark" size={20} color={palette.bg} />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => { setDraftName(w.name); setRenaming(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt size={type.title} weight="bold">
              {w.name}
            </Txt>
            <Ionicons name="pencil-outline" size={15} color={palette.textMute} />
          </Pressable>
        )}
        <Txt size={type.body} weight="medium" color={palette.textMute} style={{ marginTop: 2 }}>
          {metaParts.join(' · ')}
        </Txt>
        {w.source === 'health' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <Ionicons name="heart-circle-outline" size={15} color={palette.accent} />
            <Txt size={type.caption} weight="semibold" color={palette.accent}>
              Importováno z Apple Health
            </Txt>
          </View>
        )}
        {(w.avgHr || w.maxHr || w.kcal) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
            {(w.avgHr || w.maxHr) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="heart" size={15} color={palette.red} />
                <Txt size={type.label} weight="semibold" num>
                  {w.avgHr ? `⌀ ${w.avgHr}` : ''}
                  {w.avgHr && w.maxHr ? ' · ' : ''}
                  {w.maxHr ? `max ${w.maxHr}` : ''} tep/min
                </Txt>
              </View>
            )}
            {!!w.kcal && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flame" size={15} color={palette.amber} />
                <Txt size={type.label} weight="semibold" num>
                  {w.kcal} kcal
                </Txt>
              </View>
            )}
          </View>
        )}
        {canPullHr && (
          <Pressable
            onPress={fetchHr}
            disabled={hrLoading}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', backgroundColor: palette.surface2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill }}>
            <Ionicons name="heart-outline" size={15} color={palette.accent} />
            <Txt size={type.label} weight="semibold" color={palette.accent}>
              {hrLoading ? 'Načítám…' : w.avgHr || w.maxHr ? 'Načíst tep znovu' : 'Načíst tep z Health'}
            </Txt>
          </Pressable>
        )}

        {w.hrSeries && hrWin && (
          <View style={{ marginTop: space.lg, backgroundColor: palette.surface, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: palette.hairline }}>
            <Txt size={type.caption} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginBottom: 10 }}>
              TEP BĚHEM TRÉNINKU
            </Txt>
            <HrChart series={w.hrSeries} start={hrWin.start} end={hrWin.end} markers={setMarkers} />
            {setMarkers.length > 0 && (
              <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginTop: 8 }}>
                Svislé čáry = dokončené série
              </Txt>
            )}
          </View>
        )}

        {w.exercises.length === 0 && (
          <Txt size={type.body} weight="medium" color={palette.textMute} style={{ marginTop: space.xl }}>
            Bez zapsaných sérií{w.source === 'health' ? ' · záznam z Apple Health' : ''}. Přes „Přidat série" doplníš cviky - tep zůstane.
          </Txt>
        )}

        <View style={{ marginTop: space.xl, gap: space.md }}>
          {w.exercises.map((le, i) => (
            <View key={i} style={{ backgroundColor: palette.surface, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: palette.hairline }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Txt size={type.h2} weight="bold">
                    {exById[le.exerciseId]?.name ?? 'Cvik'}
                  </Txt>
                  <Txt size={type.caption} weight="medium" num color={palette.textMute} style={{ marginTop: 2 }} numberOfLines={1}>
                    {[
                      (() => { const n = le.sets.filter((s) => s.done).length; return `${n} ${plural(n, 'série', 'série', 'sérií')}`; })(),
                      summarizeSets(
                        le.sets.filter((s) => s.done),
                        (kg) => fmtWeight(kg, unit),
                        {
                          bwKg: exById[le.exerciseId]?.tracking === 'weighted_bw' ? (w.bodyweightKg ?? 80) : undefined,
                          hideWeight: le.sets.every((s) => s.weight == null),
                        },
                      ),
                      bestSetLabel(le, exById[le.exerciseId], w, unit),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt size={type.label} weight="semibold" num color={palette.textDim}>
                    {fmtWeight(exerciseVolumeFor(le, exById[le.exerciseId], w), unit)}
                  </Txt>
                  {exHr[i] != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                      <Ionicons name="heart" size={11} color={palette.red} />
                      <Txt size={type.caption} weight="semibold" num color={palette.textMute}>
                        ⌀ {exHr[i]} tep
                      </Txt>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ marginTop: 10, gap: 6, borderTopWidth: 1, borderTopColor: palette.hairline, paddingTop: 10 }}>
                {le.sets.map((s, si) => (
                  <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Txt size={type.label} weight="bold" color={palette.textMute} style={{ width: 24 }}>
                      {TAG[s.type] || si + 1}
                    </Txt>
                    <Txt size={type.body} weight="semibold" num>
                      {s.weight != null
                        ? exById[le.exerciseId]?.tracking === 'weighted_bw'
                          ? fmtBwWeight(s.weight, w.bodyweightKg ?? 80, unit)
                          : fmtWeight(s.weight, unit)
                        : '-'}{' '}
                      × {s.reps ?? '-'}
                    </Txt>
                    {s.rpe != null && (
                      <Txt size={type.caption} weight="medium" color={palette.textMute}>
                        RPE {s.rpe}
                      </Txt>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: space.xxl }}>
          <PrimaryButton label={w.exercises.length === 0 ? 'Přidat série' : 'Upravit trénink'} onPress={onEdit} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
