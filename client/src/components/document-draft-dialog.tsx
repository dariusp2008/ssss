import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, Sparkles, RefreshCw, Save, FileDown, FileText, Wand2, Building2, ShieldCheck,
  CheckCircle2, History, AlertTriangle, TrendingUp, TrendingDown, Minus, RotateCcw, Pencil, ArrowRight,
} from "lucide-react";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { ProgressStepper } from "@/components/progress-stepper";
import {
  getDocumentTemplate,
  DRAFT_PROGRESS_DONE_LABEL,
  DRAFT_PROGRESS_ERROR_LABEL,
} from "@shared/document-templates";
import type { DocumentDraft, DocumentDraftSection } from "@shared/schema";

interface DraftContext {
  company: {
    name: string;
    cui: string | null;
    caen: string | null;
    caenDescription: string | null;
    employees: number | null;
    revenue: number | null;
    judet: string | null;
    localitate: string | null;
    hasAiProfile: boolean;
  } | null;
  call: { name: string; summary: string | null } | null;
}

interface ConformityReport {
  id: string;
  documentId: string | null;
  verdict: string | null;
  score: number | null;
  summary: string | null;
  recommendations: string[];
  missingElements: string[];
  criteria: Array<{ requirement: string; status: string; details: string }>;
  createdAt: string;
}

interface ImproveChange {
  key: string;
  title: string;
  oldContent: string;
  newContent: string;
}

interface ImproveResult {
  changes: ImproveChange[];
  summary: string;
}

interface DraftVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
}

const DRAFT_TYPE = "plan_afaceri";
const GENERATE_ACTION = "document_draft_generate";
const SECTION_ACTION = "document_draft_section";
const IMPROVE_ACTION = "document_draft_improve";

type Stage = "generare" | "imbunatatire" | "verificare" | "finalizare";

interface DocumentDraftDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotType?: string;
}

interface CreditCost {
  action: string;
  credit_cost: number;
  label: string;
  description: string;
}

