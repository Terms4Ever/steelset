import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import { Card, Screen, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { workoutsToCsv } from '@/lib/csv';
import { exportCsv } from '@/lib/export';
import { healthSelfTest, latestBodyweightKg, requestHealth } from '@/lib/health';
import { fmtNum, fromDisplayWeight, toDisplayWeight } from '@/lib/format';
import { backupHint, backupLabel, BackupStatus } from '@/lib/backupStatus';
import { purchasesAvailable } from '@/lib/purchases';
import { INCREMENT_OPTIONS_KG, INCREMENT_OPTIONS_LB, stepNumber, stepOption } from '@/lib/stepper';
import { onBackupDone, readBackupStatus } from '@/lib/sync';
import { readAdsLog } from '@/lib/adsLog';
import { readWatchLog } from '@/lib/watch';
import { locale } from '@/i18n';
import { useT } from '@/i18n/useT';
import { useExercisesById, useStore } from '@/store/useStore';

export default function Profil() {
  const router = useRouter();
  const tx = useT();
  const p = tx.profile;
  const settings = useStore((s) => s.settings);
  const workouts = useStore((s) => s.workouts);
  const trashedCount = useStore((s) => s.trashedWorkouts.length);
  const isPro = useStore((s) => s.isPro);
  const setPro = useStore((s) => s.setPro);
  const setUnit = useStore((s) => s.setUnit);
  const setSetting = useStore((s) => s.setSetting);
  const wipeAll = useStore((s) => s.wipeAll);
  const exById = useExercisesById();

  // Bez klíče RevenueCatu si Pro nejde koupit, takže by se ad-free verze nedala otestovat.
  // Sedm ťuknutí na řádek s verzí odemkne ruční přepínač. Jakmile obchod ožije, zmizí sám.
  const [versionTaps, setVersionTaps] = useState(0);
  const testerUnlocked = versionTaps >= 7 && !purchasesAvailable();

  const finishedCount = workouts.filter((w) => w.finishedAt).length;

  const onExport = async () => {
    if (finishedCount === 0) {
      Alert.alert(p.noDataTitle, p.noDataText);
      return;
    }
    await exportCsv(workoutsToCsv(workouts, exById));
  };

  const onWipe = () => {
    Alert.alert(p.wipeTitle, p.wipeText, [
      { text: tx.common.cancel, style: 'cancel' },
      { text: tx.common.delete, style: 'destructive', onPress: () => wipeAll() },
    ]);
  };

  const onConnectHealth = async () => {
    await requestHealth();
    setSetting('healthEnabled', true);
  };

  const onTestHealth = async () => {
    const res = await healthSelfTest();
    Alert.alert(p.healthTestTitle, res);
  };

  // co se dělo s reklamami: souhlas, sledování, start SDK a chyby od Googlu (#18)
  const onAdsLog = async () => {
    const log = await readAdsLog();
    const head = `Pro: ${isPro} · ${purchasesAvailable() ? 'RevenueCat' : 'no RevenueCat'}`;
    const text = log.length
      ? log
          .slice()
          .reverse()
          .map((e) => `${new Date(e.at).toLocaleString(locale())}  ${e.text}`)
          .join('\n')
      : p.adsLogEmpty;
    Alert.alert(p.adsLogTitle, `${head}\n\n${text}`);
  };

  const onWatchLog = async () => {
    const log = await readWatchLog();
    const text = log.length
      ? log
          .slice()
          .reverse()
          .map((e) => `${new Date(e.at).toLocaleString(locale())}  ${e.text}`)
          .join('\n')
      : p.watchLogEmpty;
    Alert.alert(p.watchLogTitle, text);
  };

  const onPullBodyweight = async () => {
    const kg = await latestBodyweightKg();
    if (kg && kg > 0) setSetting('bodyweightKg', Math.round(kg * 10) / 10);
    else Alert.alert('Apple Health', p.bodyweightFail);
  };

  return (
    <Screen>
      <Txt size={type.title} weight="bold">
        {p.title}
      </Txt>

      <Card style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: palette.accentDeep, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={28} color={palette.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={type.h1} weight="bold">
            {p.me}
          </Txt>
          <Txt size={type.label} weight="medium" color={palette.textMute}>
            {tx.common.workouts(finishedCount)} · {p.localData}
          </Txt>
        </View>
      </Card>

      {/* přenos na nový telefon dělá záloha v iCloudu, přihlášení přes Apple je pryč (#19, S34) */}
      <Section title={p.backup}>
        <BackupRow />
      </Section>

      <Section title={p.exercises}>
        {/* katalog jde spravovat i bez běžícího tréninku: úprava a mazání cviků (#11) */}
        <RowButton icon="barbell-outline" label={p.manageExercises} last onPress={() => router.push('/exercises?mode=manage')} />
      </Section>

      {/* jazyk aplikace: podle telefonu, nebo natvrdo (#20) */}
      <Section title={p.language}>
        <View style={{ padding: space.lg, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Ionicons name="language-outline" size={20} color={palette.textDim} />
            <Txt size={type.body} weight="medium" style={{ flex: 1 }}>
              {p.languageRow}
            </Txt>
          </View>
          <Toggle
            options={['auto', 'cs', 'en']}
            labels={{ auto: p.languageAuto, cs: 'Čeština', en: 'English' }}
            value={settings.language ?? 'auto'}
            onChange={(v) => setSetting('language', v as 'auto' | 'cs' | 'en')}
            stretch
          />
          <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ lineHeight: 17 }}>
            {p.languageHint}
          </Txt>
        </View>
      </Section>

      <Section title={p.units}>
        <Row icon="barbell-outline" label={p.weightUnits}>
          <Toggle options={['kg', 'lb']} value={settings.unit} onChange={(v) => setUnit(v as any)} />
        </Row>
        <Row icon="body-outline" label={p.bodyweight}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {Platform.OS === 'ios' && settings.healthEnabled && (
              <Pressable onPress={onPullBodyweight} hitSlop={6}>
                <Ionicons name="download-outline" size={18} color={palette.accent} />
              </Pressable>
            )}
            <Stepper
              value={Math.round(toDisplayWeight(settings.bodyweightKg, settings.unit) * 10) / 10}
              step={settings.unit === 'lb' ? 1 : 0.5}
              min={Math.round(toDisplayWeight(30, settings.unit))}
              suffix={` ${settings.unit}`}
              onChange={(v) => setSetting('bodyweightKg', fromDisplayWeight(v, settings.unit))}
            />
          </View>
        </Row>
        <Row icon="layers-outline" label={p.increment}>
          {settings.unit === 'lb' ? (
            <Stepper value={settings.incrementLb} options={INCREMENT_OPTIONS_LB} suffix=" lb" onChange={(v) => setSetting('incrementLb', v)} />
          ) : (
            <Stepper value={settings.increment} options={INCREMENT_OPTIONS_KG} suffix=" kg" onChange={(v) => setSetting('increment', v)} />
          )}
        </Row>
        <Row icon="timer-outline" label={p.restDefault}>
          <Stepper value={settings.restDefaultSec} step={15} min={15} suffix=" s" onChange={(v) => setSetting('restDefaultSec', v)} />
        </Row>
        <Row icon="list-outline" label={p.defaultSets}>
          <Stepper
            value={settings.defaultSets ?? 3}
            step={1}
            min={1}
            max={10}
            suffix="×"
            onChange={(v) => setSetting('defaultSets', v)}
          />
        </Row>
        {/* cíl pro widget týdenního cíle (#16); 0 = bez cíle, widget pak vyzve k nastavení */}
        <Row icon="flag-outline" label={p.weeklyGoal}>
          <Stepper
            value={settings.weeklyGoal ?? 0}
            step={1}
            min={0}
            max={7}
            suffix="×"
            zeroLabel={tx.common.off}
            onChange={(v) => setSetting('weeklyGoal', v)}
          />
        </Row>
        <Row icon="trending-up-outline" label={p.stallAlerts} last>
          <Switch label={p.stallAlerts} value={settings.stallAlerts !== false} onChange={(v) => setSetting('stallAlerts', v)} />
        </Row>
      </Section>

      {Platform.OS === 'ios' && (
        <Section title="APPLE HEALTH">
          {settings.healthEnabled ? (
            <>
              <Row icon="heart" label="Apple Health">
                <Txt size={type.label} weight="semibold" color={palette.accent}>
                  {p.connected}
                </Txt>
              </Row>
              <RowButton icon="download-outline" label={p.importHealth} onPress={() => router.push('/health-import')} />
              <RowButton icon="pulse-outline" label={p.testHealth} last onPress={onTestHealth} />
            </>
          ) : (
            <RowButton icon="heart-outline" label={p.connectHealth} last onPress={onConnectHealth} />
          )}
        </Section>
      )}

      {Platform.OS === 'ios' && (
        // trénink se spustí i na Apple Watch, bez druhého zapínání ve Cvičení (#15, S38)
        <Section title="APPLE WATCH">
          <Row icon="watch-outline" label={p.watchAutoStart}>
            <Switch
              label={p.watchAutoStart}
              value={settings.watchAutoStart !== false}
              onChange={(v) => setSetting('watchAutoStart', v)}
            />
          </Row>
          {/* co telefon od hodinek dostal a jak s tím naložil, pro dohledání potíží na zařízení (#23) */}
          <RowButton icon="list-outline" label={p.watchLog} last onPress={onWatchLog} />
        </Section>
      )}

      <Section title={p.data}>
        <RowButton icon="download-outline" label={p.exportCsv} onPress={onExport} />
        <RowButton
          icon="arrow-undo-outline"
          label={trashedCount > 0 ? p.trashCount(trashedCount) : p.trash}
          onPress={() => router.push('/trash')}
        />
        <RowButton icon="trash-outline" label={p.wipe} danger last onPress={onWipe} />
      </Section>

      <Section title="STEELSET">
        <Pressable
          onPress={() => router.push('/paywall')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: space.lg,
            borderBottomWidth: Platform.OS === 'ios' ? 1 : 0,
            borderBottomColor: palette.hairline,
          }}>
          <Ionicons name={isPro ? 'star' : 'star-outline'} size={20} color={isPro ? palette.accent : palette.textDim} />
          <View style={{ flex: 1 }}>
            <Txt size={type.body} weight="medium">
              Steelset Pro
            </Txt>
            <Txt size={type.caption} weight="medium" color={isPro ? palette.accent : palette.textMute} style={{ marginTop: 1 }}>
              {isPro ? p.proActive : p.proPitch}
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textMute} />
        </Pressable>
        {Platform.OS === 'ios' && <RowButton icon="megaphone-outline" label={p.adsLog} last onPress={onAdsLog} />}
      </Section>

      {testerUnlocked && (
        <Section title={p.testerOnly}>
          <Pressable
            onPress={() => setPro(!isPro)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: space.lg }}>
            <Ionicons name="construct-outline" size={20} color={palette.amber} />
            <View style={{ flex: 1 }}>
              <Txt size={type.body} weight="medium">
                {p.fakePro}
              </Txt>
              <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginTop: 1 }}>
                {isPro ? p.fakeProOn : p.fakeProOff}
              </Txt>
            </View>
            <View
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                padding: 3,
                backgroundColor: isPro ? palette.accent : palette.surface3,
                alignItems: isPro ? 'flex-end' : 'flex-start',
              }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: palette.bg }} />
            </View>
          </Pressable>
        </Section>
      )}

      <Pressable onPress={() => setVersionTaps((n) => n + 1)}>
        <Txt size={type.caption} color={palette.textMute} style={{ textAlign: 'center', marginTop: space.xl }}>
          {p.footer}
        </Txt>
      </Pressable>
    </Screen>
  );
}

