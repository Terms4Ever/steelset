import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Screen, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { weekStreak, workoutVolumeEx } from '@/lib/calc';
import { fmtWeight, relativeDay } from '@/lib/format';
import { Workout } from '@/data/types';
import { exercisesById as exByIdSel, history as historySel, useStore } from '@/store/useStore';

const WD = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];

const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export default function Kalendar() {
  const router = useRouter();
  const now = Date.now();
  const today = new Date(now);
  const workouts = useStore((s) => s.workouts);
  const unit = useStore((s) => s.settings.unit);
  const custom = useStore((s) => s.customExercises);
  const exerciseMuscles = useStore((s) => s.exerciseMuscles);
  const exById = useMemo(() => exByIdSel({ customExercises: custom, exerciseMuscles }), [custom, exerciseMuscles]);

  const finished = useMemo(() => historySel({ workouts }), [workouts]);
  const streak = useMemo(() => weekStreak(workouts, now), [workouts, now]);

  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sel, setSel] = useState<string | null>(dayKey(now));

  // workouts grouped by day, and each day's total volume
  const { byDay, volByDay, maxDayVol } = useMemo(() => {
    const byDay: Record<string, Workout[]> = {};
    const volByDay: Record<string, number> = {};
    finished.forEach((w) => {
      const k = dayKey(w.finishedAt!);
      (byDay[k] ||= []).push(w);
      volByDay[k] = (volByDay[k] ?? 0) + workoutVolumeEx(w, exById);
    });
    const maxDayVol = Math.max(1, ...Object.values(volByDay));
    return { byDay, volByDay, maxDayVol };
  }, [finished, exById]);

  // month grid cells (week starts Monday)
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Mon = 0
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const out: ({ day: number; key: string; ms: number } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ms = new Date(view.y, view.m, d).getTime();
      out.push({ day: d, key: `${view.y}-${view.m}-${d}`, ms });
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [view]);

  const monthWs = useMemo(
    () => finished.filter((w) => {
      const d = new Date(w.finishedAt!);
      return d.getFullYear() === view.y && d.getMonth() === view.m;
    }),
    [finished, view],
  );
  const monthVol = monthWs.reduce((s, w) => s + workoutVolumeEx(w, exById), 0);

  const isThisMonth = view.y === today.getFullYear() && view.m === today.getMonth();
  const todayKey = dayKey(now);

  const prev = () => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const next = () => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  const goToday = () => {
    setView({ y: today.getFullYear(), m: today.getMonth() });
    setSel(todayKey);
  };

  // dark→bright green by relative volume
  const heat = (vol: number) => {
    const t = Math.min(1, vol / maxDayVol);
    const l = (a: number, b: number) => Math.round(a + (b - a) * t);
    return { bg: `rgb(${l(10, 0)},${l(45, 224)},${l(24, 122)})`, dark: t > 0.5 };
  };

  const selWs = sel ? byDay[sel] ?? [] : [];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={type.title} weight="bold">
          Kalendář
        </Txt>
        {!isThisMonth && (
          <Pressable onPress={goToday} style={{ backgroundColor: palette.surface2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
            <Txt size={type.label} weight="bold" color={palette.accent}>
              Dnes
            </Txt>
          </Pressable>
        )}
      </View>

      {/* month switcher */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.lg }}>
        <Pressable onPress={prev} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color={palette.textDim} />
        </Pressable>
        <Txt size={type.h1} weight="bold">
          {MONTHS[view.m]} {view.y}
        </Txt>
        <Pressable onPress={next} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="chevron-forward" size={22} color={palette.textDim} />
        </Pressable>
      </View>

      {/* month summary */}
      <Card style={{ marginTop: space.lg, flexDirection: 'row' }}>
        <Stat value={String(monthWs.length)} label="tréninků" />
        <Divider />
        <Stat value={fmtWeight(monthVol, unit)} label="objem" />
        <Divider />
        <Stat value={String(streak)} label={streak === 1 ? 'týden v řadě' : 'týdny v řadě'} accent />
      </Card>

      {/* weekday header */}
      <View style={{ flexDirection: 'row', marginTop: space.xl, marginBottom: 6 }}>
        {WD.map((d) => (
          <Txt key={d} size={type.caption} weight="semibold" color={palette.textMute} style={{ flex: 1, textAlign: 'center' }}>
            {d}
          </Txt>
        ))}
      </View>

      {/* grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((c, i) => {
          if (!c) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }} />;
          const ws = byDay[c.key];
          const has = !!ws?.length;
          const h = has ? heat(volByDay[c.key]) : null;
          const isToday = c.key === todayKey;
          const isSel = c.key === sel;
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
              <Pressable
                onPress={() => setSel(c.key)}
                style={{
                  flex: 1,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: h ? h.bg : 'transparent',
                  borderWidth: isSel ? 2 : isToday ? 1.5 : 0,
                  borderColor: isSel ? palette.accent : isToday ? palette.textDim : 'transparent',
                }}>
                <Txt size={type.label} weight={has || isToday ? 'bold' : 'medium'} num color={h ? (h.dark ? palette.bg : palette.text) : isToday ? palette.text : palette.textDim}>
                  {c.day}
                </Txt>
                {ws && ws.length > 1 && (
                  <View style={{ position: 'absolute', top: 3, right: 4, minWidth: 13, height: 13, borderRadius: 7, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                    <Txt size={8} weight="bold" num color={palette.accent}>
                      {ws.length}
                    </Txt>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* selected-day detail */}
      <View style={{ marginTop: space.xl }}>
        {selWs.length > 0 ? (
          <>
            <Txt size={type.label} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginBottom: 10 }}>
              {relativeDay(selWs[0].finishedAt!, now).toUpperCase()}
            </Txt>
            <View style={{ gap: space.sm }}>
              {selWs.map((w) => {
                const sets = w.exercises.reduce((n, le) => n + le.sets.length, 0);
                return (
                  <Pressable key={w.id} onPress={() => router.push(`/history/${w.id}`)}>
                    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 }}>
                      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="barbell-outline" size={20} color={palette.textDim} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt size={type.body} weight="bold">
                          {w.name}
                        </Txt>
                        <Txt size={type.caption} weight="medium" num color={palette.textMute}>
                          {w.exercises.length} cviků · {sets} sérií
                          {w.avgHr ? ` · ⌀${w.avgHr} tep` : ''}
                        </Txt>
                      </View>
                      <Txt size={type.body} weight="bold" num color={palette.textDim}>
                        {fmtWeight(workoutVolumeEx(w, exById), unit)}
                      </Txt>
                      <Ionicons name="chevron-forward" size={18} color={palette.textMute} />
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <Card>
            <Txt size={type.body} weight="medium" color={palette.textMute}>
              {finished.length === 0 ? 'Zatím žádné tréninky. Zaloguj první a naskočí do kalendáře.' : 'V tento den žádný trénink.'}
            </Txt>
          </Card>
        )}
      </View>
    </Screen>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt size={type.h1} weight="bold" num color={accent ? palette.accent : palette.text}>
        {value}
      </Txt>
      <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginTop: 2, textAlign: 'center' }}>
        {label}
      </Txt>
    </View>
  );
}

function Divider() {
  return <View style={{ width: 1, backgroundColor: palette.hairline, marginVertical: 2 }} />;
}
