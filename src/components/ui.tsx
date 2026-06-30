import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  ScrollView,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { font, palette, radius, space, tabularNums, type as type_ } from '@/constants/theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

export function Txt({
  children,
  size = type_.body,
  weight = 'regular',
  color = palette.text,
  num,
  style,
  ...rest
}: TextProps & {
  size?: number;
  weight?: Weight;
  color?: string;
  num?: boolean;
}) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: font[weight], fontSize: size, color, lineHeight: size * 1.25 },
        num && tabularNums,
        style,
      ]}>
      {children}
    </Text>
  );
}

/** Full-bleed dark screen with a fake iOS status bar + scrollable body. */
export function Screen({
  children,
  scroll = true,
  pad = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  pad?: boolean;
}) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Body
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? { padding: pad ? space.xl : 0, paddingBottom: 120 } : undefined}
        showsVerticalScrollIndicator={false}>
        {children}
      </Body>
    </SafeAreaView>
  );
}

export function Card({ children, style, ...rest }: ViewProps & { children: ReactNode }) {
  return (
    <View {...rest} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Pill({
  children,
  color = palette.surface3,
  textColor = palette.textDim,
  style,
}: {
  children: ReactNode;
  color?: string;
  textColor?: string;
  style?: ViewProps['style'];
}) {
  return (
    <View style={[styles.pill, { backgroundColor: color }, style]}>
      <Txt size={type_.caption} weight="semibold" color={textColor}>
        {children}
      </Txt>
    </View>
  );
}

export function PrimaryButton({
  label,
  sublabel,
  onPress,
  style,
  ...rest
}: PressableProps & { label: string; sublabel?: string }) {
  return (
    <Pressable
      onPress={onPress}
      {...rest}
      style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, style as object]}>
      <Txt size={17} weight="bold" color={palette.bg}>
        {label}
      </Txt>
      {sublabel ? (
        <Txt size={type_.caption} weight="semibold" color="#0A3D22" style={{ marginTop: 2 }}>
          {sublabel}
        </Txt>
      ) : null}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  primaryBtn: {
    backgroundColor: palette.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