/** Skutečný stav zálohy do iCloudu: čas poslední zálohy, nebo že iCloud nejde (#19). */
function BackupRow() {
  const tx = useT();
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(() => {
    readBackupStatus().then((st) => {
      setStatus(st);
      setNow(Date.now());
    });
  }, []);

  // při každém návratu na Profil, po každé záloze a jednou za půl minuty kvůli „před N min"
  useFocusEffect(refresh);
  useEffect(() => onBackupDone(refresh), [refresh]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const label = status ? backupLabel(status, now) : null;
  const color = label?.tone === 'ok' ? palette.accent : label?.tone === 'warn' ? palette.red : palette.textMute;
  const icon = status?.kind === 'unavailable' ? 'cloud-offline-outline' : 'cloud-done-outline';

  return (
    <View style={{ padding: space.lg, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Ionicons name={icon} size={20} color={palette.textDim} />
        <Txt size={type.body} weight="medium" style={{ flex: 1 }}>
          {tx.backup.row}
        </Txt>
        {label && (
          <Txt size={type.label} weight="semibold" color={color}>
            {label.text}
          </Txt>
        )}
      </View>
      {status && (
        <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginLeft: 34, lineHeight: 17 }}>
          {backupHint(status)}
        </Txt>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: space.xl }}>
      <Txt size={type.label} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginBottom: 10 }}>
        {title}
      </Txt>
      <Card style={{ padding: 0 }}>{children}</Card>
    </View>
  );
}

