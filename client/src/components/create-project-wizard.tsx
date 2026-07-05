import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Search, ArrowRight, ArrowLeft, Loader2, CheckCircle2, XCircle,
  AlertTriangle, HelpCircle, Sparkles, ShieldCheck, FolderPlus, PartyPopper,
} from "lucide-react";
import type { Company } from "@shared/schema";
import { getCompanyLegalState } from "@shared/company-legal-state";
import { getActionCost, CREDIT_ACTION, type CreditCostRow } from "@/lib/credit-costs";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";

interface FundingCallListItem {
  id: string;
  name: string;
  program?: string | null;
  deadline?: string | null;
  status?: string | null;
}

interface EligibilityResult {
  verdict?: "ELIGIBIL" | "NEELIGIBIL" | "PARȚIAL ELIGIBIL" | "DATE INSUFICIENTE";
  score?: number;
  processing?: boolean;
}

const verdictConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  "ELIGIBIL": { color: "text-green-700 dark:text-green-400", icon: CheckCircle2, label: "Eligibil" },
  "NEELIGIBIL": { color: "text-red-600 dark:text-red-400", icon: XCircle, label: "Neeligibil" },
  "PARȚIAL ELIGIBIL": { color: "text-yellow-700 dark:text-yellow-400", icon: AlertTriangle, label: "Parțial eligibil" },
  "DATE INSUFICIENTE": { color: "text-muted-foreground", icon: HelpCircle, label: "Date insuficiente" },
};

type WizardStep = 1 | 2 | 3;

