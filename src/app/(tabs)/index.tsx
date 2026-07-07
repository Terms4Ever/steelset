import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Card, PrimaryButton, Screen, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { weekStreak, workoutVolumeEx } from '@/lib/calc';
import { fmtClock, fmtHeaderDate, fmtWeight, relativeDay } from '@/lib/format';
import { useHealthScan } from '@/lib/useHealthScan';
import { activeWorkout, exercisesById as exByIdSel, history as historySel, useStore } from '@/store/useStore';

export default function Dnesek() {
  const router = useRouter();
  const now = Date.now();

  const workouts = useStore((s) => s.workouts);
  const routines = useStore((s) => s.routines);
  const activeId = useStore((s) => s.activeWorkoutId);
  const startWorkout = useStore((s) => s.startWorkout);
  const discardWorkout = useStore((s) => s.discardWorkout);
  const dismissHealthWorkouts = useStore((s) => s.dismissHealthWorkouts);
  const unit = useStore((s) => s.settings.unit);
  const custom = useStore((s) => s.customExercises);
  const exerciseMuscles = useStore((s) => s.exerciseMuscles);
  const exById = useMemo(() => exByIdSel({ customExercises: custom, exerciseMuscles }), [custom, exerciseMuscles]);
  const newHealth = useHealthScan();

  const active = useMemo(() => activeWorkout({ workouts, activeWorkoutId: activeId }), [workouts, activeId]);
  const finished = useMemo(() => historySel({ workouts }), [workouts]);
  const streak = useMemo(() => weekStreak(workouts, now), [workouts, now]);

  const start = (routineId: string | null) => {
    if (active) return router.push('/workout');
    startWorkout(routineId);
    router.push('/workout');
  };

  const logManual = () => {
    if (active) {
      const hasData = active.exercises.some((le) => le.sets.some((s) => s.done));
      // Real in-progress workout: open it (don't lose data). Empty leftover: drop it and start fresh.
      if (hasData) {
        router.push('/workout');
        return;
      }
      discardWorkout();
    }
    startWorkout(null, true);
    router.push('/workout');
  };

  return (
    <Screen>
      {/* header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Txt size={type.caption} weight="semibold" color={palette.textDim} style={{ letterSpacing: 1 }}>
            {fmtHeaderDate(now)}
          </Txt>
          <Txt size={type.title} weight="bold" style={{ marginTop: 2 }}>
            Dnešek
          </Txt>
        </View>
        {streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.surface2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill }}>
            <Ionicons name="flame" size={15} color={palette.accent} />
            <Txt size={type.label} weight="bold" num>
              {streak}
            </Txt>
            <Txt size={type.caption} weight="medium" color={palette.textDim}>
              týd.
            </Txt>
          </View>
        )}
      </View>

      {/* Apple Health: new workouts detected (Strava-style) */}
      {newHealth.length > 0 && (
        <Pressable
          onPress={() => router.push('/health-import')}
          style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.accentDeep, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: palette.accent }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="heart" size={20} color={palette.bg} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={type.body} weight="bold">
              {newHealth.length === 1 ? 'Nový trénink z Apple Health' : `${newHealth.length} nových tréninků z Apple Health`}
            </Txt>
            <Txt size={type.caption} weight="medium" color={palette.textMute}>
              Ťukni pro import i s tepem
            </Txt>
          </View>
          <Pressable onPress={() => dismissHealthWorkouts(newHealth.map((w) => w.uuid))} hitSlop={12}>
            <Ionicons name="close" size={20} color={palette.textDim} />
          </Pressable>
        </Pressable>
      )}

      {/* primary action - logging first */}
      <View style={{ marginTop: space.xl }}>
        <PrimaryButton
          label={active ? 'Pokračovat v tréninku' : 'Začít trénink'}
          sublabel={active ? active.name : 'Živě - zapisuj série během cvičení'}
          onPress={() => start(null)}
        />
        <Pressable
          onPress={logManual}
          style={{ marginTop: 10, paddingVertical: 14, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: palette.hairline, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Ionicons name="create-outline" size={18} color={palette.textDim} />
          <Txt size={type.body} weight="semibold" color={palette.textDim}>
            Zapsat hotový trénink
          </Txt>
        </Pressable>
      </View>

      {/* your routines - one tap to start */}
      {routines.length > 0 && (
        <View style={{ marginTop: space.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Txt size={type.label} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5 }}>
              TVOJE PLÁNY
            </Txt>
            <Pressable onPress={() => router.push('/plany')}>
              <Txt size={type.label} weight="semibold" color={palette.accent}>
                Vše
              </Txt>
            </Pressable>
          </View>
          <View style={{ gap: space.sm }}>
            {routines.slice(0, 4).map((r) => (
              <Pressable key={r.id} onPress={() => start(r.id)} disabled={!!active || r.exercises.length === 0}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="barbell-outline" size={20} color={palette.textDim} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={type.body} weight="bold">
                      {r.name}
                    </Txt>
                    <Txt size={type.caption} weight="medium" color={palette.textMute}>
                      {r.exercises.length} cviků
                    </Txt>
                  </View>
                  {!active && r.exercises.length > 0 && (
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="play" size={18} color={palette.bg} />
                    </View>
                  )}
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* recent workouts */}
      <View style={{ marginTop: space.xl }}>
        <Txt size={type.label} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginBottom: 10 }}>
          NEDÁVNÉ TRÉNINKY
        </Txt>
        {finished.length === 0 ? (
          <Card>
            <Txt size={type.body} weight="medium" color={palette.textMute}>
              Zatím žádný trénink. Klikni na „Začít trénink" a zapiš první sérii.
            </Txt>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            {finished.slice(0, 5).map((w, i) => {
              const setCount = w.exercises.reduce((n, le) => n + le.sets.length, 0);
              const empty = w.exercises.length === 0;
              const dur = w.finishedAt && !w.manual ? Math.round((w.finishedAt - w.startedAt) / 1000) : 0;
              const sub = empty
                ? [relativeDay(w.finishedAt!, now), dur >= 30 ? fmtClock(dur) : null, w.avgHr ? `⌀${w.avgHr} tep` : null]
                    .filter(Boolean)
                    .join(' · ')
                : `${relativeDay(w.finishedAt!, now)} · ${w.exercises.length} cviků · ${setCount} sérií`;
              return (
                <Pressable key={w.id} onPress={() => router.push(`/history/${w.id}`)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: space.lg, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: palette.hairline }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={type.body} weight="semibold">
                      {w.name}
                    </Txt>
                    <Txt size={type.caption} weight="medium" num color={palette.textMute}>
                      {sub}
                    </Txt>
                  </View>
                  {empty ? (
                    w.source === 'health' ? <Ionicons name="heart" size={16} color={palette.red} /> : null
                  ) : (
                    <Txt size={type.body} weight="bold" num color={palette.textDim}>
                      {fmtWeight(workoutVolumeEx(w, exById), unit)}
                    </Txt>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={palette.textMute} />
                </Pressable>
              );
            })}
          </Card>
        )}
      </View>
    </Screen>
  );
}
