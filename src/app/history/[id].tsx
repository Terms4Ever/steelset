import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { exerciseVolume, workoutVolume } from '@/lib/calc';
import { dayName, fmtDateShort, fmtWeight } from '@/lib/format';
import { heartRateFor } from '@/lib/health';
import { exercisesById as exByIdSel, useStore } from '@/store/useStore';

const TAG: Record<string, string> = { W: 'Z', R: '', D: 'D', F: 'F' };

export default function WorkoutDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workouts = useStore((s) => s.workouts);
  const custom = useStore((s) => s.customExercises);
  const unit = useStore((s) => s.settings.unit);
  const deleteWorkout = useStore((s) => s.deleteWorkout);
  const editWorkout = useStore((s) => s.editWorkout);
  const setWorkoutHr = useStore((s) => s.setWorkoutHr);
  const healthEnabled = useStore((s) => s.settings.healthEnabled);

  const w = workouts.find((x) => x.id === id);
  const exById = useMemo(() => exByIdSel({ customExercises: custom }), [custom]);
  const [hrLoading, setHrLoading] = useState(false);

  const canPullHr = !!w && !w.manual && healthEnabled && !!w.finishedAt;
  const fetchHr = async () => {
    if (!w || !w.finishedAt) return;
    setHrLoading(true);
    const hr = await heartRateFor(w.startedAt, w.finishedAt);
    setHrLoading(false);
    if (hr.avg || hr.max) setWorkoutHr(w.id, hr.avg, hr.max);
  };
  // auto-pull once when opening (watch HR has usually synced by now)
  useEffect(() => {
    if (canPullHr && !w?.avgHr && !w?.maxHr) fetchHr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const onEdit = () => {
    editWorkout(w.id);
    router.replace('/workout');
  };
  const onDelete = () => {
    Alert.alert('Smazat trénink?', 'Tento záznam bude nenávratně smazán.', [
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
        <Txt size={type.title} weight="bold">
          {w.name}
        </Txt>
        <Txt size={type.body} weight="medium" color={palette.textMute} style={{ marginTop: 2 }}>
          {dayName(when)} {fmtDateShort(when)} · {w.exercises.length} cviků · {fmtWeight(workoutVolume(w), unit)}
        </Txt>
        {(w.avgHr || w.maxHr) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Ionicons name="heart" size={15} color={palette.red} />
            <Txt size={type.label} weight="semibold" num>
              {w.avgHr ? `⌀ ${w.avgHr}` : ''}
              {w.avgHr && w.maxHr ? ' · ' : ''}
              {w.maxHr ? `max ${w.maxHr}` : ''} tep/min
            </Txt>
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

        <View style={{ marginTop: space.xl, gap: space.md }}>
          {w.exercises.map((le, i) => (
            <View key={i} style={{ backgroundColor: palette.surface, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: palette.hairline }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt size={type.h2} weight="bold" style={{ flex: 1 }}>
                  {exById[le.exerciseId]?.name ?? 'Cvik'}
                </Txt>
                <Txt size={type.label} weight="semibold" num color={palette.textDim}>
                  {fmtWeight(exerciseVolume(le), unit)}
                </Txt>
              </View>
              <View style={{ marginTop: 10, gap: 6 }}>
                {le.sets.map((s, si) => (
                  <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Txt size={type.label} weight="bold" color={palette.textMute} style={{ width: 24 }}>
                      {TAG[s.type] || si + 1}
                    </Txt>
                    <Txt size={type.body} weight="semibold" num>
                      {s.weight != null ? fmtWeight(s.weight, unit) : '–'} × {s.reps ?? '–'}
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
          <PrimaryButton label="Upravit trénink" onPress={onEdit} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
