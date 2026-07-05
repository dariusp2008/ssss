import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LifecycleBadge, type LifecycleStage } from "@/components/lifecycle-badge";
import { LifecycleCountdown, zileRamase } from "@/components/lifecycle-countdown";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Coins, Users, Calendar, ExternalLink, FileText,
  Globe, Clock, Landmark, Building2,
  XCircle, Sparkles, ArrowRight, Shield, Database, ArrowUpDown, RotateCcw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp,
  MoreVertical, Trash2, Pencil, RefreshCw, FileUp, Upload, Download, AlertTriangle, Loader2, File, BookOpen,
  Layers, Banknote, SlidersHorizontal,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AnimatedItem } from "@/components/reactbits/AnimatedList";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { stripHtml, formatCallDisplayTitle } from "@/lib/utils";
import { withCallCurrency, isGenuineProjectMax } from "@/lib/funding-currency";
import { ProgressStepper } from "@/components/progress-stepper";
import type { FundingCall, Company } from "@shared/schema";
import {
  BENEFICIARY_TYPES,
  ELIGIBLE_REGIONS,
  NATIONAL_REGION_VALUE,
  SECTOR_BY_SLUG,
  getBeneficiaryLabel,
  getRegionLabel,
  getSectorLabel,
  getCompanyRegion,
  inferBeneficiaryFromCompany,
} from "@shared/catalog-filters";
import { MultiSelectPopover } from "@/components/filters/multi-select-popover";
import { SectorCaenAutocomplete } from "@/components/filters/sector-caen-autocomplete";
import { AmountRangeFilter } from "@/components/filters/amount-range-filter";
import { ProjectActionButton } from "@/components/project-action-button";
import {
  MatchDetails, mapHybridToMatchDetails,
  type HybridMatchResultLike,
} from "@/components/match-details";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { getActionCost, CREDIT_ACTION, type CreditCostRow } from "@/lib/credit-costs";

const csvParam = (v: string | null): string[] => {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
};

function getUrlParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

let lastUrlState = "";
function syncFiltersToUrl(params: Record<string, string>, push = false) {
  const url = new URLSearchParams();
  if (params.search) url.set("search", params.search);
  if (params.stage && params.stage !== "depunere_activa") url.set("stage", params.stage);
  if (params.source) url.set("source", params.source);
  if (params.hasDocs) url.set("hasDocs", params.hasDocs);
  if (params.indexed) url.set("indexed", params.indexed);
  if (params.sort && params.sort !== "deadline-asc") url.set("sort", params.sort);
  if (params.page && params.page !== "1") url.set("page", params.page);
  if (params.beneficiary) url.set("beneficiary", params.beneficiary);
  if (params.sectors) url.set("sectors", params.sectors);
  if (params.caen) url.set("caen", params.caen);
  if (params.regions) url.set("regions", params.regions);
  if (params.minFunding) url.set("minFunding", params.minFunding);
  if (params.maxFunding) url.set("maxFunding", params.maxFunding);
  if (params.minTrl) url.set("minTrl", params.minTrl);
  if (params.maxTrl) url.set("maxTrl", params.maxTrl);
  if (params.projectMinValue) url.set("projectMinValue", params.projectMinValue);
  if (params.projectMaxValue) url.set("projectMaxValue", params.projectMaxValue);
  if (params.projectValueCurrency) url.set("projectValueCurrency", params.projectValueCurrency);
  if (params.useCompany) url.set("useCompany", params.useCompany);
  if (params.companyId) url.set("companyId", params.companyId);
  const qs = url.toString();
  const newUrl = window.location.pathname + (qs ? `?${qs}` : "");
  if (newUrl === lastUrlState) return;
  const oldUrl = lastUrlState;
  lastUrlState = newUrl;
  if (push && oldUrl) {
    window.history.pushState(null, "", newUrl);
  } else {
    window.history.replaceState(null, "", newUrl);
  }
}

function isExpired(call: FundingCall): boolean {
  if (!call.deadline) return false;
  const target = new Date(call.deadline);
  const now = new Date();
  target.setHours(23, 59, 59, 999);
  return target.getTime() < now.getTime();
}

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const now = new Date();
  const target = new Date(deadline);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return <Badge variant="destructive" className="no-default-active-elevate">Expirat</Badge>;
  if (diffDays <= 7) return <Badge variant="destructive" className="no-default-active-elevate">{zileRamase(diffDays)}</Badge>;
  if (diffDays <= 30) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 no-default-active-elevate">{zileRamase(diffDays)}</Badge>;
  return <Badge variant="secondary" className="no-default-active-elevate">{zileRamase(diffDays)}</Badge>;
}

// Task #68: tabs lifecycle pe catalog. URL param canonic e `stage` cu valori
// `toate` | `depunere_activa` | `urmeaza` | `expirat`. Pentru compat retroactivă
// citim și vechiul param `status` (active → depunere_activa, expired → expirat,
// all → toate) și migrăm la `stage` la următoarea scriere a URL.
type StageFilter = "toate" | "in_consultare" | "depunere_activa" | "urmeaza" | "expirat";

function readStageFromParams(p: URLSearchParams): StageFilter {
  const stage = p.get("stage");
  if (stage === "toate" || stage === "in_consultare" || stage === "depunere_activa" || stage === "urmeaza" || stage === "expirat") {
    return stage;
  }
  const status = p.get("status");
  if (status === "expired") return "expirat";
  if (status === "all") return "toate";
  // Default + legacy "active" → depunere_activa.
  return "depunere_activa";
}

type SortOption = "deadline-asc" | "deadline-desc" | "budget-desc" | "newest" | "rag-desc" | "open-date-asc" | "match-desc";

interface PaginatedResponse {
  data: (FundingCall & { hasGhid?: boolean; hasDocs?: boolean; ragSections?: number })[];
  total: number;
  page: number;
  totalPages: number;
  stats?: { active: number; upcoming: number; expired: number; indexed: number; sources?: string[] };
  // Task #151 (duplicate): id-urile apelurilor cvasi-duplicate, calculate
  // server-side pe ÎNTREG setul filtrat (nu doar pagina curentă).
  duplicateIds?: string[];
}

// Reusable Tailwind class for active filter chips. Renders a real <button> so
// chips are focusable, keyboard-actionable, and announce their aria-label to
// screen readers (Task #35: a11y for chips).
const chipButtonClass =
  "inline-flex items-center gap-1 max-w-full whitespace-normal text-left break-words " +
  "rounded-md border border-transparent bg-secondary text-secondary-foreground " +
  "px-2.5 py-0.5 text-xs font-semibold transition-colors " +
  "hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring focus-visible:ring-offset-2";

