import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Palette, Sun, Moon } from "lucide-react";
import { GrantedLogo } from "@/components/granted-logo";

interface ThemeOption {
  value: "light" | "dark";
  name: string;
  description: string;
  icon: typeof Sun;
  logoVariant: "gold" | "black" | "white";
  // Inline swatch colors so the preview doesn't depend on the active theme.
  surface: string;
  panel: string;
  accent: string;
  text: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    name: "Auriu",
    description: "Fundal luminos cu accente aurii — clar, profesional, elegant.",
    icon: Sun,
    logoVariant: "gold",
    surface: "#f2f4f8",
    panel: "#ffffff",
    accent: "hsl(48,100%,50%)",
    text: "#00105a",
  },
  {
    value: "dark",
    name: "Elegant",
    description: "Fundal întunecat cu contrast alb — sobru, modern, discret.",
    icon: Moon,
    logoVariant: "white",
    surface: "#070b1a",
    panel: "#0f1626",
    accent: "hsl(48,100%,50%)",
    text: "#ffffff",
  },
];

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  // Avoid hydration/first-paint mismatch — next-themes resolves on mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted ? (theme === "dark" ? "dark" : "light") : "light";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" data-testid="link-back-dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <Palette className="w-6 h-6 text-primary" />
            Aspect
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alege tema panoului de control.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {THEME_OPTIONS.map((opt) => {
          const isActive = active === opt.value;
          const Icon = opt.icon;
          return (
            <Card
              key={opt.value}
              role="button"
              tabIndex={0}
              onClick={() => setTheme(opt.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTheme(opt.value); } }}
              className={`relative cursor-pointer overflow-hidden p-0 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "ring-2 ring-primary" : ""}`}
              data-testid={`card-theme-${opt.value}`}
            >
              {isActive && (
                <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </span>
              )}
              {/* Preview surface — uses inline colors, independent of active theme */}
              <div className="flex h-32 items-center justify-center" style={{ backgroundColor: opt.surface }}>
                <div
                  className="flex items-center gap-3 rounded-lg px-4 py-3 shadow-sm"
                  style={{ backgroundColor: opt.panel }}
                >
                  <GrantedLogo size="sm" variant={opt.logoVariant} />
                  <span className="h-6 w-px" style={{ backgroundColor: opt.accent }} />
                  <span className="text-sm font-semibold" style={{ color: opt.text }}>Aa</span>
                </div>
              </div>
              <div className="space-y-1 p-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{opt.name}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{opt.description}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
