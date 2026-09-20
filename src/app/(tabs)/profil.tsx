import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import { Card, Screen, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { workoutsToCsv } from '@/lib/csv';
import { exportCsv } from '@/lib/export';
import { deleteMyHealthWorkouts, healthSelfTest, latestBodyweightKg, requestHealth } from '@/lib/health';
import { fmtNum, fromDisplayWeight, toDisplayWeight } from '@/lib/format';
import { purchasesAvailable } from '@/lib/purchases';
import { useExercisesById, useStore } from '@/store/useStore';

export default function Profil() {
  const router = useRouter();
  const settings = useStore((s) => s.settings);
  const workouts = useStore((s) => s.workouts);
  const trashedCount = useStore((s) => s.trashedWorkouts.length);
  const isPro = useStore((s) => s.isPro);
  const setPro = useStore((s) => s.setPro);
  const setUnit = useStore((s) => s.setUnit);
  const setSetting = useStore((s) => s.setSetting);
  const wipeAll = useStore((s) => s.wipeAll);
  const appleUser = useStore((s) => s.appleUser);
  const setAppleUser = useStore((s) => s.setAppleUser);
  const exById = useExercisesById();

  const signInApple = async () => {
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const name = cred.fullName
        ? [cred.fullName.givenName, cred.fullName.familyName].filter(Boolean).join(' ')
        : undefined;
      setAppleUser({ sub: cred.user, name: name || undefined, email: cred.email ?? undefined });
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Přihlášení selhalo', 'Zkus to prosím znovu.');
    }
  };

  // Bez klíče RevenueCatu si Pro nejde koupit, takže by se ad-free verze nedala otestovat.
  // Sedm ťuknutí na řádek s verzí odemkne ruční přepínač. Jakmile obchod ožije, zmizí sám.
  const [versionTaps, setVersionTaps] = useState(0);
  const testerUnlocked = versionTaps >= 7 && !purchasesAvailable();

  const finishedCount = workouts.filter((w) => w.finishedAt).length;

  const onExport = async () => {
    if (finishedCount === 0) {
      Alert.alert('Žádná data', 'Nejdřív zaloguj nějaký trénink.');
      return;
    }
    await exportCsv(workoutsToCsv(workouts, exById));
  };

  const onWipe = () => {
    Alert.alert('Smazat všechna data?', 'Tréninky, plány i vlastní cviky budou nenávratně smazány.', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => wipeAll() },
    ]);
  };

  const onConnectHealth = async () => {
    await requestHealth();
    setSetting('healthEnabled', true);
  };

  const onTestHealth = async () => {
    const res = await healthSelfTest();
    Alert.alert('Apple Health - test', res);
  };

  const onPullBodyweight = async () => {
    const kg = await latestBodyweightKg();
    if (kg && kg > 0) setSetting('bodyweightKg', Math.round(kg * 10) / 10);
    else Alert.alert('Apple Health', 'Váhu se nepodařilo načíst. Zadej ji ručně, nebo si ji zapiš v Health.');
  };

  const onCleanupHealth = () => {
    Alert.alert(
      'Uklidit Apple Health?',
      'Smaže tréninky, které do Apple Health zapsala starší verze Steelsetu (ty „Tradiční silový trénink"). Tvoje tréninky z hodinek zůstanou nedotčené.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Uklidit',
          style: 'destructive',
          onPress: async () => {
            const n = await deleteMyHealthWorkouts();
            Alert.alert('Hotovo', n > 0 ? `Smazáno ${n} záznamů z Apple Health.` : 'Nic k úklidu - Steelset už do Health nezapisuje.');
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Txt size={type.title} weight="bold">
        Profil
      </Txt>

      <Card style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: palette.accentDeep, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={28} color={palette.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={type.h1} weight="bold">
            Můj profil
          </Txt>
          <Txt size={type.label} weight="medium" color={palette.textMute}>
            {finishedCount} {finishedCount === 1 ? 'trénink' : finishedCount >= 2 && finishedCount <= 4 ? 'tréninky' : 'tréninků'} · lokální data
          </Txt>
        </View>
      </Card>

      <Section title="ÚČET A ZÁLOHA">
        {appleUser ? (
          <Row icon="logo-apple" label={appleUser.name || appleUser.email || 'Přihlášen přes Apple'}>
            <Pressable onPress={() => setAppleUser(null)} hitSlop={6}>
              <Txt size={type.label} weight="semibold" color={palette.red}>
                Odhlásit
              </Txt>
            </Pressable>
          </Row>
        ) : Platform.OS === 'ios' ? (
          <View style={{ padding: space.lg, borderBottomWidth: 1, borderBottomColor: palette.hairline }}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={{ height: 46 }}
              onPress={signInApple}
            />
          </View>
        ) : (
          <Row icon="logo-apple" label="Přihlášení přes Apple (jen na iPhonu)" />
        )}
        <Row icon="cloud-done-outline" label="Záloha do iCloudu" last>
          <Txt size={type.label} weight="semibold" color={palette.accent}>
            {Platform.OS === 'ios' ? 'Automatická' : 'Jen iOS'}
          </Txt>
        </Row>
      </Section>

      <Section title="JEDNOTKY">
        <Row icon="barbell-outline" label="Váhové jednotky">
          <Toggle options={['kg', 'lb']} value={settings.unit} onChange={(v) => setUnit(v as any)} />
        </Row>
        <Row icon="body-outline" label="Tělesná váha">
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
        <Row icon="layers-outline" label="Přírůstek (steppery)">
          {settings.unit === 'lb' ? (
            <Stepper value={settings.incrementLb} step={2.5} min={1} suffix=" lb" onChange={(v) => setSetting('incrementLb', v)} />
          ) : (
            <Stepper value={settings.increment} step={1.25} min={0.5} suffix=" kg" onChange={(v) => setSetting('increment', v)} />
          )}
        </Row>
        <Row icon="timer-outline" label="Výchozí odpočinek">
          <Stepper value={settings.restDefaultSec} step={15} min={15} suffix=" s" onChange={(v) => setSetting('restDefaultSec', v)} />
        </Row>
        <Row icon="list-outline" label="Sérií u nového cviku">
          <Stepper
            value={settings.defaultSets ?? 3}
            step={1}
            min={1}
            max={10}
            suffix="×"
            onChange={(v) => setSetting('defaultSets', v)}
          />
        </Row>
        <Row icon="trending-up-outline" label="Nabízet zvýšení váhy" last>
          <Switch label="Nabízet zvýšení váhy" value={settings.stallAlerts !== false} onChange={(v) => setSetting('stallAlerts', v)} />
        </Row>
      </Section>

      {Platform.OS === 'ios' && (
        <Section title="APPLE HEALTH">
          {settings.healthEnabled ? (
            <>
              <Row icon="heart" label="Apple Health">
                <Txt size={type.label} weight="semibold" color={palette.accent}>
                  Připojeno
                </Txt>
              </Row>
              <RowButton icon="download-outline" label="Importovat trénink z Health" onPress={() => router.push('/health-import')} />
              <RowButton icon="sparkles-outline" label="Uklidit tréninky v Health" onPress={onCleanupHealth} />
              <RowButton icon="pulse-outline" label="Test Apple Health (diagnostika)" last onPress={onTestHealth} />
            </>
          ) : (
            <RowButton icon="heart-outline" label="Připojit Apple Health" last onPress={onConnectHealth} />
          )}
        </Section>
      )}

      <Section title="DATA">
        <RowButton icon="download-outline" label="Export dat (CSV)" onPress={onExport} />
        <RowButton
          icon="arrow-undo-outline"
          label={trashedCount > 0 ? `Koš (${trashedCount})` : 'Koš'}
          onPress={() => router.push('/trash')}
        />
        <RowButton icon="trash-outline" label="Smazat všechna data" danger last onPress={onWipe} />
      </Section>

      <Section title="STEELSET">
        <Pressable
          onPress={() => router.push('/paywall')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: space.lg }}>
          <Ionicons name={isPro ? 'star' : 'star-outline'} size={20} color={isPro ? palette.accent : palette.textDim} />
          <View style={{ flex: 1 }}>
            <Txt size={type.body} weight="medium">
              Steelset Pro
            </Txt>
            <Txt size={type.caption} weight="medium" color={isPro ? palette.accent : palette.textMute} style={{ marginTop: 1 }}>
              {isPro ? 'Aktivní - bez reklam' : 'Vypni reklamy a podpoř vývoj'}
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textMute} />
        </Pressable>
      </Section>

      {testerUnlocked && (
        <Section title="JEN PRO TESTOVÁNÍ">
          <Pressable
            onPress={() => setPro(!isPro)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: space.lg }}>
            <Ionicons name="construct-outline" size={20} color={palette.amber} />
            <View style={{ flex: 1 }}>
              <Txt size={type.body} weight="medium">
                Předstírat předplatné
              </Txt>
              <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginTop: 1 }}>
                {isPro ? 'Zapnuto - reklamy skryté' : 'Vypnuto - reklamy se zobrazují'}
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
          Steelset · v1.0.0 · data zůstávají v telefonu
        </Txt>
      </Pressable>
    </Screen>
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

function Toggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: palette.surface2, borderRadius: radius.pill, padding: 3 }}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: value === o ? palette.accent : 'transparent' }}>
          <Txt size={type.label} weight="bold" color={value === o ? palette.bg : palette.textDim}>
            {o}
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

function Stepper({ value, step, min, max, suffix, onChange }: { value: number; step: number; min: number; max?: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))} hitSlop={6}>
        <Ionicons name="remove-circle" size={26} color={palette.textDim} />
      </Pressable>
      <Txt size={type.body} weight="bold" num style={{ minWidth: 56, textAlign: 'center' }}>
        {fmtNum(value, 2)}
        {suffix}
      </Txt>
      <Pressable
        onPress={() => onChange(Math.min(max ?? Infinity, Math.round((value + step) * 100) / 100))}
        hitSlop={6}>
        <Ionicons name="add-circle" size={26} color={max != null && value >= max ? palette.surface3 : palette.accent} />
      </Pressable>
    </View>
  );
}
