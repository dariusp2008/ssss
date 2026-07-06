import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search, Building2, TrendingUp, CheckCircle2, XCircle, ArrowRight,
  FileText, Users, Coins, Briefcase, AlertTriangle, Sparkles, Trash2,
  FileUp, FileMinus, BarChart3, Plus, ShieldCheck, Info, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight,
  MapPin, Cpu, Brain, ArrowUpDown, RotateCcw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDashboardPrefs } from "@/lib/dashboard-prefs";
import Folder from "@/components/reactbits/Folder";
import CountUp from "@/components/reactbits/CountUp";
import { CreateProjectWizard } from "@/components/create-project-wizard";
import { Link, useLocation } from "wouter";
import type { Company, FundingCall, ActiveProject } from "@shared/schema";
import { getCompanyLegalState } from "@shared/company-legal-state";
import { getActionCost, CREDIT_ACTION, type CreditCostRow } from "@/lib/credit-costs";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { LifecycleBadge, type LifecycleStage } from "@/components/lifecycle-badge";
import { LifecycleCountdown } from "@/components/lifecycle-countdown";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import { MicroSurvey } from "@/components/micro-survey";
import { useSurveyTrigger } from "@/hooks/use-survey-trigger";
import { ScoreCircle } from "@/components/match-details";

interface DashboardStats {
  companiesCount: number;
  projectsCount: number;
  documentsUploaded: number;
  documentsMissing: number;
  avgProgress: number;
  eligibilityReportsCount: number;
  upcomingDeadlines: { name: string; deadline: string; type: string }[];
}

interface MatchResult {
  call: FundingCall;
  score: number;
  passed: boolean;
  blockers: string[];
  warnings: string[];
  info: string[];
  details: { structural: number; semantic: number };
  hardScore?: number;
  semanticScore?: number | null;
  hasSemanticScore?: boolean;
  hasRagScore?: boolean;
  summary?: string | null;
  reasons: { label: string; points: number; met: boolean; details?: string }[];
  confidenceLevel: 'high' | 'medium' | 'low';
  // Task #68: stage + data deschiderii pentru badge "Urmează — DD luna".
  lifecycleStage?: string | null;
  opensAt?: string | null;
  // Task #86: lacune de date pe companie + flag „necesită date pentru confirmare".
  dataGaps?: string[];
  needsCompanyData?: boolean;
}

interface HybridMatchResult {
  fundingCallId: string;
  fundingCallName: string;
  category: string | null;
  maxFunding: number | null;
  deadline: string | null;
  summary: string | null;
  eligibleRegions: string[] | null;
  score: number;
  passed: boolean;
  blockers: string[];
  warnings: string[];
  info: string[];
  details: { structural: number; semantic: number };
  hardScore: number;
  semanticScore: number | null;
  combinedScore: number;
  hasSemanticScore: boolean;
  hasRagScore: boolean;
  matchedCriteria: Array<{ name: string; matched: boolean; details: string }>;
  confidenceLevel: 'high' | 'medium' | 'low';
  // Task #68: lifecycle expus de Match Engine — opensAt e populat doar când stage='urmeaza'.
  lifecycleStage?: string | null;
  opensAt?: string | null;
  // Task #86: lacune de date pe companie + flag „necesită date pentru confirmare".
  dataGaps?: string[];
  needsCompanyData?: boolean;
}

interface HybridMatchResponse {
  companyName: string;
  companyProfileGenerated: boolean;
  results: HybridMatchResult[];
}

// Task A (Plan-mode urgency fix) — pragul minim implicit de afișare.
// A fost coborât la 0 pentru debug, dar a permis ca lista să afișeze
// TOATE apelurile active (one-per-call returnate de backend) → două
// firme complet diferite vedeau același număr (ex. 144). Reîntoarcem
// la 40 ca prag conservator pentru a separa potrivirile „confirmate"
// de cele „posibile" în rezumatul compact de pe dashboard.
const MATCH_THRESHOLD = 40;

