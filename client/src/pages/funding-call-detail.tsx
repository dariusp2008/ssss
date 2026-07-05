import { useState, useCallback } from "react";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Calendar, Coins, Users, ExternalLink, FileText,
  Sparkles, Shield, MapPin, Building2, Tag, Clock, Globe,
  ChevronDown, ChevronUp, Download, Landmark, BookOpen,
  Target, Copy, FileDown, AlertTriangle, CheckCircle, XCircle,
  MessageSquare, RefreshCw, Loader2, Database, Zap, Info,
  Pencil, Trash2, FileUp, Upload, File, Settings,
  Layers, Percent, Timer, Banknote,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { stripHtml } from "@/lib/utils";
import { withCallCurrency, isGenuineProjectMax } from "@/lib/funding-currency";
import { LifecycleBadge, type LifecycleStage } from "@/components/lifecycle-badge";
import { LifecycleCountdown, zileRamase } from "@/components/lifecycle-countdown";
import type { FundingCall } from "@shared/schema";
import { getActionCost, CREDIT_ACTION, type CreditCostRow } from "@/lib/credit-costs";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import { ManualDiscoveryCard } from "@/components/manual-discovery-card";
import { ProjectActionButton } from "@/components/project-action-button";
import { useAuth } from "@/hooks/use-auth";

