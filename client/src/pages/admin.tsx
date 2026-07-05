import { useState, Fragment, useRef, useEffect } from "react";
import { ProgressStepper } from "@/components/progress-stepper";
import { getFeatureLabel, getTransactionTypeLabel, formatTransactionDescription } from "@/lib/labels";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Users, Database, MessageSquare, Coins, Download, Trash2, Shield, AlertTriangle,
  Info, Settings, RefreshCw, FileText, Building2, BarChart3, ScrollText, Pencil,
  Mail, CheckCircle, XCircle, Clock, Search, ChevronLeft, ChevronRight, Eye, RotateCcw,
  ExternalLink, TrendingUp, CalendarClock, AlertCircle, DollarSign, Banknote, Activity, Filter,
  Upload, FileUp, File, X, Star, Gauge, Infinity, Save, Loader2, Sparkles, Zap,
  Plus, Package, CreditCard, ArrowRightLeft, List, MoreHorizontal, Circle, Send, UserPlus,
  Network, FlaskConical, GraduationCap, Landmark, Briefcase, HelpCircle,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SURVEY_CONFIGS, TRIGGER_LABELS, type TriggerEvent } from "@shared/micro-survey-triggers";
import { useAuth } from "@/hooks/use-auth";

// ════════════════════════════════════════════════════════════════════
// Task #53 — Consorții și parteneri (beta), super-admin only
// ════════════════════════════════════════════════════════════════════

const ENTITY_TYPE_LABELS: Record<string, string> = {
  university: "Universitate",
  research_institute: "Institut de cercetare",
  company: "Companie",
  public_authority: "Autoritate publică",
  other: "Altele",
};

const ENTITY_TYPE_ICONS: Record<string, LucideIcon> = {
  university: GraduationCap,
  research_institute: FlaskConical,
  company: Briefcase,
  public_authority: Landmark,
  other: HelpCircle,
};

type ResearchStats = {
  totals: { entities: number; projects: number; participants: number; entities_with_cui: number };
  byType: Array<{ entity_type: string; n: number }>;
  byProgram: Array<{ funding_program: string | null; n: number }>;
  topEntities: Array<{ id: string; name_ro: string; entity_type: string; projects: number }>;
};
type ResearchEntityRow = {
  id: string; name_ro: string; name_en?: string | null; entity_type: string;
  cui: string | null; city: string | null; judet: string | null;
  project_count?: number; coord_count?: number;
};
type ResearchProjectRow = {
  id: string; title_ro: string | null; title_en: string | null;
  funding_program: string | null; start_year: number | null; end_year: number | null;
  status: string | null; total_budget_eur: number | null;
  consortium_size?: number;
};
type ResearchEntityDetailDTO = {
  entity: {
    id: string; name_ro: string; name_en: string | null; entity_type: string;
    cui: string | null; city: string | null; judet: string | null;
    website: string | null; research_domains: string[] | null;
    employee_range: string | null; contact_email: string | null; source: string | null;
    profile_text: string | null; profile_generated_at: string | null;
  };
  aggregates: { project_count: number; coordinator_count: number; total_budget_eur: number | string | null };
  projects: Array<{
    project_id: string; role: string; budget_share_eur: number | null;
    title_ro: string | null; title_en: string | null; funding_program: string | null;
    start_year: number | null; end_year: number | null; status: string | null;
    source_url: string | null; consortium_size: number;
  }>;
  topCollaborators: Array<{ entity_id: string; name_ro: string; entity_type: string; shared_projects: number }>;
  companyHint: { cui: string | null; hasCompanyMatch: boolean };
};
type ResearchProjectDetailDTO = {
  project: ResearchProjectRow & { call_id: string | null; abstract: string | null; source_url: string | null; total_budget_ron: number | null };
  participants: Array<{
    entity_id: string; role: string;
    budget_share_eur: number | null;
    name_ro: string; entity_type: string | null; cui: string | null; city: string | null;
  }>;
};

