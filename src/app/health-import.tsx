import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { fmtClock, relativeDay } from '@/lib/format';
import { HealthWorkout, heartRateFor, listHealthWorkouts } from '@/lib/health';
import { localCoversWindow, useStore } from '@/store/useStore';

export default function HealthImport() {
  const router = useRouter();
  const workouts = useStore((s) => s.workouts);
  const importHealthWorkout = useStore((s) => s.importHealthWorkout);
  const healthEnabled = useStore((s) => s.settings.healthEnabled);

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<HealthWorkout[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const importedUuids = useMemo(
    () => new Set(workouts.map((w) => w.healthUuid).filter((x): x is string => !!x)),
    [workouts],
  );
  // hide Health workouts already logged live in Steelset (same session → one record, no duplicate)
  const visible = useMemo(
    () => list.filter((hw) => !localCoversWindow(workouts, hw.start, hw.end)),
    [list, workouts],
  );

  const load = async () => {
    setLoading(true);
    setList(await listHealthWorkouts());
    setLoading(false);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doImport = async (hw: HealthWorkout) => {
    const hr = await heartRateFor(hw.start, hw.end);
    importHealthWorkout({
      uuid: hw.uuid,
      name: hw.name,
      start: hw.start,
      end: hw.end,
      avg: hr.avg,
      max: hr.max,
      series: hr.series.length ? hr.series : undefined,
    });
  };

  const onImport = async (hw: HealthWorkout) => {
    if (busy || importedUuids.has(hw.uuid)) return;
    setBusy(hw.uuid);
    await doImport(hw);
    setBusy(null);
  };

  const onImportAll = async () => {
    if (busy) return;
    setBusy('__all__');
    for (const hw of visible) {
      if (!importedUuids.has(hw.uuid)) await doImport(hw); // importHealthWorkout dedups internally too
    }
    setBusy(null);
  };

  const pending = visible.filter((hw) => !importedUuids.has(hw.uuid));
  const now = Date.now();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={palette.textDim} />
        </Pressable>
        <Txt size={type.h2} weight="bold">
          Import z Apple Health
        </Txt>
        <Pressable onPress={load} hitSlop={10} disabled={loading}>
          <Ionicons name="refresh" size={22} color={loading ? palette.surface3 : palette.textDim} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Txt size={type.body} weight="medium" color={palette.textMute} style={{ marginBottom: space.lg }}>
          Tréninky z hodinek / Kondice za posledních 30 dní. Ťukni pro přidání do Steelsetu i s tepem.
        </Txt>

        {healthEnabled && !loading && pending.length > 1 && (
          <Pressable
            onPress={onImportAll}
            disabled={!!busy}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: space.lg, paddingVertical: 13, borderRadius: radius.md, backgroundColor: palette.accent }}>
            {busy === '__all__' ? (
              <ActivityIndicator color={palette.bg} />
            ) : (
              <>
                <Ionicons name="download" size={18} color={palette.bg} />
                <Txt size={type.body} weight="bold" color={palette.bg}>
                  Importovat vše ({pending.length})
                </Txt>
              </>
            )}
          </Pressable>
        )}

        {!healthEnabled ? (
          <Txt size={type.body} weight="medium" color={palette.textMute}>
            Nejdřív připoj Apple Health v Profilu.
          </Txt>
        ) : loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : visible.length === 0 ? (
          <Txt size={type.body} weight="medium" color={palette.textMute}>
            {Platform.OS === 'ios'
              ? 'Žádné nové tréninky. Buď žádné na hodinkách, nebo už je máš zapsané v Steelsetu.'
              : 'Import je dostupný jen na iPhonu.'}
          </Txt>
        ) : (
          <View style={{ gap: space.sm }}>
            {visible.map((hw) => {
              const imported = importedUuids.has(hw.uuid);
              const isBusy = busy === hw.uuid;
              return (
                <Pressable
                  key={hw.uuid}
                  onPress={() => onImport(hw)}
                  disabled={imported || isBusy}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: palette.surface,
                    borderRadius: radius.md,
                    padding: space.lg,
                    borderWidth: 1,
                    borderColor: imported ? 'transparent' : palette.hairline,
                    opacity: imported ? 0.6 : 1,
                  }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="barbell-outline" size={20} color={palette.textDim} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={type.body} weight="bold">
                      {hw.name}
                    </Txt>
                    <Txt size={type.caption} weight="medium" num color={palette.textMute}>
                      {relativeDay(hw.start, now)} · {fmtClock(hw.durationSec)}
                      {hw.energyKcal ? ` · ${hw.energyKcal} kcal` : ''}
                    </Txt>
                  </View>
                  {imported ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-circle" size={20} color={palette.accent} />
                      <Txt size={type.label} weight="semibold" color={palette.accent}>
                        Přidáno
                      </Txt>
                    </View>
                  ) : isBusy ? (
                    <ActivityIndicator color={palette.accent} />
                  ) : (
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="add" size={22} color={palette.bg} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