export function CreateProjectWizard({
  open,
  onOpenChange,
  companies,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[] | undefined;
}) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const activeCompanies = useMemo(
    () => (companies ?? []).filter((c) => c.status === "active" && !getCompanyLegalState(c.stareFirma).isTerminal),
    [companies],
  );
  const hasCompany = activeCompanies.length > 0;

  const [step, setStep] = useState<WizardStep>(1);
  const [companyId, setCompanyId] = useState<string>("");
  const [selectedApelIds, setSelectedApelIds] = useState<string[]>([]);
  const [apelSearch, setApelSearch] = useState("");
  const [eligByApel, setEligByApel] = useState<Record<string, EligibilityResult>>({});
  const [confirmApelId, setConfirmApelId] = useState<string | null>(null);

  const selectedCompanyId = companyId || activeCompanies[0]?.id || "";

  const { data: creditCosts } = useQuery<CreditCostRow[]>({ queryKey: ["/api/credits/costs"], enabled: open });
  const eligibilityCost = getActionCost(creditCosts, CREDIT_ACTION.eligibilityCheck, 3);

  const { data: fundingCalls } = useQuery<FundingCallListItem[]>({
    queryKey: ["/api/funding-calls-list"],
    queryFn: async () => {
      const res = await fetch("/api/funding-calls-list", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch funding calls");
      return res.json();
    },
    enabled: open && hasCompany,
  });

  const filteredCalls = useMemo(() => {
    const q = apelSearch.trim().toLowerCase();
    const list = fundingCalls ?? [];
    if (!q) return list;
    return list.filter((c) => `${c.name} ${c.program ?? ""}`.toLowerCase().includes(q));
  }, [fundingCalls, apelSearch]);

  const selectedCalls = useMemo(
    () => (fundingCalls ?? []).filter((c) => selectedApelIds.includes(c.id)),
    [fundingCalls, selectedApelIds],
  );

  function reset() {
    setStep(1);
    setCompanyId("");
    setSelectedApelIds([]);
    setApelSearch("");
    setEligByApel({});
  }

  function close() {
    onOpenChange(false);
    // small delay-free reset; dialog unmount handles the rest
    setTimeout(reset, 200);
  }

  function toggleApel(id: string) {
    setSelectedApelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Eligibility check (real backend, per-Apel). Mirrors eligibility.tsx.
  const eligibilityMutation = useMutation({
    mutationFn: async (apelId: string) => {
      const res = await apiRequest("POST", "/api/eligibility-check", {
        companyId: selectedCompanyId,
        apelId,
        progressId: `elig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
      const data = await res.json();
      return { apelId, data } as { apelId: string; data: EligibilityResult };
    },
    onSuccess: ({ apelId, data }) => {
      setEligByApel((prev) => ({ ...prev, [apelId]: data }));
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      if (data.processing || !data.verdict) {
        toast({ title: "Verificare pornită", description: "Analiza AI rulează în fundal — poți continua." });
      }
    },
    onError: (error: any) => {
      if (error?.status === 402) {
        toast({ title: "Credite insuficiente", description: "Nu ai suficiente credite pentru verificare.", variant: "destructive" });
      } else {
        toast({ title: "Eroare", description: "Verificarea eligibilității a eșuat.", variant: "destructive" });
      }
    },
  });

  // Create one project per selected Apel (endpoint accepts a single fundingCallId).
  const createMutation = useMutation({
    mutationFn: async () => {
      const results: Array<{ id: string }> = [];
      for (const apelId of selectedApelIds) {
        const res = await apiRequest("POST", "/api/projects", { companyId: selectedCompanyId, fundingCallId: apelId });
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: results.length > 1 ? "Proiecte create" : "Proiect creat",
        description: results.length > 1 ? `${results.length} proiecte au fost inițiate.` : "Proiectul a fost inițiat.",
      });
      if (results.length === 1 && results[0]?.id) {
        close();
        navigate(`/projects/${results[0].id}`);
      } else {
        close();
      }
    },
    onError: (error: any) => {
      if (error?.status === 403) {
        toast({ title: "Limită atinsă", description: "Planul tău nu mai permite proiecte noi.", variant: "destructive" });
      } else {
        toast({ title: "Eroare", description: error?.message || "Crearea proiectului a eșuat.", variant: "destructive" });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-create-project">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            Creează un proiect nou
          </DialogTitle>
        </DialogHeader>

        {/* No-company gate (step 0) */}
        {!hasCompany ? (
          <div className="py-8 text-center space-y-4" data-testid="wizard-no-company">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <h3 className="font-semibold">Nu ai nicio companie adăugată</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Ai nevoie de cel puțin o companie verificată pentru a crea un proiect. Adaugă una folosind CUI-ul firmei.
              </p>
            </div>
            <Button onClick={() => { close(); navigate("/companies"); }} data-testid="button-wizard-add-company">
              <Building2 className="w-4 h-4 mr-2" />
              Adaugă o companie
            </Button>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs font-medium">
              {[
                { n: 1, label: "Apeluri" },
                { n: 2, label: "Eligibilitate" },
                { n: 3, label: "Confirmare" },
              ].map((s, i) => (
                <div key={s.n} className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= (s.n as WizardStep) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s.n}</span>
                  <span className={step >= (s.n as WizardStep) ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
                  {i < 2 && <span className="w-6 h-px bg-border" />}
                </div>
              ))}
            </div>

            {/* Step 1 — company + searchable multi-Apel */}
            {step === 1 && (
              <div className="space-y-4" data-testid="wizard-step-1">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Companie</label>
                  <Select value={selectedCompanyId} onValueChange={setCompanyId}>
                    <SelectTrigger data-testid="select-wizard-company">
                      <SelectValue placeholder="Selectează compania" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCompanies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Apeluri de finanțare <span className="text-muted-foreground font-normal">(poți selecta mai multe)</span></label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={apelSearch}
                      onChange={(e) => setApelSearch(e.target.value)}
                      placeholder="Caută un apel..."
                      className="pl-8"
                      data-testid="input-apel-search"
                    />
                  </div>
                  <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
                    {(fundingCalls == null) ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Se încarcă apelurile...
                      </div>
                    ) : filteredCalls.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Niciun apel găsit.</div>
                    ) : (
                      filteredCalls.map((call) => (
                        <label
                          key={call.id}
                          className="flex items-start gap-3 p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                          data-testid={`apel-option-${call.id}`}
                        >
                          <Checkbox
                            checked={selectedApelIds.includes(call.id)}
                            onCheckedChange={() => toggleApel(call.id)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{call.name}</p>
                            {call.program && <p className="text-xs text-muted-foreground truncate">{call.program}</p>}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedApelIds.length > 0 && (
                    <p className="text-xs text-muted-foreground" data-testid="text-selected-count">{selectedApelIds.length} apel(uri) selectate</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2 — educational eligibility (real /api/eligibility-check) */}
            {step === 2 && (
              <div className="space-y-4" data-testid="wizard-step-2">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-[hsl(48,100%,45%)]" />Cum verificăm eligibilitatea</h3>
                  <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li><span className="text-foreground font-medium">Potrivire structurală</span> — comparăm datele firmei (CAEN, dimensiune, regiune) cu criteriile apelului.</li>
                    <li><span className="text-foreground font-medium">Analiză AI</span> — verificăm ghidul apelului față de profilul companiei și evidențiem riscuri.</li>
                  </ol>
                  <p className="text-xs text-muted-foreground">Verificarea este opțională — poți crea proiectul și verifica mai târziu. Costă {eligibilityCost} credite / apel.</p>
                </div>
                <div className="space-y-2">
                  {selectedCalls.map((call) => {
                    const res = eligByApel[call.id];
                    const vc = res?.verdict ? verdictConfig[res.verdict] : null;
                    const isChecking = eligibilityMutation.isPending && eligibilityMutation.variables === call.id;
                    return (
                      <div key={call.id} className="flex items-center gap-3 p-2.5 rounded-md border" data-testid={`elig-row-${call.id}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{call.name}</p>
                          {vc ? (
                            <span className={`text-xs font-medium flex items-center gap-1 ${vc.color}`}>
                              <vc.icon className="w-3.5 h-3.5" />{vc.label}{res?.score != null ? ` · ${res.score}%` : ""}
                            </span>
                          ) : res?.processing ? (
                            <span className="text-xs text-muted-foreground">Analiză în curs...</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Neverificat</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isChecking}
                          onClick={() => setConfirmApelId(call.id)}
                          data-testid={`button-check-elig-${call.id}`}
                        >
                          {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                          {vc || res?.processing ? "Reverifică" : "Verifică"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3 — confirm & create */}
            {step === 3 && (
              <div className="space-y-4" data-testid="wizard-step-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm">
                    Vei crea <strong>{selectedApelIds.length}</strong> {selectedApelIds.length === 1 ? "proiect" : "proiecte"} pentru{" "}
                    <strong>{activeCompanies.find((c) => c.id === selectedCompanyId)?.name}</strong>.
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {selectedCalls.map((call) => (
                    <li key={call.id} className="flex items-center gap-2 text-sm">
                      <PartyPopper className="w-4 h-4 text-[hsl(48,100%,45%)] shrink-0" />
                      <span className="truncate">{call.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep((s) => (s - 1) as WizardStep)} data-testid="button-wizard-back">
                  <ArrowLeft className="w-4 h-4 mr-1" />Înapoi
                </Button>
              ) : (
                <Button variant="outline" onClick={close} data-testid="button-wizard-cancel">Anulează</Button>
              )}
              {step < 3 ? (
                <Button
                  onClick={() => setStep((s) => (s + 1) as WizardStep)}
                  disabled={step === 1 && selectedApelIds.length === 0}
                  data-testid="button-wizard-next"
                >
                  Continuă<ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-wizard-create">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FolderPlus className="w-4 h-4 mr-1" />}
                  Creează {selectedApelIds.length > 1 ? "proiectele" : "proiectul"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>

      {/* Credit confirmation for the eligibility check */}
      <CreditConfirmDialog
        open={confirmApelId != null}
        onOpenChange={(o) => { if (!o) setConfirmApelId(null); }}
        onConfirm={() => { if (confirmApelId) eligibilityMutation.mutate(confirmApelId); setConfirmApelId(null); }}
        actionLabel="Verificarea eligibilității"
        creditCost={eligibilityCost}
        isPending={eligibilityMutation.isPending}
      />
    </Dialog>
  );
}