function verdictTone(verdict: string | null): string {
  const v = (verdict || "").toUpperCase();
  if (v.includes("NEELIGIBIL")) return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
  if (v.includes("PARȚIAL") || v.includes("INSUFICIENTE")) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  if (v.includes("ELIGIBIL")) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function DocumentDraftDialog({ projectId, open, onOpenChange, slotType }: DocumentDraftDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [projectIdea, setProjectIdea] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("RON");
  const [durationMonths, setDurationMonths] = useState("");

  const [sections, setSections] = useState<DocumentDraftSection[]>([]);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<"editare" | "imbunatatire" | "verificare">("editare");

  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [confirmRegenSection, setConfirmRegenSection] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null);

  // Generare draft async (Task #182): serverul răspunde 202 + rulează în fundal;
  // urmărim progresul prin SSE (ProgressStepper) și detectăm finalul prin onComplete.
  const [generating, setGenerating] = useState(false);
  const [genProgressId, setGenProgressId] = useState<string | null>(null);
  // Baseline pentru fallback-ul de detecție (a apărut un draft nou / a crescut
  // versiunea?) folosit DOAR când SSE nu a livrat label-ul terminal (stall).
  // genDoneRef previne dublarea finalizării (SSE + watchdog).
  const genBaselineRef = useRef<{ existed: boolean; version: number }>({ existed: false, version: 0 });
  const genDoneRef = useRef(false);
  // Ultimul label terminal primit prin SSE — sursa principală de adevăr pentru
  // succes/eșec (corelat cu operațiunea, nu euristic). Watchdog-ul de stall și
  // timer-ul lui se resetează la fiecare eveniment de progres.
  const genFinalLabelRef = useRef<string | undefined>(undefined);
  const genStallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pașii de progres = câte o secțiune din template + un pas final de salvare.
  // Trebuie să corespundă cu `totalSteps` din ruta server (sections + 1).
  const draftSteps = useMemo(() => {
    const tmpl = getDocumentTemplate(DRAFT_TYPE);
    const secs = [...(tmpl?.sections ?? [])].sort((a, b) => a.order - b.order);
    return [...secs.map((s) => `Redactare: ${s.title}`), "Finalizare draft"];
  }, []);

  // Iterare AI (Task #115)
  const [freeInstruction, setFreeInstruction] = useState("");
  const [pendingImprove, setPendingImprove] = useState<{ recommendation?: string; instruction?: string } | null>(null);
  const [proposal, setProposal] = useState<ImproveResult | null>(null);
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(new Set());
  const [showVersions, setShowVersions] = useState(false);

  const draftKey = useMemo(() => [`/api/projects/${projectId}/drafts?type=${DRAFT_TYPE}`], [projectId]);

  const { data: draft, isLoading: draftLoading, refetch: refetchDraft } = useQuery<DocumentDraft | null>({
    queryKey: draftKey,
    enabled: open,
  });

  const { data: costs } = useQuery<CreditCost[]>({ queryKey: ["/api/credits/costs"], enabled: open });
  const generateCost = costs?.find((c) => c.action === GENERATE_ACTION)?.credit_cost ?? 0;
  const sectionCost = costs?.find((c) => c.action === SECTION_ACTION)?.credit_cost ?? 0;
  const improveCost = costs?.find((c) => c.action === IMPROVE_ACTION)?.credit_cost ?? 0;

  const { data: context } = useQuery<DraftContext>({
    queryKey: [`/api/projects/${projectId}/drafts/context`],
    enabled: open,
  });

  const { data: allReports } = useQuery<ConformityReport[]>({
    queryKey: ["/api/projects", projectId, "conformity-reports"],
    enabled: open && !!draft,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery<DraftVersion[]>({
    queryKey: [`/api/drafts/${draft?.id}/versions`],
    enabled: open && !!draft?.id && showVersions,
  });

  // Istoricul verificărilor pentru ACEST draft (rapoartele atașate documentului său), vechi → nou.
  const draftReports = useMemo(() => {
    if (!draft?.documentId || !allReports) return [] as ConformityReport[];
    return allReports
      .filter((r) => r.documentId === draft.documentId)
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allReports, draft?.documentId]);

  const latestReport = draftReports.length > 0 ? draftReports[draftReports.length - 1] : null;
  const prevReport = draftReports.length > 1 ? draftReports[draftReports.length - 2] : null;
  const scoreDelta = latestReport?.score != null && prevReport?.score != null ? latestReport.score - prevReport.score : null;

  useEffect(() => {
    if (draft) {
      setSections([...(draft.sections as DocumentDraftSection[])].sort((a, b) => a.order - b.order));
      const inputs = (draft.inputs as any) || {};
      setProjectIdea(inputs.projectIdea || "");
      setBudget(inputs.budget != null ? String(inputs.budget) : "");
      setCurrency(inputs.currency || "RON");
      setDurationMonths(inputs.durationMonths != null ? String(inputs.durationMonths) : "");
      setDirty(false);
    } else if (draft === null) {
      setSections([]);
    }
  }, [draft]);

  const invalidateDraft = () => {
    queryClient.invalidateQueries({ queryKey: draftKey });
    globalQueryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
  };

  // Finalizare generare async — apelată O SINGURĂ dată (genDoneRef).
  // Sursa principală de adevăr = label-ul terminal din SSE (corelat cu operațiunea):
  //   - DRAFT_PROGRESS_DONE_LABEL  → succes
  //   - DRAFT_PROGRESS_ERROR_LABEL → eșec (creditele au fost returnate de server)
  // Dacă SSE nu a livrat un label terminal (stall/conexiune pierdută) → fallback pe
  // verificarea draftului proaspăt vs baseline.
  const finalizeGeneration = useCallback(async (finalLabel?: string) => {
    if (genDoneRef.current) return;
    genDoneRef.current = true;
    if (genStallTimerRef.current) {
      clearTimeout(genStallTimerRef.current);
      genStallTimerRef.current = null;
    }

    const label = finalLabel ?? genFinalLabelRef.current;
    let success: boolean;
    if (label === DRAFT_PROGRESS_DONE_LABEL) {
      success = true;
    } else if (label === DRAFT_PROGRESS_ERROR_LABEL) {
      success = false;
    } else {
      // Fallback (fără label terminal): inferăm din apariția/versiunea draftului.
      let fresh: DocumentDraft | null = null;
      try {
        const r = await refetchDraft();
        fresh = (r.data as DocumentDraft | null) ?? null;
      } catch {
        // ignorăm — tratat ca eșec mai jos
      }
      const base = genBaselineRef.current;
      success = !!fresh && (!base.existed || (fresh.version ?? 0) > base.version);
    }

    setGenerating(false);
    setGenProgressId(null);
    if (success) {
      invalidateDraft();
      setActiveTab("editare");
      toast({ title: "Draft generat", description: "Planul de afaceri a fost generat cu succes." });
    } else {
      globalQueryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      toast({
        title: "Eroare la generare",
        description: "Generarea a eșuat. Dacă au fost consumate credite, au fost returnate. Reîncearcă.",
        variant: "destructive",
      });
    }
  }, [refetchDraft, queryClient]);

  // Watchdog de STALL (nu cutoff wall-clock): se armează la pornire și se RE-armează
  // la fiecare eveniment de progres (vezi onProgress mai jos). Se declanșează doar
  // dacă NU mai vine niciun eveniment timp de STALL_MS (SSE picat + niciun progres) —
  // astfel o generare lentă, dar care emite progres pe secțiune, NU e marcată fals ca
  // eșec. Resetarea efectivă o face `armStallWatchdog`.
  const STALL_MS = 4 * 60 * 1000;
  const armStallWatchdog = useCallback(() => {
    if (genStallTimerRef.current) clearTimeout(genStallTimerRef.current);
    genStallTimerRef.current = setTimeout(() => { void finalizeGeneration(); }, STALL_MS);
  }, [finalizeGeneration, STALL_MS]);

  // Curăță timer-ul la unmount.
  useEffect(() => {
    return () => {
      if (genStallTimerRef.current) clearTimeout(genStallTimerRef.current);
    };
  }, []);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const pId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      genBaselineRef.current = { existed: !!draft, version: draft?.version ?? 0 };
      genDoneRef.current = false;
      genFinalLabelRef.current = undefined;
      setGenProgressId(pId);
      setGenerating(true);
      armStallWatchdog();
      const res = await apiRequest("POST", `/api/projects/${projectId}/drafts/generate`, {
        type: DRAFT_TYPE,
        projectIdea: projectIdea.trim(),
        budget: budget ? Number(budget) : null,
        currency,
        durationMonths: durationMonths ? Number(durationMonths) : null,
        progressId: pId,
      });
      return res.json();
    },
    onError: (err: any) => {
      // Eșec la pornire (POST-ul în sine, ex: 409 generare deja în curs) — oprește
      // starea de generare imediat și dezarmează watchdog-ul.
      if (genStallTimerRef.current) {
        clearTimeout(genStallTimerRef.current);
        genStallTimerRef.current = null;
      }
      setGenerating(false);
      setGenProgressId(null);
      genDoneRef.current = true;
      toast({ title: "Eroare la generare", description: err?.message || "Generarea a eșuat.", variant: "destructive" });
    },
    // Succesul real (draftul generat) e tratat de finalizeGeneration via SSE/watchdog.
    // POST-ul răspunde 202 imediat; NU finalizăm aici.
  });

  const regenerateSectionMutation = useMutation({
    mutationFn: async (sectionKey: string) => {
      const res = await apiRequest("POST", `/api/drafts/${draft!.id}/regenerate-section`, { sectionKey });
      return res.json();
    },
    onSuccess: () => {
      invalidateDraft();
      toast({ title: "Secțiune regenerată", description: "Conținutul secțiunii a fost actualizat." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err?.message || "Regenerarea a eșuat.", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (overrideSections?: DocumentDraftSection[]) => {
      const res = await apiRequest("PATCH", `/api/drafts/${draft!.id}`, { sections: overrideSections ?? sections });
      return res.json();
    },
    onSuccess: () => {
      invalidateDraft();
      setDirty(false);
      toast({ title: "Salvat", description: "Modificările au fost salvate." });
    },
    onError: (err: any) => {
      // Salvarea a eșuat → conținutul local rămâne modificat și nesalvat. Marchează `dirty`
      // ca utilizatorul să poată reîncerca și ca finalize/export/verificare să rămână blocate.
      setDirty(true);
      toast({ title: "Eroare", description: err?.message || "Salvarea a eșuat. Modificările NU au fost salvate.", variant: "destructive" });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (opts?: { silent?: boolean }) => {
      const res = await apiRequest("POST", `/api/drafts/${draft!.id}/finalize`, slotType ? { slotType } : {});
      const data = (await res.json()) as DocumentDraft & { documentId: string };
      return { ...data, __silent: opts?.silent ?? false };
    },
    onSuccess: (data) => {
      invalidateDraft();
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "documents"] });
      if (!data.__silent) {
        toast({
          title: "Finalizat și atașat",
          description: "Planul de afaceri a fost atașat la documentele proiectului (slot „Plan de afaceri”).",
        });
      }
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err?.message || "Finalizarea a eșuat.", variant: "destructive" });
    },
  });

  const conformityMutation = useMutation({
    mutationFn: async () => {
      // Reatașează ÎNTOTDEAUNA conținutul curent (finalize regenerează DOCX-ul din secțiunile
      // actuale) înainte de verificare, ca să nu rulăm conformitatea pe un DOCX vechi.
      const finalized = await finalizeMutation.mutateAsync({ silent: true });
      const documentId = finalized.documentId;
      const res = await apiRequest(
        "POST",
        `/api/projects/${projectId}/documents/${documentId}/check-conformity`,
        {},
      );
      return res.json();
    },
    onSuccess: (report: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "conformity-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "documents"] });
      globalQueryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      setActiveTab("verificare");
      toast({
        title: "Verificare conformitate finalizată",
        description: report?.verdict
          ? `Verdict: ${report.verdict}${report.score != null ? ` (scor ${report.score})` : ""}.`
          : "Raportul de conformitate este disponibil.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Eroare la verificare",
        description: err?.message || "Verificarea conformității a eșuat.",
        variant: "destructive",
      });
    },
  });

  const improveMutation = useMutation({
    mutationFn: async (payload: { recommendation?: string; instruction?: string }) => {
      const res = await apiRequest("POST", `/api/drafts/${draft!.id}/improve`, payload);
      return (await res.json()) as ImproveResult;
    },
    onSuccess: (result) => {
      globalQueryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      if (!result.changes || result.changes.length === 0) {
        toast({
          title: "Nicio modificare propusă",
          description: result.summary || "AI-ul a considerat că nu sunt necesare schimbări pentru această cerință.",
        });
        return;
      }
      setProposal(result);
      setAcceptedKeys(new Set(result.changes.map((c) => c.key)));
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err?.message || "Generarea propunerii AI a eșuat.", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionNumber: number) => {
      const res = await apiRequest("POST", `/api/drafts/${draft!.id}/restore/${versionNumber}`, {});
      return res.json();
    },
    onSuccess: () => {
      invalidateDraft();
      queryClient.invalidateQueries({ queryKey: [`/api/drafts/${draft?.id}/versions`] });
      setShowVersions(false);
      toast({ title: "Versiune restaurată", description: "Conținutul a fost readus la versiunea selectată." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err?.message || "Restaurarea a eșuat.", variant: "destructive" });
    },
  });

  const applyProposal = () => {
    if (!proposal) return;
    const accepted = proposal.changes.filter((c) => acceptedKeys.has(c.key));
    if (accepted.length === 0) {
      setProposal(null);
      return;
    }
    const byKey = new Map(accepted.map((c) => [c.key, c.newContent]));
    const merged = sections.map((s) => (byKey.has(s.key) ? { ...s, content: byKey.get(s.key)! } : s));
    setSections(merged);
    // Marchează nesalvat înainte de PATCH: dacă salvarea eșuează, conținutul aplicat rămâne
    // vizibil ca „nesalvat" (saveMutation.onError menține dirty), iar finalize/verificare rămân blocate.
    setDirty(true);
    setProposal(null);
    saveMutation.mutate(merged);
  };

  const handleExport = async (format: "docx" | "pdf") => {
    if (!draft) return;
    setExporting(format);
    try {
      const res = await apiRequest("POST", `/api/drafts/${draft.id}/export`, { format });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(draft.title || "plan-de-afaceri").replace(/[^a-z0-9\- ]/gi, "").trim() || "draft"}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Eroare la export", description: err?.message || "Exportul a eșuat.", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const updateSection = (key: string, content: string) => {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, content } : s)));
    setDirty(true);
  };

  const hasDraft = !!draft && sections.length > 0;
  const busy =
    generating ||
    generateMutation.isPending ||
    regenerateSectionMutation.isPending ||
    saveMutation.isPending ||
    finalizeMutation.isPending ||
    conformityMutation.isPending ||
    improveMutation.isPending ||
    restoreMutation.isPending;
  const isFinalized = draft?.status === "finalized";
  const fmtMoney = (v: number) => new Intl.NumberFormat("ro-RO").format(v);

  // Etapa curentă pentru stepper-ul de ghidare.
  const currentStage: Stage = !hasDraft
    ? "generare"
    : isFinalized
    ? "finalizare"
    : latestReport
    ? "verificare"
    : "imbunatatire";
  const stageOrder: Stage[] = ["generare", "imbunatatire", "verificare", "finalizare"];
  const stageLabels: Record<Stage, string> = {
    generare: "Generare",
    imbunatatire: "Îmbunătățire",
    verificare: "Verificare",
    finalizare: "Finalizare",
  };
  const currentStageIdx = stageOrder.indexOf(currentStage);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-document-draft">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Asistent redactare — Plan de afaceri
            </DialogTitle>
            <DialogDescription>
              {hasDraft
                ? "Editează, îmbunătățește cu AI pe baza recomandărilor, verifică conformitatea și finalizează."
                : "Completează câteva detalii despre proiect. Restul informațiilor sunt preluate automat din profilul companiei și al apelului."}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper de etape — vizibil mereu pentru orientare */}
          <div className="flex items-center gap-1 text-xs" data-testid="draft-stage-stepper">
            {stageOrder.map((stage, idx) => (
              <div key={stage} className="flex items-center gap-1">
                <span
                  className={`px-2 py-0.5 rounded-full border ${
                    idx === currentStageIdx
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : idx < currentStageIdx
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                  data-testid={`stage-${stage}`}
                >
                  {idx + 1}. {stageLabels[stage]}
                </span>
                {idx < stageOrder.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {/* Progres generare draft (async) — vizibil cât timp rulează generarea în fundal */}
          {generating && (
            <ProgressStepper
              operationId={genProgressId}
              steps={draftSteps}
              isActive={generating}
              onProgress={(d) => {
                // Reține label-ul terminal + re-armează watchdog-ul (semn de viață).
                if (d.label) genFinalLabelRef.current = d.label;
                armStallWatchdog();
              }}
              onComplete={(finalLabel) => { void finalizeGeneration(finalLabel); }}
            />
          )}

          {draftLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasDraft ? (
            <div className="space-y-4 overflow-y-auto pr-1">
              {context && (context.company || context.call) && (
                <Card className="p-3 bg-muted/40 space-y-2" data-testid="card-draft-context">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5" />
                    Date preluate automat (folosite la generare)
                  </div>
                  {context.company && (
                    <div className="text-xs space-y-1" data-testid="text-context-company">
                      <p className="font-medium text-foreground">{context.company.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {context.company.caen && (
                          <Badge variant="outline" className="text-[10px]">
                            CAEN {context.company.caen}
                            {context.company.caenDescription ? ` — ${context.company.caenDescription}` : ""}
                          </Badge>
                        )}
                        {context.company.employees != null && (
                          <Badge variant="outline" className="text-[10px]">{context.company.employees} angajați</Badge>
                        )}
                        {context.company.revenue != null && (
                          <Badge variant="outline" className="text-[10px]">CA {fmtMoney(context.company.revenue)} RON</Badge>
                        )}
                        {(context.company.judet || context.company.localitate) && (
                          <Badge variant="outline" className="text-[10px]">
                            {[context.company.localitate, context.company.judet].filter(Boolean).join(", ")}
                          </Badge>
                        )}
                        <Badge variant={context.company.hasAiProfile ? "secondary" : "outline"} className="text-[10px]">
                          {context.company.hasAiProfile ? "Profil AI disponibil" : "Fără profil AI"}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {context.call && (
                    <div className="text-xs space-y-1 border-t border-border/60 pt-2" data-testid="text-context-call">
                      <p className="font-medium text-foreground">Apel: {context.call.name}</p>
                      {context.call.summary && (
                        <p className="text-muted-foreground line-clamp-3">{context.call.summary}</p>
                      )}
                    </div>
                  )}
                </Card>
              )}
              <div className="space-y-2">
                <Label htmlFor="draft-idea">Ideea de proiect *</Label>
                <Textarea
                  id="draft-idea"
                  data-testid="input-draft-idea"
                  placeholder="Descrie pe scurt ce vrei să realizezi prin acest proiect..."
                  value={projectIdea}
                  onChange={(e) => setProjectIdea(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="draft-budget">Buget estimat</Label>
                  <Input
                    id="draft-budget"
                    data-testid="input-draft-budget"
                    type="number"
                    placeholder="ex. 500000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="draft-currency">Monedă</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="draft-currency" data-testid="select-draft-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RON">RON</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="draft-duration">Durată (luni)</Label>
                  <Input
                    id="draft-duration"
                    data-testid="input-draft-duration"
                    type="number"
                    placeholder="ex. 24"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Versiunea {draft.version}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVersions(true)}
                    disabled={busy}
                    data-testid="button-show-versions"
                  >
                    <History className="w-3.5 h-3.5 mr-1" /> Istoric versiuni
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("docx")}
                    disabled={!!exporting || dirty}
                    data-testid="button-export-docx"
                  >
                    {exporting === "docx" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1" />}
                    DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("pdf")}
                    disabled={!!exporting || dirty}
                    data-testid="button-export-pdf"
                  >
                    {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1" />}
                    PDF
                  </Button>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="editare" data-testid="tab-editare">
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editare
                  </TabsTrigger>
                  <TabsTrigger value="imbunatatire" data-testid="tab-imbunatatire">
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Îmbunătățire AI
                  </TabsTrigger>
                  <TabsTrigger value="verificare" data-testid="tab-verificare">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Verificare
                    {draftReports.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">{draftReports.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* ── EDITARE ── */}
                <TabsContent value="editare" className="overflow-y-auto pr-1 flex-1 mt-3 space-y-4">
                  {dirty && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Ai modificări nesalvate. Salvează înainte de export sau verificare.
                    </p>
                  )}
                  {sections.map((s) => (
                    <Card key={s.key} className="p-4 space-y-2" data-testid={`card-draft-section-${s.key}`}>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold">{s.order}. {s.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmRegenSection(s.key)}
                          disabled={busy}
                          data-testid={`button-regenerate-${s.key}`}
                        >
                          {regenerateSectionMutation.isPending && regenerateSectionMutation.variables === s.key ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          )}
                          Regenerează
                        </Button>
                      </div>
                      <Textarea
                        value={s.content}
                        onChange={(e) => updateSection(s.key, e.target.value)}
                        rows={8}
                        className="text-sm font-normal leading-relaxed"
                        data-testid={`textarea-section-${s.key}`}
                      />
                    </Card>
                  ))}
                </TabsContent>

                {/* ── ÎMBUNĂTĂȚIRE AI ── */}
                <TabsContent value="imbunatatire" className="overflow-y-auto pr-1 flex-1 mt-3 space-y-4">
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Wand2 className="w-4 h-4 text-primary" /> Cere o ajustare în cuvintele tale
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Descrie ce vrei schimbat (ex: „Detaliază mai mult proiecțiile financiare pe primii 3 ani"). AI-ul
                      identifică secțiunea potrivită și propune o variantă pe care o accepți sau o respingi. Costă {improveCost} credite.
                    </p>
                    <Textarea
                      placeholder="Scrie aici instrucțiunea ta..."
                      value={freeInstruction}
                      onChange={(e) => setFreeInstruction(e.target.value)}
                      rows={3}
                      data-testid="input-free-instruction"
                      disabled={busy}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => setPendingImprove({ instruction: freeInstruction.trim() })}
                        disabled={busy || dirty || !freeInstruction.trim()}
                        data-testid="button-apply-instruction"
                      >
                        {improveMutation.isPending && pendingImprove?.instruction ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Propune cu AI
                      </Button>
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="w-4 h-4 text-primary" /> Recomandări din ultima verificare
                    </div>
                    {dirty && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Salvează modificările curente înainte de a folosi „Rezolvă cu AI".
                      </p>
                    )}
                    {!latestReport ? (
                      <Card className="p-4 text-center text-xs text-muted-foreground" data-testid="empty-no-recommendations">
                        Nu există încă o verificare de conformitate. Rulează verificarea în tab-ul „Verificare" pentru a
                        primi recomandări pe care le poți rezolva direct cu AI.
                      </Card>
                    ) : latestReport.recommendations.length === 0 ? (
                      <Card className="p-4 text-center text-xs text-muted-foreground" data-testid="empty-recommendations">
                        Ultima verificare nu a returnat recomandări. 🎉
                      </Card>
                    ) : (
                      latestReport.recommendations.map((rec, idx) => (
                        <Card key={idx} className="p-3 flex items-start justify-between gap-3" data-testid={`card-recommendation-${idx}`}>
                          <p className="text-xs leading-relaxed flex-1">{rec}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={() => setPendingImprove({ recommendation: rec })}
                            disabled={busy || dirty}
                            data-testid={`button-resolve-recommendation-${idx}`}
                          >
                            {improveMutation.isPending && pendingImprove?.recommendation === rec ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Rezolvă cu AI
                          </Button>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* ── VERIFICARE ── */}
                <TabsContent value="verificare" className="overflow-y-auto pr-1 flex-1 mt-3 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="w-4 h-4 text-primary" /> Analiză de conformitate
                    </div>
                    <Button
                      size="sm"
                      onClick={() => conformityMutation.mutate()}
                      disabled={busy || dirty}
                      data-testid="button-check-conformity-draft"
                    >
                      {conformityMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {latestReport ? "Re-verifică" : "Verifică conformitatea"}
                    </Button>
                  </div>
                  {dirty && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Ai modificări nesalvate. Salvează-le pentru ca verificarea să ruleze pe conținutul curent.
                    </p>
                  )}

                  {!latestReport ? (
                    <Card className="p-6 text-center text-xs text-muted-foreground" data-testid="empty-conformity">
                      Nu ai rulat încă verificarea de conformitate pe acest draft. Apasă „Verifică conformitatea" pentru a
                      obține un verdict, un scor și recomandări.
                    </Card>
                  ) : (
                    <>
                      <Card className="p-4 space-y-3" data-testid="card-latest-report">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-xs ${verdictTone(latestReport.verdict)}`} data-testid="badge-verdict">
                            {latestReport.verdict || "—"}
                          </Badge>
                          {latestReport.score != null && (
                            <Badge variant="secondary" className="text-xs" data-testid="badge-score">Scor: {latestReport.score}/100</Badge>
                          )}
                          {scoreDelta != null && (
                            <span
                              className={`flex items-center gap-1 text-xs font-medium ${
                                scoreDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : scoreDelta < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                              }`}
                              data-testid="text-score-delta"
                            >
                              {scoreDelta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : scoreDelta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                              {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} față de verificarea anterioară
                            </span>
                          )}
                        </div>
                        {latestReport.summary && <p className="text-xs leading-relaxed text-muted-foreground">{latestReport.summary}</p>}

                        {latestReport.missingElements.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" /> Elemente lipsă
                            </div>
                            <ul className="list-disc list-inside text-xs space-y-0.5 text-muted-foreground">
                              {latestReport.missingElements.map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                          </div>
                        )}

                        {latestReport.recommendations.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold">Recomandări</div>
                            <ul className="list-disc list-inside text-xs space-y-0.5 text-muted-foreground">
                              {latestReport.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-xs text-primary hover:bg-transparent hover:underline"
                              onClick={() => setActiveTab("imbunatatire")}
                              data-testid="link-go-improve"
                            >
                              Rezolvă recomandările cu AI →
                            </Button>
                          </div>
                        )}
                      </Card>

                      {draftReports.length > 1 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-muted-foreground">Istoricul verificărilor</div>
                          {draftReports.slice().reverse().map((r) => (
                            <div key={r.id} className="flex items-center justify-between gap-2 text-xs border border-border/60 rounded px-2 py-1.5" data-testid={`history-report-${r.id}`}>
                              <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleString("ro-RO")}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${verdictTone(r.verdict)}`}>{r.verdict || "—"}</Badge>
                                {r.score != null && <span className="font-medium">{r.score}/100</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {!hasDraft ? (
              <Button
                onClick={() => setConfirmGenerate(true)}
                disabled={!projectIdea.trim() || busy}
                data-testid="button-generate-draft"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                {generating ? "Se generează…" : "Generează draft cu AI"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setConfirmGenerate(true)}
                  disabled={busy}
                  data-testid="button-regenerate-all"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {generating ? "Se generează…" : "Regenerează tot"}
                </Button>
                <Button onClick={() => saveMutation.mutate(undefined)} disabled={!dirty || busy} data-testid="button-save-draft">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvează
                </Button>
                <Button
                  onClick={() => finalizeMutation.mutate({})}
                  disabled={busy || dirty}
                  data-testid="button-finalize-draft"
                >
                  {finalizeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  {isFinalized ? "Reatașează" : "Finalizează și atașează"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmare credite — generare / regenerare tot */}
      <CreditConfirmDialog
        open={confirmGenerate}
        onOpenChange={setConfirmGenerate}
        onConfirm={() => {
          setConfirmGenerate(false);
          generateMutation.mutate();
        }}
        actionLabel={hasDraft ? "Regenerarea completă a planului de afaceri" : "Generarea planului de afaceri"}
        creditCost={generateCost}
        isPending={generateMutation.isPending || generating}
      />

      {/* Confirmare credite — regenerare secțiune */}
      <CreditConfirmDialog
        open={!!confirmRegenSection}
        onOpenChange={(o) => !o && setConfirmRegenSection(null)}
        onConfirm={() => {
          const key = confirmRegenSection!;
          setConfirmRegenSection(null);
          regenerateSectionMutation.mutate(key);
        }}
        actionLabel="Regenerarea secțiunii"
        creditCost={sectionCost}
        isPending={regenerateSectionMutation.isPending}
      />

      {/* Confirmare credite — îmbunătățire AI (recomandare sau instrucțiune) */}
      <CreditConfirmDialog
        open={!!pendingImprove}
        onOpenChange={(o) => !o && setPendingImprove(null)}
        onConfirm={() => {
          const payload = pendingImprove!;
          improveMutation.mutate(payload);
          setPendingImprove(null);
        }}
        actionLabel="Propunerea AI de îmbunătățire"
        creditCost={improveCost}
        isPending={improveMutation.isPending}
      />

      {/* Revizuire propunere AI (vechi vs nou) */}
      <Dialog open={!!proposal} onOpenChange={(o) => !o && setProposal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-improve-proposal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" /> Propunere de îmbunătățire
            </DialogTitle>
            <DialogDescription>{proposal?.summary || "Revizuiește schimbările propuse și alege ce aplici."}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto pr-1 flex-1 space-y-4">
            {proposal?.changes.map((c) => (
              <Card key={c.key} className="p-4 space-y-2" data-testid={`proposal-change-${c.key}`}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`accept-${c.key}`}
                    checked={acceptedKeys.has(c.key)}
                    onCheckedChange={(checked) => {
                      setAcceptedKeys((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(c.key);
                        else next.delete(c.key);
                        return next;
                      });
                    }}
                    data-testid={`checkbox-accept-${c.key}`}
                  />
                  <Label htmlFor={`accept-${c.key}`} className="text-sm font-semibold cursor-pointer">{c.title}</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">Înainte</div>
                    <div className="text-xs whitespace-pre-wrap leading-relaxed bg-muted/40 rounded p-2 max-h-48 overflow-y-auto" data-testid={`old-content-${c.key}`}>
                      {c.oldContent || "(gol)"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">După (propus)</div>
                    <div className="text-xs whitespace-pre-wrap leading-relaxed bg-emerald-500/10 rounded p-2 max-h-48 overflow-y-auto" data-testid={`new-content-${c.key}`}>
                      {c.newContent}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProposal(null)} data-testid="button-reject-proposal">
              Respinge
            </Button>
            <Button onClick={applyProposal} disabled={acceptedKeys.size === 0 || saveMutation.isPending} data-testid="button-accept-proposal">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Acceptă și aplică ({acceptedKeys.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Istoric versiuni + restaurare */}
      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-versions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Istoric versiuni
            </DialogTitle>
            <DialogDescription>Revino la o versiune anterioară a draftului. Conținutul curent devine o nouă versiune.</DialogDescription>
          </DialogHeader>
          {dirty && (
            <p className="text-xs text-amber-600 dark:text-amber-400" data-testid="warning-restore-dirty">
              Ai modificări nesalvate. Salvează sau renunță la ele înainte de a restaura o versiune (altfel s-ar pierde).
            </p>
          )}
          <div className="overflow-y-auto pr-1 flex-1 space-y-2">
            {versionsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : !versions || versions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6" data-testid="empty-versions">Nu există versiuni salvate.</p>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2 border border-border/60 rounded px-3 py-2" data-testid={`version-${v.versionNumber}`}>
                  <div className="text-xs">
                    <span className="font-medium">Versiunea {v.versionNumber}</span>
                    {draft?.version === v.versionNumber && <Badge variant="secondary" className="ml-2 text-[10px]">curentă</Badge>}
                    <div className="text-muted-foreground">{new Date(v.createdAt).toLocaleString("ro-RO")}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreMutation.mutate(v.versionNumber)}
                    disabled={busy || dirty || draft?.version === v.versionNumber}
                    data-testid={`button-restore-${v.versionNumber}`}
                  >
                    {restoreMutation.isPending && restoreMutation.variables === v.versionNumber ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    )}
                    Restaurează
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
