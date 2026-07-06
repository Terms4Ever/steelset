import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { heatColor, MuscleMapChart, MuscleMapLegend, MuscleRegion } from '@/components/MuscleMapChart';
import { Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { MS, muscleAlerts, muscleVolumeDetailed, topExercisesForMuscle } from '@/lib/calc';
import { fmtNum, toDisplayWeight } from '@/lib/format';
import { exercisesById as exByIdSel, useStore } from '@/store/useStore';

const PERIODS = [
  { days: 7, label: '7 dní' },
  { days: 30, label: '30 dní' },
  { days: 90, label: '90 dní' },
];

export default function MuscleMap() {
  const router = useRouter();
  // frozen at mount so the window is stable and the memos below actually hold between renders
  const [now] = useState(() => Date.now());
  const workouts = useStore((s) => s.workouts);
  const custom = useStore((s) => s.customExercises);
  const exerciseMuscles = useStore((s) => s.exerciseMuscles);
  const unit = useStore((s) => s.settings.unit);

  const [days, setDays] = useState(30);
  const [sel, setSel] = useState<MuscleRegion | null>(null);

  const exById = useMemo(() => exByIdSel({ customExercises: custom, exerciseMuscles }), [custom, exerciseMuscles]);
  const since = now - days * MS.DAY;
  const vol = useMemo(() => muscleVolumeDetailed(workouts, exById, since), [workouts, exById, since]);
  const prevVol = useMemo(
    () => muscleVolumeDetailed(workouts, exById, since - days * MS.DAY, since),
    [workouts, exById, since, days],
  );
  const alerts = useMemo(() => muscleAlerts(vol), [vol]);
  const neverTrained = useMemo(() => workouts.every((w) => !w.finishedAt), [workouts]);
  const windowTotal = useMemo(() => Object.values(vol).reduce((s, v) => s + v, 0), [vol]);
  const empty = neverTrained || windowTotal === 0; // no data to show for THIS window

  const maxVol = Math.max(1, ...Object.values(vol));
  const topName = Object.entries(vol).sort((a, b) => b[1] - a[1])[0]?.[0];

  const selVol = sel ? (vol[sel] ?? 0) : 0;
  const selPrev = sel ? (prevVol[sel] ?? 0) : 0;
  const trendPct = sel && selPrev > 0 ? Math.round(((selVol - selPrev) / selPrev) * 100) : null;
  const selTop = useMemo(
    () => (sel ? topExercisesForMuscle(workouts, exById, sel, since).slice(0, 3) : []),
    [sel, workouts, exById, since],
  );
  const selTopMax = Math.max(1, ...selTop.map((t) => t.volume));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.xl, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={palette.textDim} />
        </Pressable>
        <View>
          <Txt size={type.h1} weight="bold">
            Svalová mapa
          </Txt>
          <Txt size={type.caption} weight="medium" color={palette.textMute}>
            Objem podle svalů · Pokrok
          </Txt>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: 6, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* period chips */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PERIODS.map((p) => (
            <Pressable
              key={p.days}
              onPress={() => setDays(p.days)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: radius.pill,
                backgroundColor: days === p.days ? palette.accent : palette.surface2,
              }}>
              <Txt size={type.label} weight="bold" color={days === p.days ? palette.bg : palette.textDim}>
                {p.label}
              </Txt>
            </Pressable>
          ))}
        </View>

        {/* chart card - muscles are tappable only when there is data in the window */}
        <View style={{ marginTop: space.lg, backgroundColor: palette.surface, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: palette.hairline }}>
          <MuscleMapChart volumes={empty ? {} : vol} onPressMuscle={empty ? undefined : (m) => setSel(m)} selected={sel} />
          <View style={{ marginTop: space.lg, borderTopWidth: 1, borderTopColor: palette.hairline, paddingTop: space.md }}>
            <MuscleMapLegend />
          </View>
        </View>

        {/* empty state - distinguishes "never trained" from "nothing in this window" */}
        {empty && (
          <View style={{ alignItems: 'center', marginTop: space.xl }}>
            <Txt size={type.h2} weight="bold">
              {neverTrained ? 'Zatím žádná data' : `Za posledních ${days} dní nic`}
            </Txt>
            <Txt size={type.body} weight="medium" color={palette.textMute} style={{ textAlign: 'center', marginTop: 6 }}>
              {neverTrained
                ? 'Zapiš první trénink a mapa se rozsvítí podle toho, co trénuješ.'
                : 'V tomhle období není žádný trénink - zkus delší období, nebo běž zapsat nový.'}
            </Txt>
            {neverTrained ? (
              <Pressable
                onPress={() => router.replace('/')}
                style={{ marginTop: space.lg, backgroundColor: palette.accent, paddingHorizontal: 22, paddingVertical: 13, borderRadius: radius.pill }}>
                <Txt size={type.body} weight="bold" color={palette.bg}>
                  Zaloguj první trénink
                </Txt>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setDays(90)}
                style={{ marginTop: space.lg, backgroundColor: palette.surface2, paddingHorizontal: 22, paddingVertical: 13, borderRadius: radius.pill }}>
                <Txt size={type.body} weight="bold" color={palette.accent}>
                  Zobrazit 90 dní
                </Txt>
              </Pressable>
            )}
          </View>
        )}

        {/* smart alerts */}
        {!empty &&
          alerts.map((a, i) => (
            <View
              key={i}
              style={{
                marginTop: space.md,
                flexDirection: 'row',
                gap: 10,
                alignItems: 'flex-start',
                backgroundColor: a.kind === 'overload' ? '#2A1214' : '#2A2210',
                borderWidth: 1,
                borderColor: a.kind === 'overload' ? '#5C2320' : '#5C4A18',
                borderRadius: radius.md,
                padding: space.lg,
              }}>
              <Ionicons name="flash" size={16} color={a.kind === 'overload' ? palette.red : palette.amber} style={{ marginTop: 1 }} />
              <Txt size={type.label} weight="medium" color={palette.text} style={{ flex: 1 }}>
                {a.text}
              </Txt>
            </View>
          ))}
      </ScrollView>

      {/* muscle bottom sheet */}
      {sel && (
        <Pressable onPress={() => setSel(null)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: palette.surface,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: space.xl,
              paddingBottom: 34,
              borderWidth: 1,
              borderColor: palette.hairline,
            }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: palette.surface3, alignSelf: 'center', marginBottom: 14 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: heatColor(selVol, maxVol) }} />
                <Txt size={type.h1} weight="bold">
                  {sel}
                </Txt>
              </View>
              <Pressable onPress={() => setSel(null)} hitSlop={10} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={17} color={palette.textDim} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                  <Txt size={34} weight="bold" num>
                    {fmtNum(toDisplayWeight(selVol, unit))}
                  </Txt>
                  <Txt size={type.body} weight="semibold" color={palette.textMute}>
                    {unit}
                  </Txt>
                </View>
                <Txt size={type.caption} weight="medium" color={palette.textMute}>
                  objem za {days} dní
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt size={type.h1} weight="bold" num color={palette.accent}>
                  {Math.round((selVol / maxVol) * 100)} %
                </Txt>
                <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ textAlign: 'right' }}>
                  vs. nejtrénovanější{topName ? `\n(${topName})` : ''}
                </Txt>
              </View>
            </View>

            {trendPct != null && (
              <View
                style={{
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: 10,
                  backgroundColor: trendPct >= 0 ? palette.accentDeep : '#2A2210',
                  borderWidth: 1,
                  borderColor: trendPct >= 0 ? palette.accentMid : '#5C4A18',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: radius.pill,
                }}>
                <Ionicons name={trendPct >= 0 ? 'trending-up' : 'trending-down'} size={13} color={trendPct >= 0 ? palette.accent : palette.amber} />
                <Txt size={type.caption} weight="semibold" num color={trendPct >= 0 ? palette.accent : palette.amber}>
                  {trendPct >= 0 ? '+' : ''}
                  {trendPct} % vs. předchozích {days} dní
                </Txt>
              </View>
            )}

            {selTop.length > 0 && (
              <>
                <Txt size={type.caption} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginTop: space.lg, marginBottom: 8 }}>
                  NEJVÍC ZASÁHLY
                </Txt>
                <View style={{ gap: 9 }}>
                  {selTop.map((t) => (
                    <View key={t.exerciseId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Txt size={type.label} weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                        {exById[t.exerciseId]?.name ?? 'Cvik'}
                      </Txt>
                      <View style={{ width: 90, height: 7, borderRadius: 4, backgroundColor: palette.surface2 }}>
                        <View style={{ width: `${Math.round((t.volume / selTopMax) * 100)}%`, height: 7, borderRadius: 4, backgroundColor: palette.heatCold }} />
                      </View>
                      <Txt size={type.label} weight="semibold" num color={palette.textDim} style={{ width: 54, textAlign: 'right' }}>
                        {fmtNum(toDisplayWeight(t.volume, unit))}
                      </Txt>
                    </View>
                  ))}
                </View>
              </>
            )}
            {selTop.length === 0 && (
              <Txt size={type.label} weight="medium" color={palette.textMute} style={{ marginTop: space.lg }}>
                V tomhle období žádný cvik na {sel}.
              </Txt>
            )}
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
