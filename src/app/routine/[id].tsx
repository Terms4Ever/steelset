import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { exercisesById as exByIdSel, useStore } from '@/store/useStore';

export default function RoutineEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routines = useStore((s) => s.routines);
  const custom = useStore((s) => s.customExercises);
  const updateRoutine = useStore((s) => s.updateRoutine);
  const deleteRoutine = useStore((s) => s.deleteRoutine);
  const startWorkout = useStore((s) => s.startWorkout);

  const routine = routines.find((r) => r.id === id);
  const exById = useMemo(() => exByIdSel({ customExercises: custom }), [custom]);

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

  const setEx = (index: number, patch: Partial<{ targetSets: number; targetReps: number }>) =>
    updateRoutine(routine.id, {
      exercises: routine.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    });
  const removeEx = (index: number) =>
    updateRoutine(routine.id, { exercises: routine.exercises.filter((_, i) => i !== index) });

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

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TextInput
          value={routine.name}
          onChangeText={(t) => updateRoutine(routine.id, { name: t })}
          placeholder="Název plánu"
          placeholderTextColor={palette.textMute}
          style={{ backgroundColor: palette.surface2, borderRadius: radius.sm, color: palette.text, fontFamily: 'Inter_700Bold', fontSize: 20, paddingHorizontal: 14, paddingVertical: 14 }}
        />

        <Pressable
          onPress={() => updateRoutine(routine.id, { autoProgress: !routine.autoProgress })}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.surface, borderRadius: radius.sm, padding: space.lg, marginTop: space.md, borderWidth: 1, borderColor: palette.hairline }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Txt size={type.body} weight="semibold">
              Automatická progrese
            </Txt>
            <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginTop: 2 }}>
              +{useStore.getState().settings.increment} kg, když všechny série dosáhnou cíle
            </Txt>
          </View>
          <View style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: routine.autoProgress ? palette.accent : palette.surface3, justifyContent: 'center', padding: 3 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: routine.autoProgress ? palette.bg : palette.textMute, alignSelf: routine.autoProgress ? 'flex-end' : 'flex-start' }} />
          </View>
        </Pressable>

        <Txt size={type.label} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginTop: space.xl, marginBottom: 10 }}>
          CVIKY ({routine.exercises.length})
        </Txt>

        {routine.exercises.map((re, i) => (
          <View key={i} style={{ backgroundColor: palette.surface, borderRadius: radius.sm, padding: space.lg, marginBottom: 10, borderWidth: 1, borderColor: palette.hairline }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt size={type.body} weight="bold" style={{ flex: 1 }}>
                {exById[re.exerciseId]?.name ?? 'Cvik'}
              </Txt>
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
