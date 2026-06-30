import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card, Pill, Screen, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { STARTER_ROUTINES } from '@/data/exercises';
import { useStore } from '@/store/useStore';

export default function Plany() {
  const router = useRouter();
  const routines = useStore((s) => s.routines);
  const addRoutine = useStore((s) => s.addRoutine);
  const startWorkout = useStore((s) => s.startWorkout);

  const createNew = () => {
    const id = addRoutine({ name: 'Nový plán', exercises: [] });
    router.push(`/routine/${id}`);
  };

  const importStarters = () => {
    STARTER_ROUTINES.forEach((r) => addRoutine({ name: r.name, folder: r.folder, autoProgress: r.autoProgress, exercises: r.exercises.map((e) => ({ ...e })) }));
  };

  const start = (id: string) => {
    startWorkout(id);
    router.push('/workout');
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt size={type.title} weight="bold">
          Plány
        </Txt>
        <Pressable onPress={createNew} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.accentDeep, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill }}>
          <Ionicons name="add" size={16} color={palette.accent} />
          <Txt size={type.label} weight="bold" color={palette.accent}>
            Nový plán
          </Txt>
        </Pressable>
      </View>

      {routines.length === 0 ? (
        <Card style={{ marginTop: space.xl, alignItems: 'flex-start', gap: 12 }}>
          <Txt size={type.body} weight="medium" color={palette.textMute}>
            Zatím žádné plány. Vytvoř vlastní nebo importuj ověřené programy.
          </Txt>
          <Pressable onPress={importStarters} style={{ backgroundColor: palette.surface2, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.sm }}>
            <Txt size={type.label} weight="bold" color={palette.accent}>
              Importovat startovací plány
            </Txt>
          </Pressable>
        </Card>
      ) : (
        <View style={{ marginTop: space.xl, gap: space.md }}>
          {routines.map((r) => (
            <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/routine/${r.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Txt size={type.h2} weight="bold">
                    {r.name}
                  </Txt>
                  {r.autoProgress && (
                    <Pill color={palette.accentDeep} textColor={palette.accent}>
                      Auto-progrese
                    </Pill>
                  )}
                </View>
                <Txt size={type.label} weight="medium" color={palette.textMute} style={{ marginTop: 4 }}>
                  {r.folder ? `${r.folder} · ` : ''}
                  {r.exercises.length} cviků
                </Txt>
              </Pressable>
              <Pressable onPress={() => start(r.id)} disabled={r.exercises.length === 0} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: r.exercises.length ? palette.accent : palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="play" size={20} color={r.exercises.length ? palette.bg : palette.textMute} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
