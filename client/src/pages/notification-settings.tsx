import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Mail, MonitorSmartphone, Save, ArrowLeft, Megaphone, CalendarClock, FileWarning, Building2, ClipboardCheck, FolderKanban, FileText, Brain } from "lucide-react";
import { Link } from "wouter";

interface PreferenceGroup {
  label: string;
  icon: any;
  scenarios: {
    key: string;
    label: string;
    description: string;
    emailKey: string;
    inappKey: string;
  }[];
}

const PREFERENCE_GROUPS: PreferenceGroup[] = [
  {
    label: "Apeluri de finanțare",
    icon: Megaphone,
    scenarios: [
      {
        key: "new_call",
        label: "Apel nou importat",
        description: "Când un apel nou de finanțare este adăugat în platformă",
        emailKey: "newCallEmail",
        inappKey: "newCallInapp",
      },
      {
        key: "deadline",
        label: "Termen limită apropiat",
        description: "Când se apropie deadline-ul unui apel pentru care ai proiect activ",
        emailKey: "deadlineEmail",
        inappKey: "deadlineInapp",
      },
      {
        key: "errata",
        label: "Actualizare ghid (erată)",
        description: "Când un ghid de finanțare este actualizat după ce ai inițiat un proiect",
        emailKey: "errataEmail",
        inappKey: "errataInapp",
      },
    ],
  },
  {
    label: "Proiecte",
    icon: FolderKanban,
    scenarios: [
      {
        key: "project_status",
        label: "Stare proiect",
        description: "Când statusul proiectului se schimbă sau toate documentele sunt completate",
        emailKey: "projectStatusEmail",
        inappKey: "projectStatusInapp",
      },
      {
        key: "eligibility_check",
        label: "Verificare eligibilitate",
        description: "Când o analiză de eligibilitate este finalizată",
        emailKey: "eligibilityCheckEmail",
        inappKey: "eligibilityCheckInapp",
      },
    ],
  },
  {
    label: "Documente",
    icon: FileText,
    scenarios: [
      {
        key: "document_expiry",
        label: "Document expirat",
        description: "Când un document din dosarul proiectului expiră sau urmează să expire",
        emailKey: "documentExpiryEmail",
        inappKey: "documentExpiryInapp",
      },
    ],
  },
  {
    label: "Sistem",
    icon: Brain,
    scenarios: [
      {
        key: "new_company",
        label: "Companie nouă",
        description: "Când o companie nouă este adăugată în contul tău",
        emailKey: "newCompanyEmail",
        inappKey: "newCompanyInapp",
      },
      {
        key: "ai_score",
        label: "Scor AI actualizat",
        description: "Când profilul AI al unei companii este generat sau actualizat",
        emailKey: "aiScoreEmail",
        inappKey: "aiScoreInapp",
      },
    ],
  },
];

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean> | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: prefs, isLoading } = useQuery<any>({
    queryKey: ["/api/notification-preferences"],
  });

  const currentPrefs = localPrefs || prefs || {};

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, boolean>) => {
      const res = await apiRequest("PUT", "/api/notification-preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      setHasChanges(false);
      setLocalPrefs(null);
      toast({ title: "Preferințe salvate", description: "Setările de notificare au fost actualizate." });
    },
    onError: () => {
      toast({ title: "Eroare", description: "Nu s-au putut salva preferințele.", variant: "destructive" });
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    const updated = { ...currentPrefs, [key]: value };
    setLocalPrefs(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!localPrefs) return;
    const data: Record<string, boolean> = {};
    for (const group of PREFERENCE_GROUPS) {
      for (const s of group.scenarios) {
        if (typeof localPrefs[s.emailKey] === "boolean") data[s.emailKey] = localPrefs[s.emailKey];
        if (typeof localPrefs[s.inappKey] === "boolean") data[s.inappKey] = localPrefs[s.inappKey];
      }
    }
    if (typeof localPrefs.inAppSurveys === "boolean") data.inAppSurveys = localPrefs.inAppSurveys;
    saveMutation.mutate(data);
  };

  const enableAll = () => {
    const updated: Record<string, boolean> = { ...currentPrefs };
    for (const group of PREFERENCE_GROUPS) {
      for (const s of group.scenarios) {
        updated[s.emailKey] = true;
        updated[s.inappKey] = true;
      }
    }
    setLocalPrefs(updated);
    setHasChanges(true);
  };

  const disableAllEmail = () => {
    const updated: Record<string, boolean> = { ...currentPrefs };
    for (const group of PREFERENCE_GROUPS) {
      for (const s of group.scenarios) {
        updated[s.emailKey] = false;
      }
    }
    setLocalPrefs(updated);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/notifications" data-testid="link-back-notifications">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Bell className="w-6 h-6 text-primary" />
              Preferințe notificări
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Alege cum și când vrei să fii notificat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={enableAll} data-testid="button-enable-all">
            Activează tot
          </Button>
          <Button variant="outline" size="sm" onClick={disableAllEmail} data-testid="button-disable-email">
            Dezactivează email
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-6 px-4 py-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span>Email</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MonitorSmartphone className="w-4 h-4" />
          <span>În aplicație</span>
        </div>
      </div>

      {PREFERENCE_GROUPS.map((group) => {
        const GroupIcon = group.icon;
        return (
          <Card key={group.label} data-testid={`card-group-${group.label}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GroupIcon className="w-4 h-4 text-primary" />
                {group.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {group.scenarios.map((scenario, idx) => (
                <div
                  key={scenario.key}
                  className={`flex items-center justify-between py-3 ${idx > 0 ? "border-t" : ""}`}
                  data-testid={`row-scenario-${scenario.key}`}
                >
                  <div className="flex-1 mr-6">
                    <p className="text-sm font-medium" data-testid={`text-label-${scenario.key}`}>{scenario.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{scenario.description}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <Switch
                        checked={currentPrefs[scenario.emailKey] !== false}
                        onCheckedChange={(v) => handleToggle(scenario.emailKey, v)}
                        data-testid={`switch-${scenario.emailKey}`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <MonitorSmartphone className="w-3.5 h-3.5 text-muted-foreground" />
                      <Switch
                        checked={currentPrefs[scenario.inappKey] !== false}
                        onCheckedChange={(v) => handleToggle(scenario.inappKey, v)}
                        data-testid={`switch-${scenario.inappKey}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Card data-testid="card-group-surveys">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            Feedback și sondaje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2" data-testid="row-scenario-in-app-surveys">
            <div className="flex-1 mr-6">
              <p className="text-sm font-medium">Sondaje în aplicație</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mini-sondaje contextuale care apar ocazional pentru a colecta feedback (max. 1 pe săptămână per tip)
              </p>
            </div>
            <Switch
              checked={currentPrefs.inAppSurveys !== false}
              onCheckedChange={(v) => handleToggle("inAppSurveys", v)}
              data-testid="switch-inAppSurveys"
            />
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="shadow-lg"
            data-testid="button-save-preferences"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Se salvează..." : "Salvează preferințele"}
          </Button>
        </div>
      )}
    </div>
  );
}
