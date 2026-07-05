import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  AlertTriangle,
  MapPin,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface ProjectIdea {
  id: string;
  ideaText: string;
  companyId: string | null;
  createdAt: string;
}

interface IdeaResult {
  fundingCallId: string;
  fundingCallName: string;
  category: string | null;
  maxFunding: number | null;
  deadline: string | null;
  lifecycleStage: string | null;
  opensAt: string | null;
  summary: string | null;
  ideaScore: number;
  geoMatch?: boolean | null;
  passed: boolean | null;
  blockers: string[];
  warnings: string[];
  confidenceLevel: string | null;
}

interface IdeaSearchResponse {
  ideaId: string | null;
  companyId: string | null;
  results: IdeaResult[];
  stats: {
    totalActiveCalls: number;
    rankedCalls: number;
    relevantCalls: number;
    excludedNoEmbedding: number;
    eligibleCalls: number | null;
  };
}

const NO_COMPANY = "__none__";

function scoreColor(score: number): string {
  if (score >= 70) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (score >= 40) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

export default function IdeaSearchPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [ideaText, setIdeaText] = useState("");
  const [companyId, setCompanyId] = useState<string>(NO_COMPANY);
  const [response, setResponse] = useState<IdeaSearchResponse | null>(null);

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: savedIdeas } = useQuery<ProjectIdea[]>({
    queryKey: ["/api/project-ideas"],
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/idea-search", {
        ideaText: ideaText.trim(),
        companyId: companyId === NO_COMPANY ? undefined : companyId,
      });
      return (await res.json()) as IdeaSearchResponse;
    },
    onSuccess: (data) => {
      setResponse(data);
      queryClient.invalidateQueries({ queryKey: ["/api/project-ideas"] });
    },
    onError: (err: any) => {
      toast({
        title: "Căutarea a eșuat",
        description: err?.message || "Te rugăm să încerci din nou.",
        variant: "destructive",
      });
    },
  });

  const deleteIdeaMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/project-ideas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-ideas"] });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (result: IdeaResult) => {
      const res = await apiRequest("POST", "/api/projects", {
        companyId: companyId === NO_COMPANY ? undefined : companyId,
        fundingCallId: result.fundingCallId,
        projectIdeaId: response?.ideaId || undefined,
      });
      return (await res.json()) as { id: string };
    },
    onSuccess: (project) => {
      toast({ title: "Proiect inițiat", description: "Proiectul a fost creat din ideea ta." });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      navigate(`/projects/${project.id}`);
    },
    onError: (err: any) => {
      toast({
        title: "Nu s-a putut crea proiectul",
        description: err?.message || "Te rugăm să încerci din nou.",
        variant: "destructive",
      });
    },
  });

  const ideaTooShort = ideaText.trim().length < 20;
  const hasCompany = companyId !== NO_COMPANY;

  const loadSavedIdea = (idea: ProjectIdea) => {
    setIdeaText(idea.ideaText);
    setCompanyId(idea.companyId || NO_COMPANY);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Lightbulb className="w-6 h-6 text-[hsl(48,100%,45%)]" />
          Găsește finanțare după idee
        </h1>
        <p className="text-muted-foreground text-sm">
          Descrie ideea ta de proiect în cuvintele tale, iar noi îți găsim apelurile de finanțare cele
          mai relevante. Selectează opțional o firmă pentru a verifica și eligibilitatea.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="idea-text">Ideea ta de proiect</Label>
            <Textarea
              id="idea-text"
              data-testid="input-idea-text"
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="Ex: Vreau să dezvolt o aplicație software pentru digitalizarea proceselor din agricultură, cu o componentă de inteligență artificială pentru predicția recoltelor..."
              rows={5}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{ideaText.length}/2000</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="company-select">Firmă (opțional)</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="company-select" data-testid="select-company">
                  <SelectValue placeholder="Fără firmă (doar relevanță tematică)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COMPANY} data-testid="option-no-company">
                    Fără firmă (doar relevanță tematică)
                  </SelectItem>
                  {companies?.map((c) => (
                    <SelectItem key={c.id} value={c.id} data-testid={`option-company-${c.id}`}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => searchMutation.mutate()}
              disabled={ideaTooShort || searchMutation.isPending}
              data-testid="button-search-idea"
              className="sm:w-auto w-full"
            >
              <Search className="w-4 h-4 mr-2" />
              {searchMutation.isPending ? "Se caută..." : "Caută finanțare"}
            </Button>
          </div>
          {ideaTooShort && ideaText.length > 0 && (
            <p className="text-xs text-amber-600" data-testid="text-idea-too-short">
              Descrie ideea în cel puțin 20 de caractere.
            </p>
          )}
        </CardContent>
      </Card>

      {savedIdeas && savedIdeas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              Idei recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {savedIdeas.slice(0, 5).map((idea) => (
              <div
                key={idea.id}
                className="flex items-center gap-2 group"
                data-testid={`row-saved-idea-${idea.id}`}
              >
                <button
                  onClick={() => loadSavedIdea(idea)}
                  className="flex-1 text-left text-sm p-2 rounded-md hover-elevate truncate"
                  data-testid={`button-load-idea-${idea.id}`}
                  title={idea.ideaText}
                >
                  {idea.ideaText}
                </button>
                <button
                  onClick={() => deleteIdeaMutation.mutate(idea.id)}
                  className="p-2 text-muted-foreground hover:text-destructive shrink-0"
                  data-testid={`button-delete-idea-${idea.id}`}
                  title="Șterge ideea"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {searchMutation.isPending && (
        <div className="space-y-3" data-testid="loading-results">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}

      {response && !searchMutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-results-title">
              <Sparkles className="w-5 h-5 text-[hsl(48,100%,45%)]" />
              {response.results.length} apeluri relevante
            </h2>
            <p className="text-xs text-muted-foreground" data-testid="text-results-stats">
              {response.stats.eligibleCalls != null && (
                <span>{response.stats.eligibleCalls} eligibile · </span>
              )}
              {response.stats.rankedCalls} analizate
              {response.stats.excludedNoEmbedding > 0 &&
                ` · ${response.stats.excludedNoEmbedding} neindexate excluse`}
            </p>
          </div>

          {response.results.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground" data-testid="text-no-results">
                Nu am găsit apeluri relevante pentru această idee. Încearcă o descriere mai detaliată.
              </CardContent>
            </Card>
          )}

          {response.results.map((r) => (
            <Card key={r.fundingCallId} data-testid={`card-result-${r.fundingCallId}`}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-semibold leading-tight" data-testid={`text-call-name-${r.fundingCallId}`}>
                      {r.fundingCallName}
                    </h3>
                    {r.category && (
                      <p className="text-xs text-muted-foreground">{r.category}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      className={`${scoreColor(r.ideaScore)}`}
                      data-testid={`badge-score-${r.fundingCallId}`}
                    >
                      {r.ideaScore}% potrivire
                    </Badge>
                    {r.geoMatch === true && (
                      <Badge
                        variant="outline"
                        className="text-green-700 border-green-300 dark:text-green-300 dark:border-green-800"
                        data-testid={`badge-geo-match-${r.fundingCallId}`}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        Regiune potrivită
                      </Badge>
                    )}
                  </div>
                </div>

                {hasCompany && r.passed !== null && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.passed ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" data-testid={`badge-eligible-${r.fundingCallId}`}>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Eligibilă
                      </Badge>
                    ) : (
                      <Badge variant="destructive" data-testid={`badge-ineligible-${r.fundingCallId}`}>
                        <XCircle className="w-3 h-3 mr-1" />
                        Neeligibilă
                      </Badge>
                    )}
                    {r.passed && r.warnings.length > 0 && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {r.warnings.length} {r.warnings.length === 1 ? "atenționare" : "atenționări"}
                      </span>
                    )}
                  </div>
                )}

                {hasCompany && r.passed === false && r.blockers.length > 0 && (
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5" data-testid={`list-blockers-${r.fundingCallId}`}>
                    {r.blockers.slice(0, 3).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}

                {r.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{r.summary}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/funding-calls/${r.fundingCallId}`)}
                    data-testid={`button-view-call-${r.fundingCallId}`}
                  >
                    Vezi apelul
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  {hasCompany && r.passed === true && (
                    <Button
                      size="sm"
                      onClick={() => createProjectMutation.mutate(r)}
                      disabled={createProjectMutation.isPending}
                      data-testid={`button-create-project-${r.fundingCallId}`}
                    >
                      Inițiază proiect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
