import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useMemo } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import { Card, Screen, Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { workoutsToCsv } from '@/lib/csv';
import { exportCsv } from '@/lib/export';
import { fmtNum } from '@/lib/format';
import { exercisesById as exByIdSel, useStore } from '@/store/useStore';

export default function Profil() {
  const settings = useStore((s) => s.settings);
  const workouts = useStore((s) => s.workouts);
  const custom = useStore((s) => s.customExercises);
  const setUnit = useStore((s) => s.setUnit);
  const setSetting = useStore((s) => s.setSetting);
  const wipeAll = useStore((s) => s.wipeAll);
  const appleUser = useStore((s) => s.appleUser);
  const setAppleUser = useStore((s) => s.setAppleUser);
  const exById = useMemo(() => exByIdSel({ customExercises: custom }), [custom]);

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
        <Row icon="layers-outline" label="Přírůstek (steppery)">
          <Stepper value={settings.increment} step={1.25} min={0.5} suffix=" kg" onChange={(v) => setSetting('increment', v)} />
        </Row>
        <Row icon="timer-outline" label="Výchozí odpočinek" last>
          <Stepper value={settings.restDefaultSec} step={15} min={15} suffix=" s" onChange={(v) => setSetting('restDefaultSec', v)} />
        </Row>
      </Section>

      <Section title="DATA">
        <RowButton icon="download-outline" label="Export dat (CSV)" onPress={onExport} />
        <RowButton icon="trash-outline" label="Smazat všechna data" danger last onPress={onWipe} />
      </Section>

      <Section title="SETLY">
        <Row icon="star-outline" label="Setly Pro" last>
          <Txt size={type.label} weight="semibold" color={palette.accent}>
            Lifetime
          </Txt>
        </Row>
      </Section>

      <Txt size={type.caption} color={palette.textMute} style={{ textAlign: 'center', marginTop: space.xl }}>
        Setly · v1.0.0 · data zůstávají v telefonu
      </Txt>
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

function Stepper({ value, step, min, suffix, onChange }: { value: number; step: number; min: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))} hitSlop={6}>
        <Ionicons name="remove-circle" size={26} color={palette.textDim} />
      </Pressable>
      <Txt size={type.body} weight="bold" num style={{ minWidth: 56, textAlign: 'center' }}>
        {fmtNum(value)}
        {suffix}
      </Txt>
      <Pressable onPress={() => onChange(Math.round((value + step) * 100) / 100)} hitSlop={6}>
        <Ionicons name="add-circle" size={26} color={palette.accent} />
      </Pressable>
    </View>
  );
}