function isExpired(call: FundingCall): boolean {
  if (!call.deadline) return false;
  const target = new Date(call.deadline);
  target.setHours(23, 59, 59, 999);
  return target.getTime() < Date.now();
}

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const diffMs = new Date(deadline).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  // Când termenul a trecut, badge-ul „Expirat" e randat exclusiv de
  // `LifecycleBadge` (sursa autoritativă). Nu randa un al doilea badge aici,
  // altfel apar două badge-uri contradictorii / duplicate.
  if (diffDays < 0) return null;
  if (diffDays <= 7) return <Badge variant="destructive" className="no-default-active-elevate">{zileRamase(diffDays)}</Badge>;
  if (diffDays <= 30) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 no-default-active-elevate">{zileRamase(diffDays)}</Badge>;
  return <Badge variant="secondary" className="no-default-active-elevate">{zileRamase(diffDays)}</Badge>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function IcpMatchSection({ callId, callTitle, callProgram, callDeadline }: { callId: string; callTitle?: string; callProgram?: string | null; callDeadline?: string | null }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useToast();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: matchData, isLoading, refetch, isFetched } = useQuery<any>({
    queryKey: ["/api/funding-calls", callId, "icp-match"],
    enabled: false,
    retry: false,
  });

  const matchMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await fetch(`/api/funding-calls/${callId}/icp-match`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Eroare la verificare");
      }
      return res.json();
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
      const title = err.status === 402 ? "Credite insuficiente" : "Eroare";
      toast({ title, description: err.message, variant: "destructive" });
    },
  });

  const matches = matchMutation.data?.matches || [];

  const scoreColor = (level: string) => {
    if (level === "blocat") return "text-red-800 dark:text-red-300 bg-red-200 dark:bg-red-950/60 border border-red-400";
    if (level === "excelent") return "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-950/40";
    if (level === "partial") return "text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950/40";
    return "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/40";
  };

  const levelLabel = (level: string) => {
    if (level === "blocat") return "NEELIGIBIL";
    if (level === "excelent") return "Potrivire excelentă";
    if (level === "partial") return "Potrivire parțială";
    return "Potrivire slabă";
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">Verificare Companiile Mele vs. ICP</h4>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => matchMutation.mutate()}
          disabled={matchMutation.isPending}
          data-testid="button-icp-match"
        >
          {matchMutation.isPending ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Se verifică...</>
          ) : matchMutation.isSuccess ? (
            <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Reverifică</>
          ) : (
            <><Target className="w-3.5 h-3.5 mr-1.5" />Verifică companiile mele</>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Compară automat companiile tale cu profilul clientului ideal. Fără consum AI — analiza se face pe datele structurate existente.
      </p>

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
        </div>
      )}

      {matchMutation.isSuccess && matches.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{matchMutation.data?.message || "Nu ai companii înregistrate în platformă."}</p>
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={pdfLoading}
              data-testid="button-icp-match-pdf"
              onClick={async () => {
                setPdfLoading(true);
                try {
                  const { exportIcpMatchPDF } = await import("@/lib/export-pdf");
                  await exportIcpMatchPDF(matches, callTitle ? { titlu: callTitle, program: callProgram, deadline: callDeadline } : undefined);
                  toast({ title: "PDF descărcat", description: "Raportul ICP Match a fost generat cu succes." });
                } catch (err: any) {
                  toast({ title: "Eroare", description: "Nu s-a putut genera PDF-ul.", variant: "destructive" });
                } finally {
                  setPdfLoading(false);
                }
              }}
            >
              {pdfLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1.5" />}
              Descarcă PDF
            </Button>
          </div>
          {matches.map((m: any) => (
            <div
              key={m.companyId}
              className="border rounded-lg overflow-hidden"
              data-testid={`icp-match-${m.companyId}`}
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpanded(expanded === m.companyId ? null : m.companyId)}
                data-testid={`icp-match-toggle-${m.companyId}`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${scoreColor(m.level)}`}>
                  {m.score}%
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{m.companyName}</p>
                    <Badge
                      variant={m.eligibility === "blocked" || m.level === "slab" ? "destructive" : m.level === "excelent" ? "default" : "secondary"}
                      className="text-xs no-default-active-elevate shrink-0"
                    >
                      {levelLabel(m.level)}
                    </Badge>
                    {m.eligibility === "blocked" && m.blockers?.length > 0 && (
                      <span className="text-xs text-red-700 dark:text-red-400 font-medium">
                        · {m.blockers.map((b: any) => b.type).join(", ")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    CUI: {m.cui} · CAEN: {m.caen || "—"} · {m.judet || "—"}
                    {m.missingData > 0 && <span className="text-yellow-600 dark:text-yellow-400 ml-2">· {m.missingData} date lipsă</span>}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expanded === m.companyId ? "rotate-180" : ""}`} />
              </div>

              {expanded === m.companyId && (
                <div className="border-t px-3 pb-3 pt-2 space-y-3">
                  {m.eligibility === "blocked" && m.blockers?.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-red-800 dark:text-red-300">Compania nu îndeplinește condițiile eliminatorii ale apelului</p>
                        <ul className="mt-1 space-y-0.5 text-xs text-red-700 dark:text-red-400 list-disc list-inside">
                          {m.blockers.map((b: any, i: number) => (
                            <li key={i}>{b.detail}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Criteriu</TableHead>
                        <TableHead className="w-[80px] text-center">Status</TableHead>
                        <TableHead>Detalii</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {m.criteria.map((c: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium">{c.name}</TableCell>
                          <TableCell className="text-center">
                            {c.met ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : c.detail.startsWith("Date lipsă") ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.detail}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ProspectareTab({ call }: { call: FundingCall & { hasGhid?: boolean } }) {
  const { toast } = useToast();
  const icpData = call.icpData as any;
  const currentVersion = call.currentVersion || 1;
  const isOutdated = icpData && icpData.generated_at_version < currentVersion;
  const [insufficientData, setInsufficientData] = useState(false);
  const [showIcpCreditConfirm, setShowIcpCreditConfirm] = useState(false);
  const { data: creditCosts } = useQuery<CreditCostRow[]>({ queryKey: ["/api/credits/costs"] });
  const icpCost = getActionCost(creditCosts, CREDIT_ACTION.generateIcp, 3);

  const indexMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/funding-calls/${call.id}/index`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", call.id] });
      if (data.sectionsCount === 0) {
        toast({
          title: "Indexare finalizată fără rezultate",
          description: "Nu s-au putut extrage secțiuni din documentația disponibilă. Apelul poate avea documente inaccesibile sau în format nesuportat.",
          variant: "destructive",
        });
      } else {
        setInsufficientData(false);
        toast({
          title: "Indexare completă",
          description: `${data.sectionsCount} secțiuni create din ${data.fromPdf ? "documente" : "text"}.`,
        });
      }
    },
    onError: (err: any) => {
      toast({ title: "Eroare la indexare", description: err?.message || "Nu s-a putut indexa documentația", variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/funding-calls/${call.id}/generate-icp`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setInsufficientData(false);
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", call.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      toast({
        title: data.cached ? "ICP încărcat din cache" : "Profil ICP generat cu succes",
        description: data.cached ? "Profilul exista deja pentru această versiune." : "Profilul Clientului Ideal a fost generat.",
      });
    },
    onError: (err: any) => {
      if (err?.status === 402) {
        toast({ title: "Credite insuficiente", description: err.message, variant: "destructive" });
      } else if (err?.status === 429) {
        toast({ title: "Limită AI atinsă", description: err?.message || "Ai atins limita de operațiuni AI. Încearcă din nou mai târziu.", variant: "destructive" });
      } else if (err?.message?.includes("insuficient") || err?.message?.includes("INSUFFICIENT")) {
        setInsufficientData(true);
      } else {
        toast({ title: "Eroare", description: err?.message || "Eroare la generarea ICP", variant: "destructive" });
      }
    },
  });

  const handleCopyJSON = () => {
    const exportData = {
      call_name: call.name,
      call_id: call.id,
      program: call.program,
      ...icpData,
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast({ title: "JSON copiat", description: "Profilul ICP a fost copiat în clipboard." });
  };

  const handleExportCSV = () => {
    const rows = [
      ["Câmp", "Valoare"],
      ["Apel", call.name],
      ["Program", call.program || "—"],
      ["CAEN-uri ideale", (icpData.eligible_caens || []).join(", ")],
      ["Cifra afaceri min (RON)", icpData.turnover_range?.min || ""],
      ["Cifra afaceri max (RON)", icpData.turnover_range?.max || ""],
      ["Minim angajați", icpData.min_employees || ""],
      ["Regiuni preferate", (icpData.preferred_regions || []).join(", ")],
      ["Vechime minimă (ani)", icpData.min_company_age || ""],
      ["Tipuri beneficiari", (icpData.ideal_beneficiary_types || []).join(", ")],
      ["Criterii excludere", (icpData.exclusion_criteria || []).join("; ")],
      ["Hook formal", icpData.sales_hooks?.formal || ""],
      ["Hook direct", icpData.sales_hooks?.direct || ""],
      ["Hook urgență", icpData.sales_hooks?.urgency || ""],
    ];
    const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ICP-${call.name?.slice(0, 40) || call.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "CSV descărcat", description: "Fișierul ICP a fost descărcat." });
  };

  const handleCopyHook = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiat", description: `Mesajul „${label}" a fost copiat.` });
  };

  if (!icpData || isOutdated) {
    return (
      <div className="space-y-4">
        {isOutdated && (
          <Card className="p-4 border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm text-yellow-800 dark:text-yellow-300">Profil ICP depășit</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Ghidul de finanțare a fost actualizat (versiunea {currentVersion}), dar profilul ICP a fost generat pentru versiunea {icpData.generated_at_version}.
                  Regenerează profilul pentru a reflecta modificările.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-8 text-center space-y-4">
          <Target className="w-12 h-12 text-primary mx-auto opacity-70" />
          <div>
            <h3 className="text-lg font-semibold">Profilul Clientului Ideal (ICP)</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Generează automat profilul companiei care are cele mai mari șanse să câștige acest apel,
              bazat pe criteriile de selecție și punctaj din ghidul de finanțare.
            </p>
          </div>

          {!call.hasGhid || insufficientData ? (
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <AlertTriangle className="w-5 h-5 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {insufficientData
                  ? "Documentația indexată este insuficientă (minim 5 secțiuni necesare). Indexează documentația completă a ghidului, apoi generează profilul."
                  : "Documentația ghidului nu a fost încă indexată. Indexează documentația pentru a putea genera profilul clientului ideal."}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={() => indexMutation.mutate()}
                  disabled={indexMutation.isPending}
                  data-testid="button-index-docs"
                >
                  {indexMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se indexează documentația...</>
                  ) : (
                    <><Database className="w-4 h-4 mr-2" />Indexează documentația</>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="lg"
              onClick={() => setShowIcpCreditConfirm(true)}
              disabled={generateMutation.isPending}
              data-testid="button-generate-icp"
            >
              {generateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se generează profilul...</>
              ) : isOutdated ? (
                <><RefreshCw className="w-4 h-4 mr-2" />Regenerează ICP pentru v{currentVersion} ({icpCost} cr)</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generează Profilul Clientului Ideal ({icpCost} cr)</>
              )}
            </Button>
          )}
        </Card>

        <CreditConfirmDialog
          open={showIcpCreditConfirm}
          onOpenChange={setShowIcpCreditConfirm}
          onConfirm={() => { setShowIcpCreditConfirm(false); generateMutation.mutate(); }}
          actionLabel="Generarea Profilului Clientului Ideal (ICP)"
          creditCost={icpCost}
          isPending={generateMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Profilul Clientului Ideal (ICP)</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs no-default-active-elevate">
            v{icpData.generated_at_version} · {new Date(icpData.generated_at).toLocaleDateString("ro-RO")}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleCopyJSON} data-testid="button-copy-json">
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-csv">
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {icpData.eligible_caens?.length > 0 && (
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Tag className="w-3.5 h-3.5" />
              CAEN-uri ideale
            </div>
            <div className="flex flex-wrap gap-1.5" data-testid="icp-caens">
              {icpData.eligible_caens.map((c: string) => (
                <Badge key={c} variant="outline" className="no-default-active-elevate text-xs font-mono">{c}</Badge>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Coins className="w-3.5 h-3.5" />
            Cifră de afaceri optimă
          </div>
          <p className="text-sm font-semibold" data-testid="icp-turnover">
            {icpData.turnover_range?.min?.toLocaleString("ro-RO")} — {icpData.turnover_range?.max?.toLocaleString("ro-RO")} {icpData.turnover_range?.unit || "RON"}
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Users className="w-3.5 h-3.5" />
            Minim angajați (optim)
          </div>
          <p className="text-2xl font-bold" data-testid="icp-employees">{icpData.min_employees}</p>
        </Card>

        {icpData.preferred_regions?.length > 0 && (
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <MapPin className="w-3.5 h-3.5" />
              Regiuni preferate
            </div>
            <div className="flex flex-wrap gap-1.5" data-testid="icp-regions">
              {icpData.preferred_regions.map((r: string) => (
                <Badge key={r} variant="secondary" className="no-default-active-elevate text-xs">{r}</Badge>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Clock className="w-3.5 h-3.5" />
            Vechime minimă firmă
          </div>
          <p className="text-2xl font-bold" data-testid="icp-company-age">
            {icpData.min_company_age} {icpData.min_company_age === 1 ? "an" : "ani"}
          </p>
        </Card>

        {icpData.ideal_beneficiary_types?.length > 0 && (
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Building2 className="w-3.5 h-3.5" />
              Tipuri ideale de beneficiari
            </div>
            <div className="flex flex-wrap gap-1.5" data-testid="icp-beneficiary-types">
              {icpData.ideal_beneficiary_types.map((bt: string) => (
                <Badge key={bt} variant="secondary" className="no-default-active-elevate text-xs">{bt}</Badge>
              ))}
            </div>
          </Card>
        )}
      </div>

      {icpData.exclusion_criteria?.length > 0 && (
        <Card className="p-4 space-y-2 border-red-200 dark:border-red-900/50">
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-medium">
            <XCircle className="w-3.5 h-3.5" />
            Criterii de excludere — NU aborda aceste firme
          </div>
          <ul className="space-y-1.5" data-testid="icp-exclusions">
            {icpData.exclusion_criteria.map((ex: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-red-400 mt-0.5">✕</span>
                {ex}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {icpData.sales_hooks && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Hook-uri de Vânzare</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            3 variante de mesaje pentru abordarea firmelor care se potrivesc profilului. Click pe buton pentru a copia.
          </p>

          <div className="grid gap-3">
            {[
              { key: "formal", label: "Formal", lucideIcon: "handshake", desc: "Ton profesional, pentru email sau apel oficial" },
              { key: "direct", label: "Direct", lucideIcon: "target", desc: "La obiect, accent pe beneficii concrete" },
              { key: "urgency", label: "Urgenta", lucideIcon: "clock", desc: "Accent pe deadline și oportunitate limitată" },
            ].map(({ key, label, lucideIcon, desc }) => {
              const text = icpData.sales_hooks[key];
              if (!text) return null;
              const IconComp = lucideIcon === "handshake" ? Users : lucideIcon === "target" ? Target : Clock;
              return (
                <div key={key} className="p-4 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComp className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyHook(text, label)}
                      data-testid={`button-copy-hook-${key}`}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copiază
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed italic text-foreground/80">„{text}"</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Separator />

      <IcpMatchSection callId={call.id} callTitle={call.name} callProgram={call.program} callDeadline={call.deadline ? (typeof call.deadline === "string" ? call.deadline : new Date(call.deadline).toISOString()) : null} />

      <AiDisclaimer />

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowIcpCreditConfirm(true)}
          disabled={generateMutation.isPending}
          data-testid="button-regenerate-icp"
        >
          {generateMutation.isPending ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Se regenerează...</>
          ) : (
            <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Regenerează profilul ({icpCost} cr)</>
          )}
        </Button>
      </div>

      <CreditConfirmDialog
        open={showIcpCreditConfirm}
        onOpenChange={setShowIcpCreditConfirm}
        onConfirm={() => { setShowIcpCreditConfirm(false); generateMutation.mutate(); }}
        actionLabel="Generarea Profilului Clientului Ideal (ICP)"
        creditCost={icpCost}
        isPending={generateMutation.isPending}
      />
    </div>
  );
}

export default function FundingCallDetailPage() {
  const [, params] = useRoute("/funding-calls/:id");
  const callId = params?.id;
  const [openSectionKeys, setOpenSectionKeys] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const goBackToCatalog = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/funding-calls");
    }
  }, [setLocation]);

  const { data: call, isLoading } = useQuery<FundingCall & { hasGhid?: boolean; hasDocs?: boolean }>({
    queryKey: ["/api/funding-calls", callId],
    enabled: !!callId,
  });

  const { data: callDocuments } = useQuery<any[]>({
    queryKey: ["/api/funding-calls", callId, "documents"],
    enabled: !!callId,
  });

  const { data: adminCheck } = useQuery<{ isSuperAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });
  const isSuperAdmin = adminCheck?.isSuperAdmin === true;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showGuidesDialog, setShowGuidesDialog] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [uploadingGuide, setUploadingGuide] = useState(false);
  const [guideUploadProgress, setGuideUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [reclassifyPending, setReclassifyPending] = useState(false);

  const { data: guidesData, isLoading: guidesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/funding-calls", callId, "guides"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/funding-calls/${callId}/guides`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!callId && showGuidesDialog && isSuperAdmin,
  });

  const [docToDelete, setDocToDelete] = useState<{ idx: number; name: string } | null>(null);

  const deleteSourceDocMutation = useMutation({
    mutationFn: async ({ idx, name }: { idx: number; name: string }) => {
      const params = new URLSearchParams();
      if (name) params.set("fileName", name);
      const res = await apiRequest("DELETE", `/api/admin/funding-calls/${callId}/source-doc/${idx}?${params.toString()}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", callId] });
      toast({ title: "Document șters", description: "Documentul a fost eliminat din listă." });
      setDocToDelete(null);
    },
    onError: (err: any) => toast({ title: "Eroare", description: err.message, variant: "destructive" }),
  });

  const reindexMutation = useMutation({
    mutationFn: async (apelId: string) => {
      const res = await apiRequest("POST", `/api/admin/rag-reindex/${apelId}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", callId] });
      toast({ title: "Re-indexare completă", description: `${data.sectionsCount} secțiuni create.` });
    },
    onError: (err: any) => toast({ title: "Eroare la re-indexare", description: err.message, variant: "destructive" }),
  });

  const regenerateAiMutation = useMutation({
    mutationFn: async (apelId: string) => {
      const res = await apiRequest("POST", `/api/admin/funding-calls/${apelId}/regenerate-ai`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", callId] });
      toast({ title: "Campuri AI regenerate", description: data.message });
    },
    onError: (err: any) => toast({ title: "Eroare la regenerare AI", description: err.message, variant: "destructive" }),
  });

  const revalidateDataMutation = useMutation({
    mutationFn: async (apelId: string) => {
      const res = await apiRequest("POST", `/api/admin/funding-calls/${apelId}/revalidate-data`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", callId] });
      const msg = data.currencyInferred
        ? `${data.issuesFound} probleme găsite. Valuta a fost dedusă automat.`
        : `${data.issuesFound} probleme găsite.`;
      toast({ title: "Revalidare completă", description: msg });
    },
    onError: (err: any) => toast({ title: "Eroare la revalidare", description: err.message, variant: "destructive" }),
  });

  const deleteCallMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/funding-calls/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
      toast({ title: "Apel șters", description: "Apelul și toate secțiunile asociate au fost șterse." });
      setLocation("/funding-calls");
    },
    onError: (err: any) => toast({ title: "Eroare", description: err.message, variant: "destructive" }),
  });

  const updateCallMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/admin/funding-calls/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", callId] });
      setShowEditDialog(false);
      toast({ title: "Apel actualizat", description: "Modificările au fost salvate cu succes." });
    },
    onError: (err: any) => toast({ title: "Eroare", description: err.message, variant: "destructive" }),
  });

  const uploadGuideMutation = useMutation({
    mutationFn: async ({ cId, file }: { cId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/funding-calls/${cId}/guides`, { method: "POST", credentials: "include", body: formData });
      if (!res.ok) { const err = await res.json().catch(() => ({ message: "Eroare la încărcare" })); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", callId, "guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", callId] });
      setUploadingGuide(false);
      toast({ title: "Ghid încărcat", description: data.message || `${data.sections_created || 0} secțiuni indexate.` });
    },
    onError: (err: any) => { setUploadingGuide(false); toast({ title: "Eroare la încărcare", description: err.message, variant: "destructive" }); },
  });

  const deleteGuideMutation = useMutation({
    mutationFn: async ({ cId, guideId }: { cId: string; guideId: string }) => {
      const res = await apiRequest("DELETE", `/api/admin/funding-calls/${cId}/guides/${guideId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", callId, "guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", callId] });
      toast({ title: "Document șters" });
    },
    onError: (err: any) => toast({ title: "Eroare", description: err.message, variant: "destructive" }),
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ cId, files }: { cId: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      const res = await fetch(`/api/admin/funding-calls/${cId}/attachments`, { method: "POST", credentials: "include", body: formData });
      if (!res.ok) { const err = await res.json().catch(() => ({ message: "Eroare la încărcare" })); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", callId, "guides"] });
      setUploadingAttachment(false);
      toast({ title: "Documente atașate", description: data.message || "Documentele au fost încărcate." });
    },
    onError: (err: any) => { setUploadingAttachment(false); toast({ title: "Eroare", description: err.message, variant: "destructive" }); },
  });

  const openEditDialog = useCallback((c: FundingCall) => {
    setEditForm({
      name: c.name || "", program: c.program || "", description: c.description || "",
      summary: (c as any).summary || "", category: c.category || "", status: c.status || "active",
      deadline: c.deadline ? new Date(c.deadline).toISOString().slice(0, 16) : "",
      maxFunding: c.maxFunding ?? "", minEmployees: c.minEmployees ?? "",
      minRevenue: c.minRevenue ?? "", minCompanyAge: (c as any).minCompanyAge ?? "",
      requiresProfit: (c as any).requiresProfit || false,
      eligibleCaen: (c.eligibleCaen || []).join(", "),
      eligibleRegions: (c.eligibleRegions || []).join(", "),
      beneficiaryTypes: (c.beneficiaryTypes || []).join(", "),
      eligibleSizeCategories: ((c as any).eligibleSizeCategories || []).join(", "),
      sourceUrl: c.sourceUrl || "", bugetUe: (c as any).bugetUe || "", bugetNational: (c as any).bugetNational || "", moneda: (c as any).moneda || "", monedaUe: (c as any).monedaUe || (c as any).moneda || "", monedaNational: (c as any).monedaNational || (c as any).moneda || "", monedaMaxFunding: (c as any).monedaMaxFunding || "", dataLimita: (c as any).dataLimita || "",
      detailsSections: (c as any).detailsSections || {},
    });
    setShowEditDialog(true);
  }, []);

  const handleSaveCall = () => {
    if (!callId) return;
    const data: Record<string, any> = { ...editForm };
    for (const key of ["eligibleCaen", "eligibleRegions", "beneficiaryTypes", "eligibleSizeCategories"]) {
      if (typeof data[key] === "string") data[key] = data[key].split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    if (data.maxFunding === "") data.maxFunding = null;
    if (data.minEmployees === "") data.minEmployees = null;
    if (data.minRevenue === "") data.minRevenue = null;
    if (data.minCompanyAge === "") data.minCompanyAge = null;
    if (data.deadline === "") data.deadline = null;
    if (!data.monedaUe && data.bugetUe) data.monedaUe = "EUR";
    if (!data.monedaNational && data.bugetNational) data.monedaNational = "RON";
    if (!data.bugetNational) { data.bugetNational = null; data.monedaNational = data.monedaUe || "EUR"; }
    updateCallMutation.mutate({ id: callId, data });
  };

  const handleGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !callId) return;

    const fileList = Array.from(files);
    e.target.value = "";
    setUploadingGuide(true);
    setGuideUploadProgress({ current: 0, total: fileList.length });

    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < fileList.length; i++) {
      setGuideUploadProgress({ current: i + 1, total: fileList.length });
      try {
        const formData = new FormData();
        formData.append("file", fileList[i]);
        const res = await fetch(`/api/admin/funding-calls/${callId}/guides`, {
          method: "POST", credentials: "include", body: formData
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Eroare" }));
          throw new Error(err.message);
        }
        successCount++;
      } catch (err: any) {
        failCount++;
        console.warn(`Upload failed for ${fileList[i].name}: ${err.message}`);
      }
    }

    setUploadingGuide(false);
    setGuideUploadProgress(null);
    queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", callId, "guides"] });
    queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", callId] });

    if (failCount === 0) {
      toast({ title: `${successCount} ${successCount === 1 ? "fișier încărcat" : "fișiere încărcate"}`, description: "Analiza AI rulează în fundal." });
    } else {
      toast({ title: `${successCount} încărcate, ${failCount} eșuate`, description: "Unele fișiere nu au putut fi încărcate.", variant: "destructive" });
    }
  };

  const handleAttachmentUpload = (e: any) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !callId) return;
    setUploadingAttachment(true);
    uploadAttachmentMutation.mutate({ cId: callId, files: Array.from(fileList) });
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center space-y-4 mt-12">
        <Landmark className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-semibold">Apelul nu a fost găsit</h2>
        <Button variant="outline" onClick={goBackToCatalog} data-testid="button-back-to-calls">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Înapoi la catalog
        </Button>
      </div>
    );
  }

  const expired = isExpired(call);
  const sections = call.detailsSections as Record<string, string> | null;
  const sectionLabelMap: Record<string, string> = {
    informatii_generale: "Informatii generale",
    detalii: "Detalii",
    buget: "Buget",
    buget_alocat: "Buget alocat",
    calendar: "Calendar si termene",
    info_suplimentare: "Informatii suplimentare",
  };
  const formatSectionKey = (key: string) =>
    sectionLabelMap[key] || key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const sourceDocs = Array.isArray(call.sourceDocuments) ? call.sourceDocuments as any[] : [];
  const guideMap = (call as any).guideMap as Record<string, string> | undefined;
  const sectionEntries = sections ? Object.entries(sections).filter(([, v]) => typeof v === "string" && v.length > 0) : [];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-10 sm:w-10" onClick={goBackToCatalog} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-serif font-bold tracking-tight leading-snug" data-testid="text-call-title">
            {call.name}
          </h1>
          {call.program && (
            <p className="text-xs sm:text-sm text-primary font-medium mt-0.5">{call.program}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {/* Task #68: lifecycle badge înlocuiește perechea binară Activ/Expirat. */}
        <LifecycleBadge
          callId={call.id}
          stage={(call as any).lifecycleStage as LifecycleStage | null | undefined}
          opensAt={(call as any).openDate as string | null | undefined}
          deadline={call.deadline as unknown as string | null | undefined}
        />
        {call.category && <Badge variant="secondary" className="no-default-active-elevate">{call.category}</Badge>}
        {call.source && call.source.trim().toUpperCase() !== "RO" && <Badge variant="outline" className="no-default-active-elevate">Sursă: {call.source}</Badge>}
        {call.externalId && <Badge variant="outline" className="no-default-active-elevate text-xs">ID: {call.externalId}</Badge>}
        {/* Task #68: pentru stage=urmeaza arătăm countdown la deschidere, nu la deadline. */}
        {(call as any).lifecycleStage === "urmeaza" && (call as any).openDate ? (
          <LifecycleCountdown
            callId={call.id}
            lifecycleStage="urmeaza"
            openDate={(call as any).openDate as string}
          />
        ) : call.deadline ? (
          <DeadlineCountdown deadline={call.deadline as unknown as string} />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Link href={`/eligibility?callId=${call.id}`}>
          <Button size="sm" className="sm:h-10 sm:px-4 sm:text-sm" data-testid="button-check-eligibility">
            <Shield className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1.5 sm:mr-2" />
            Verifică eligibilitatea
          </Button>
        </Link>
        <ProjectActionButton fundingCallId={call.id} size="sm" variant="secondary" className="sm:h-10 sm:px-4 sm:text-sm" />
        {call.sourceUrl && (
          <a href={call.sourceUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="sm:h-10 sm:px-4 sm:text-sm" data-testid="button-source-url">
              <ExternalLink className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Pagina oficială</span>
              <span className="sm:hidden">Oficial</span>
            </Button>
          </a>
        )}
      </div>

      {isSuperAdmin && callId && (
        <Card className="p-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800" data-testid="admin-actions-panel">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Actiuni admin</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => reindexMutation.mutate(callId)} disabled={reindexMutation.isPending} data-testid="button-admin-reindex">
              {reindexMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Database className="w-3.5 h-3.5 mr-1.5" />}
              Re-indexare AI
            </Button>
            <Button variant="outline" size="sm" onClick={() => regenerateAiMutation.mutate(callId)} disabled={regenerateAiMutation.isPending} data-testid="button-admin-regenerate">
              {regenerateAiMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Regenerare AI
            </Button>
            <Button variant="outline" size="sm" onClick={() => call && openEditDialog(call)} data-testid="button-admin-edit">
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Editare
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowGuidesDialog(true)} data-testid="button-admin-guides">
              <FileUp className="w-3.5 h-3.5 mr-1.5" />
              Ghiduri si anexe
            </Button>
            <Button variant="outline" size="sm" onClick={() => revalidateDataMutation.mutate(callId)} disabled={revalidateDataMutation.isPending} data-testid="button-admin-revalidate">
              {revalidateDataMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Shield className="w-3.5 h-3.5 mr-1.5" />}
              Revalidare date
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setShowDeleteDialog(true)} data-testid="button-admin-delete">
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Șterge apelul
            </Button>
          </div>
        </Card>
      )}

      {isSuperAdmin && call && Array.isArray((call as any).dataQualityIssues) && (call as any).dataQualityIssues.length > 0 && (
        <Card className="p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800" data-testid="data-quality-issues-panel">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Probleme calitate date ({(call as any).dataQualityIssues.length})</span>
          </div>
          <div className="space-y-1">
            {(call as any).dataQualityIssues.map((issue: any, idx: number) => (
              <div key={idx} className={`text-xs flex items-start gap-1.5 ${issue.severity === "error" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${issue.severity === "error" ? "bg-red-500" : "bg-amber-500"}`} />
                <span><strong>{issue.field}:</strong> {issue.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs defaultValue="details">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="details" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-details">
            <BookOpen className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1 sm:mr-1.5" />
            Detalii
          </TabsTrigger>
          <TabsTrigger value="prospectare" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-prospectare">
            <Target className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1 sm:mr-1.5" />
            <span className="hidden sm:inline">Prospectare & Sales</span>
            <span className="sm:hidden">Prospectare</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isGenuineProjectMax(call as any) && call.maxFunding != null && (
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Coins className="w-3.5 h-3.5" />
                  Maxim/proiect
                </div>
                <p className="text-lg font-bold" data-testid="text-max-funding">
                  {withCallCurrency(call.maxFunding.toLocaleString("ro-RO"), call as any)}
                </p>
              </Card>
            )}
            {call.bugetUe && (
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />
                  Anvelopă program (UE)
                </div>
                <p className="text-lg font-bold" data-testid="text-budget-ue">{withCallCurrency(Number(call.bugetUe) ? Number(call.bugetUe).toLocaleString("ro-RO") : String(call.bugetUe), call as any)}</p>
              </Card>
            )}
            {(call as any).bugetNational && (
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />
                  Anvelopă program (național)
                </div>
                <p className="text-lg font-bold" data-testid="text-budget-national">{withCallCurrency(Number((call as any).bugetNational) ? Number((call as any).bugetNational).toLocaleString("ro-RO") : String((call as any).bugetNational), call as any)}</p>
              </Card>
            )}
            {call.deadline && (
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Termen limită
                </div>
                <p className="text-lg font-bold" data-testid="text-deadline">
                  {new Date(call.deadline).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </Card>
            )}
            {call.dataLimita && !call.deadline && (
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Termen limită
                </div>
                <p className="text-lg font-bold">{call.dataLimita}</p>
              </Card>
            )}
            {call.minEmployees != null && call.minEmployees > 0 && (
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  Angajați minimi
                </div>
                <p className="text-lg font-bold" data-testid="text-min-employees">{call.minEmployees}</p>
              </Card>
            )}
            {call.minRevenue != null && call.minRevenue > 0 && (
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Coins className="w-3.5 h-3.5" />
                  Cifra de afaceri minimă
                </div>
                <p className="text-lg font-bold" data-testid="text-min-revenue">
                  {call.minRevenue.toLocaleString("ro-RO")} RON
                </p>
              </Card>
            )}
            {/* Task #76 (NEW-E.5) — Structural Phase v2 surfaced ca eligibility cards.
                Toate sunt conditional pe valoare non-null (NU randăm "—" sau "0"
                pentru câmpuri lipsă — vezi gotcha din replit.md). */}
            {((call as any).minTrl != null || (call as any).maxTrl != null) && (
              <Card className="p-4 space-y-1" data-testid="card-trl-band">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Layers className="w-3.5 h-3.5" />
                  TRL acceptat
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex" aria-label="Ce înseamnă TRL?">
                          <Info className="w-3 h-3 text-muted-foreground/70" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[260px]">
                        <p className="text-xs">
                          <span className="font-medium">TRL (Technology Readiness Level)</span> — scală 1-9 a maturității unei tehnologii: 1 = principiu observat, 9 = sistem dovedit operațional. Apelurile orientate pe cercetare cer TRL mic, cele de scale-up TRL mare.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-lg font-bold" data-testid="text-trl-band">
                  {(() => {
                    const minT = (call as any).minTrl;
                    const maxT = (call as any).maxTrl;
                    if (minT != null && maxT != null) return minT === maxT ? `TRL ${minT}` : `TRL ${minT}–${maxT}`;
                    if (minT != null) return `TRL ≥ ${minT}`;
                    return `TRL ≤ ${maxT}`;
                  })()}
                </p>
              </Card>
            )}
            {((call as any).projectMinValue != null || (call as any).projectMaxValue != null) && (
              <Card className="p-4 space-y-1" data-testid="card-project-value">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Banknote className="w-3.5 h-3.5" />
                  Buget per proiect
                </div>
                <p className="text-lg font-bold" data-testid="text-project-value">
                  {(() => {
                    const minV = (call as any).projectMinValue as number | null;
                    const maxV = (call as any).projectMaxValue as number | null;
                    // Currency may be NULL — NU fabricăm „EUR" implicit (rule din replit.md).
                    const curRaw = (call as any).projectValueCurrency as string | null;
                    const cur = curRaw ? ` ${curRaw}` : "";
                    const fmt = (n: number) => n.toLocaleString("ro-RO");
                    if (minV != null && maxV != null) return `${fmt(minV)} – ${fmt(maxV)}${cur}`;
                    if (minV != null) return `≥ ${fmt(minV)}${cur}`;
                    return `≤ ${fmt(maxV as number)}${cur}`;
                  })()}
                </p>
              </Card>
            )}
            {(call as any).cofinancingRate != null && (
              <Card className="p-4 space-y-1" data-testid="card-cofinancing-rate">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Percent className="w-3.5 h-3.5" />
                  Rata maximă ajutor
                </div>
                <p className="text-lg font-bold" data-testid="text-cofinancing-rate">
                  {Math.round(Number((call as any).cofinancingRate))}%
                </p>
                {Number((call as any).cofinancingRate) < 100 && (
                  <p className="text-[11px] text-muted-foreground" data-testid="text-cofinancing-own">
                    Contribuția ta minimă: {100 - Math.round(Number((call as any).cofinancingRate))}%
                  </p>
                )}
              </Card>
            )}
            {(call as any).projectDurationMonths != null && (
              <Card className="p-4 space-y-1" data-testid="card-project-duration">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Timer className="w-3.5 h-3.5" />
                  Durată maximă implementare
                </div>
                <p className="text-lg font-bold" data-testid="text-project-duration">
                  {(call as any).projectDurationMonths} luni
                </p>
              </Card>
            )}
          </div>

          {(call as any).summary && (
            <Card className="p-5 space-y-2 bg-[hsl(48,100%,50%)]/5 border-[hsl(48,100%,50%)]/20">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-[hsl(48,100%,45%)]" />
                Rezumat AI
              </div>
              <p className="text-sm whitespace-pre-line leading-relaxed" data-testid="text-ai-summary">
                {stripHtml((call as any).summary)}
              </p>
              <AiDisclaimer compact />
            </Card>
          )}

          {call.description && (
            <Card className="p-5 space-y-2">
              <p className="text-sm font-medium">Descriere</p>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-description">
                {stripHtml(call.description)}
              </p>
            </Card>
          )}

          {(call.eligibleCaen?.length || call.beneficiaryTypes?.length || call.eligibleRegions?.length) && (
            <Card className="p-5 space-y-4">
              <p className="text-sm font-medium">Criterii de eligibilitate</p>

              {call.beneficiaryTypes && call.beneficiaryTypes.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5" />
                    Tipuri de beneficiari eligibili
                  </div>
                  <div className="flex flex-wrap gap-1.5" data-testid="list-beneficiary-types">
                    {call.beneficiaryTypes.map((bt) => (
                      <Badge key={bt} variant="secondary" className="no-default-active-elevate text-xs">{bt}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {call.eligibleCaen && call.eligibleCaen.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Tag className="w-3.5 h-3.5" />
                    Coduri CAEN eligibile ({call.eligibleCaen.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5" data-testid="list-caen-codes">
                    {call.eligibleCaen.slice(0, 30).map((caen) => (
                      <Badge key={caen} variant="outline" className="no-default-active-elevate text-xs font-mono">{caen}</Badge>
                    ))}
                    {call.eligibleCaen.length > 30 && (
                      <Badge variant="outline" className="no-default-active-elevate text-xs">+{call.eligibleCaen.length - 30} altele</Badge>
                    )}
                  </div>
                </div>
              )}

              {call.eligibleRegions && call.eligibleRegions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    Regiuni eligibile
                  </div>
                  <div className="flex flex-wrap gap-1.5" data-testid="list-eligible-regions">
                    {call.eligibleRegions.map((r) => (
                      <Badge key={r} variant="secondary" className="no-default-active-elevate text-xs">{r}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {sectionEntries.length > 0 && (() => {
            const allSectionKeys = sectionEntries.map(([key]) => key);
            const allOpen = allSectionKeys.length > 0 && allSectionKeys.every((key) => openSectionKeys.includes(key));
            return (
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Secțiuni detaliate ({sectionEntries.length})</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenSectionKeys(allOpen ? [] : allSectionKeys)}
                  data-testid="button-toggle-sections"
                >
                  {allOpen ? (
                    <><ChevronUp className="w-4 h-4 mr-1" />Restrânge tot</>
                  ) : (
                    <><ChevronDown className="w-4 h-4 mr-1" />Extinde toate</>
                  )}
                </Button>
              </div>
              <Accordion
                type="multiple"
                value={openSectionKeys}
                onValueChange={setOpenSectionKeys}
                className="space-y-2"
              >
                {sectionEntries.map(([key, value]) => (
                  <AccordionItem
                    key={key}
                    value={key}
                    className="border rounded-md px-3"
                    data-testid={`section-item-${key}`}
                  >
                    <AccordionTrigger
                      className="py-3 text-xs font-medium text-primary hover:no-underline gap-2"
                      data-testid={`section-trigger-${key}`}
                    >
                      <span className="flex items-center gap-2 text-left">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        {formatSectionKey(key)}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent data-testid={`section-content-${key}`}>
                      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{stripHtml(value)}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
            );
          })()}

          {(() => {
            const hasGhid = (call as any).hasGhid === true;
            if (hasGhid) return null;
            const isGuideClassified = sourceDocs.some((d: any) => (d.doc_group || d.docGroup) === "ghid_apel") ||
              (guideMap && Object.keys(guideMap).length > 0);
            if (sourceDocs.length > 0 && isSuperAdmin && !isGuideClassified) {
              return (
                <Card className="p-4 border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800 dark:text-yellow-300">Ghidul solicitantului nu este clasificat</p>
                      <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-0.5">
                        Niciun document nu a fost clasificat ca "Ghid apel". Reclasifică documentele sau încarcă ghidul manual.
                      </p>
                    </div>
                  </div>
                </Card>
              );
            }
            if (sourceDocs.length > 0 && !isSuperAdmin) {
              return (
                <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Ghidul oficial este disponibil în „Documente oficiale" mai jos, dar nu a fost încă indexat pentru analiza AI.
                    </p>
                  </div>
                </Card>
              );
            }
            return null;
          })()}

          {sourceDocs.length > 0 && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Documente oficiale ({sourceDocs.length})
                  {(() => {
                    const localCount = sourceDocs.filter((d: any) => d.local_file_available || d.localFileAvailable).length;
                    return localCount > 0 ? <span className="text-green-600 ml-2 text-xs font-normal">{localCount} disponibile local</span> : null;
                  })()}
                </p>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      disabled={reclassifyPending}
                      onClick={() => {
                        if (reclassifyPending) return;
                        setReclassifyPending(true);
                        apiRequest("POST", `/api/admin/funding-calls/${callId}/source-documents/reclassify`)
                          .then(async (res) => {
                            const data = await res.json().catch(() => ({}));
                            if (data?.async) {
                              const mins = Math.ceil((data.estimatedSeconds || 60) / 60);
                              toast({
                                title: "Reclasificare pornita in fundal",
                                description: `${data.docsCount} documente, ~${mins} min. Vei primi notificare la finalizare.`,
                              });
                            } else {
                              queryClient.invalidateQueries({ queryKey: ["/api/funding-calls", callId] });
                              toast({
                                title: "Reclasificare finalizata",
                                description: data?.classified != null ? `${data.classified} documente reclasificate (${data.errors || 0} erori).` : undefined,
                              });
                            }
                          })
                          .catch((err: any) => {
                            if (err?.status === 409) {
                              toast({ title: "Reclasificare deja in curs", description: err?.message || "Asteapta finalizarea jobului anterior." });
                            } else {
                              toast({ title: "Eroare la reclasificare", description: err?.message, variant: "destructive" });
                            }
                          })
                          .finally(() => setReclassifyPending(false));
                      }}
                      data-testid="button-reclassify-docs"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${reclassifyPending ? "animate-pulse" : ""}`} />
                      {reclassifyPending ? "Se procesează..." : "Reclasifică AI"}
                    </Button>
                  )}
                  {call.sourceUrl && (
                    <a href={call.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="text-xs gap-1.5" data-testid="button-view-source-page">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Pagina oficială
                      </Button>
                    </a>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {(() => {
                  const groupLabels: Record<string, string> = {
                    ghid_apel: "Ghiduri apel",
                    ghid_consultare: "Ghiduri in consultare",
                    ghid_inactiv: "Ghiduri inactive",
                    anexa_eligibilitate: "Anexe eligibilitate",
                    anexa_tehnica: "Anexe tehnice",
                    corrigendum: "Corrigendum-uri / Erate",
                    model_documente: "Modele documente",
                    arhive: "Arhive",
                    alte_documente: "Alte documente",
                  };
                  const groupOrder = ["ghid_apel", "ghid_consultare", "corrigendum", "arhive", "anexa_eligibilitate", "anexa_tehnica", "model_documente", "ghid_inactiv", "alte_documente"];
                  const normalizeDocGroup = (raw: unknown): string | null => {
                    if (!raw || typeof raw !== "string") return null;
                    const v = raw.trim().toLowerCase();
                    if (!v) return null;
                    if (groupLabels[v]) return v;
                    const enMap: Record<string, string> = {
                      guide: "ghid_apel",
                      annex: "anexa_eligibilitate",
                      form: "model_documente",
                      archive: "arhive",
                      supporting: "alte_documente",
                    };
                    return enMap[v] || null;
                  };
                  const grouped: Record<string, any[]> = {};
                  const ungrouped: any[] = [];
                  for (const doc of sourceDocs) {
                    const g = normalizeDocGroup(doc.doc_group || doc.docGroup);
                    if (g && groupLabels[g]) {
                      if (!grouped[g]) grouped[g] = [];
                      grouped[g].push(doc);
                    } else {
                      ungrouped.push(doc);
                    }
                  }
                  if (ungrouped.length > 0) {
                    if (!grouped["alte_documente"]) grouped["alte_documente"] = [];
                    grouped["alte_documente"].push(...ungrouped);
                  }
                  const hasAnyGroup = Object.keys(grouped).length > 1 || (Object.keys(grouped).length === 1 && !grouped["alte_documente"]);
                  const formatBytes = (bytes: number) => {
                    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
                    if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`;
                    return `${bytes} B`;
                  };
                  const getExtChip = (name: string) => {
                    const m = name.match(/\.([a-z0-9]{2,5})$/i);
                    return m ? m[1].toUpperCase() : "";
                  };
                  const renderDoc = (doc: any, idx: number) => {
                    const docUrl = doc.source_url || doc.url || doc.link || doc.download_url || null;
                    const rawDisplay = doc.display_name || doc.displayName || "";
                    const originalName = doc.file_name || doc.fileName || "";
                    const docName = rawDisplay || originalName || `Document ${idx + 1}`;
                    const localGuideId = doc.guide_id || (guideMap && originalName ? guideMap[originalName] : null);
                    const localHref = (doc.local_file_available || doc.localFileAvailable) && doc.id && callId
                      ? `/api/funding-calls/${callId}/source-documents/${doc.id}/download`
                      : (localGuideId ? `/api/funding-call-documents/${localGuideId}/download` : null);
                    const hasLocalFile = !!localHref;
                    const primaryHref = localHref || docUrl || (call.sourceUrl ?? null);
                    const isLocalPrimary = !!localHref;
                    const isExternalPrimary = !isLocalPrimary && !!primaryHref;
                    const ext = getExtChip(originalName);
                    const sizeLabel = doc.file_size ? formatBytes(doc.file_size) : null;

                    const primaryTestId = isLocalPrimary
                      ? `button-download-local-doc-${idx}`
                      : (docUrl ? `button-external-doc-${idx}` : `button-source-doc-${idx}`);

                    const RowContent = (
                      <>
                        {isLocalPrimary ? (
                          <Download className="w-4 h-4 shrink-0 text-green-600" />
                        ) : isExternalPrimary ? (
                          <ExternalLink className="w-4 h-4 shrink-0 text-blue-600" />
                        ) : (
                          <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium truncate ${primaryHref ? "text-foreground group-hover:text-primary group-hover:underline underline-offset-2" : ""}`}
                            title={originalName}
                          >
                            {docName}
                          </p>
                          <div className="flex items-center flex-wrap gap-2 mt-1 text-xs">
                            {hasLocalFile ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 font-medium">
                                Disponibil local
                              </span>
                            ) : (docUrl || call.sourceUrl) ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-medium">
                                Sursă externă
                              </span>
                            ) : null}
                            {ext && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono text-[10px] tracking-wide">
                                {ext}
                              </span>
                            )}
                            {sizeLabel && <span className="text-muted-foreground">{sizeLabel}</span>}
                          </div>
                        </div>
                      </>
                    );

                    return (
                      <div
                        key={doc.id || idx}
                        className={`group flex items-stretch rounded-lg bg-muted/40 hover:bg-muted transition-colors ${primaryHref ? "cursor-pointer" : ""}`}
                      >
                        {isLocalPrimary && primaryHref ? (
                          <a
                            href={primaryHref}
                            className="flex flex-1 items-center gap-3 p-2.5 min-w-0 cursor-pointer"
                            data-testid={primaryTestId}
                          >
                            {RowContent}
                          </a>
                        ) : primaryHref ? (
                          <a
                            href={primaryHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-1 items-center gap-3 p-2.5 min-w-0 cursor-pointer"
                            data-testid={primaryTestId}
                          >
                            {RowContent}
                          </a>
                        ) : (
                          <div className="flex flex-1 items-center gap-3 p-2.5 min-w-0">
                            {RowContent}
                          </div>
                        )}
                        <div className="flex items-center gap-1 shrink-0 pr-2">
                          {isLocalPrimary && docUrl && (
                            <a href={docUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="text-muted-foreground" title="Vezi pe site-ul oficial" data-testid={`button-external-doc-${idx}`}>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                          )}
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setDocToDelete({ idx: sourceDocs.indexOf(doc), name: originalName || `Document ${idx + 1}` })}
                              data-testid={`button-delete-source-doc-${idx}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  };
                  if (hasAnyGroup) {
                    return groupOrder
                      .filter(g => grouped[g] && grouped[g].length > 0)
                      .map(g => (
                        <div key={g}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{groupLabels[g]}</p>
                          <div className="space-y-1.5">
                            {grouped[g].map((doc: any, idx: number) => renderDoc(doc, idx))}
                          </div>
                        </div>
                      ));
                  }
                  return sourceDocs.map((doc: any, idx: number) => renderDoc(doc, idx));
                })()}
              </div>
            </Card>
          )}

          {callDocuments && callDocuments.length > 0 && (() => {
            const guides = callDocuments.filter((d: any) => d.doc_type !== "attachment");
            const attachments = callDocuments.filter((d: any) => d.doc_type === "attachment");
            const getFileStyle = (ft: string) => {
              const t = (ft || "").toLowerCase();
              if (t === "pdf") return { label: "PDF", color: "text-red-600 bg-red-50 dark:bg-red-950/30" };
              if (t === "doc" || t === "docx") return { label: "DOC", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" };
              if (t === "xls" || t === "xlsx") return { label: "XLS", color: "text-green-600 bg-green-50 dark:bg-green-950/30" };
              if (t === "ppt" || t === "pptx") return { label: "PPT", color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" };
              return { label: t.toUpperCase() || "FILE", color: "text-gray-600 bg-gray-50 dark:bg-gray-800" };
            };
            const renderDoc = (d: any) => {
              const style = getFileStyle(d.file_type);
              return (
                <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50" data-testid={`doc-row-${d.id}`}>
                  <div className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${style.color}`}>{style.label}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{d.original_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{d.file_size ? d.file_size > 1024 * 1024 ? `${(d.file_size / 1024 / 1024).toFixed(1)} MB` : `${(d.file_size / 1024).toFixed(0)} KB` : ""}</span>
                      {d.created_at && <span>{new Date(d.created_at).toLocaleDateString("ro-RO")}</span>}
                    </div>
                  </div>
                  <a href={`/api/funding-call-documents/${d.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="shrink-0" data-testid={`button-download-call-doc-${d.id}`}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </div>
              );
            };
            return (
              <Card className="p-5 space-y-4">
                {guides.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">Ghiduri de finanțare ({guides.length})</p>
                    </div>
                    {guides.map(renderDoc)}
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {guides.length > 0 && <Separator />}
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-medium">Documente atașate ({attachments.length})</p>
                    </div>
                    {attachments.map(renderDoc)}
                  </div>
                )}
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="prospectare" className="mt-4">
          <ProspectareTab call={call} />
        </TabsContent>
      </Tabs>

      {user?.role === "super_admin" && callId && (
        <ManualDiscoveryCard fundingCallId={callId} />
      )}

      {call.lastUpdated && (
        <p className="text-xs text-muted-foreground text-center">
          Ultima actualizare: {new Date(call.lastUpdated).toLocaleString("ro-RO")}
        </p>
      )}

      {isSuperAdmin && call && (
        <>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Confirmare ștergere apel
                </DialogTitle>
                <DialogDescription>
                  Ești sigur că vrei să ștergi apelul <strong>{call.name}</strong>?
                  Toate secțiunile indexate asociate vor fi șterse. Această acțiune este ireversibilă.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)} data-testid="button-cancel-delete">Anulează</Button>
                <Button variant="destructive" onClick={() => callId && deleteCallMutation.mutate(callId)} disabled={deleteCallMutation.isPending} data-testid="button-confirm-delete">
                  {deleteCallMutation.isPending ? "Se șterge..." : "Șterge definitiv"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!docToDelete} onOpenChange={(open) => { if (!open) setDocToDelete(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  Ștergere document
                </DialogTitle>
                <DialogDescription>
                  Ești sigur că vrei să ștergi documentul <strong>{docToDelete?.name}</strong> din lista de documente oficiale?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDocToDelete(null)} data-testid="button-cancel-delete-doc">Anulează</Button>
                <Button
                  variant="destructive"
                  onClick={() => docToDelete && deleteSourceDocMutation.mutate({ idx: docToDelete.idx, name: docToDelete.name })}
                  disabled={deleteSourceDocMutation.isPending}
                  data-testid="button-confirm-delete-doc"
                >
                  {deleteSourceDocMutation.isPending ? "Se șterge..." : "Șterge"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) setShowEditDialog(false); }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary" />
                  Editare apel de finanțare
                </DialogTitle>
                <DialogDescription>Modifică informațiile apelului. Câmpurile array (CAEN, regiuni, tipuri beneficiari) se separă cu virgulă.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">Nume apel *</label>
                    <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="input-edit-name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Program</label>
                    <Input value={editForm.program || ""} onChange={(e) => setEditForm({ ...editForm, program: e.target.value })} data-testid="input-edit-program" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Categorie</label>
                    <Input value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} data-testid="input-edit-category" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={editForm.status || "active"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                      <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activ</SelectItem>
                        <SelectItem value="expired">Expirat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Termen limita</label>
                    <Input type="datetime-local" value={editForm.deadline || ""} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} data-testid="input-edit-deadline" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Finantare maxima per proiect</label>
                    <Input type="number" value={editForm.maxFunding ?? ""} onChange={(e) => setEditForm({ ...editForm, maxFunding: e.target.value })} data-testid="input-edit-maxfunding" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Moneda finanțare maximă</label>
                    <Select value={editForm.monedaMaxFunding || ""} onValueChange={(v) => setEditForm({ ...editForm, monedaMaxFunding: v })}>
                      <SelectTrigger data-testid="select-edit-moneda-max-funding"><SelectValue placeholder="Auto (din moneda UE)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="RON">RON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{editForm.bugetNational ? "Moneda buget UE" : "Moneda"}</label>
                    <Select value={editForm.monedaUe || "EUR"} onValueChange={(v) => setEditForm({ ...editForm, monedaUe: v, moneda: v, ...(!editForm.bugetNational ? { monedaNational: v } : {}) })}>
                      <SelectTrigger data-testid="select-edit-moneda-ue"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="RON">RON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cofinanțare buget de stat</label>
                    <Input value={editForm.bugetNational || ""} onChange={(e) => setEditForm({ ...editForm, bugetNational: e.target.value })} placeholder="ex: 50000000 (gol = buget total unic)" data-testid="input-edit-buget-national" />
                  </div>
                  {editForm.bugetNational && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Moneda buget national</label>
                      <Select value={editForm.monedaNational || "RON"} onValueChange={(v) => setEditForm({ ...editForm, monedaNational: v })}>
                        <SelectTrigger data-testid="select-edit-moneda-national"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="RON">RON</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Angajati minimi</label>
                    <Input type="number" value={editForm.minEmployees ?? ""} onChange={(e) => setEditForm({ ...editForm, minEmployees: e.target.value })} data-testid="input-edit-minemployees" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cifra de afaceri minima (EUR)</label>
                    <Input type="number" value={editForm.minRevenue ?? ""} onChange={(e) => setEditForm({ ...editForm, minRevenue: e.target.value })} data-testid="input-edit-minrevenue" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Varsta minima firma (ani)</label>
                    <Input type="number" value={editForm.minCompanyAge ?? ""} onChange={(e) => setEditForm({ ...editForm, minCompanyAge: e.target.value })} data-testid="input-edit-minage" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">URL sursa</label>
                    <Input value={editForm.sourceUrl || ""} onChange={(e) => setEditForm({ ...editForm, sourceUrl: e.target.value })} data-testid="input-edit-sourceurl" />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={editForm.requiresProfit || false} onCheckedChange={(v) => setEditForm({ ...editForm, requiresProfit: v })} data-testid="switch-edit-profit" />
                    <label className="text-sm">Necesita profit</label>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">CAEN-uri eligibile</label>
                  <Input value={editForm.eligibleCaen || ""} onChange={(e) => setEditForm({ ...editForm, eligibleCaen: e.target.value })} placeholder="ex: 6201, 6202, 6311" data-testid="input-edit-caen" />
                  <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Regiuni eligibile</label>
                  <Input value={editForm.eligibleRegions || ""} onChange={(e) => setEditForm({ ...editForm, eligibleRegions: e.target.value })} placeholder="ex: Nord-Vest, Centru, Sud-Est" data-testid="input-edit-regions" />
                  <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tipuri beneficiari</label>
                  <Input value={editForm.beneficiaryTypes || ""} onChange={(e) => setEditForm({ ...editForm, beneficiaryTypes: e.target.value })} placeholder="ex: imm, startup, ong" data-testid="input-edit-beneficiaries" />
                  <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Descriere</label>
                  <Textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="min-h-[100px]" data-testid="textarea-edit-description" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Rezumat AI</label>
                  <Textarea value={editForm.summary || ""} onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })} className="min-h-[120px]" data-testid="textarea-edit-summary" />
                </div>
                {editForm.detailsSections && Object.keys(editForm.detailsSections).length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">Sectiuni detaliate</h4>
                    <p className="text-xs text-muted-foreground">Informatii importate de pe site-ul oficial. Puteti corecta manual textul daca este eronat.</p>
                    {Object.entries(editForm.detailsSections).map(([key, value]) => {
                      if (typeof value !== "string") return null;
                      return (
                        <div key={key} className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">{formatSectionKey(key)}</label>
                          <Textarea
                            value={value}
                            onChange={(e) => setEditForm({ ...editForm, detailsSections: { ...editForm.detailsSections, [key]: e.target.value } })}
                            className="min-h-[80px] text-xs"
                            data-testid={`textarea-edit-section-${key}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)} data-testid="button-cancel-edit">Anulează</Button>
                <Button onClick={handleSaveCall} disabled={updateCallMutation.isPending || !editForm.name} data-testid="button-save-edit">
                  {updateCallMutation.isPending ? "Se salvează..." : "Salvează modificările"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showGuidesDialog} onOpenChange={setShowGuidesDialog}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-primary" />
                  Ghiduri si documente
                </DialogTitle>
                <DialogDescription className="line-clamp-2">{call.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Ghiduri (cu analiza AI)</h4>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center mb-3">
                    <input type="file" id="detail-guide-upload" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple onChange={handleGuideUpload} disabled={uploadingGuide} data-testid="input-detail-guide-upload" />
                    <label htmlFor="detail-guide-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
                      {uploadingGuide ? (
                        <><RefreshCw className="w-6 h-6 text-primary animate-spin" /><p className="text-sm font-medium">Se încarcă{guideUploadProgress ? ` ${guideUploadProgress.current}/${guideUploadProgress.total}` : ""}...</p><p className="text-xs text-muted-foreground">Fișierele se indexează automat</p></>
                      ) : (
                        <><Upload className="w-6 h-6 text-muted-foreground" /><p className="text-sm font-medium">Încarcă ghiduri (PDF, Word, Excel)</p><p className="text-xs text-muted-foreground">Poți selecta mai multe fișiere. Se analizează automat cu AI.</p></>
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
                            <div key={g.id} className="flex items-center gap-3 p-3 border rounded-lg" data-testid={`detail-guide-${g.id}`}>
                              <div className={`text-xs font-bold px-2 py-1 rounded ${fileColor}`}>{fileIcon}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{g.original_name}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{g.file_size ? `${(g.file_size / 1024).toFixed(0)} KB` : "--"}</span>
                                  <span>{g.sections_created > 0 ? `${g.sections_created} secțiuni AI` : "Neindexat"}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => window.open(`/api/admin/funding-calls/guides/${g.id}/download`, "_blank")} data-testid={`button-dl-guide-${g.id}`}>
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => { if (confirm(`Stergi ghidul "${g.original_name}"?`)) deleteGuideMutation.mutate({ cId: callId!, guideId: g.id }); }} disabled={deleteGuideMutation.isPending} className="text-red-600" data-testid={`button-del-guide-${g.id}`}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-2">Niciun ghid încărcat</p>;
                  })()}
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><File className="w-4 h-4 text-blue-600" /> Documente adiționale</h4>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center mb-3">
                    <input type="file" id="detail-attachment-upload" className="hidden" multiple onChange={handleAttachmentUpload} disabled={uploadingAttachment} data-testid="input-detail-attachment-upload" />
                    <label htmlFor="detail-attachment-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
                      {uploadingAttachment ? (
                        <><RefreshCw className="w-6 h-6 text-blue-600 animate-spin" /><p className="text-sm font-medium">Se încarcă...</p></>
                      ) : (
                        <><Upload className="w-6 h-6 text-muted-foreground" /><p className="text-sm font-medium">Atașează documente suplimentare</p></>
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
                            <div key={g.id} className="flex items-center gap-3 p-3 border rounded-lg" data-testid={`detail-attachment-${g.id}`}>
                              <div className={`text-xs font-bold px-2 py-1 rounded ${fileColor}`}>{fileIcon}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{g.original_name}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{g.file_size ? g.file_size > 1024 * 1024 ? `${(g.file_size / 1024 / 1024).toFixed(1)} MB` : `${(g.file_size / 1024).toFixed(0)} KB` : "--"}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => window.open(`/api/admin/funding-calls/guides/${g.id}/download`, "_blank")} data-testid={`button-dl-att-${g.id}`}>
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => { if (confirm(`Stergi documentul "${g.original_name}"?`)) deleteGuideMutation.mutate({ cId: callId!, guideId: g.id }); }} disabled={deleteGuideMutation.isPending} className="text-red-600" data-testid={`button-del-att-${g.id}`}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-2">Niciun document adițional</p>;
                  })()}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGuidesDialog(false)} data-testid="button-close-guides-detail">Închide</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
