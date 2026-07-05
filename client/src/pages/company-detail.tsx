import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Company } from "@shared/schema";
import { getCompanyLegalState, TERMINAL_WARNING_MESSAGE } from "@shared/company-legal-state";
import { getActionCost, CREDIT_ACTION, type CreditCostRow } from "@/lib/credit-costs";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, X, Building2, Loader2, Sparkles, CheckCircle2, XCircle, AlertTriangle, Brain, Clock, Shield, FileText, ChevronDown, ChevronUp, ExternalLink, ThumbsUp, ShieldAlert, Download, TrendingUp, TrendingDown, MapPin, Scale, Gavel, Landmark, Users, BarChart3, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { exportEligibilityPDF } from "@/lib/export-pdf";
import { formatNumber } from "@/lib/utils";

interface FinanciarAn {
  an: string;
  cifraAfaceri: number | null;
  venituriTotale: number | null;
  cheltuieliTotale: number | null;
  profitNet: number | null;
  pierdereNeta: number | null;
  capitaluriProprii: number | null;
  capitalSocial: number | null;
  activeTotale: number | null;
  activeImobilizate: number | null;
  datoriiTotale: number | null;
  numarMediuAngajati: number | null;
  marjaProfitNet?: number | null;
  marjaProfitBrut?: number | null;
  marimeFirma?: string | null;
}

interface RiscAltman {
  an: number;
  label: string;
  punctaj: number;
  tendinta?: string | null;
}

interface IstoricMarime {
  an: number;
  marime: string;
}

interface Financiare {
  ani: FinanciarAn[];
  tendintaCifraAfaceri?: string | null;
  evaluareTermene?: number | null;
  evaluareDetaliata?: Record<string, any> | null;
  capacitateDePlata?: number | null;
  marimeFirma?: string | null;
  marimeFirmaAn?: number | null;
  istoricMarime?: IstoricMarime[];
  riscAltman?: RiscAltman | null;
  riscAltmanHistoric?: RiscAltman[];
}

interface ActionarPJ {
  nume: string;
  cui: string;
  procent: number;
}

interface ActionarPF {
  nume: string;
  procent: number;
}

interface Administrator {
  nume: string;
}

interface Participatie {
  nume: string;
  cui: string;
  procent: number;
}

interface BeneficiarReal {
  nume: string;
}

interface Actionariat {
  actionariPJ: ActionarPJ[];
  actionariPF: ActionarPF[];
  administratori: Administrator[];
  participatii: Participatie[];
  beneficiariReali: BeneficiarReal[];
}

interface DatoriiAnafSumar {
  areDatorii: boolean;
  totalDatorii: number;
  bugetStat: number;
  bugetSanatate: number;
  bugetSomaj: number;
  bugetSociale: number;
  dataDatorie?: string | null;
}

interface StatutTva {
  platitorTva: boolean;
  label: string | null;
  dataInceputTva?: string | null;
  dataAnulareTva?: string | null;
}

interface StatutFiscal {
  label: string | null;
  dataModificare?: string | null;
  istoric?: { label: string; dataModificare: string }[];
}

interface PunctDeLucru {
  adresa: string | null;
  judet: string | null;
  localitate: string | null;
}

interface GrupFirma {
  numeFirma: string | null;
  procentaj: number | null;
  asociatiProcentaj: { nume: string | null; procentaj: number | null }[];
}

interface SicapExperienta {
  nrContracteDirecte: number;
  nrContractePublice: number;
}

interface Evenimente {
  bpiStare: any;
  datoriiAnaf: any;
  datoriiAnafSumar?: DatoriiAnafSumar | null;
  dosare: any;
  statutTva?: StatutTva | null;
  statutFiscal?: StatutFiscal | null;
  stareAnafTva: string;
  puncteDeLucru?: PunctDeLucru[];
  judeteOperare?: string[];
  riscFiscal?: any;
  riscJuridic?: any;
  riscInsolventa?: any;
  grupFirma?: GrupFirma | null;
  sicapExperienta?: SicapExperienta | null;
  instanteDosare?: { numar: string; obiect: string }[];
  sediiSecundare?: { adresa: string }[];
  anafObligatiiRestante?: string;
}

function emptyFinanciarAn(an: string): FinanciarAn {
  return {
    an,
    cifraAfaceri: null, venituriTotale: null, cheltuieliTotale: null,
    profitNet: null, pierdereNeta: null, capitaluriProprii: null,
    capitalSocial: null, activeTotale: null, activeImobilizate: null,
    datoriiTotale: null, numarMediuAngajati: null,
  };
}

function emptyFinanciare(): Financiare {
  const currentYear = new Date().getFullYear();
  return {
    ani: [
      emptyFinanciarAn(String(currentYear - 1)),
      emptyFinanciarAn(String(currentYear - 2)),
      emptyFinanciarAn(String(currentYear - 3)),
    ],
  };
}

function parseFinanciare(raw: unknown): Financiare {
  if (!raw || typeof raw !== "object") return emptyFinanciare();
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.ani)) {
    return {
      ani: obj.ani as FinanciarAn[],
      tendintaCifraAfaceri: (obj.tendintaCifraAfaceri as string) || null,
      evaluareTermene: toNum(obj.evaluareTermene),
      evaluareDetaliata: (obj.evaluareDetaliata as Record<string, any>) || null,
      capacitateDePlata: toNum(obj.capacitateDePlata),
      marimeFirma: (obj.marimeFirma as string) || null,
      marimeFirmaAn: toNum(obj.marimeFirmaAn),
      istoricMarime: Array.isArray(obj.istoricMarime) ? obj.istoricMarime as IstoricMarime[] : [],
      riscAltman: (obj.riscAltman as RiscAltman) || null,
      riscAltmanHistoric: Array.isArray(obj.riscAltmanHistoric) ? obj.riscAltmanHistoric as RiscAltman[] : [],
    };
  }
  if (obj.bilanturi && typeof obj.bilanturi === "object") {
    const bilanturi = obj.bilanturi as Record<string, Record<string, unknown>>;
    const ani: FinanciarAn[] = Object.keys(bilanturi)
      .sort()
      .reverse()
      .slice(0, 7)
      .map((key) => {
        const b = bilanturi[key];
        const year = key.replace("an_", "");
        const aImob = toNum(b.active_imobilizate);
        const aCirc = toNum(b.active_circulante);
        return {
          an: year,
          cifraAfaceri: toNum(b.cifra_afaceri),
          venituriTotale: toNum(b.venituri_total),
          cheltuieliTotale: null,
          profitNet: toNum(b.profit_net),
          pierdereNeta: null,
          capitaluriProprii: toNum(b.capital_total),
          capitalSocial: null,
          activeTotale: aImob == null && aCirc == null ? null : (aImob ?? 0) + (aCirc ?? 0),
          activeImobilizate: aImob,
          datoriiTotale: toNum(b.datorii),
          numarMediuAngajati: toNum(b.numar_angajati),
        };
      });
    return {
      ani: ani.length > 0 ? ani : emptyFinanciare().ani,
      tendintaCifraAfaceri: (obj.tendintaCifraAfaceri as string) || null,
      evaluareTermene: toNum(obj.evaluareTermene),
      evaluareDetaliata: (obj.evaluareDetaliata as Record<string, any>) || null,
      capacitateDePlata: toNum(obj.capacitateDePlata),
      marimeFirma: (obj.marimeFirma as string) || null,
      marimeFirmaAn: toNum(obj.marimeFirmaAn),
      istoricMarime: Array.isArray(obj.istoricMarime) ? obj.istoricMarime as IstoricMarime[] : [],
      riscAltman: (obj.riscAltman as RiscAltman) || null,
      riscAltmanHistoric: Array.isArray(obj.riscAltmanHistoric) ? obj.riscAltmanHistoric as RiscAltman[] : [],
    };
  }
  return emptyFinanciare();
}

