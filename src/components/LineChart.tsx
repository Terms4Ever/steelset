import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { palette } from '@/constants/theme';
import { Txt } from '@/components/ui';

export function LineChart({ points, height = 140, color = palette.accent }: { points: number[]; height?: number; color?: string }) {
  if (points.length < 2) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={13} color={palette.textMute}>
          Zaloguj víc tréninků a graf se zobrazí.
        </Txt>
      </View>
    );
  }
  const W = 320;
  const H = height;
  const pad = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (W - pad * 2) / (points.length - 1);
  const xy = points.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (H - pad * 2);
    return { x, y };
  });
  const polyline = xy.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={palette.hairline} strokeWidth={1} />
      <Polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {xy.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={i === xy.length - 1 ? 4 : 2.5} fill={color} />
      ))}
    </Svg>
  );
}
