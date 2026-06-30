import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { BodyMap } from '@/components/BodyMap';
import { LineChart } from '@/components/LineChart';
import { Card, Screen, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { Workout } from '@/data/types';
import { bestE1rm, e1rm, e1rmTrend, isCountable, MS, muscleVolume, strengthScore, weeklyVolume } from '@/lib/calc';
import { workoutsToCsv } from '@/lib/csv';
import { exportCsv } from '@/lib/export';
import { fmtNum, fmtWeight, toDisplayWeight } from '@/lib/format';
import { exercisesById as exByIdSel, useStore } from '@/store/useStore';

function scoreAsOf(workouts: Workout[], cutoff: number) {
  return strengthScore(workouts.filter((w) => w.finishedAt && w.finishedAt <= cutoff));
}
function prCountInWindow(workouts: Workout[], now: number, windowMs: number) {
  const finished = [...workouts].filter((w) => w.finishedAt).sort((a, b) => a.finishedAt! - b.finishedAt!);
  const best: Record<string, number> = {};
  let count = 0;
  for (const w of finished) {
    for (const le of w.exercises) {
      for (const s of le.sets) {
        if (!isCountable(s)) continue;
        const v = e1rm(s.weight, s.reps);
        if (v > (best[le.exerciseId] ?? 0) + 1e-9) {
          best[le.exerciseId] = v;
          if (w.finishedAt! >= now - windowMs) count++;
        }
      }
    }
  }
  return count;
}

export default function Pokrok() {
  const now = Date.now();
  const workouts = useStore((s) => s.workouts);
  const custom = useStore((s) => s.customExercises);
  const unit = useStore((s) => s.settings.unit);
  const exById = useMemo(() => exByIdSel({ customExercises: custom }), [custom]);

  const finished = useMemo(() => workouts.filter((w) => w.finishedAt), [workouts]);
  const score = useMemo(() => strengthScore(workouts), [workouts]);
  const delta = useMemo(() => score - scoreAsOf(workouts, now - 30 * MS.DAY), [workouts, score, now]);
  const weekVol = useMemo(() => weeklyVolume(workouts, now), [workouts, now]);
  const weekCount = useMemo(() => finished.filter((w) => w.finishedAt! >= now - MS.WEEK).length, [finished, now]);
  const squat1rm = useMemo(() => bestE1rm(workouts, 'squat'), [workouts]);
  const prs30 = useMemo(() => prCountInWindow(workouts, now, 30 * MS.DAY), [workouts, now]);

  const mvol = useMemo(() => muscleVolume(workouts, exById, now - 30 * MS.DAY), [workouts, exById, now]);
  const heat = useMemo(() => {
    const entries = Object.entries(mvol).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = entries[0]?.[1] ?? 1;
    return entries.map(([name, vol]) => ({ name, pct: Math.round((vol / max) * 100) }));
  }, [mvol]);

  const trendExId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of finished) for (const le of w.exercises) if (le.sets.some(isCountable)) counts[le.exerciseId] = (counts[le.exerciseId] ?? 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top?.[0] ?? null;
  }, [finished]);
  const trend = useMemo(() => (trendExId ? e1rmTrend(workouts, trendExId) : []), [workouts, trendExId]);

  const heatColor = (pct: number) => (pct >= 66 ? palette.accent : pct >= 33 ? palette.amber : palette.heatCold);

  const onExport = async () => {
    await exportCsv(workoutsToCsv(workouts, exById));
  };

  const empty = finished.length === 0;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt size={type.title} weight="bold">
          Pokrok
        </Txt>
        <Pressable onPress={onExport} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.surface2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill }}>
          <Ionicons name="download-outline" size={15} color={palette.textDim} />
          <Txt size={type.caption} weight="semibold" color={palette.textDim}>
            CSV
          </Txt>
        </Pressable>
      </View>

      {empty ? (
        <Card style={{ marginTop: space.xl }}>
          <Txt size={type.body} weight="medium" color={palette.textMute}>
            Zaloguj první trénink a tady uvidíš silové skóre, grafy a objem podle svalů.
          </Txt>
        </Card>
      ) : (
        <>
          <Card style={{ marginTop: space.lg, alignItems: 'center', paddingVertical: space.xl }}>
            <Txt size={type.caption} weight="bold" color={palette.textDim} style={{ letterSpacing: 1.2 }}>
              SILOVÉ SKÓRE
            </Txt>
            <Txt size={56} weight="bold" num color={palette.accent} style={{ marginVertical: 4 }}>
              {score}
            </Txt>
            {delta > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="trending-up" size={15} color={palette.accent} />
                <Txt size={type.label} weight="semibold" color={palette.accent} num>
                  +{delta}
                </Txt>
                <Txt size={type.label} weight="medium" color={palette.textMute}>
                  za 30 dní
                </Txt>
              </View>
            )}
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md }}>
            <Stat label="Tento týden" value={fmtNum(toDisplayWeight(weekVol, unit))} unit={`${unit} objem`} />
            <Stat label="Tréninků" value={String(weekCount)} unit="tento týden" />
            <Stat label="Odhad 1RM dřep" value={squat1rm ? fmtNum(toDisplayWeight(squat1rm, unit)) : '-'} unit={unit} />
            <Stat label="Rekordů" value={String(prs30)} unit="za 30 dní" />
          </View>

          {trend.length >= 2 && (
            <>
              <Txt size={type.label} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginTop: space.xl, marginBottom: 10 }}>
                TREND ODHADU 1RM · {exById[trendExId!]?.name?.toUpperCase()}
              </Txt>
              <Card>
                <LineChart points={trend.map((p) => p.value)} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Txt size={type.caption} color={palette.textMute} num>
                    {fmtWeight(trend[0].value, unit)}
                  </Txt>
                  <Txt size={type.caption} weight="bold" color={palette.accent} num>
                    {fmtWeight(trend[trend.length - 1].value, unit)}
                  </Txt>
                </View>
              </Card>
            </>
          )}

          <Txt size={type.label} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginTop: space.xl, marginBottom: 10 }}>
            SVALOVÁ MAPA · 30 DNÍ
          </Txt>
          <Card>
            <BodyMap volumes={mvol} />
            {heat.length > 0 && (
              <View style={{ gap: 11, marginTop: space.lg, borderTopWidth: 1, borderTopColor: palette.hairline, paddingTop: space.lg }}>
                {heat.map((m) => (
                  <View key={m.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Txt size={type.label} weight="medium" color={palette.textDim} style={{ width: 72 }}>
                      {m.name}
                    </Txt>
                    <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: palette.surface2 }}>
                      <View style={{ width: `${m.pct}%`, height: 8, borderRadius: 4, backgroundColor: heatColor(m.pct) }} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card style={{ width: '47.5%', flexGrow: 1 }}>
      <Txt size={type.caption} weight="medium" color={palette.textDim}>
        {label}
      </Txt>
      <Txt size={type.display} weight="bold" num style={{ marginTop: 6 }}>
        {value}
      </Txt>
      <Txt size={type.caption} weight="medium" color={palette.textMute}>
        {unit}
      </Txt>
    </Card>
  );
}
