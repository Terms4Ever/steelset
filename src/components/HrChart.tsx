import { View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { Txt } from '@/components/ui';
import { palette, type } from '@/constants/theme';
import { HrSample } from '@/data/types';
import { fmtClock } from '@/lib/format';

/** Heart-rate-over-time chart for one workout. Vertical ticks mark completed sets. */
export function HrChart({
  series,
  start,
  end,
  markers = [],
  height = 150,
}: {
  series: HrSample[];
  start: number;
  end: number;
  markers?: number[];
  height?: number;
}) {
  // only plot samples that actually fall inside the workout window; if they don't overlap (e.g. an edited
  // workout whose date moved away from its historical HR), render nothing instead of a collapsed line.
  const pts = series.filter((s) => s.t >= start && s.t <= end);
  if (pts.length < 2 || end <= start) return null;

  const W = 320;
  const H = height;
  const padX = 6;
  const padTop = 12;
  const padBot = 10;
  const span = Math.max(1, end - start);

  const bpms = pts.map((s) => s.bpm);
  let lo = Math.min(...bpms);
  let hi = Math.max(...bpms);
  if (hi - lo < 10) {
    const mid = (hi + lo) / 2;
    lo = mid - 5;
    hi = mid + 5;
  }
  const rng = hi - lo || 1;
  const avg = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);

  const X = (t: number) => padX + (Math.min(Math.max(t, start), end) - start) / span * (W - padX * 2);
  const Y = (b: number) => padTop + (1 - (b - lo) / rng) * (H - padTop - padBot);
  const poly = pts.map((s) => `${X(s.t).toFixed(1)},${Y(s.bpm).toFixed(1)}`).join(' ');
  const inWin = markers.filter((m) => m >= start && m <= end);
  const avgY = Y(avg);

  return (
    <View>
      <View style={{ position: 'relative', height: H }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {inWin.map((m, i) => (
            <Line key={i} x1={X(m)} y1={padTop} x2={X(m)} y2={H - padBot} stroke={palette.hairline} strokeWidth={1} />
          ))}
          <Line x1={padX} y1={avgY} x2={W - padX} y2={avgY} stroke={palette.textMute} strokeWidth={1} strokeDasharray="4 5" />
          <Polyline points={poly} fill="none" stroke={palette.red} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
        <Txt size={type.caption} weight="semibold" num color={palette.textMute} style={{ position: 'absolute', top: 0, left: 4 }}>
          {Math.round(hi)}
        </Txt>
        <Txt size={type.caption} weight="semibold" num color={palette.textMute} style={{ position: 'absolute', bottom: 0, left: 4 }}>
          {Math.round(lo)}
        </Txt>
        <Txt
          size={type.caption}
          weight="bold"
          num
          color={palette.red}
          style={{ position: 'absolute', right: 4, top: Math.min(Math.max(avgY - 8, 0), H - 16) }}>
          ⌀{avg}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, paddingHorizontal: 4 }}>
        <Txt size={type.caption} weight="medium" num color={palette.textMute}>
          0:00
        </Txt>
        <Txt size={type.caption} weight="medium" num color={palette.textMute}>
          {fmtClock(Math.round(span / 1000))}
        </Txt>
      </View>
    </View>
  );
}
