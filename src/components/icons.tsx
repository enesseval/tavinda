import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

export function LockIcon({ color, size = 12 }: IconProps) {
  return (
    <Svg width={size * (12 / 14)} height={size} viewBox="0 0 12 14">
      <Rect x={1} y={6} width={10} height={8} rx={2} fill={color} />
      <Path d="M3.5 6V4.2a2.5 2.5 0 0 1 5 0V6" fill="none" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function CheckIcon({ color, size = 18, strokeWidth = 2.2 }: IconProps & { strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CarriedIcon({ color, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path
        d="M2 2v4a2 2 0 0 0 2 2h6M7.5 5.5L10 8l-2.5 2.5"
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FlagIcon({ color, size = 12, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size * (10 / 12)} height={size} viewBox="0 0 10 12">
      <Path
        d="M1.5 11.5V1.5M1.5 1.5h6.5l-1.6 2.5 1.6 2.5H1.5"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronLeft({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size * (10 / 16)} height={size} viewBox="0 0 10 16">
      <Path d="M8 2L2 8l6 6" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRight({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size * (10 / 16)} height={size} viewBox="0 0 10 16">
      <Path d="M2 2l6 6-6 6" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ArrowRight({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12h12M13 7l5 5-5 5" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function RepeatIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Thermometer whose fill rises with the heat level; the shape carries heat, not just the color. */
export function HeatGlyph({ color, level, size = 13 }: IconProps & { level: number }) {
  const fillTop = 8.2 - Math.min(4, Math.max(0, level)) * 1.4;
  return (
    <Svg width={size * (10 / 14)} height={size} viewBox="0 0 10 14">
      <Path d="M3.5 8.2V2.5a1.5 1.5 0 0 1 3 0v5.7a3 3 0 1 1-3 0z" fill="none" stroke={color} strokeWidth={1.3} />
      <Rect x={4.4} y={fillTop} width={1.2} height={Math.max(0, 9 - fillTop)} rx={0.6} fill={color} />
      <Circle cx={5} cy={10.5} r={1.5} fill={color} />
    </Svg>
  );
}

export function TodayTabIcon({ color, bg, active }: IconProps & { bg: string; active: boolean }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {active ? (
        <>
          <Circle cx={12} cy={12} r={8.5} fill={color} />
          <Circle cx={12} cy={12} r={3} fill={bg} />
        </>
      ) : (
        <>
          <Circle cx={12} cy={12} r={8.5} fill="none" stroke={color} strokeWidth={1.6} />
          <Circle cx={12} cy={12} r={3} fill={color} />
        </>
      )}
    </Svg>
  );
}

export function CalendarTabIcon({ color, bg, active }: IconProps & { bg: string; active: boolean }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {active ? (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3.5} fill={color} />
          <Path d="M3.5 10h17" stroke={bg} strokeWidth={1.6} />
        </>
      ) : (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3.5} fill="none" stroke={color} strokeWidth={1.6} />
          <Path d="M3.5 10h17" stroke={color} strokeWidth={1.6} />
        </>
      )}
      <Path d="M8 3v4M16 3v4" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function ProfileTabIcon({ color, active }: IconProps & { active: boolean }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Circle cx={12} cy={8.5} r={4} fill={active ? color : 'none'} stroke={color} strokeWidth={1.6} />
      <Path
        d={active ? 'M4.5 20.5c1.4-3.6 4.2-5.2 7.5-5.2s6.1 1.6 7.5 5.2z' : 'M4.5 20.5c1.4-3.6 4.2-5.2 7.5-5.2s6.1 1.6 7.5 5.2'}
        fill={active ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CalendarSetupIcon({ color, dashed = true, size = 56 }: IconProps & { dashed?: boolean }) {
  return (
    <Svg width={size} height={size * (112 / 120)} viewBox="0 0 120 112">
      <Rect x={6} y={14} width={108} height={92} rx={16} fill="none" stroke={color} strokeWidth={3} />
      <Path d="M6 38h108M34 6v16M86 6v16" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
      {dashed && (
        <Rect x={49} y={52} width={22} height={30} rx={4} fill="none" stroke={color} strokeWidth={3} strokeDasharray="6 6" />
      )}
    </Svg>
  );
}

export function CalendarPrimingArt({ color }: IconProps) {
  return (
    <Svg width={120} height={112} viewBox="0 0 120 112">
      <Rect x={6} y={14} width={108} height={92} rx={16} fill="none" stroke={color} strokeWidth={1.5} />
      <Path d="M6 38h108M34 6v16M86 6v16" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Rect x={20} y={50} width={22} height={14} rx={3} fill="none" stroke={color} strokeWidth={1.5} />
      <Rect x={49} y={50} width={22} height={30} rx={3} fill={color} opacity={0.18} />
      <Rect x={49} y={50} width={22} height={30} rx={3} fill="none" stroke={color} strokeWidth={1.5} />
      <Rect x={78} y={68} width={22} height={14} rx={3} fill="none" stroke={color} strokeWidth={1.5} />
      <Rect x={20} y={72} width={22} height={22} rx={3} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3 3" />
    </Svg>
  );
}

export function NoCalendarIcon({ color }: IconProps) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Rect x={3.5} y={5} width={17} height={15.5} rx={3.5} fill="none" stroke={color} strokeWidth={1.6} />
      <Path d="M3.5 10h17M4 4l16 17" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function DoneBadge({ color, fg, size = 64 }: IconProps & { fg: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={30.5} fill="none" stroke={color} strokeWidth={1.5} />
      <Path d="M20 33l8 8 16-17" fill="none" stroke={fg} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