function formatDateRO(dateStr: string) {
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

type MatchSortOption = "score-desc" | "deadline-asc" | "budget-desc";

function calculateMatchScore(call: FundingCall, company: Company | null): MatchResult {
  const reasons: { label: string; points: number; met: boolean }[] = [];
  const defaults = { passed: true, blockers: [] as string[], warnings: [] as string[], info: ["Scor calculat local (fără AI)"], details: { structural: 0, semantic: 0 }, hasSemanticScore: false, summary: null as string | null };
  if (!company) return { call, score: 0, reasons, ...defaults, passed: false, blockers: ["Nicio companie selectată"], confidenceLevel: 'low' as const };

  const populatedCount = [
    (call as any).eligibleCaen?.length ? true : false,
    (call as any).eligibleSizeCategories?.length ? true : false,
    ((call as any).minCompanyAge != null && (call as any).minCompanyAge > 0) ? true : false,
    (call as any).beneficiaryTypes?.length ? true : false,
    (call as any).eligibleRegions?.length ? true : false,
  ].filter(Boolean).length;
  const confidenceLevel: 'high' | 'medium' | 'low' = populatedCount >= 2 ? 'high' : populatedCount === 1 ? 'medium' : 'low';

  let score = 0;
  let maxScore = 0;

  const allCompanyCaen: string[] = [];
  if (company.caen) allCompanyCaen.push(company.caen);
  if (company.caenSecundare && Array.isArray(company.caenSecundare)) {
    allCompanyCaen.push(...company.caenSecundare);
  }

  if (call.eligibleCaen && call.eligibleCaen.length > 0) {
    maxScore += 30;
    const primaryMatch = company.caen && call.eligibleCaen.includes(company.caen);
    const secondaryMatch = !primaryMatch && allCompanyCaen.some(c => call.eligibleCaen!.includes(c));
    if (primaryMatch) {
      score += 30;
      reasons.push({ label: "CAEN principal", points: 30, met: true });
    } else if (secondaryMatch) {
      score += 20;
      reasons.push({ label: "CAEN secundar", points: 20, met: true });
    } else {
      reasons.push({ label: "CAEN", points: -10, met: false });
    }
  }

  if (call.minEmployees) {
    maxScore += 20;
    if (company.employees && company.employees >= call.minEmployees) {
      score += 20;
      reasons.push({ label: `Min ${call.minEmployees} angajati`, points: 20, met: true });
    } else {
      reasons.push({ label: `Min ${call.minEmployees} angajati`, points: 0, met: false });
    }
  }

  if (call.minRevenue) {
    maxScore += 20;
    if (company.revenue && company.revenue >= call.minRevenue) {
      score += 20;
      reasons.push({ label: "Cifra afaceri min", points: 20, met: true });
    } else {
      reasons.push({ label: "Cifra afaceri min", points: 0, met: false });
    }
  }

  if (call.deadline) {
    const now = new Date();
    const dl = new Date(call.deadline);
    if (dl < now) {
      reasons.push({ label: "Termen expirat", points: -100, met: false });
      return { call, score: 0, reasons, ...defaults, passed: false, blockers: ["Termen limita expirat"], confidenceLevel };
    }
  }

  if (maxScore === 0) {
    const cappedScore = confidenceLevel !== 'high' ? Math.min(40, 60) : 40;
    return { call, score: cappedScore, reasons: [{ label: "Fara criterii - verificare AI recomandata", points: cappedScore, met: true }], ...defaults, details: { structural: cappedScore, semantic: 0 }, confidenceLevel };
  }

  let pct = Math.round((score / maxScore) * 100);
  let finalScore = Math.max(0, Math.min(100, pct));
  if (confidenceLevel !== 'high') {
    finalScore = Math.min(finalScore, 60);
  }
  return { call, score: finalScore, reasons, ...defaults, details: { structural: pct, semantic: 0 }, confidenceLevel };
}

// Progress-bar tint for "X tasks accomplished": moves through light colours as
// completion rises — red → orange → yellow → green → turquoise → light blue.
// Driven purely by the existing stats.avgProgress value (no new request).
function progressBarColor(pct: number): string {
  if (pct < 17) return "#f87171"; // red-400
  if (pct < 34) return "#fb923c"; // orange-400
  if (pct < 51) return "#fbbf24"; // amber-400 (yellow)
  if (pct < 68) return "#4ade80"; // green-400
  if (pct < 85) return "#2dd4bf"; // teal-400 (turquoise)
  return "#38bdf8"; // sky-400 (light blue)
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashPrefs] = useDashboardPrefs();
  const [, navigate] = useLocation();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [docsInsightsOpen, setDocsInsightsOpen] = useState(false);
  const [emptyCompanyPopupOpen, setEmptyCompanyPopupOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");
  const [docsFilter, setDocsFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("");
  const [matchSort, setMatchSort] = useState<MatchSortOption>("score-desc");
  const [showMatchConfirm, setShowMatchConfirm] = useState(false);
  // Task #95 — câte potriviri confirmate arătăm în rezumatul compact de pe
  // dashboard înainte de deep-link-ul „Vezi toate în catalog".
  const TOP_MATCHES_CAP = 3;

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: creditCosts } = useQuery<CreditCostRow[]>({ queryKey: ["/api/credits/costs"] });
  const matchCost = getActionCost(creditCosts, CREDIT_ACTION.matchEngine, 2);

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: fundingCalls, isLoading: callsLoading } = useQuery<any[]>({
    queryKey: ["/api/funding-calls-list"],
    queryFn: async () => {
      const res = await fetch("/api/funding-calls-list", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch funding calls");
      return res.json();
    },
  });

  const { data: projects } = useQuery<ActiveProject[]>({
    queryKey: ["/api/projects"],
  });

  const initiateMutation = useMutation({
    mutationFn: async (data: { companyId: string; fundingCallId: string }) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Proiect initiat", description: "Un nou proiect a fost creat." });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Neautorizat", description: "Re-autentificare...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/auth"; }, 500);
        return;
      }
      toast({ title: "Inițiere eșuată", description: error.message, variant: "destructive" });
    },
  });

  const activeCompanies = companies?.filter((c) => c.status === "active") ?? [];
  const manuallySelected = activeCompanies.find((c) => c.id === selectedCompanyId);
  const eligibleForAutoSelect = activeCompanies.filter((c) => !getCompanyLegalState(c.stareFirma).isTerminal);
  const selectedCompany = manuallySelected || eligibleForAutoSelect[0] || null;

  const { data: hybridScores, isLoading: hybridLoading, isPlaceholderData } = useQuery<HybridMatchResponse>({
    queryKey: ["/api/match/scores", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return { companyName: "", companyProfileGenerated: false, results: [] };
      const res = await apiRequest("POST", "/api/match/scores", { companyId: selectedCompany.id });
      return res.json();
    },
    enabled: !!selectedCompany?.id,
    placeholderData: keepPreviousData,
  });

  const refreshMatchMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const res = await apiRequest("POST", "/api/match/scores", { companyId, forceRefresh: true });
      return res.json();
    },
    onSuccess: (_data: any, companyId: string) => {
      queryClient.invalidateQueries({ queryKey: ["/api/match/scores", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      toast({ title: "Scoruri recalculate", description: "Scorurile de potrivire au fost actualizate." });
    },
    onError: (error: any) => {
      if (error?.status === 402) {
        toast({ title: "Credite insuficiente", description: "Nu ai suficiente credite pentru recalculare.", variant: "destructive" });
      } else if (error?.status === 429) {
        toast({ title: "Server ocupat", description: "Prea multe calcule simultane. Încearcă din nou în câteva secunde.", variant: "destructive" });
      } else {
        toast({ title: "Eroare", description: "Recalcularea scorurilor a eșuat. Încearcă din nou.", variant: "destructive" });
      }
    },
  });

  const refreshProfileMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/refresh-profile`);
      return res.json();
    },
    onSuccess: (updatedCompany: any, companyId) => {
      queryClient.setQueryData(["/api/companies"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((c: any) => c.id === companyId ? { ...c, ...updatedCompany, currentDataHash: updatedCompany.currentDataHash } : c);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/match/scores", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      toast({ title: "Profil actualizat", description: "Profilul companiei a fost regenerat cu AI." });
    },
    onError: () => {
      toast({ title: "Eroare", description: "Actualizarea profilului a eșuat.", variant: "destructive" });
    },
  });


  const fundingCallsMap = new Map((fundingCalls || []).map(c => [c.id, c]));

  const sortMatchResults = (list: MatchResult[]): MatchResult[] => {
    return [...list].sort((a, b) => {
      if (a.passed !== b.passed) return a.passed ? -1 : 1;
      switch (matchSort) {
        case "score-desc":
          return b.score - a.score;
        case "deadline-asc": {
          const da = a.call.deadline ? new Date(a.call.deadline).getTime() : Infinity;
          const db_ = b.call.deadline ? new Date(b.call.deadline).getTime() : Infinity;
          return da - db_;
        }
        case "budget-desc":
          return (b.call.maxFunding || 0) - (a.call.maxFunding || 0);
        default:
          return b.score - a.score;
      }
    });
  };

  const matchSurvey = useSurveyTrigger({
    event: "match_results",
    enabled: !!hybridScores?.results && hybridScores.results.length > 0,
    delayMs: 1500,
  });

  const matchResults: MatchResult[] = hybridScores?.results
    ? sortMatchResults(
        hybridScores.results
          .filter((r) => {
            const call = fundingCallsMap.get(r.fundingCallId);
            if (!call) return false;
            if (searchFilter && !call.name?.toLowerCase().includes(searchFilter.toLowerCase())) return false;
            if (docsFilter === "cu-docs") return (call as any).hasDocs === true;
            if (docsFilter === "fara-docs") return (call as any).hasDocs !== true;
            return true;
          })
          .map((r) => {
            const call = fundingCallsMap.get(r.fundingCallId)!;
            return {
              call,
              score: r.combinedScore,
              passed: r.passed,
              blockers: r.blockers || [],
              warnings: r.warnings || [],
              info: r.info || [],
              details: r.details || { structural: 0, semantic: 0 },
              hardScore: r.hardScore,
              semanticScore: r.semanticScore,
              hasSemanticScore: r.hasSemanticScore,
              hasRagScore: r.hasRagScore,
              summary: r.summary,
              reasons: r.matchedCriteria.map((mc) => ({
                label: mc.name,
                points: mc.matched ? 20 : 0,
                met: mc.matched,
                details: mc.details,
              })),
              confidenceLevel: r.confidenceLevel || 'high',
              lifecycleStage: r.lifecycleStage ?? (call as any).lifecycleStage ?? null,
              opensAt: r.opensAt ?? (call as any).openDate ?? null,
              dataGaps: r.dataGaps ?? [],
              needsCompanyData: r.needsCompanyData ?? false,
            };
          })
          .filter((r) => {
            if (confidenceFilter === "high") return r.confidenceLevel === 'high';
            if (confidenceFilter === "medium") return r.confidenceLevel === 'medium';
            if (confidenceFilter === "low") return r.confidenceLevel === 'low';
            if (confidenceFilter === "cu-ai") return r.hasSemanticScore === true;
            if (confidenceFilter === "fara-ai") return r.hasSemanticScore !== true;
            if (confidenceFilter === "estimativ") return r.passed && r.confidenceLevel !== 'high';
            return true;
          })
          // NU filtrăm aici după prag/blocked. Lista completă e separată mai jos
          // în confirmate / posibile pentru rezumatul compact; vederea detaliată
          // (inclusiv blocate) trăiește acum în catalogul de apeluri.
      )
    : sortMatchResults(
        (fundingCalls || [])
          .map((call) => calculateMatchScore(call, selectedCompany))
          .filter((r) => r.score >= MATCH_THRESHOLD)
          .filter((r) => {
            if (docsFilter === "cu-docs") return (r.call as any).hasDocs === true;
            if (docsFilter === "fara-docs") return (r.call as any).hasDocs !== true;
            return true;
          })
          .filter((r) => {
            if (confidenceFilter === "high") return r.confidenceLevel === 'high';
            if (confidenceFilter === "medium") return r.confidenceLevel === 'medium';
            if (confidenceFilter === "low") return r.confidenceLevel === 'low';
            if (confidenceFilter === "cu-ai") return r.hasSemanticScore === true;
            if (confidenceFilter === "fara-ai") return r.hasSemanticScore !== true;
            if (confidenceFilter === "estimativ") return r.passed && r.confidenceLevel !== 'high';
            return true;
          })
          // Task #86 — fără filtru final aici; bucket-urile de mai jos decid
          // ce se afișează (legacy nu produce „posibile", lipsește flag-ul).
      );

  const totalCalls = fundingCalls?.length || 0;
  // Task #86 — 3 bucket-uri:
  //  • confirmate  = trec eliminatoriile ȘI scor ≥ prag
  //  • posibile    = trec eliminatoriile, sub prag, dar lipsesc date pe companie
  //                  pentru confirmare (engine flag `needsCompanyData`)
  //  • blocate     = sigur incompatibile (passed=false) SAU sub prag fără lacune
  //                  de date (potrivire slabă reală, nu lipsă de date)
  const confirmedResults = matchResults.filter((r) => r.passed && r.score >= MATCH_THRESHOLD);
  const possibleResults = matchResults.filter((r) => r.passed && r.score < MATCH_THRESHOLD && r.needsCompanyData);
  // Task #156 — fallback „arată oricum cele mai apropiate": când nicio potrivire
  // nu intră în confirmate/posibile (tipic companii „mare" blocate pe apeluri
  // IMM-only, ex. BITDEFENDER/DANTE), arătăm totuși top-N apeluri cele mai bine
  // punctate ca să nu lăsăm un ecran gol. Sunt EXPLICIT marcate ca informative /
  // sub prag — nu se amestecă cu potrivirile reale. Excludem ce e deja în
  // confirmate/posibile; sortarea (sortMatchResults) e deja aplicată pe matchResults.
  const FALLBACK_MATCHES_CAP = 5;
  const fallbackResults =
    confirmedResults.length === 0 && possibleResults.length === 0
      ? matchResults.slice(0, FALLBACK_MATCHES_CAP)
      : [];
  const isMatchLoading = (callsLoading || hybridLoading) && !isPlaceholderData;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 lg:space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-xl font-serif font-bold tracking-tight" data-testid="text-dashboard-title">
            Bine ai revenit, <span className="text-[hsl(228,100%,25%)]">{user?.firstName || "Utilizator"}</span>
          </h1>
          <p className="text-xs sm:text-sm lg:text-xs text-muted-foreground">Gestionează aplicațiile tale pentru programe de finanțare.</p>
        </div>
      </div>

      {dashPrefs.onboarding && !statsLoading && !companiesLoading && stats && (stats.companiesCount === 0 || (stats.eligibilityReportsCount || 0) === 0) && !localStorage.getItem("granted_onboarding_dismissed") && (
        <Card className="p-6 border-t-2 border-t-[hsl(228,100%,25%)] bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-background" data-testid="card-onboarding-wizard">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Bine ai venit în GRANTED!</h2>
              <p className="text-sm text-muted-foreground">Urmează pașii de mai jos pentru a vedea matching-ul în acțiune.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-xs shrink-0"
              onClick={() => { localStorage.setItem("granted_onboarding_dismissed", "1"); window.location.reload(); }}
              data-testid="button-dismiss-onboarding"
            >
              Închide
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="flex items-start gap-2 sm:gap-3 rounded-lg border p-2.5 sm:p-3 bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">Cont creat</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Email verificat</p>
              </div>
            </div>
            <div className={`flex items-start gap-2 sm:gap-3 rounded-lg border p-2.5 sm:p-3 ${(stats?.companiesCount || 0) > 0 ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-white dark:bg-background"}`}>
              {(stats?.companiesCount || 0) > 0
                ? <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 shrink-0 mt-0.5" />
                : <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full border-2 border-[hsl(228,100%,25%)] flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] sm:text-xs font-bold text-[hsl(228,100%,25%)]">2</span></div>
              }
              <div>
                <p className="text-xs sm:text-sm font-medium">{(stats?.companiesCount || 0) > 0 ? "Client adăugat" : "Adaugă client"}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Introdu CUI-ul</p>
                {(stats?.companiesCount || 0) === 0 && (
                  <Link href="/companies"><Button size="sm" className="mt-2 h-7 text-xs bg-[hsl(228,100%,25%)]" data-testid="button-onboarding-add-company">Adaugă companie</Button></Link>
                )}
              </div>
            </div>
            <div className={`flex items-start gap-2 sm:gap-3 rounded-lg border p-2.5 sm:p-3 ${matchResults.length > 0 ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-white dark:bg-background"}`}>
              {matchResults.length > 0
                ? <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 shrink-0 mt-0.5" />
                : <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] sm:text-xs font-bold text-muted-foreground">3</span></div>
              }
              <div>
                <p className="text-xs sm:text-sm font-medium">{matchResults.length > 0 ? "Matching rulat" : "Rulează Matching"}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Scoruri potrivire</p>
              </div>
            </div>
            <div className={`flex items-start gap-2 sm:gap-3 rounded-lg border p-2.5 sm:p-3 ${(stats?.eligibilityReportsCount || 0) > 0 ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-white dark:bg-background"}`}>
              {(stats?.eligibilityReportsCount || 0) > 0
                ? <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 shrink-0 mt-0.5" />
                : <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] sm:text-xs font-bold text-muted-foreground">4</span></div>
              }
              <div>
                <p className="text-xs sm:text-sm font-medium">{(stats?.eligibilityReportsCount || 0) > 0 ? "Eligibilitate verificată" : "Verifică eligibilitatea"}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Analiza AI</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-stretch">
          {/* 1 — Companii (white folder) → add a company */}
          <Card className="flex flex-col items-center justify-between gap-1 p-4 pt-7 min-h-[172px] border-t-2 border-t-chart-1 transition-shadow hover:shadow-md" data-testid="card-stat-companies">
            <div className="flex-1 flex items-end justify-center">
              <Folder size={0.7} color="#CBD5E1" onActivate={() => navigate("/companies")} aria-label="Adaugă o companie" />
            </div>
            <p className="text-2xl font-bold text-foreground" data-testid="text-stat-companies"><CountUp to={stats?.companiesCount ?? 0} duration={1} /></p>
            <p className="text-xs text-muted-foreground text-center">Companii</p>
          </Card>

          {/* 2 — Proiecte active (blue folder) → create project wizard */}
          <Card className="flex flex-col items-center justify-between gap-1 p-4 pt-7 min-h-[172px] border-t-2 border-t-chart-1 transition-shadow hover:shadow-md" data-testid="card-stat-projects">
            <div className="flex-1 flex items-end justify-center">
              <Folder size={0.7} color="#3B82F6" onActivate={() => setWizardOpen(true)} aria-label="Creează un proiect nou" />
            </div>
            <p className="text-2xl font-bold text-foreground" data-testid="text-stat-projects"><CountUp to={stats?.projectsCount ?? 0} duration={1} /></p>
            <p className="text-xs text-muted-foreground text-center">Proiecte active</p>
          </Card>

          {/* 3 — Documente încărcate (green folder) → insights popup */}
          <Card className="flex flex-col items-center justify-between gap-1 p-4 pt-7 min-h-[172px] border-t-2 border-t-chart-1 transition-shadow hover:shadow-md" data-testid="card-stat-documents-uploaded">
            <div className="flex-1 flex items-end justify-center">
              <Folder size={0.7} color="#22C55E" onActivate={() => setEmptyCompanyPopupOpen(true)} aria-label="Vezi detalii documente" />
            </div>
            <p className="text-2xl font-bold text-foreground" data-testid="text-stat-documents-uploaded"><CountUp to={stats?.documentsUploaded ?? 0} duration={1} /></p>
            <p className="text-xs text-muted-foreground text-center">Documente încărcate</p>
          </Card>

          {/* 4 — Documente lipsă (red folder) → inactive until a project exists */}
          <Card className="flex flex-col items-center justify-between gap-1 p-4 pt-7 min-h-[172px] border-t-2 border-t-chart-1 transition-shadow hover:shadow-md" data-testid="card-stat-documents-missing">
            <div className="flex-1 flex items-end justify-center">
              <Folder
                size={0.7}
                color="#EF4444"
                onActivate={() => setEmptyCompanyPopupOpen(true)}
                aria-label="Vezi documentele lipsă"
              />
            </div>
            <p className="text-2xl font-bold text-foreground" data-testid="text-stat-documents-missing"><CountUp to={stats?.documentsMissing ?? 0} duration={1} /></p>
            <p className="text-xs text-muted-foreground text-center">Documente lipsă</p>
          </Card>

          {/* 5 — Progres mediu (summary card, no folder) */}
          <Card className="flex flex-col justify-between gap-2 p-4 min-h-[172px] border-t-2 border-t-chart-1 transition-shadow hover:shadow-md" data-testid="card-stat-avg-progress">
            <div className="w-9 h-9 rounded-lg bg-[hsl(48,100%,50%)]/15 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[hsl(48,100%,45%)]" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground" data-testid="text-stat-avg-progress"><CountUp to={stats?.avgProgress ?? 0} duration={1} />%</p>
              <Progress
                value={Math.max(1, stats?.avgProgress ?? 0)}
                indicatorStyle={{ backgroundColor: progressBarColor(stats?.avgProgress ?? 0) }}
                className="h-1.5"
              />
              <p className="text-xs text-muted-foreground">Progres mediu</p>
            </div>
          </Card>
        </div>
      )}

      {/* Task #68: secțiune dashboard "Se deschid curând" — afișează primele
          apeluri cu stage=urmeaza, sortate după open_date ASC, cu countdown
          live. Vine din lista deja fetch-uită (`/api/funding-calls-list`), fără
          query nou. Când nu există apeluri viitoare afișăm un empty state
          explicit (nu o secțiune lipsă) ca utilizatorul să știe că data e
          actuală, nu că secțiunea s-a încărcat eronat. */}
      {dashPrefs.upcoming && (() => {
        const upcoming = (fundingCalls || [])
          .filter((c) => c?.lifecycleStage === "urmeaza" && c?.openDate)
          .sort((a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime())
          .slice(0, 5);
        return (
          <Card className="p-4 lg:p-3 space-y-3" data-testid="section-dashboard-se-deschid-curand">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-0.5">
                <h2 className="text-lg lg:text-base font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  Se deschid curând
                </h2>
                <p className="text-sm lg:text-xs text-muted-foreground">
                  Apeluri anunțate care nu sunt încă deschise pentru depunere.
                </p>
              </div>
              {upcoming.length > 0 && (
                <Link href="/funding-calls?stage=urmeaza">
                  <Button variant="outline" size="sm" data-testid="button-view-all-upcoming">
                    Vezi toate
                  </Button>
                </Link>
              )}
            </div>
            {upcoming.length === 0 ? (
              <div
                className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center"
                data-testid="empty-dashboard-se-deschid-curand"
              >
                <p className="text-sm text-muted-foreground">
                  Niciun apel anunțat în prezent. Verificăm zilnic — apare aici imediat ce se publică.
                </p>
              </div>
            ) : (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <Link key={c.id} href={`/funding-calls/${c.id}`}>
                  <div
                    className="flex items-center justify-between gap-3 p-2.5 rounded-md border hover:border-primary/40 hover:bg-muted/40 transition-colors cursor-pointer"
                    data-testid={`upcoming-call-${c.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      {c.program && (
                        <p className="text-[10px] font-semibold text-primary tracking-wide uppercase mb-0.5">
                          {c.program}
                        </p>
                      )}
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <LifecycleBadge
                          callId={c.id}
                          stage={c.lifecycleStage as LifecycleStage}
                          opensAt={c.openDate}
                          deadline={c.deadline}
                        />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <LifecycleCountdown callId={c.id} lifecycleStage="urmeaza" openDate={c.openDate} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            )}
          </Card>
        );
      })()}

      {dashPrefs.matchEngine && (
      <div className="space-y-4 lg:space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5 lg:space-y-0">
            <h2 className="text-lg lg:text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[hsl(48,100%,45%)]" />
              Motor de Potrivire
            </h2>
            <p className="text-sm lg:text-xs text-muted-foreground">
              Găsește apelurile de finanțare potrivite pentru compania ta.
            </p>
          </div>
          {selectedCompany && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMatchConfirm(true)}
                    disabled={refreshMatchMutation.isPending}
                    data-testid="button-refresh-match"
                  >
                    <RotateCcw className={`w-4 h-4 mr-1 ${refreshMatchMutation.isPending ? "animate-spin" : ""}`} />
                    {refreshMatchMutation.isPending ? "Se recalculează..." : `Recalculează (${matchCost} cr)`}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Recalculează scorurile (consumă {matchCost} {matchCost === 1 ? "credit" : "credite"})</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {selectedCompany && (
          <CreditConfirmDialog
            open={showMatchConfirm}
            onOpenChange={setShowMatchConfirm}
            onConfirm={() => { setShowMatchConfirm(false); refreshMatchMutation.mutate(selectedCompany.id); }}
            actionLabel="Recalcularea scorurilor de potrivire"
            creditCost={matchCost}
            isPending={refreshMatchMutation.isPending}
          />
        )}

        {companiesLoading ? (
          <Skeleton className="h-12" />
        ) : !companies || companies.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="font-semibold">Nicio companie verificată</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Adaugă o companie pentru a vedea apelurile de finanțare potrivite.
            </p>
            <Link href="/companies">
              <Button variant="outline" data-testid="button-add-company-cta">
                <Plus className="w-4 h-4 mr-2" />
                Adaugă companie
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Task #95 — selector companie compact. Filtrarea/sortarea bogată
                și lista completă de potriviri trăiesc acum în catalogul de
                apeluri; dashboard-ul păstrează doar un rezumat „top potriviri"
                cu deep-link către catalog (companie preselectată). */}
            <Card className="p-4" data-testid="card-match-company-select">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-auto sm:min-w-[240px]">
                  <Label className="text-xs sm:text-sm mb-1.5 block">Companie</Label>
                  <Select
                    value={selectedCompany?.id || ""}
                    onValueChange={(val) => { setSelectedCompanyId(val); }}
                  >
                    <SelectTrigger data-testid="select-company">
                      <SelectValue placeholder="Selectează compania" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCompanies.map((c) => {
                        const legal = getCompanyLegalState(c.stareFirma);
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              {legal.isTerminal ? (
                                <AlertTriangle className="w-3 h-3 text-destructive" />
                              ) : (
                                <Building2 className="w-3 h-3" />
                              )}
                              {c.name}
                              {legal.isTerminal && (
                                <span className="text-xs text-destructive">(radiată/inactivă)</span>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCompany && (
                  <Link href={`/funding-calls?useCompany=1&companyId=${selectedCompany.id}`} className="ml-auto">
                    <Button size="sm" data-testid="button-open-catalog-matches">
                      Vezi toate în catalog
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </Card>

            {selectedCompany && (
              isMatchLoading ? (
                <Skeleton className="h-40" />
              ) : (confirmedResults.length > 0 || possibleResults.length > 0) ? (
                <Card className="p-4 space-y-3" data-testid="card-top-matches">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground" data-testid="text-match-count">{confirmedResults.length}</span>
                    {" "}{confirmedResults.length === 1 ? "potrivire confirmată" : "potriviri confirmate"}
                    {" "}pentru <span className="font-medium text-foreground">{selectedCompany.name}</span>
                  </p>
                  {confirmedResults.length > 0 ? (
                    <div className="space-y-1.5">
                      {confirmedResults.slice(0, TOP_MATCHES_CAP).map((mr) => (
                        <Link
                          key={mr.call.id}
                          href={`/funding-calls?useCompany=1&companyId=${selectedCompany.id}`}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                          data-testid={`row-top-match-${mr.call.id}`}
                        >
                          <ScoreCircle score={mr.score} passed={mr.passed} confidenceLevel={mr.confidenceLevel} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" data-testid={`text-top-match-name-${mr.call.id}`}>{mr.call.name}</p>
                            {mr.call.program && (
                              <p className="text-xs text-muted-foreground truncate">{mr.call.program}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-confirmed">
                      Nicio potrivire confirmată momentan — vezi în catalog apelurile care necesită date suplimentare.
                    </p>
                  )}
                  {possibleResults.length > 0 && (
                    <p className="text-xs text-muted-foreground" data-testid="text-possible-summary">
                      + {possibleResults.length} {possibleResults.length === 1 ? "apel posibil care necesită date suplimentare" : "apeluri posibile care necesită date suplimentare"}
                    </p>
                  )}
                  <Link href={`/funding-calls?useCompany=1&companyId=${selectedCompany.id}`}>
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-view-all-matches">
                      Vezi toate potrivirile în catalog
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                  <AiDisclaimer />
                </Card>
              ) : fallbackResults.length > 0 ? (
                <Card className="p-4 space-y-3" data-testid="card-fallback-matches">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm" data-testid="text-fallback-title">
                        Nicio potrivire peste pragul de {MATCH_THRESHOLD}%
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Din {totalCalls} apeluri, niciunul nu atinge pragul pentru{" "}
                        <span className="font-medium text-foreground">{selectedCompany?.name || "compania selectată"}</span>.
                        Mai jos sunt cele mai apropiate apeluri — orientativ, sub prag.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {fallbackResults.map((mr) => (
                      <Link
                        key={mr.call.id}
                        href={`/funding-calls?useCompany=1&companyId=${selectedCompany.id}`}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                        data-testid={`row-fallback-match-${mr.call.id}`}
                      >
                        <ScoreCircle score={mr.score} passed={mr.passed} confidenceLevel={mr.confidenceLevel} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" data-testid={`text-fallback-match-name-${mr.call.id}`}>{mr.call.name}</p>
                          {mr.call.program && (
                            <p className="text-xs text-muted-foreground truncate">{mr.call.program}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                  <Link href={`/funding-calls?useCompany=1&companyId=${selectedCompany.id}`}>
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-explore-catalog">
                      Explorează catalogul
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                  <AiDisclaimer />
                </Card>
              ) : (
                <Card className="p-8 text-center space-y-3">
                  <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto" />
                  <h3 className="font-semibold">
                    {totalCalls > 0 ? "Nicio potrivire suficientă" : "Nu sunt apeluri de finanțare disponibile"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {totalCalls > 0
                      ? `Din ${totalCalls} apeluri, niciuna nu atinge pragul minim de ${MATCH_THRESHOLD}% pentru ${selectedCompany?.name || "compania selectată"}.`
                      : "Revino mai târziu pentru noi oportunități de finanțare."
                    }
                  </p>
                  <Link href={`/funding-calls?useCompany=1&companyId=${selectedCompany.id}`}>
                    <Button variant="outline" size="sm" data-testid="button-explore-catalog">
                      Explorează catalogul
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                </Card>
              )
            )}
          </>
        )}
      </div>
      )}
      {matchSurvey.surveyConfig && (
        <MicroSurvey
          config={matchSurvey.surveyConfig}
          onSubmit={matchSurvey.submit}
          onDismiss={matchSurvey.dismiss}
          isSubmitting={matchSurvey.isSubmitting}
        />
      )}

      {/* Placeholder popup for folder cards until backend data is wired in. */}
      <Dialog open={emptyCompanyPopupOpen} onOpenChange={setEmptyCompanyPopupOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-empty-company">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[hsl(48,100%,45%)]" />
              Nu ai nicio companie adăugată
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adaugă o companie pentru a vedea documentele și a iniția proiecte.
            </p>
            <Link href="/companies">
              <Button className="w-full" onClick={() => setEmptyCompanyPopupOpen(false)} data-testid="button-empty-company-add">
                <Plus className="w-4 h-4 mr-2" />
                Adaugă companie
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Real create-project wizard (opened by the blue folder card) */}
      <CreateProjectWizard open={wizardOpen} onOpenChange={setWizardOpen} companies={companies} />

      {/* Document-insights popup (opened by the green folder card) — real stats, cheer */}
      <Dialog open={docsInsightsOpen} onOpenChange={setDocsInsightsOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-docs-insights">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[hsl(48,100%,45%)]" />
              Documentele tale
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-800 p-3 text-center">
                <FileUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{stats?.documentsUploaded ?? 0}</p>
                <p className="text-xs text-muted-foreground">Încărcate</p>
              </div>
              <div className="rounded-lg border bg-orange-50/60 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 p-3 text-center">
                <FileMinus className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{stats?.documentsMissing ?? 0}</p>
                <p className="text-xs text-muted-foreground">Lipsă</p>
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              {(stats?.documentsMissing ?? 0) === 0 && (stats?.documentsUploaded ?? 0) > 0
                ? "🎉 Felicitări! Ai încărcat toate documentele necesare. Continuă tot așa!"
                : (stats?.documentsUploaded ?? 0) > 0
                ? `Ai încărcat deja ${stats?.documentsUploaded} documente — foarte bine! Mai completează-le pe cele lipsă pentru dosare complete.`
                : "Începe prin a încărca documentele în proiectele tale — fiecare pas te apropie de finanțare."}
            </p>
            <Link href="/projects">
              <Button variant="outline" className="w-full" onClick={() => setDocsInsightsOpen(false)} data-testid="button-docs-insights-goto">
                Mergi la proiecte
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
