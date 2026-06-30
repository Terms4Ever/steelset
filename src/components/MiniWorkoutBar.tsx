import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { fmtClock } from '@/lib/format';
import { activeWorkout, useStore } from '@/store/useStore';

/** Persistent "workout in progress" bar shown above the tab bar on every tab. */
export function MiniWorkoutBar() {
  const router = useRouter();
  const workouts = useStore((s) => s.workouts);
  const activeId = useStore((s) => s.activeWorkoutId);
  const active = useMemo(() => activeWorkout({ workouts, activeWorkoutId: activeId }), [workouts, activeId]);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active || active.manual) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  const done = active.exercises.reduce((n, le) => n + le.sets.filter((s) => s.done).length, 0);
  const total = active.exercises.reduce((n, le) => n + le.sets.length, 0);
  const elapsed = active.manual ? null : Math.floor((Date.now() - active.startedAt) / 1000);

  return (
    <View style={{ backgroundColor: palette.bg, paddingHorizontal: space.lg, paddingTop: 6 }}>
      <Pressable
        onPress={() => router.push('/workout')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: palette.accentDeep,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 9,
          borderWidth: 1,
          borderColor: palette.accent,
        }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="barbell" size={18} color={palette.bg} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={type.body} weight="bold" numberOfLines={1}>
            {active.name}
          </Txt>
          <Txt size={type.caption} weight="semibold" num color={palette.accent}>
            {elapsed != null ? `${fmtClock(elapsed)} · ` : ''}
            {done}/{total} sérií · probíhá
          </Txt>
        </View>
        <Txt size={type.label} weight="bold" color={palette.accent}>
          Pokračovat
        </Txt>
        <Ionicons name="chevron-forward" size={18} color={palette.accent} />
      </Pressable>
    </View>
  );
}
