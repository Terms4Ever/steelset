import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { useT } from '@/i18n/useT';
import { equipmentName, muscleName } from '@/i18n/catalog';
import { EQUIPMENT_OPTIONS, TRACKING_OPTIONS } from '@/data/exerciseOptions';
import { Equipment, MUSCLE_GROUP_OPTIONS, MuscleGroup, TrackingType } from '@/data/types';
import { deleteExerciseWarning, exerciseUsage } from '@/lib/exerciseUsage';
import { haptic } from '@/lib/haptic';
import { originalExerciseName, useAllExercises, useStore } from '@/store/useStore';

/** Co se zrovna upravuje v detailu cviku. Je to rozpracovaný stav, uloží se až tlačítkem. */
type Detail = {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  unilateral: boolean;
  equipment: Equipment;
  tracking: TrackingType;
  custom: boolean;
};

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function Chip({ label, on, onPress, disabled }: { label: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: radius.pill,
        backgroundColor: on ? palette.accent : palette.surface2,
        opacity: disabled && !on ? 0.4 : 1,
      }}>
      <Txt size={type.label} weight="bold" color={on ? palette.bg : palette.textDim}>
        {label}
      </Txt>
    </Pressable>
  );
}

function SectionLabel({ children, style }: { children: string; style?: object }) {
  return (
    <Txt size={type.caption} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginTop: space.lg, marginBottom: 8, ...style }}>
      {children}
    </Txt>
  );
}

/**
 * Katalog cviků ve dvou režimech.
 *
 * Výběr (výchozí): ťuknutí cvik přidá do tréninku nebo plánu a obrazovku zavře.
 * Správa (`mode=manage`, otevírá se z Profilu): ťuknutí otevře detail cviku, nic se nikam nepřidává.
 * Detail je dostupný v obou režimech přes tužku, takže smazat cvik jde i z výběru otevřeného
 * z běžícího tréninku.
 */