function parseActionariat(raw: unknown): Actionariat {
  if (!raw || typeof raw !== "object") return emptyActionariat();
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.actionariPJ) || Array.isArray(obj.actionariPF)) {
    return {
      actionariPJ: Array.isArray(obj.actionariPJ) ? obj.actionariPJ : [],
      actionariPF: Array.isArray(obj.actionariPF) ? obj.actionariPF : [],
      administratori: Array.isArray(obj.administratori) ? obj.administratori : [],
      participatii: Array.isArray(obj.participatii) ? obj.participatii : [],
      beneficiariReali: Array.isArray(obj.beneficiariReali) ? obj.beneficiariReali : [],
    } as unknown as Actionariat;
  }
  const result = emptyActionariat();
  if (obj.administratori && typeof obj.administratori === "object") {
    const admins = obj.administratori as Record<string, unknown>;
    const pf = Array.isArray(admins.persoane_fizice) ? admins.persoane_fizice : [];
    result.administratori = pf.map((a: Record<string, unknown>) => ({ nume: (a.nume as string) || "" }));
    const pj = Array.isArray(admins.persoane_juridice) ? admins.persoane_juridice : [];
    result.actionariPJ = pj.map((a: Record<string, unknown>) => ({
      nume: (a.nume as string) || "",
      cui: String(a.cui || ""),
      procent: (a.procent as number) || 0,
    }));
  }
  if (obj.asociati && typeof obj.asociati === "object") {
    const asoc = obj.asociati as Record<string, unknown>;
    const pf = Array.isArray(asoc.persoane_fizice) ? asoc.persoane_fizice : [];
    result.actionariPF = pf.map((a: Record<string, unknown>) => ({
      nume: (a.nume as string) || "",
      procent: (a.procent as number) || 0,
    }));
  }
  return result;
}

function parseEvenimente(raw: unknown): Evenimente {
  if (!raw || typeof raw !== "object") return emptyEvenimente();
  const obj = raw as Record<string, unknown>;
  return {
    bpiStare: obj.bpiStare ?? null,
    datoriiAnaf: obj.datoriiAnaf ?? null,
    datoriiAnafSumar: (obj.datoriiAnafSumar as DatoriiAnafSumar) || null,
    dosare: obj.dosare ?? null,
    statutTva: (obj.statutTva as StatutTva) || null,
    statutFiscal: (obj.statutFiscal as StatutFiscal) || null,
    stareAnafTva: (obj.stareAnafTva as string) || "",
    puncteDeLucru: Array.isArray(obj.puncteDeLucru) ? obj.puncteDeLucru as PunctDeLucru[] : [],
    judeteOperare: Array.isArray(obj.judeteOperare) ? obj.judeteOperare as string[] : [],
    riscFiscal: obj.riscFiscal ?? null,
    riscJuridic: obj.riscJuridic ?? null,
    riscInsolventa: obj.riscInsolventa ?? null,
    grupFirma: (obj.grupFirma as GrupFirma) || null,
    sicapExperienta: (obj.sicapExperienta as SicapExperienta) || null,
    instanteDosare: Array.isArray(obj.instanteDosare) ? obj.instanteDosare as { numar: string; obiect: string }[] : [],
    sediiSecundare: Array.isArray(obj.sediiSecundare) ? obj.sediiSecundare as { adresa: string }[] : [],
    anafObligatiiRestante: (obj.anafObligatiiRestante as string) || "",
  };
}

function emptyActionariat(): Actionariat {
  return { actionariPJ: [], actionariPF: [], administratori: [], participatii: [], beneficiariReali: [] };
}

function emptyEvenimente(): Evenimente {
  return { bpiStare: null, datoriiAnaf: null, dosare: null, stareAnafTva: "", instanteDosare: [], sediiSecundare: [] };
}

