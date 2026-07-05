import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { DASHBOARD_SECTIONS, useDashboardPrefs } from "@/lib/dashboard-prefs";

export default function DashboardVisibilitySettingsPage() {
  const [prefs, setPrefs] = useDashboardPrefs();

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
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Detalii panou
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alege ce secțiuni informative apar pe panoul de control.
          </p>
        </div>
      </div>

      <Card className="divide-y">
        {DASHBOARD_SECTIONS.map((section) => (
          <div key={section.key} className="flex items-center justify-between gap-6 p-4" data-testid={`row-section-${section.key}`}>
            <div className="flex-1">
              <p className="font-medium">{section.label}</p>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
            <Switch
              checked={prefs[section.key]}
              onCheckedChange={(checked) => setPrefs({ ...prefs, [section.key]: checked })}
              data-testid={`switch-section-${section.key}`}
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
