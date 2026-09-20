import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { originalExerciseName, useAllExercises, useStore } from '@/store/useStore';

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function Exercises() {
  const router = useRouter();
  const params = useLocalSearchParams<{ target?: string; routineId?: string }>();
  const favs = useStore((s) => s.favoriteExercises);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const routines = useStore((s) => s.routines);
  const addExerciseToActive = useStore((s) => s.addExerciseToActive);
  const updateRoutine = useStore((s) => s.updateRoutine);
  const setExerciseName = useStore((s) => s.setExerciseName);
  const [q, setQ] = useState('');
  // přejmenování z výběru cviků: platí všude, protože tréninky odkazují na cvik přes id
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null);
  const saveRename = () => {
    if (rename && rename.name.trim()) setExerciseName(rename.id, rename.name);
    setRename(null);
  };

  const all = useAllExercises();
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

      <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
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
              <Pressable onPress={() => setRename({ id: e.id, name: e.name })} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name="pencil-outline" size={18} color={palette.textMute} />
              </Pressable>
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

      {/* přejmenování cviku */}
      {rename && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
          {/* podklad zavírá sheet; sheet sám není absolutní, aby ho klávesnice mohla vytlačit nahoru */}
          <Pressable onPress={() => setRename(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ maxHeight: '92%' }}>
            <View style={{ flexShrink: 1, backgroundColor: palette.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: palette.hairline }}>
              <View style={{ paddingHorizontal: space.xl, paddingTop: 12 }}>
                <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: palette.surface3, alignSelf: 'center', marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={type.h1} weight="bold">
                      Přejmenovat cvik
                    </Txt>
                    <Txt size={type.label} weight="medium" color={palette.textMute} style={{ marginTop: 2 }}>
                      Nový název se projeví všude - v historii, plánech i v exportu. Zapsané série zůstanou.
                    </Txt>
                  </View>
                  {/* cesta ven nesmí záviset na trefení podkladu, ten klávesnice zakryje */}
                  <Pressable
                    onPress={() => setRename(null)}
                    hitSlop={10}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="close" size={20} color={palette.textDim} />
                  </Pressable>
                </View>
              </View>
              <ScrollView
                contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 34 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.lg, marginBottom: 8 }}>
              <Txt size={type.caption} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5 }}>
                NÁZEV
              </Txt>
              {originalExerciseName(rename.id) && originalExerciseName(rename.id) !== rename.name && (
                <Pressable onPress={() => setRename({ ...rename, name: originalExerciseName(rename.id)! })} hitSlop={8}>
                  <Txt size={type.caption} weight="bold" color={palette.accent}>
                    Obnovit původní
                  </Txt>
                </Pressable>
              )}
            </View>
            <TextInput
              value={rename.name}
              onChangeText={(t) => setRename({ ...rename, name: t })}
              autoFocus
              placeholder="Název cviku"
              placeholderTextColor={palette.textMute}
              onSubmitEditing={saveRename}
              style={{ backgroundColor: palette.surface2, borderRadius: radius.sm, color: palette.text, fontFamily: 'Inter_600SemiBold', fontSize: type.body, paddingHorizontal: 14, paddingVertical: 12 }}
            />
            <Pressable
              onPress={saveRename}
              disabled={!rename.name.trim()}
              style={{ marginTop: space.lg, paddingVertical: 14, alignItems: 'center', borderRadius: radius.md, backgroundColor: palette.accent, opacity: rename.name.trim() ? 1 : 0.4 }}>
              <Txt size={type.body} weight="bold" color={palette.bg}>
                Uložit
              </Txt>
            </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </SafeAreaView>
  );
}
