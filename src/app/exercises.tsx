import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { allExercises as allExSel, useStore } from '@/store/useStore';

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function Exercises() {
  const router = useRouter();
  const params = useLocalSearchParams<{ target?: string; routineId?: string }>();
  const custom = useStore((s) => s.customExercises);
  const favs = useStore((s) => s.favoriteExercises);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const routines = useStore((s) => s.routines);
  const addExerciseToActive = useStore((s) => s.addExerciseToActive);
  const updateRoutine = useStore((s) => s.updateRoutine);
  const [q, setQ] = useState('');

  const all = useMemo(() => allExSel({ customExercises: custom }), [custom]);
  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return all;
    return all.filter((e) => norm(e.name).includes(nq) || norm(e.primary).includes(nq) || norm(e.equipment).includes(nq));
  }, [all, q]);
  const sorted = useMemo(() => {
    const favSet = new Set(favs);
    return [...filtered].sort((a, b) => (favSet.has(b.id) ? 1 : 0) - (favSet.has(a.id) ? 1 : 0));
  }, [filtered, favs]);

  const pick = (id: string) => {
    if (params.target === 'routine' && params.routineId) {
      const r = routines.find((x) => x.id === params.routineId);
      if (r) updateRoutine(r.id, { exercises: [...r.exercises, { exerciseId: id, targetSets: 3, targetReps: 8 }] });
    } else {
      addExerciseToActive(id);
    }
    router.back();
  };

  const create = () =>
    router.push({
      pathname: '/exercise-new',
      params: { name: q.trim(), target: params.target ?? '', routineId: params.routineId ?? '' },
    });

  const query = q.trim();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: 10 }}>
        <Txt size={type.title} weight="bold">
          Cviky
        </Txt>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={palette.textDim} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.surface2, borderRadius: radius.sm, paddingHorizontal: 12 }}>
          <Ionicons name="search" size={18} color={palette.textMute} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Hledat cvik…"
            placeholderTextColor={palette.textMute}
            style={{ flex: 1, color: palette.text, fontFamily: 'Inter_500Medium', fontSize: 15, paddingVertical: 12 }}
          />
        </View>
      </View>

      <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable onPress={create} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: palette.hairline }}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: palette.accentDeep, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={22} color={palette.accent} />
          </View>
          <Txt size={type.body} weight="semibold" color={palette.accent}>
            {query.length > 0 ? `Vytvořit „${query}"` : 'Vytvořit vlastní cvik'}
          </Txt>
        </Pressable>

        {sorted.map((e) => {
          const fav = favs.includes(e.id);
          return (
            <Pressable key={e.id} onPress={() => pick(e.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: palette.hairlineSoft }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="barbell-outline" size={18} color={palette.textDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={type.body} weight="semibold">
                  {e.name}
                </Txt>
                <Txt size={type.caption} weight="medium" color={palette.textMute}>
                  {e.primary} · {e.equipment}
                  {e.custom ? ' · vlastní' : ''}
                </Txt>
              </View>
              <Pressable onPress={() => toggleFavorite(e.id)} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name={fav ? 'star' : 'star-outline'} size={20} color={fav ? palette.amber : palette.textMute} />
              </Pressable>
              <Ionicons name="add-circle-outline" size={22} color={palette.accent} />
            </Pressable>
          );
        })}

        {filtered.length === 0 && query.length === 0 && (
          <Txt size={type.body} color={palette.textMute} style={{ marginTop: 20 }}>
            Žádné cviky.
          </Txt>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
