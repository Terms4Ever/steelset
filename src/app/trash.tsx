import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { dayName, fmtDateShort } from '@/lib/format';
import { haptic } from '@/lib/haptic';
import { useStore } from '@/store/useStore';

const DAY = 86_400_000;

export default function Trash() {
  const router = useRouter();
  const trashed = useStore((s) => s.trashedWorkouts);
  const restoreTrashedWorkout = useStore((s) => s.restoreTrashedWorkout);
  const deleteTrashedForever = useStore((s) => s.deleteTrashedForever);

  const items = useMemo(() => [...trashed].sort((a, b) => b.trashedAt - a.trashedAt), [trashed]);

  const daysLeft = (trashedAt: number) => Math.max(0, Math.ceil((trashedAt + 7 * DAY - Date.now()) / DAY));

  const onRestore = (id: string) => {
    restoreTrashedWorkout(id);
    haptic.light();
  };
  const onDelete = (id: string, name: string) => {
    Alert.alert('Smazat definitivně?', `„${name}" už nepůjde obnovit.`, [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deleteTrashedForever(id) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.xl, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={palette.textDim} />
        </Pressable>
        <View>
          <Txt size={type.h1} weight="bold">
            Koš
          </Txt>
          <Txt size={type.caption} weight="medium" color={palette.textMute}>
            Zahozené tréninky - drží se 7 dní
          </Txt>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: 6, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: space.xxl }}>
            <Ionicons name="trash-outline" size={40} color={palette.surface3} />
            <Txt size={type.h2} weight="bold" style={{ marginTop: 12 }}>
              Koš je prázdný
            </Txt>
            <Txt size={type.body} weight="medium" color={palette.textMute} style={{ textAlign: 'center', marginTop: 6 }}>
              Když trénink zahodíš nebo smažeš, 7 dní ho tady jde obnovit.
            </Txt>
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            {items.map((t) => {
              const sets = t.exercises.reduce((n, le) => n + le.sets.length, 0);
              const dl = daysLeft(t.trashedAt);
              return (
                <View
                  key={t.id}
                  style={{ backgroundColor: palette.surface, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: palette.hairline }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Txt size={type.body} weight="bold">
                        {t.name}
                      </Txt>
                      <Txt size={type.caption} weight="medium" num color={palette.textMute} style={{ marginTop: 2 }}>
                        {dayName(t.startedAt)} {fmtDateShort(t.startedAt)} · {t.exercises.length} cviků · {sets} sérií
                        {t.avgHr ? ` · ⌀${t.avgHr} tep` : ''}
                      </Txt>
                      <Txt size={type.caption} weight="semibold" color={dl <= 1 ? palette.red : palette.textMute} style={{ marginTop: 2 }}>
                        {dl <= 0 ? 'smaže se dnes' : dl === 1 ? 'zbývá 1 den' : dl <= 4 ? `zbývají ${dl} dny` : `zbývá ${dl} dní`}
                      </Txt>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Pressable
                      onPress={() => onRestore(t.id)}
                      style={({ pressed }) => ({
                        flex: 1,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        paddingVertical: 11,
                        borderRadius: radius.sm,
                        backgroundColor: palette.accent,
                        opacity: pressed ? 0.85 : 1,
                      })}>
                      <Ionicons name="arrow-undo" size={16} color={palette.bg} />
                      <Txt size={type.label} weight="bold" color={palette.bg}>
                        Obnovit
                      </Txt>
                    </Pressable>
                    <Pressable
                      onPress={() => onDelete(t.id, t.name)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 16,
                        paddingVertical: 11,
                        borderRadius: radius.sm,
                        backgroundColor: palette.surface2,
                        opacity: pressed ? 0.85 : 1,
                      })}>
                      <Ionicons name="trash-outline" size={16} color={palette.red} />
                      <Txt size={type.label} weight="semibold" color={palette.red}>
                        Smazat
                      </Txt>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