function Row({ icon, label, children, last }: { icon: any; label: string; children?: React.ReactNode; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: space.lg, borderTopWidth: 0, borderBottomWidth: last ? 0 : 1, borderBottomColor: palette.hairline }}>
      <Ionicons name={icon} size={20} color={palette.textDim} />
      <Txt size={type.body} weight="medium" style={{ flex: 1 }}>
        {label}
      </Txt>
      {children}
    </View>
  );
}

function RowButton({ icon, label, onPress, danger, last }: { icon: any; label: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: space.lg, borderBottomWidth: last ? 0 : 1, borderBottomColor: palette.hairline }}>
      <Ionicons name={icon} size={20} color={danger ? palette.red : palette.textDim} />
      <Txt size={type.body} weight="medium" color={danger ? palette.red : palette.text} style={{ flex: 1 }}>
        {label}
      </Txt>
      <Ionicons name="chevron-forward" size={18} color={palette.textMute} />
    </Pressable>
  );
}

function Toggle({
  options,
  labels,
  value,
  onChange,
  stretch,
}: {
  options: string[];
  labels?: Record<string, string>;
  value: string;
  onChange: (v: string) => void;
  stretch?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: palette.surface2, borderRadius: radius.pill, padding: 3 }}>
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          style={{ flex: stretch ? 1 : undefined, alignItems: 'center', paddingHorizontal: stretch ? 8 : 16, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: value === o ? palette.accent : 'transparent' }}>
          <Txt size={type.label} weight="bold" color={value === o ? palette.bg : palette.textDim} numberOfLines={1}>
            {labels?.[o] ?? o}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: value ? palette.accent : palette.surface3, justifyContent: 'center', padding: 3 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: value ? palette.bg : palette.textMute, alignSelf: value ? 'flex-end' : 'flex-start' }} />
    </Pressable>
  );
}

