import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMiniBarSpace } from '@/components/MiniWorkoutBar';
import { Txt } from '@/components/ui';
import { useT } from '@/i18n/useT';
import { palette, radius, space, type } from '@/constants/theme';
import { dayName, fmtDateShort, NBSP } from '@/lib/format';
import { haptic } from '@/lib/haptic';
import { useStore } from '@/store/useStore';

const DAY = 86_400_000;

export default function Trash() {
  const tx = useT();
  const tr = tx.trash;
  const router = useRouter();
  // plovoucí lišta běžícího tréninku leží nad obsahem, tohle jí drží místo dole
  const barSpace = useMiniBarSpace();
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
    Alert.alert(tr.deleteTitle, tr.deleteText(name), [
      { text: tx.common.cancel, style: 'cancel' },
      { text: tx.common.delete, style: 'destructive', onPress: () => deleteTrashedForever(id) },
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
            {tr.title}
          </Txt>
          <Txt size={type.caption} weight="medium" color={palette.textMute}>
            {tr.subtitle}
          </Txt>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: 6, paddingBottom: 40 + barSpace }} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: space.xxl }}>
            <Ionicons name="trash-outline" size={40} color={palette.surface3} />
            <Txt size={type.h2} weight="bold" style={{ marginTop: 12 }}>
              {tr.empty}
            </Txt>
            <Txt size={type.body} weight="medium" color={palette.textMute} style={{ textAlign: 'center', marginTop: 6 }}>
              {tr.emptyHint}
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
                        {dayName(t.startedAt)} {fmtDateShort(t.startedAt)} · {tx.common.exercises(t.exercises.length)} · {tx.common.sets(sets)}
                        {t.avgHr ? ` · ⌀${t.avgHr}${NBSP}tep` : ''}
                      </Txt>
                      <Txt size={type.caption} weight="semibold" color={dl <= 1 ? palette.red : palette.textMute} style={{ marginTop: 2 }}>
                        {dl <= 0 ? tr.deletesToday : tr.daysLeft(dl)}
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
                        {tr.restore}
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
                        {tx.common.delete}
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
