import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  UserCheck, Download, Building2, FolderOpen, FileText, Shield,
  Brain, Mail, Share2, Info, AlertTriangle, ClipboardList,
} from "lucide-react";

interface MyDataResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string | null;
    emailVerified: boolean | null;
    privacyAcceptedAt: string | null;
    consentAiProcessing: boolean | null;
    consentEmailMarketing: boolean | null;
    consentThirdPartySharing: boolean | null;
    createdAt: string | null;
  };
  companies: Array<{ id: string; cui: string; name: string; caen: string; address: string; createdAt: string }>;
  projects: Array<{ id: string; name: string; status: string; createdAt: string }>;
  documents: Array<{ id: string; name: string; file_type: string; created_at: string }>;
  eligibilityReportsCount: number;
  auditLogEntriesCount: number;
}

interface ConsentsData {
  consentAiProcessing: boolean | null;
  consentEmailMarketing: boolean | null;
  consentThirdPartySharing: boolean | null;
}

export default function MyDataPage() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery<MyDataResponse>({
    queryKey: ["/api/auth/my-data"],
  });

  const { data: consents, isLoading: consentsLoading } = useQuery<ConsentsData>({
    queryKey: ["/api/auth/consents"],
  });

  const updateConsentMutation = useMutation({
    mutationFn: async (updates: Partial<ConsentsData>) => {
      const res = await apiRequest("PUT", "/api/auth/consents", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/consents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/my-data"] });
      toast({ title: "Actualizat", description: "Consimțământul a fost actualizat cu succes." });
    },
    onError: () => {
      toast({ title: "Eroare", description: "Nu s-a putut actualiza consimțământul.", variant: "destructive" });
    },
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/auth/gdpr-export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-export-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Export finalizat", description: "Fișierul PDF a fost descărcat." });
    } catch {
      toast({ title: "Eroare", description: "Exportul datelor a eșuat.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ro-RO", { year: "numeric", month: "long", day: "numeric" }) : "—";

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const user = data?.user;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-my-data-title">
          <UserCheck className="w-6 h-6" />
          Datele mele
        </h1>
        <p className="text-muted-foreground text-sm">
          Vizualizează, gestionează și exportă datele tale personale conform GDPR (Regulamentul UE 2016/679).
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          Date personale stocate
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Nume complet:</span>
            <span className="ml-2 font-medium" data-testid="text-my-name">{user?.firstName} {user?.lastName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span>
            <span className="ml-2 font-medium" data-testid="text-my-email">{user?.email}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Rol:</span>
            <Badge variant="secondary" className="ml-2" data-testid="text-my-role">{user?.role}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Email verificat:</span>
            <Badge variant={user?.emailVerified ? "default" : "destructive"} className="ml-2">
              {user?.emailVerified ? "Da" : "Nu"}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Cont creat:</span>
            <span className="ml-2" data-testid="text-my-created">{fmtDate(user?.createdAt)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">GDPR acceptat:</span>
            <span className="ml-2">{fmtDate(user?.privacyAcceptedAt)}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-500" />
          Date stocate — sumar
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Building2 className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold" data-testid="text-count-companies">{data?.companies?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Companii</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <FolderOpen className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold" data-testid="text-count-projects">{data?.projects?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Proiecte</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <FileText className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold" data-testid="text-count-documents">{data?.documents?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Documente</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Shield className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold" data-testid="text-count-reports">{data?.eligibilityReportsCount || 0}</div>
            <div className="text-xs text-muted-foreground">Rapoarte eligibilitate</div>
          </div>
        </div>

        {data?.companies && data.companies.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Companii înregistrate</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>CUI</TableHead>
                  <TableHead>CAEN</TableHead>
                  <TableHead>Data înregistrării</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.cui}</TableCell>
                    <TableCell>{c.caen || "—"}</TableCell>
                    <TableCell>{fmtDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {data?.documents && data.documents.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Documente încărcate</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Data încărcării</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.file_type || "—"}</TableCell>
                    <TableCell>{fmtDate(d.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          Consimțăminte GDPR
        </h2>
        <p className="text-sm text-muted-foreground">
          Controlează modul în care datele tale sunt procesate. Poți modifica aceste setări oricând.
        </p>

        {consentsLoading ? <Skeleton className="h-20" /> : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                <div>
                  <Label className="text-sm font-semibold">Procesare date cu Inteligență Artificială</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Permite platformei să trimită datele tale (companii, documente) către modele AI (OpenAI GPT-4) pentru analiză de eligibilitate, conformitate, potrivire și chat. Datele sunt procesate conform politicii noastre de confidențialitate.
                  </p>
                </div>
              </div>
              <Switch
                checked={consents?.consentAiProcessing ?? false}
                onCheckedChange={(checked) => updateConsentMutation.mutate({ consentAiProcessing: checked })}
                disabled={updateConsentMutation.isPending}
                data-testid="switch-consent-ai"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <Label className="text-sm font-semibold">Comunicări prin email</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Permite trimiterea de emailuri informative despre noi apeluri de finanțare, actualizări ale platformei și sfaturi utile. Notificările de sistem (securitate, cont) rămân active indiferent de această setare.
                  </p>
                </div>
              </div>
              <Switch
                checked={consents?.consentEmailMarketing ?? false}
                onCheckedChange={(checked) => updateConsentMutation.mutate({ consentEmailMarketing: checked })}
                disabled={updateConsentMutation.isPending}
                data-testid="switch-consent-email"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-start gap-3">
                <Share2 className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <Label className="text-sm font-semibold">Partajare date cu terțe părți</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Permite partajarea datelor agregate (anonimizate) cu parteneri pentru îmbunătățirea serviciilor. Datele personale nu sunt niciodată vândute.
                  </p>
                </div>
              </div>
              <Switch
                checked={consents?.consentThirdPartySharing ?? false}
                onCheckedChange={(checked) => updateConsentMutation.mutate({ consentThirdPartySharing: checked })}
                disabled={updateConsentMutation.isPending}
                data-testid="switch-consent-third-party"
              />
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-500" />
          Export date personale (GDPR Art. 20)
        </h2>
        <p className="text-sm text-muted-foreground">
          Descarcă un raport complet cu toate datele tale personale stocate pe platformă, în format PDF. Acest drept este garantat de Regulamentul General privind Protecția Datelor (GDPR).
        </p>
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          data-testid="button-gdpr-export"
        >
          <Download className="w-4 h-4 mr-2" />
          {exporting ? "Se generează..." : "Descarcă raportul GDPR"}
        </Button>
      </Card>

      <Card className="p-6 space-y-3 border-amber-200 bg-amber-50/50">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-amber-800">
          <AlertTriangle className="w-4 h-4" />
          Politică de retenție date
        </h2>
        <div className="text-sm text-amber-900/80 space-y-2">
          <p>
            <strong>Documente încărcate:</strong> Păstrate pe toată durata existenței contului. La ștergerea contului, toate documentele sunt eliminate definitiv din sistemele noastre în termen de 30 de zile.
          </p>
          <p>
            <strong>Date companii:</strong> Informațiile companiilor (CUI, date financiare) sunt șterse la eliminarea companiei sau a contului.
          </p>
          <p>
            <strong>Rapoarte AI:</strong> Rapoartele de eligibilitate și conformitate sunt șterse odată cu ștergerea contului.
          </p>
          <p>
            <strong>Jurnale de audit:</strong> Înregistrările de activitate sunt anonimizate la ștergerea contului, conform cerințelor legale de trasabilitate.
          </p>
          <p className="text-xs mt-3">
            Pentru exercitarea dreptului la ștergere (GDPR Art. 17), accesează <strong>Setări → Ștergere cont</strong> sau contactează-ne la adresa de email din politica de confidențialitate.
          </p>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground text-center pb-4">
        Ai {data?.auditLogEntriesCount || 0} înregistrări în jurnalul de activitate. 
        ID cont: {user?.id?.substring(0, 8)}...
      </div>
    </div>
  );
}