export default function Exercises() {
  const tx = useT();
  const x = tx.exercises;
  const w = tx.workout;
  const router = useRouter();
  const params = useLocalSearchParams<{ target?: string; routineId?: string; mode?: string }>();
  const manage = params.mode === 'manage';
  const favs = useStore((s) => s.favoriteExercises);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const routines = useStore((s) => s.routines);
  const workouts = useStore((s) => s.workouts);
  const trashedWorkouts = useStore((s) => s.trashedWorkouts);
  const addExerciseToActive = useStore((s) => s.addExerciseToActive);
  const updateRoutine = useStore((s) => s.updateRoutine);
  const setExerciseName = useStore((s) => s.setExerciseName);
  const setExerciseMuscles = useStore((s) => s.setExerciseMuscles);
  const updateExercise = useStore((s) => s.updateExercise);
  const deleteExercise = useStore((s) => s.deleteExercise);
  const restoreExercise = useStore((s) => s.restoreExercise);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);

  const all = useAllExercises();
  const visible = useMemo(() => all.filter((e) => !e.hidden), [all]);
  const hidden = useMemo(() => all.filter((e) => e.hidden), [all]);
  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return visible;
    return visible.filter((e) => norm(e.name).includes(nq) || norm(e.primary).includes(nq) || norm(muscleName(e.primary)).includes(nq) || norm(e.equipment).includes(nq) || norm(equipmentName(e.equipment)).includes(nq));
  }, [visible, q]);
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

  const openDetail = (id: string) => {
    const e = all.find((x) => x.id === id);
    if (!e) return;
    setDetail({
      id: e.id,
      name: e.name,
      primary: e.primary,
      secondary: e.secondary ?? [],
      unilateral: !!e.unilateral,
      equipment: e.equipment,
      tracking: e.tracking,
      custom: !!e.custom,
    });
  };

  const saveDetail = () => {
    if (!detail) return;
    // prázdný název se neukládá - cvik bez jména by zmizel z historie i z výběru
    if (detail.name.trim()) setExerciseName(detail.id, detail.name);
    setExerciseMuscles(detail.id, detail.primary, detail.secondary, detail.unilateral);
    // vybavení a typ měření drží sám cvik, přepis pro ně neexistuje, takže jen u vlastních
    if (detail.custom) updateExercise(detail.id, { equipment: detail.equipment, tracking: detail.tracking });
    haptic.light();
    setDetail(null);
  };

  const askDelete = (id: string, name: string) => {
    const usage = exerciseUsage(id, workouts, routines, trashedWorkouts);
    Alert.alert(x.deleteTitle, deleteExerciseWarning(name, usage), [
      { text: tx.common.cancel, style: 'cancel' },
      {
        text: tx.common.delete,
        style: 'destructive',
        onPress: () => {
          deleteExercise(id);
          haptic.light();
          setDetail(null);
        },
      },
    ]);
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
          {manage ? x.manageTitle : x.title}
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
            placeholder={x.search}
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
            {query.length > 0 ? x.createNamed(query) : x.createCustom}
          </Txt>
        </Pressable>

        {sorted.map((e) => {
          const fav = favs.includes(e.id);
          return (
            <Pressable
              key={e.id}
              onPress={() => (manage ? openDetail(e.id) : pick(e.id))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: palette.hairlineSoft }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="barbell-outline" size={18} color={palette.textDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={type.body} weight="semibold">
                  {e.name}
                </Txt>
                <Txt size={type.caption} weight="medium" color={palette.textMute}>
                  {muscleName(e.primary)} · {equipmentName(e.equipment)}
                  {e.custom ? x.customSuffix : ''}
                </Txt>
              </View>
              {!manage && (
                <Pressable onPress={() => openDetail(e.id)} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons name="pencil-outline" size={18} color={palette.textMute} />
                </Pressable>
              )}
              <Pressable onPress={() => toggleFavorite(e.id)} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name={fav ? 'star' : 'star-outline'} size={20} color={fav ? palette.amber : palette.textMute} />
              </Pressable>
              <Ionicons name={manage ? 'chevron-forward' : 'add-circle-outline'} size={22} color={manage ? palette.textMute : palette.accent} />
            </Pressable>
          );
        })}

        {filtered.length === 0 && query.length === 0 && (
          <Txt size={type.body} color={palette.textMute} style={{ marginTop: 20 }}>
            {x.none}
          </Txt>
        )}

        {manage && hidden.length > 0 && (
          <View style={{ marginTop: space.xxl }}>
            <SectionLabel>{x.deleted}</SectionLabel>
            <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginBottom: 8 }}>
              {x.deletedHint}
            </Txt>
            {hidden.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => restoreExercise(e.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: palette.hairlineSoft }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="eye-off-outline" size={18} color={palette.textMute} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={type.body} weight="semibold" color={palette.textDim}>
                    {e.name}
                  </Txt>
                  <Txt size={type.caption} weight="medium" color={palette.textMute}>
                    {muscleName(e.primary)} · {equipmentName(e.equipment)}
                  </Txt>
                </View>
                <Ionicons name="arrow-undo-outline" size={20} color={palette.accent} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* detail cviku */}
      {detail && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
          {/* podklad zavírá sheet; sheet sám není absolutní, aby ho klávesnice mohla vytlačit nahoru */}
          <Pressable onPress={() => setDetail(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ maxHeight: '92%' }}>
            <View style={{ flexShrink: 1, backgroundColor: palette.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: palette.hairline }}>
              <View style={{ paddingHorizontal: space.xl, paddingTop: 12 }}>
                <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: palette.surface3, alignSelf: 'center', marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={type.h1} weight="bold">
                      {w.settingsTitle}
                    </Txt>
                    <Txt size={type.label} weight="medium" color={palette.textMute} style={{ marginTop: 2 }}>
                      {w.settingsHint}
                    </Txt>
                  </View>
                  {/* cesta ven nesmí záviset na trefení podkladu, ten klávesnice zakryje */}
                  <Pressable
                    onPress={() => setDetail(null)}
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
                    {w.name}
                  </Txt>
                  {originalExerciseName(detail.id) && originalExerciseName(detail.id) !== detail.name && (
                    <Pressable onPress={() => setDetail({ ...detail, name: originalExerciseName(detail.id)! })} hitSlop={8}>
                      <Txt size={type.caption} weight="bold" color={palette.accent}>
                        {w.restoreName}
                      </Txt>
                    </Pressable>
                  )}
                </View>
                <TextInput
                  value={detail.name}
                  onChangeText={(t) => setDetail({ ...detail, name: t })}
                  placeholder={w.exerciseNamePlaceholder}
                  placeholderTextColor={palette.textMute}
                  style={{ backgroundColor: palette.surface2, borderRadius: radius.sm, color: palette.text, fontFamily: 'Inter_600SemiBold', fontSize: type.body, paddingHorizontal: 14, paddingVertical: 12 }}
                />

                <SectionLabel>{w.primary}</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {MUSCLE_GROUP_OPTIONS.map((m) => (
                    <Chip
                      key={m}
                      label={muscleName(m)}
                      on={detail.primary === m}
                      onPress={() => setDetail({ ...detail, primary: m, secondary: detail.secondary.filter((x) => x !== m) })}
                    />
                  ))}
                </View>

                <SectionLabel>{w.secondary}</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {MUSCLE_GROUP_OPTIONS.filter((m) => m !== detail.primary).map((m) => {
                    const on = detail.secondary.includes(m);
                    return (
                      <Chip
                        key={m}
                        label={muscleName(m)}
                        on={on}
                        onPress={() =>
                          setDetail({
                            ...detail,
                            secondary: on ? detail.secondary.filter((x) => x !== m) : [...detail.secondary, m],
                          })
                        }
                      />
                    );
                  })}
                </View>

                <SectionLabel>{x.equipment}</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <Chip key={eq} label={equipmentName(eq)} on={detail.equipment === eq} disabled={!detail.custom} onPress={() => setDetail({ ...detail, equipment: eq })} />
                  ))}
                </View>

                <SectionLabel>{x.tracking}</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TRACKING_OPTIONS.map((t) => (
                    <Chip key={t.value} label={t.label} on={detail.tracking === t.value} disabled={!detail.custom} onPress={() => setDetail({ ...detail, tracking: t.value })} />
                  ))}
                </View>
                {!detail.custom && (
                  <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginTop: 8 }}>
                    {x.builtinLocked}
                  </Txt>
                )}

                <Pressable
                  onPress={() => setDetail({ ...detail, unilateral: !detail.unilateral })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: space.lg, backgroundColor: palette.surface2, borderRadius: radius.md, padding: space.lg }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      backgroundColor: detail.unilateral ? palette.accent : 'transparent',
                      borderWidth: detail.unilateral ? 0 : 2,
                      borderColor: palette.surface3,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {detail.unilateral && <Ionicons name="checkmark" size={16} color={palette.bg} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={type.body} weight="semibold">
                      {w.unilateral}
                    </Txt>
                    <Txt size={type.caption} weight="medium" color={palette.textMute}>
                      {w.unilateralHint}
                    </Txt>
                  </View>
                </Pressable>

                <Pressable
                  onPress={saveDetail}
                  style={({ pressed }) => ({ marginTop: space.lg, paddingVertical: 14, alignItems: 'center', borderRadius: radius.md, backgroundColor: palette.accent, opacity: pressed ? 0.85 : 1 })}>
                  <Txt size={type.body} weight="bold" color={palette.bg}>
                    {w.saveSettings}
                  </Txt>
                </Pressable>

                <Pressable
                  onPress={() => askDelete(detail.id, detail.name)}
                  style={({ pressed }) => ({ marginTop: 10, paddingVertical: 14, alignItems: 'center', borderRadius: radius.md, backgroundColor: palette.surface2, opacity: pressed ? 0.85 : 1 })}>
                  <Txt size={type.body} weight="bold" color={palette.red}>
                    {x.deleteButton}
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
