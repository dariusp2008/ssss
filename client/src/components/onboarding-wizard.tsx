import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Rocket, Building2, Search, ArrowRight, ArrowLeft, CheckCircle2,
  Sparkles, Target, FileText, Users, Loader2, X, BarChart3, ShieldCheck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { getActionCost, CREDIT_ACTION, type CreditCostRow } from "@/lib/credit-costs";

const STORAGE_KEY = "granted_onboarding_completed";

export function useOnboardingStatus() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
  const { data: companies, isLoading } = useQuery<any[]>({
    queryKey: ["/api/companies"],
  });

  const hasCompanies = (companies?.length || 0) > 0;
  const shouldShow = !isLoading && !dismissed && !hasCompanies;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    localStorage.setItem("granted_onboarding_dismissed", "1");
    setDismissed(true);
  };

  return { shouldShow, isLoading, dismiss };
}

export function OnboardingWizard({ onComplete }: { onComplete: (destination?: string) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [cuiInput, setCuiInput] = useState("");
  const [addedCompany, setAddedCompany] = useState<any>(null);
  const [aiConsent, setAiConsent] = useState(user?.consentAiProcessing ?? false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);

  const { data: creditCosts } = useQuery<CreditCostRow[]>({ queryKey: ["/api/credits/costs"] });
  const addCompanyCost = getActionCost(creditCosts, CREDIT_ACTION.companyData, 3);

  const saveConsentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/auth/consents", { consentAiProcessing: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (cui: string) => {
      const res = await apiRequest("POST", "/api/companies/verify", { cui });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      setAddedCompany(data);
      setCuiInput("");
      toast({ title: "Companie adăugată", description: "Verificarea datelor a început în fundal. Vei fi notificat când procesul este finalizat." });
    },
    onError: (error: any) => {
      if (error.status === 429) {
        toast({ title: "Limită atinsă", description: error.message });
        return;
      }
      toast({ title: "Verificare eșuată", description: error.message, variant: "destructive" });
    },
  });

  const handleSkip = () => {
    onComplete("/dashboard");
  };

  const handleFinish = (destination: string) => {
    onComplete(destination);
  };

  const steps = [
    { label: "Bun venit", icon: Rocket },
    { label: "Adaugă companie", icon: Building2 },
    { label: "Explorează", icon: Target },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" data-testid="onboarding-wizard">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-background to-indigo-50/50 dark:from-blue-950/30 dark:via-background dark:to-indigo-950/20" />

      <div className="relative z-10 flex items-center justify-end p-2 sm:p-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkip}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-foreground"
          data-testid="button-onboarding-close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 pb-4 sm:pb-8">
        <div className="w-full max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1 sm:gap-2">
                <div
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all ${
                    i < step
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : i === step
                      ? "bg-[hsl(228,100%,25%)] text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <s.icon className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-4 sm:w-8 h-px ${i < step ? "bg-green-400" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          <Card className="p-0 overflow-hidden border-0 shadow-2xl" data-testid="card-onboarding-step">
            {step === 0 && (
              <div className="p-4 sm:p-8 md:p-10 text-center space-y-3 sm:space-y-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[hsl(228,100%,25%)] to-[hsl(228,100%,40%)] flex items-center justify-center mx-auto">
                  <Rocket className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <h1 className="text-lg sm:text-2xl md:text-3xl font-bold" data-testid="text-onboarding-title">
                    Bine ai venit în GRANTED{user?.firstName ? `, ${user.firstName}` : ""}!
                  </h1>
                  <p className="text-muted-foreground text-xs sm:text-base max-w-md mx-auto">
                    Platforma ta inteligentă pentru identificarea și accesarea programelor de finanțare.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 pt-1 sm:pt-2">
                  <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-2 p-2.5 sm:p-4 rounded-xl bg-muted/50 text-left sm:text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Search className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="sm:space-y-1">
                      <p className="text-xs sm:text-sm font-medium">Matching inteligent</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Găsim apelurile potrivite companiei tale</p>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-2 p-2.5 sm:p-4 rounded-xl bg-muted/50 text-left sm:text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="sm:space-y-1">
                      <p className="text-xs sm:text-sm font-medium">Analiza eligibilitate</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Verificare AI pe baza ghidurilor oficiale</p>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-2 p-2.5 sm:p-4 rounded-xl bg-muted/50 text-left sm:text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="sm:space-y-1">
                      <p className="text-xs sm:text-sm font-medium">Management proiecte</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Urmaresti documente si termene</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-2.5 sm:p-4 text-left">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 space-y-1.5 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-medium">Procesare AI</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                        GRANTED foloseste inteligenta artificiala pentru analiza eligibilitatii, matching-ul cu apeluri si generarea de rapoarte. Datele companiei tale sunt procesate securizat si nu sunt partajate cu terti.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer pt-0.5 sm:pt-1" data-testid="label-onboarding-ai-consent">
                        <Checkbox
                          checked={aiConsent}
                          onCheckedChange={(checked) => setAiConsent(checked === true)}
                          data-testid="checkbox-onboarding-ai-consent"
                        />
                        <span className="text-[11px] sm:text-xs font-medium">Accept procesarea datelor cu AI</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 sm:pt-4">
                  <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground" data-testid="button-onboarding-skip">
                    Sari peste
                  </Button>
                  <Button
                    onClick={() => {
                      if (aiConsent && !user?.consentAiProcessing) {
                        saveConsentMutation.mutate();
                      }
                      setStep(1);
                    }}
                    className="bg-[hsl(228,100%,25%)]"
                    data-testid="button-onboarding-next-0"
                  >
                    <span className="hidden sm:inline">Începe configurarea</span>
                    <span className="sm:hidden">Începe</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="p-4 sm:p-8 md:p-10 space-y-3 sm:space-y-6">
                <div className="text-center space-y-1 sm:space-y-2">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto">
                    <Building2 className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <h2 className="text-base sm:text-xl md:text-2xl font-bold" data-testid="text-onboarding-step1-title">Adaugă prima ta companie</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                    Introdu CUI-ul companiei și vom prelua automat toate datele oficiale (CAEN, angajați, cifra de afaceri, adresă).
                  </p>
                </div>

                {!addedCompany ? (
                  <div className="max-w-sm mx-auto space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: 12345678"
                        value={cuiInput}
                        onChange={(e) => setCuiInput(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && cuiInput.trim()) setShowAddConfirm(true);
                        }}
                        disabled={verifyMutation.isPending}
                        className="text-center text-lg tracking-wider"
                        data-testid="input-onboarding-cui"
                      />
                      <Button
                        onClick={() => setShowAddConfirm(true)}
                        disabled={!cuiInput.trim() || verifyMutation.isPending}
                        className="bg-[hsl(228,100%,25%)] shrink-0"
                        data-testid="button-onboarding-verify-cui"
                      >
                        {verifyMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          `Verifică (${addCompanyCost} cr)`
                        )}
                      </Button>
                    </div>
                    <CreditConfirmDialog
                      open={showAddConfirm}
                      onOpenChange={setShowAddConfirm}
                      onConfirm={() => { setShowAddConfirm(false); verifyMutation.mutate(cuiInput); }}
                      actionLabel="Verificarea și adăugarea companiei"
                      creditCost={addCompanyCost}
                      isPending={verifyMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      CUI (Cod Unic de Identificare) - îl găsești pe certificatul de înregistrare
                    </p>
                  </div>
                ) : (
                  <div className="max-w-sm mx-auto">
                    <div className="rounded-xl border bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800 p-4 space-y-3" data-testid="card-onboarding-company-added">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <p className="font-semibold text-green-700 dark:text-green-400">Companie adăugată!</p>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <p className="font-medium">{addedCompany.name}</p>
                        {addedCompany.caen && (
                          <p className="text-muted-foreground">CAEN: {addedCompany.caen} {addedCompany.caenDescription ? `- ${addedCompany.caenDescription}` : ""}</p>
                        )}
                        {addedCompany.address && (
                          <p className="text-muted-foreground text-xs">{addedCompany.address}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 sm:pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setStep(0)} data-testid="button-onboarding-back-1">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Înapoi
                  </Button>
                  <div className="flex items-center gap-2">
                    {!addedCompany && (
                      <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-muted-foreground" data-testid="button-onboarding-skip-step1">
                        Sari peste
                      </Button>
                    )}
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!addedCompany && verifyMutation.isPending}
                      className="bg-[hsl(228,100%,25%)]"
                      data-testid="button-onboarding-next-1"
                    >
                      {addedCompany ? "Continuă" : "Mai departe"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-4 sm:p-8 md:p-10 space-y-3 sm:space-y-6">
                <div className="text-center space-y-1 sm:space-y-2">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[hsl(228,100%,25%)] to-[hsl(228,100%,45%)] flex items-center justify-center mx-auto">
                    <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <h2 className="text-base sm:text-xl md:text-2xl font-bold" data-testid="text-onboarding-step2-title">Ești gata!</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                    {addedCompany
                      ? "Compania ta a fost adăugată. Alege ce vrei să faci mai departe:"
                      : "Poți adăuga o companie oricând. Alege ce vrei să explorezi:"}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-w-lg mx-auto">
                  {addedCompany && (
                    <button
                      onClick={() => handleFinish("/dashboard")}
                      className="flex items-center sm:items-start gap-2.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl border-2 border-transparent bg-muted/50 text-left transition-all hover:border-[hsl(228,100%,25%)]/30 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 group"
                      data-testid="button-onboarding-goto-dashboard"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold">Matching Engine</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Vezi scorurile de potrivire cu apelurile active</p>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => handleFinish("/funding-calls")}
                    className="flex items-center sm:items-start gap-2.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl border-2 border-transparent bg-muted/50 text-left transition-all hover:border-[hsl(228,100%,25%)]/30 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 group"
                    data-testid="button-onboarding-goto-calls"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                      <Search className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold">Apeluri de finanțare</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Explorează apelurile disponibile</p>
                    </div>
                  </button>

                  {addedCompany && (
                    <button
                      onClick={() => handleFinish("/eligibility")}
                      className="flex items-center sm:items-start gap-2.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl border-2 border-transparent bg-muted/50 text-left transition-all hover:border-[hsl(228,100%,25%)]/30 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 group"
                      data-testid="button-onboarding-goto-eligibility"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold">Verificare eligibilitate</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Analiză AI pe un apel de finanțare</p>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => handleFinish("/how-it-works")}
                    className="flex items-center sm:items-start gap-2.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl border-2 border-transparent bg-muted/50 text-left transition-all hover:border-[hsl(228,100%,25%)]/30 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 group"
                    data-testid="button-onboarding-goto-how"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 transition-colors">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold">Cum funcționează</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Ghid detaliat al platformei</p>
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 sm:pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)} data-testid="button-onboarding-back-2">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Înapoi
                  </Button>
                  <Button onClick={() => handleFinish("/dashboard")} className="bg-[hsl(228,100%,25%)]" data-testid="button-onboarding-finish">
                    <span className="hidden sm:inline">Mergi la panou</span>
                    <span className="sm:hidden">Panou</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Poți accesa oricând aceste funcționalități din meniul lateral.
          </p>
        </div>
      </div>
    </div>
  );
}
