interface GrantedLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "gold" | "navy" | "white" | "black";
  className?: string;
}

const sizeMap = {
  sm: { w: 90, h: 30, fontSize: 10, borderOuter: 2, borderInner: 1.2, gap: 3, radius: 3, rotation: -2, starSize: 3 },
  md: { w: 110, h: 36, fontSize: 12, borderOuter: 2.5, borderInner: 1.5, gap: 3.5, radius: 4, rotation: -2, starSize: 3.5 },
  lg: { w: 140, h: 44, fontSize: 15, borderOuter: 3, borderInner: 1.8, gap: 4, radius: 5, rotation: -2, starSize: 4 },
  xl: { w: 180, h: 56, fontSize: 20, borderOuter: 3.5, borderInner: 2.2, gap: 5, radius: 6, rotation: -2, starSize: 5 },
};

const colorMap = {
  gold: { primary: "hsl(48,100%,50%)", secondary: "hsl(48,100%,40%)" },
  navy: { primary: "hsl(228,100%,19.6%)", secondary: "hsl(228,80%,30%)" },
  white: { primary: "#ffffff", secondary: "rgba(255,255,255,0.7)" },
  black: { primary: "#111111", secondary: "rgba(0,0,0,0.6)" },
};

// Raster brand mark (professional lockup). When a generated asset is dropped in
// here (light/dark PNGs in client/public/), GrantedLogo renders it in place of
// the inline SVG across all call sites — no per-site change needed. Kept null
// until the Higgsfield-generated logo is available.
//   e.g. { light: "/logo-granted-light.png", dark: "/logo-granted-dark.png" }
const LOGO_RASTER: { light: string; dark: string } | null = null;

// Variant → which raster to use (dark-surface variants use the light-on-dark art).
const rasterForVariant: Record<NonNullable<GrantedLogoProps["variant"]>, "light" | "dark"> = {
  gold: "dark",
  navy: "light",
  white: "dark",
  black: "light",
};

export function GrantedLogo({ size = "md", variant = "gold", className }: GrantedLogoProps) {
  const s = sizeMap[size];
  const c = colorMap[variant];

  if (LOGO_RASTER) {
    const src = LOGO_RASTER[rasterForVariant[variant]];
    return (
      <img
        src={src}
        alt="GRANTED"
        data-testid="logo-granted"
        className={className}
        style={{ height: s.h + 4, width: "auto" }}
      />
    );
  }

  const cx = s.w / 2;
  const cy = s.h / 2;

  return (
    <svg
      width={s.w + 4}
      height={s.h + 4}
      viewBox={`-2 -2 ${s.w + 4} ${s.h + 4}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-testid="logo-granted"
      className={className}
      style={{ transform: `rotate(${s.rotation}deg)` }}
    >
      <rect
        x={s.borderOuter / 2}
        y={s.borderOuter / 2}
        width={s.w - s.borderOuter}
        height={s.h - s.borderOuter}
        rx={s.radius}
        ry={s.radius}
        stroke={c.primary}
        strokeWidth={s.borderOuter}
        fill="none"
        strokeDasharray={`${s.borderOuter * 4} ${s.borderOuter * 0.5}`}
        strokeLinecap="round"
      />

      <rect
        x={s.borderOuter + s.gap}
        y={s.borderOuter + s.gap}
        width={s.w - (s.borderOuter + s.gap) * 2}
        height={s.h - (s.borderOuter + s.gap) * 2}
        rx={s.radius - 1}
        ry={s.radius - 1}
        stroke={c.primary}
        strokeWidth={s.borderInner}
        fill="none"
      />

      <circle cx={s.borderOuter + s.gap + s.starSize + 2} cy={cy} r={s.starSize * 0.5} fill={c.primary} />
      <circle cx={s.w - s.borderOuter - s.gap - s.starSize - 2} cy={cy} r={s.starSize * 0.5} fill={c.primary} />

      <text
        x={cx}
        y={cy}
        dominantBaseline="central"
        textAnchor="middle"
        fill={c.primary}
        fontFamily="'Figtree', system-ui, sans-serif"
        fontWeight="800"
        fontSize={s.fontSize}
        letterSpacing="0.18em"
      >
        GRANTED
      </text>
    </svg>
  );
}
