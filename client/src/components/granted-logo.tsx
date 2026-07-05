interface GrantedLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "gold" | "navy" | "white";
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
};

export function GrantedLogo({ size = "md", variant = "gold", className }: GrantedLogoProps) {
  const s = sizeMap[size];
  const c = colorMap[variant];

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
        fontFamily="'Inter', 'Arial Black', system-ui, sans-serif"
        fontWeight="900"
        fontSize={s.fontSize}
        letterSpacing="0.18em"
      >
        GRANTED
      </text>
    </svg>
  );
}