function toNum(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function formatCurrency(val: number): string {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M RON`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K RON`;
  return `${val.toLocaleString("ro-RO")} RON`;
}

function riscColor(level: string | undefined | null): string {
  if (!level) return "text-muted-foreground";
  const l = String(level).toLowerCase();
  if (l.includes("scazut") || l.includes("redus") || l.includes("minim") || l === "low") return "text-green-600 dark:text-green-400";
  if (l.includes("mediu") || l === "medium" || l === "moderate") return "text-yellow-600 dark:text-yellow-400";
  if (l.includes("ridicat") || l.includes("crescut") || l.includes("mare") || l === "high") return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function riscBadgeVariant(level: string | undefined | null): "default" | "destructive" | "secondary" | "outline" {
  if (!level) return "outline";
  const l = String(level).toLowerCase();
  if (l.includes("scazut") || l.includes("redus") || l.includes("minim")) return "default";
  if (l.includes("ridicat") || l.includes("crescut") || l.includes("mare")) return "destructive";
  return "secondary";
}

export default function CompanyDetailPage() {
  const [, params] = useRoute("/companies/:id");
  const id = params?.id;
  const { toast } = useToast();

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/companies", id],
    enabled: !!id,
  });

  const { data: creditCosts } = useQuery<CreditCostRow[]>({ queryKey: ["/api/credits/costs"] });
  const aiProfileCost = getActionCost(creditCosts, CREDIT_ACTION.aiProfile, 3);
  const companyDataCost = getActionCost(creditCosts, CREDIT_ACTION.companyData, 3);
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);

  const [formData, setFormData] = useState<Partial<Company>>({});
  const [financiare, setFinanciare] = useState<Financiare>(emptyFinanciare());
  const [actionariat, setActionariat] = useState<Actionariat>(emptyActionariat());
  const [evenimente, setEvenimente] = useState<Evenimente>(emptyEvenimente());

  useEffect(() => {
    if (company) {
      setFormData({ ...company });
      setFinanciare(parseFinanciare(company.financiare));
      setActionariat(parseActionariat(company.actionariat));
      setEvenimente(parseEvenimente(company.evenimente));
    }
  }, [company]);

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PUT", `/api/companies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Salvat", description: "Datele companiei au fost actualizate." });
    },
    onError: (err: Error) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const refreshProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/companies/${id}/refresh-profile`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData(["/api/companies", id], data);
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      toast({ title: "Profil AI actualizat", description: "Profilul companiei a fost regenerat cu succes." });
    },
    onError: (err: any) => {
      const title = err.status === 402 ? "Credite insuficiente" : err.status === 429 ? "Limita AI atinsă" : "Eroare";
      toast({ title, description: err.message, variant: "destructive" });
    },
  });

  const refreshTermeneMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/companies/${id}/refresh-termene`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      toast({ title: "Date actualizate", description: "Datele companiei au fost reîncărcate din termene.ro." });
    },
    onError: (err: any) => {
      const title = err.status === 402 ? "Credite insuficiente" : "Eroare";
      toast({ title, description: err.message, variant: "destructive" });
    },
  });

  function handleSave(extraData?: Record<string, unknown>) {
    const payload: Record<string, unknown> = {
      ...formData,
      financiare,
      actionariat,
      evenimente,
      caenSecundare: typeof formData.caenSecundare === "string"
        ? (formData.caenSecundare as unknown as string).split(",").map((s: string) => s.trim()).filter(Boolean)
        : formData.caenSecundare,
      ...extraData,
    };
    delete payload.id;
    delete payload.createdAt;
    delete payload.apiData;
    mutation.mutate(payload);
  }

  function updateField(field: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" data-testid="company-detail-loading">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6" data-testid="company-detail-not-found">
        <p className="text-muted-foreground">Compania nu a fost găsită.</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-4" data-testid="link-back-dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Înapoi la Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const caenSecundareStr = Array.isArray(formData.caenSecundare)
    ? (formData.caenSecundare as string[]).join(", ")
    : String(formData.caenSecundare || "");

  return (
    <div className="p-6 space-y-6" data-testid="company-detail-page">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <Building2 className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold" data-testid="text-company-name">{company.name}</h1>
          <span className="text-muted-foreground" data-testid="text-company-cui">CUI: {company.cui}</span>
          <Badge variant={company.status === "active" ? "default" : "secondary"} data-testid="badge-company-status">
            {company.status === "active" ? "Activ" : company.status === "pending" ? "Se verifică" : company.status === "failed" ? "Eșuată" : (company.status || "Necunoscut")}
          </Badge>
          {getCompanyLegalState(company.stareFirma).isTerminal && (
            <Badge
              variant="secondary"
              className="bg-destructive/10 text-destructive border-destructive/20 gap-1"
              data-testid="badge-legal-terminal"
            >
              <AlertTriangle className="h-3 w-3" />
              {getCompanyLegalState(company.stareFirma).label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={refreshTermeneMutation.isPending}
                data-testid="button-refresh-termene"
              >
                {refreshTermeneMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Building2 className="w-4 h-4 mr-2" />
                )}
                {refreshTermeneMutation.isPending ? "Se actualizează..." : "Actualizează date"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="dialog-confirm-termene">
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmare actualizare date</AlertDialogTitle>
                <AlertDialogDescription>
                  Această acțiune va interoga serviciul termene.ro pentru a prelua datele actualizate ale companiei.
                  Interogarea este taxabilă și va consuma {companyDataCost} {companyDataCost === 1 ? "credit" : "credite"}.
                  Doriți să continuați?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-termene">Anulează</AlertDialogCancel>
                <AlertDialogAction onClick={() => refreshTermeneMutation.mutate()} data-testid="button-confirm-termene">
                  Da, actualizează
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProfileConfirm(true)}
            disabled={refreshProfileMutation.isPending}
            data-testid="button-refresh-ai-profile"
            className="border-[hsl(48,100%,50%)]/40 hover:bg-[hsl(48,100%,50%)]/10 hover:border-[hsl(48,100%,50%)]"
          >
            <Sparkles className="w-4 h-4 mr-2 text-[hsl(48,100%,45%)]" />
            {refreshProfileMutation.isPending ? "Se generează..." : `Actualizează profil AI (${aiProfileCost} cr)`}
          </Button>
        </div>
      </div>

      <CreditConfirmDialog
        open={showProfileConfirm}
        onOpenChange={setShowProfileConfirm}
        onConfirm={() => { setShowProfileConfirm(false); refreshProfileMutation.mutate(); }}
        actionLabel="Regenerarea profilului AI al companiei"
        creditCost={aiProfileCost}
        isPending={refreshProfileMutation.isPending}
      />

      {getCompanyLegalState(company.stareFirma).isTerminal && (
        <div className="flex items-start gap-3 py-3 px-4 mb-4 bg-destructive/5 rounded-lg border border-destructive/20" data-testid="warning-legal-terminal">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">{getCompanyLegalState(company.stareFirma).label}</p>
            <p className="text-sm text-destructive/90">{TERMINAL_WARNING_MESSAGE}</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="identificare" data-testid="tabs-company">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 sm:inline-flex sm:flex-nowrap sm:h-10 sm:gap-0 w-full" data-testid="tabs-list">
          <TabsTrigger value="identificare" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-identificare">Identificare</TabsTrigger>
          <TabsTrigger value="financiar" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-financiar">Financiar</TabsTrigger>
          <TabsTrigger value="actionariat" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-actionariat">Actionariat</TabsTrigger>
          <TabsTrigger value="evenimente" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-evenimente">Evenimente</TabsTrigger>
          <TabsTrigger value="profil-ai" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-profil-ai">
            <Brain className="w-3.5 h-3.5 mr-1" />
            Profil AI
          </TabsTrigger>
          <TabsTrigger value="rapoarte" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-rapoarte">
            <Shield className="w-3.5 h-3.5 mr-1" />
            Rapoarte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identificare" data-testid="tab-content-identificare">
          <Card>
            <CardHeader>
              <CardTitle>Date de identificare</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CUI</Label>
                  <Input value={formData.cui || ""} readOnly className="bg-muted" data-testid="input-cui" />
                </div>
                <div className="space-y-2">
                  <Label>Denumire firmă</Label>
                  <Input value={formData.name || ""} onChange={(e) => updateField("name", e.target.value)} data-testid="input-name" />
                </div>
                <div className="space-y-2">
                  <Label>Nr. Registru Comerțului</Label>
                  <Input value={formData.nrRegCom || ""} onChange={(e) => updateField("nrRegCom", e.target.value)} data-testid="input-nrRegCom" />
                </div>
                <div className="space-y-2">
                  <Label>Data înființare</Label>
                  <Input value={formData.dataInfiintare || ""} onChange={(e) => updateField("dataInfiintare", e.target.value)} data-testid="input-dataInfiintare" />
                </div>
                <div className="space-y-2">
                  <Label>Stare firmă</Label>
                  <Input value={formData.stareFirma || ""} onChange={(e) => updateField("stareFirma", e.target.value)} data-testid="input-stareFirma" />
                </div>
                <div className="space-y-2">
                  <Label>Formă organizare</Label>
                  <Input value={formData.formaOrganizare || ""} onChange={(e) => updateField("formaOrganizare", e.target.value)} data-testid="input-formaOrganizare" />
                </div>
                <div className="space-y-2">
                  <Label>Tip entitate (pentru potrivire fonduri)</Label>
                  <Select
                    value={formData.entityType || ""}
                    onValueChange={(val) => updateField("entityType", val === "auto" ? "" : val)}
                  >
                    <SelectTrigger data-testid="select-entityType">
                      <SelectValue placeholder="Auto-detectare din forma organizare" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detectare din forma organizare</SelectItem>
                      <SelectItem value="companie-privata">Companie privată (SRL, SA)</SelectItem>
                      <SelectItem value="imm">IMM</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="pfa-ii">PFA / Întreprindere Individuală</SelectItem>
                      <SelectItem value="cooperativa">Cooperativă</SelectItem>
                      <SelectItem value="ong">ONG / Asociație / Fundație</SelectItem>
                      <SelectItem value="autoritate-publica">Autoritate publică</SelectItem>
                      <SelectItem value="institutie-invatamant">Instituție de învățământ</SelectItem>
                      <SelectItem value="institutie-cercetare">Instituție de cercetare</SelectItem>
                      <SelectItem value="spital">Spital / Unitate sanitară</SelectItem>
                      <SelectItem value="gal">Grup de Acțiune Locală (GAL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Adresă sediu social</Label>
                  <Input value={formData.address || ""} onChange={(e) => updateField("address", e.target.value)} data-testid="input-address" />
                </div>
                <div className="space-y-2">
                  <Label>Județ</Label>
                  <Input value={formData.judet || ""} onChange={(e) => updateField("judet", e.target.value)} data-testid="input-judet" />
                </div>
                <div className="space-y-2">
                  <Label>Localitate</Label>
                  <Input value={formData.localitate || ""} onChange={(e) => updateField("localitate", e.target.value)} data-testid="input-localitate" />
                </div>
                <div className="space-y-2">
                  <Label>Cod CAEN principal</Label>
                  <Input value={formData.caen || ""} onChange={(e) => updateField("caen", e.target.value)} data-testid="input-caen" />
                </div>
                <div className="space-y-2">
                  <Label>Descriere CAEN</Label>
                  <Input value={formData.caenDescription || ""} onChange={(e) => updateField("caenDescription", e.target.value)} data-testid="input-caenDescription" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Coduri CAEN secundare (separate prin virgulă)</Label>
                  <Textarea
                    value={caenSecundareStr}
                    onChange={(e) => updateField("caenSecundare", e.target.value)}
                    data-testid="input-caenSecundare"
                  />
                </div>
                <div className="space-y-2">
                  <Label>An înființare</Label>
                  <Input value={formData.founded || ""} onChange={(e) => updateField("founded", e.target.value)} data-testid="input-founded" />
                </div>
              </div>
              <Button onClick={() => handleSave()} disabled={mutation.isPending} data-testid="button-save-identificare">
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvează modificările
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financiar" data-testid="tab-content-financiar">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Indicatori financiari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Număr mediu angajați (top-level)</Label>
                    <Input
                      type="number"
                      value={formData.employees ?? ""}
                      onChange={(e) => updateField("employees", e.target.value ? Number(e.target.value) : null)}
                      data-testid="input-employees"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Venituri (top-level)</Label>
                    <Input
                      type="number"
                      value={formData.revenue ?? ""}
                      onChange={(e) => updateField("revenue", e.target.value ? Number(e.target.value) : null)}
                      data-testid="input-revenue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profit (top-level)</Label>
                    <Input
                      type="number"
                      value={formData.profit ?? ""}
                      onChange={(e) => updateField("profit", e.target.value ? Number(e.target.value) : null)}
                      data-testid="input-profit"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-semnale-structurale">
              <CardHeader>
                <CardTitle>Profil proiecte (potrivire avansată)</CardTitle>
                <CardDescription>
                  Opțional. Aceste date îmbunătățesc potrivirea cu apelurile care impun un nivel de
                  maturitate tehnologică (TRL) sau un buget de proiect. Lăsați gol dacă nu se aplică —
                  câmpurile necompletate nu reduc scorul de potrivire.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nivel tipic de maturitate tehnologică (TRL)</Label>
                    <Select
                      value={formData.trl != null ? String(formData.trl) : "none"}
                      onValueChange={(val) => updateField("trl", val === "none" ? null : Number(val))}
                    >
                      <SelectTrigger data-testid="select-trl">
                        <SelectValue placeholder="Nespecificat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nespecificat</SelectItem>
                        <SelectItem value="1">TRL 1 — principii de bază</SelectItem>
                        <SelectItem value="2">TRL 2 — concept tehnologic</SelectItem>
                        <SelectItem value="3">TRL 3 — dovadă experimentală</SelectItem>
                        <SelectItem value="4">TRL 4 — validare în laborator</SelectItem>
                        <SelectItem value="5">TRL 5 — validare în mediu relevant</SelectItem>
                        <SelectItem value="6">TRL 6 — demonstrație în mediu relevant</SelectItem>
                        <SelectItem value="7">TRL 7 — demonstrație în mediu operațional</SelectItem>
                        <SelectItem value="8">TRL 8 — sistem complet, calificat</SelectItem>
                        <SelectItem value="9">TRL 9 — sistem dovedit operațional</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Cât de aproape de piață este de obicei tehnologia firmei (scară 1–9).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Buget tipic per proiect</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.typicalProjectBudget ?? ""}
                      onChange={(e) => updateField("typicalProjectBudget", e.target.value ? Number(e.target.value) : null)}
                      placeholder="Nespecificat"
                      data-testid="input-typical-budget"
                    />
                    <p className="text-xs text-muted-foreground">
                      Valoarea uzuală a unui proiect de finanțare pentru această firmă.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda bugetului</Label>
                    <Select
                      value={formData.typicalProjectBudgetCurrency || "none"}
                      onValueChange={(val) => updateField("typicalProjectBudgetCurrency", val === "none" ? null : val)}
                    >
                      <SelectTrigger data-testid="select-budget-currency">
                        <SelectValue placeholder="Nespecificat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nespecificat</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="RON">RON</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Obligatorie dacă ați completat bugetul (fără monedă nu putem compara pragurile).
                    </p>
                  </div>
                </div>
                <Button onClick={() => handleSave()} disabled={mutation.isPending} data-testid="button-save-semnale-structurale">
                  {mutation.isPending ? "Se salvează..." : "Salvează profilul de proiecte"}
                </Button>
              </CardContent>
            </Card>

            {(financiare.evaluareTermene != null || financiare.riscAltman || financiare.marimeFirma || financiare.capacitateDePlata != null) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-financiar-indicators">
                {financiare.evaluareTermene != null && (
                  <Card data-testid="card-evaluare-termene">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-4 h-4 text-blue-500" />
                        <p className="text-xs font-medium text-muted-foreground">Scor Termene.ro</p>
                      </div>
                      <p className="text-2xl font-bold" data-testid="text-evaluare-score">{formatNumber(financiare.evaluareTermene)}</p>
                      <p className="text-xs text-muted-foreground">din 10</p>
                    </CardContent>
                  </Card>
                )}

                {financiare.capacitateDePlata != null && (
                  <Card data-testid="card-capacitate-plata">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Landmark className="w-4 h-4 text-emerald-500" />
                        <p className="text-xs font-medium text-muted-foreground">Capacitate de plată</p>
                      </div>
                      <p className="text-2xl font-bold" data-testid="text-capacitate-plata">{formatCurrency(financiare.capacitateDePlata)}</p>
                    </CardContent>
                  </Card>
                )}

                {financiare.riscAltman && (
                  <Card data-testid="card-risc-altman">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Scale className="w-4 h-4 text-orange-500" />
                        <p className="text-xs font-medium text-muted-foreground">Risc Altman Z-Score</p>
                      </div>
                      <p className={`text-2xl font-bold ${riscColor(financiare.riscAltman.label)}`} data-testid="text-altman-label">
                        {/scazut|redus|minim/i.test(financiare.riscAltman.label) ? `Risc ${financiare.riscAltman.label.toLowerCase()}` : /ridicat|crescut|mare/i.test(financiare.riscAltman.label) ? `Risc ${financiare.riscAltman.label.toLowerCase()}` : financiare.riscAltman.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Punctaj: {formatNumber(financiare.riscAltman.punctaj)} ({financiare.riscAltman.an})
                        {financiare.riscAltman.tendinta && ` · ${financiare.riscAltman.tendinta}`}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {financiare.marimeFirma && (
                  <Card data-testid="card-marime-firma">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-purple-500" />
                        <p className="text-xs font-medium text-muted-foreground">Mărime firmă</p>
                      </div>
                      <p className="text-2xl font-bold capitalize" data-testid="text-marime-firma">{financiare.marimeFirma}</p>
                      {financiare.marimeFirmaAn && (
                        <p className="text-xs text-muted-foreground">Anul {financiare.marimeFirmaAn}</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {financiare.tendintaCifraAfaceri && (
              <div className="flex items-center gap-2 px-1" data-testid="section-tendinta-ca">
                {financiare.tendintaCifraAfaceri.toLowerCase().includes("cresc") ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : financiare.tendintaCifraAfaceri.toLowerCase().includes("desc") ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Info className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  Tendință cifra de afaceri: <span className="font-medium text-foreground">{financiare.tendintaCifraAfaceri}</span>
                </span>
              </div>
            )}

            {financiare.evaluareDetaliata && Object.keys(financiare.evaluareDetaliata).length > 0 && (
              <Card data-testid="card-evaluare-detaliata">
                <CardHeader>
                  <CardTitle className="text-base">Evaluare detaliată Termene.ro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(financiare.evaluareDetaliata).map(([key, val]) => {
                      const labels: Record<string, string> = {
                        capital_total: "Capital total",
                        rata_solvabilitate: "Rata solvabilitate",
                        datorii_buget_stat: "Datorii buget stat",
                        cifra_de_afaceri: "Cifra de afaceri",
                        numar_angajati: "Nr. angajați",
                        profit_pierdere: "Profit/Pierdere",
                        vechime: "Vechime",
                        evolutie_angajati: "Evoluție angajați",
                        evolutie_cifra_afaceri: "Evoluție CA",
                        evolutie_profit: "Evoluție profit",
                        litigii: "Litigii",
                        bpi: "BPI",
                      };
                      const label = labels[key] || key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
                      if (val == null) return null;
                      return (
                        <div key={key} className="p-2 rounded-md bg-muted/50 border" data-testid={`eval-${key}`}>
                          <p className="text-xs text-muted-foreground truncate">{label}</p>
                          <p className="text-sm font-semibold">{typeof val === "number" ? formatNumber(val) : String(val)}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {(financiare.riscAltmanHistoric?.length ?? 0) > 0 && (
              <Card data-testid="card-altman-istoric">
                <CardHeader>
                  <CardTitle className="text-base">Istoric Altman Z-Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {financiare.riscAltmanHistoric!.map((r) => (
                      <div key={r.an} className="p-2 rounded-md bg-muted/50 border text-center min-w-[80px]" data-testid={`altman-${r.an}`}>
                        <p className="text-xs text-muted-foreground">{r.an}</p>
                        <p className={`text-sm font-semibold ${riscColor(r.label)}`}>{r.label}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(r.punctaj)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(financiare.istoricMarime?.length ?? 0) > 0 && (
              <Card data-testid="card-istoric-marime">
                <CardHeader>
                  <CardTitle className="text-base">Istoric mărime firmă</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {financiare.istoricMarime!.map((m) => (
                      <div key={m.an} className="p-2 rounded-md bg-muted/50 border text-center min-w-[80px]" data-testid={`marime-${m.an}`}>
                        <p className="text-xs text-muted-foreground">{m.an}</p>
                        <p className="text-sm font-semibold capitalize">{m.marime}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Situații financiare anuale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {financiare.ani.map((an, idx) => (
                  <Card key={an.an} data-testid={`card-financiar-an-${an.an}`}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">Anul {an.an}</CardTitle>
                        {an.marimeFirma && (
                          <Badge variant="outline" className="capitalize no-default-active-elevate" data-testid={`badge-marime-${an.an}`}>
                            {an.marimeFirma}
                          </Badge>
                        )}
                        {an.marjaProfitNet != null && (
                          <span className="text-xs text-muted-foreground">
                            Marja profit net: <span className={`font-medium ${an.marjaProfitNet >= 0 ? "text-green-600" : "text-red-500"}`}>{an.marjaProfitNet.toFixed(1)}%</span>
                          </span>
                        )}
                        {an.marjaProfitBrut != null && (
                          <span className="text-xs text-muted-foreground">
                            Marja profit brut: <span className="font-medium">{an.marjaProfitBrut.toFixed(1)}%</span>
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {([
                          ["cifraAfaceri", "Cifra de afaceri"],
                          ["venituriTotale", "Venituri totale"],
                          ["cheltuieliTotale", "Cheltuieli totale"],
                          ["profitNet", "Profit net"],
                          ["pierdereNeta", "Pierdere netă"],
                          ["capitaluriProprii", "Capitaluri proprii"],
                          ["capitalSocial", "Capital social"],
                          ["activeTotale", "Active totale"],
                          ["activeImobilizate", "Active imobilizate"],
                          ["datoriiTotale", "Datorii totale"],
                          ["numarMediuAngajati", "Număr mediu angajați"],
                        ] as const).map(([key, label]) => (
                          <div className="space-y-2" key={key}>
                            <Label>{label}</Label>
                            <Input
                              type="number"
                              placeholder="N/A"
                              value={(an as unknown as Record<string, number | null>)[key] ?? ""}
                              onChange={(e) => {
                                const newAni = [...financiare.ani];
                                (newAni[idx] as unknown as Record<string, unknown>)[key] = e.target.value ? Number(e.target.value) : null;
                                setFinanciare({ ...financiare, ani: newAni });
                              }}
                              data-testid={`input-financiar-${an.an}-${key}`}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button onClick={() => handleSave()} disabled={mutation.isPending} data-testid="button-save-financiar">
                  {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvează modificările
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actionariat" data-testid="tab-content-actionariat">
          <Card>
            <CardHeader>
              <CardTitle>Acționariat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <section data-testid="section-actionariPJ">
                <h3 className="font-semibold mb-2">Acționari Persoane Juridice</h3>
                {actionariat.actionariPJ.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2 flex-wrap">
                    <Input
                      placeholder="Nume"
                      value={item.nume}
                      onChange={(e) => {
                        const arr = [...actionariat.actionariPJ];
                        arr[idx] = { ...arr[idx], nume: e.target.value };
                        setActionariat({ ...actionariat, actionariPJ: arr });
                      }}
                      className="flex-1 min-w-[120px]"
                      data-testid={`input-actionarPJ-nume-${idx}`}
                    />
                    <Input
                      placeholder="CUI"
                      value={item.cui}
                      onChange={(e) => {
                        const arr = [...actionariat.actionariPJ];
                        arr[idx] = { ...arr[idx], cui: e.target.value };
                        setActionariat({ ...actionariat, actionariPJ: arr });
                      }}
                      className="w-32"
                      data-testid={`input-actionarPJ-cui-${idx}`}
                    />
                    <Input
                      placeholder="Procent"
                      type="number"
                      value={item.procent}
                      onChange={(e) => {
                        const arr = [...actionariat.actionariPJ];
                        arr[idx] = { ...arr[idx], procent: Number(e.target.value) };
                        setActionariat({ ...actionariat, actionariPJ: arr });
                      }}
                      className="w-24"
                      data-testid={`input-actionarPJ-procent-${idx}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const arr = actionariat.actionariPJ.filter((_, i) => i !== idx);
                        setActionariat({ ...actionariat, actionariPJ: arr });
                      }}
                      data-testid={`button-delete-actionarPJ-${idx}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionariat({ ...actionariat, actionariPJ: [...actionariat.actionariPJ, { nume: "", cui: "", procent: 0 }] })}
                  data-testid="button-add-actionarPJ"
                >
                  <Plus className="mr-1 h-4 w-4" /> Adaugă
                </Button>
              </section>

              <section data-testid="section-actionariPF">
                <h3 className="font-semibold mb-2">Acționari Persoane Fizice</h3>
                {actionariat.actionariPF.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2 flex-wrap">
                    <Input
                      placeholder="Nume"
                      value={item.nume}
                      onChange={(e) => {
                        const arr = [...actionariat.actionariPF];
                        arr[idx] = { ...arr[idx], nume: e.target.value };
                        setActionariat({ ...actionariat, actionariPF: arr });
                      }}
                      className="flex-1 min-w-[120px]"
                      data-testid={`input-actionarPF-nume-${idx}`}
                    />
                    <Input
                      placeholder="Procent"
                      type="number"
                      value={item.procent}
                      onChange={(e) => {
                        const arr = [...actionariat.actionariPF];
                        arr[idx] = { ...arr[idx], procent: Number(e.target.value) };
                        setActionariat({ ...actionariat, actionariPF: arr });
                      }}
                      className="w-24"
                      data-testid={`input-actionarPF-procent-${idx}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const arr = actionariat.actionariPF.filter((_, i) => i !== idx);
                        setActionariat({ ...actionariat, actionariPF: arr });
                      }}
                      data-testid={`button-delete-actionarPF-${idx}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionariat({ ...actionariat, actionariPF: [...actionariat.actionariPF, { nume: "", procent: 0 }] })}
                  data-testid="button-add-actionarPF"
                >
                  <Plus className="mr-1 h-4 w-4" /> Adaugă
                </Button>
              </section>

              <section data-testid="section-administratori">
                <h3 className="font-semibold mb-2">Administratori</h3>
                {actionariat.administratori.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2 flex-wrap">
                    <Input
                      placeholder="Nume"
                      value={item.nume}
                      onChange={(e) => {
                        const arr = [...actionariat.administratori];
                        arr[idx] = { ...arr[idx], nume: e.target.value };
                        setActionariat({ ...actionariat, administratori: arr });
                      }}
                      className="flex-1 min-w-[120px]"
                      data-testid={`input-administrator-nume-${idx}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const arr = actionariat.administratori.filter((_, i) => i !== idx);
                        setActionariat({ ...actionariat, administratori: arr });
                      }}
                      data-testid={`button-delete-administrator-${idx}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionariat({ ...actionariat, administratori: [...actionariat.administratori, { nume: "" }] })}
                  data-testid="button-add-administrator"
                >
                  <Plus className="mr-1 h-4 w-4" /> Adaugă
                </Button>
              </section>

              <section data-testid="section-participatii">
                <h3 className="font-semibold mb-2">Participații</h3>
                {actionariat.participatii.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2 flex-wrap">
                    <Input
                      placeholder="Nume"
                      value={item.nume}
                      onChange={(e) => {
                        const arr = [...actionariat.participatii];
                        arr[idx] = { ...arr[idx], nume: e.target.value };
                        setActionariat({ ...actionariat, participatii: arr });
                      }}
                      className="flex-1 min-w-[120px]"
                      data-testid={`input-participatie-nume-${idx}`}
                    />
                    <Input
                      placeholder="CUI"
                      value={item.cui}
                      onChange={(e) => {
                        const arr = [...actionariat.participatii];
                        arr[idx] = { ...arr[idx], cui: e.target.value };
                        setActionariat({ ...actionariat, participatii: arr });
                      }}
                      className="w-32"
                      data-testid={`input-participatie-cui-${idx}`}
                    />
                    <Input
                      placeholder="Procent"
                      type="number"
                      value={item.procent}
                      onChange={(e) => {
                        const arr = [...actionariat.participatii];
                        arr[idx] = { ...arr[idx], procent: Number(e.target.value) };
                        setActionariat({ ...actionariat, participatii: arr });
                      }}
                      className="w-24"
                      data-testid={`input-participatie-procent-${idx}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const arr = actionariat.participatii.filter((_, i) => i !== idx);
                        setActionariat({ ...actionariat, participatii: arr });
                      }}
                      data-testid={`button-delete-participatie-${idx}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionariat({ ...actionariat, participatii: [...actionariat.participatii, { nume: "", cui: "", procent: 0 }] })}
                  data-testid="button-add-participatie"
                >
                  <Plus className="mr-1 h-4 w-4" /> Adaugă
                </Button>
              </section>

              <section data-testid="section-beneficiariReali">
                <h3 className="font-semibold mb-2">Beneficiari Reali</h3>
                {actionariat.beneficiariReali.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2 flex-wrap">
                    <Input
                      placeholder="Nume"
                      value={item.nume}
                      onChange={(e) => {
                        const arr = [...actionariat.beneficiariReali];
                        arr[idx] = { ...arr[idx], nume: e.target.value };
                        setActionariat({ ...actionariat, beneficiariReali: arr });
                      }}
                      className="flex-1 min-w-[120px]"
                      data-testid={`input-beneficiarReal-nume-${idx}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const arr = actionariat.beneficiariReali.filter((_, i) => i !== idx);
                        setActionariat({ ...actionariat, beneficiariReali: arr });
                      }}
                      data-testid={`button-delete-beneficiarReal-${idx}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionariat({ ...actionariat, beneficiariReali: [...actionariat.beneficiariReali, { nume: "" }] })}
                  data-testid="button-add-beneficiarReal"
                >
                  <Plus className="mr-1 h-4 w-4" /> Adaugă
                </Button>
              </section>

              <Button onClick={() => handleSave()} disabled={mutation.isPending} data-testid="button-save-actionariat">
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvează modificările
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evenimente" data-testid="tab-content-evenimente">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="section-risk-cards">
              {evenimente.statutTva && (
                <Card data-testid="card-statut-tva">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Landmark className="w-4 h-4 text-blue-500" />
                      <p className="text-sm font-semibold">Statut TVA</p>
                    </div>
                    <Badge variant={evenimente.statutTva.platitorTva ? "default" : "secondary"} className="no-default-active-elevate mb-2" data-testid="badge-tva-status">
                      {evenimente.statutTva.label || (evenimente.statutTva.platitorTva ? "Plătitor TVA" : "Neplătitor TVA")}
                    </Badge>
                    {evenimente.statutTva.dataInceputTva && (
                      <p className="text-xs text-muted-foreground">Început TVA: {evenimente.statutTva.dataInceputTva}</p>
                    )}
                    {evenimente.statutTva.dataAnulareTva && (
                      <p className="text-xs text-red-500">Anulare TVA: {evenimente.statutTva.dataAnulareTva}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {evenimente.statutFiscal && (
                <Card data-testid="card-statut-fiscal">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <p className="text-sm font-semibold">Statut fiscal</p>
                    </div>
                    <Badge variant={evenimente.statutFiscal.label?.toLowerCase().includes("activ") ? "default" : "destructive"} className="no-default-active-elevate mb-2" data-testid="badge-fiscal-status">
                      {evenimente.statutFiscal.label || "Necunoscut"}
                    </Badge>
                    {evenimente.statutFiscal.dataModificare && (
                      <p className="text-xs text-muted-foreground">Ultima modificare: {evenimente.statutFiscal.dataModificare}</p>
                    )}
                    {(evenimente.statutFiscal.istoric?.length ?? 0) > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Istoric:</p>
                        {evenimente.statutFiscal.istoric!.slice(0, 5).map((s, i) => (
                          <p key={i} className="text-xs text-muted-foreground">{s.dataModificare}: {s.label}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {evenimente.datoriiAnafSumar && (
                <Card data-testid="card-datorii-anaf">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <p className="text-sm font-semibold">Datorii ANAF</p>
                    </div>
                    <Badge variant={evenimente.datoriiAnafSumar.areDatorii ? "destructive" : "default"} className="no-default-active-elevate mb-2" data-testid="badge-datorii-status">
                      {evenimente.datoriiAnafSumar.areDatorii ? "Are datorii" : "Fără datorii"}
                    </Badge>
                    {evenimente.datoriiAnafSumar.areDatorii && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400" data-testid="text-total-datorii">
                          Total: {formatCurrency(evenimente.datoriiAnafSumar.totalDatorii)}
                        </p>
                        {evenimente.datoriiAnafSumar.bugetStat > 0 && (
                          <p className="text-xs text-muted-foreground">Buget stat: {formatCurrency(evenimente.datoriiAnafSumar.bugetStat)}</p>
                        )}
                        {evenimente.datoriiAnafSumar.bugetSanatate > 0 && (
                          <p className="text-xs text-muted-foreground">Sănătate: {formatCurrency(evenimente.datoriiAnafSumar.bugetSanatate)}</p>
                        )}
                        {evenimente.datoriiAnafSumar.bugetSomaj > 0 && (
                          <p className="text-xs text-muted-foreground">Șomaj: {formatCurrency(evenimente.datoriiAnafSumar.bugetSomaj)}</p>
                        )}
                        {evenimente.datoriiAnafSumar.bugetSociale > 0 && (
                          <p className="text-xs text-muted-foreground">Asig. sociale: {formatCurrency(evenimente.datoriiAnafSumar.bugetSociale)}</p>
                        )}
                        {evenimente.datoriiAnafSumar.dataDatorie && (
                          <p className="text-xs text-muted-foreground mt-1">Data: {evenimente.datoriiAnafSumar.dataDatorie}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {evenimente.riscFiscal && (
                <Card data-testid="card-risc-fiscal">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      <p className="text-sm font-semibold">Risc fiscal</p>
                    </div>
                    <Badge variant={riscBadgeVariant(evenimente.riscFiscal?.nivel || evenimente.riscFiscal?.label)} className="no-default-active-elevate" data-testid="badge-risc-fiscal">
                      {evenimente.riscFiscal?.label || evenimente.riscFiscal?.nivel || "Necunoscut"}
                    </Badge>
                    {evenimente.riscFiscal?.data && (
                      <p className="text-xs text-muted-foreground mt-1">Data: {evenimente.riscFiscal.data}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {evenimente.riscJuridic && (
                <Card data-testid="card-risc-juridic">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Gavel className="w-4 h-4 text-purple-500" />
                      <p className="text-sm font-semibold">Risc juridic</p>
                    </div>
                    <Badge variant={riscBadgeVariant(evenimente.riscJuridic?.nivel || evenimente.riscJuridic?.label)} className="no-default-active-elevate" data-testid="badge-risc-juridic">
                      {evenimente.riscJuridic?.label || evenimente.riscJuridic?.nivel || "Necunoscut"}
                    </Badge>
                  </CardContent>
                </Card>
              )}

              {evenimente.riscInsolventa && (
                <Card data-testid="card-risc-insolventa">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-semibold">Risc insolvență</p>
                    </div>
                    <Badge variant={riscBadgeVariant(evenimente.riscInsolventa?.nivel || evenimente.riscInsolventa?.label)} className="no-default-active-elevate" data-testid="badge-risc-insolventa">
                      {evenimente.riscInsolventa?.label || evenimente.riscInsolventa?.nivel || "Necunoscut"}
                    </Badge>
                    {evenimente.riscInsolventa?.probabilitate != null && (
                      <p className="text-xs text-muted-foreground mt-1">Probabilitate: {evenimente.riscInsolventa.probabilitate}%</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {evenimente.sicapExperienta && (evenimente.sicapExperienta.nrContracteDirecte > 0 || evenimente.sicapExperienta.nrContractePublice > 0) && (
              <Card data-testid="card-sicap">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Experiență SICAP (achiziții publice)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-md bg-muted/50 border text-center" data-testid="sicap-directe">
                      <p className="text-2xl font-bold">{evenimente.sicapExperienta.nrContracteDirecte}</p>
                      <p className="text-xs text-muted-foreground">Contracte achiziție directă</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50 border text-center" data-testid="sicap-publice">
                      <p className="text-2xl font-bold">{evenimente.sicapExperienta.nrContractePublice}</p>
                      <p className="text-xs text-muted-foreground">Contracte licitații publice</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {evenimente.grupFirma && (
              <Card data-testid="card-grup-firma">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    Grup firmă (întreprindere unică)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {evenimente.grupFirma.numeFirma && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Firma principală: </span>
                      <span className="font-medium">{evenimente.grupFirma.numeFirma}</span>
                      {evenimente.grupFirma.procentaj != null && (
                        <span className="text-muted-foreground"> ({evenimente.grupFirma.procentaj}%)</span>
                      )}
                    </p>
                  )}
                  {evenimente.grupFirma.asociatiProcentaj.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Asociați cu procente:</p>
                      {evenimente.grupFirma.asociatiProcentaj.map((a, i) => (
                        <p key={i} className="text-sm">
                          {a.nume || "Necunoscut"} — <span className="font-medium">{a.procentaj}%</span>
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(evenimente.puncteDeLucru?.length ?? 0) > 0 && (
              <Card data-testid="card-puncte-lucru">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    Puncte de lucru active
                    <Badge variant="outline" className="no-default-active-elevate">
                      {evenimente.puncteDeLucru!.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(evenimente.judeteOperare?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3" data-testid="section-judete-operare">
                      <span className="text-xs text-muted-foreground mr-1">Județe de operare:</span>
                      {evenimente.judeteOperare!.map((j) => (
                        <Badge key={j} variant="outline" className="text-xs no-default-active-elevate" data-testid={`badge-judet-${j}`}>
                          {j}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    {evenimente.puncteDeLucru!.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/30" data-testid={`punct-lucru-${i}`}>
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p>{p.adresa || "Adresă necunoscută"}</p>
                          {(p.judet || p.localitate) && (
                            <p className="text-xs text-muted-foreground">{[p.localitate, p.judet].filter(Boolean).join(", ")}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {evenimente.dosare && (
              <Card data-testid="card-dosare">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-orange-500" />
                    Dosare instanță
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {typeof evenimente.dosare === "object" && evenimente.dosare?.numar_rezultate != null
                      ? `${evenimente.dosare.numar_rezultate} dosare găsite`
                      : JSON.stringify(evenimente.dosare)}
                  </p>
                </CardContent>
              </Card>
            )}

            {evenimente.bpiStare && (
              <Card data-testid="card-bpi">
                <CardHeader>
                  <CardTitle className="text-base">Buletinul Procedurilor de Insolvență (BPI)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground" data-testid="text-bpi">
                    {typeof evenimente.bpiStare === "object"
                      ? (evenimente.bpiStare?.numar_rezultate != null
                        ? `${evenimente.bpiStare.numar_rezultate} intrări BPI`
                        : JSON.stringify(evenimente.bpiStare))
                      : String(evenimente.bpiStare)}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alte informații</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stare ANAF TVA</Label>
                    <Input
                      value={evenimente.stareAnafTva || ""}
                      onChange={(e) => setEvenimente({ ...evenimente, stareAnafTva: e.target.value })}
                      data-testid="input-stareAnafTva"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ANAF Obligații restante</Label>
                    <Input
                      value={evenimente.anafObligatiiRestante || ""}
                      onChange={(e) => setEvenimente({ ...evenimente, anafObligatiiRestante: e.target.value })}
                      data-testid="input-anafObligatiiRestante"
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave()} disabled={mutation.isPending} data-testid="button-save-evenimente">
                  {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvează modificările
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profil-ai" data-testid="tab-content-profil-ai">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[hsl(48,100%,45%)]" />
                  Profil AI
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProfileConfirm(true)}
                  disabled={refreshProfileMutation.isPending}
                  data-testid="button-regenerate-profile-tab"
                  className="border-[hsl(48,100%,50%)]/40"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-[hsl(48,100%,45%)]" />
                  {refreshProfileMutation.isPending ? "Se generează..." : `Regenerează profil (${aiProfileCost} cr)`}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const c = company as any;
                const hasProfile = !!c.profileEmbedding;
                const isStale = hasProfile && c.profileDataHash && c.currentDataHash && c.profileDataHash !== c.currentDataHash;
                const profileDate = c.profileGeneratedAt ? new Date(c.profileGeneratedAt) : null;

                return (
                  <>
                    <div className="flex flex-wrap gap-3" data-testid="section-profile-status">
                      {!hasProfile ? (
                        <Badge variant="destructive" className="no-default-active-elevate" data-testid="badge-profile-status">
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          Profil negenenerat
                        </Badge>
                      ) : isStale ? (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 no-default-active-elevate" data-testid="badge-profile-status">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                          Profil expirat — datele companiei s-au modificat
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 no-default-active-elevate" data-testid="badge-profile-status">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Profil activ și actualizat
                        </Badge>
                      )}

                      {profileDate && (
                        <Badge variant="outline" className="no-default-active-elevate" data-testid="badge-profile-date">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          Generat: {profileDate.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })} la {profileDate.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                        </Badge>
                      )}

                      {hasProfile && (
                        <Badge variant="outline" className="no-default-active-elevate" data-testid="badge-has-embedding">
                          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[hsl(48,100%,45%)]" />
                          Embedding activ
                        </Badge>
                      )}
                    </div>

                    {isStale && (
                      <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30" data-testid="alert-profile-stale">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          <AlertTriangle className="w-4 h-4 inline mr-2" />
                          Datele companiei au fost modificate de la ultima generare a profilului AI.
                          Scorurile de potrivire cu apelurile de finanțare pot fi inexacte.
                          Apăsați „Regenerează profil" pentru a actualiza.
                        </p>
                      </div>
                    )}

                    {!hasProfile && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30" data-testid="alert-profile-missing">
                        <p className="text-sm text-red-800 dark:text-red-300">
                          <XCircle className="w-4 h-4 inline mr-2" />
                          Profilul AI nu a fost generat încă. Fără profil, scorul semantic (60% din potrivire) nu poate fi calculat.
                          Apăsați „Regenerează profil" pentru a genera.
                        </p>
                      </div>
                    )}

                    {c.profileText && (
                      <div data-testid="section-profile-text">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-muted-foreground" />
                          Text profil generat
                        </h3>
                        <div className="p-4 rounded-lg bg-muted/50 border">
                          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/80" data-testid="text-profile-content">
                            {c.profileText}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-lg bg-muted/30 border border-dashed" data-testid="section-profile-info">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Profilul AI este o descriere structurată a companiei, generată automat din datele introduse
                        (nume, CAEN, angajați, cifră de afaceri, istoric financiar etc.).
                        Pe baza acestui profil se calculează un embedding vectorial folosit pentru potrivirea semantică
                        cu apelurile de finanțare. Profilul trebuie regenerat ori de câte ori se modifică datele companiei
                        pentru a menține acuratețea scorurilor.
                      </p>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rapoarte" data-testid="tab-content-rapoarte">
          <CompanyEligibilityReports companyId={id!} company={company} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface EligibilityReportItem {
  id: string;
  fundingCallId: string | null;
  verdict: string;
  verdictScore: number | null;
  verdictSummary: string | null;
  hasDualAnalysis: boolean | null;
  ragSectionsUsed: number | null;
  criteria: any;
  recommendations: any;
  optimistAnalysis: any;
  skepticAnalysis: any;
  notes: string | null;
  createdAt: string;
  fundingCallName: string | null;
}

function CompanyEligibilityReports({ companyId, company }: { companyId: string; company: Company }) {
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery<EligibilityReportItem[]>({
    queryKey: ["/api/companies", companyId, "eligibility-reports"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/eligibility-reports`, { credentials: "include" });
      if (!res.ok) throw new Error("Eroare la incarcarea rapoartelor");
      return res.json();
    },
    enabled: !!companyId,
  });

  function verdictIcon(verdict: string) {
    if (verdict === "eligibil") return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (verdict === "neeligibil") return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  }

  function verdictBadge(verdict: string) {
    if (verdict === "eligibil") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 no-default-active-elevate" data-testid="badge-verdict-eligible">Eligibil</Badge>;
    if (verdict === "neeligibil") return <Badge variant="destructive" className="no-default-active-elevate" data-testid="badge-verdict-ineligible">Neeligibil</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 no-default-active-elevate" data-testid="badge-verdict-partial">Parțial eligibil</Badge>;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold">Niciun raport de eligibilitate</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Nu a fost generat niciun raport de eligibilitate pentru aceasta companie. Mergi la pagina de Eligibilitate pentru a rula o verificare.
          </p>
          <Link href="/eligibility">
            <Button variant="outline" size="sm" className="mt-2" data-testid="link-go-eligibility">
              <Shield className="w-4 h-4 mr-2" />
              Mergi la Eligibilitate
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reports.length} {reports.length === 1 ? "raport" : "rapoarte"} de eligibilitate
        </p>
        <Link href="/eligibility">
          <Button variant="outline" size="sm" data-testid="link-new-eligibility-check">
            <Shield className="w-4 h-4 mr-2" />
            Verificare noua
          </Button>
        </Link>
      </div>

      {reports.map((report) => {
        const isExpanded = expandedReport === report.id;
        const criteria = Array.isArray(report.criteria) ? report.criteria : [];
        const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];

        return (
          <Card key={report.id} data-testid={`card-report-${report.id}`}>
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedReport(isExpanded ? null : report.id)}
              data-testid={`button-toggle-report-${report.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {verdictIcon(report.verdict)}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate" data-testid={`text-report-call-${report.id}`}>
                      {report.fundingCallName || "Apel necunoscut"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {verdictBadge(report.verdict)}
                      {report.verdictScore !== null && (
                        <span className="text-xs text-muted-foreground">Scor: {report.verdictScore}%</span>
                      )}
                      {report.hasDualAnalysis && (
                        <Badge variant="outline" className="text-xs no-default-active-elevate">
                          <Brain className="w-3 h-3 mr-1" />
                          Analiza duala
                        </Badge>
                      )}
                      {(report.ragSectionsUsed ?? 0) > 0 && (
                        <Badge variant="outline" className="text-xs no-default-active-elevate">
                          <FileText className="w-3 h-3 mr-1" />
                          {report.ragSectionsUsed} sectiuni analizate
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(report.createdAt)}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-4 border-t pt-4">
                {report.verdictSummary && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rezumat</p>
                    <p className="text-sm leading-relaxed" data-testid={`text-report-summary-${report.id}`}>{report.verdictSummary}</p>
                  </div>
                )}

                {criteria.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Criterii evaluate</p>
                    <div className="space-y-1.5">
                      {criteria.map((c: any, i: number) => {
                        const st = (c.status || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[îâ]/g, "i").replace(/[ăâ]/g, "a").replace(/ț/g, "t").replace(/ș/g, "s");
                        const statusNorm = c.passed === true ? "pass"
                          : c.passed === false ? "fail"
                          : st.includes("neindeplinit") ? "fail"
                          : st.includes("indeplinit") ? "pass"
                          : "warn";
                        return (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          {statusNorm === "pass" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                          ) : statusNorm === "fail" ? (
                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                          )}
                          <div>
                            <span className="font-medium">{c.name || c.criteriu || `Criteriu ${i + 1}`}</span>
                            {(c.details || c.detalii) && (
                              <span className="text-muted-foreground ml-1">— {c.details || c.detalii}</span>
                            )}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  </div>
                )}

                {recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recomandari</p>
                    <ul className="space-y-1 text-sm">
                      {recommendations.map((r: any, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{typeof r === "string" ? r : r.text || r.recomandare || JSON.stringify(r)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.hasDualAnalysis && (report.optimistAnalysis || report.skepticAnalysis) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.optimistAnalysis && (
                      <Card className="p-3 border-green-200 dark:border-green-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsUp className="w-4 h-4 text-green-600" />
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Optimist</p>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {typeof report.optimistAnalysis === "string"
                            ? report.optimistAnalysis
                            : report.optimistAnalysis.summary || report.optimistAnalysis.text || JSON.stringify(report.optimistAnalysis).slice(0, 300)}
                        </p>
                      </Card>
                    )}
                    {report.skepticAnalysis && (
                      <Card className="p-3 border-red-200 dark:border-red-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldAlert className="w-4 h-4 text-red-500" />
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase">Sceptic</p>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {typeof report.skepticAnalysis === "string"
                            ? report.skepticAnalysis
                            : report.skepticAnalysis.summary || report.skepticAnalysis.text || JSON.stringify(report.skepticAnalysis).slice(0, 300)}
                        </p>
                      </Card>
                    )}
                  </div>
                )}

                {report.notes && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Note consultant</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-md" data-testid={`text-report-notes-${report.id}`}>{report.notes}</p>
                  </div>
                )}

                <div className="pt-2 border-t flex items-center gap-2 flex-wrap">
                  {report.fundingCallId && (
                    <Link href={`/funding-calls/${report.fundingCallId}`}>
                      <Button variant="outline" size="sm" data-testid={`link-funding-call-${report.id}`}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Vezi apelul de finanțare
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-pdf-report-${report.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const dualAnalysis = (report.hasDualAnalysis && (report.optimistAnalysis || report.skepticAnalysis)) ? {
                        hasDualAnalysis: true,
                        optimist: report.optimistAnalysis || { points: [], summary: "" },
                        skeptic: report.skepticAnalysis || { points: [], summary: "" },
                      } : undefined;
                      exportEligibilityPDF(
                        {
                          verdict: report.verdict,
                          score: report.verdictScore ?? 0,
                          summary: report.verdictSummary || "",
                          criteria: criteria.map((c: any) => ({
                            criteriu: c.criteriu || c.name || "",
                            status: c.status || (c.passed ? "indeplinit" : "neindeplinit"),
                            detalii: c.detalii || c.details || "",
                          })),
                          recommendations: recommendations.map((r: any) => typeof r === "string" ? r : r.text || r.recomandare || ""),
                          dualAnalysis,
                          notes: report.notes || undefined,
                        },
                        { name: company.name, cui: company.cui, caen: company.caen, employees: company.employees, revenue: company.revenue },
                        report.fundingCallName ? { titlu: report.fundingCallName } : undefined,
                        report.createdAt,
                      );
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Descarcă PDF
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}