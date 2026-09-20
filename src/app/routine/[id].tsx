import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMiniBarSpace } from '@/components/MiniWorkoutBar';
import { PrimaryButton, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { haptic } from '@/lib/haptic';
import { canMove, moveBlock, stableKeys } from '@/lib/reorder';
import { useExercisesById, useStore } from '@/store/useStore';

export default function RoutineEditor() {
  const router = useRouter();
  // plovoucí lišta běžícího tréninku leží nad obsahem, tohle jí drží místo dole
  const barSpace = useMiniBarSpace();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routines = useStore((s) => s.routines);
  const updateRoutine = useStore((s) => s.updateRoutine);
  const deleteRoutine = useStore((s) => s.deleteRoutine);
  const startWorkout = useStore((s) => s.startWorkout);

  const routine = routines.find((r) => r.id === id);
  const exById = useExercisesById();

  if (!routine) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt color={palette.textDim}>Plán nenalezen.</Txt>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Txt color={palette.accent}>Zpět</Txt>
        </Pressable>
      </SafeAreaView>
    );
  }

  // supersérie z plánu (přenesená z uloženého tréninku): sousedé se stejnou skupinou dostanou
  // značku A1, A2 - stejně jako v živém tréninku, ať je vidět, že se cvičí dohromady
  const groups: Record<string, number[]> = {};
  routine.exercises.forEach((re, i) => {
    if (re.supersetGroup) (groups[re.supersetGroup] ||= []).push(i);
  });
  const groupLetter: Record<string, string> = {};
  Object.keys(groups).forEach((g, i) => (groupLetter[g] = String.fromCharCode(65 + i)));
  const supTag = (re: { supersetGroup?: string }, i: number) =>
    re.supersetGroup && groups[re.supersetGroup].length > 1
      ? `${groupLetter[re.supersetGroup]}${groups[re.supersetGroup].indexOf(i) + 1}`
      : null;

  const setEx = (index: number, patch: Partial<{ targetSets: number; targetReps: number }>) =>
    updateRoutine(routine.id, {
      exercises: routine.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    });
  const removeEx = (index: number) =>
    updateRoutine(routine.id, { exercises: routine.exercises.filter((_, i) => i !== index) });
  // posun cviku o jedno místo; supersérie se hýbe jako blok (src/lib/reorder.ts)
  const moveEx = (index: number, dir: -1 | 1) => {
    if (!canMove(routine.exercises, index, dir)) return;
    haptic.tap();
    updateRoutine(routine.id, { exercises: moveBlock(routine.exercises, index, dir).items });
  };
  const exKeys = stableKeys(routine.exercises);

  const del = () => {
    deleteRoutine(routine.id);
    router.back();
  };
  const start = () => {
    startWorkout(routine.id);
    router.replace('/workout');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={palette.textDim} />
        </Pressable>
        <Txt size={type.h2} weight="bold">
          Úprava plánu
        </Txt>
        <Pressable onPress={del} hitSlop={10}>
          <Ionicons name="trash-outline" size={22} color={palette.red} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: 40 + barSpace }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TextInput
          value={routine.name}
          onChangeText={(t) => updateRoutine(routine.id, { name: t })}
          placeholder="Název plánu"
          placeholderTextColor={palette.textMute}
          style={{ backgroundColor: palette.surface2, borderRadius: radius.sm, color: palette.text, fontFamily: 'Inter_700Bold', fontSize: 20, paddingHorizontal: 14, paddingVertical: 14 }}
        />

        <Txt size={type.label} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginTop: space.xl, marginBottom: 10 }}>
          CVIKY ({routine.exercises.length})
        </Txt>

        {routine.exercises.map((re, i) => (
          <View key={exKeys[i]} style={{ backgroundColor: palette.surface, borderRadius: radius.sm, padding: space.lg, marginBottom: 10, borderWidth: 1, borderColor: palette.hairline }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                {supTag(re, i) && (
                  <Txt size={type.caption} weight="bold" color={palette.accent} style={{ letterSpacing: 1, marginBottom: 2 }}>
                    SUPERSÉRIE {supTag(re, i)}
                  </Txt>
                )}
                <Txt size={type.body} weight="bold">
                  {exById[re.exerciseId]?.name ?? 'Cvik'}
                </Txt>
              </View>
              <Pressable
                accessibilityLabel="Posunout cvik nahoru"
                disabled={!canMove(routine.exercises, i, -1)}
                onPress={() => moveEx(i, -1)}
                hitSlop={6}
                style={{ paddingHorizontal: 6, opacity: canMove(routine.exercises, i, -1) ? 1 : 0.3 }}>
                <Ionicons name="chevron-up" size={20} color={palette.textDim} />
              </Pressable>
              <Pressable
                accessibilityLabel="Posunout cvik dolů"
                disabled={!canMove(routine.exercises, i, 1)}
                onPress={() => moveEx(i, 1)}
                hitSlop={6}
                style={{ paddingHorizontal: 6, marginRight: 4, opacity: canMove(routine.exercises, i, 1) ? 1 : 0.3 }}>
                <Ionicons name="chevron-down" size={20} color={palette.textDim} />
              </Pressable>
              <Pressable onPress={() => removeEx(i)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={palette.textMute} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
              <Stepper label="Série" value={re.targetSets} onChange={(v) => setEx(i, { targetSets: v })} min={1} />
              <Stepper label="Opakování" value={re.targetReps} onChange={(v) => setEx(i, { targetReps: v })} min={1} />
            </View>
          </View>
        ))}

        <Pressable
          onPress={() => router.push(`/exercises?target=routine&routineId=${routine.id}`)}
          style={{ paddingVertical: 14, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: palette.hairline, borderStyle: 'dashed' }}>
          <Txt size={type.body} weight="semibold" color={palette.accent}>
            + Přidat cvik
          </Txt>
        </Pressable>

        <View style={{ marginTop: space.xxl }}>
          <PrimaryButton label="Začít trénink" onPress={start} disabled={routine.exercises.length === 0} style={{ opacity: routine.exercises.length ? 1 : 0.4 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface2, borderRadius: radius.sm }}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={{ padding: 10 }}>
          <Ionicons name="remove" size={18} color={palette.textDim} />
        </Pressable>
        <Txt size={type.h2} weight="bold" num style={{ flex: 1, textAlign: 'center' }}>
          {value}
        </Txt>
        <Pressable onPress={() => onChange(value + 1)} style={{ padding: 10 }}>
          <Ionicons name="add" size={18} color={palette.textDim} />
        </Pressable>
      </View>
    </View>
  );
}
