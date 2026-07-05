import { useState, useMemo, useEffect, useRef } from "react";
import { ProgressStepper } from "@/components/progress-stepper";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  CheckCircle2, XCircle, AlertTriangle, HelpCircle, Search,
  Building2, FileText, Sparkles, Loader2, ChevronDown, ChevronUp,
  BookOpen, ChevronsUpDown, Check, Calendar, Download, FolderPlus,
  Shield, ThumbsUp, ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSearch } from "wouter";
import { useLocation } from "wouter";
import type { Company } from "@shared/schema";
import { getCompanyLegalState, TERMINAL_WARNING_MESSAGE } from "@shared/company-legal-state";
import { MicroSurvey } from "@/components/micro-survey";
import { useSurveyTrigger } from "@/hooks/use-survey-trigger";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import { exportEligibilityPDF } from "@/lib/export-pdf";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { getActionCost, CREDIT_ACTION, type CreditCostRow } from "@/lib/credit-costs";


interface CombinedApel {
  id: string;
  titlu: string;
  source: "catalog";
  program?: string | null;
  deadline?: string | null;
  status?: string | null;
}

interface EligibilityCriterion {
  criteriu: string;
  status: "îndeplinit" | "neîndeplinit" | "necesită verificare";
  detalii: string;
}

interface DualAgentPoint {
  title: string;
  detail: string;
  section?: string;
}

interface DualAnalysis {
  optimist: { points: DualAgentPoint[]; summary: string };
  skeptic: { points: DualAgentPoint[]; summary: string };
  hasDualAnalysis: boolean;
  ragSectionsUsed: number;
}

interface EligibilityResult {
  verdict: "ELIGIBIL" | "NEELIGIBIL" | "PARȚIAL ELIGIBIL" | "DATE INSUFICIENTE";
  score: number;
  summary: string;
  criteria: EligibilityCriterion[];
  recommendations: string[];
  sources?: Array<{ content: string; similarity: number }>;
  sourceType?: string;
  dualAnalysis?: DualAnalysis;
  cached?: boolean;
  cachedMessage?: string;
}

async function exportPDF(
  result: EligibilityResult,
  companyData: Company | undefined,
  apelData: CombinedApel | undefined,
) {
  await exportEligibilityPDF(
    {
      verdict: result.verdict,
      score: result.score,
      summary: result.summary,
      criteria: result.criteria,
      recommendations: result.recommendations,
      dualAnalysis: result.dualAnalysis,
    },
    companyData ? { name: companyData.name, cui: companyData.cui, caen: companyData.caen, employees: companyData.employees, revenue: companyData.revenue } : undefined,
    apelData ? { titlu: apelData.titlu, program: apelData.program, deadline: apelData.deadline } : undefined,
  );
}

const verdictConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  "ELIGIBIL": { color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800", icon: CheckCircle2 },
  "NEELIGIBIL": { color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", icon: XCircle },
  "PARȚIAL ELIGIBIL": { color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800", icon: AlertTriangle },
  "DATE INSUFICIENTE": { color: "text-gray-700 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700", icon: HelpCircle },
};

function normalizeStatus(status: string): "pass" | "fail" | "warn" {
  const s = (status || "").toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/î/g, "i").replace(/ă/g, "a").replace(/ț/g, "t").replace(/ș/g, "s");
  if (s.includes("neindeplinit") || s === "nu" || s === "fail") return "fail";
  if (s.includes("indeplinit") || s === "da" || s === "pass" || s === "ok") return "pass";
  return "warn";
}

function StatusIcon({ status, className }: { status: string; className?: string }) {
  const norm = normalizeStatus(status);
  if (norm === "pass") return <CheckCircle2 className={className + " text-green-600 dark:text-green-400"} />;
  if (norm === "fail") return <XCircle className={className + " text-red-500"} />;
  return <AlertTriangle className={className + " text-yellow-600 dark:text-yellow-400"} />;
}

function getStatusLabel(status: string): { label: string; variant: "default" | "destructive" | "secondary" } {
  const norm = normalizeStatus(status);
  if (norm === "pass") return { label: "îndeplinit", variant: "default" };
  if (norm === "fail") return { label: "neîndeplinit", variant: "destructive" };
  return { label: "necesită verificare", variant: "secondary" };
}

const ELIG_POLL_INTERVAL_MS = 4000;
const ELIG_POLL_MAX_MS = 4 * 60 * 1000;

function reportToResult(r: any, extra: Partial<EligibilityResult> = {}): EligibilityResult {
  return {
    verdict: r.verdict,
    score: r.verdictScore,
    summary: r.verdictSummary || "",
    criteria: r.criteria || [],
    recommendations: r.recommendations || [],
    sources: [],
    dualAnalysis: r.hasDualAnalysis ? {
      optimist: r.optimistAnalysis,
      skeptic: r.skepticAnalysis,
      hasDualAnalysis: true,
      ragSectionsUsed: r.ragSectionsUsed,
    } : undefined,
    ...extra,
  };
}

export default function EligibilityPage() {
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlCompanyId = urlParams.get("companyId") || "";
  const urlCallId = urlParams.get("callId") || "";

  const [selectedCompany, setSelectedCompany] = useState(urlCompanyId);
  const [selectedApel, setSelectedApel] = useState("");
  const [preselected, setPreselected] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const eligibilitySurvey = useSurveyTrigger({
    event: "eligibility_verdict",
    enabled: !!result,
    delayMs: 2000,
  });
  const [showSources, setShowSources] = useState(false);
  const [usingCachedReport, setUsingCachedReport] = useState(false);
  const [eligibilityProgressId, setEligibilityProgressId] = useState<string | null>(null);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [confirmTerminalRun, setConfirmTerminalRun] = useState(false);
  const [waitingForReport, setWaitingForReport] = useState(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDeadlineRef = useRef<number>(0);
  const pollSessionRef = useRef(0);
  const checkStartedAtRef = useRef<number>(0);
  const checkBaselineReportIdRef = useRef<string | null>(null);
  const checkCompanyRef = useRef<string>("");
  const checkApelRef = useRef<string | undefined>(undefined);

  const { data: companies, isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: fundingCalls, isLoading: loadingFundingCalls } = useQuery<any[]>({
    queryKey: ["/api/funding-calls-list"],
    queryFn: async () => {
      const res = await fetch("/api/funding-calls-list", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [apelSearchOpen, setApelSearchOpen] = useState(false);

  const combinedApeluri: CombinedApel[] = useMemo(() => [
    ...(fundingCalls?.map((fc) => ({
      id: `catalog:${fc.id}`,
      titlu: fc.name,
      source: "catalog" as const,
      program: fc.program || fc.source,
      deadline: fc.deadline ? String(fc.deadline) : null,
      status: fc.status,
    })) || []),
  ], [fundingCalls]);

  useEffect(() => {
    if (urlCallId && combinedApeluri.length > 0 && !preselected) {
      const catalogMatch = combinedApeluri.find((a) => a.id === `catalog:${urlCallId}`);
      if (catalogMatch) {
        setSelectedApel(catalogMatch.id);
        setPreselected(true);
      }
    }
  }, [urlCallId, combinedApeluri, preselected]);

  useEffect(() => {
    if (urlCompanyId && !selectedCompany) {
      setSelectedCompany(urlCompanyId);
    }
  }, [urlCompanyId]);

  const [, setLocation] = useLocation();
  const selectedApelData = combinedApeluri.find((a) => a.id === selectedApel);

  const { data: creditCosts } = useQuery<CreditCostRow[]>({ queryKey: ["/api/credits/costs"] });
  const eligibilityCost = getActionCost(creditCosts, CREDIT_ACTION.eligibilityCheck, 3);

  const realApelIdForCheck = selectedApel ? selectedApel.replace(/^(supabase|catalog):/, "") : "";
  const { data: existingReport, isLoading: loadingExistingReport } = useQuery<{
    exists: boolean;
    report?: {
      id: string;
      verdict: string;
      verdictScore: number;
      verdictSummary: string;
      optimistAnalysis: any;
      skepticAnalysis: any;
      hasDualAnalysis: boolean;
      ragSectionsUsed: number;
      criteria: any;
      recommendations: any;
      createdAt: string;
    };
  }>({
    queryKey: ["/api/eligibility-reports/existing", { companyId: selectedCompany, fundingCallId: realApelIdForCheck }],
    queryFn: async () => {
      const params = new URLSearchParams({ companyId: selectedCompany });
      if (realApelIdForCheck) params.set("fundingCallId", realApelIdForCheck);
      const res = await fetch(`/api/eligibility-reports/existing?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to check");
      return res.json();
    },
    enabled: !!selectedCompany && !!realApelIdForCheck,
  });

  const loadExistingReport = () => {
    if (existingReport?.report) {
      setResult({
        verdict: existingReport.report.verdict as EligibilityResult["verdict"],
        score: existingReport.report.verdictScore,
        summary: existingReport.report.verdictSummary || "",
        criteria: (existingReport.report.criteria as EligibilityCriterion[]) || [],
        recommendations: (existingReport.report.recommendations as string[]) || [],
        sources: [],
        dualAnalysis: existingReport.report.hasDualAnalysis ? {
          optimist: existingReport.report.optimistAnalysis,
          skeptic: existingReport.report.skepticAnalysis,
          hasDualAnalysis: true,
          ragSectionsUsed: existingReport.report.ragSectionsUsed,
        } : undefined,
      });
      setUsingCachedReport(true);
    }
  };

  const stopPolling = () => {
    pollSessionRef.current += 1;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  const beginWaitingForFreshReport = (companyId: string, apelId: string | undefined, startedAt: number, baselineId: string | null) => {
    stopPolling();
    if (!companyId) {
      setWaitingForReport(false);
      return;
    }
    const session = pollSessionRef.current;
    setWaitingForReport(true);
    setEligibilityProgressId(null);
    pollDeadlineRef.current = Date.now() + ELIG_POLL_MAX_MS;
    const tick = async () => {
      if (pollSessionRef.current !== session) return;
      if (Date.now() > pollDeadlineRef.current) {
        stopPolling();
        setWaitingForReport(false);
        toast({ title: "Se procesează", description: "Analiza continuă în fundal. Vei primi o notificare când raportul este gata." });
        return;
      }
      try {
        const params = new URLSearchParams({ companyId });
        if (apelId) params.set("fundingCallId", apelId);
        const res = await fetch(`/api/eligibility-reports/existing?${params}`, { credentials: "include" });
        if (pollSessionRef.current !== session) return;
        if (res.ok) {
          const data = await res.json();
          if (pollSessionRef.current !== session) return;
          const isFresh = data?.exists && data.report
            && data.report.id !== baselineId
            && (baselineId !== null || new Date(data.report.createdAt).getTime() >= startedAt - 30000);
          if (isFresh) {
            stopPolling();
            setResult(reportToResult(data.report));
            setUsingCachedReport(false);
            setWaitingForReport(false);
            queryClient.invalidateQueries({ queryKey: ["/api/eligibility-reports/existing"] });
            queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
            toast({ title: "Raport gata", description: "Verdictul de eligibilitate a fost actualizat automat." });
            return;
          }
        }
      } catch {}
      if (pollSessionRef.current !== session) return;
      pollTimeoutRef.current = setTimeout(tick, ELIG_POLL_INTERVAL_MS);
    };
    pollTimeoutRef.current = setTimeout(tick, ELIG_POLL_INTERVAL_MS);
  };

  useEffect(() => () => stopPolling(), []);

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompany || !selectedApel) throw new Error("Selectează compania și apelul");
      const fundingCallId = selectedApel.replace(/^(supabase|catalog):/, "");
      const res = await apiRequest("POST", "/api/projects", {
        companyId: selectedCompany,
        fundingCallId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Proiect creat", description: "Proiectul a fost inițiat cu succes." });
      setLocation(`/projects/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });


  const eligibilityMutation = useMutation({
    mutationFn: async () => {
      stopPolling();
      setWaitingForReport(false);
      checkStartedAtRef.current = Date.now();
      checkBaselineReportIdRef.current = existingReport?.report?.id ?? null;
      const pId = `elig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setEligibilityProgressId(pId);
      const realApelId = selectedApel ? selectedApel.replace(/^(supabase|catalog):/, "") : undefined;
      checkCompanyRef.current = selectedCompany;
      checkApelRef.current = realApelId;
      const res = await apiRequest("POST", "/api/eligibility-check", {
        companyId: selectedCompany,
        apelId: realApelId,
        question: customQuestion || undefined,
        progressId: pId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const runCompanyId = checkCompanyRef.current;
      const realApelId = checkApelRef.current;
      // 202: serverul a depășit timeout-ul sincron, AI continuă în fundal — încă nu există verdict.
      if (data?.processing || !data?.verdict) {
        setEligibilityProgressId(null);
        beginWaitingForFreshReport(runCompanyId, realApelId, checkStartedAtRef.current, checkBaselineReportIdRef.current);
        toast({ title: "Se procesează", description: "Analiza durează mai mult decât de obicei. Raportul se va afișa automat aici când este gata." });
        return;
      }
      // Serverul a returnat un raport anterior (stale) cât timp noua analiză rulează în fundal.
      if (data?.cached) {
        setResult(data);
        setUsingCachedReport(true);
        setEligibilityProgressId(null);
        beginWaitingForFreshReport(runCompanyId, realApelId, checkStartedAtRef.current, checkBaselineReportIdRef.current);
        return;
      }
      // Rezultat proaspăt și complet.
      setResult(data);
      setUsingCachedReport(false);
      setWaitingForReport(false);
      setEligibilityProgressId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/eligibility-reports/existing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
    },
    onError: async (error: Error) => {
      const status = (error as any).status;
      if (status === 402) {
        setEligibilityProgressId(null);
        toast({ title: "Credite insuficiente", description: error.message, variant: "destructive" });
        return;
      }
      if (status === 429) {
        setEligibilityProgressId(null);
        toast({ title: "Limită AI atinsă", description: error.message || "Ai atins limita de operațiuni AI. Încearcă din nou mai târziu.", variant: "destructive" });
        return;
      }
      const runCompanyId = checkCompanyRef.current;
      const realApelId = checkApelRef.current;
      const isTimeout = status === 504 || /timeout|Gateway|prea mult/i.test(error.message || "");
      let placeholderShown = false;
      if (runCompanyId && realApelId) {
        try {
          const cachedRes = await fetch(`/api/eligibility-reports/existing?companyId=${runCompanyId}&fundingCallId=${realApelId}`, { credentials: "include" });
          if (cachedRes.ok) {
            const cachedData = await cachedRes.json();
            if (cachedData.exists && cachedData.report) {
              setResult(reportToResult(cachedData.report, {
                cached: true,
                cachedMessage: isTimeout
                  ? "Analiza durează mai mult decât de obicei. Se procesează în fundal — raportul se va actualiza automat. Între timp, se afișează ultimul raport salvat."
                  : "Eroare la analiză. Se afișează ultimul raport salvat.",
              }));
              setUsingCachedReport(true);
              placeholderShown = true;
            }
          }
        } catch {}
      }
      if (isTimeout) {
        beginWaitingForFreshReport(runCompanyId, realApelId, checkStartedAtRef.current, checkBaselineReportIdRef.current);
        if (!placeholderShown) {
          toast({ title: "Se procesează", description: "Analiza durează mai mult, dar continuă în fundal. Raportul se va afișa automat aici când este gata." });
        }
      } else {
        setEligibilityProgressId(null);
        setWaitingForReport(false);
        if (placeholderShown) {
          toast({ title: "Eroare", description: "Se afișează ultimul raport salvat." });
        } else {
          toast({ title: "Eroare", description: error.message || "Nu s-a putut verifica eligibilitatea.", variant: "destructive" });
        }
      }
    },
  });

  const selectedCompanyData = companies?.find((c) => c.id === selectedCompany);
  const verdictInfo = result ? verdictConfig[result.verdict] || verdictConfig["DATE INSUFICIENTE"] : null;

  const getApelRealId = () => selectedApel.replace(/^(supabase|catalog):/, "");

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-serif font-bold tracking-tight" data-testid="text-eligibility-title">
          Verificare eligibilitate
        </h1>
        <p className="text-muted-foreground">
          Analizează eligibilitatea companiei tale pentru un apel de finanțare, pe baza ghidurilor oficiale.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="w-4 h-4 text-primary" />
            Selectează compania
          </div>
          {loadingCompanies ? (
            <Skeleton className="h-10" />
          ) : (
            <Popover open={companySearchOpen} onOpenChange={setCompanySearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={companySearchOpen}
                  className="w-full justify-between font-normal h-auto min-h-10 py-2"
                  data-testid="select-company"
                >
                  {selectedCompanyData ? (
                    <span className="truncate text-sm">{selectedCompanyData.name} ({selectedCompanyData.cui})</span>
                  ) : (
                    <span className="text-muted-foreground">Caută și selectează o companie...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[500px] max-h-[60vh] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Caută după nume, CUI..." data-testid="input-search-company" />
                  <CommandList>
                    <CommandEmpty>Nicio companie găsită.</CommandEmpty>
                    <CommandGroup heading="Companii">
                      {companies?.filter((c) => c.status === "active").map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.cui}`}
                          onSelect={() => {
                            setSelectedCompany(c.id === selectedCompany ? "" : c.id);
                            setCompanySearchOpen(false);
                            setResult(null); setUsingCachedReport(false);
                            setConfirmTerminalRun(false);
                            stopPolling(); setWaitingForReport(false);
                          }}
                          className="flex items-center gap-2 py-2"
                          data-testid={`company-option-${c.id}`}
                        >
                          <Check className={`h-4 w-4 shrink-0 ${selectedCompany === c.id ? "opacity-100" : "opacity-0"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground">CUI: {c.cui}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          {selectedCompanyData && (
            <div className="text-xs text-muted-foreground space-y-0.5 pl-1">
              <p>CAEN: {selectedCompanyData.caen || "—"}</p>
              <p>Angajați: {selectedCompanyData.employees || "—"}</p>
              <p>Cifra de afaceri: {selectedCompanyData.revenue ? `${Number(selectedCompanyData.revenue).toLocaleString("ro-RO")} RON` : "—"}</p>
            </div>
          )}
          {selectedCompanyData && getCompanyLegalState(selectedCompanyData.stareFirma).isTerminal && (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3" data-testid="warning-eligibility-terminal">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-destructive">{getCompanyLegalState(selectedCompanyData.stareFirma).label}</p>
                  <p className="text-xs text-destructive/90">{TERMINAL_WARNING_MESSAGE}</p>
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-destructive cursor-pointer" data-testid="checkbox-confirm-terminal-label">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-destructive"
                  checked={confirmTerminalRun}
                  onChange={(e) => setConfirmTerminalRun(e.target.checked)}
                  data-testid="checkbox-confirm-terminal"
                />
                <span>Înțeleg că această firmă figurează ca radiată/inactivă și doresc totuși să rulez verificarea.</span>
              </label>
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="w-4 h-4 text-primary" />
            Apel de finanțare
          </div>

          {loadingFundingCalls ? (
            <Skeleton className="h-10" />
          ) : (
            <Popover open={apelSearchOpen} onOpenChange={setApelSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={apelSearchOpen}
                  className="w-full justify-between font-normal h-auto min-h-10 py-2"
                  data-testid="select-apel"
                >
                  {selectedApelData ? (
                    <div className="flex items-center gap-2 text-left min-w-0">
                      <span className="truncate text-sm">{selectedApelData.titlu}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Caută și selectează un apel...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[500px] max-h-[60vh] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Caută după titlu, program..." data-testid="input-search-apel" />
                  <CommandList>
                    <CommandEmpty>Niciun apel găsit.</CommandEmpty>
                    <CommandGroup heading="Apeluri de finanțare">
                      {combinedApeluri.map((a) => (
                        <CommandItem
                          key={a.id}
                          value={`${a.titlu} ${a.program || ""}`}
                          onSelect={() => {
                            setSelectedApel(a.id === selectedApel ? "" : a.id);
                            setApelSearchOpen(false);
                            setResult(null); setUsingCachedReport(false);
                            stopPolling(); setWaitingForReport(false);
                          }}
                          className="flex items-start gap-2 py-2"
                          data-testid={`apel-option-${a.id}`}
                        >
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${selectedApel === a.id ? "opacity-100" : "opacity-0"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{a.titlu}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {a.program && (
                                <span className="text-[11px] text-muted-foreground">{a.program}</span>
                              )}
                              {a.deadline && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(a.deadline).toLocaleDateString("ro-RO")}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </Card>
      </div>



      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Search className="w-4 h-4 text-primary" />
          Întrebare specifică (opțional)
        </div>
        <Textarea
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          placeholder="Ex: Este eligibilă firma mea dacă are mai puțin de 2 ani de activitate?"
          rows={2}
          data-testid="input-custom-question"
        />
      </Card>

      {existingReport?.exists && existingReport.report && !result && selectedApel && (
        <Card className="p-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" data-testid="card-existing-report">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Există deja o verificare pentru această combinație
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Verdict: <span className="font-semibold">{existingReport.report.verdict}</span> ({existingReport.report.verdictScore}%)
                  {" · "}
                  {new Date(existingReport.report.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={loadExistingReport}
                  data-testid="button-load-existing"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Vezi raportul existent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreditConfirm(true)}
                  disabled={eligibilityMutation.isPending || waitingForReport}
                  data-testid="button-rerun-check"
                >
                  {(eligibilityMutation.isPending || waitingForReport) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Rulează din nou
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {(!existingReport?.exists || result) && (
        <Button
          size="lg"
          className="w-full"
          onClick={() => setShowCreditConfirm(true)}
          disabled={!selectedCompany || eligibilityMutation.isPending || waitingForReport || (selectedCompanyData && getCompanyLegalState(selectedCompanyData.stareFirma).isTerminal && !confirmTerminalRun)}
          data-testid="button-check-eligibility"
        >
          {eligibilityMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Se analizează eligibilitatea...
            </>
          ) : waitingForReport ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Se procesează în fundal...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Verifică eligibilitatea ({eligibilityCost} cr)
            </>
          )}
        </Button>
      )}

      {eligibilityMutation.isPending && (
        <ProgressStepper
          operationId={eligibilityProgressId}
          steps={[
            "Încărcare date companie",
            selectedApel ? "Indexare documente apel" : "Pregătire analiză",
            "Analiză eligibilitate AI",
            "Analiză duală (Optimist + Sceptic)",
            "Salvare raport",
          ]}
          isActive={eligibilityMutation.isPending}
        />
      )}

      {waitingForReport && !eligibilityMutation.isPending && (
        <div className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg border px-4 py-3" data-testid="notice-waiting-report">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          <span>Analiza durează mai mult decât de obicei. Raportul se va afișa automat aici când este gata — poți rămâne pe pagină.</span>
        </div>
      )}

      {usingCachedReport && result && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2" data-testid="notice-cached-report">
          <Calendar className="w-3.5 h-3.5" />
          Raport din {existingReport?.report ? new Date(existingReport.report.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "cache"}
          <span className="text-muted-foreground/60">·</span>
          <button
            className="text-primary underline underline-offset-2"
            onClick={() => { setResult(null); setUsingCachedReport(false); }}
            data-testid="button-dismiss-cached"
          >
            Șterge și verifică din nou
          </button>
        </div>
      )}

      {result && verdictInfo && (
        <div className="space-y-5">
          <Card className={`p-6 border-2 ${verdictInfo.bg}`} data-testid="card-verdict">
            <div className="flex items-center gap-3 mb-3">
              <verdictInfo.icon className={`w-8 h-8 ${verdictInfo.color}`} />
              <div>
                <h2 className={`text-xl font-bold ${verdictInfo.color}`}>{result.verdict}</h2>
                <p className="text-sm text-muted-foreground">Scor: {result.score}/100</p>
              </div>
              <div className="ml-auto w-24">
                <Progress value={result.score} className="h-2.5" />
              </div>
            </div>
            <p className="text-sm leading-relaxed">{result.summary}</p>
            {result.sourceType === "rezumat" && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800" data-testid="notice-source-type">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Analiză bazată pe rezumatul AI al apelului. Pentru o evaluare mai detaliată, încarcă ghidul complet PDF pe pagina de eligibilitate.
                </p>
              </div>
            )}
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportPDF(result, selectedCompanyData, selectedApelData)}
              data-testid="button-export-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporta raport PDF
            </Button>
            <Button
              size="sm"
              onClick={() => createProjectMutation.mutate()}
              disabled={createProjectMutation.isPending || !selectedCompany || !selectedApel}
              data-testid="button-create-project"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              {createProjectMutation.isPending ? "Se creează..." : "Deschide proiect"}
            </Button>
          </div>

          {result.criteria && result.criteria.length > 0 && (
            <Card className="p-5 space-y-3" data-testid="card-criteria">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Criterii analizate ({result.criteria.length})
              </h3>
              <div className="space-y-2">
                {result.criteria.map((c, i) => {
                  const sl = getStatusLabel(c.status);
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50" data-testid={`row-criterion-${i}`}>
                      <StatusIcon status={c.status} className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{c.criteriu}</span>
                          <Badge
                            variant={sl.variant}
                            className="text-xs no-default-active-elevate"
                          >
                            {sl.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.detalii}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <Card className="p-5 space-y-3" data-testid="card-recommendations">
              <h3 className="text-sm font-semibold">Recomandări</h3>
              <ul className="space-y-1.5">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.dualAnalysis && result.dualAnalysis.hasDualAnalysis && (
            <Card className="p-5 space-y-4" data-testid="card-dual-analysis">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold">Analiza Expertului (Perspectivă Duală)</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {result.dualAnalysis.optimist && (
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-4 space-y-3" data-testid="card-optimist">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">Puncte Forte & Oportunități</span>
                  </div>
                  {result.dualAnalysis.optimist.summary && (
                    <p className="text-xs text-green-700 dark:text-green-400 italic">{result.dualAnalysis.optimist.summary}</p>
                  )}
                  <ul className="space-y-2">
                    {(result.dualAnalysis.optimist.points || []).map((p, i) => (
                      <li key={i} className="text-sm" data-testid={`optimist-point-${i}`}>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-green-800 dark:text-green-200">{p.title}</span>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">{p.detail}</p>
                            {p.section && <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5"><FileText className="w-3 h-3 inline mr-1" />{p.section}</p>}
                          </div>
                        </div>
                      </li>
                    ))}
                    {(!result.dualAnalysis.optimist.points || result.dualAnalysis.optimist.points.length === 0) && (
                      <li className="text-xs text-green-600 dark:text-green-500 italic">Nu au fost identificate puncte forte specifice.</li>
                    )}
                  </ul>
                </div>
                )}
                {result.dualAnalysis.skeptic && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-3" data-testid="card-sceptic">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-semibold text-red-700 dark:text-red-300">Riscuri & Bariere de Eligibilitate</span>
                  </div>
                  {result.dualAnalysis.skeptic.summary && (
                    <p className="text-xs text-red-700 dark:text-red-400 italic">{result.dualAnalysis.skeptic.summary}</p>
                  )}
                  <ul className="space-y-2">
                    {(result.dualAnalysis.skeptic.points || []).map((p, i) => (
                      <li key={i} className="text-sm" data-testid={`skeptic-point-${i}`}>
                        <div className="flex items-start gap-2">
                          <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-red-800 dark:text-red-200">{p.title}</span>
                            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{p.detail}</p>
                            {p.section && <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-0.5"><FileText className="w-3 h-3 inline mr-1" />{p.section}</p>}
                          </div>
                        </div>
                      </li>
                    ))}
                    {(!result.dualAnalysis.skeptic.points || result.dualAnalysis.skeptic.points.length === 0) && (
                      <li className="text-xs text-red-600 dark:text-red-500 italic">Nu au fost identificate riscuri semnificative.</li>
                    )}
                  </ul>
                </div>
                )}
              </div>
            </Card>
          )}

          <AiDisclaimer />

          {result.dualAnalysis && !result.dualAnalysis.hasDualAnalysis && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border" data-testid="notice-no-dual">
              <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Analiza duală (Perspectivă Expertului) indisponibilă din cauza documentației insuficiente în ghid. Încarcă ghidul PDF complet pentru o analiză detaliată.
              </p>
            </div>
          )}

          {result.sources && result.sources.length > 0 && (
            <Card className="p-5 space-y-3" data-testid="card-sources">
              <button
                className="flex items-center gap-2 text-sm font-semibold w-full text-left"
                onClick={() => setShowSources(!showSources)}
                data-testid="button-toggle-sources"
              >
                <FileText className="w-4 h-4 text-primary" />
                Surse din ghid ({result.sources.length})
                {showSources ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </button>
              {showSources && (
                <div className="space-y-2">
                  {result.sources.map((s, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="no-default-active-elevate text-xs">
                          {(s.similarity * 100).toFixed(0)}% relevanță
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{s.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
      <CreditConfirmDialog
        open={showCreditConfirm}
        onOpenChange={setShowCreditConfirm}
        onConfirm={() => { setShowCreditConfirm(false); eligibilityMutation.mutate(); }}
        actionLabel="Verificarea eligibilității"
        creditCost={eligibilityCost}
        isPending={eligibilityMutation.isPending}
      />
      {eligibilitySurvey.surveyConfig && (
        <MicroSurvey
          config={eligibilitySurvey.surveyConfig}
          onSubmit={eligibilitySurvey.submit}
          onDismiss={eligibilitySurvey.dismiss}
          isSubmitting={eligibilitySurvey.isSubmitting}
        />
      )}
    </div>
  );
}