type StepperProps = { value: number; suffix: string; zeroLabel?: string; onChange: (v: number) => void } & (
  | { step: number; min: number; max?: number; options?: undefined }
  | { options: readonly number[]; step?: undefined; min?: undefined; max?: undefined }
);

/** Krok dopadá vždy na mřížku nebo na hodnotu ze seznamu, takže se jde vrátit, odkud se vyšlo (#21). */
function Stepper({ value, step, min, max, options, suffix, zeroLabel, onChange }: StepperProps) {
  const go = (dir: 1 | -1) => (options ? stepOption(options, value, dir) : stepNumber(value, step!, dir, min!, max));
  const atMax = options ? value >= Math.max(...options) : max != null && value >= max;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={() => onChange(go(-1))} hitSlop={6}>
        <Ionicons name="remove-circle" size={26} color={palette.textDim} />
      </Pressable>
      <Txt size={type.body} weight="bold" num style={{ minWidth: 56, textAlign: 'center' }}>
        {value === 0 && zeroLabel ? zeroLabel : `${fmtNum(value, 2)}${suffix}`}
      </Txt>
      <Pressable
        onPress={() => onChange(go(1))}
        hitSlop={6}>
        <Ionicons name="add-circle" size={26} color={atMax ? palette.surface3 : palette.accent} />
      </Pressable>
    </View>
  );
}