function ResearchPartnersTab() {
  const [view, setView] = useState<"stats" | "entities" | "projects" | "suggest">("stats");
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const { data: stats } = useQuery<ResearchStats>({
    queryKey: ["/api/admin/research/stats"],
    enabled: view === "stats",
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="w-5 h-5" />
            Consorții și parteneri
            <Badge variant="outline" className="ml-2" data-testid="badge-research-beta">beta</Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={view === "stats" ? "default" : "outline"}
              onClick={() => setView("stats")}
              data-testid="button-research-view-stats"
            >Statistici</Button>
            <Button
              size="sm"
              variant={view === "entities" ? "default" : "outline"}
              onClick={() => setView("entities")}
              data-testid="button-research-view-entities"
            >Entități</Button>
            <Button
              size="sm"
              variant={view === "projects" ? "default" : "outline"}
              onClick={() => setView("projects")}
              data-testid="button-research-view-projects"
            >Proiecte</Button>
            <Button
              size="sm"
              variant={view === "suggest" ? "default" : "outline"}
              onClick={() => setView("suggest")}
              data-testid="button-research-view-suggest"
            >Sugestii parteneri</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Bază de date cu {stats?.totals?.entities ?? "..."} entități românești de cercetare (universități,
          INCD, Academia Română, companii) cu istoric de participare în proiecte H2020 și Horizon Europe.
          Date din CORDIS — sursă publică, doar lectură.
        </p>
      </CardHeader>
      <CardContent>
        {view === "stats" && <ResearchStatsView stats={stats} />}
        {view === "entities" && <ResearchEntitiesView onSelect={setSelectedEntity} />}
        {view === "projects" && <ResearchProjectsView onSelect={setSelectedProject} />}
        {view === "suggest" && <SuggestPartnersView onSelect={setSelectedEntity} />}

        <Dialog open={!!selectedEntity} onOpenChange={(o) => !o && setSelectedEntity(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            {selectedEntity && (
              <ResearchEntityDetail
                id={selectedEntity}
                onOpenProject={(pid) => { setSelectedEntity(null); setSelectedProject(pid); }}
                onOpenEntity={(eid) => setSelectedEntity(eid)}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedProject} onOpenChange={(o) => !o && setSelectedProject(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            {selectedProject && (
              <ResearchProjectDetail
                id={selectedProject}
                onOpenEntity={(eid) => { setSelectedProject(null); setSelectedEntity(eid); }}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

type ProfileJobState = {
  running: boolean;
  total: number;
  done: number;
  skipped: number;
  errors: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
  force: boolean;
  limit: number;
};

function ProfileGenerationCard() {
  const { toast } = useToast();
  const [limit, setLimit] = useState<number>(1000);
  const [force, setForce] = useState<boolean>(false);
  const wasRunningRef = useRef<boolean>(false);

  const { data: job } = useQuery<ProfileJobState>({
    queryKey: ["/api/admin/research/generate-profiles/status"],
    refetchInterval: (query) => (query.state.data?.running ? 3000 : false),
    refetchIntervalInBackground: true,
  });

  // Pe tranziția running:true → false, invalidează statisticile.
  useEffect(() => {
    if (!job) return;
    if (wasRunningRef.current && !job.running) {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research/stats"] });
    }
    wasRunningRef.current = job.running;
  }, [job?.running]);

  const startMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/research/generate-profiles", {
        force,
        limit,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/research/generate-profiles/status"],
      });
      toast({ title: "Job pornit", description: "Generarea profilurilor a început în background." });
    },
    onError: (err: any) => {
      toast({
        title: "Nu am putut porni jobul",
        description: err?.message || "Eroare necunoscută",
        variant: "destructive",
      });
    },
  });

  const isRunning = !!job?.running;
  const total = job?.total ?? 0;
  const done = job?.done ?? 0;
  const skipped = job?.skipped ?? 0;
  const errors = job?.errors ?? 0;
  const processed = done + skipped + errors;
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  const finished = !isRunning && !!job?.finishedAt;
  const noneToProcess = finished && total === 0 && !job?.lastError;

  return (
    <Card data-testid="card-research-generate-profiles">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Generare profiluri AI pentru entități
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generează <code>profile_text</code> și <code>profile_embedding</code> pentru entitățile fără profil
          (sau pentru toate, dacă activezi „Forțează regenerarea"). Job-ul rulează în background pe server.
        </p>

        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="input-job-limit">
              Limită (max 1000)
            </label>
            <Input
              id="input-job-limit"
              type="number"
              min={1}
              max={1000}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(1000, parseInt(e.target.value || "0", 10) || 1)))}
              disabled={isRunning}
              data-testid="input-job-limit"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="switch-job-force"
              checked={force}
              onCheckedChange={setForce}
              disabled={isRunning}
              data-testid="switch-job-force"
            />
            <label htmlFor="switch-job-force" className="text-sm">
              Forțează regenerarea
            </label>
          </div>
          <Button
            onClick={() => startMutation.mutate()}
            disabled={isRunning || startMutation.isPending}
            data-testid="button-research-generate-profiles"
          >
            {isRunning || startMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Se generează…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1" /> Generează profiluri AI
              </>
            )}
          </Button>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <Progress value={pct} data-testid="progress-job-bar" />
            <p className="text-sm" data-testid="text-job-progress">
              {processed} / {total} ({pct}%) — generate: {done}, fără proiecte: {skipped}, erori: {errors}
            </p>
          </div>
        )}

        {finished && !noneToProcess && (
          <div className="text-sm space-y-1" data-testid="text-job-summary">
            <p>
              Ultimul run: {job?.finishedAt ? new Date(job.finishedAt).toLocaleString("ro-RO") : "-"}
              {" · "}
              total {total}, generate {done}, fără proiecte {skipped}, erori {errors}
              {job?.force ? " · forțat" : ""}
            </p>
            {job?.lastError && (
              <p className="text-xs text-destructive">Ultima eroare: {job.lastError}</p>
            )}
          </div>
        )}

        {noneToProcess && (
          <p className="text-sm text-muted-foreground" data-testid="text-job-summary">
            Toate entitățile au profil deja. Activează „Forțează regenerarea" pentru a le re-genera.
          </p>
        )}

        {!isRunning && !finished && (
          <p className="text-xs text-muted-foreground">
            Niciun job rulat de la pornirea serverului.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

type CompanyCoverageStats = {
  totalActive: number;
  withEmbedding: number;
  withJudet: number;
  withFinanciare: number;
  complete: number;
  incomplete: number;
};
type CompanyBackfillJobState = {
  running: boolean;
  total: number;
  processed: number;
  profilesGenerated: number;
  dataUpdated: number;
  errors: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
  remainingIncomplete: number | null;
};

function CompanyCoverageCard() {
  const { toast } = useToast();
  const wasRunningRef = useRef<boolean>(false);

  const { data: coverage } = useQuery<{ stats: CompanyCoverageStats; job: CompanyBackfillJobState }>({
    queryKey: ["/api/admin/companies/coverage"],
    refetchInterval: (query) => (query.state.data?.job?.running ? 3000 : false),
    refetchIntervalInBackground: true,
  });

  const job = coverage?.job;
  const stats = coverage?.stats;

  useEffect(() => {
    if (!job) return;
    if (wasRunningRef.current && !job.running) {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/coverage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
    }
    wasRunningRef.current = job.running;
  }, [job?.running]);

  const startMutation = useMutation({
    mutationFn: async () => await apiRequest("POST", "/api/admin/companies/backfill", { limit: 1000 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/coverage"] });
      toast({ title: "Backfill pornit", description: "Completarea profilurilor și datelor a început în background." });
    },
    onError: (err: any) => {
      toast({
        title: "Nu am putut porni backfill-ul",
        description: err?.message || "Eroare necunoscută",
        variant: "destructive",
      });
    },
  });

  const isRunning = !!job?.running;
  const total = job?.total ?? 0;
  const processed = job?.processed ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const coveragePct = stats && stats.totalActive > 0
    ? Math.round((stats.complete / stats.totalActive) * 100)
    : 0;
  const finished = !isRunning && !!job?.finishedAt;

  return (
    <Card data-testid="card-company-coverage">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Acoperire profil AI & date firme
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Completează profilul AI (<code>profile_embedding</code>), județul și datele financiare pentru companiile
          active incomplete, astfel încât Match Engine să afișeze scoruri corecte fără „Recalculează". Idempotent —
          companiile deja complete sunt sărite.
        </p>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Companii active</p>
              <p className="text-xl font-bold" data-testid="stat-coverage-total">{stats.totalActive}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Complete</p>
              <p className="text-xl font-bold text-green-600" data-testid="stat-coverage-complete">{stats.complete} ({coveragePct}%)</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Cu profil AI</p>
              <p className="text-xl font-bold" data-testid="stat-coverage-embedding">{stats.withEmbedding}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Cu județ</p>
              <p className="text-xl font-bold" data-testid="stat-coverage-judet">{stats.withJudet}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Cu financiare</p>
              <p className="text-xl font-bold" data-testid="stat-coverage-financiare">{stats.withFinanciare}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={() => startMutation.mutate()}
            disabled={isRunning || startMutation.isPending || (stats?.incomplete ?? 0) === 0}
            data-testid="button-company-backfill"
          >
            {isRunning || startMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Se completează…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1" /> Completează companiile incomplete</>
            )}
          </Button>
          {stats && (stats.incomplete > 0
            ? <span className="text-sm text-muted-foreground" data-testid="text-coverage-incomplete">{stats.incomplete} de completat</span>
            : <span className="text-sm text-green-600" data-testid="text-coverage-incomplete">Toate companiile sunt complete</span>
          )}
        </div>

        {isRunning && (
          <div className="space-y-2">
            <Progress value={pct} data-testid="progress-company-backfill" />
            <p className="text-sm" data-testid="text-company-backfill-progress">
              {processed} / {total} ({pct}%) — profiluri: {job?.profilesGenerated ?? 0}, date completate: {job?.dataUpdated ?? 0}, erori: {job?.errors ?? 0}
            </p>
          </div>
        )}

        {finished && (
          <div className="text-sm space-y-1" data-testid="text-company-backfill-summary">
            <p>
              Ultima rulare: {job?.finishedAt ? new Date(job.finishedAt).toLocaleString("ro-RO") : "-"}
              {" · "}
              procesate {job?.processed ?? 0}, profiluri {job?.profilesGenerated ?? 0}, date completate {job?.dataUpdated ?? 0}, erori {job?.errors ?? 0}
            </p>
            {job?.remainingIncomplete != null && (
              <p className={job.remainingIncomplete > 0 ? "text-amber-600" : "text-green-600"} data-testid="text-coverage-remaining">
                {job.remainingIncomplete > 0
                  ? `${job.remainingIncomplete} companii încă incomplete după rulare`
                  : "Toate companiile active sunt complete"}
              </p>
            )}
            {job?.lastError && <p className="text-xs text-destructive">Ultima eroare: {job.lastError}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResearchStatsView({ stats }: { stats: ResearchStats | undefined }) {
  if (!stats) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-6">
      <ProfileGenerationCard />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Entități</p>
          <p className="text-2xl font-bold" data-testid="stat-research-entities">{stats.totals?.entities}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Proiecte</p>
          <p className="text-2xl font-bold" data-testid="stat-research-projects">{stats.totals?.projects}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Participări</p>
          <p className="text-2xl font-bold" data-testid="stat-research-participants">{stats.totals?.participants}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Entități cu CUI</p>
          <p className="text-2xl font-bold" data-testid="stat-research-cui">{stats.totals?.entities_with_cui}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Pe tip de entitate</h4>
          <div className="space-y-1">
            {(stats.byType || []).map((r) => {
              const Icon = ENTITY_TYPE_ICONS[r.entity_type] || HelpCircle;
              return (
                <div key={r.entity_type} className="flex items-center justify-between text-sm border-b py-1" data-testid={`row-research-type-${r.entity_type}`}>
                  <span className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" />{ENTITY_TYPE_LABELS[r.entity_type] || r.entity_type}</span>
                  <span className="font-mono">{r.n}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Pe program de finanțare</h4>
          <div className="space-y-1">
            {(stats.byProgram || []).map((r) => (
              <div key={r.funding_program} className="flex items-center justify-between text-sm border-b py-1" data-testid={`row-research-program-${r.funding_program}`}>
                <span>{r.funding_program}</span>
                <span className="font-mono">{r.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">Top 10 entități după număr de proiecte</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entitate</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead className="text-right">Proiecte</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(stats.topEntities || []).map((r) => (
              <TableRow key={r.id} data-testid={`row-research-top-${r.id}`}>
                <TableCell className="font-medium">{r.name_ro}</TableCell>
                <TableCell><Badge variant="outline">{ENTITY_TYPE_LABELS[r.entity_type] || r.entity_type}</Badge></TableCell>
                <TableCell className="text-right font-mono">{r.projects}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ResearchEntitiesView({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [judet, setJudet] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (type !== "all") params.set("type", type);
  if (judet.trim()) params.set("judet", judet.trim());
  if (source.trim()) params.set("source", source.trim());
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const { data, isLoading } = useQuery<{ total: number; items: ResearchEntityRow[]; page: number; pageSize: number }>({
    queryKey: ["/api/admin/research/entities", q, type, judet, source, offset],
    queryFn: async () => {
      const r = await fetch(`/api/admin/research/entities?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("err");
      return r.json();
    },
  });

  const total = data?.total ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Caută după nume sau CUI..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setOffset(0); }}
          className="max-w-sm"
          data-testid="input-research-entity-search"
        />
        <Select value={type} onValueChange={(v) => { setType(v); setOffset(0); }}>
          <SelectTrigger className="w-[220px]" data-testid="select-research-entity-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate tipurile</SelectItem>
            {Object.entries(ENTITY_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Județ..."
          value={judet}
          onChange={(e) => { setJudet(e.target.value); setOffset(0); }}
          className="w-[160px]"
          data-testid="input-research-entity-judet"
        />
        <Input
          placeholder="Sursă..."
          value={source}
          onChange={(e) => { setSource(e.target.value); setOffset(0); }}
          className="w-[160px]"
          data-testid="input-research-entity-source"
        />
        <div className="ml-auto text-sm text-muted-foreground self-center" data-testid="text-research-entity-total">
          {total} rezultate
        </div>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Oraș</TableHead>
                <TableHead>CUI</TableHead>
                <TableHead className="text-right">Proiecte</TableHead>
                <TableHead className="text-right">Coordonate</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items || []).map((e) => (
                <TableRow key={e.id} data-testid={`row-research-entity-${e.id}`}>
                  <TableCell className="font-medium max-w-md">
                    <div className="truncate">{e.name_ro}</div>
                    {e.name_en && <div className="text-xs text-muted-foreground truncate">{e.name_en}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{ENTITY_TYPE_LABELS[e.entity_type] || e.entity_type}</Badge></TableCell>
                  <TableCell>{e.city || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{e.cui || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{e.project_count}</TableCell>
                  <TableCell className="text-right font-mono">{e.coord_count}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => onSelect(e.id)} data-testid={`button-research-entity-open-${e.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center pt-2">
            <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} data-testid="button-research-entities-prev">
              <ChevronLeft className="w-4 h-4 mr-1" />Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              {offset + 1} – {Math.min(offset + limit, total)} din {total}
            </span>
            <Button size="sm" variant="outline" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} data-testid="button-research-entities-next">
              Următor<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ResearchEntityDetail({
  id,
  onOpenProject,
  onOpenEntity,
}: { id: string; onOpenProject: (pid: string) => void; onOpenEntity: (eid: string) => void }) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<ResearchEntityDetailDTO>({
    queryKey: ["/api/admin/research/entities", id],
    queryFn: async () => {
      const r = await fetch(`/api/admin/research/entities/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("err");
      return r.json();
    },
  });

  const generateProfile = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/research/entities/${id}/generate-profile`, {
        method: "POST",
        credentials: "include",
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.message || "Eroare la generare");
      return body as { profile_text: string; profile_generated_at: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research/entities", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research/entities", id, "similar"] });
      toast({ title: "Profil generat", description: "Profilul AI a fost generat cu succes." });
    },
    onError: (err: Error) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading || !data) return <Skeleton className="h-64" />;
  const e = data.entity;
  const hasProfile = !!e.profile_text && e.profile_text !== "N/A";
  const hasNoProjects = e.profile_text === "N/A";

  return (
    <>
      <DialogHeader>
        <DialogTitle data-testid="text-research-entity-name">{e.name_ro}</DialogTitle>
        {e.name_en && <DialogDescription>{e.name_en}</DialogDescription>}
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><span className="text-muted-foreground">Tip:</span> <Badge variant="outline">{ENTITY_TYPE_LABELS[e.entity_type] || e.entity_type}</Badge></div>
          <div><span className="text-muted-foreground">CUI:</span> <span className="font-mono">{e.cui || "—"}</span></div>
          <div><span className="text-muted-foreground">Oraș:</span> {e.city || "—"}</div>
          <div><span className="text-muted-foreground">Județ:</span> {e.judet || "—"}</div>
          <div className="col-span-2"><span className="text-muted-foreground">Website:</span> {e.website ? <a href={e.website} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{e.website} <ExternalLink className="inline w-3 h-3" /></a> : "—"}</div>
          <div className="col-span-3"><span className="text-muted-foreground">Surse:</span> <span className="text-xs">{e.source || "—"}</span></div>
        </div>

        {e.research_domains && e.research_domains.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Domenii de cercetare</p>
            <div className="flex flex-wrap gap-1">
              {e.research_domains.map((d: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>)}
            </div>
          </div>
        )}

        {/* Profil AI */}
        {hasProfile && (
          <div className="rounded-md border bg-muted/30 p-4 text-sm" data-testid="card-research-entity-profile">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Profil AI</span>
                {e.profile_generated_at && (
                  <span className="text-xs text-muted-foreground font-normal">
                    generat {new Date(e.profile_generated_at).toLocaleDateString("ro-RO")}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => generateProfile.mutate()}
                disabled={generateProfile.isPending}
                data-testid="button-research-entity-regenerate-profile"
              >
                {generateProfile.isPending ? "Se regenerează..." : "Regenerează"}
              </Button>
            </div>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-research-entity-profile">
              {e.profile_text}
            </p>
          </div>
        )}
        {!hasProfile && !hasNoProjects && (
          <div className="rounded-md border border-dashed p-4 text-sm flex items-center justify-between" data-testid="empty-research-entity-profile">
            <span className="text-muted-foreground">Această entitate nu are încă un profil AI generat.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateProfile.mutate()}
              disabled={generateProfile.isPending}
              data-testid="button-research-entity-generate-profile"
            >
              {generateProfile.isPending ? "Se generează..." : "Generează profil AI"}
            </Button>
          </div>
        )}
        {hasNoProjects && (
          <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground" data-testid="empty-research-entity-no-projects">
            Entitatea nu are proiecte europene înregistrate — profilul AI nu poate fi generat.
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total proiecte</p>
            <p className="text-xl font-bold" data-testid="stat-research-entity-aggr-projects">{data.aggregates?.project_count ?? 0}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Ca coordonator</p>
            <p className="text-xl font-bold" data-testid="stat-research-entity-aggr-coord">{data.aggregates?.coordinator_count ?? 0}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Buget total EUR</p>
            <p className="text-xl font-bold font-mono" data-testid="stat-research-entity-aggr-budget">
              {Number(data.aggregates?.total_budget_eur ?? 0).toLocaleString("ro-RO", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {data.companyHint?.cui && (
          <div className={`border rounded p-2 text-sm ${data.companyHint.hasCompanyMatch ? "bg-green-50 dark:bg-green-900/20 border-green-200" : "bg-muted"}`} data-testid="text-research-entity-company-hint">
            {data.companyHint.hasCompanyMatch
              ? <>✓ CUI <span className="font-mono">{data.companyHint.cui}</span> este înregistrat ca firmă utilizator pe platformă.</>
              : <>CUI <span className="font-mono">{data.companyHint.cui}</span> nu corespunde unei firme utilizator existente.</>}
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-2" data-testid="text-research-entity-projects-count">
            Proiecte ({data.projects.length})
          </h4>
          <div className="border rounded-lg max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titlu</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>An</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Mărime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.projects.map((p) => (
                  <TableRow key={p.project_id} className="cursor-pointer hover:bg-muted" onClick={() => onOpenProject(p.project_id)} data-testid={`row-research-entity-project-${p.project_id}`}>
                    <TableCell className="max-w-md"><div className="truncate text-xs">{p.title_en || p.title_ro || p.project_id}</div></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.funding_program || "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{p.start_year || "—"}</TableCell>
                    <TableCell>{p.role === "coordinator" ? <Badge className="text-xs bg-blue-600">Coordonator</Badge> : <span className="text-xs">Partener</span>}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.consortium_size}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Top colaboratori (proiecte comune)</h4>
          <div className="space-y-1">
            {data.topCollaborators.map((c) => (
              <button
                key={c.entity_id}
                onClick={() => onOpenEntity(c.entity_id)}
                className="w-full flex items-center justify-between text-sm border-b py-1 hover:bg-muted px-2 text-left"
                data-testid={`row-research-collaborator-${c.entity_id}`}
              >
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{ENTITY_TYPE_LABELS[c.entity_type] || c.entity_type}</Badge>
                  {c.name_ro}
                </span>
                <span className="font-mono">{c.shared_projects}</span>
              </button>
            ))}
            {data.topCollaborators.length === 0 && <p className="text-sm text-muted-foreground">Nicio colaborare comună înregistrată.</p>}
          </div>
        </div>

        {hasProfile && <SimilarEntitiesSection entityId={id} onOpenEntity={onOpenEntity} />}
      </div>
    </>
  );
}

function SimilarEntitiesSection({
  entityId,
  onOpenEntity,
}: {
  entityId: string;
  onOpenEntity: (eid: string) => void;
}) {
  const { data, isLoading } = useQuery<{
    items: Array<{
      id: string;
      name_ro: string;
      entity_type: string;
      city: string | null;
      judet: string | null;
      project_count: number;
      similarity_score: number;
    }>;
  }>({
    queryKey: ["/api/admin/research/entities", entityId, "similar"],
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/research/entities/${entityId}/similar?limit=5`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error("err");
      return r.json();
    },
  });

  if (isLoading) return <Skeleton className="h-24" />;
  if (!data?.items?.length) return null;

  return (
    <div data-testid="section-research-entity-similar">
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-600" />
        Organizații similare ca profil de cercetare
      </h4>
      <div className="space-y-1">
        {data.items.map((s) => (
          <button
            key={s.id}
            onClick={() => onOpenEntity(s.id)}
            className="w-full flex items-center justify-between text-sm border-b py-1 hover:bg-muted px-2 text-left"
            data-testid={`row-research-similar-${s.id}`}
          >
            <span className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {ENTITY_TYPE_LABELS[s.entity_type] || s.entity_type}
              </Badge>
              <span>{s.name_ro}</span>
              {s.city && <span className="text-xs text-muted-foreground">· {s.city}</span>}
            </span>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono">{s.project_count} proiecte</span>
              <span className="font-mono font-medium text-blue-600">
                {Math.round(s.similarity_score * 100)}% similar
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sub-tab "Sugestii parteneri" (Task #58) ──
type FundingCallListItem = {
  id: string;
  name: string;
  deadline: string | null;
  status: string | null;
};
type PartnerSuggestion = {
  id: string;
  name_ro: string;
  name_en: string | null;
  entity_type: string;
  city: string | null;
  judet: string | null;
  research_domains: string[] | null;
  cui: string | null;
  project_count: number;
  profile_excerpt: string | null;
  semantic_score: number | string;
  caen_overlap: number | string;
  final_score: number | string;
};
type SuggestPartnersResponse = {
  fundingCall: {
    id: string;
    name: string;
    eligible_caen: string[];
    beneficiary_types: string[];
  };
  suggestions: PartnerSuggestion[];
  total: number;
};

function scoreIndicatorClass(pct: number): string {
  if (pct >= 70) return "[&>div]:bg-green-500";
  if (pct >= 50) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-red-500";
}

function SuggestPartnersView({ onSelect }: { onSelect: (id: string) => void }) {
  const [callId, setCallId] = useState<string>("");

  const { data: callsData, isLoading: callsLoading } = useQuery<{ calls: FundingCallListItem[] }>({
    queryKey: ["/api/admin/research/funding-calls-list"],
    queryFn: async () => {
      const r = await fetch("/api/admin/research/funding-calls-list", { credentials: "include" });
      if (!r.ok) throw new Error("err");
      return r.json();
    },
  });

  const {
    data: suggestData,
    isLoading: suggestLoading,
    error: suggestError,
  } = useQuery<SuggestPartnersResponse, Error>({
    queryKey: ["/api/admin/research/suggest-partners", callId],
    enabled: !!callId,
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/research/suggest-partners?funding_call_id=${encodeURIComponent(callId)}&limit=20`,
        { credentials: "include" },
      );
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.message || "Eroare la încărcarea sugestiilor");
      return body;
    },
    retry: false,
  });

  const calls = callsData?.calls || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1 min-w-0">
          <label className="text-xs text-muted-foreground mb-1 block">
            Apel de finanțare (doar cele cu rezumat AI generat)
          </label>
          {callsLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : calls.length === 0 ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground" data-testid="empty-research-suggest-no-calls">
              Niciun apel cu rezumat AI generat încă. Generează un rezumat din panoul de apeluri de finanțare ca să poți vedea sugestii aici.
            </div>
          ) : (
            <Select value={callId} onValueChange={setCallId}>
              <SelectTrigger data-testid="select-funding-call">
                <SelectValue placeholder="Alege un apel..." />
              </SelectTrigger>
              <SelectContent>
                {calls.map((c) => (
                  <SelectItem key={c.id} value={c.id} data-testid={`select-item-funding-call-${c.id}`}>
                    <span className="flex items-center gap-2">
                      {c.status && <Badge variant="outline" className="text-xs">{c.status}</Badge>}
                      <span className="truncate max-w-[60ch]">{c.name}</span>
                      {c.deadline && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.deadline).toLocaleDateString("ro-RO")}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {suggestData?.fundingCall && (
          <div className="text-xs text-muted-foreground" data-testid="text-research-suggest-call-meta">
            CAEN eligibile: {suggestData.fundingCall.eligible_caen?.length || 0} ·
            tipuri beneficiari: {suggestData.fundingCall.beneficiary_types?.length || 0}
          </div>
        )}
      </div>

      {!callId && calls.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="text-research-suggest-prompt">
          Selectează un apel pentru a vedea top-20 entități de cercetare recomandate ca parteneri.
        </p>
      )}

      {callId && suggestLoading && <Skeleton className="h-64" />}

      {callId && suggestError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" data-testid="text-research-suggest-error">
          {suggestError.message}
        </div>
      )}

      {callId && suggestData && suggestData.suggestions.length === 0 && !suggestError && (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="empty-research-suggest-results">
          Nicio entitate de cercetare cu profil AI generat. Generează profiluri pentru entități în sub-tab-ul „Entități".
        </div>
      )}

      {callId && suggestData && suggestData.suggestions.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organizație</TableHead>
                <TableHead>Locație</TableHead>
                <TableHead className="text-right">Proiecte EU</TableHead>
                <TableHead className="text-right">Scor semantic</TableHead>
                <TableHead className="min-w-[180px]">Scor final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestData.suggestions.map((s) => {
                const semPct = Number(s.semantic_score) * 100;
                const finalPct = Number(s.final_score) * 100;
                const indicatorCls = scoreIndicatorClass(finalPct);
                const Icon = ENTITY_TYPE_ICONS[s.entity_type] || HelpCircle;
                return (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => onSelect(s.id)}
                    data-testid={`row-suggestion-${s.id}`}
                  >
                    <TableCell className="max-w-md">
                      <div className="flex items-start gap-2">
                        <Icon className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate" data-testid={`text-suggestion-name-${s.id}`}>{s.name_ro}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {ENTITY_TYPE_LABELS[s.entity_type] || s.entity_type}
                            </Badge>
                            {s.cui && <span className="text-xs text-muted-foreground font-mono">CUI {s.cui}</span>}
                          </div>
                          {s.profile_excerpt && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.profile_excerpt}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {[s.city, s.judet].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">{s.project_count}</TableCell>
                    <TableCell className="text-right font-mono text-xs" data-testid={`text-semantic-score-${s.id}`}>
                      {semPct.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.max(0, Math.min(100, finalPct))}
                          className={`flex-1 h-2 ${indicatorCls}`}
                        />
                        <span className="text-xs font-mono font-medium min-w-[3.5ch] text-right" data-testid={`text-final-score-${s.id}`}>
                          {finalPct.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ResearchProjectsView({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [program, setProgram] = useState<string>("all");
  const [status, setStatus] = useState<string>("");
  const [yearMin, setYearMin] = useState<string>("");
  const [yearMax, setYearMax] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (program !== "all") params.set("program", program);
  if (status.trim()) params.set("status", status.trim());
  if (yearMin.trim()) params.set("year_min", yearMin.trim());
  if (yearMax.trim()) params.set("year_max", yearMax.trim());
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const { data, isLoading } = useQuery<{ total: number; items: ResearchProjectRow[]; page: number; pageSize: number }>({
    queryKey: ["/api/admin/research/projects", q, program, status, yearMin, yearMax, offset],
    queryFn: async () => {
      const r = await fetch(`/api/admin/research/projects?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("err");
      return r.json();
    },
  });

  const total = data?.total ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Caută în titlu sau ID..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setOffset(0); }}
          className="max-w-sm"
          data-testid="input-research-project-search"
        />
        <Select value={program} onValueChange={(v) => { setProgram(v); setOffset(0); }}>
          <SelectTrigger className="w-[180px]" data-testid="select-research-program"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate programele</SelectItem>
            <SelectItem value="H2020">H2020</SelectItem>
            <SelectItem value="HORIZON_EUROPE">Horizon Europe</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Status..."
          value={status}
          onChange={(e) => { setStatus(e.target.value); setOffset(0); }}
          className="w-[140px]"
          data-testid="input-research-project-status"
        />
        <Input
          type="number"
          placeholder="An min"
          value={yearMin}
          onChange={(e) => { setYearMin(e.target.value); setOffset(0); }}
          className="w-[110px]"
          data-testid="input-research-project-year-min"
        />
        <Input
          type="number"
          placeholder="An max"
          value={yearMax}
          onChange={(e) => { setYearMax(e.target.value); setOffset(0); }}
          className="w-[110px]"
          data-testid="input-research-project-year-max"
        />
        <div className="ml-auto text-sm text-muted-foreground self-center" data-testid="text-research-project-total">
          {total} rezultate
        </div>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titlu</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Perioadă</TableHead>
                <TableHead>Buget EUR</TableHead>
                <TableHead className="text-right">Consorțiu</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items || []).map((p) => (
                <TableRow key={p.id} data-testid={`row-research-project-${p.id}`}>
                  <TableCell className="max-w-md">
                    <div className="text-xs truncate">{p.title_en || p.title_ro || <span className="text-muted-foreground italic">(fără titlu — {p.id})</span>}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{p.funding_program || "—"}</Badge></TableCell>
                  <TableCell className="text-xs">{p.start_year || "—"}{p.end_year ? `–${p.end_year}` : ""}</TableCell>
                  <TableCell className="text-xs font-mono">{p.total_budget_eur ? Number(p.total_budget_eur).toLocaleString("ro-RO", { maximumFractionDigits: 0 }) : "—"}</TableCell>
                  <TableCell className="text-right font-mono">{p.consortium_size}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => onSelect(p.id)} data-testid={`button-research-project-open-${p.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center pt-2">
            <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} data-testid="button-research-projects-prev">
              <ChevronLeft className="w-4 h-4 mr-1" />Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              {offset + 1} – {Math.min(offset + limit, total)} din {total}
            </span>
            <Button size="sm" variant="outline" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} data-testid="button-research-projects-next">
              Următor<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ResearchProjectDetail({
  id,
  onOpenEntity,
}: { id: string; onOpenEntity: (eid: string) => void }) {
  const { data, isLoading } = useQuery<ResearchProjectDetailDTO>({
    queryKey: ["/api/admin/research/projects", id],
    queryFn: async () => {
      const r = await fetch(`/api/admin/research/projects/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("err");
      return r.json();
    },
  });

  if (isLoading || !data) return <Skeleton className="h-64" />;
  const p = data.project;

  return (
    <>
      <DialogHeader>
        <DialogTitle data-testid="text-research-project-title">{p.title_en || p.title_ro || p.id}</DialogTitle>
        <DialogDescription>
          {p.id} · {p.funding_program || "—"} · {p.start_year || "?"}{p.end_year ? `–${p.end_year}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><span className="text-muted-foreground">Call ID:</span> <span className="font-mono text-xs">{p.call_id || "—"}</span></div>
          <div><span className="text-muted-foreground">Status:</span> {p.status || "—"}</div>
          <div><span className="text-muted-foreground">Buget EUR:</span> <span className="font-mono">{p.total_budget_eur ? Number(p.total_budget_eur).toLocaleString("ro-RO", { maximumFractionDigits: 0 }) : "—"}</span></div>
          <div className="col-span-3">
            <span className="text-muted-foreground">Sursă:</span>{" "}
            {p.source_url ? <a href={p.source_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{p.source_url} <ExternalLink className="inline w-3 h-3" /></a> : "—"}
          </div>
        </div>

        {p.abstract && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rezumat</p>
            <p className="text-sm whitespace-pre-wrap">{p.abstract}</p>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-2" data-testid="text-research-project-participants-count">
            Consorțiu ({data.participants.length} parteneri români)
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entitate</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Oraș</TableHead>
                <TableHead className="text-right">Buget EUR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.participants.map((pp) => (
                <TableRow key={pp.entity_id} className="cursor-pointer hover:bg-muted" onClick={() => onOpenEntity(pp.entity_id)} data-testid={`row-research-project-participant-${pp.entity_id}`}>
                  <TableCell className="font-medium max-w-md"><div className="truncate text-xs">{pp.name_ro}</div></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{(pp.entity_type && ENTITY_TYPE_LABELS[pp.entity_type]) || pp.entity_type || "—"}</Badge></TableCell>
                  <TableCell>{pp.role === "coordinator" ? <Badge className="text-xs bg-blue-600">Coordonator</Badge> : <span className="text-xs">Partener</span>}</TableCell>
                  <TableCell className="text-xs">{pp.city || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{pp.budget_share_eur ? Number(pp.budget_share_eur).toLocaleString("ro-RO", { maximumFractionDigits: 0 }) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getOnlineStatus(lastActiveAt: string | null | undefined): { isOnline: boolean; label: string } {
  if (!lastActiveAt) return { isOnline: false, label: "Nu s-a logat" };
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 5) return { isOnline: true, label: "Online acum" };
  if (mins < 60) return { isOnline: false, label: `Offline de ${mins} min` };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { isOnline: false, label: `Offline de ${hours}h` };
  const days = Math.floor(hours / 24);
  if (days < 30) return { isOnline: false, label: `Offline de ${days} zile` };
  return { isOnline: false, label: `Offline de ${Math.floor(days / 30)} luni` };
}

function formatWeek(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.getDate()} ${date.toLocaleDateString("ro-RO", { month: "short" })}`;
}

function getActionBadgeClasses(action: string): string {
  const authActions = ["login", "logout", "register", "verify_email", "forgot_password", "reset_password", "change_password", "accept_privacy"];
  const adminActions = ["update_role", "delete_user", "csv_export", "gdpr_export", "update_setting", "update_template", "reset_template", "n8n_import", "delete_guide"];
  const createActions = ["create", "upload", "upload_profile_image", "upload_guide", "submit", "ingest_pdf", "add_member", "add_collaborator"];
  const systemActions = ["index", "rag_reindex", "generate_icp", "eligibility_check", "refresh_profile", "auto_ingest", "regenerate_summary", "rag_index", "regenerate_ai"];
  if (authActions.includes(action)) return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  if (createActions.includes(action)) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (action === "update" || action === "update_status" || action === "update_preferences" || action === "update_member") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  if (action === "delete" || action === "remove_member" || action === "remove_collaborator") return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  if (adminActions.includes(action)) return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
  if (systemActions.includes(action)) return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
  return "";
}

function ManualDiscoveryQueueTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlyWithout, setOnlyWithout] = useState(false);

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (onlyWithout) queryParams.set("only_without_documents", "true");

  const { data: queue, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/funding-calls/manual-discovery-queue", statusFilter, onlyWithout],
    queryFn: async () => {
      const res = await fetch(`/api/admin/funding-calls/manual-discovery-queue?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Eroare");
      return res.json();
    },
  });

  const statusLabels: Record<string, { label: string; color: string }> = {
    unknown: { label: "Necunoscut", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    human_link_provided: { label: "Link furnizat", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    no_guide_published_yet: { label: "Nepublicat", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
    cannot_find_official_source: { label: "Negăsit", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
    completed: { label: "Completat", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
    error: { label: "Eroare", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  };

  const n8nLabels: Record<string, string> = {
    queued: "Coada", processing: "Proceseaza", success: "Succes", partial: "Partial",
    no_files_found: "Fara fisiere", monitoring_only: "Monitorizare", failed: "Esuat",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-500" />
            Coada descoperire manuala documente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-discovery-status-filter">
                <SelectValue placeholder="Filtru status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="unknown">Necunoscut</SelectItem>
                <SelectItem value="human_link_provided">Link furnizat</SelectItem>
                <SelectItem value="no_guide_published_yet">Ghid nepublicat</SelectItem>
                <SelectItem value="cannot_find_official_source">Sursa negasita</SelectItem>
                <SelectItem value="completed">Completat</SelectItem>
                <SelectItem value="error">Eroare</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={onlyWithout}
                onChange={(e) => setOnlyWithout(e.target.checked)}
                className="h-4 w-4 rounded accent-amber-500"
                data-testid="checkbox-only-without-docs"
              />
              Doar fara documente
            </label>
            <Badge variant="secondary" className="ml-auto">{queue?.length || 0} apeluri</Badge>
          </div>

          {isLoading ? <Skeleton className="h-60" /> : queue && queue.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Apel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Docs</TableHead>
                    <TableHead>URL sursa</TableHead>
                    <TableHead>n8n</TableHead>
                    <TableHead>Candidat</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item: any) => {
                    const st = statusLabels[item.manualDiscoveryStatus] || statusLabels.unknown;
                    return (
                      <TableRow key={item.id} data-testid={`row-discovery-${item.id}`}>
                        <TableCell>
                          <div>
                            <a href={`/funding-calls/${item.id}`} className="text-sm font-medium hover:underline text-blue-600 line-clamp-2" data-testid={`link-discovery-call-${item.id}`}>
                              {item.name}
                            </a>
                            {item.program && <p className="text-xs text-muted-foreground mt-0.5">{item.program}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${st.color} text-[10px] whitespace-nowrap`}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <Badge variant={item.existingDocumentsCount > 0 ? "default" : "outline"} className="text-[10px]">
                            {item.existingDocumentsCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.manualSourceUrl ? (() => {
                            try {
                              const u = new URL(item.manualSourceUrl);
                              if (u.protocol === "http:" || u.protocol === "https:") {
                                return <a href={item.manualSourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline max-w-[150px] block truncate">{u.hostname}</a>;
                              }
                            } catch {}
                            return <span className="text-xs text-muted-foreground truncate max-w-[150px] block">{item.manualSourceUrl}</span>;
                          })() : <span className="text-xs text-muted-foreground">--</span>}
                        </TableCell>
                        <TableCell>
                          {item.lastN8nStatus ? (
                            <Badge variant="outline" className="text-[10px]">
                              {n8nLabels[item.lastN8nStatus] || item.lastN8nStatus}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">--</span>}
                        </TableCell>
                        <TableCell>
                          {item.candidateManualSourceUrl ? (() => {
                            try {
                              const u = new URL(item.candidateManualSourceUrl);
                              if (u.protocol === "http:" || u.protocol === "https:") {
                                return <a href={item.candidateManualSourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline max-w-[120px] block truncate" title={item.candidateManualSourceUrl}>{item.candidateSourceOrigin || "candidat"}</a>;
                              }
                            } catch {}
                            return <span className="text-xs text-muted-foreground truncate">{item.candidateSourceOrigin || "candidat"}</span>;
                          })() : <span className="text-xs text-muted-foreground">--</span>}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/funding-calls/${item.id}`} data-testid={`button-open-discovery-${item.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Niciun apel găsit cu filtrele selectate</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InvitationsTab() {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [tplSubject, setTplSubject] = useState("");
  const [tplHtml, setTplHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const { data: invitations, isLoading: invitationsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/invitations"],
  });

  const { data: inviteTemplate, isLoading: tplLoading } = useQuery<{ subject: string; htmlBody: string; isCustomized: boolean }>({
    queryKey: ["/api/admin/invite-template"],
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (data: { recipientEmail: string; recipientName: string; customMessage: string }) => {
      const res = await apiRequest("POST", "/api/admin/send-invite", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Trimis!", description: data.message });
      setInviteEmail("");
      setInviteName("");
      setInviteMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message || "Nu s-a putut trimite invitatia", variant: "destructive" });
    },
  });

  const saveTplMutation = useMutation({
    mutationFn: async (data: { subject: string; htmlBody: string }) => {
      const res = await apiRequest("PUT", "/api/admin/invite-template", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Salvat", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-template"] });
      setEditingTemplate(false);
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const resetTplMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/invite-template/reset");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Resetat", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-template"] });
      setEditingTemplate(false);
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  function startEditing() {
    if (inviteTemplate) {
      setTplSubject(inviteTemplate.subject);
      setTplHtml(inviteTemplate.htmlBody);
    }
    setEditingTemplate(true);
    setShowPreview(false);
  }

  function getPreviewHtml() {
    const html = editingTemplate ? tplHtml : (inviteTemplate?.htmlBody || "");
    return html
      .replace(/\{\{name\}\}/g, "Exemplu Utilizator")
      .replace(/\{\{customMessage\}\}/g, '<p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">Acesta este un mesaj personalizat de exemplu.</p>');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[hsl(48,100%,45%)]" />
            Trimite invitație Beta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-lg">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email destinatar *</label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplu.com"
                type="email"
                data-testid="input-invite-email"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nume destinatar</label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="ex: Bogdan (optional, se va folosi emailul daca lipseste)"
                data-testid="input-invite-name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Mesaj personalizat (optional)</label>
              <Textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Adaugă un mesaj personal care va apărea în email..."
                rows={3}
                data-testid="input-invite-message"
              />
            </div>
            <Button
              onClick={() => sendInviteMutation.mutate({
                recipientEmail: inviteEmail,
                recipientName: inviteName,
                customMessage: inviteMessage,
              })}
              disabled={!inviteEmail.trim() || sendInviteMutation.isPending}
              data-testid="button-send-invite"
            >
              {sendInviteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Se trimite...</>
              ) : (
                <><Send className="w-4 h-4 mr-1" /> Trimite invitație</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Template email invitație
            {inviteTemplate?.isCustomized && (
              <Badge variant="outline" className="text-xs">Personalizat</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {!editingTemplate ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} data-testid="button-preview-invite-tpl">
                  <Eye className="w-4 h-4 mr-1" /> {showPreview ? "Ascunde preview" : "Preview"}
                </Button>
                <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-invite-tpl">
                  <Pencil className="w-4 h-4 mr-1" /> Editează
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} data-testid="button-preview-invite-tpl-edit">
                  <Eye className="w-4 h-4 mr-1" /> {showPreview ? "Editor" : "Preview"}
                </Button>
                {inviteTemplate?.isCustomized && (
                  <Button variant="outline" size="sm" onClick={() => resetTplMutation.mutate()} disabled={resetTplMutation.isPending} data-testid="button-reset-invite-tpl">
                    <RotateCcw className="w-4 h-4 mr-1" /> Resetează
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setEditingTemplate(false)} data-testid="button-cancel-invite-tpl">
                  Anulează
                </Button>
                <Button size="sm" onClick={() => saveTplMutation.mutate({ subject: tplSubject, htmlBody: tplHtml })} disabled={saveTplMutation.isPending} data-testid="button-save-invite-tpl">
                  <Save className="w-4 h-4 mr-1" /> {saveTplMutation.isPending ? "Se salvează..." : "Salvează"}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tplLoading ? <Skeleton className="h-40" /> : editingTemplate ? (
            showPreview ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-3 py-2 text-xs text-muted-foreground border-b">
                  Preview - variabilele au fost inlocuite cu valori de test
                </div>
                <iframe
                  srcDoc={getPreviewHtml()}
                  sandbox="allow-same-origin"
                  className="w-full border-0"
                  style={{ height: "600px" }}
                  title="Preview template invitație"
                  data-testid="iframe-invite-preview-edit"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Subject email</label>
                  <Input
                    value={tplSubject}
                    onChange={(e) => setTplSubject(e.target.value)}
                    data-testid="input-invite-tpl-subject"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">HTML Body</label>
                  <p className="text-xs text-muted-foreground">
                    Variabile disponibile: {"{{name}}"} (numele destinatarului), {"{{customMessage}}"} (mesajul personalizat)
                  </p>
                  <Textarea
                    value={tplHtml}
                    onChange={(e) => setTplHtml(e.target.value)}
                    rows={20}
                    className="font-mono text-xs"
                    data-testid="input-invite-tpl-html"
                  />
                </div>
              </div>
            )
          ) : showPreview ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs text-muted-foreground border-b">
                Preview - variabilele au fost inlocuite cu valori de test
              </div>
              <iframe
                srcDoc={getPreviewHtml()}
                sandbox="allow-same-origin"
                className="w-full border-0"
                style={{ height: "600px" }}
                title="Preview template invitație"
                data-testid="iframe-invite-preview"
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Template-ul curent este {inviteTemplate?.isCustomized ? "personalizat" : "cel implicit"}.</p>
              <p>Apasă <strong>Preview</strong> pentru a vedea cum arată emailul sau <strong>Editează</strong> pentru a modifica textul.</p>
              <p className="text-xs">Variabile: {"{{name}}"} = numele destinatarului, {"{{customMessage}}"} = mesajul personalizat per invitație</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Istoric invitatii ({invitations?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? <Skeleton className="h-40" /> : invitations && invitations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destinatar</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Trimis de</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Mesaj</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv: any) => (
                    <TableRow key={inv.id} data-testid={`row-invitation-${inv.id}`}>
                      <TableCell className="font-medium">{inv.recipientName || "--"}</TableCell>
                      <TableCell>{inv.recipientEmail}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.senderEmail}</TableCell>
                      <TableCell className="text-sm">{formatDate(inv.sentAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {inv.customMessage || "--"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nicio invitație trimisă încă</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: any; newRole: string } | null>(null);

  const [activeTab, setActiveTab] = useState("users");

  const [auditFilters, setAuditFilters] = useState<{ action: string; entityType: string; from: string; to: string }>({ action: "", entityType: "", from: "", to: "" });
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(25);
  const [expandedAuditRow, setExpandedAuditRow] = useState<string | null>(null);


  const [termeneRawCui, setTermeneRawCui] = useState<string | null>(null);
  const [termeneRawData, setTermeneRawData] = useState<any>(null);
  const [termeneRawLoading, setTermeneRawLoading] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ name: "", slug: "", description: "", monthlyCredits: 0, maxCompanies: 0, maxProjects: 0, features: "[]", isPublic: true, sortOrder: 0 });

  const [creditPackageDialogOpen, setCreditPackageDialogOpen] = useState(false);
  const [editingCreditPackage, setEditingCreditPackage] = useState<any>(null);
  const [creditPackageForm, setCreditPackageForm] = useState({ name: "", credits: 0, price: "", currency: "RON", isActive: true });

  const [editedCreditCosts, setEditedCreditCosts] = useState<any[]>([]);

  const [changePlanUser, setChangePlanUser] = useState<any>(null);
  const [changePlanId, setChangePlanId] = useState("");
  const [changePlanGrantCredits, setChangePlanGrantCredits] = useState(true);

  const [adjustCreditsUser, setAdjustCreditsUser] = useState<any>(null);
  const [adjustCreditsAmount, setAdjustCreditsAmount] = useState(0);
  const [adjustCreditsReason, setAdjustCreditsReason] = useState("");

  const [transactionsUser, setTransactionsUser] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const [quotaUser, setQuotaUser] = useState<any>(null);
  const [reindexing, setReindexing] = useState(false);
  const [reindexProgress, setReindexProgress] = useState<{ step: string; current: number; total: number } | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState<{ step: string; current: number; total: number; detail?: string } | null>(null);
  const [revalidatingAll, setRevalidatingAll] = useState(false);
  const [revalidateAllProgress, setRevalidateAllProgress] = useState<{ step: string; current: number; total: number; detail?: string } | null>(null);
  const [backfillChecking, setBackfillChecking] = useState(false);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillStructChecking, setBackfillStructChecking] = useState(false);
  const [backfillStructRunning, setBackfillStructRunning] = useState(false);
  const [backfillStructPreview, setBackfillStructPreview] = useState<{
    count: number;
    estimated_cost_usd: number;
    daily_spent_usd: number;
    daily_cap_usd: number;
    daily_remaining_usd: number;
    would_fit: boolean;
  } | null>(null);
  const [backfillStructConfirmOpen, setBackfillStructConfirmOpen] = useState(false);
  const [backfillStructProgress, setBackfillStructProgress] = useState<{ step: string; current: number; total: number; detail?: string } | null>(null);
  const [backfillStructSummary, setBackfillStructSummary] = useState<{
    processed: number;
    updated: number;
    skipped: number;
    cost_usd: number;
    source_missing: Array<{ id: string; name: string }>;
    failures: Array<{ id: string; name: string; reason: string }>;
  } | null>(null);
  // Task #74 (NEW-E.3) — Structural v2 backfill (TRL, project_value, cofinanțare, durată)
  const [backfillV2Checking, setBackfillV2Checking] = useState(false);
  const [backfillV2Running, setBackfillV2Running] = useState(false);
  const [backfillV2OnlyMissing, setBackfillV2OnlyMissing] = useState(true);
  const [backfillV2Preview, setBackfillV2Preview] = useState<{
    count: number;
    estimated_cost_usd: number;
    daily_spent_usd: number;
    daily_cap_usd: number;
    daily_remaining_usd: number;
    would_fit: boolean;
  } | null>(null);
  const [backfillV2ConfirmOpen, setBackfillV2ConfirmOpen] = useState(false);
  const [backfillV2Progress, setBackfillV2Progress] = useState<{ step: string; current: number; total: number; detail?: string } | null>(null);
  const [backfillV2Summary, setBackfillV2Summary] = useState<{
    processed: number;
    updated: number;
    skipped: number;
    cost_usd: number;
    field_counts: Record<string, number>;
    source_missing: Array<{ id: string; name: string }>;
    failures: Array<{ id: string; name: string; reason: string }>;
    top_updates: Array<{ id: string; name: string; fields: string[] }>;
  } | null>(null);
  const [backfillPreview, setBackfillPreview] = useState<{
    count: number;
    estimated_cost_usd: number;
    daily_spent_usd: number;
    daily_cap_usd: number;
    daily_remaining_usd: number;
    would_fit: boolean;
  } | null>(null);
  const [backfillProgress, setBackfillProgress] = useState<{ step: string; current: number; total: number; detail?: string } | null>(null);
  const [backfillConfirmOpen, setBackfillConfirmOpen] = useState(false);
  const [backfillSummary, setBackfillSummary] = useState<{
    processed: number;
    updated: number;
    skipped: number;
    cost_usd: number;
    source_missing: Array<{ id: string; name: string }>;
    failures: Array<{ id: string; name: string; reason: string }>;
  } | null>(null);

  const { data: userQuotaData, isLoading: userQuotaLoading } = useQuery<any>({
    queryKey: ["/api/admin/users", quotaUser?.id, "quotas"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${quotaUser.id}/quotas`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!quotaUser,
  });

  const { data: userUsageHistory } = useQuery<any[]>({
    queryKey: ["/api/admin/users", quotaUser?.id, "usage-history"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${quotaUser.id}/usage-history`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!quotaUser,
  });

  const { data: quotaDefaultsData } = useQuery<any>({
    queryKey: ["/api/admin/quota-defaults"],
    queryFn: async () => {
      const res = await fetch("/api/admin/quota-defaults", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === "settings",
  });

  const { data: termeneBudget } = useQuery<{ year: number; used: number; annualBudget: number; percentUsed: number; projectedAnnual: number; projectedPercent: number }>({
    queryKey: ["/api/admin/termene-budget"],
    queryFn: async () => {
      const res = await fetch("/api/admin/termene-budget", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === "tokens",
  });

  const [tokenFilters, setTokenFilters] = useState<{ action: string; model: string; userId: string; from: string; to: string }>({ action: "", model: "", userId: "", from: "", to: "" });
  const [tokenPage, setTokenPage] = useState(1);
  const [tokenLimit, setTokenLimit] = useState(50);

  const { data: summaryData } = useQuery<{ newUsersWeek: number; totalCompanies: number; expiringCalls: number; totalFeedback: number }>({ queryKey: ["/api/admin/summary"] });
  const { data: versionData } = useQuery<{ version: string; commitHash: string; buildDate: string; display: string }>({ queryKey: ["/api/version"] });

  const { data: billingOverview, isLoading: billingLoading } = useQuery<any>({ queryKey: ["/api/admin/billing/overview"], enabled: activeTab === "billing" });
  const [retryingInvoiceId, setRetryingInvoiceId] = useState<string | null>(null);
  const efacturaRetryMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await apiRequest("POST", `/api/admin/billing/efactura/${invoiceId}/retry`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: data?.ok ? "Reemitere inițiată" : "Reemitere indisponibilă", description: data?.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/overview"] });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err?.message || "Reemiterea a eșuat.", variant: "destructive" });
    },
    onSettled: () => setRetryingInvoiceId(null),
  });
  const { data: usersData, isLoading: usersLoading } = useQuery<any[]>({ queryKey: ["/api/admin/users"], enabled: activeTab === "users", staleTime: 60_000, refetchInterval: activeTab === "users" ? 60_000 : false });
  const { data: importLogsData, isLoading: logsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/import-logs"], enabled: activeTab === "settings" });
  const { data: feedbackData, isLoading: feedbackLoading } = useQuery<any[]>({ queryKey: ["/api/admin/feedback"], enabled: activeTab === "feedback" });
  const [triggerStatsRange, setTriggerStatsRange] = useState<"7d" | "30d" | "90d">("30d");
  type TriggerStatsResponse = {
    range: string;
    since: string;
    triggers: Record<string, {
      shown: number;
      responded: number;
      dismissed?: number;
      responseRate: number;
      distribution: {
        avgRating?: number | null;
        ratingCount?: number;
        verdictCounts?: { yes: number; no: number; partial: number };
        thumbs?: { up: number; down: number };
        thumbsRate?: number | null;
        reasons?: Record<string, number>;
        featuresUsed?: Record<string, number>;
      };
      recentResponses: Array<{
        id: string;
        userId: string;
        userEmail: string | null;
        userName: string | null;
        responseData: Record<string, unknown> | null;
        rating: number | null;
        message: string | null;
        createdAt: string | null;
      }>;
    }>;
  };
  const { data: triggerStatsData, isLoading: triggerStatsLoading } = useQuery<TriggerStatsResponse>({
    queryKey: ["/api/admin/feedback/triggers/stats", triggerStatsRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/feedback/triggers/stats?range=${triggerStatsRange}`, { credentials: "include" });
      if (!res.ok) throw new Error("stats");
      return res.json();
    },
    enabled: activeTab === "feedback",
  });
  const { data: settingsData, isLoading: settingsLoading } = useQuery<Record<string, string>>({ queryKey: ["/api/admin/settings"], enabled: activeTab === "settings" });

  const tokenQueryParams = new URLSearchParams();
  tokenQueryParams.set("page", String(tokenPage));
  tokenQueryParams.set("limit", String(tokenLimit));
  if (tokenFilters.action) tokenQueryParams.set("action", tokenFilters.action);
  if (tokenFilters.model) tokenQueryParams.set("model", tokenFilters.model);
  if (tokenFilters.userId) tokenQueryParams.set("userId", tokenFilters.userId);
  if (tokenFilters.from) tokenQueryParams.set("from", tokenFilters.from);
  if (tokenFilters.to) tokenQueryParams.set("to", tokenFilters.to);

  const { data: tokenData, isLoading: tokenLoading } = useQuery<any>({
    queryKey: ["/api/admin/token-usage", tokenPage, tokenLimit, tokenFilters.action, tokenFilters.model, tokenFilters.userId, tokenFilters.from, tokenFilters.to],
    queryFn: async () => {
      const res = await fetch(`/api/admin/token-usage?${tokenQueryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch token usage");
      return res.json();
    },
    enabled: activeTab === "tokens",
  });
  const { data: companiesData, isLoading: companiesLoading } = useQuery<any[]>({ queryKey: ["/api/admin/companies"], enabled: activeTab === "companies" });
  const { data: activityData, isLoading: activityLoading } = useQuery<any>({ queryKey: ["/api/admin/activity-stats"], enabled: activeTab === "activity" });
  const { data: betaMetrics, isLoading: betaMetricsLoading } = useQuery<any>({ queryKey: ["/api/admin/beta-metrics"], enabled: activeTab === "beta-metrics" });

  const { data: plansData, isLoading: plansLoading } = useQuery<any[]>({ queryKey: ["/api/admin/plans"], enabled: activeTab === "plans" || activeTab === "users" });
  const { data: creditCostsData, isLoading: creditCostsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/credit-costs"], enabled: activeTab === "credits" });
  const { data: creditPackagesData, isLoading: creditPackagesLoading } = useQuery<any[]>({ queryKey: ["/api/admin/credit-packages"], enabled: activeTab === "credits" });

  const { data: userTransactionsData, isLoading: userTransactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users", transactionsUser?.id, "transactions"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${transactionsUser.id}/transactions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!transactionsUser,
  });

  const [costFilters, setCostFilters] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const costQueryUrl = `/api/admin/user-costs${costFilters.from || costFilters.to ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(costFilters).filter(([, v]) => v))).toString() : ""}`;
  const { data: costData, isLoading: costLoading } = useQuery<any>({
    queryKey: ["/api/admin/user-costs", costFilters.from, costFilters.to],
    queryFn: async () => {
      const res = await fetch(costQueryUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user costs");
      return res.json();
    },
    enabled: activeTab === "costs",
  });

  const auditQueryParams = new URLSearchParams();
  auditQueryParams.set("page", String(auditPage));
  auditQueryParams.set("limit", String(auditLimit));
  if (auditFilters.action) auditQueryParams.set("action", auditFilters.action);
  if (auditFilters.entityType) auditQueryParams.set("entityType", auditFilters.entityType);
  if (auditFilters.from) auditQueryParams.set("from", auditFilters.from);
  if (auditFilters.to) auditQueryParams.set("to", auditFilters.to);

  const { data: auditData, isLoading: auditLoading } = useQuery<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: ["/api/admin/audit-log", auditPage, auditLimit, auditFilters.action, auditFilters.entityType, auditFilters.from, auditFilters.to],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-log?${auditQueryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit log");
      return res.json();
    },
    enabled: activeTab === "logs",
  });

  const { data: emailTemplatesData, isLoading: emailTemplatesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/email-templates"],
    enabled: activeTab === "settings",
  });

  const settingsMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("PUT", `/api/admin/settings/${key}`, { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Setare actualizată", description: "Setarea a fost salvată cu succes." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteUser(null);
      toast({ title: "Cont șters", description: "Utilizatorul și toate datele au fost șterse." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setPendingRoleChange(null);
      toast({ title: "Rol actualizat", description: "Rolul utilizatorului a fost schimbat." });
    },
    onError: (err: any) => {
      setPendingRoleChange(null);
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });


  const updateTemplateMutation = useMutation({
    mutationFn: async ({ slug, subject, htmlBody }: { slug: string; subject: string; htmlBody: string }) => {
      const res = await apiRequest("PUT", `/api/admin/email-templates/${slug}`, { subject, htmlBody });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setEditingTemplate(data);
      toast({ title: "Template salvat", description: "Template-ul a fost actualizat cu succes." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const resetTemplateMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await apiRequest("POST", `/api/admin/email-templates/${slug}/reset`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setEditingTemplate(data);
      setTemplateSubject(data.subject);
      setTemplateBody(data.htmlBody);
      setPreviewHtml(null);
      toast({ title: "Template resetat", description: "Template-ul a fost restaurat la versiunea originală." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/plans", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setPlanDialogOpen(false);
      setEditingPlan(null);
      toast({ title: "Plan creat", description: "Planul de abonament a fost creat cu succes." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/admin/plans/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setPlanDialogOpen(false);
      setEditingPlan(null);
      toast({ title: "Plan actualizat", description: "Planul a fost actualizat cu succes." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const deactivatePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/plans/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      toast({ title: "Plan dezactivat", description: "Planul a fost dezactivat." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const saveCreditCostsMutation = useMutation({
    mutationFn: async (costs: any[]) => {
      const res = await apiRequest("PATCH", "/api/admin/credit-costs", { costs });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-costs"] });
      toast({ title: "Costuri salvate", description: "Costurile acțiunilor au fost actualizate." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const createCreditPackageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/credit-packages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-packages"] });
      setCreditPackageDialogOpen(false);
      setEditingCreditPackage(null);
      toast({ title: "Pachet creat", description: "Pachetul de credite a fost creat." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const updateCreditPackageMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/admin/credit-packages/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-packages"] });
      setCreditPackageDialogOpen(false);
      setEditingCreditPackage(null);
      toast({ title: "Pachet actualizat", description: "Pachetul a fost actualizat." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const deactivateCreditPackageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/credit-packages/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-packages"] });
      toast({ title: "Pachet dezactivat", description: "Pachetul a fost dezactivat." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const changeUserPlanMutation = useMutation({
    mutationFn: async ({ userId, planId, grantCredits }: { userId: string; planId: string; grantCredits: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/plan`, { planId: planId || null, grantCredits });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setChangePlanUser(null);
      toast({ title: "Plan schimbat", description: "Planul utilizatorului a fost actualizat." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const adjustCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/credits`, { amount, reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setAdjustCreditsUser(null);
      setAdjustCreditsAmount(0);
      setAdjustCreditsReason("");
      toast({ title: "Credite ajustate", description: "Balanța de credite a fost actualizată." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const previewTemplateMutation = useMutation({
    mutationFn: async ({ slug, subject, htmlBody }: { slug: string; subject: string; htmlBody: string }) => {
      const res = await apiRequest("POST", `/api/admin/email-templates/${slug}/preview`, { subject, htmlBody });
      return res.json();
    },
    onSuccess: (data: any) => {
      setPreviewHtml(data.html);
    },
    onError: (err: any) => {
      toast({ title: "Eroare la previzualizare", description: err.message, variant: "destructive" });
    },
  });

  const handleExport = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export eșuat");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-export-${userId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Eroare", description: "Exportul GDPR a eșuat", variant: "destructive" });
    }
  };

  const handleViewTermeneRaw = async (cui: string) => {
    setTermeneRawCui(cui);
    setTermeneRawData(null);
    setTermeneRawLoading(true);
    try {
      const res = await fetch(`/api/admin/termene-raw/${cui}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Informație", description: json.message || "Nu există date cache", variant: "destructive" });
        setTermeneRawCui(null);
      } else {
        setTermeneRawData(json);
      }
    } catch {
      toast({ title: "Eroare", description: "Eroare la preluarea datelor Termene", variant: "destructive" });
      setTermeneRawCui(null);
    } finally {
      setTermeneRawLoading(false);
    }
  };

  const handleDownloadTermeneJson = () => {
    if (!termeneRawData) return;
    const blob = new Blob([JSON.stringify(termeneRawData.rawData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `termene-${termeneRawData.cui}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Descărcat", description: `JSON-ul pentru CUI ${termeneRawData.cui} a fost descărcat.` });
  };

  const handleCsvExport = async (typeWithParams: string) => {
    try {
      const res = await fetch(`/api/admin/export/${typeWithParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export eșuat");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseType = typeWithParams.split("?")[0];
      a.download = `${baseType}-export-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export descărcat", description: `Fișierul ${baseType}.csv a fost descărcat.` });
    } catch {
      toast({ title: "Eroare", description: "Exportul CSV a eșuat", variant: "destructive" });
    }
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    consultant: "Consultant",
    user: "Utilizator",
  };

  const maxBarValue = (data: any[], key: string) => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((d: any) => Number(d[key] || 0)), 1);
  };

  const newUsersThisWeek = summaryData?.newUsersWeek || 0;
  const totalCompanies = summaryData?.totalCompanies || 0;
  const expiringCallsCount = summaryData?.expiringCalls || 0;
  const totalFeedback = summaryData?.totalFeedback || 0;

  return (
    <div className="p-4 sm:p-6 w-full space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-admin-title">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Panou de administrare al platformei GRANTED</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-admin-new-users">{newUsersThisWeek}</p>
                <p className="text-xs text-muted-foreground">Utilizatori noi (7 zile)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-admin-companies-total">{totalCompanies}</p>
                <p className="text-xs text-muted-foreground">Total companii</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-admin-expiring-calls">{expiringCallsCount}</p>
                <p className="text-xs text-muted-foreground">Apeluri expira in 30 zile</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-admin-feedback-count">{totalFeedback}</p>
                <p className="text-xs text-muted-foreground">Feedback-uri</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-sm font-bold font-mono" data-testid="text-admin-version">{versionData?.display || "..."}</p>
                <p className="text-xs text-muted-foreground">
                  {versionData?.buildDate ? new Date(versionData.buildDate).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Versiune"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users" data-testid="tab-admin-users"><Users className="w-4 h-4 mr-1" />Utilizatori</TabsTrigger>
          <TabsTrigger value="companies" data-testid="tab-admin-companies"><Building2 className="w-4 h-4 mr-1" />Companii</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-admin-activity"><BarChart3 className="w-4 h-4 mr-1" />Activitate</TabsTrigger>
          <TabsTrigger value="tokens" data-testid="tab-admin-tokens"><Coins className="w-4 h-4 mr-1" />Tokeni</TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-admin-costs"><Banknote className="w-4 h-4 mr-1" />Costuri</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-admin-logs"><ScrollText className="w-4 h-4 mr-1" />Jurnal Audit</TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-admin-feedback"><MessageSquare className="w-4 h-4 mr-1" />Feedback</TabsTrigger>
          <TabsTrigger value="beta-metrics" data-testid="tab-admin-beta-metrics"><Activity className="w-4 h-4 mr-1" />Metrici Beta</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-admin-settings"><Settings className="w-4 h-4 mr-1" />Setări</TabsTrigger>
          <TabsTrigger value="plans" data-testid="tab-admin-plans"><Package className="w-4 h-4 mr-1" />Abonamente</TabsTrigger>
          <TabsTrigger value="credits" data-testid="tab-admin-credits"><CreditCard className="w-4 h-4 mr-1" />Credite</TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-admin-billing"><Receipt className="w-4 h-4 mr-1" />Facturare</TabsTrigger>
          <TabsTrigger value="invitations" data-testid="tab-admin-invitations"><Send className="w-4 h-4 mr-1" />Invitatii</TabsTrigger>
          <TabsTrigger value="discovery" data-testid="tab-admin-discovery"><Search className="w-4 h-4 mr-1" />Descoperire</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="research-partners" data-testid="tab-admin-research-partners">
              <Network className="w-4 h-4 mr-1" />Consorții și parteneri
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">beta</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {isSuperAdmin && (
          <TabsContent value="research-partners">
            <ResearchPartnersTab />
          </TabsContent>
        )}

        {/* ── Utilizatori ── */}
        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle className="text-lg">Utilizatori platformă</CardTitle></CardHeader>
            <CardContent>
              {usersLoading ? <Skeleton className="h-40" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Utilizator</TableHead>
                      <TableHead className="w-[90px]">Rol</TableHead>
                      <TableHead className="w-[70px] text-center">Status</TableHead>
                      <TableHead className="w-[60px] text-center" title="Companii"><Building2 className="w-3.5 h-3.5 mx-auto" /></TableHead>
                      <TableHead className="w-[60px] text-center" title="Proiecte"><FileText className="w-3.5 h-3.5 mx-auto" /></TableHead>
                      <TableHead className="w-[100px]">Plan / Credite</TableHead>
                      <TableHead className="w-[80px]">Data</TableHead>
                      <TableHead className="w-[44px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.map((u: any) => {
                      const onlineInfo = getOnlineStatus(u.lastActiveAt);
                      return (
                      <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="relative shrink-0" title={onlineInfo.label}>
                              <Circle className={`w-2.5 h-2.5 ${onlineInfo.isOnline ? "fill-green-500 text-green-500" : "fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                              <p className={`text-[10px] ${onlineInfo.isOnline ? "text-green-600 dark:text-green-400" : "text-muted-foreground/60"}`}>{onlineInfo.label}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <select
                            value={u.role || 'user'}
                            onChange={(e) => {
                              const newRole = e.target.value;
                              if (newRole !== (u.role || 'user')) {
                                setPendingRoleChange({ user: u, newRole });
                                e.target.value = u.role || 'user';
                              }
                            }}
                            className="text-[11px] border rounded px-1.5 py-0.5 bg-background cursor-pointer w-full"
                            data-testid={`select-role-${u.id}`}
                          >
                            <option value="user">User</option>
                            <option value="consultant">Consult.</option>
                            <option value="super_admin">Admin</option>
                          </select>
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {u.emailVerified ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500 cursor-help" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                )}
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">{u.emailVerified ? "Email verificat" : "Email neverificat"}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {u.privacyAcceptedAt ? (
                                  <Shield className="w-3.5 h-3.5 text-green-500 cursor-help" />
                                ) : (
                                  <Shield className="w-3.5 h-3.5 text-muted-foreground/40 cursor-help" />
                                )}
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">{u.privacyAcceptedAt ? "GDPR acceptat" : "GDPR neacceptat"}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {u.consentEmailMarketing ? (
                                  <Mail className="w-3.5 h-3.5 text-green-500 cursor-help" />
                                ) : (
                                  <Mail className="w-3.5 h-3.5 text-muted-foreground/40 cursor-help" />
                                )}
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">{u.consentEmailMarketing ? "Newsletter abonat" : "Newsletter dezabonat"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-center text-xs">{u.companiesCount}</TableCell>
                        <TableCell className="py-2 text-center text-xs">{u.projectsCount}</TableCell>
                        <TableCell className="py-2">
                          <div className="text-xs">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0" data-testid={`badge-plan-${u.id}`}>
                              {u.planName || "—"}
                            </Badge>
                            <span className="text-muted-foreground ml-1" data-testid={`text-credits-${u.id}`}>{u.creditBalance ?? 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                        </TableCell>
                        <TableCell className="py-2">
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-actions-${u.id}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => { setChangePlanUser(u); setChangePlanId(u.subscriptionPlanId ? String(u.subscriptionPlanId) : ""); setChangePlanGrantCredits(true); }} data-testid={`button-change-plan-${u.id}`}>
                                <Package className="w-3.5 h-3.5 mr-2" /> Schimba plan
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setAdjustCreditsUser(u); setAdjustCreditsAmount(0); setAdjustCreditsReason(""); }} data-testid={`button-adjust-credits-${u.id}`}>
                                <CreditCard className="w-3.5 h-3.5 mr-2" /> Credite +/-
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setTransactionsUser(u)} data-testid={`button-transactions-${u.id}`}>
                                <List className="w-3.5 h-3.5 mr-2" /> Tranzactii
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setQuotaUser(u)} data-testid={`button-quotas-user-${u.id}`}>
                                <Gauge className="w-3.5 h-3.5 mr-2" /> Limite
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleExport(u.id)} data-testid={`button-export-user-${u.id}`}>
                                <Download className="w-3.5 h-3.5 mr-2" /> Export GDPR
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteUser(u)} className="text-red-600 focus:text-red-600" data-testid={`button-delete-user-${u.id}`}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Șterge cont
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Companii ── */}
        <TabsContent value="companies" className="space-y-4">
          <CompanyCoverageCard />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">Toate companiile din platformă</CardTitle>
              <Button variant="outline" onClick={() => handleCsvExport("companies")} data-testid="button-export-companies-csv">
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {companiesLoading ? <Skeleton className="h-40" /> : companiesData && companiesData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Companie</TableHead>
                        <TableHead>CUI</TableHead>
                        <TableHead>CAEN</TableHead>
                        <TableHead>Proprietar</TableHead>
                        <TableHead>Angajați</TableHead>
                        <TableHead>Cifră afaceri</TableHead>
                        <TableHead>Județ</TableHead>
                        <TableHead>Creat</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companiesData.map((c: any) => (
                        <TableRow key={c.id} data-testid={`row-company-${c.id}`}>
                          <TableCell className="font-medium text-sm">{c.name || "—"}</TableCell>
                          <TableCell className="text-sm font-mono">{c.cui}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{c.caen || "—"}</Badge></TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{c.userName || "—"}</p>
                              <p className="text-xs text-muted-foreground">{c.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{c.employees || "—"}</TableCell>
                          <TableCell className="text-center text-sm">{c.revenue ? Number(c.revenue).toLocaleString("ro-RO") + " RON" : "—"}</TableCell>
                          <TableCell className="text-sm">{c.judet || "—"}</TableCell>
                          <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {c.cui && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewTermeneRaw(c.cui)}
                                  title="Vezi JSON brut Termene.ro"
                                  data-testid={`button-termene-raw-${c.id}`}
                                >
                                  <Database className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <a href={`/companies/${c.id}`} target="_blank" rel="noreferrer" title="Deschide compania">
                                <Button variant="outline" size="sm" data-testid={`button-view-company-${c.id}`}>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </a>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nicio companie înregistrată</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* ── Activitate ── */}
        <TabsContent value="activity">
          <div className="space-y-4">
            {activityLoading ? <Skeleton className="h-60" /> : activityData ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                      <p className="text-3xl font-bold text-blue-600" data-testid="text-activity-users">{activityData.totals?.users || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total utilizatori</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                      <p className="text-3xl font-bold text-green-600" data-testid="text-activity-companies">{activityData.totals?.companies || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total companii</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                      <p className="text-3xl font-bold text-purple-600" data-testid="text-activity-projects">{activityData.totals?.projects || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total proiecte</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                      <p className="text-3xl font-bold text-orange-600" data-testid="text-activity-checks">{activityData.totals?.eligibilityChecks || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total verificări</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Utilizatori noi / săptămână</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-1 h-32">
                        {(activityData.usersPerWeek || []).map((w: any, i: number) => {
                          const val = Number(w.count || 0);
                          const max = maxBarValue(activityData.usersPerWeek, "count");
                          const h = Math.max((val / max) * 100, 4);
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[10px] font-semibold">{val}</span>
                              <div className="w-full bg-blue-500 rounded-t" style={{ height: `${h}%` }} data-testid={`bar-users-${i}`} />
                              <span className="text-[9px] text-muted-foreground">{formatWeek(w.week)}</span>
                            </div>
                          );
                        })}
                        {(!activityData.usersPerWeek || activityData.usersPerWeek.length === 0) && (
                          <p className="text-xs text-muted-foreground w-full text-center">Fără date</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Verificări eligibilitate / săptămână</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-1 h-32">
                        {(activityData.checksPerWeek || []).map((w: any, i: number) => {
                          const val = Number(w.count || 0);
                          const max = maxBarValue(activityData.checksPerWeek, "count");
                          const h = Math.max((val / max) * 100, 4);
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[10px] font-semibold">{val}</span>
                              <div className="w-full bg-green-500 rounded-t" style={{ height: `${h}%` }} data-testid={`bar-checks-${i}`} />
                              <span className="text-[9px] text-muted-foreground">{formatWeek(w.week)}</span>
                            </div>
                          );
                        })}
                        {(!activityData.checksPerWeek || activityData.checksPerWeek.length === 0) && (
                          <p className="text-xs text-muted-foreground w-full text-center">Fără date</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nu s-au putut încărca statisticile</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Consum tokeni & Costuri (redesigned) ── */}
        <TabsContent value="tokens">
          <div className="space-y-4">
            {termeneBudget && (
              <Card data-testid="card-termene-budget">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-500" />
                    Buget verificări CUI Termene ({termeneBudget.year})
                    {termeneBudget.projectedPercent >= 80 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5" /> Proiecție peste prag
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xl font-bold" data-testid="text-termene-used">{termeneBudget.used.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Consum luna/anul curent</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold" data-testid="text-termene-projected">{termeneBudget.projectedAnnual.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Proiecție anuală</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold" data-testid="text-termene-budget">{termeneBudget.annualBudget.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Buget anual</p>
                    </div>
                    <div>
                      <p className={`text-xl font-bold ${termeneBudget.projectedPercent >= 80 ? "text-red-600 dark:text-red-400" : termeneBudget.projectedPercent >= 60 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`} data-testid="text-termene-projected-percent">
                        {termeneBudget.projectedPercent}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">% din buget (proiecție)</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${termeneBudget.projectedPercent >= 80 ? "bg-red-500" : termeneBudget.projectedPercent >= 60 ? "bg-amber-500" : "bg-green-500"}`}
                      style={{ width: `${Math.min(termeneBudget.projectedPercent, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            {tokenData?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-xl font-bold text-green-700 dark:text-green-400" data-testid="text-token-total-cost">
                          ${tokenData.summary.totalCost.toFixed(4)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Cost total (USD)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-xl font-bold" data-testid="text-token-total-requests">{tokenData.summary.totalRequests.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Total cereri API</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-xl font-bold" data-testid="text-token-prompt-total">{tokenData.summary.totalPromptTokens.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Tokeni intrare</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-xl font-bold" data-testid="text-token-completion-total">{tokenData.summary.totalCompletionTokens.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Tokeni ieșire</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-xl font-bold" data-testid="text-token-total-tokens">{tokenData.summary.totalTokens.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Total tokeni</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {tokenData?.summary?.costByModel && Object.keys(tokenData.summary.costByModel).length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Cost per model AI</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(tokenData.summary.costByModel as Record<string, number>)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .map(([model, cost]) => {
                          const maxCost = Math.max(...Object.values(tokenData.summary.costByModel as Record<string, number>));
                          const pct = maxCost > 0 ? ((cost as number) / maxCost) * 100 : 0;
                          const pricing = tokenData.modelCosts?.[model];
                          return (
                            <div key={model} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs font-mono" data-testid={`badge-model-${model}`}>{model}</Badge>
                                  {pricing && (
                                    <span className="text-[10px] text-muted-foreground" title={`$${pricing.input}/1M intrare, $${pricing.output}/1M ieșire`}>
                                      (${pricing.input}/${pricing.output} per 1M)
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold text-green-700 dark:text-green-400">${(cost as number).toFixed(4)}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Cost per tip acțiune</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(tokenData.summary.costByAction as Record<string, number>)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .map(([action, cost]) => {
                          const maxCost = Math.max(...Object.values(tokenData.summary.costByAction as Record<string, number>));
                          const pct = maxCost > 0 ? ((cost as number) / maxCost) * 100 : 0;
                          const actionLabel: Record<string, string> = {
                            eligibility_check: "Verificare eligibilitate",
                            termene_api: "Termene.ro",
                            company_profile_embedding: "Profil companie",
                            funding_call_summary: "Sumar apel",
                            icp_generation: "Generare ICP",
                            manual_index: "Indexare manuală",
                            pdf_ingest: "Ingestie documente",
                            rag_index: "Indexare AI",
                            regenerate_ai: "Regenerare AI",
                          };
                          return (
                            <div key={action} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{actionLabel[action] || action}</span>
                                <span className="font-semibold">${(cost as number).toFixed(4)}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {tokenData?.dailyCosts && tokenData.dailyCosts.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Cost zilnic (USD)</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-36">
                    {tokenData.dailyCosts.map((d: any, i: number) => {
                      const maxCost = Math.max(...tokenData.dailyCosts.map((x: any) => x.cost), 0.0001);
                      const h = Math.max((d.cost / maxCost) * 100, 4);
                      const dayLabel = new Date(d.day).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${dayLabel}: $${d.cost.toFixed(4)} (${d.requests} cereri)`}>
                          <span className="text-[9px] font-semibold">${d.cost < 0.01 ? d.cost.toFixed(4) : d.cost.toFixed(2)}</span>
                          <div className="w-full bg-green-500 rounded-t" style={{ height: `${h}%` }} data-testid={`bar-cost-${i}`} />
                          <span className="text-[8px] text-muted-foreground">{dayLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg">Istoric cereri detaliat</CardTitle>
                <Button variant="outline" onClick={() => {
                  const params = new URLSearchParams();
                  params.set("type", "tokens");
                  if (tokenFilters.action) params.set("action", tokenFilters.action);
                  if (tokenFilters.model) params.set("model", tokenFilters.model);
                  if (tokenFilters.userId) params.set("userId", tokenFilters.userId);
                  if (tokenFilters.from) params.set("from", tokenFilters.from);
                  if (tokenFilters.to) params.set("to", tokenFilters.to);
                  handleCsvExport(`tokens?${params.toString()}`);
                }} data-testid="button-export-tokens-csv">
                  <Download className="w-4 h-4 mr-1" /> Export CSV raport
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-3 mb-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Acțiune</label>
                    <Select value={tokenFilters.action || "all"} onValueChange={(v) => { setTokenFilters(f => ({ ...f, action: v === "all" ? "" : v })); setTokenPage(1); }}>
                      <SelectTrigger data-testid="select-token-action" className="w-[170px]">
                        <SelectValue placeholder="Toate acțiunile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toate acțiunile</SelectItem>
                        <SelectItem value="eligibility_check">Verificare eligibilitate</SelectItem>
                        <SelectItem value="termene_api">Termene.ro</SelectItem>
                        <SelectItem value="company_profile_embedding">Profil companie</SelectItem>
                        <SelectItem value="funding_call_summary">Sumar apel</SelectItem>
                        <SelectItem value="icp_generation">Generare ICP</SelectItem>
                        <SelectItem value="manual_index">Indexare manuală</SelectItem>
                        <SelectItem value="pdf_ingest">Ingestie documente</SelectItem>
                        <SelectItem value="rag_index">Indexare AI</SelectItem>
                        <SelectItem value="regenerate_ai">Regenerare AI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Model AI</label>
                    <Select value={tokenFilters.model || "all"} onValueChange={(v) => { setTokenFilters(f => ({ ...f, model: v === "all" ? "" : v })); setTokenPage(1); }}>
                      <SelectTrigger data-testid="select-token-model" className="w-[170px]">
                        <SelectValue placeholder="Toate modelele" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toate modelele</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o-mini</SelectItem>
                        <SelectItem value="text-embedding-ada-002">Embedding Ada-002</SelectItem>
                        <SelectItem value="termene.ro/v2">Termene.ro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Utilizator</label>
                    <Select value={tokenFilters.userId || "all"} onValueChange={(v) => { setTokenFilters(f => ({ ...f, userId: v === "all" ? "" : v })); setTokenPage(1); }}>
                      <SelectTrigger data-testid="select-token-user" className="w-[180px]">
                        <SelectValue placeholder="Toți utilizatorii" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toți utilizatorii</SelectItem>
                        {usersData?.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">De la</label>
                    <Input type="date" value={tokenFilters.from} onChange={(e) => { setTokenFilters(f => ({ ...f, from: e.target.value })); setTokenPage(1); }} className="w-[150px]" data-testid="input-token-from" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Până la</label>
                    <Input type="date" value={tokenFilters.to} onChange={(e) => { setTokenFilters(f => ({ ...f, to: e.target.value })); setTokenPage(1); }} className="w-[150px]" data-testid="input-token-to" />
                  </div>
                  <Button variant="outline" onClick={() => { setTokenFilters({ action: "", model: "", userId: "", from: "", to: "" }); setTokenPage(1); }} data-testid="button-token-clear">
                    Resetează
                  </Button>
                </div>

                {tokenLoading ? <Skeleton className="h-40" /> : tokenData?.data && tokenData.data.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Utilizator</TableHead>
                            <TableHead>Acțiune</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead className="text-right">Intrare</TableHead>
                            <TableHead className="text-right">Ieșire</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Cost (USD)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tokenData.data.map((t: any) => {
                            const actionLabel: Record<string, string> = {
                              eligibility_check: "Verificare eligibilitate",
                              termene_api: "Termene.ro",
                              company_profile_embedding: "Profil companie",
                              funding_call_summary: "Sumar apel",
                              icp_generation: "Generare ICP",
                              manual_index: "Indexare manuală",
                              pdf_ingest: "Ingestie documente",
                              rag_index: "Indexare AI",
                              regenerate_ai: "Regenerare AI",
                            };
                            const isTermene = t.action === "termene_api";
                            return (
                              <TableRow key={t.id} data-testid={`row-token-${t.id}`}>
                                <TableCell className="text-xs whitespace-nowrap">{formatDate(t.createdAt)}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="text-sm">{t.userName || "—"}</p>
                                    <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={isTermene ? "secondary" : "default"} className="text-xs">
                                    {actionLabel[t.action] || t.action}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs font-mono">{t.model || "—"}</Badge>
                                </TableCell>
                                <TableCell className="text-right text-sm">{isTermene ? "—" : (t.promptTokens || 0).toLocaleString()}</TableCell>
                                <TableCell className="text-right text-sm">{isTermene ? "—" : (t.completionTokens || 0).toLocaleString()}</TableCell>
                                <TableCell className="text-right text-sm font-medium">{isTermene ? "—" : (t.totalTokens || 0).toLocaleString()}</TableCell>
                                <TableCell className="text-right text-sm font-semibold">
                                  {isTermene ? <span className="text-orange-600 dark:text-orange-400">{t.cost.toFixed(2)} EUR</span> : t.cost > 0 ? `$${t.cost.toFixed(6)}` : "$0"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Per pagină:</span>
                        <Select value={String(tokenLimit)} onValueChange={(v) => { setTokenLimit(Number(v)); setTokenPage(1); }}>
                          <SelectTrigger className="w-[80px]" data-testid="select-token-limit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={tokenPage <= 1} onClick={() => setTokenPage(p => p - 1)} data-testid="button-token-prev">
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground" data-testid="text-token-page">
                          Pagina {tokenData.page} din {tokenData.totalPages || 1}
                        </span>
                        <Button variant="outline" size="sm" disabled={tokenPage >= (tokenData.totalPages || 1)} onClick={() => setTokenPage(p => p + 1)} data-testid="button-token-next">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      <span className="text-xs text-muted-foreground" data-testid="text-token-total">
                        Total: {tokenData.total} înregistrări
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coins className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Niciun consum înregistrat{(tokenFilters.action || tokenFilters.model || tokenFilters.from || tokenFilters.to) ? " pentru filtrele selectate" : ""}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {tokenData?.modelCosts && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Info className="w-4 h-4 text-muted-foreground" />Prețuri modele AI (per 1M tokeni)</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(tokenData.modelCosts as Record<string, { input: number; output: number }>).map(([model, prices]) => (
                      <div key={model} className="p-3 rounded-lg border text-center">
                        <p className="font-mono text-xs font-semibold mb-1">{model}</p>
                        <p className="text-xs text-muted-foreground">Intrare: <span className="font-semibold text-foreground">${(prices as any).input}</span></p>
                        <p className="text-xs text-muted-foreground">Ieșire: <span className="font-semibold text-foreground">${(prices as any).output}</span></p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Costuri per Utilizator ── */}
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Costuri per utilizator</CardTitle>
              <p className="text-sm text-muted-foreground">Costuri OpenAI (USD) + Termene.ro (EUR) pentru fiecare utilizator</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium">De la:</label>
                  <Input type="date" value={costFilters.from} onChange={(e) => setCostFilters(f => ({ ...f, from: e.target.value }))} className="w-40 h-8 text-xs" data-testid="input-cost-from" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium">Până la:</label>
                  <Input type="date" value={costFilters.to} onChange={(e) => setCostFilters(f => ({ ...f, to: e.target.value }))} className="w-40 h-8 text-xs" data-testid="input-cost-to" />
                </div>
                {(costFilters.from || costFilters.to) && (
                  <Button variant="ghost" size="sm" onClick={() => setCostFilters({ from: "", to: "" })} data-testid="button-cost-clear-filters">
                    <RotateCcw className="w-3 h-3 mr-1" /> Resetează
                  </Button>
                )}
              </div>

              {costLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : costData ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    <Card className="p-3 text-center border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-muted-foreground">Cost total OpenAI</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400" data-testid="text-total-openai-cost">${costData.totals.openaiCostUsd.toFixed(4)}</p>
                      <p className="text-[10px] text-muted-foreground">USD</p>
                    </Card>
                    <Card className="p-3 text-center border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-muted-foreground">Cost total Termene</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400" data-testid="text-total-termene-cost">{costData.totals.termeneCostEur.toFixed(2)} EUR</p>
                      <p className="text-[10px] text-muted-foreground">{costData.totals.termeneCount} interogări × {costData.totals.termeneCostPerLookup} EUR</p>
                    </Card>
                    <Card className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total tokeni</p>
                      <p className="text-lg font-bold" data-testid="text-total-tokens">{costData.totals.totalTokens.toLocaleString()}</p>
                    </Card>
                    <Card className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total cereri API</p>
                      <p className="text-lg font-bold" data-testid="text-total-requests">{costData.totals.totalRequests.toLocaleString()}</p>
                    </Card>
                    <Card className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Interogări Termene</p>
                      <p className="text-lg font-bold" data-testid="text-total-termene-count">{costData.totals.termeneCount}</p>
                    </Card>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Utilizator</TableHead>
                          <TableHead className="text-right">OpenAI (USD)</TableHead>
                          <TableHead className="text-right">Termene (EUR)</TableHead>
                          <TableHead className="text-right">Nr. Termene</TableHead>
                          <TableHead className="text-right">Tokeni</TableHead>
                          <TableHead className="text-right">Cereri API</TableHead>
                          <TableHead>Detalii model</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costData.users.map((u: any) => (
                          <TableRow key={u.userId} data-testid={`row-cost-${u.userId}`}>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{u.name}</p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium ${u.openaiCostUsd > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}>
                                ${u.openaiCostUsd.toFixed(4)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium ${u.termeneCostEur > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                                {u.termeneCostEur.toFixed(2)} EUR
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm">{u.termeneCount}</TableCell>
                            <TableCell className="text-right text-sm">{u.totalTokens.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-sm">{u.totalRequests.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(u.costByModel).map(([model, cost]) => (
                                  <Badge key={model} variant="outline" className="text-[10px]">
                                    {model}: ${(cost as number).toFixed(4)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {costData.users.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              Nu există date de consum pentru perioada selectată
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Referință prețuri:</p>
                    <div className="flex flex-wrap gap-4">
                      {Object.entries(costData.modelCosts).map(([model, costs]: any) => (
                        <span key={model}>{model}: ${costs.input}/1M input, ${costs.output}/1M output</span>
                      ))}
                      <span className="text-orange-600 dark:text-orange-400">termene.ro: {costData.totals.termeneCostPerLookup} EUR/interogare</span>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Jurnal Audit ── */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">Jurnal Audit</CardTitle>
              <Button variant="outline" onClick={() => handleCsvExport("audit")} data-testid="button-export-audit-csv">
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3 mb-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Acțiune</label>
                  <Select value={auditFilters.action || "all"} onValueChange={(v) => setAuditFilters(f => ({ ...f, action: v === "all" ? "" : v }))}>
                    <SelectTrigger data-testid="select-audit-action" className="w-[160px]">
                      <SelectValue placeholder="Toate acțiunile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate acțiunile</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                      <SelectItem value="register">Register</SelectItem>
                      <SelectItem value="verify_email">Verificare email</SelectItem>
                      <SelectItem value="forgot_password">Forgot password</SelectItem>
                      <SelectItem value="reset_password">Resetare parolă</SelectItem>
                      <SelectItem value="change_password">Schimbare parolă</SelectItem>
                      <SelectItem value="accept_privacy">Acceptare GDPR</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="upload">Upload</SelectItem>
                      <SelectItem value="refresh_profile">Refresh profil</SelectItem>
                      <SelectItem value="upload_profile_image">Upload avatar</SelectItem>
                      <SelectItem value="upload_guide">Upload ghid</SelectItem>
                      <SelectItem value="delete_guide">Ștergere ghid</SelectItem>
                      <SelectItem value="update_status">Update status</SelectItem>
                      <SelectItem value="update_role">Update Role</SelectItem>
                      <SelectItem value="delete_user">Delete User</SelectItem>
                      <SelectItem value="gdpr_export">GDPR Export</SelectItem>
                      <SelectItem value="csv_export">CSV Export</SelectItem>
                      <SelectItem value="update_setting">Update setare</SelectItem>
                      <SelectItem value="update_template">Editare template</SelectItem>
                      <SelectItem value="reset_template">Resetare template</SelectItem>
                      <SelectItem value="n8n_import">Import n8n</SelectItem>
                      <SelectItem value="index">Indexare AI</SelectItem>
                      <SelectItem value="rag_reindex">Re-indexare AI</SelectItem>
                      <SelectItem value="ingest_pdf">Ingestare PDF</SelectItem>
                      <SelectItem value="generate_icp">Generare ICP</SelectItem>
                      <SelectItem value="eligibility_check">Verificare eligibilitate</SelectItem>
                      <SelectItem value="update_preferences">Update preferințe</SelectItem>
                      <SelectItem value="submit">Submit feedback</SelectItem>
                      <SelectItem value="add_member">Adăugare membru consorțiu</SelectItem>
                      <SelectItem value="update_member">Update membru consorțiu</SelectItem>
                      <SelectItem value="remove_member">Eliminare membru consorțiu</SelectItem>
                      <SelectItem value="add_collaborator">Adăugare colaborator</SelectItem>
                      <SelectItem value="remove_collaborator">Eliminare colaborator</SelectItem>
                      <SelectItem value="auto_ingest">Ingestare automată</SelectItem>
                      <SelectItem value="regenerate_summary">Regenerare rezumat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tip entitate</label>
                  <Select value={auditFilters.entityType || "all"} onValueChange={(v) => setAuditFilters(f => ({ ...f, entityType: v === "all" ? "" : v }))}>
                    <SelectTrigger data-testid="select-audit-entity-type" className="w-[160px]">
                      <SelectValue placeholder="Toate tipurile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate tipurile</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="session">Session</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="funding_call">Funding Call</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="eligibility">Eligibility</SelectItem>
                      <SelectItem value="email_template">Email Template</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                      <SelectItem value="settings">Settings</SelectItem>
                      <SelectItem value="notification_preferences">Preferințe notificări</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="consortium">Consorțiu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">De la</label>
                  <Input type="date" value={auditFilters.from} onChange={(e) => setAuditFilters(f => ({ ...f, from: e.target.value }))} className="w-[150px]" data-testid="input-audit-from" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Până la</label>
                  <Input type="date" value={auditFilters.to} onChange={(e) => setAuditFilters(f => ({ ...f, to: e.target.value }))} className="w-[150px]" data-testid="input-audit-to" />
                </div>
                <Button onClick={() => { setAuditPage(1); queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-log"] }); }} data-testid="button-audit-search">
                  <Search className="w-4 h-4 mr-1" /> Caută
                </Button>
                <Button variant="outline" onClick={() => { setAuditFilters({ action: "", entityType: "", from: "", to: "" }); setAuditPage(1); }} data-testid="button-audit-clear">
                  Resetează filtre
                </Button>
              </div>

              {auditLoading ? <Skeleton className="h-40" /> : auditData && auditData.data && auditData.data.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Utilizator</TableHead>
                          <TableHead>Acțiune</TableHead>
                          <TableHead>Tip Entitate</TableHead>
                          <TableHead>Nume Entitate</TableHead>
                          <TableHead>IP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditData.data.map((entry: any) => (
                          <Fragment key={entry.id}>
                            <TableRow className="cursor-pointer" onClick={() => setExpandedAuditRow(expandedAuditRow === entry.id ? null : entry.id)} data-testid={`row-audit-${entry.id}`}>
                              <TableCell className="text-xs">{formatDate(entry.createdAt)}</TableCell>
                              <TableCell>
                                <span className="text-sm">{entry.userEmail || "—"}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={`text-xs ${getActionBadgeClasses(entry.action)}`} data-testid={`badge-action-${entry.id}`}>
                                  {getFeatureLabel(entry.action)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{entry.entityType || "—"}</TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate" title={entry.entityName}>{entry.entityName || "—"}</TableCell>
                              <TableCell className="text-xs font-mono">{entry.ipAddress || "—"}</TableCell>
                            </TableRow>
                            {expandedAuditRow === entry.id && (
                              <TableRow key={`${entry.id}-details`}>
                                <TableCell colSpan={6}>
                                  <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-xs">
                                    <div className="flex flex-wrap gap-4">
                                      <div><span className="font-semibold">Metodă:</span> {entry.method || "—"}</div>
                                      <div><span className="font-semibold">Cale:</span> {entry.path || "—"}</div>
                                    </div>
                                    <div><span className="font-semibold">User Agent:</span> <span className="break-all">{entry.userAgent || "—"}</span></div>
                                    {entry.metadata && (
                                      <div>
                                        <span className="font-semibold">Metadata:</span>
                                        <pre className="mt-1 p-2 rounded bg-background border text-xs overflow-x-auto max-h-40">{JSON.stringify(entry.metadata, null, 2)}</pre>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Elemente per pagină:</span>
                      <Select value={String(auditLimit)} onValueChange={(v) => { setAuditLimit(Number(v)); setAuditPage(1); }}>
                        <SelectTrigger className="w-[80px]" data-testid="select-audit-limit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)} data-testid="button-audit-prev">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground" data-testid="text-audit-page">
                        Pagina {auditData.page} din {auditData.totalPages || 1}
                      </span>
                      <Button variant="outline" size="sm" disabled={auditPage >= (auditData.totalPages || 1)} onClick={() => setAuditPage(p => p + 1)} data-testid="button-audit-next">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid="text-audit-total">
                      Total: {auditData.total} înregistrări
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Niciun rezultat găsit</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Feedback ── */}
        <TabsContent value="feedback" className="space-y-4">
          <Card data-testid="card-micro-surveys">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg">Micro-surveys contextuale</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/api/admin/feedback/triggers/export?range=${triggerStatsRange}`;
                    }}
                    data-testid="button-export-triggers-csv"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Exportă CSV
                  </Button>
                  <Select value={triggerStatsRange} onValueChange={(v: string) => setTriggerStatsRange(v as "7d" | "30d" | "90d")}>
                    <SelectTrigger className="w-32" data-testid="select-trigger-stats-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Ultimele 7 zile</SelectItem>
                      <SelectItem value="30d">Ultimele 30 zile</SelectItem>
                      <SelectItem value="90d">Ultimele 90 zile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {triggerStatsLoading ? (
                <Skeleton className="h-40" />
              ) : triggerStatsData?.triggers ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(triggerStatsData.triggers) as Array<[string, TriggerStatsResponse["triggers"][string]]>).map(([ev, raw]) => {
                    const labels: Record<string, string> = {
                      match_results: "Post-matching",
                      eligibility_verdict: "Post-verificare eligibilitate",
                      rag_first_answer: "Post-răspuns AI chat",
                      onboarding_7d: "După 7 zile de la onboarding",
                    };
                    return (
                      <Card key={ev} className="p-4 space-y-3" data-testid={`card-trigger-${ev}`}>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-sm">{labels[ev] || ev}</h4>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs">{raw.responseRate}% rata răspuns</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Exportă răspunsurile pentru acest trigger"
                              onClick={() => {
                                window.location.href = `/api/admin/feedback/triggers/export?range=${triggerStatsRange}&trigger=${ev}`;
                              }}
                              data-testid={`button-export-trigger-${ev}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-md border p-2">
                            <div className="text-muted-foreground">Afișări</div>
                            <div className="text-lg font-semibold" data-testid={`text-shown-${ev}`}>{raw.shown}</div>
                          </div>
                          <div className="rounded-md border p-2">
                            <div className="text-muted-foreground">Răspunsuri</div>
                            <div className="text-lg font-semibold" data-testid={`text-responded-${ev}`}>{raw.responded}</div>
                          </div>
                        </div>
                        {ev === "match_results" && raw.distribution?.avgRating !== null && raw.distribution?.avgRating !== undefined && (
                          <div className="text-xs text-muted-foreground">Rating mediu: <span className="font-semibold text-foreground">{raw.distribution.avgRating}</span> / 5 ({raw.distribution.ratingCount} răspunsuri)</div>
                        )}
                        {ev === "eligibility_verdict" && raw.distribution?.verdictCounts && (
                          <div className="text-xs flex gap-2 flex-wrap">
                            <Badge variant="secondary">Da: {raw.distribution.verdictCounts.yes}</Badge>
                            <Badge variant="secondary">Parțial: {raw.distribution.verdictCounts.partial}</Badge>
                            <Badge variant="destructive">Nu: {raw.distribution.verdictCounts.no}</Badge>
                          </div>
                        )}
                        {ev === "rag_first_answer" && raw.distribution?.thumbs && (
                          <div className="text-xs space-y-1">
                            <div className="flex gap-2">
                              <Badge variant="secondary">Pozitive: {raw.distribution.thumbs.up}</Badge>
                              <Badge variant="destructive">Negative: {raw.distribution.thumbs.down}</Badge>
                              {raw.distribution.thumbsRate !== null && <Badge variant="outline">{raw.distribution.thumbsRate}% utile</Badge>}
                            </div>
                            {raw.distribution.reasons && Object.keys(raw.distribution.reasons).length > 0 && (
                              <div className="text-muted-foreground pt-1">Motive: {Object.entries(raw.distribution.reasons).map(([k, v]) => `${k}: ${v}`).join(", ")}</div>
                            )}
                          </div>
                        )}
                        {ev === "onboarding_7d" && raw.distribution?.featuresUsed && Object.keys(raw.distribution.featuresUsed).length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Top funcționalități: {(Object.entries(raw.distribution.featuresUsed) as Array<[string, number]>)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 3)
                              .map(([k, v]) => `${k} (${v})`).join(", ")}
                          </div>
                        )}
                        {raw.recentResponses && raw.recentResponses.length > 0 && (
                          <details className="text-xs" data-testid={`details-recent-${ev}`}>
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Răspunsuri recente ({raw.recentResponses.length})
                            </summary>
                            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                              {raw.recentResponses.slice(0, 10).map((r) => {
                                const userLabel = r.userName ?? r.userEmail ?? `Utilizator ${r.userId.slice(0, 8)}`;
                                return (
                                  <div key={r.id} className="border-l-2 pl-2 py-1" data-testid={`row-recent-response-${r.id}`}>
                                    <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                      <span className="font-medium text-foreground/80 truncate" data-testid={`text-response-user-${r.id}`}>
                                        {userLabel}
                                      </span>
                                      <span className="shrink-0">{formatDate(r.createdAt)}</span>
                                    </div>
                                    {r.userEmail && r.userName && (
                                      <div className="text-[10px] text-muted-foreground truncate">{r.userEmail}</div>
                                    )}
                                    {r.message && <div className="text-xs mt-0.5">{r.message}</div>}
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">Nu există date pentru intervalul selectat</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Feedback utilizatori</CardTitle></CardHeader>
            <CardContent>
              {feedbackLoading ? <Skeleton className="h-40" /> : feedbackData && feedbackData.length > 0 ? (
                <div className="space-y-3">
                  {feedbackData.map((fb: any) => (
                    <div key={fb.id} className="border rounded-lg p-4" data-testid={`card-feedback-${fb.id}`}>
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={fb.type === "problema" ? "destructive" : fb.type === "sugestie" ? "default" : "secondary"}>
                            {fb.type === "sugestie" ? "Sugestie" : fb.type === "problema" ? "Problemă" : "Întrebare"}
                          </Badge>
                          {fb.category && (
                            <Badge variant="outline" data-testid={`badge-feedback-category-${fb.id}`}>
                              {fb.category}
                            </Badge>
                          )}
                          {fb.appVersion && fb.appVersion !== "N/A" && (
                            <Badge variant="outline" className="text-[10px] font-mono" data-testid={`badge-feedback-version-${fb.id}`}>
                              {fb.appVersion}
                            </Badge>
                          )}
                          {fb.rating && (
                            <span className="flex items-center gap-0.5" data-testid={`rating-feedback-${fb.id}`}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= fb.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                              ))}
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">{fb.userName || ""} ({fb.userEmail})</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(fb.createdAt)}</span>
                      </div>
                      {(() => {
                        const isMicroSurvey = fb.category === "micro_survey" && fb.triggerEvent && fb.responseData && typeof fb.responseData === "object";
                        const cfg = isMicroSurvey ? SURVEY_CONFIGS[fb.triggerEvent as TriggerEvent] : null;
                        if (!isMicroSurvey || !cfg) {
                          return <p className="text-sm whitespace-pre-wrap">{fb.message}</p>;
                        }
                        const triggerLabel = TRIGGER_LABELS[fb.triggerEvent as TriggerEvent] || fb.triggerEvent;
                        const rd = fb.responseData as Record<string, unknown>;
                        const rows = cfg.questions.map((q) => {
                          const val = rd[q.id];
                          if (val === undefined || val === null || val === "") return null;
                          let display: string;
                          if (Array.isArray(val)) {
                            display = val
                              .map((v) => q.options?.find((o) => o.value === v)?.label || String(v))
                              .join(", ");
                          } else if (q.options) {
                            display = q.options.find((o) => o.value === val)?.label || String(val);
                          } else {
                            display = String(val);
                          }
                          return { id: q.id, label: q.label, display };
                        }).filter((r): r is { id: string; label: string; display: string } => r !== null);
                        const freeText = typeof fb.message === "string" && !fb.message.startsWith(`[${fb.triggerEvent}]`) ? fb.message : null;
                        return (
                          <div className="space-y-2" data-testid={`survey-response-${fb.id}`}>
                            <div className="text-xs text-muted-foreground italic">Sondaj: {cfg.title} <span className="opacity-70">({triggerLabel})</span></div>
                            {rows.length > 0 ? (
                              <ul className="text-sm space-y-1">
                                {rows.map((r) => (
                                  <li key={r.id} className="flex flex-col sm:flex-row sm:gap-2">
                                    <span className="text-muted-foreground sm:min-w-[180px]">{r.label}:</span>
                                    <span className="font-medium">{r.display}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Niciun răspuns completat</p>
                            )}
                            {freeText && <p className="text-sm whitespace-pre-wrap border-t pt-2 mt-2">{freeText}</p>}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Niciun feedback primit încă</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Metrici Beta ── */}
        <TabsContent value="beta-metrics">
          {betaMetricsLoading ? <Skeleton className="h-60" /> : betaMetrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold" data-testid="text-beta-active-users">{betaMetrics.activeUsers7d}</p>
                        <p className="text-xs text-muted-foreground">Utilizatori activi (7 zile)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold" data-testid="text-beta-avg-companies">{Number(betaMetrics.avgCompaniesPerUser).toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Medie companii / utilizator</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-2xl font-bold" data-testid="text-beta-avg-matches">{Number(betaMetrics.avgMatchRunsPerUser).toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Medie potriviri / utilizator</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-2xl font-bold" data-testid="text-beta-avg-rating">
                          {Number(betaMetrics.avgFeedbackRating) > 0 ? `${Number(betaMetrics.avgFeedbackRating).toFixed(1)} / 5` : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">Rating mediu feedback ({betaMetrics.totalRatedFeedback})</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <div>
                        <p className="text-2xl font-bold" data-testid="text-beta-avg-projects">{Number(betaMetrics.avgProjectsPerUser).toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Medie proiecte / utilizator</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-teal-500" />
                      <div>
                        <p className="text-2xl font-bold" data-testid="text-beta-avg-eligibility">{Number(betaMetrics.avgEligibilityPerUser).toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Medie verificări / utilizator</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold" data-testid="text-beta-total-feedback">{betaMetrics.totalFeedback}</p>
                        <p className="text-xs text-muted-foreground">Total feedback-uri</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {betaMetrics.firstTimeEvents && betaMetrics.firstTimeEvents.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Evenimente First-Time</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Eveniment</TableHead>
                          <TableHead>Utilizatori</TableHead>
                          <TableHead>Timp mediu (ore)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {betaMetrics.firstTimeEvents.map((evt: any) => {
                          const ttv = betaMetrics.timeToValue?.find((t: any) => t.action === evt.action);
                          const labels: Record<string, string> = {
                            first_company_added: "Prima companie adăugată",
                            first_match_run: "Prima potrivire rulată",
                            first_eligibility_check: "Prima verificare eligibilitate",
                            first_project_created: "Primul proiect creat",
                            first_rag_chat: "Primul chat AI",
                          };
                          return (
                            <TableRow key={evt.action} data-testid={`row-beta-event-${evt.action}`}>
                              <TableCell className="text-sm font-medium">{labels[evt.action] || evt.action}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" data-testid={`badge-beta-count-${evt.action}`}>{evt.count}</Badge>
                              </TableCell>
                              <TableCell className="text-sm" data-testid={`text-beta-ttv-${evt.action}`}>
                                {ttv ? `${ttv.avgHours}h` : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {(!betaMetrics.firstTimeEvents || betaMetrics.firstTimeEvents.length === 0) && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nu există încă evenimente first-time înregistrate</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nu s-au putut încărca metricile beta</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Setări + Export + Email Templates + Importuri ── */}
        <TabsContent value="settings">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Setări platformă</CardTitle></CardHeader>
              <CardContent>
                {settingsLoading ? <Skeleton className="h-20" /> : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Notificare la înregistrare utilizator nou</p>
                        <p className="text-xs text-muted-foreground">Primești un email la adresa de admin când un utilizator nou se înregistrează pe platformă.</p>
                      </div>
                      <Switch
                        data-testid="switch-notify-registration"
                        checked={settingsData?.notify_new_registration === 'true'}
                        disabled={settingsMutation.isPending}
                        onCheckedChange={(checked) => {
                          settingsMutation.mutate({ key: 'notify_new_registration', value: checked ? 'true' : 'false' });
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Gauge className="w-5 h-5" />Limite implicite utilizare (Beta)</CardTitle></CardHeader>
              <CardContent>
                {quotaDefaultsData ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Aceste limite se aplică tuturor utilizatorilor noi. Utilizatorii cu limite personalizate nu sunt afectați.</p>
                    {Object.entries(quotaDefaultsData.current).map(([action, config]: [string, any]) => (
                      <div key={action} className="flex items-center gap-3 p-3 rounded-lg border" data-testid={`default-quota-${action}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{config.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Implicit hardcodat: {quotaDefaultsData.defaults[action]?.max ?? "—"} / {config.period === "daily" ? "zi" : "lună"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            defaultValue={config.max}
                            onBlur={async (e) => {
                              const val = parseInt(e.target.value);
                              if (val > 0 && val !== config.max) {
                                const allLimits: Record<string, { max: number }> = {};
                                for (const [a, c] of Object.entries(quotaDefaultsData.current)) {
                                  allLimits[a] = { max: a === action ? val : (c as any).max };
                                }
                                await apiRequest("PATCH", "/api/admin/quota-defaults", { limits: allLimits });
                                queryClient.invalidateQueries({ queryKey: ["/api/admin/quota-defaults"] });
                                toast({ title: "Limite implicite actualizate" });
                              }
                            }}
                            className="w-20 h-8 text-sm text-center"
                            data-testid={`input-default-max-${action}`}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">/ {config.period === "daily" ? "zi" : "lună"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <Skeleton className="h-40" />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5" />Migrare embeddings</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Regenerează toate embedding-urile (secțiuni ghiduri + profile companii) folosind modelul curent (text-embedding-3-small).
                    Folosiți după migrarea la un model nou sau după re-importarea datelor.
                  </p>
                  {reindexProgress && (
                    <div className="p-3 bg-muted/50 rounded-md space-y-2" data-testid="reindex-progress">
                      <p className="text-sm font-medium">{reindexProgress.step}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-300"
                            style={{ width: `${reindexProgress.total > 0 ? (reindexProgress.current / reindexProgress.total * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{reindexProgress.current}/{reindexProgress.total}</span>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    disabled={reindexing}
                    data-testid="button-reindex-embeddings"
                    onClick={async () => {
                      setReindexing(true);
                      setReindexProgress(null);
                      try {
                        const res = await fetch("/api/admin/reindex-all-embeddings", { method: "POST", credentials: "include" });
                        const reader = res.body?.getReader();
                        if (!reader) throw new Error("No reader");
                        const decoder = new TextDecoder();
                        let buffer = "";
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          buffer += decoder.decode(value, { stream: true });
                          const lines = buffer.split("\n");
                          buffer = lines.pop() || "";
                          for (const line of lines) {
                            if (line.startsWith("data: ")) {
                              try {
                                const data = JSON.parse(line.slice(6));
                                if (data.error) { toast({ title: "Eroare", description: data.error, variant: "destructive" }); }
                                else if (data.done) {
                                  toast({ title: "Reindexare completă", description: `${data.sectionsReindexed} secțiuni + ${data.companiesReindexed} companii regenerate.` });
                                } else {
                                  setReindexProgress({ step: data.step, current: data.current, total: data.total });
                                }
                              } catch {}
                            }
                          }
                        }
                      } catch (err: any) {
                        toast({ title: "Eroare", description: "Reindexarea a eșuat", variant: "destructive" });
                      } finally {
                        setReindexing(false);
                        setReindexProgress(null);
                      }
                    }}
                  >
                    {reindexing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    {reindexing ? "Reindexare în curs..." : "Regenerează toate embedding-urile"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={classifying}
                    data-testid="button-classify-all-docs"
                    onClick={async () => {
                      setClassifying(true);
                      setClassifyProgress(null);
                      try {
                        const res = await fetch("/api/admin/classify-all-documents", { method: "POST", credentials: "include" });
                        const reader = res.body?.getReader();
                        if (!reader) throw new Error("No reader");
                        const decoder = new TextDecoder();
                        let buffer = "";
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          buffer += decoder.decode(value, { stream: true });
                          const lines = buffer.split("\n");
                          buffer = lines.pop() || "";
                          for (const line of lines) {
                            if (line.startsWith("data: ")) {
                              try {
                                const data = JSON.parse(line.slice(6));
                                if (data.error) { toast({ title: "Eroare", description: data.error, variant: "destructive" }); }
                                else if (data.done) {
                                  toast({ title: "Clasificare completă", description: `${data.classified} documente clasificate din ${data.calls} apeluri. Erori: ${data.errors}` });
                                } else {
                                  setClassifyProgress({ step: data.step, current: data.current, total: data.total, detail: data.detail });
                                }
                              } catch {}
                            }
                          }
                        }
                      } catch (err: any) {
                        toast({ title: "Eroare", description: "Clasificarea a eșuat", variant: "destructive" });
                      } finally {
                        setClassifying(false);
                        setClassifyProgress(null);
                      }
                    }}
                  >
                    {classifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    {classifying ? "Clasificare in curs..." : "Clasifica toate documentele"}
                  </Button>
                </div>
                {classifyProgress && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{classifyProgress.step}</span>
                      <span>{classifyProgress.current}/{classifyProgress.total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${classifyProgress.total > 0 ? (classifyProgress.current / classifyProgress.total) * 100 : 0}%` }} />
                    </div>
                    {classifyProgress.detail && <p className="text-xs text-muted-foreground">{classifyProgress.detail}</p>}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">Revalideaza datele (bugete, valute, date) pe toate apelurile active. Deduce automat valuta cu AI acolo unde lipseste.</p>
                  <Button
                    variant="outline"
                    disabled={revalidatingAll}
                    data-testid="button-revalidate-all-data"
                    onClick={async () => {
                      setRevalidatingAll(true);
                      setRevalidateAllProgress(null);
                      try {
                        const res = await fetch("/api/admin/revalidate-all-data", { method: "POST", credentials: "include" });
                        const reader = res.body?.getReader();
                        if (!reader) throw new Error("No reader");
                        const decoder = new TextDecoder();
                        let buffer = "";
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          buffer += decoder.decode(value, { stream: true });
                          const lines = buffer.split("\n");
                          buffer = lines.pop() || "";
                          for (const line of lines) {
                            if (line.startsWith("data: ")) {
                              try {
                                const data = JSON.parse(line.slice(6));
                                if (data.error) { toast({ title: "Eroare", description: data.error, variant: "destructive" }); }
                                else if (data.done) {
                                  toast({ title: "Revalidare completă", description: `${data.processed} apeluri procesate. ${data.withIssues} cu probleme. ${data.currencyInferred} valute deduse AI.` });
                                } else {
                                  setRevalidateAllProgress({ step: data.step, current: data.current, total: data.total, detail: data.detail });
                                }
                              } catch {}
                            }
                          }
                        }
                      } catch (err: any) {
                        toast({ title: "Eroare", description: "Revalidarea a eșuat", variant: "destructive" });
                      } finally {
                        setRevalidatingAll(false);
                        setRevalidateAllProgress(null);
                      }
                    }}
                  >
                    {revalidatingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                    {revalidatingAll ? "Revalidare in curs..." : "Revalideaza toate datele"}
                  </Button>
                </div>
                {revalidateAllProgress && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{revalidateAllProgress.step}</span>
                      <span>{revalidateAllProgress.current}/{revalidateAllProgress.total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${revalidateAllProgress.total > 0 ? (revalidateAllProgress.current / revalidateAllProgress.total) * 100 : 0}%` }} />
                    </div>
                    {revalidateAllProgress.detail && <p className="text-xs text-muted-foreground">{revalidateAllProgress.detail}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5" />Extracție AI – câmpuri lipsă</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Repopulează cu AI câmpurile structurate lipsă (rezumat, CAEN-uri, regiuni, mărimi de companie, tipuri beneficiari) pentru apelurile active. Folosește când filtre noi din catalog nu returnează rezultate pentru că datele nu au fost extrase la importul inițial.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={backfillChecking || backfillRunning || backfillStructRunning}
                      data-testid="button-backfill-check"
                      onClick={async () => {
                        setBackfillChecking(true);
                        setBackfillPreview(null);
                        setBackfillSummary(null);
                        try {
                          const res = await apiRequest("POST", "/api/admin/extraction/backfill", {
                            mode: "missing",
                            dry_run: true,
                          });
                          const data = await res.json();
                          setBackfillPreview({
                            count: data.count,
                            estimated_cost_usd: data.estimated_cost_usd,
                            daily_spent_usd: data.daily_spent_usd,
                            daily_cap_usd: data.daily_cap_usd,
                            daily_remaining_usd: data.daily_remaining_usd,
                            would_fit: data.would_fit,
                          });
                          if (data.count === 0) {
                            toast({ title: "Toate apelurile sunt complete", description: "Nu există câmpuri lipsă de repopulat." });
                          }
                        } catch (err: any) {
                          toast({ title: "Eroare", description: err.message || "Verificarea a eșuat", variant: "destructive" });
                        } finally {
                          setBackfillChecking(false);
                        }
                      }}
                    >
                      {backfillChecking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                      {backfillChecking ? "Verificare..." : "Verifică câte apeluri necesită backfill"}
                    </Button>

                    {backfillPreview && backfillPreview.count > 0 && (
                      <Button
                        variant="default"
                        disabled={backfillRunning || backfillStructRunning || !backfillPreview.would_fit}
                        data-testid="button-backfill-run"
                        onClick={() => setBackfillConfirmOpen(true)}
                      >
                        {backfillRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {backfillRunning ? "Rulare în curs..." : `Rulează backfill (${backfillPreview.count} apeluri)`}
                      </Button>
                    )}
                  </div>

                  {backfillPreview && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1" data-testid="backfill-preview">
                      <div className="flex justify-between"><span>Apeluri cu câmpuri lipsă</span><span className="font-medium" data-testid="text-backfill-count">{backfillPreview.count}</span></div>
                      <div className="flex justify-between"><span>Cost estimat</span><span className="font-medium">${backfillPreview.estimated_cost_usd.toFixed(4)}</span></div>
                      <div className="flex justify-between"><span>Cheltuit azi pe backfill</span><span className="font-medium">${backfillPreview.daily_spent_usd.toFixed(4)} / ${backfillPreview.daily_cap_usd.toFixed(2)}</span></div>
                      {!backfillPreview.would_fit && (
                        <p className="text-xs text-destructive mt-1">Costul estimat depășește bugetul zilnic rămas (${backfillPreview.daily_remaining_usd.toFixed(4)}). Reîncearcă mâine.</p>
                      )}
                    </div>
                  )}

                  {backfillProgress && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{backfillProgress.step}</span>
                        <span>{backfillProgress.current}/{backfillProgress.total}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${backfillProgress.total > 0 ? (backfillProgress.current / backfillProgress.total) * 100 : 0}%` }} />
                      </div>
                      {backfillProgress.detail && <p className="text-xs text-muted-foreground">{backfillProgress.detail}</p>}
                    </div>
                  )}

                  {backfillSummary && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-3" data-testid="backfill-summary">
                      <div className="flex justify-between font-medium">
                        <span>Rezultat ultima rulare</span>
                        <span data-testid="text-backfill-result-cost">${backfillSummary.cost_usd.toFixed(4)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded bg-background p-2"><div className="text-muted-foreground">Procesate</div><div className="text-base font-semibold" data-testid="text-backfill-processed">{backfillSummary.processed}</div></div>
                        <div className="rounded bg-background p-2"><div className="text-muted-foreground">Actualizate</div><div className="text-base font-semibold text-green-600" data-testid="text-backfill-updated">{backfillSummary.updated}</div></div>
                        <div className="rounded bg-background p-2"><div className="text-muted-foreground">Sărite</div><div className="text-base font-semibold text-amber-600" data-testid="text-backfill-skipped">{backfillSummary.skipped}</div></div>
                      </div>

                      {backfillSummary.source_missing.length > 0 && (
                        <div className="space-y-1" data-testid="backfill-source-missing">
                          <p className="text-xs font-medium text-muted-foreground">Fără text-sursă ({backfillSummary.source_missing.length}):</p>
                          <ul className="text-xs space-y-0.5 pl-4 list-disc">
                            {backfillSummary.source_missing.slice(0, 5).map((s) => (
                              <li key={s.id} className="truncate">{s.name}</li>
                            ))}
                            {backfillSummary.source_missing.length > 5 && (
                              <li className="text-muted-foreground italic">…și încă {backfillSummary.source_missing.length - 5}</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {backfillSummary.failures.length > 0 && (
                        <div className="space-y-2" data-testid="backfill-failures">
                          <p className="text-xs font-medium text-muted-foreground">Sărite cu motiv ({backfillSummary.failures.length}):</p>
                          {Object.entries(
                            backfillSummary.failures.reduce<Record<string, Array<{ id: string; name: string }>>>((acc, f) => {
                              const key = f.reason.length > 60 ? f.reason.slice(0, 60) + "…" : f.reason;
                              (acc[key] = acc[key] || []).push({ id: f.id, name: f.name });
                              return acc;
                            }, {})
                          ).map(([reason, items]) => (
                            <div key={reason} className="space-y-0.5">
                              <p className="text-xs font-mono bg-amber-100 dark:bg-amber-950 inline-block px-1.5 py-0.5 rounded">{reason} <span className="text-muted-foreground">×{items.length}</span></p>
                              <ul className="text-xs space-y-0.5 pl-4 list-disc">
                                {items.slice(0, 3).map((it) => (
                                  <li key={it.id} className="truncate">{it.name}</li>
                                ))}
                                {items.length > 3 && (
                                  <li className="text-muted-foreground italic">…și încă {items.length - 3}</li>
                                )}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}

                      {backfillSummary.failures.length === 0 && backfillSummary.source_missing.length === 0 && backfillSummary.skipped === 0 && (
                        <p className="text-xs text-green-600">Toate apelurile au fost actualizate cu succes.</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5" />Extracție AI – câmpuri structurale (min_emp / min_rev / vechime)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Re-extrage cu AI câmpurile <code>min_employees</code>, <code>min_revenue</code> și <code>min_company_age</code> pentru toate apelurile active care le au goale. Folosește când Match Engine sub-evaluează companii compatibile pentru că aceste praguri n-au fost extrase din ghid la importul inițial. Bypassează gate-ul "deja complet" — sigur de rulat oricând (nu suprascrie valori existente cu null).
                  </p>
                  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 p-3 text-xs text-amber-900 dark:text-amber-100" data-testid="warning-backfill-struct-romanian">
                    <p className="font-medium mb-1">⚠️ Avertisment: rată de succes mică așteptată</p>
                    <p>
                      Majoritatea ghidurilor românești de finanțare <strong>nu specifică</strong> praguri minime de cifră de afaceri sau vechime — folosesc CAEN, regiune și tip beneficiar (IMM/mare). Pe PROD, doar ~4% din apeluri aveau <code>min_employees</code> și 0% aveau <code>min_revenue</code> înainte. LLM-ul va returna onest <code>null</code> pentru cele mai multe (apar în "Sărite" cu motivul <code>llm_returned_no_new_data</code>) — costul însă se cheltuie. Estimează 5–15 actualizări reale la o rulare completă. Nu rula decât dacă ai deja un caz concret unde un apel chiar conține aceste praguri și nu au fost extrase.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={backfillStructChecking || backfillStructRunning || backfillRunning}
                      data-testid="button-backfill-struct-check"
                      onClick={async () => {
                        setBackfillStructChecking(true);
                        setBackfillStructPreview(null);
                        setBackfillStructSummary(null);
                        try {
                          const res = await apiRequest("POST", "/api/admin/extraction/backfill", {
                            mode: "structural",
                            dry_run: true,
                          });
                          const data = await res.json();
                          setBackfillStructPreview({
                            count: data.count,
                            estimated_cost_usd: data.estimated_cost_usd,
                            daily_spent_usd: data.daily_spent_usd,
                            daily_cap_usd: data.daily_cap_usd,
                            daily_remaining_usd: data.daily_remaining_usd,
                            would_fit: data.would_fit,
                          });
                          if (data.count === 0) {
                            toast({ title: "Toate apelurile au câmpurile structurale extrase", description: "Nimic de re-extras." });
                          }
                        } catch (err: any) {
                          toast({ title: "Eroare", description: err.message || "Verificarea a eșuat", variant: "destructive" });
                        } finally {
                          setBackfillStructChecking(false);
                        }
                      }}
                    >
                      {backfillStructChecking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                      {backfillStructChecking ? "Verificare..." : "Verifică câte apeluri necesită re-extragere structurală"}
                    </Button>

                    {backfillStructPreview && backfillStructPreview.count > 0 && (
                      <Button
                        variant="default"
                        disabled={backfillStructRunning || backfillRunning || !backfillStructPreview.would_fit}
                        data-testid="button-backfill-struct-run"
                        onClick={() => setBackfillStructConfirmOpen(true)}
                      >
                        {backfillStructRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {backfillStructRunning ? "Rulare în curs..." : `Rulează re-extragere (${backfillStructPreview.count} apeluri)`}
                      </Button>
                    )}
                  </div>

                  {backfillStructPreview && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1" data-testid="backfill-struct-preview">
                      <div className="flex justify-between"><span>Apeluri fără min_emp/min_rev/vechime</span><span className="font-medium" data-testid="text-backfill-struct-count">{backfillStructPreview.count}</span></div>
                      <div className="flex justify-between"><span>Cost estimat</span><span className="font-medium">${backfillStructPreview.estimated_cost_usd.toFixed(4)}</span></div>
                      <div className="flex justify-between"><span>Cheltuit azi pe backfill</span><span className="font-medium">${backfillStructPreview.daily_spent_usd.toFixed(4)} / ${backfillStructPreview.daily_cap_usd.toFixed(2)}</span></div>
                      {!backfillStructPreview.would_fit && (
                        <p className="text-xs text-destructive mt-1">Costul estimat depășește bugetul zilnic rămas (${backfillStructPreview.daily_remaining_usd.toFixed(4)}). Reîncearcă mâine.</p>
                      )}
                    </div>
                  )}

                  {backfillStructProgress && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{backfillStructProgress.step}</span>
                        <span>{backfillStructProgress.current}/{backfillStructProgress.total}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${backfillStructProgress.total > 0 ? (backfillStructProgress.current / backfillStructProgress.total) * 100 : 0}%` }} />
                      </div>
                      {backfillStructProgress.detail && <p className="text-xs text-muted-foreground">{backfillStructProgress.detail}</p>}
                    </div>
                  )}

                  {backfillStructSummary && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-3" data-testid="backfill-struct-summary">
                      <div className="flex justify-between font-medium">
                        <span>Rezultat ultima rulare structurală</span>
                        <span data-testid="text-backfill-struct-result-cost">${backfillStructSummary.cost_usd.toFixed(4)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded bg-background p-2"><div className="text-muted-foreground">Procesate</div><div className="text-base font-semibold" data-testid="text-backfill-struct-processed">{backfillStructSummary.processed}</div></div>
                        <div className="rounded bg-background p-2"><div className="text-muted-foreground">Actualizate</div><div className="text-base font-semibold text-green-600" data-testid="text-backfill-struct-updated">{backfillStructSummary.updated}</div></div>
                        <div className="rounded bg-background p-2"><div className="text-muted-foreground">Sărite</div><div className="text-base font-semibold text-amber-600" data-testid="text-backfill-struct-skipped">{backfillStructSummary.skipped}</div></div>
                      </div>
                      {backfillStructSummary.failures.length === 0 && backfillStructSummary.source_missing.length === 0 && backfillStructSummary.skipped === 0 && (
                        <p className="text-xs text-green-600">Toate apelurile au fost re-extrase cu succes.</p>
                      )}
                      {backfillStructSummary.skipped > 0 && backfillStructSummary.failures.length === 0 && (
                        <p className="text-xs text-muted-foreground">Apelurile sărite sunt cele unde LLM-ul a confirmat că ghidul nu specifică prag minim — comportament normal.</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Dialog open={backfillStructConfirmOpen} onOpenChange={setBackfillStructConfirmOpen}>
              <DialogContent data-testid="dialog-backfill-struct-confirm">
                <DialogHeader>
                  <DialogTitle>Confirmă re-extragerea structurală</DialogTitle>
                  <DialogDescription asChild>
                    <div className="space-y-2">
                      <p>
                        Vei re-extrage <strong>{backfillStructPreview?.count} apeluri</strong> pentru câmpurile <code>min_employees</code> / <code>min_revenue</code> / <code>min_company_age</code>, cu un cost estimat de <strong>${backfillStructPreview?.estimated_cost_usd.toFixed(4)}</strong>. Operațiunea durează aproximativ {Math.ceil((backfillStructPreview?.count || 0) * 4 / 60)} minute.
                      </p>
                      <p className="text-amber-700 dark:text-amber-300">
                        ⚠️ Reține: ghidurile RO rar specifică aceste praguri. Așteaptă-te la 5–15 actualizări reale și ~90% "Sărite". Continui?
                      </p>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBackfillStructConfirmOpen(false)} data-testid="button-backfill-struct-cancel">Anulează</Button>
                  <Button
                    variant="default"
                    data-testid="button-backfill-struct-confirm"
                    onClick={async () => {
                      setBackfillStructConfirmOpen(false);
                      setBackfillStructRunning(true);
                      setBackfillStructProgress(null);
                      setBackfillStructSummary(null);
                      try {
                        const res = await fetch("/api/admin/extraction/backfill", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ mode: "structural" }),
                        });
                        if (!res.ok) {
                          const errBody = await res.json().catch(() => ({}));
                          throw new Error(errBody.message || `HTTP ${res.status}`);
                        }
                        const reader = res.body?.getReader();
                        if (!reader) throw new Error("No reader");
                        const decoder = new TextDecoder();
                        let buffer = "";
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          buffer += decoder.decode(value, { stream: true });
                          const lines = buffer.split("\n");
                          buffer = lines.pop() || "";
                          for (const rawLine of lines) {
                            const line = rawLine.trim();
                            if (!line || !line.startsWith("data: ")) continue;
                            try {
                              const data = JSON.parse(line.slice(6));
                              if (data.error) {
                                toast({ title: "Eroare", description: data.error, variant: "destructive" });
                              } else if (data.done) {
                                toast({
                                  title: "Re-extragere structurală completă",
                                  description: `${data.updated} actualizate, ${data.skipped} sărite. Cost: $${data.cost_usd.toFixed(4)}`,
                                });
                                setBackfillStructSummary({
                                  processed: data.processed || 0,
                                  updated: data.updated || 0,
                                  skipped: data.skipped || 0,
                                  cost_usd: data.cost_usd || 0,
                                  source_missing: Array.isArray(data.source_missing) ? data.source_missing : [],
                                  failures: Array.isArray(data.failures) ? data.failures : [],
                                });
                                setBackfillStructPreview(null);
                              } else {
                                setBackfillStructProgress({ step: data.step, current: data.current, total: data.total, detail: data.detail });
                              }
                            } catch {}
                          }
                        }
                      } catch (err: any) {
                        toast({ title: "Eroare", description: err.message || "Re-extragerea a eșuat", variant: "destructive" });
                      } finally {
                        setBackfillStructRunning(false);
                        setBackfillStructProgress(null);
                      }
                    }}
                  >
                    Da, rulează
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5" />Extracție AI – câmpuri structurale v2 (TRL, buget proiect, cofinanțare, durată)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Re-extrage cu AI cele <strong>7 câmpuri noi</strong> introduse pentru Match Engine v6: <code>min_trl</code>, <code>max_trl</code>, <code>project_min_value</code>, <code>project_max_value</code>, <code>project_value_currency</code>, <code>cofinancing_rate</code>, <code>project_duration_months</code>. Rulează doar pe apelurile <strong>active</strong> (lifecycle <code>urmeaza</code> / <code>depunere_activa</code>). Bypassează gate-ul "deja complet" — extractor-ul rulează din nou cu prompt-ul extins.
                  </p>
                  <div className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-700 p-3 text-xs text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">ℹ️ Câmpurile care există majoritar în ghidurile UE (Horizon Europe, EIC) — așteaptă rată decentă de populare pe apelurile europene, mai mică pe POR/PNRR pur național.</p>
                    <p>Pe PROD sunt ~143 apeluri active; durată estimată ~7-8 minute (3s sleep între apeluri).</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={backfillV2OnlyMissing}
                        onChange={(e) => setBackfillV2OnlyMissing(e.target.checked)}
                        disabled={backfillV2Checking || backfillV2Running}
                        data-testid="checkbox-backfill-v2-only-missing"
                      />
                      Doar cele cu câmpuri lipsă (default)
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={backfillV2Checking || backfillV2Running || backfillStructRunning || backfillRunning}
                      data-testid="button-backfill-v2-check"
                      onClick={async () => {
                        setBackfillV2Checking(true);
                        setBackfillV2Preview(null);
                        setBackfillV2Summary(null);
                        try {
                          const res = await apiRequest("POST", "/api/admin/funding-calls/backfill-structural", {
                            dry_run: true,
                            only_missing: backfillV2OnlyMissing,
                          });
                          const data = await res.json();
                          setBackfillV2Preview({
                            count: data.count,
                            estimated_cost_usd: data.estimated_cost_usd,
                            daily_spent_usd: data.daily_spent_usd,
                            daily_cap_usd: data.daily_cap_usd,
                            daily_remaining_usd: data.daily_remaining_usd,
                            would_fit: data.would_fit,
                          });
                          if (data.count === 0) {
                            toast({ title: "Nimic de procesat", description: "Toate apelurile active au cele 7 câmpuri populate." });
                          }
                        } catch (err: any) {
                          toast({ title: "Eroare", description: err.message || "Verificarea a eșuat", variant: "destructive" });
                        } finally {
                          setBackfillV2Checking(false);
                        }
                      }}
                    >
                      {backfillV2Checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                      {backfillV2Checking ? "Verificare..." : "Verifică câte apeluri active necesită backfill v2"}
                    </Button>

                    {backfillV2Preview && backfillV2Preview.count > 0 && (
                      <Button
                        variant="default"
                        disabled={backfillV2Running || backfillStructRunning || backfillRunning || !backfillV2Preview.would_fit}
                        data-testid="button-backfill-v2-run"
                        onClick={() => setBackfillV2ConfirmOpen(true)}
                      >
                        {backfillV2Running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {backfillV2Running ? "Rulare în curs..." : `Rulează backfill v2 (${backfillV2Preview.count} apeluri)`}
                      </Button>
                    )}
                  </div>

                  {backfillV2Preview && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1" data-testid="backfill-v2-preview">
                      <div className="flex justify-between"><span>Apeluri active{backfillV2OnlyMissing ? ' cu câmpuri v2 lipsă' : ' (toate)'}</span><span className="font-medium" data-testid="text-backfill-v2-count">{backfillV2Preview.count}</span></div>
                      <div className="flex justify-between"><span>Cost estimat</span><span className="font-medium">${backfillV2Preview.estimated_cost_usd.toFixed(4)}</span></div>
                      <div className="flex justify-between"><span>Cheltuit azi pe backfill</span><span className="font-medium">${backfillV2Preview.daily_spent_usd.toFixed(4)} / ${backfillV2Preview.daily_cap_usd.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Durată estimată</span><span className="font-medium">~{Math.ceil(backfillV2Preview.count * 4 / 60)} min</span></div>
                      {!backfillV2Preview.would_fit && (
                        <p className="text-xs text-destructive mt-1">Costul estimat depășește bugetul zilnic rămas (${backfillV2Preview.daily_remaining_usd.toFixed(4)}). Reîncearcă mâine.</p>
                      )}
                    </div>
                  )}

                  {backfillV2Progress && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{backfillV2Progress.step}</span>
                        <span>{backfillV2Progress.current}/{backfillV2Progress.total}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${backfillV2Progress.total > 0 ? (backfillV2Progress.current / backfillV2Progress.total) * 100 : 0}%` }} />
                      </div>
                      {backfillV2Progress.detail && <p className="text-xs text-muted-foreground">{backfillV2Progress.detail}</p>}
                    </div>
                  )}

                  {backfillV2Summary && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-3" data-testid="backfill-v2-summary">
                      <div className="flex justify-between font-medium">
                        <span>Rezultat ultima rulare backfill v2</span>
                        <span data-testid="text-backfill-v2-result-cost">${backfillV2Summary.cost_usd.toFixed(4)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded bg-background p-2"><div className="text-muted-foreground">Procesate</div><div className="text-base font-semibold" data-testid="text-backfill-v2-processed">{backfillV2Summary.processed}</div></div>
                        <div className="rounded bg-background p-2"><div className="text-muted-foreground">Actualizate</div><div className="text-base font-semibold text-green-600" data-testid="text-backfill-v2-updated">{backfillV2Summary.updated}</div></div>
                        <div className="rounded bg-background p-2"><div className="text-muted-foreground">Sărite</div><div className="text-base font-semibold text-amber-600" data-testid="text-backfill-v2-skipped">{backfillV2Summary.skipped}</div></div>
                      </div>

                      {Object.keys(backfillV2Summary.field_counts).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium">Câmpuri populate (per tip):</p>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {Object.entries(backfillV2Summary.field_counts).map(([f, n]) => (
                              <div key={f} className="flex justify-between rounded bg-background px-2 py-1">
                                <code className="text-muted-foreground">{f}</code>
                                <span className="font-medium">{n}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {backfillV2Summary.top_updates.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium">Top 5 apeluri cu cele mai multe câmpuri populate:</p>
                          <ul className="text-xs space-y-0.5 pl-4 list-disc">
                            {backfillV2Summary.top_updates.map((t) => (
                              <li key={t.id}><span className="font-medium">({t.fields.length})</span> <span className="truncate">{t.name.slice(0, 80)}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {backfillV2Summary.source_missing.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Apeluri fără text RAG ({backfillV2Summary.source_missing.length}):</p>
                          <ul className="text-xs space-y-0.5 pl-4 list-disc">
                            {backfillV2Summary.source_missing.slice(0, 5).map((s) => (
                              <li key={s.id} className="truncate">{s.name}</li>
                            ))}
                            {backfillV2Summary.source_missing.length > 5 && (
                              <li className="text-muted-foreground italic">…și încă {backfillV2Summary.source_missing.length - 5}</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {backfillV2Summary.failures.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-destructive">Eșecuri ({backfillV2Summary.failures.length}):</p>
                          <ul className="text-xs space-y-0.5 pl-4 list-disc">
                            {backfillV2Summary.failures.slice(0, 5).map((f) => (
                              <li key={f.id} className="truncate">{f.name} — <code className="text-muted-foreground">{f.reason}</code></li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {backfillV2Summary.failures.length === 0 && backfillV2Summary.source_missing.length === 0 && backfillV2Summary.updated > 0 && (
                        <p className="text-xs text-green-600">Backfill complet, fără erori.</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Dialog open={backfillV2ConfirmOpen} onOpenChange={setBackfillV2ConfirmOpen}>
              <DialogContent data-testid="dialog-backfill-v2-confirm">
                <DialogHeader>
                  <DialogTitle>Confirmă backfill-ul structural v2</DialogTitle>
                  <DialogDescription asChild>
                    <div className="space-y-2">
                      <p>
                        Vei procesa <strong>{backfillV2Preview?.count} apeluri active</strong> pentru cele 7 câmpuri noi (TRL, project_value, cofinanțare, durată), cu un cost estimat de <strong>${backfillV2Preview?.estimated_cost_usd.toFixed(4)}</strong>. Operațiunea durează aproximativ {Math.ceil((backfillV2Preview?.count || 0) * 4 / 60)} minute (3s sleep între apeluri).
                      </p>
                      <p className="text-muted-foreground">
                        Bypassează gate-ul "deja complet" cu <code>forceStructural=true</code>. Câmpurile vechi (max_funding, CAEN, beneficiary_types) nu sunt suprascrise — doar cele 7 noi + min_emp/min_rev/vechime acolo unde lipsesc.
                      </p>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBackfillV2ConfirmOpen(false)} data-testid="button-backfill-v2-cancel">Anulează</Button>
                  <Button
                    variant="default"
                    data-testid="button-backfill-v2-confirm"
                    onClick={async () => {
                      setBackfillV2ConfirmOpen(false);
                      setBackfillV2Running(true);
                      setBackfillV2Progress(null);
                      setBackfillV2Summary(null);
                      try {
                        const res = await fetch("/api/admin/funding-calls/backfill-structural", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ only_missing: backfillV2OnlyMissing }),
                        });
                        if (!res.ok) {
                          const errBody = await res.json().catch(() => ({}));
                          throw new Error(errBody.message || `HTTP ${res.status}`);
                        }
                        const reader = res.body?.getReader();
                        if (!reader) throw new Error("No reader");
                        const decoder = new TextDecoder();
                        let buffer = "";
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          buffer += decoder.decode(value, { stream: true });
                          const lines = buffer.split("\n");
                          buffer = lines.pop() || "";
                          for (const rawLine of lines) {
                            const line = rawLine.trim();
                            if (!line || !line.startsWith("data: ")) continue;
                            try {
                              const data = JSON.parse(line.slice(6));
                              if (data.error) {
                                toast({ title: "Eroare", description: data.error, variant: "destructive" });
                              } else if (data.done) {
                                toast({
                                  title: "Backfill v2 complet",
                                  description: `${data.updated} actualizate, ${data.skipped} sărite. Cost: $${(data.cost_usd || 0).toFixed(4)}`,
                                });
                                setBackfillV2Summary({
                                  processed: data.processed || 0,
                                  updated: data.updated || 0,
                                  skipped: data.skipped || 0,
                                  cost_usd: data.cost_usd || 0,
                                  field_counts: data.field_counts || {},
                                  source_missing: Array.isArray(data.source_missing) ? data.source_missing : [],
                                  failures: Array.isArray(data.failures) ? data.failures : [],
                                  top_updates: Array.isArray(data.top_updates) ? data.top_updates : [],
                                });
                                setBackfillV2Preview(null);
                              } else {
                                setBackfillV2Progress({ step: data.step, current: data.current, total: data.total, detail: data.detail });
                              }
                            } catch {}
                          }
                        }
                      } catch (err: any) {
                        toast({ title: "Eroare", description: err.message || "Backfill-ul a eșuat", variant: "destructive" });
                      } finally {
                        setBackfillV2Running(false);
                        setBackfillV2Progress(null);
                      }
                    }}
                  >
                    Da, rulează
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={backfillConfirmOpen} onOpenChange={setBackfillConfirmOpen}>
              <DialogContent data-testid="dialog-backfill-confirm">
                <DialogHeader>
                  <DialogTitle>Confirmă rularea backfill-ului</DialogTitle>
                  <DialogDescription>
                    Vei procesa <strong>{backfillPreview?.count} apeluri</strong> cu câmpuri lipsă, cu un cost estimat de <strong>${backfillPreview?.estimated_cost_usd.toFixed(4)}</strong>. Operațiunea durează aproximativ {Math.ceil((backfillPreview?.count || 0) * 4 / 60)} minute. Continui?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBackfillConfirmOpen(false)} data-testid="button-backfill-cancel">Anulează</Button>
                  <Button
                    variant="default"
                    data-testid="button-backfill-confirm"
                    onClick={async () => {
                      setBackfillConfirmOpen(false);
                      setBackfillRunning(true);
                      setBackfillProgress(null);
                      setBackfillSummary(null);
                      try {
                        const res = await fetch("/api/admin/extraction/backfill", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ mode: "missing" }),
                        });
                        if (!res.ok) {
                          const errBody = await res.json().catch(() => ({}));
                          throw new Error(errBody.message || `HTTP ${res.status}`);
                        }
                        const reader = res.body?.getReader();
                        if (!reader) throw new Error("No reader");
                        const decoder = new TextDecoder();
                        let buffer = "";
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          buffer += decoder.decode(value, { stream: true });
                          const lines = buffer.split("\n");
                          buffer = lines.pop() || "";
                          for (const rawLine of lines) {
                            const line = rawLine.trim();
                            if (!line || !line.startsWith("data: ")) continue;
                            try {
                              const data = JSON.parse(line.slice(6));
                              if (data.error) {
                                toast({ title: "Eroare", description: data.error, variant: "destructive" });
                              } else if (data.done) {
                                toast({
                                  title: "Backfill complet",
                                  description: `${data.updated} actualizate, ${data.skipped} sărite. Cost: $${data.cost_usd.toFixed(4)}`,
                                });
                                setBackfillSummary({
                                  processed: data.processed || 0,
                                  updated: data.updated || 0,
                                  skipped: data.skipped || 0,
                                  cost_usd: data.cost_usd || 0,
                                  source_missing: Array.isArray(data.source_missing) ? data.source_missing : [],
                                  failures: Array.isArray(data.failures) ? data.failures : [],
                                });
                                setBackfillPreview(null);
                              } else {
                                setBackfillProgress({ step: data.step, current: data.current, total: data.total, detail: data.detail });
                              }
                            } catch {}
                          }
                        }
                      } catch (err: any) {
                        toast({ title: "Eroare", description: err.message || "Backfill-ul a eșuat", variant: "destructive" });
                      } finally {
                        setBackfillRunning(false);
                        setBackfillProgress(null);
                      }
                    }}
                  >
                    Da, rulează
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Download className="w-5 h-5" />Export date (CSV)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="outline" onClick={() => handleCsvExport("users")} className="flex items-center gap-2" data-testid="button-export-users-csv">
                    <Users className="w-4 h-4" /> Utilizatori
                  </Button>
                  <Button variant="outline" onClick={() => handleCsvExport("companies")} className="flex items-center gap-2" data-testid="button-export-companies-csv-settings">
                    <Building2 className="w-4 h-4" /> Companii
                  </Button>
                  <Button variant="outline" onClick={() => handleCsvExport("projects")} className="flex items-center gap-2" data-testid="button-export-projects-csv">
                    <FileText className="w-4 h-4" /> Proiecte
                  </Button>
                  <Button variant="outline" onClick={() => handleCsvExport("tokens")} className="flex items-center gap-2" data-testid="button-export-tokens-csv">
                    <Coins className="w-4 h-4" /> Consum tokeni
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Mail className="w-5 h-5" />Template-uri email</CardTitle></CardHeader>
              <CardContent>
                {emailTemplatesLoading ? <Skeleton className="h-40" /> : emailTemplatesData && emailTemplatesData.length > 0 ? (
                  <div className="space-y-3">
                    {emailTemplatesData.map((tpl: any) => (
                      <div
                        key={tpl.id}
                        className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer"
                        onClick={() => {
                          setEditingTemplate(tpl);
                          setTemplateSubject(tpl.subject);
                          setTemplateBody(tpl.htmlBody);
                          setPreviewHtml(null);
                        }}
                        data-testid={`email-template-${tpl.slug}`}
                      >
                        <Mail className="w-4 h-4 text-primary mt-1 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="font-medium text-sm">{tpl.name}</p>
                            {tpl.isCustomized ? (
                              <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" data-testid={`badge-customized-${tpl.slug}`}>Personalizat</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-original-${tpl.slug}`}>Original</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{tpl.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Niciun template disponibil</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Database className="w-5 h-5" />Istoric importuri n8n</CardTitle></CardHeader>
              <CardContent>
                {logsLoading ? <Skeleton className="h-40" /> : importLogsData && importLogsData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Sursă</TableHead>
                          <TableHead>Primite</TableHead>
                          <TableHead>Create</TableHead>
                          <TableHead>Actualizate</TableHead>
                          <TableHead>Ignorate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importLogsData.map((log: any) => (
                          <TableRow key={log.id} data-testid={`row-import-${log.id}`}>
                            <TableCell className="text-sm">{formatDate(log.createdAt)}</TableCell>
                            <TableCell><Badge variant="outline">{log.source}</Badge></TableCell>
                            <TableCell className="text-center font-medium">{log.itemsReceived}</TableCell>
                            <TableCell className="text-center text-green-600">{log.itemsCreated}</TableCell>
                            <TableCell className="text-center text-blue-600">{log.itemsUpdated}</TableCell>
                            <TableCell className="text-center text-gray-500">{log.itemsSkipped}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Niciun import înregistrat încă</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Abonamente ── */}
        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">Planuri de abonament</CardTitle>
              <Button onClick={() => { setEditingPlan(null); setPlanForm({ name: "", slug: "", description: "", monthlyCredits: 0, maxCompanies: 0, maxProjects: 0, features: "[]", isPublic: true, sortOrder: 0 }); setPlanDialogOpen(true); }} data-testid="button-add-plan">
                <Plus className="w-4 h-4 mr-1" /> Adaugă plan
              </Button>
            </CardHeader>
            <CardContent>
              {plansLoading ? <Skeleton className="h-40" /> : plansData && plansData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nume</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Credite/lună</TableHead>
                        <TableHead>Max companii</TableHead>
                        <TableHead>Max proiecte</TableHead>
                        <TableHead>Public</TableHead>
                        <TableHead>Activ</TableHead>
                        <TableHead>Abonați</TableHead>
                        <TableHead>Acțiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plansData.map((plan: any) => (
                        <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                          <TableCell className="font-medium text-sm">{plan.name}</TableCell>
                          <TableCell className="text-sm font-mono">{plan.slug}</TableCell>
                          <TableCell className="text-center">{plan.monthlyCredits}</TableCell>
                          <TableCell className="text-center">{plan.maxCompanies}</TableCell>
                          <TableCell className="text-center">{plan.maxProjects}</TableCell>
                          <TableCell>
                            <Badge variant={plan.isPublic ? "default" : "secondary"} className="text-xs">
                              {plan.isPublic ? "Da" : "Nu"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={plan.isActive ? "default" : "secondary"} className="text-xs">
                              {plan.isActive ? "Activ" : "Inactiv"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center" data-testid={`text-plan-subscribers-${plan.id}`}>{plan.subscriber_count || 0}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditingPlan(plan);
                                setPlanForm({
                                  name: plan.name || "",
                                  slug: plan.slug || "",
                                  description: plan.description || "",
                                  monthlyCredits: plan.monthlyCredits || 0,
                                  maxCompanies: plan.maxCompanies || 0,
                                  maxProjects: plan.maxProjects || 0,
                                  features: JSON.stringify(plan.features || [], null, 2),
                                  isPublic: plan.isPublic ?? true,
                                  sortOrder: plan.sortOrder || 0,
                                });
                                setPlanDialogOpen(true);
                              }} title="Editează" data-testid={`button-edit-plan-${plan.id}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => deactivatePlanMutation.mutate(plan.id)} disabled={deactivatePlanMutation.isPending} title="Dezactivează" data-testid={`button-deactivate-plan-${plan.id}`}>
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Niciun plan de abonament configurat</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Credite ── */}
        <TabsContent value="credits">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg">Costuri acțiuni</CardTitle>
                <Button onClick={() => {
                  saveCreditCostsMutation.mutate(editedCreditCosts);
                }} disabled={saveCreditCostsMutation.isPending || editedCreditCosts.length === 0} data-testid="button-save-credit-costs">
                  <Save className="w-4 h-4 mr-1" /> {saveCreditCostsMutation.isPending ? "Se salvează..." : "Salvează"}
                </Button>
              </CardHeader>
              <CardContent>
                {creditCostsLoading ? <Skeleton className="h-40" /> : creditCostsData && creditCostsData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Acțiune</TableHead>
                          <TableHead>Etichetă</TableHead>
                          <TableHead>Cost (credite)</TableHead>
                          <TableHead>Activ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(editedCreditCosts.length > 0 ? editedCreditCosts : creditCostsData).map((cost: any, idx: number) => (
                          <TableRow key={cost.action || idx} data-testid={`row-credit-cost-${cost.action}`}>
                            <TableCell className="text-sm">{getFeatureLabel(cost.action)}</TableCell>
                            <TableCell className="text-sm">{cost.label || "—"}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={cost.creditCost}
                                onChange={(e) => {
                                  const updated = (editedCreditCosts.length > 0 ? [...editedCreditCosts] : creditCostsData.map((c: any) => ({ ...c }))).map((c: any, i: number) =>
                                    i === idx ? { ...c, creditCost: Number(e.target.value) } : c
                                  );
                                  setEditedCreditCosts(updated);
                                }}
                                className="w-24"
                                data-testid={`input-credit-cost-${cost.action}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={cost.isActive}
                                onCheckedChange={(checked) => {
                                  const updated = (editedCreditCosts.length > 0 ? [...editedCreditCosts] : creditCostsData.map((c: any) => ({ ...c }))).map((c: any, i: number) =>
                                    i === idx ? { ...c, isActive: checked } : c
                                  );
                                  setEditedCreditCosts(updated);
                                }}
                                data-testid={`switch-credit-cost-active-${cost.action}`}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coins className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Niciun cost de acțiune configurat</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg">Pachete credite</CardTitle>
                <Button onClick={() => { setEditingCreditPackage(null); setCreditPackageForm({ name: "", credits: 0, price: "", currency: "RON", isActive: true }); setCreditPackageDialogOpen(true); }} data-testid="button-add-credit-package">
                  <Plus className="w-4 h-4 mr-1" /> Adaugă pachet
                </Button>
              </CardHeader>
              <CardContent>
                {creditPackagesLoading ? <Skeleton className="h-40" /> : creditPackagesData && creditPackagesData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nume</TableHead>
                          <TableHead>Credite</TableHead>
                          <TableHead>Preț</TableHead>
                          <TableHead>Monedă</TableHead>
                          <TableHead>Activ</TableHead>
                          <TableHead>Acțiuni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditPackagesData.map((pkg: any) => (
                          <TableRow key={pkg.id} data-testid={`row-credit-package-${pkg.id}`}>
                            <TableCell className="font-medium text-sm">{pkg.name}</TableCell>
                            <TableCell className="text-center">{pkg.credits}</TableCell>
                            <TableCell className="text-center">{pkg.price != null ? pkg.price : "—"}</TableCell>
                            <TableCell className="text-sm">{pkg.currency || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={pkg.isActive ? "default" : "secondary"} className="text-xs">
                                {pkg.isActive ? "Activ" : "Inactiv"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                <Button variant="outline" size="sm" onClick={() => {
                                  setEditingCreditPackage(pkg);
                                  setCreditPackageForm({ name: pkg.name || "", credits: pkg.credits || 0, price: pkg.price != null ? String(pkg.price) : "", currency: pkg.currency || "RON", isActive: pkg.isActive ?? true });
                                  setCreditPackageDialogOpen(true);
                                }} title="Editează" data-testid={`button-edit-credit-package-${pkg.id}`}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => deactivateCreditPackageMutation.mutate(pkg.id)} disabled={deactivateCreditPackageMutation.isPending} title="Dezactivează" data-testid={`button-deactivate-credit-package-${pkg.id}`}>
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Niciun pachet de credite configurat</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Facturare (observabilitate billing) ── */}
        <TabsContent value="billing">
          <div className="space-y-4">
            {billingLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Se încarcă datele de facturare...
              </div>
            )}
            {billingOverview && (
              <>
                {/* MRR / ARR / abonați / churn */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-xl font-bold text-green-700 dark:text-green-400" data-testid="text-billing-mrr">
                            {billingOverview.subscriptions.mrr.toLocaleString()} {billingOverview.subscriptions.currency}
                          </p>
                          <p className="text-[10px] text-muted-foreground">MRR (venit lunar recurent)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-xl font-bold" data-testid="text-billing-arr">
                            {billingOverview.subscriptions.arr.toLocaleString()} {billingOverview.subscriptions.currency}
                          </p>
                          <p className="text-[10px] text-muted-foreground">ARR (venit anual recurent)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        <div>
                          <p className="text-xl font-bold" data-testid="text-billing-active-subs">{billingOverview.subscriptions.activeCount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Abonamente active</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-5 h-5 ${billingOverview.subscriptions.churn.rate >= 10 ? "text-red-500" : billingOverview.subscriptions.churn.rate >= 5 ? "text-amber-500" : "text-green-500"}`} />
                        <div>
                          <p className={`text-xl font-bold ${billingOverview.subscriptions.churn.rate >= 10 ? "text-red-600 dark:text-red-400" : billingOverview.subscriptions.churn.rate >= 5 ? "text-amber-600 dark:text-amber-400" : ""}`} data-testid="text-billing-churn">
                            {billingOverview.subscriptions.churn.rate}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">Churn 30 zile ({billingOverview.subscriptions.churn.canceledLast30} anulate)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Abonați per plan */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Abonați per plan</CardTitle></CardHeader>
                  <CardContent>
                    {billingOverview.subscriptions.byPlan.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Niciun abonament activ.</p>
                    ) : (
                      <div className="space-y-2">
                        {billingOverview.subscriptions.byPlan.map((p: any) => (
                          <div key={p.planId} className="flex items-center justify-between text-sm" data-testid={`row-billing-plan-${p.slug}`}>
                            <span className="font-medium">{p.planName}</span>
                            <span className="text-muted-foreground">{p.count} abonați</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Consum credite + venit pachete */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-500" /> Consum credite (30 zile)</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold" data-testid="text-billing-credits-consumed">{billingOverview.credits.consumedLast30.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground mb-3">credite consumate (total general: {billingOverview.credits.consumedAllTime.toLocaleString()})</p>
                      <div className="space-y-1.5">
                        {billingOverview.credits.byActionLast30.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Niciun consum în ultimele 30 zile.</p>
                        ) : billingOverview.credits.byActionLast30.map((a: any) => {
                          const max = billingOverview.credits.byActionLast30[0]?.credits || 1;
                          const pct = max > 0 ? (a.credits / max) * 100 : 0;
                          return (
                            <div key={a.action} data-testid={`row-billing-credit-action-${a.action}`}>
                              <div className="flex items-center justify-between text-xs">
                                <span>{a.label}</span>
                                <span className="text-muted-foreground">{a.credits.toLocaleString()} ({a.count})</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-yellow-500" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Banknote className="w-4 h-4 text-green-500" /> Venit pachete credite (estimat)</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="text-billing-package-revenue">
                        {billingOverview.credits.packageRevenue.last30.toLocaleString()} {billingOverview.credits.packageRevenue.currency}
                      </p>
                      <p className="text-[10px] text-muted-foreground">ultimele 30 zile (total general: {billingOverview.credits.packageRevenue.allTime.toLocaleString()} {billingOverview.credits.packageRevenue.currency})</p>
                      <p className="text-[10px] text-muted-foreground mt-2 italic">Estimare: achizițiile sunt asociate pachetelor după numărul de credite.</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Buget Termene CUI */}
                {billingOverview.termene && (
                  <Card data-testid="card-billing-termene">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-blue-500" />
                        Buget verificări CUI Termene ({billingOverview.termene.year})
                        {billingOverview.termene.projectedPercent >= 80 && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5" /> Proiecție peste prag
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xl font-bold">{billingOverview.termene.used.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Consum curent</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold">{billingOverview.termene.projectedAnnual.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Proiecție anuală</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold">{billingOverview.termene.annualBudget.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Buget anual</p>
                        </div>
                        <div>
                          <p className={`text-xl font-bold ${billingOverview.termene.projectedPercent >= 80 ? "text-red-600 dark:text-red-400" : billingOverview.termene.projectedPercent >= 60 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                            {billingOverview.termene.projectedPercent}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">% din buget (proiecție)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cost AI (COGS estimat) */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" /> Cost AI estimat (30 zile)</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="text-billing-ai-cost">${billingOverview.aiCost.last30.totalUsd.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground mb-3">{billingOverview.aiCost.note}</p>
                    <div className="space-y-1.5">
                      {billingOverview.aiCost.last30.byAction.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Niciun cost AI în ultimele 30 zile.</p>
                      ) : billingOverview.aiCost.last30.byAction.slice(0, 12).map((a: any) => {
                        const max = billingOverview.aiCost.last30.byAction[0]?.usd || 1;
                        const pct = max > 0 ? (a.usd / max) * 100 : 0;
                        return (
                          <div key={a.action} data-testid={`row-billing-ai-action-${a.action}`}>
                            <div className="flex items-center justify-between text-xs">
                              <span>{a.action}</span>
                              <span className="text-muted-foreground">${a.usd.toFixed(4)} ({a.calls})</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* e-Factura */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Receipt className="w-4 h-4 text-muted-foreground" /> e-Factura</CardTitle></CardHeader>
                  <CardContent>
                    {billingOverview.efactura.available ? (
                      billingOverview.efactura.countsUnavailable ? (
                        <p className="text-sm text-muted-foreground" data-testid="text-billing-efactura-status">{billingOverview.efactura.reason}</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-4" data-testid="text-billing-efactura-status">
                            {(billingOverview.efactura.counts || []).map((c: any) => (
                              <div key={c.status}>
                                <p className="text-lg font-bold">{Number(c.cnt).toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground">{c.status || "necunoscut"}</p>
                              </div>
                            ))}
                          </div>
                          {(billingOverview.efactura.retryable || []).length > 0 && (
                            <div className="space-y-2 border-t pt-3">
                              <p className="text-xs font-medium text-muted-foreground">Facturi blocate/respinse — reemitere manuală</p>
                              {(billingOverview.efactura.retryable || []).map((inv: any) => (
                                <div key={inv.id} className="flex items-center justify-between gap-2 text-sm" data-testid={`row-efactura-${inv.id}`}>
                                  <span className="truncate">
                                    <span className="font-mono text-xs">{inv.id}</span>
                                    <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-400">{inv.status}</span>
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={efacturaRetryMutation.isPending && retryingInvoiceId === inv.id}
                                    onClick={() => { setRetryingInvoiceId(inv.id); efacturaRetryMutation.mutate(inv.id); }}
                                    data-testid={`button-efactura-retry-${inv.id}`}
                                  >
                                    {efacturaRetryMutation.isPending && retryingInvoiceId === inv.id ? "Se reemite..." : "Reemite"}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-billing-efactura-status">
                        <Info className="w-4 h-4" /> {billingOverview.efactura.reason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Invitatii ── */}
        <TabsContent value="invitations">
          <InvitationsTab />
        </TabsContent>

        {/* ── Descoperire Manuala ── */}
        <TabsContent value="discovery">
          <ManualDiscoveryQueueTab />
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Plan abonament ── */}
      <Dialog open={planDialogOpen} onOpenChange={(open) => { if (!open) { setPlanDialogOpen(false); setEditingPlan(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editează plan" : "Adaugă plan nou"}</DialogTitle>
            <DialogDescription>
              {editingPlan ? "Modifică detaliile planului de abonament." : "Completează câmpurile pentru a crea un plan nou."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nume</label>
                <Input value={planForm.name} onChange={(e) => setPlanForm(f => ({ ...f, name: e.target.value }))} data-testid="input-plan-name" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Slug</label>
                <Input value={planForm.slug} onChange={(e) => setPlanForm(f => ({ ...f, slug: e.target.value }))} data-testid="input-plan-slug" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descriere</label>
              <Textarea value={planForm.description} onChange={(e) => setPlanForm(f => ({ ...f, description: e.target.value }))} data-testid="input-plan-description" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Credite/lună</label>
                <Input type="number" value={planForm.monthlyCredits} onChange={(e) => setPlanForm(f => ({ ...f, monthlyCredits: Number(e.target.value) }))} data-testid="input-plan-monthly-credits" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Max companii</label>
                <Input type="number" value={planForm.maxCompanies} onChange={(e) => setPlanForm(f => ({ ...f, maxCompanies: Number(e.target.value) }))} data-testid="input-plan-max-companies" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Max proiecte</label>
                <Input type="number" value={planForm.maxProjects} onChange={(e) => setPlanForm(f => ({ ...f, maxProjects: Number(e.target.value) }))} data-testid="input-plan-max-projects" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Features (JSON array)</label>
              <Textarea value={planForm.features} onChange={(e) => setPlanForm(f => ({ ...f, features: e.target.value }))} rows={3} data-testid="input-plan-features" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={planForm.isPublic} onCheckedChange={(checked) => setPlanForm(f => ({ ...f, isPublic: checked }))} data-testid="switch-plan-is-public" />
                <label className="text-sm font-medium">Public</label>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Ordine sortare</label>
                <Input type="number" value={planForm.sortOrder} onChange={(e) => setPlanForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} data-testid="input-plan-sort-order" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPlanDialogOpen(false); setEditingPlan(null); }} data-testid="button-cancel-plan">Anulează</Button>
            <Button
              onClick={() => {
                let features: any[];
                try { features = JSON.parse(planForm.features); } catch { features = []; }
                const payload = { ...planForm, features };
                if (editingPlan) {
                  updatePlanMutation.mutate({ id: editingPlan.id, ...payload });
                } else {
                  createPlanMutation.mutate(payload);
                }
              }}
              disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
              data-testid="button-save-plan"
            >
              {(createPlanMutation.isPending || updatePlanMutation.isPending) ? "Se salvează..." : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Pachet credite ── */}
      <Dialog open={creditPackageDialogOpen} onOpenChange={(open) => { if (!open) { setCreditPackageDialogOpen(false); setEditingCreditPackage(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCreditPackage ? "Editează pachet" : "Adaugă pachet credite"}</DialogTitle>
            <DialogDescription>
              {editingCreditPackage ? "Modifică detaliile pachetului." : "Completează câmpurile pentru a crea un pachet nou."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nume</label>
              <Input value={creditPackageForm.name} onChange={(e) => setCreditPackageForm(f => ({ ...f, name: e.target.value }))} data-testid="input-credit-package-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Credite</label>
                <Input type="number" value={creditPackageForm.credits} onChange={(e) => setCreditPackageForm(f => ({ ...f, credits: Number(e.target.value) }))} data-testid="input-credit-package-credits" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Preț</label>
                <Input value={creditPackageForm.price} onChange={(e) => setCreditPackageForm(f => ({ ...f, price: e.target.value }))} placeholder="opțional" data-testid="input-credit-package-price" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Monedă</label>
                <Select value={creditPackageForm.currency} onValueChange={(v) => setCreditPackageForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger data-testid="select-credit-package-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RON">RON</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={creditPackageForm.isActive} onCheckedChange={(checked) => setCreditPackageForm(f => ({ ...f, isActive: checked }))} data-testid="switch-credit-package-active" />
                <label className="text-sm font-medium">Activ</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreditPackageDialogOpen(false); setEditingCreditPackage(null); }} data-testid="button-cancel-credit-package">Anulează</Button>
            <Button
              onClick={() => {
                const payload = { ...creditPackageForm, price: creditPackageForm.price ? Number(creditPackageForm.price) : null };
                if (editingCreditPackage) {
                  updateCreditPackageMutation.mutate({ id: editingCreditPackage.id, ...payload });
                } else {
                  createCreditPackageMutation.mutate(payload);
                }
              }}
              disabled={createCreditPackageMutation.isPending || updateCreditPackageMutation.isPending}
              data-testid="button-save-credit-package"
            >
              {(createCreditPackageMutation.isPending || updateCreditPackageMutation.isPending) ? "Se salvează..." : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Schimbă plan utilizator ── */}
      <Dialog open={!!changePlanUser} onOpenChange={(open) => { if (!open) setChangePlanUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schimbă plan - {changePlanUser?.firstName} {changePlanUser?.lastName}</DialogTitle>
            <DialogDescription>Selectează un plan de abonament pentru acest utilizator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Plan</label>
              <Select value={changePlanId} onValueChange={setChangePlanId}>
                <SelectTrigger data-testid="select-user-plan">
                  <SelectValue placeholder="Selectează plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Fără plan</SelectItem>
                  {plansData?.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={changePlanGrantCredits} onCheckedChange={setChangePlanGrantCredits} data-testid="switch-grant-credits" />
              <label className="text-sm font-medium">Acordă credite lunare</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanUser(null)} data-testid="button-cancel-change-plan">Anulează</Button>
            <Button
              onClick={() => {
                if (changePlanUser) {
                  changeUserPlanMutation.mutate({ userId: changePlanUser.id, planId: changePlanId === "none" ? "" : changePlanId, grantCredits: changePlanGrantCredits });
                }
              }}
              disabled={changeUserPlanMutation.isPending}
              data-testid="button-save-change-plan"
            >
              {changeUserPlanMutation.isPending ? "Se salvează..." : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Ajustare credite utilizator ── */}
      <Dialog open={!!adjustCreditsUser} onOpenChange={(open) => { if (!open) setAdjustCreditsUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Credite +/- — {adjustCreditsUser?.firstName} {adjustCreditsUser?.lastName}</DialogTitle>
            <DialogDescription>Adaugă sau scade credite din balanța utilizatorului.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Cantitate (pozitiv = adaugă, negativ = scade)</label>
              <Input type="number" value={adjustCreditsAmount} onChange={(e) => setAdjustCreditsAmount(Number(e.target.value))} data-testid="input-adjust-credits-amount" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Motiv</label>
              <Input value={adjustCreditsReason} onChange={(e) => setAdjustCreditsReason(e.target.value)} placeholder="ex: bonus manual, corecție..." data-testid="input-adjust-credits-reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustCreditsUser(null)} data-testid="button-cancel-adjust-credits">Anulează</Button>
            <Button
              onClick={() => {
                if (adjustCreditsUser) {
                  adjustCreditsMutation.mutate({ userId: adjustCreditsUser.id, amount: adjustCreditsAmount, reason: adjustCreditsReason });
                }
              }}
              disabled={adjustCreditsMutation.isPending || adjustCreditsAmount === 0}
              data-testid="button-save-adjust-credits"
            >
              {adjustCreditsMutation.isPending ? "Se salvează..." : "Aplică"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Tranzacții utilizator ── */}
      <Dialog open={!!transactionsUser} onOpenChange={(open) => { if (!open) setTransactionsUser(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Tranzacții credite — {transactionsUser?.firstName} {transactionsUser?.lastName}</DialogTitle>
            <DialogDescription>Istoricul tranzacțiilor de credite pentru acest utilizator.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {userTransactionsLoading ? <Skeleton className="h-40" /> : userTransactionsData && userTransactionsData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Cantitate</TableHead>
                    <TableHead>Balanță după</TableHead>
                    <TableHead>Descriere</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userTransactionsData.map((tx: any, idx: number) => (
                    <TableRow key={tx.id || idx} data-testid={`row-transaction-${tx.id || idx}`}>
                      <TableCell className="text-xs">{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === "subscription_grant" || tx.type === "purchase" ? "default" : "secondary"} className="text-xs">
                          {getTransactionTypeLabel(tx.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-sm font-medium ${tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </TableCell>
                      <TableCell className="text-sm">{tx.balanceAfter ?? "—"}</TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate" title={formatTransactionDescription(tx.description)}>{formatTransactionDescription(tx.description)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nicio tranzacție înregistrată</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransactionsUser(null)} data-testid="button-close-transactions">Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmare schimbare rol ── */}
      <Dialog open={!!pendingRoleChange} onOpenChange={() => setPendingRoleChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Confirmare schimbare rol
            </DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să schimbi rolul utilizatorului <strong>{pendingRoleChange?.user?.email}</strong> din{" "}
              <strong>{roleLabels[pendingRoleChange?.user?.role || "user"]}</strong> în{" "}
              <strong>{roleLabels[pendingRoleChange?.newRole || "user"]}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRoleChange(null)} data-testid="button-cancel-role">Anulează</Button>
            <Button
              onClick={() => pendingRoleChange && roleMutation.mutate({ userId: pendingRoleChange.user.id, role: pendingRoleChange.newRole })}
              disabled={roleMutation.isPending}
              data-testid="button-confirm-role"
            >
              {roleMutation.isPending ? "Se actualizează..." : "Confirmă"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmare ștergere utilizator ── */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirmare ștergere cont
            </DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să ștergi contul <strong>{deleteUser?.email}</strong>?
              Toate datele asociate (companii, proiecte, documente, feedback) vor fi șterse permanent.
              Această acțiune este ireversibilă.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} data-testid="button-cancel-delete">Anulează</Button>
            <Button
              variant="destructive"
              onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Se șterge..." : "Șterge definitiv"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Gestionare limite utilizator ── */}
      <Dialog open={!!quotaUser} onOpenChange={() => setQuotaUser(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-blue-500" />
              Limite utilizare — {quotaUser?.firstName} {quotaUser?.lastName}
            </DialogTitle>
            <DialogDescription>{quotaUser?.email}</DialogDescription>
          </DialogHeader>

          {userQuotaLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : userQuotaData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {Object.entries(userQuotaData).map(([action, q]: [string, any]) => (
                  <div key={action} className="flex items-center gap-3 p-3 rounded-lg border" data-testid={`quota-row-${action}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{q.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Folosit: {q.used} / {q.isUnlimited ? "∞" : q.max}
                        {q.isCustom && !q.isUnlimited && <span className="ml-1 text-blue-600">(personalizat, implicit: {q.defaultMax})</span>}
                        {q.isUnlimited && <span className="ml-1 text-green-600">(fără limită)</span>}
                        <span className="ml-2">• {q.period === "daily" ? "zilnic" : "lunar"}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Fără limită</label>
                        <Switch
                          checked={q.isUnlimited}
                          onCheckedChange={async (checked) => {
                            const newMax = checked ? -1 : q.defaultMax;
                            await apiRequest("PATCH", `/api/admin/users/${quotaUser.id}/quotas`, { action, maxAllowed: newMax });
                            queryClient.invalidateQueries({ queryKey: ["/api/admin/users", quotaUser.id, "quotas"] });
                            toast({ title: "Limită actualizată" });
                          }}
                          data-testid={`switch-unlimited-${action}`}
                        />
                      </div>
                      {!q.isUnlimited && (
                        <Input
                          type="number"
                          min={1}
                          defaultValue={q.max}
                          onBlur={async (e) => {
                            const val = parseInt(e.target.value);
                            if (val > 0 && val !== q.max) {
                              await apiRequest("PATCH", `/api/admin/users/${quotaUser.id}/quotas`, { action, maxAllowed: val });
                              queryClient.invalidateQueries({ queryKey: ["/api/admin/users", quotaUser.id, "quotas"] });
                              toast({ title: "Limită actualizată" });
                            }
                          }}
                          className="w-20 h-8 text-sm text-center"
                          data-testid={`input-max-${action}`}
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await apiRequest("POST", `/api/admin/users/${quotaUser.id}/quotas/reset`, { action });
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/users", quotaUser.id, "quotas"] });
                          toast({ title: "Contor resetat", description: `${q.label} a fost resetat la 0.` });
                        }}
                        title="Resetează contor"
                        data-testid={`button-reset-${action}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {userUsageHistory && userUsageHistory.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Istoric recent utilizare</h4>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Acțiune</TableHead>
                          <TableHead className="text-xs">Model</TableHead>
                          <TableHead className="text-xs text-right">Tokeni</TableHead>
                          <TableHead className="text-xs text-right">Cost</TableHead>
                          <TableHead className="text-xs">Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userUsageHistory.map((h: any) => (
                          <TableRow key={h.id}>
                            <TableCell className="text-xs">{getFeatureLabel(h.action)}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-[10px]">{h.model || "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right">{h.model === "termene.ro/v2" ? "—" : (h.totalTokens || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-xs text-right font-medium">
                              {h.costCurrency === "EUR" ? <span className="text-orange-600">{h.cost.toFixed(2)} EUR</span> : `$${h.cost.toFixed(6)}`}
                            </TableCell>
                            <TableCell className="text-xs">{formatDate(h.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmare ștergere apel ── */}

      {/* ── Dialog: Editare template email ── */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => { if (!open) { setEditingTemplate(null); setPreviewHtml(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-template-title">
              <Mail className="w-5 h-5 text-primary" />
              {editingTemplate?.name}
            </DialogTitle>
            <DialogDescription>{editingTemplate?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Subiect</label>
              <Input
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                data-testid="input-template-subject"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Corp HTML</label>
              <Textarea
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                className="font-mono text-xs min-h-[200px]"
                data-testid="textarea-template-body"
              />
            </div>

            {editingTemplate?.availableVariables && editingTemplate.availableVariables.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Variabile disponibile</label>
                <div className="flex flex-wrap gap-2">
                  {editingTemplate.availableVariables.map((v: any) => (
                    <button
                      key={v.key}
                      type="button"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-mono cursor-pointer bg-muted/50"
                      title={v.description}
                      onClick={() => {
                        const varText = `{{${v.key}}}`;
                        setTemplateBody((prev: string) => prev + varText);
                      }}
                      data-testid={`button-variable-${v.key}`}
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {editingTemplate.availableVariables.map((v: any) => (
                    <div key={v.key}><span className="font-mono font-semibold">{`{{${v.key}}}`}</span> — {v.description}</div>
                  ))}
                </div>
              </div>
            )}

            {previewHtml && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Previzualizare</label>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border rounded-md min-h-[300px]"
                  sandbox=""
                  data-testid="iframe-template-preview"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-wrap gap-2">
            {editingTemplate?.isCustomized && (
              <Button
                variant="outline"
                onClick={() => editingTemplate && resetTemplateMutation.mutate(editingTemplate.slug)}
                disabled={resetTemplateMutation.isPending}
                data-testid="button-template-reset"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                {resetTemplateMutation.isPending ? "Se resetează..." : "Resetare la original"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => editingTemplate && previewTemplateMutation.mutate({ slug: editingTemplate.slug, subject: templateSubject, htmlBody: templateBody })}
              disabled={previewTemplateMutation.isPending}
              data-testid="button-template-preview"
            >
              <Eye className="w-4 h-4 mr-1" />
              {previewTemplateMutation.isPending ? "Se generează..." : "Previzualizare"}
            </Button>
            <Button
              onClick={() => editingTemplate && updateTemplateMutation.mutate({ slug: editingTemplate.slug, subject: templateSubject, htmlBody: templateBody })}
              disabled={updateTemplateMutation.isPending}
              data-testid="button-template-save"
            >
              {updateTemplateMutation.isPending ? "Se salvează..." : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!termeneRawCui} onOpenChange={(open) => { if (!open) { setTermeneRawCui(null); setTermeneRawData(null); } }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Date brute Termene.ro — CUI {termeneRawCui}</DialogTitle>
            <DialogDescription>
              {termeneRawData && (
                <span>
                  Preluat: {formatDate(termeneRawData.fetchedAt)} · Expiră: {formatDate(termeneRawData.expiresAt)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {termeneRawLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : termeneRawData ? (
            <div className="flex-1 overflow-auto">
              <pre className="text-xs bg-muted/50 p-4 rounded-lg font-mono whitespace-pre-wrap break-words" data-testid="text-termene-raw-json">
                {JSON.stringify(termeneRawData.rawData, null, 2)}
              </pre>
            </div>
          ) : null}
          <DialogFooter className="flex gap-2 sm:gap-0">
            {termeneRawData && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(termeneRawData.rawData, null, 2));
                    toast({ title: "Copiat", description: "JSON-ul a fost copiat în clipboard." });
                  }}
                  data-testid="button-copy-termene-json"
                >
                  Copiază JSON
                </Button>
                <Button variant="outline" onClick={handleDownloadTermeneJson} data-testid="button-download-termene-json">
                  <Download className="w-4 h-4 mr-1" /> Descarcă JSON
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => { setTermeneRawCui(null); setTermeneRawData(null); }} data-testid="button-close-termene-raw">
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