export default function FundingCallsPage() {
  const { toast } = useToast();
  const initParams = getUrlParams();
  const [searchFilter, setSearchFilter] = useState(initParams.get("search") || "");
  const [sourceFilter, setSourceFilter] = useState(initParams.get("source") || "");
  const [docsFilter, setDocsFilter] = useState(initParams.get("hasDocs") || "");
  const [indexFilter, setIndexFilter] = useState(initParams.get("indexed") || "");
  const [stageFilter, setStageFilter] = useState<StageFilter>(readStageFromParams(initParams));
  // Task #68 (review fix): la **load direct** cu `?stage=urmeaza` (inclusiv
  // navigarea de pe CTA-ul "Vezi toate" din dashboard) trebuie să avem
  // default-ul natural `open-date-asc`, nu `deadline-asc`. Doar dacă URL-ul
  // conține explicit `sort=` păstrăm preferința utilizatorului.
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const sortParam = initParams.get("sort") as SortOption | null;
    if (sortParam) return sortParam;
    return readStageFromParams(initParams) === "urmeaza" ? "open-date-asc" : "deadline-asc";
  });
  const [beneficiaryFilter, setBeneficiaryFilter] = useState<string[]>(
    csvParam(initParams.get("beneficiary")).filter((v) => BENEFICIARY_TYPES.some((b) => b.value === v)),
  );
  const [sectorsFilter, setSectorsFilter] = useState<string[]>(
    csvParam(initParams.get("sectors")).filter((v) => SECTOR_BY_SLUG.has(v)),
  );
  const [caenFilter, setCaenFilter] = useState<string[]>(
    csvParam(initParams.get("caen")).filter((v) => /^\d{4}$/.test(v)),
  );
  const [regionsFilter, setRegionsFilter] = useState<string[]>(
    csvParam(initParams.get("regions")).filter((v) => ELIGIBLE_REGIONS.some((r) => r.value === v)),
  );
  const [minFundingFilter, setMinFundingFilter] = useState<number | undefined>(() => {
    const v = initParams.get("minFunding");
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  });
  const [maxFundingFilter, setMaxFundingFilter] = useState<number | undefined>(() => {
    const v = initParams.get("maxFunding");
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  });
  // Task #76 (NEW-E.5) — Filtre avansate Structural Phase v2 (TRL + buget proiect).
  // Default colapsate; auto-expanded când URL conține deja unul din ele.
  const readTrl = (v: string | null): number | undefined => {
    if (!v) return undefined;
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 1 && n <= 9 ? n : undefined;
  };
  const readNum = (v: string | null): number | undefined => {
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const readCurrency = (v: string | null): "EUR" | "RON" | undefined => {
    const up = v?.trim().toUpperCase();
    return up === "EUR" || up === "RON" ? up : undefined;
  };
  const [minTrlFilter, setMinTrlFilter] = useState<number | undefined>(() => readTrl(initParams.get("minTrl")));
  const [maxTrlFilter, setMaxTrlFilter] = useState<number | undefined>(() => readTrl(initParams.get("maxTrl")));
  const [projectMinValueFilter, setProjectMinValueFilter] = useState<number | undefined>(() => readNum(initParams.get("projectMinValue")));
  const [projectMaxValueFilter, setProjectMaxValueFilter] = useState<number | undefined>(() => readNum(initParams.get("projectMaxValue")));
  const [projectValueCurrencyFilter, setProjectValueCurrencyFilter] = useState<"EUR" | "RON" | undefined>(() => readCurrency(initParams.get("projectValueCurrency")));
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState<boolean>(() =>
    Boolean(
      initParams.get("minTrl") ||
      initParams.get("maxTrl") ||
      initParams.get("projectMinValue") ||
      initParams.get("projectMaxValue") ||
      initParams.get("projectValueCurrency"),
    ),
  );
  // Draft state pentru TRL slider (commit pe release, evită refetch la fiecare tick).
  const [trlDraft, setTrlDraft] = useState<[number, number]>(() => [
    minTrlFilter ?? 1,
    maxTrlFilter ?? 9,
  ]);
  useEffect(() => {
    setTrlDraft([minTrlFilter ?? 1, maxTrlFilter ?? 9]);
  }, [minTrlFilter, maxTrlFilter]);
  const [useCompanyProfile, setUseCompanyProfile] = useState<boolean>(
    initParams.get("useCompany") === "1",
  );
  const [activeCompanyId, setActiveCompanyId] = useState<string>(
    initParams.get("companyId") || "",
  );
  // Snapshot of filter values added by the last company-profile pre-fill, so
  // we can subtract them when the active company changes (or the toggle goes
  // off) without wiping filters the user added manually.
  const lastAppliedSnapshot = useRef<{
    key: string;
    caens: string[];
    region: string | null;
    benef: string | null;
  } | null>(null);
  const [selectedCall, setSelectedCall] = useState<FundingCall | null>(null);
  const [currentPage, setCurrentPage] = useState(Number(initParams.get("page")) || 1);
  const pageSize = 20;

  const [deleteCall, setDeleteCall] = useState<any>(null);
  const [editCall, setEditCall] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [guideCall, setGuideCall] = useState<any>(null);
  const [uploadingGuide, setUploadingGuide] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showCreateCallDialog, setShowCreateCallDialog] = useState(false);
  const [createCallName, setCreateCallName] = useState("");
  const [createCallFile, setCreateCallFile] = useState<File | null>(null);
  const [createCallProgressId, setCreateCallProgressId] = useState<string | null>(null);
  const [createCallPhase, setCreateCallPhase] = useState<"idle" | "indexing" | "ai">("idle");

  const [debouncedSearch, setDebouncedSearch] = useState(initParams.get("search") || "");
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const statsRef = useRef<{ active: number; upcoming: number; expired: number; indexed: number; sources?: string[] } | null>(null);
  const listTopRef = useRef<HTMLDivElement>(null);

  const { data: adminCheck } = useQuery<{ isSuperAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });
  const isSuperAdmin = adminCheck?.isSuperAdmin === true;

  // User's saved companies — used to pre-fill catalog filters from a company
  // profile and rank calls by match-engine relevance.
  const { data: userCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const activeCompany: Company | null =
    (userCompanies?.find((c) => c.id === activeCompanyId) as Company | undefined) ||
    (userCompanies?.[0] as Company | undefined) ||
    null;

  // Pull cached match scores once a company is selected & the toggle is on.
  // The endpoint reads from a 5-minute server cache when forceRefresh isn't
  // set, so this is essentially free for repeat visits. We keep the FULL result
  // rows (not just the numeric score) so each catalog card can expand into the
  // same rich eligibility/structural breakdown the dashboard shows (Task #95).
  const { data: matchData } = useQuery<{
    companyName?: string;
    companyProfileGenerated?: boolean;
    results: HybridMatchResultLike[];
  }>({
    queryKey: ["/api/match/scores", activeCompany?.id],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/match/scores", { companyId: activeCompany!.id });
      return res.json();
    },
    enabled: useCompanyProfile && !!activeCompany?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Full result rows keyed by call id — drives the expandable MatchDetails.
  const matchResultsByCallId = useMemo(() => {
    const m = new Map<string, HybridMatchResultLike>();
    for (const r of matchData?.results || []) {
      if (r.fundingCallId) m.set(r.fundingCallId, r);
    }
    return m;
  }, [matchData]);

  // Numeric engine score keyed by call id — drives the relevance badge + sort.
  const matchScoresByCallId = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of matchData?.results || []) {
      const s = typeof r.combinedScore === "number" ? r.combinedScore : r.score;
      if (typeof s === "number" && Number.isFinite(s)) m.set(r.fundingCallId, s);
    }
    return m;
  }, [matchData]);

  const { data: creditCosts } = useQuery<CreditCostRow[]>({ queryKey: ["/api/credits/costs"] });
  const matchCost = getActionCost(creditCosts, CREDIT_ACTION.matchEngine, 2);
  const [showMatchConfirm, setShowMatchConfirm] = useState(false);

  // Task #95 — „Recalculează" pe catalog: oglindește butonul din dashboard.
  // forceRefresh=true consumă 2 credite (skip pentru super_admin, gestionat
  // server-side); cache-ul on-demand e invalidat pentru a reafișa scorurile.
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

  const { data: guidesData, isLoading: guidesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/funding-calls", guideCall?.id, "guides"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/funding-calls/${guideCall.id}/guides`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!guideCall,
  });

  const reindexMutation = useMutation({
    mutationFn: async (apelId: string) => {
      const res = await apiRequest("POST", `/api/admin/rag-reindex/${apelId}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
      toast({ title: "Re-indexare completă", description: `${data.sectionsCount} secțiuni create.` });
    },
    onError: (err: any) => {
      toast({ title: "Eroare la re-indexare", description: err.message, variant: "destructive" });
    },
  });

  const regenerateAiMutation = useMutation({
    mutationFn: async (apelId: string) => {
      const res = await apiRequest("POST", `/api/admin/funding-calls/${apelId}/regenerate-ai`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
      toast({ title: "Campuri AI regenerate", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Eroare la regenerare AI", description: err.message, variant: "destructive" });
    },
  });

  const deleteCallMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/funding-calls/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
      setDeleteCall(null);
      toast({ title: "Apel șters", description: "Apelul și toate secțiunile asociate au fost șterse." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const updateCallMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/admin/funding-calls/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
      setEditCall(null);
      toast({ title: "Apel actualizat", description: "Modificările au fost salvate cu succes." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const uploadGuideMutation = useMutation({
    mutationFn: async ({ callId, file }: { callId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/funding-calls/${callId}/guides`, {
        method: "POST", credentials: "include", body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Eroare la încărcare" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: any, variables: { callId: string; file: File }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", variables.callId, "guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
      setUploadingGuide(false);
      toast({ title: "Ghid încărcat", description: data.message || `${data.sections_created || 0} secțiuni indexate.` });
    },
    onError: (err: any) => {
      setUploadingGuide(false);
      toast({ title: "Eroare la încărcare", description: err.message, variant: "destructive" });
    },
  });

  const deleteGuideMutation = useMutation({
    mutationFn: async ({ callId, guideId }: { callId: string; guideId: string }) => {
      const res = await apiRequest("DELETE", `/api/admin/funding-calls/${callId}/guides/${guideId}`);
      return res.json();
    },
    onSuccess: (_data: any, variables: { callId: string; guideId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", variables.callId, "guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
      toast({ title: "Ghid șters", description: "Ghidul și secțiunile asociate au fost șterse." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ callId, files }: { callId: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      const res = await fetch(`/api/admin/funding-calls/${callId}/attachments`, {
        method: "POST", credentials: "include", body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Eroare la încărcare" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: any, variables: { callId: string; files: File[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", variables.callId, "guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
      setUploadingAttachment(false);
      toast({ title: "Documente atașate", description: data.message || "Documentele au fost încărcate." });
    },
    onError: (err: any) => {
      setUploadingAttachment(false);
      toast({ title: "Eroare la încărcare", description: err.message, variant: "destructive" });
    },
  });

  const createManualCallMutation = useMutation({
    mutationFn: async () => {
      if (!createCallFile) throw new Error("Selectează un fișier");
      const pId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setCreateCallProgressId(pId);
      setCreateCallPhase("indexing");
      const formData = new FormData();
      formData.append("file", createCallFile);
      formData.append("progressId", pId);
      if (createCallName.trim()) formData.append("name", createCallName.trim());
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch("/api/admin/funding-calls/create-manual", {
          method: "POST", credentials: "include", body: formData, signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Eroare la creare" }));
          throw new Error(err.message);
        }
        return await res.json();
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") throw new Error("Timpul de așteptare a expirat. Verificați lista de apeluri.");
        throw err;
      }
    },
    onSuccess: () => {
      toast({ title: "Apel creat cu succes", description: "Procesarea si generarea AI ruleaza in fundal." });
      setShowCreateCallDialog(false);
      setCreateCallName("");
      setCreateCallFile(null);
      setCreateCallPhase("idle");
      setCreateCallProgressId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
    },
    onError: (err: any) => {
      setCreateCallProgressId(null);
      setCreateCallPhase("idle");
      toast({ title: "Eroare la creare", description: err.message, variant: "destructive" });
    },
  });

  const openEditDialog = (call: any) => {
    setEditCall(call);
    setEditForm({
      name: call.name || "",
      program: call.program || "",
      description: call.description || "",
      summary: call.summary || "",
      category: call.category || "",
      status: call.status || "active",
      deadline: call.deadline ? new Date(call.deadline).toISOString().slice(0, 16) : "",
      maxFunding: call.maxFunding ?? "",
      minEmployees: call.minEmployees ?? "",
      minRevenue: call.minRevenue ?? "",
      minCompanyAge: call.minCompanyAge ?? "",
      requiresProfit: call.requiresProfit || false,
      eligibleCaen: (call.eligibleCaen || []).join(", "),
      eligibleRegions: (call.eligibleRegions || []).join(", "),
      beneficiaryTypes: (call.beneficiaryTypes || []).join(", "),
      eligibleSizeCategories: (call.eligibleSizeCategories || []).join(", "),
      sourceUrl: call.sourceUrl || "",
      bugetUe: call.bugetUe || "",
      bugetNational: (call as any).bugetNational || "",
      moneda: (call as any).moneda || "",
      monedaUe: (call as any).monedaUe || (call as any).moneda || "",
      monedaNational: (call as any).monedaNational || (call as any).moneda || "",
      dataLimita: call.dataLimita || "",
    });
  };

  const handleSaveCall = () => {
    if (!editCall) return;
    const data: Record<string, any> = { ...editForm };
    for (const key of ["eligibleCaen", "eligibleRegions", "beneficiaryTypes", "eligibleSizeCategories"]) {
      if (typeof data[key] === "string") {
        data[key] = data[key].split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    if (data.maxFunding === "") data.maxFunding = null;
    if (data.minEmployees === "") data.minEmployees = null;
    if (data.minRevenue === "") data.minRevenue = null;
    if (data.minCompanyAge === "") data.minCompanyAge = null;
    if (data.deadline === "") data.deadline = null;
    if (!data.monedaUe && data.bugetUe) data.monedaUe = "EUR";
    if (!data.monedaNational && data.bugetNational) data.monedaNational = "RON";
    if (!data.bugetNational) { data.bugetNational = null; data.monedaNational = data.monedaUe || "EUR"; }
    updateCallMutation.mutate({ id: editCall.id, data });
  };

  const handleGuideUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guideCall) return;
    setUploadingGuide(true);
    uploadGuideMutation.mutate({ callId: guideCall.id, file });
    e.target.value = "";
  };

  const handleAttachmentUpload = (e: any) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !guideCall) return;
    setUploadingAttachment(true);
    uploadAttachmentMutation.mutate({ callId: guideCall.id, files: Array.from(fileList) });
    e.target.value = "";
  };

  const isInitialMount = useRef(true);
  useEffect(() => {
    syncFiltersToUrl({
      search: debouncedSearch,
      stage: stageFilter,
      source: sourceFilter,
      hasDocs: docsFilter,
      indexed: indexFilter,
      sort: sortBy,
      page: String(currentPage),
      beneficiary: beneficiaryFilter.join(","),
      sectors: sectorsFilter.join(","),
      caen: caenFilter.join(","),
      regions: regionsFilter.join(","),
      minFunding: minFundingFilter !== undefined ? String(minFundingFilter) : "",
      maxFunding: maxFundingFilter !== undefined ? String(maxFundingFilter) : "",
      minTrl: minTrlFilter !== undefined ? String(minTrlFilter) : "",
      maxTrl: maxTrlFilter !== undefined ? String(maxTrlFilter) : "",
      projectMinValue: projectMinValueFilter !== undefined ? String(projectMinValueFilter) : "",
      projectMaxValue: projectMaxValueFilter !== undefined ? String(projectMaxValueFilter) : "",
      projectValueCurrency: projectValueCurrencyFilter ?? "",
      useCompany: useCompanyProfile ? "1" : "",
      companyId: useCompanyProfile && activeCompanyId ? activeCompanyId : "",
    }, !isInitialMount.current);
    isInitialMount.current = false;
  }, [debouncedSearch, stageFilter, sourceFilter, docsFilter, indexFilter, sortBy, currentPage, beneficiaryFilter, sectorsFilter, caenFilter, regionsFilter, minFundingFilter, maxFundingFilter, minTrlFilter, maxTrlFilter, projectMinValueFilter, projectMaxValueFilter, projectValueCurrencyFilter, useCompanyProfile, activeCompanyId]);

  // Pre-fill the four catalog filters when the user enables "Folosește
  // profilul companiei" or switches the active company. Tracks the exact
  // values it applied so it can subtract the previous company's contribution
  // when the user picks a different firm or flips the toggle off — anything
  // the user added manually in between is left untouched.
  useEffect(() => {
    const prev = lastAppliedSnapshot.current;

    if (!useCompanyProfile || !activeCompany) {
      // Toggle off / no company → strip the previous snapshot's contribution.
      if (prev) {
        if (prev.caens.length > 0) {
          setCaenFilter((cur) => cur.filter((c) => !prev.caens.includes(c)));
        }
        if (prev.region) {
          setRegionsFilter((cur) => cur.filter((r) => r !== prev.region));
        }
        if (prev.benef) {
          setBeneficiaryFilter((cur) => cur.filter((b) => b !== prev.benef));
        }
        lastAppliedSnapshot.current = null;
      }
      return;
    }

    const key = `1:${activeCompany.id}`;
    if (prev?.key === key) return;

    // Compute the new snapshot up-front so we can apply add/remove atomically.
    const newCaens = [activeCompany.caen, ...((activeCompany.caenSecundare as string[] | null) || [])]
      .filter((c): c is string => !!c && /^\d{4}$/.test(c));
    const newRegion = getCompanyRegion(activeCompany.judet);
    const newBenefRaw = inferBeneficiaryFromCompany({
      formaOrganizare: activeCompany.formaOrganizare,
      entityType: activeCompany.entityType,
      employees: activeCompany.employees,
      revenue: activeCompany.revenue ?? null,
    });
    const newBenef = newBenefRaw && BENEFICIARY_TYPES.some((b) => b.value === newBenefRaw) ? newBenefRaw : null;

    setCaenFilter((cur) => {
      const stripped = prev ? cur.filter((c) => !prev.caens.includes(c)) : cur;
      return Array.from(new Set([...stripped, ...newCaens]));
    });
    setRegionsFilter((cur) => {
      const stripped = prev?.region ? cur.filter((r) => r !== prev.region) : cur;
      if (newRegion && !stripped.includes(newRegion)) return [...stripped, newRegion];
      return stripped;
    });
    setBeneficiaryFilter((cur) => {
      const stripped = prev?.benef ? cur.filter((b) => b !== prev.benef) : cur;
      if (newBenef && !stripped.includes(newBenef)) return [...stripped, newBenef];
      return stripped;
    });

    lastAppliedSnapshot.current = {
      key,
      caens: newCaens,
      region: newRegion,
      benef: newBenef,
    };
    setCurrentPage(1);
  }, [useCompanyProfile, activeCompany]);

  useEffect(() => {
    const handlePopState = () => {
      const p = getUrlParams();
      setSearchFilter(p.get("search") || "");
      setDebouncedSearch(p.get("search") || "");
      setSourceFilter(p.get("source") || "");
      setDocsFilter(p.get("hasDocs") || "");
      setIndexFilter(p.get("indexed") || "");
      setStageFilter(readStageFromParams(p));
      // Task #68 (review fix): popstate respectă aceeași regulă ca initial-state.
      const sortParam = p.get("sort") as SortOption | null;
      setSortBy(sortParam ?? (readStageFromParams(p) === "urmeaza" ? "open-date-asc" : "deadline-asc"));
      setCurrentPage(Number(p.get("page")) || 1);
      setBeneficiaryFilter(csvParam(p.get("beneficiary")).filter((v) => BENEFICIARY_TYPES.some((b) => b.value === v)));
      setSectorsFilter(csvParam(p.get("sectors")).filter((v) => SECTOR_BY_SLUG.has(v)));
      setCaenFilter(csvParam(p.get("caen")).filter((v) => /^\d{4}$/.test(v)));
      setRegionsFilter(csvParam(p.get("regions")).filter((v) => ELIGIBLE_REGIONS.some((r) => r.value === v)));
      const minV = p.get("minFunding");
      const maxV = p.get("maxFunding");
      const minN = minV ? Number(minV) : NaN;
      const maxN = maxV ? Number(maxV) : NaN;
      setMinFundingFilter(Number.isFinite(minN) && minN >= 0 ? minN : undefined);
      setMaxFundingFilter(Number.isFinite(maxN) && maxN >= 0 ? maxN : undefined);
      setMinTrlFilter(readTrl(p.get("minTrl")));
      setMaxTrlFilter(readTrl(p.get("maxTrl")));
      setProjectMinValueFilter(readNum(p.get("projectMinValue")));
      setProjectMaxValueFilter(readNum(p.get("projectMaxValue")));
      setProjectValueCurrencyFilter(readCurrency(p.get("projectValueCurrency")));
      setUseCompanyProfile(p.get("useCompany") === "1");
      setActiveCompanyId(p.get("companyId") || "");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const changePage = useCallback((newPage: number | ((p: number) => number)) => {
    setCurrentPage((prev) => {
      const next = typeof newPage === "function" ? newPage(prev) : newPage;
      setTimeout(() => {
        listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return next;
    });
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchFilter(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 400);
    setSearchTimeout(timeout);
  };

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: [
      "/api/funding-calls",
      {
        search: debouncedSearch,
        stage: stageFilter,
        page: currentPage,
        limit: pageSize,
        indexed: indexFilter,
        source: sourceFilter,
        hasDocs: docsFilter,
        sort: sortBy,
        beneficiary: beneficiaryFilter.join(","),
        sectors: sectorsFilter.join(","),
        caen: caenFilter.join(","),
        regions: regionsFilter.join(","),
        minFunding: minFundingFilter,
        maxFunding: maxFundingFilter,
        minTrl: minTrlFilter,
        maxTrl: maxTrlFilter,
        projectMinValue: projectMinValueFilter,
        projectMaxValue: projectMaxValueFilter,
        projectValueCurrency: projectValueCurrencyFilter,
      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("stage", stageFilter);
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));
      if (indexFilter) params.set("indexed", indexFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      if (docsFilter) params.set("hasDocs", docsFilter);
      // „match-desc" (relevanță) e sortare client-side pe scorurile Match
      // Engine (disponibile doar în client per companie); trimitem serverului
      // un sort neutru și reordonăm pagina local mai jos.
      const serverSort = sortBy === "match-desc" ? "deadline-asc" : sortBy;
      if (serverSort) params.set("sort", serverSort);
      if (beneficiaryFilter.length > 0) params.set("beneficiary", beneficiaryFilter.join(","));
      if (sectorsFilter.length > 0) params.set("sectors", sectorsFilter.join(","));
      if (caenFilter.length > 0) params.set("caen", caenFilter.join(","));
      if (regionsFilter.length > 0) params.set("regions", regionsFilter.join(","));
      if (minFundingFilter !== undefined) params.set("minFunding", String(minFundingFilter));
      if (maxFundingFilter !== undefined) params.set("maxFunding", String(maxFundingFilter));
      if (minTrlFilter !== undefined) params.set("minTrl", String(minTrlFilter));
      if (maxTrlFilter !== undefined) params.set("maxTrl", String(maxTrlFilter));
      if (projectMinValueFilter !== undefined) params.set("projectMinValue", String(projectMinValueFilter));
      if (projectMaxValueFilter !== undefined) params.set("projectMaxValue", String(projectMaxValueFilter));
      if (projectValueCurrencyFilter) params.set("projectValueCurrency", projectValueCurrencyFilter);
      const url = `/api/funding-calls?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const fundingCalls = response?.data || [];
  const totalItems = response?.total || 0;
  const totalPages = response?.totalPages || 1;

  if (response?.stats) {
    statsRef.current = response.stats;
  }
  const stats = statsRef.current;

  const hasActiveFilters =
    !!searchFilter ||
    !!sourceFilter ||
    !!docsFilter ||
    !!indexFilter ||
    stageFilter !== "depunere_activa" ||
    sortBy !== "deadline-asc" ||
    beneficiaryFilter.length > 0 ||
    sectorsFilter.length > 0 ||
    caenFilter.length > 0 ||
    regionsFilter.length > 0 ||
    minFundingFilter !== undefined ||
    maxFundingFilter !== undefined ||
    minTrlFilter !== undefined ||
    maxTrlFilter !== undefined ||
    projectMinValueFilter !== undefined ||
    projectMaxValueFilter !== undefined ||
    projectValueCurrencyFilter !== undefined;

  const resetFilters = () => {
    setSourceFilter("");
    setDocsFilter("");
    setIndexFilter("");
    setStageFilter("depunere_activa");
    setSortBy("deadline-asc");
    setSearchFilter("");
    setDebouncedSearch("");
    setBeneficiaryFilter([]);
    setSectorsFilter([]);
    setCaenFilter([]);
    setRegionsFilter([]);
    setMinFundingFilter(undefined);
    setMaxFundingFilter(undefined);
    setMinTrlFilter(undefined);
    setMaxTrlFilter(undefined);
    setProjectMinValueFilter(undefined);
    setProjectMaxValueFilter(undefined);
    setProjectValueCurrencyFilter(undefined);
    setCurrentPage(1);
  };

  // Relevanță (match-desc): reordonăm pagina curentă după scorul Match Engine
  // (desc). Apelurile fără scor merg la coadă. Sortarea e per-pagină (scorurile
  // există doar client-side per companie); pentru restul sortărilor folosim
  // ordinea de la server ca atare.
  const filtered = useMemo(() => {
    if (sortBy !== "match-desc" || !useCompanyProfile) return fundingCalls;
    return [...fundingCalls].sort((a, b) => {
      const sa = matchScoresByCallId.get(a.id);
      const sb = matchScoresByCallId.get(b.id);
      if (sa == null && sb == null) return 0;
      if (sa == null) return 1;
      if (sb == null) return -1;
      return sb - sa;
    });
  }, [fundingCalls, sortBy, useCompanyProfile, matchScoresByCallId]);

  // Task #151 (duplicate): apelurile cvasi-duplicate sunt detectate AUTORITATIV
  // pe server, pe ÎNTREG setul filtrat (nu doar pagina curentă), și returnate ca
  // `duplicateIds`. Aici doar le marcăm vizual cu badge-ul „Posibil duplicat"
  // (NU ștergere automată; deduplicarea reală la import rămâne în pipeline).
  const duplicateCallIds = useMemo(
    () => new Set(response?.duplicateIds ?? []),
    [response?.duplicateIds],
  );

  const sources = stats?.sources || Array.from(new Set(fundingCalls.map((c) => c.source).filter(Boolean)));

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 lg:space-y-4 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 lg:space-y-0">
          <h1 className="text-2xl lg:text-xl font-serif font-bold tracking-tight" data-testid="text-funding-calls-title">
            Apeluri de finanțare
          </h1>
          <p className="text-muted-foreground lg:text-xs">
            Catalogul complet al apelurilor de finanțare disponibile.
          </p>
        </div>
        {isSuperAdmin && (
          <Button size="sm" onClick={() => setShowCreateCallDialog(true)} data-testid="button-create-manual-call">
            <FileUp className="w-4 h-4 mr-1.5" />
            Adaugă apel
          </Button>
        )}
      </div>

      <div className={`grid grid-cols-2 gap-3 lg:gap-2 ${isSuperAdmin ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-4"}`}>
        <Card className="p-3 sm:p-4 lg:p-2.5 space-y-1 lg:space-y-0.5 border-t-2 border-t-[hsl(48,100%,50%)]" data-testid="card-stat-total">
          <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-6 lg:h-6 rounded-lg bg-[hsl(48,100%,50%)]/15 flex items-center justify-center">
            <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-3 lg:h-3 text-[hsl(48,100%,45%)]" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-lg font-bold text-[hsl(228,100%,19.6%)]">{stats ? stats.active + stats.upcoming + stats.expired : totalItems}</p>
          <p className="text-[10px] sm:text-xs lg:text-[10px] text-muted-foreground">Total apeluri</p>
        </Card>
        <Card
          className={`p-3 sm:p-4 lg:p-2.5 space-y-1 lg:space-y-0.5 cursor-pointer transition-colors border-t-2 ${stageFilter === "depunere_activa" ? "border-t-green-500 border-green-400 bg-green-50/50 dark:bg-green-950/20" : "border-t-green-500 hover:border-green-300"}`}
          onClick={() => { setStageFilter(stageFilter === "depunere_activa" ? "toate" : "depunere_activa"); setCurrentPage(1); }}
          data-testid="card-stat-active"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-6 lg:h-6 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-3 lg:h-3 text-green-600" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-lg font-bold text-green-600">{stats?.active ?? "-"}</p>
          <p className="text-[10px] sm:text-xs lg:text-[10px] text-muted-foreground">Active</p>
        </Card>
        <Card
          className={`p-3 sm:p-4 lg:p-2.5 space-y-1 lg:space-y-0.5 cursor-pointer transition-colors border-t-2 ${stageFilter === "urmeaza" ? "border-t-amber-500 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" : "border-t-amber-500 hover:border-amber-300"}`}
          onClick={() => { setStageFilter(stageFilter === "urmeaza" ? "toate" : "urmeaza"); setCurrentPage(1); }}
          data-testid="card-stat-upcoming"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-6 lg:h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-3 lg:h-3 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-lg font-bold text-amber-600">{stats?.upcoming ?? "-"}</p>
          <p className="text-[10px] sm:text-xs lg:text-[10px] text-muted-foreground">Urmează</p>
        </Card>
        <Card
          className={`p-3 sm:p-4 lg:p-2.5 space-y-1 lg:space-y-0.5 cursor-pointer transition-colors border-t-2 ${stageFilter === "expirat" ? "border-t-red-500 border-red-400 bg-red-50/50 dark:bg-red-950/20" : "border-t-red-500 hover:border-red-300"}`}
          onClick={() => { setStageFilter(stageFilter === "expirat" ? "toate" : "expirat"); setCurrentPage(1); }}
          data-testid="card-stat-expired"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-6 lg:h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-3 lg:h-3 text-red-500" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-lg font-bold text-red-500">{stats?.expired ?? "-"}</p>
          <p className="text-[10px] sm:text-xs lg:text-[10px] text-muted-foreground">Expirate</p>
        </Card>
        {isSuperAdmin && (
          <Card
            className={`p-3 sm:p-4 lg:p-2.5 space-y-1 lg:space-y-0.5 cursor-pointer transition-colors border-t-2 ${indexFilter === "indexat" ? "border-t-blue-500 border-blue-400 bg-blue-50/50 dark:bg-blue-950/20" : "border-t-blue-500 hover:border-blue-300"}`}
            onClick={() => { setIndexFilter(indexFilter === "indexat" ? "" : "indexat"); setCurrentPage(1); }}
            data-testid="card-stat-indexed"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-6 lg:h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-3 lg:h-3 text-blue-600" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-lg font-bold text-blue-600">{stats?.indexed ?? "-"}</p>
            <p className="text-[10px] sm:text-xs lg:text-[10px] text-muted-foreground">Indexate</p>
          </Card>
        )}
      </div>

      {/* Task #68: tabs lifecycle care înlocuiesc selectul de status. */}
      <Tabs
        value={stageFilter}
        onValueChange={(v) => {
          const next = v as StageFilter;
          setStageFilter(next);
          setCurrentPage(1);
          // Task #68 (review fix): tab-ul "Urmează" are ca default natural
          // ordonarea după data deschiderii (cea mai apropiată prima). Aplicăm
          // schimbarea doar dacă utilizatorul nu a setat manual o sortare —
          // adică sortBy e încă pe default-ul global "deadline-asc". Și
          // simetric, la ieșirea din "Urmează" revenim la "deadline-asc" dacă
          // sortBy era pe "open-date-asc" (presupus auto-aplicat).
          if (next === "urmeaza" && sortBy === "deadline-asc") {
            setSortBy("open-date-asc");
          } else if (next !== "urmeaza" && sortBy === "open-date-asc") {
            setSortBy("deadline-asc");
          }
        }}
      >
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 sm:w-auto sm:inline-grid">
          <TabsTrigger value="toate" data-testid="tab-stage-toate">Toate</TabsTrigger>
          <TabsTrigger value="in_consultare" data-testid="tab-stage-in-consultare">În consultare</TabsTrigger>
          <TabsTrigger value="depunere_activa" data-testid="tab-stage-depunere">În depunere</TabsTrigger>
          <TabsTrigger value="urmeaza" data-testid="tab-stage-urmeaza">Urmează</TabsTrigger>
          <TabsTrigger value="expirat" data-testid="tab-stage-expirate">Expirate</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-3 sm:p-5 space-y-4" data-testid="card-filters">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchFilter}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Caută după nume, descriere, program..."
            className="pl-9 h-10"
            data-testid="input-search-calls"
          />
        </div>

        {/* Company-profile pre-fill toggle: pre-populates the four catalog
            filters from the active company and ranks calls by match-engine
            relevance. Hidden when the user has no companies on file. */}
        {(userCompanies?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <Label
                  htmlFor="toggle-use-company"
                  className="text-xs font-semibold cursor-pointer"
                  data-testid="label-use-company"
                >
                  Folosește profilul companiei
                </Label>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {useCompanyProfile && activeCompany
                    ? `Filtrele și relevanța sunt calibrate pentru ${activeCompany.name}.`
                    : "Pre-completează filtrele și ordonează apelurile după potrivire."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(userCompanies?.length ?? 0) > 1 && useCompanyProfile && (
                <Select
                  value={activeCompany?.id || ""}
                  onValueChange={(val) => {
                    setActiveCompanyId(val);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs min-w-[140px]" data-testid="select-active-company">
                    <SelectValue placeholder="Alege firma" />
                  </SelectTrigger>
                  <SelectContent>
                    {userCompanies?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Switch
                id="toggle-use-company"
                checked={useCompanyProfile}
                onCheckedChange={(v) => {
                  setUseCompanyProfile(v);
                  if (v && !activeCompanyId && userCompanies?.[0]?.id) {
                    setActiveCompanyId(userCompanies[0].id);
                  }
                }}
                data-testid="switch-use-company"
              />
            </div>
          </div>
        )}

        {/* Primary filter row: catalog filters that drive matching */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Filtrează după criterii
            </p>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={resetFilters}
                data-testid="button-reset-filters"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Resetează tot
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Tip beneficiar
              </Label>
              <MultiSelectPopover
                options={BENEFICIARY_TYPES}
                value={beneficiaryFilter}
                onChange={(v) => { setBeneficiaryFilter(v); setCurrentPage(1); }}
                placeholder="Toate tipurile"
                testIdPrefix="filter-beneficiary"
                triggerClassName="w-full h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground flex items-center gap-1.5">
                <Landmark className="w-3 h-3" /> Sector / CAEN
              </Label>
              <SectorCaenAutocomplete
                selectedSectors={sectorsFilter}
                selectedCaen={caenFilter}
                onChangeSectors={(v) => { setSectorsFilter(v); setCurrentPage(1); }}
                onChangeCaen={(v) => { setCaenFilter(v); setCurrentPage(1); }}
                triggerClassName="w-full h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Regiune
              </Label>
              <MultiSelectPopover
                options={ELIGIBLE_REGIONS}
                value={regionsFilter}
                onChange={(v) => { setRegionsFilter(v); setCurrentPage(1); }}
                placeholder="Toate regiunile"
                testIdPrefix="filter-region"
                triggerClassName="w-full h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground flex items-center gap-1.5">
                <Coins className="w-3 h-3" /> Buget
              </Label>
              <AmountRangeFilter
                min={minFundingFilter}
                max={maxFundingFilter}
                onChange={({ min, max }) => {
                  setMinFundingFilter(min);
                  setMaxFundingFilter(max);
                  setCurrentPage(1);
                }}
                triggerClassName="w-full h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Task #76 (NEW-E.5) — Filtre avansate Structural Phase v2.
            Backend folosește soft-gating: apelurile cu coloane NULL NU sunt
            excluse (semantic „nu pot confirma că nu eligibil" — vezi match.ts). */}
        <Collapsible open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground -ml-2"
              data-testid="button-toggle-advanced-filters"
              aria-expanded={advancedFiltersOpen}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              Filtre avansate
              {advancedFiltersOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> Nivel TRL (1–9)
                  </Label>
                  <span className="text-[11px] font-medium text-foreground" data-testid="text-trl-range">
                    {minTrlFilter !== undefined || maxTrlFilter !== undefined
                      ? `TRL ${trlDraft[0]}–${trlDraft[1]}`
                      : "oricare"}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={9}
                  step={1}
                  value={trlDraft}
                  onValueChange={(vals) => {
                    if (Array.isArray(vals) && vals.length === 2) {
                      setTrlDraft([vals[0]!, vals[1]!]);
                    }
                  }}
                  onValueCommit={(vals) => {
                    if (Array.isArray(vals) && vals.length === 2) {
                      const [lo, hi] = vals;
                      const next: [number, number] = [Math.min(lo!, hi!), Math.max(lo!, hi!)];
                      const full = next[0] === 1 && next[1] === 9;
                      setMinTrlFilter(full ? undefined : next[0]);
                      setMaxTrlFilter(full ? undefined : next[1]);
                      setCurrentPage(1);
                    }
                  }}
                  data-testid="slider-trl-range"
                  aria-label="Interval TRL"
                />
                <p className="text-[11px] text-muted-foreground">
                  Apelurile fără TRL declarat rămân vizibile (nu pot fi excluse cu certitudine).
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Banknote className="w-3 h-3" /> Buget per proiect
                </Label>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Minim"
                    className="h-9 text-sm"
                    value={projectMinValueFilter ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = v ? Number(v) : NaN;
                      setProjectMinValueFilter(Number.isFinite(n) && n >= 0 ? n : undefined);
                      setCurrentPage(1);
                    }}
                    data-testid="input-project-min-value"
                    aria-label="Buget minim per proiect"
                  />
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Maxim"
                    className="h-9 text-sm"
                    value={projectMaxValueFilter ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = v ? Number(v) : NaN;
                      setProjectMaxValueFilter(Number.isFinite(n) && n >= 0 ? n : undefined);
                      setCurrentPage(1);
                    }}
                    data-testid="input-project-max-value"
                    aria-label="Buget maxim per proiect"
                  />
                  <Select
                    value={projectValueCurrencyFilter ?? "any"}
                    onValueChange={(val) => {
                      setProjectValueCurrencyFilter(val === "EUR" || val === "RON" ? (val as "EUR" | "RON") : undefined);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[110px] text-sm" data-testid="select-project-value-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Oricare</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="RON">RON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Comparația ține cont de moneda apelului — RON vs EUR nu se compară încrucișat.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Secondary row: status, source, sort and admin-only filters */}
        <div className="border-t pt-3">
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            {/* Task #68: status select înlocuit cu Tabs (vezi mai sus, peste stat cards). */}
            {sources.length > 0 && (
              <div className="flex-1 min-w-[120px] sm:min-w-[140px]">
                <Label className="text-xs mb-1 block text-muted-foreground">Sursă</Label>
                <Select value={sourceFilter || "all"} onValueChange={(val) => { setSourceFilter(val === "all" ? "" : val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-source">
                    <SelectValue placeholder="Toate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    {(sources as (string | null)[]).filter((s): s is string => !!s).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isSuperAdmin && (
              <div className="flex-1 min-w-[120px] sm:min-w-[140px]">
                <Label className="text-xs mb-1 block text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-amber-600" /> Documente
                </Label>
                <Select value={docsFilter || "all"} onValueChange={(val) => { setDocsFilter(val === "all" ? "" : val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-docs-filter">
                    <SelectValue placeholder="Toate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    <SelectItem value="cu-docs">Cu documente</SelectItem>
                    <SelectItem value="fara-docs">Fără documente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {isSuperAdmin && (
              <div className="flex-1 min-w-[140px] sm:min-w-[160px]">
                <Label className="text-xs mb-1 block text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-amber-600" /> Indexare AI
                </Label>
                <Select value={indexFilter || "all"} onValueChange={(val) => { setIndexFilter(val === "all" ? "" : val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-index-filter">
                    <SelectValue placeholder="Toate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    <SelectItem value="indexat">Indexate</SelectItem>
                    <SelectItem value="indexat-icp">Gata pt. ICP (5+)</SelectItem>
                    <SelectItem value="neindexat">Neindexate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="border-l pl-2 sm:pl-3 ml-auto min-w-[140px] sm:min-w-[180px]">
              <Label className="text-xs mb-1 block text-muted-foreground">Sortare</Label>
              <Select value={sortBy} onValueChange={(val) => { setSortBy(val as SortOption); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 text-sm" data-testid="select-sort">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline-asc">Deadline (cel mai aproape)</SelectItem>
                  <SelectItem value="deadline-desc">Deadline (cel mai îndepărtat)</SelectItem>
                  <SelectItem value="budget-desc">Buget (descrescător)</SelectItem>
                  <SelectItem value="newest">Cele mai noi</SelectItem>
                  <SelectItem value="open-date-asc">Deschidere (cel mai aproape)</SelectItem>
                  {useCompanyProfile && <SelectItem value="match-desc">Relevanță (potrivire)</SelectItem>}
                  {isSuperAdmin && <SelectItem value="rag-desc">Sectiuni AI (descrescator)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {sortBy === "match-desc" && useCompanyProfile && (
          <p
            className="text-xs text-muted-foreground mt-2"
            data-testid="text-relevance-sort-hint"
          >
            Sortarea după relevanță se aplică pe apelurile din pagina curentă.
          </p>
        )}

        {/* Empty-filter hint: encourages users with a company profile to flip
            on the "Folosește profilul companiei" toggle when they haven't yet
            filtered the catalog. */}
        {!useCompanyProfile &&
          (userCompanies?.length ?? 0) > 0 &&
          beneficiaryFilter.length === 0 &&
          sectorsFilter.length === 0 &&
          caenFilter.length === 0 &&
          regionsFilter.length === 0 &&
          minFundingFilter === undefined &&
          maxFundingFilter === undefined && (
            <p
              className="text-[11px] text-muted-foreground italic flex items-center gap-1.5 pt-1"
              data-testid="hint-use-company"
            >
              <Sparkles className="w-3 h-3 text-primary" />
              Activează „Folosește profilul companiei" pentru a vedea apelurile potrivite cu firma ta.
            </p>
          )}

        {/* Active filter chips with one-click removal */}
        {(beneficiaryFilter.length > 0 || sectorsFilter.length > 0 || caenFilter.length > 0 || regionsFilter.length > 0 || minFundingFilter !== undefined || maxFundingFilter !== undefined || minTrlFilter !== undefined || maxTrlFilter !== undefined || projectMinValueFilter !== undefined || projectMaxValueFilter !== undefined || projectValueCurrencyFilter !== undefined) && (
          <div
            className="flex flex-wrap items-center gap-1.5 pt-2 border-t min-w-0"
            data-testid="filter-chips"
            role="group"
            aria-label="Filtre active"
          >
            <span className="text-[11px] font-medium text-muted-foreground mr-1" id="active-filters-label">
              Filtre active:
            </span>
            {beneficiaryFilter.map((v) => (
              <button
                key={`b-${v}`}
                type="button"
                aria-label={`Elimină filtrul beneficiar: ${getBeneficiaryLabel(v)}`}
                onClick={() => { setBeneficiaryFilter(beneficiaryFilter.filter((x) => x !== v)); setCurrentPage(1); }}
                className={chipButtonClass}
                data-testid={`chip-beneficiary-${v}`}
              >
                {getBeneficiaryLabel(v)}
                <span aria-hidden>×</span>
              </button>
            ))}
            {sectorsFilter.map((v) => (
              <button
                key={`s-${v}`}
                type="button"
                aria-label={`Elimină filtrul sector: ${getSectorLabel(v)}`}
                onClick={() => { setSectorsFilter(sectorsFilter.filter((x) => x !== v)); setCurrentPage(1); }}
                className={chipButtonClass}
                data-testid={`chip-sector-${v}`}
              >
                Sector: {getSectorLabel(v)}
                <span aria-hidden>×</span>
              </button>
            ))}
            {caenFilter.map((v) => (
              <button
                key={`c-${v}`}
                type="button"
                aria-label={`Elimină filtrul CAEN ${v}`}
                onClick={() => { setCaenFilter(caenFilter.filter((x) => x !== v)); setCurrentPage(1); }}
                className={`${chipButtonClass} font-mono`}
                data-testid={`chip-caen-${v}`}
              >
                CAEN {v}
                <span aria-hidden>×</span>
              </button>
            ))}
            {regionsFilter.map((v) => (
              <button
                key={`r-${v}`}
                type="button"
                aria-label={`Elimină filtrul regiune: ${getRegionLabel(v)}`}
                onClick={() => { setRegionsFilter(regionsFilter.filter((x) => x !== v)); setCurrentPage(1); }}
                className={chipButtonClass}
                data-testid={`chip-region-${v}`}
              >
                {getRegionLabel(v)}
                <span aria-hidden>×</span>
              </button>
            ))}
            {(minFundingFilter !== undefined || maxFundingFilter !== undefined) && (
              <button
                type="button"
                aria-label={`Elimină filtrul buget: ${minFundingFilter !== undefined ? `${minFundingFilter.toLocaleString("ro-RO")}` : "0"} până la ${maxFundingFilter !== undefined ? `${maxFundingFilter.toLocaleString("ro-RO")}` : "infinit"} EUR`}
                onClick={() => { setMinFundingFilter(undefined); setMaxFundingFilter(undefined); setCurrentPage(1); }}
                className={chipButtonClass}
                data-testid="chip-amount"
              >
                Buget: {minFundingFilter !== undefined ? `${minFundingFilter.toLocaleString("ro-RO")}` : "0"} – {maxFundingFilter !== undefined ? `${maxFundingFilter.toLocaleString("ro-RO")}` : "∞"} EUR
                <span aria-hidden>×</span>
              </button>
            )}
            {(minTrlFilter !== undefined || maxTrlFilter !== undefined) && (
              <button
                type="button"
                aria-label={`Elimină filtrul TRL: ${minTrlFilter ?? 1}–${maxTrlFilter ?? 9}`}
                onClick={() => { setMinTrlFilter(undefined); setMaxTrlFilter(undefined); setCurrentPage(1); }}
                className={chipButtonClass}
                data-testid="chip-trl"
              >
                TRL {minTrlFilter ?? 1}–{maxTrlFilter ?? 9}
                <span aria-hidden>×</span>
              </button>
            )}
            {(projectMinValueFilter !== undefined || projectMaxValueFilter !== undefined || projectValueCurrencyFilter !== undefined) && (
              <button
                type="button"
                aria-label="Elimină filtrul buget per proiect"
                onClick={() => {
                  setProjectMinValueFilter(undefined);
                  setProjectMaxValueFilter(undefined);
                  setProjectValueCurrencyFilter(undefined);
                  setCurrentPage(1);
                }}
                className={chipButtonClass}
                data-testid="chip-project-value"
              >
                Proiect: {projectMinValueFilter !== undefined ? projectMinValueFilter.toLocaleString("ro-RO") : "0"} – {projectMaxValueFilter !== undefined ? projectMaxValueFilter.toLocaleString("ro-RO") : "∞"} {projectValueCurrencyFilter ?? "orice monedă"}
                <span aria-hidden>×</span>
              </button>
            )}
            {((beneficiaryFilter.length + sectorsFilter.length + caenFilter.length + regionsFilter.length) > 1 ||
              minFundingFilter !== undefined || maxFundingFilter !== undefined ||
              minTrlFilter !== undefined || maxTrlFilter !== undefined ||
              projectMinValueFilter !== undefined || projectMaxValueFilter !== undefined ||
              projectValueCurrencyFilter !== undefined) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground"
                onClick={() => {
                  setBeneficiaryFilter([]);
                  setSectorsFilter([]);
                  setCaenFilter([]);
                  setRegionsFilter([]);
                  setMinFundingFilter(undefined);
                  setMaxFundingFilter(undefined);
                  setMinTrlFilter(undefined);
                  setMaxTrlFilter(undefined);
                  setProjectMinValueFilter(undefined);
                  setProjectMaxValueFilter(undefined);
                  setProjectValueCurrencyFilter(undefined);
                  setCurrentPage(1);
                }}
                data-testid="button-clear-all-chips"
              >
                Șterge tot
              </Button>
            )}
          </div>
        )}
      </Card>

      <div ref={listTopRef} className="scroll-mt-4" />

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2" data-testid="pagination-top">
          <p className="text-xs text-muted-foreground" data-testid="text-page-info-top">
            Pagina {currentPage} din {totalPages}, apelul {(currentPage - 1) * pageSize + 1} la {Math.min(currentPage * pageSize, totalItems)} din {totalItems}
            {stageFilter !== "toate" && ` · ${stageFilter === "in_consultare" ? "În consultare" : stageFilter === "depunere_activa" ? "În depunere" : stageFilter === "urmeaza" ? "Urmează" : "Expirate"}`}
            {indexFilter && ` · ${indexFilter === "indexat" ? "Indexate" : indexFilter === "indexat-icp" ? "Gata pt. ICP" : "Neindexate"}`}
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changePage(1)} disabled={currentPage <= 1} data-testid="button-first-page-top">
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changePage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} data-testid="button-prev-page-top">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {currentPage} / {totalPages}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changePage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} data-testid="button-next-page-top">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changePage(totalPages)} disabled={currentPage >= totalPages} data-testid="button-last-page-top">
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {totalPages <= 1 && totalItems > 0 && (
        <p className="text-xs text-muted-foreground">
          {totalItems} apelur{totalItems !== 1 ? "i" : ""}
          {stageFilter !== "toate" && ` · ${stageFilter === "in_consultare" ? "În consultare" : stageFilter === "depunere_activa" ? "În depunere" : stageFilter === "urmeaza" ? "Urmează" : "Expirate"}`}
          {indexFilter && ` · ${indexFilter === "indexat" ? "Indexate" : indexFilter === "indexat-icp" ? "Gata pt. ICP" : "Neindexate"}`}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((call, idx) => {
            const expired = isExpired(call);
            return (
              <AnimatedItem key={call.id} index={idx} onClick={() => setSelectedCall(call)}>
              <Card
                className={`p-5 space-y-4 cursor-pointer hover:border-primary/40 transition-colors ${expired ? "opacity-70" : ""}`}
                data-testid={`card-call-${call.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {call.program && (
                      <p className="text-xs font-semibold text-primary tracking-wide uppercase" data-testid={`text-call-program-${call.id}`}>{call.program}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm leading-snug" title={call.name} data-testid={`text-call-name-${call.id}`}>{formatCallDisplayTitle(call.name)}</h3>
                      {call.source && call.source.trim().toUpperCase() !== "RO" && (
                        <Badge variant="outline" className="no-default-active-elevate text-xs">{call.source}</Badge>
                      )}
                      {/* Task #68: badge lifecycle (Urmează — DD luna / În depunere / Expirat). */}
                      <LifecycleBadge
                        callId={call.id}
                        stage={(call as any).lifecycleStage as LifecycleStage | null | undefined}
                        opensAt={(call as any).openDate as string | null | undefined}
                        deadline={call.deadline as unknown as string | null | undefined}
                      />
                      
                      {call.hasGhid && (
                        <Badge variant="secondary" className="no-default-active-elevate text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <BookOpen className="w-3 h-3 mr-1" />
                          Ghid disponibil
                        </Badge>
                      )}
                      {duplicateCallIds.has(call.id) && (
                        <Badge
                          variant="outline"
                          className="no-default-active-elevate text-xs border-amber-400/60 text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-900/20"
                          data-testid={`badge-duplicate-${call.id}`}
                          title="Acest apel pare să apară de mai multe ori (același titlu, program și termen-limită). Verifică cifrele înainte de a-l folosi."
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Posibil duplicat
                        </Badge>
                      )}
                      {isSuperAdmin && (call as any).hasDataIssues && (
                        <Badge variant="secondary" className="no-default-active-elevate text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid={`badge-data-issues-${call.id}`}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Date incomplete
                        </Badge>
                      )}
                      {isSuperAdmin && (call.ragSections || 0) > 0 ? (
                        <Badge variant="secondary" className={`no-default-active-elevate text-xs ${(call.ragSections || 0) >= 5 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                          <Database className="w-3 h-3 mr-1" />
                          {call.ragSections} secțiuni
                        </Badge>
                      ) : null}
                      {(() => {
                        // Relevance badge: prefer the authoritative Match
                        // Engine score (which already blends structural +
                        // semantic + RAG); fall back to a local filter-overlap
                        // estimate only when the engine has no result for this
                        // call. We do NOT post-mix the two — that would double-
                        // count the structural signal already inside engine.
                        if (!useCompanyProfile) return null;
                        const engineScore = matchScoresByCallId.get(call.id);
                        let value: number | null = null;
                        let source: "engine" | "overlap" | null = null;
                        if (typeof engineScore === "number") {
                          value = Math.round(engineScore);
                          source = "engine";
                        } else {
                          const callCaen = (call.eligibleCaen as string[] | null) || [];
                          const callRegions = (call.eligibleRegions as string[] | null) || [];
                          const callBeneficiaries =
                            ((call as FundingCall).beneficiaryTypes as string[] | null) || [];
                          let matched = 0;
                          let total = 0;
                          for (const slug of sectorsFilter) {
                            total++;
                            const sector = SECTOR_BY_SLUG.get(slug);
                            if (sector && sector.caenCodes.some((c) => callCaen.includes(c))) matched++;
                          }
                          for (const c of caenFilter) {
                            total++;
                            if (callCaen.includes(c)) matched++;
                          }
                          for (const r of regionsFilter) {
                            total++;
                            if (r === NATIONAL_REGION_VALUE && callRegions.length === 0) matched++;
                            else if (callRegions.includes(r)) matched++;
                          }
                          for (const b of beneficiaryFilter) {
                            total++;
                            if (callBeneficiaries.includes(b)) matched++;
                          }
                          if (total > 0) {
                            value = Math.round((matched / total) * 100);
                            source = "overlap";
                          }
                        }
                        if (value === null) return null;
                        const tone =
                          value >= 70
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300/50"
                            : value >= 40
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300/50"
                            : "bg-muted text-muted-foreground border-muted-foreground/20";
                        const tooltip =
                          source === "engine"
                            ? `Scor Match Engine ${value}% (structural + semantic + RAG)`
                            : `Estimare pe baza suprapunerii cu filtrele active (${value}%)`;
                        return (
                          <Badge
                            variant="outline"
                            className={`no-default-active-elevate text-xs ${tone}`}
                            data-testid={`badge-relevance-${call.id}`}
                            title={tooltip}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {source === "engine" ? "Match" : "Potrivire"} {value}%
                          </Badge>
                        );
                      })()}
                      {(() => {
                        // Compute up to 2 "why-it-matches" badges based on overlap
                        // between user's active filters and this call's eligibility data.
                        const matchBadges: { label: string; key: string }[] = [];
                        const callCaen = (call.eligibleCaen as string[] | null) || [];
                        const callRegions = (call.eligibleRegions as string[] | null) || [];
                        const callBeneficiaries = ((call as any).beneficiaryTypes as string[] | null) || [];
                        for (const slug of sectorsFilter) {
                          const sector = SECTOR_BY_SLUG.get(slug);
                          if (!sector) continue;
                          if (sector.caenCodes.some((c) => callCaen.includes(c))) {
                            matchBadges.push({ key: `sec-${slug}`, label: sector.label });
                          }
                        }
                        for (const c of caenFilter) {
                          if (callCaen.includes(c)) matchBadges.push({ key: `c-${c}`, label: `CAEN ${c}` });
                        }
                        for (const r of regionsFilter) {
                          if (r === NATIONAL_REGION_VALUE && callRegions.length === 0) {
                            matchBadges.push({ key: `r-${r}`, label: "Național" });
                          } else if (callRegions.includes(r)) {
                            matchBadges.push({ key: `r-${r}`, label: r });
                          }
                        }
                        for (const b of beneficiaryFilter) {
                          if (callBeneficiaries.includes(b)) {
                            matchBadges.push({ key: `b-${b}`, label: getBeneficiaryLabel(b) });
                          }
                        }
                        return matchBadges.slice(0, 2).map((m) => (
                          <Badge
                            key={m.key}
                            variant="outline"
                            className="no-default-active-elevate text-xs border-primary/40 text-primary bg-primary/5"
                            data-testid={`match-badge-${call.id}-${m.key}`}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {m.label}
                          </Badge>
                        ));
                      })()}
                    </div>
                    {(() => {
                      // Task #140 (C-02): preferă rezumatul AI curat (`summary`);
                      // cade grațios pe `description` brut doar când lipsește.
                      const cardSummary = stripHtml((call as any).summary) || stripHtml(call.description);
                      return cardSummary ? (
                        <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-call-summary-${call.id}`}>{cardSummary}</p>
                      ) : null;
                    })()}
                    {(() => {
                      // Task #140 (C-06): când un filtru Sector/CAEN e activ dar
                      // apelul nu are CAEN-uri eligibile declarate, apariția lui se
                      // datorează potrivirii pe text — nu unei eligibilități CAEN
                      // confirmate. Marcăm vizual „date indisponibile" ca să nu
                      // confunde utilizatorul cu o potrivire structurală certă.
                      const caenFilterActive = sectorsFilter.length > 0 || caenFilter.length > 0;
                      const callCaen = (call.eligibleCaen as string[] | null) || [];
                      if (!caenFilterActive || callCaen.length > 0) return null;
                      return (
                        <Badge
                          variant="outline"
                          className="no-default-active-elevate text-[10px] font-normal text-muted-foreground border-dashed"
                          data-testid={`badge-caen-missing-${call.id}`}
                          title="Apelul apare pe baza potrivirii pe text; codurile CAEN eligibile nu sunt declarate, deci eligibilitatea pe activitate nu poate fi confirmată."
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Date CAEN indisponibile
                        </Badge>
                      );
                    })()}
                    {(() => {
                      // Task #140 (C-06, regiune): când un filtru de regiune
                      // specifică e activ dar apelul nu are regiuni eligibile
                      // declarate, el apare pentru că e eligibil național (acoperire
                      // peste tot), NU pentru o potrivire regională confirmată.
                      // Marcăm vizual distinct ca utilizatorul să nu confunde
                      // „eligibil național / regiuni nedeclarate" cu un match regional.
                      const specificRegionFilterActive =
                        regionsFilter.some((r) => r !== NATIONAL_REGION_VALUE) &&
                        !regionsFilter.includes(NATIONAL_REGION_VALUE);
                      const callRegions = (call.eligibleRegions as string[] | null) || [];
                      if (!specificRegionFilterActive || callRegions.length > 0) return null;
                      return (
                        <Badge
                          variant="outline"
                          className="no-default-active-elevate text-[10px] font-normal text-muted-foreground border-dashed"
                          data-testid={`badge-region-missing-${call.id}`}
                          title="Apelul apare pentru regiunea selectată deoarece este eligibil la nivel național; nu are regiuni eligibile declarate, deci potrivirea regională nu este confirmată explicit."
                        >
                          <Globe className="w-3 h-3 mr-1" />
                          Eligibil național (regiuni nedeclarate)
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {/* Task #68: când apelul are stage=urmeaza, deadline-ul nu e
                        încă relevant pentru utilizator — afișăm countdown-ul
                        până la deschidere; pentru celelalte rămâne countdown-ul
                        clasic de deadline. */}
                    {(call as any).lifecycleStage === "urmeaza" && (call as any).openDate ? (
                      <LifecycleCountdown
                        callId={call.id}
                        lifecycleStage="urmeaza"
                        openDate={(call as any).openDate as string}
                      />
                    ) : call.deadline ? (
                      <DeadlineCountdown deadline={call.deadline as unknown as string} />
                    ) : null}
                    {isGenuineProjectMax(call as any) && call.maxFunding != null && (
                      <div className="flex flex-col items-end" data-testid={`text-call-budget-${call.id}`}>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Maxim/proiect</span>
                        <span className="text-sm font-bold text-[hsl(228,100%,19.6%)] dark:text-white whitespace-nowrap">
                          {withCallCurrency(
                            call.maxFunding >= 1000000
                              ? `${(call.maxFunding / 1000000).toFixed(call.maxFunding % 1000000 === 0 ? 0 : 1)}M`
                              : `${(call.maxFunding / 1000).toFixed(0)}k`,
                            call as any,
                          )}
                        </span>
                      </div>
                    )}
                    {isSuperAdmin && (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()} data-testid={`button-admin-menu-${call.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => openEditDialog(call)} data-testid={`menu-edit-${call.id}`}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Editează
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setGuideCall(call)} data-testid={`menu-guides-${call.id}`}>
                            <FileUp className="w-3.5 h-3.5 mr-2" />
                            Ghiduri și anexe
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => reindexMutation.mutate(call.id)} disabled={reindexMutation.isPending} data-testid={`menu-reindex-${call.id}`}>
                            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${reindexMutation.isPending ? "animate-spin" : ""}`} />
                            Re-indexare AI
                          </DropdownMenuItem>
                          {(call.ragSections || 0) > 0 && (
                            <DropdownMenuItem onClick={() => regenerateAiMutation.mutate(call.id)} disabled={regenerateAiMutation.isPending} data-testid={`menu-regen-ai-${call.id}`}>
                              <Sparkles className="w-3.5 h-3.5 mr-2" />
                              Regenerare campuri AI
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteCall(call)} className="text-red-600 focus:text-red-600" data-testid={`menu-delete-${call.id}`}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Șterge apelul
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {call.bugetUe && (
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>Anvelopă program (UE): {withCallCurrency(Number(call.bugetUe) ? Number(call.bugetUe).toLocaleString("ro-RO") : String(call.bugetUe), call as any)}</span>
                    </div>
                  )}
                  {(call as any).bugetNational && (
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>Anvelopă program (național): {withCallCurrency(Number((call as any).bugetNational) ? Number((call as any).bugetNational).toLocaleString("ro-RO") : String((call as any).bugetNational), call as any)}</span>
                    </div>
                  )}
                  {call.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Termen: {new Date(call.deadline).toLocaleDateString("ro-RO")}</span>
                    </div>
                  )}
                  {call.dataLimita && !call.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Termen: {call.dataLimita}</span>
                    </div>
                  )}
                  {call.minEmployees && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Min {call.minEmployees} angajați</span>
                    </div>
                  )}
                  {call.sourceUrl && (
                    <div className="flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Pagină oficială</span>
                    </div>
                  )}
                </div>

                {/* Task #95 — bloc detalii potrivire (același breakdown ca pe
                    dashboard) + „Recalculează". Apare doar când profilul
                    companiei e activ și avem un rezultat de la Match Engine.
                    stopPropagation ca expandarea/butonul să nu deschidă dialogul
                    apelului (cardul are onClick=setSelectedCall). */}
                {useCompanyProfile && activeCompany && matchResultsByCallId.has(call.id) && (
                  <div
                    className="pt-3 border-t"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`match-section-${call.id}`}
                  >
                    <MatchDetails
                      result={mapHybridToMatchDetails(matchResultsByCallId.get(call.id)!)}
                      company={activeCompany}
                      callId={call.id}
                    />
                    <div className="flex items-center justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5 text-muted-foreground"
                        disabled={refreshMatchMutation.isPending}
                        onClick={() => setShowMatchConfirm(true)}
                        data-testid={`button-recalculate-${call.id}`}
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshMatchMutation.isPending ? "animate-spin" : ""}`} />
                        Recalculează{isSuperAdmin ? "" : ` (${matchCost} cr)`}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
              </AnimatedItem>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center space-y-3">
          <Landmark className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold">Niciun apel găsit</h3>
          <p className="text-sm text-muted-foreground">
            Încearcă să modifici filtrele sau revino mai târziu.
          </p>
        </Card>
      )}

      {activeCompany && (
        <CreditConfirmDialog
          open={showMatchConfirm}
          onOpenChange={setShowMatchConfirm}
          onConfirm={() => { setShowMatchConfirm(false); refreshMatchMutation.mutate(activeCompany.id); }}
          actionLabel="Recalcularea scorurilor de potrivire"
          creditCost={matchCost}
          isPending={refreshMatchMutation.isPending}
        />
      )}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2" data-testid="pagination-controls">
          <p className="text-xs text-muted-foreground">
            Pagina {currentPage} din {totalPages}, apelul {(currentPage - 1) * pageSize + 1} la {Math.min(currentPage * pageSize, totalItems)} din {totalItems}
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changePage(1)} disabled={currentPage <= 1} data-testid="button-first-page">
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changePage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} data-testid="button-prev-page">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2" data-testid="text-page-indicator">
              {currentPage} / {totalPages}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changePage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} data-testid="button-next-page">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changePage(totalPages)} disabled={currentPage >= totalPages} data-testid="button-last-page">
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedCall && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg leading-snug pr-6" data-testid="text-dialog-call-name">
                  {formatCallDisplayTitle(selectedCall.name)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap gap-2">
                  {isExpired(selectedCall) ? (
                    <Badge variant="destructive" className="no-default-active-elevate">Expirat</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 no-default-active-elevate">Activ</Badge>
                  )}
                  {selectedCall.source && selectedCall.source.trim().toUpperCase() !== "RO" && (
                    <Badge variant="outline" className="no-default-active-elevate">Sursă: {selectedCall.source}</Badge>
                  )}
                </div>

                {selectedCall.program && (
                  <p className="text-sm text-primary font-medium">{selectedCall.program}</p>
                )}

                {(selectedCall as any).summary ? (
                  <div className="bg-[hsl(48,100%,50%)]/5 border border-[hsl(48,100%,50%)]/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[hsl(48,100%,45%)]" />
                      Rezumat AI
                    </p>
                    <p className="text-sm whitespace-pre-line line-clamp-4">{stripHtml((selectedCall as any).summary)}</p>
                  </div>
                ) : selectedCall.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-3">{stripHtml(selectedCall.description)}</p>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  {isGenuineProjectMax(selectedCall as any) && selectedCall.maxFunding != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <Coins className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>Maxim/proiect: {withCallCurrency(selectedCall.maxFunding.toLocaleString("ro-RO"), selectedCall as any)}</span>
                    </div>
                  )}
                  {(selectedCall as any).bugetNational && (
                    <div className="flex items-center gap-2 text-sm">
                      <Coins className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>Anvelopă program (național): {withCallCurrency(Number((selectedCall as any).bugetNational) ? Number((selectedCall as any).bugetNational).toLocaleString("ro-RO") : String((selectedCall as any).bugetNational), selectedCall as any)}</span>
                    </div>
                  )}
                  {selectedCall.deadline && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{new Date(selectedCall.deadline).toLocaleDateString("ro-RO")}</span>
                    </div>
                  )}
                  {selectedCall.minEmployees != null && selectedCall.minEmployees > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>Min {selectedCall.minEmployees} angajați</span>
                    </div>
                  )}
                  {selectedCall.eligibleCaen && selectedCall.eligibleCaen.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{selectedCall.eligibleCaen.length} coduri CAEN</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <Link href={`/funding-calls/${selectedCall.id}`} onClick={() => setSelectedCall(null)}>
                    <Button className="w-full" data-testid="button-view-details">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Vezi detalii complete
                    </Button>
                  </Link>
                  <Link href={`/eligibility?callId=${selectedCall.id}`} onClick={() => setSelectedCall(null)}>
                    <Button variant="outline" className="w-full" data-testid="button-check-eligibility">
                      <Shield className="w-4 h-4 mr-2" />
                      Verifică eligibilitatea
                    </Button>
                  </Link>
                  <ProjectActionButton
                    fundingCallId={selectedCall.id}
                    preferredCompanyId={activeCompanyId || undefined}
                    onNavigate={() => setSelectedCall(null)}
                    fullWidth
                    size="default"
                    variant="secondary"
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {isSuperAdmin && (
        <>
          <Dialog open={!!deleteCall} onOpenChange={() => setDeleteCall(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Confirmare ștergere apel
                </DialogTitle>
                <DialogDescription>
                  Ești sigur că vrei să ștergi apelul <strong>{deleteCall?.name}</strong>?
                  Toate secțiunile indexate asociate vor fi șterse. Această acțiune este ireversibilă.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteCall(null)} data-testid="button-cancel-delete-call">Anulează</Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteCall && deleteCallMutation.mutate(deleteCall.id)}
                  disabled={deleteCallMutation.isPending}
                  data-testid="button-confirm-delete-call"
                >
                  {deleteCallMutation.isPending ? "Se șterge..." : "Șterge definitiv"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editCall} onOpenChange={(open) => { if (!open) setEditCall(null); }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" data-testid="text-edit-call-title">
                  <Pencil className="w-5 h-5 text-primary" />
                  Editare apel de finanțare
                </DialogTitle>
                <DialogDescription>Modifică informațiile apelului. Câmpurile array (CAEN, regiuni, tipuri beneficiari) se separă cu virgulă.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">Nume apel *</label>
                    <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="input-edit-call-name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Program</label>
                    <Input value={editForm.program || ""} onChange={(e) => setEditForm({ ...editForm, program: e.target.value })} data-testid="input-edit-call-program" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Categorie</label>
                    <Input value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} placeholder="ex: Digitalizare, Infrastructura" data-testid="input-edit-call-category" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={editForm.status || "active"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                      <SelectTrigger data-testid="select-edit-call-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activ</SelectItem>
                        <SelectItem value="expired">Expirat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Termen limita</label>
                    <Input type="datetime-local" value={editForm.deadline || ""} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} data-testid="input-edit-call-deadline" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Finantare maxima (EUR)</label>
                    <Input type="number" value={editForm.maxFunding ?? ""} onChange={(e) => setEditForm({ ...editForm, maxFunding: e.target.value })} placeholder="ex: 200000" data-testid="input-edit-call-maxfunding" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Angajati minimi</label>
                    <Input type="number" value={editForm.minEmployees ?? ""} onChange={(e) => setEditForm({ ...editForm, minEmployees: e.target.value })} data-testid="input-edit-call-minemployees" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cifra de afaceri minima (EUR)</label>
                    <Input type="number" value={editForm.minRevenue ?? ""} onChange={(e) => setEditForm({ ...editForm, minRevenue: e.target.value })} data-testid="input-edit-call-minrevenue" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Varsta minima firma (ani)</label>
                    <Input type="number" value={editForm.minCompanyAge ?? ""} onChange={(e) => setEditForm({ ...editForm, minCompanyAge: e.target.value })} data-testid="input-edit-call-minage" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Buget total apel</label>
                    <Input value={editForm.bugetUe || ""} onChange={(e) => setEditForm({ ...editForm, bugetUe: e.target.value })} placeholder="ex: 5000000" data-testid="input-edit-call-bugetue" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{editForm.bugetNational ? "Moneda buget UE" : "Moneda"}</label>
                    <Select value={editForm.monedaUe || "EUR"} onValueChange={(v) => setEditForm({ ...editForm, monedaUe: v, moneda: v, ...(!editForm.bugetNational ? { monedaNational: v } : {}) })}>
                      <SelectTrigger data-testid="select-edit-call-moneda-ue"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="RON">RON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cofinanțare buget de stat</label>
                    <Input value={editForm.bugetNational || ""} onChange={(e) => setEditForm({ ...editForm, bugetNational: e.target.value })} placeholder="ex: 50000000 (gol = buget total unic)" data-testid="input-edit-call-buget-national" />
                  </div>
                  {editForm.bugetNational && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Moneda buget national</label>
                      <Select value={editForm.monedaNational || "RON"} onValueChange={(v) => setEditForm({ ...editForm, monedaNational: v })}>
                        <SelectTrigger data-testid="select-edit-call-moneda-national"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="RON">RON</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Data limita (text)</label>
                    <Input value={editForm.dataLimita || ""} onChange={(e) => setEditForm({ ...editForm, dataLimita: e.target.value })} placeholder="ex: 31 decembrie 2027" data-testid="input-edit-call-datalimita" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">URL sursa</label>
                    <Input value={editForm.sourceUrl || ""} onChange={(e) => setEditForm({ ...editForm, sourceUrl: e.target.value })} data-testid="input-edit-call-sourceurl" />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={editForm.requiresProfit || false} onCheckedChange={(v) => setEditForm({ ...editForm, requiresProfit: v })} data-testid="switch-edit-call-profit" />
                    <label className="text-sm">Necesita profit</label>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">CAEN-uri eligibile</label>
                  <Input value={editForm.eligibleCaen || ""} onChange={(e) => setEditForm({ ...editForm, eligibleCaen: e.target.value })} placeholder="ex: 6201, 6202, 6311" data-testid="input-edit-call-caen" />
                  <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Regiuni eligibile</label>
                  <Input value={editForm.eligibleRegions || ""} onChange={(e) => setEditForm({ ...editForm, eligibleRegions: e.target.value })} placeholder="ex: Nord-Vest, Centru, Sud-Est" data-testid="input-edit-call-regions" />
                  <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tipuri beneficiari</label>
                  <Input value={editForm.beneficiaryTypes || ""} onChange={(e) => setEditForm({ ...editForm, beneficiaryTypes: e.target.value })} placeholder="ex: imm, startup, ong, autoritati-publice" data-testid="input-edit-call-beneficiaries" />
                  <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Categorii marime eligibile</label>
                  <Input value={editForm.eligibleSizeCategories || ""} onChange={(e) => setEditForm({ ...editForm, eligibleSizeCategories: e.target.value })} placeholder="ex: micro, mica, mijlocie, mare" data-testid="input-edit-call-sizecats" />
                  <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Descriere</label>
                  <Textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="min-h-[100px]" data-testid="textarea-edit-call-description" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Rezumat AI</label>
                  <Textarea value={editForm.summary || ""} onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })} className="min-h-[120px]" data-testid="textarea-edit-call-summary" />
                </div>
              </div>
              {editCall?.ragSections > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Regenerare campuri AI</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Repopulează automat toate câmpurile din secțiunile AI indexate ({editCall.ragSections} secțiuni).</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { regenerateAiMutation.mutate(editCall.id); setEditCall(null); }}
                    disabled={regenerateAiMutation.isPending}
                    className="shrink-0 border-amber-300 text-amber-700"
                    data-testid="button-regenerate-ai-dialog"
                  >
                    {regenerateAiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    Regenerează
                  </Button>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditCall(null)} data-testid="button-cancel-edit-call">Anulează</Button>
                <Button onClick={handleSaveCall} disabled={updateCallMutation.isPending || !editForm.name} data-testid="button-save-edit-call">
                  {updateCallMutation.isPending ? "Se salvează..." : "Salvează modificările"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!guideCall} onOpenChange={(open) => { if (!open) setGuideCall(null); }}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" data-testid="text-guides-title">
                  <FileUp className="w-5 h-5 text-primary" />
                  Ghiduri si documente
                </DialogTitle>
                <DialogDescription className="line-clamp-2">{guideCall?.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Ghiduri (cu analiza AI)</h4>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center mb-3">
                    <input type="file" id="guide-upload-unified" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleGuideUpload} disabled={uploadingGuide} data-testid="input-guide-upload" />
                    <label htmlFor="guide-upload-unified" className="cursor-pointer flex flex-col items-center gap-1.5">
                      {uploadingGuide ? (
                        <>
                          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                          <p className="text-sm font-medium">Se încarcă și se indexează...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <p className="text-sm font-medium">Încarcă ghid (PDF, Word, Excel)</p>
                          <p className="text-xs text-muted-foreground">Fisierul va fi analizat automat cu AI</p>
                        </>
                      )}
                    </label>
                  </div>
                  {guidesLoading ? <Skeleton className="h-16" /> : (() => {
                    const guides = (guidesData || []).filter((g: any) => g.doc_type !== "attachment");
                    return guides.length > 0 ? (
                      <div className="space-y-2">
                        {guides.map((g: any) => {
                          const fileIcon = g.file_type === "pdf" ? "PDF" : g.file_type === "docx" || g.file_type === "doc" ? "DOC" : "XLS";
                          const fileColor = g.file_type === "pdf" ? "text-red-600 bg-red-50 dark:bg-red-950/30" : g.file_type === "docx" || g.file_type === "doc" ? "text-blue-600 bg-blue-50 dark:bg-blue-950/30" : "text-green-600 bg-green-50 dark:bg-green-950/30";
                          return (
                            <div key={g.id} className="flex items-center gap-3 p-3 border rounded-lg" data-testid={`guide-row-${g.id}`}>
                              <div className={`text-xs font-bold px-2 py-1 rounded ${fileColor}`}>{fileIcon}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{g.original_name}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{g.file_size ? `${(g.file_size / 1024).toFixed(0)} KB` : "--"}</span>
                                  <span>{g.sections_created > 0 ? `${g.sections_created} secțiuni AI` : "Neindexat"}</span>
                                  <span>{g.created_at ? new Date(g.created_at).toLocaleDateString("ro-RO") : ""}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => window.open(`/api/admin/funding-calls/guides/${g.id}/download`, "_blank")} title="Descarcă" data-testid={`button-download-guide-${g.id}`}>
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => { if (confirm(`Sigur vrei să ștergi ghidul "${g.original_name}"? Secțiunile AI asociate vor fi de asemenea șterse.`)) { deleteGuideMutation.mutate({ callId: guideCall.id, guideId: g.id }); } }}
                                  disabled={deleteGuideMutation.isPending}
                                  className="text-red-600" title="Șterge ghidul" data-testid={`button-delete-guide-${g.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">Niciun ghid încărcat</p>
                    );
                  })()}
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><File className="w-4 h-4 text-blue-600" /> Documente aditionale</h4>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center mb-3">
                    <input type="file" id="attachment-upload-unified" className="hidden" multiple onChange={handleAttachmentUpload} disabled={uploadingAttachment} data-testid="input-attachment-upload" />
                    <label htmlFor="attachment-upload-unified" className="cursor-pointer flex flex-col items-center gap-1.5">
                      {uploadingAttachment ? (
                        <>
                          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                          <p className="text-sm font-medium">Se încarcă...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <p className="text-sm font-medium">Atașează documente suplimentare</p>
                          <p className="text-xs text-muted-foreground">Orice format, mai multe fișiere o dată -- PDF/Word/Excel se analizează AI automat</p>
                        </>
                      )}
                    </label>
                  </div>
                  {(() => {
                    const attachments = (guidesData || []).filter((g: any) => g.doc_type === "attachment");
                    return attachments.length > 0 ? (
                      <div className="space-y-2">
                        {attachments.map((g: any) => {
                          const ext = (g.file_type || "").toLowerCase();
                          const fileIcon = ext === "pdf" ? "PDF" : ext === "docx" || ext === "doc" ? "DOC" : ext === "xlsx" || ext === "xls" ? "XLS" : ext.toUpperCase() || "FILE";
                          const fileColor = ext === "pdf" ? "text-red-600 bg-red-50 dark:bg-red-950/30" : ext === "docx" || ext === "doc" ? "text-blue-600 bg-blue-50 dark:bg-blue-950/30" : ext === "xlsx" || ext === "xls" ? "text-green-600 bg-green-50 dark:bg-green-950/30" : "text-gray-600 bg-gray-50 dark:bg-gray-800";
                          return (
                            <div key={g.id} className="flex items-center gap-3 p-3 border rounded-lg" data-testid={`attachment-row-${g.id}`}>
                              <div className={`text-xs font-bold px-2 py-1 rounded ${fileColor}`}>{fileIcon}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{g.original_name}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{g.file_size ? g.file_size > 1024 * 1024 ? `${(g.file_size / 1024 / 1024).toFixed(1)} MB` : `${(g.file_size / 1024).toFixed(0)} KB` : "--"}</span>
                                  {["pdf", "doc", "docx", "xls", "xlsx"].includes(ext) && (
                                    <span>{g.sections_created > 0 ? `${g.sections_created} secțiuni AI` : "Se indexează..."}</span>
                                  )}
                                  <span>{g.created_at ? new Date(g.created_at).toLocaleDateString("ro-RO") : ""}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => window.open(`/api/admin/funding-calls/guides/${g.id}/download`, "_blank")} title="Descarcă" data-testid={`button-download-attachment-${g.id}`}>
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => { if (confirm(`Sigur vrei să ștergi documentul "${g.original_name}"?`)) { deleteGuideMutation.mutate({ callId: guideCall.id, guideId: g.id }); } }}
                                  disabled={deleteGuideMutation.isPending}
                                  className="text-red-600" title="Șterge documentul" data-testid={`button-delete-attachment-${g.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">Niciun document adițional</p>
                    );
                  })()}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGuideCall(null)} data-testid="button-close-guides">Închide</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateCallDialog} onOpenChange={(open) => { if (!open && !createManualCallMutation.isPending) { setShowCreateCallDialog(false); setCreateCallName(""); setCreateCallFile(null); } }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adaugă apel de finanțare</DialogTitle>
                <DialogDescription>
                  Încarcă ghidul oficial (PDF, Word sau Excel). Platforma va indexa documentul și va completa automat câmpurile apelului folosind AI.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nume apel (optional)</label>
                  <Input
                    value={createCallName}
                    onChange={(e) => setCreateCallName(e.target.value)}
                    placeholder="Se extrage automat din ghid daca nu este completat..."
                    disabled={createManualCallMutation.isPending}
                    data-testid="input-create-call-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ghid oficial *</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    onChange={(e) => setCreateCallFile(e.target.files?.[0] || null)}
                    disabled={createManualCallMutation.isPending}
                    data-testid="input-create-call-file"
                  />
                  <p className="text-xs text-muted-foreground">Formate acceptate: PDF, Word (.doc, .docx), Excel (.xls, .xlsx)</p>
                </div>
                {createManualCallMutation.isPending && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-primary">Se creeaza apelul...</p>
                    <ProgressStepper operationId={createCallProgressId} steps={["Salvare apel în baza de date", "Upload fișier în storage"]} isActive={true} />
                    <p className="text-xs text-muted-foreground">Indexarea AI si generarea vor rula automat in fundal.</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowCreateCallDialog(false); setCreateCallName(""); setCreateCallFile(null); }} disabled={createManualCallMutation.isPending} data-testid="button-cancel-create-call">
                  Anulează
                </Button>
                <Button onClick={() => createManualCallMutation.mutate()} disabled={!createCallFile || createManualCallMutation.isPending} data-testid="button-confirm-create-call">
                  {createManualCallMutation.isPending ? "Se creează..." : "Creează apelul"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
