import type { FrameShape } from "@/lib/catalog";

type Props = {
  shape: string;
  color: string;
  tinted?: boolean;
  className?: string;
};

/** Front view of a frame, drawn in a 300×110 box. The two lens centres sit at x=78 and x=222, y=55. */
export function GlassesSvg({ shape, color, tinted, className }: Props) {
  const s = (FRAME_PATHS as Record<string, (side: "l" | "r") => string>)[shape] ?? FRAME_PATHS.rectangle;
  const lensFill = tinted ? "rgba(20,30,30,0.72)" : "rgba(220,240,245,0.14)";
  const sw = shape === "aviator" ? 4 : 8;
  return (
    <svg viewBox="0 0 300 110" className={className} aria-hidden="true">
      <path d={s("l")} fill={lensFill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />
      <path d={s("r")} fill={lensFill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />
      {/* bridge */}
      <path d="M128 46 Q150 32 172 46" fill="none" stroke={color} strokeWidth={sw - 1} strokeLinecap="round" />
      {shape === "aviator" && <path d="M120 22 L180 22" stroke={color} strokeWidth={3} />}
      {/* temples */}
      <path d="M8 40 L0 38" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <path d="M292 40 L300 38" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      {/* shine */}
      <path d="M45 35 Q55 25 70 27" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={3} strokeLinecap="round" />
      <path d="M189 35 Q199 25 214 27" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

const mirror = (d: (cx: number) => string) => (side: "l" | "r") => d(side === "l" ? 78 : 222);

const FRAME_PATHS: Record<FrameShape, (side: "l" | "r") => string> = {
  round: mirror((cx) => `M${cx - 48} 55 a48 46 0 1 0 96 0 a48 46 0 1 0 -96 0 Z`),
  rectangle: mirror(
    (cx) =>
      `M${cx - 62} 26 Q${cx - 62} 18 ${cx - 54} 18 L${cx + 54} 18 Q${cx + 62} 18 ${cx + 62} 26 L${cx + 60} 76 Q${cx + 58} 90 ${cx + 44} 90 L${cx - 44} 90 Q${cx - 58} 90 ${cx - 60} 76 Z`,
  ),
  square: mirror(
    (cx) =>
      `M${cx - 62} 20 Q${cx - 62} 12 ${cx - 54} 12 L${cx + 54} 12 Q${cx + 62} 12 ${cx + 62} 20 L${cx + 62} 88 Q${cx + 62} 98 ${cx + 52} 98 L${cx - 52} 98 Q${cx - 62} 98 ${cx - 62} 88 Z`,
  ),
  "cat-eye": mirror((cx) => {
    const outer = cx < 150 ? -1 : 1;
    const ox = cx + outer * 64;
    const ix = cx - outer * 52;
    return `M${ix} 30 Q${cx} 18 ${ox} 14 Q${ox - outer * 2} 40 ${cx + outer * 46} 76 Q${cx} 98 ${cx - outer * 44} 84 Q${ix - outer * 6} 60 ${ix} 30 Z`;
  }),
  aviator: mirror((cx) => {
    const outer = cx < 150 ? -1 : 1;
    return `M${cx - outer * 52} 26 L${cx + outer * 56} 24 Q${cx + outer * 62} 60 ${cx + outer * 30} 92 Q${cx} 104 ${cx - outer * 36} 82 Q${cx - outer * 56} 56 ${cx - outer * 52} 26 Z`;
  }),
  none: mirror((cx) => `M${cx - 48} 55 a48 46 0 1 0 96 0 a48 46 0 1 0 -96 0 Z`),
};
