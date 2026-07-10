import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { Equipment, MUSCLE_GROUP_OPTIONS, MuscleGroup, TrackingType } from '@/data/types';
import { useStore } from '@/store/useStore';

const MUSCLES: MuscleGroup[] = MUSCLE_GROUP_OPTIONS;
const EQUIPMENT: Equipment[] = ['Činka', 'Jednoručky', 'Kladka', 'Stroj', 'Vlastní váha', 'Kettlebell', 'Guma'];
const TRACKING: { value: TrackingType; label: string }[] = [
  { value: 'weight_reps', label: 'Váha × opak.' },
  { value: 'bodyweight_reps', label: 'Vlastní váha × opak.' },
  { value: 'weighted_bw', label: 'Přidaná váha' },
  { value: 'reps', label: 'Jen opakování' },
  { value: 'time', label: 'Jen čas' },
  { value: 'distance_time', label: 'Vzdálenost × čas' },
];

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: on ? palette.accent : palette.surface2,
      }}>
      <Txt size={type.label} weight="semibold" color={on ? palette.bg : palette.textDim}>
        {label}
      </Txt>
    </Pressable>
  );
}

export default function ExerciseNew() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const addExercise = useStore((s) => s.addExercise);

  const [name, setName] = useState(params.name ?? '');
  const [primary, setPrimary] = useState<MuscleGroup | null>(null);
  const [secondary, setSecondary] = useState<MuscleGroup[]>([]);
  const [unilateral, setUnilateral] = useState(false);
  const [equipment, setEquipment] = useState<Equipment>('Činka');
  const [tracking, setTracking] = useState<TrackingType>('weight_reps');

  const valid = name.trim().length > 0 && primary !== null;

  const toggleSecondary = (m: MuscleGroup) =>
    setSecondary((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const save = () => {
    if (!valid) return;
    addExercise({
      name: name.trim(),
      primary: primary!,
      secondary: secondary.filter((m) => m !== primary).length ? secondary.filter((m) => m !== primary) : undefined,
      unilateral: unilateral || undefined,
      equipment,
      tracking,
      defaultBar: equipment === 'Činka' ? 20 : undefined,
    });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: 10 }}>
        <Txt size={type.title} weight="bold">
          Nový cvik
        </Txt>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={palette.textDim} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Label>Název</Label>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="např. Bench na multipressu"
          placeholderTextColor={palette.textMute}
          style={{ backgroundColor: palette.surface2, borderRadius: radius.sm, color: palette.text, fontFamily: 'Inter_600SemiBold', fontSize: 16, paddingHorizontal: 14, paddingVertical: 13 }}
        />

        <Label>Primární sval *</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MUSCLES.map((m) => (
            <Chip
              key={m}
              label={m}
              on={primary === m}
              onPress={() => {
                setPrimary(m);
                setSecondary((cur) => cur.filter((x) => x !== m));
              }}
            />
          ))}
        </View>

        <Label>Vedlejší svaly (volitelné)</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MUSCLES.filter((m) => m !== primary).map((m) => {
            const on = secondary.includes(m);
            return (
              <Pressable
                key={m}
                onPress={() => toggleSecondary(m)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: on ? palette.accentDeep : palette.surface2,
                  borderWidth: 1,
                  borderColor: on ? palette.accent : 'transparent',
                }}>
                <Txt size={type.label} weight="semibold" color={on ? palette.accent : palette.textDim}>
                  {m}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setUnilateral((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: space.xl, backgroundColor: palette.surface2, borderRadius: radius.md, padding: space.lg }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              backgroundColor: unilateral ? palette.accent : 'transparent',
              borderWidth: unilateral ? 0 : 2,
              borderColor: palette.surface3,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {unilateral && <Ionicons name="checkmark" size={16} color={palette.bg} />}
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={type.body} weight="semibold">
              Jednostranný cvik
            </Txt>
            <Txt size={type.caption} weight="medium" color={palette.textMute}>
              Cvičíš každou stranu zvlášť - objem a série se počítají 2×
            </Txt>
          </View>
        </Pressable>

        <Label>Vybavení</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EQUIPMENT.map((e) => (
            <Chip key={e} label={e} on={equipment === e} onPress={() => setEquipment(e)} />
          ))}
        </View>

        <Label>Typ měření</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TRACKING.map((t) => (
            <Chip key={t.value} label={t.label} on={tracking === t.value} onPress={() => setTracking(t.value)} />
          ))}
        </View>

        <View style={{ marginTop: space.xxl }}>
          <PrimaryButton label="Uložit cvik" onPress={save} style={{ opacity: valid ? 1 : 0.4 }} disabled={!valid} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Txt size={type.label} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginTop: space.xl, marginBottom: 10 }}>
      {children}
    </Txt>
  );
}
