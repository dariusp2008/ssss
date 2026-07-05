import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2, Search, Sparkles, Trash2, ArrowRight, Users, MapPin, Calendar,
  AlertTriangle, FileText, FolderOpen, Shield, Loader2,
} from "lucide-react";
import type { Company } from "@shared/schema";
import { getCompanyLegalState, TERMINAL_WARNING_MESSAGE } from "@shared/company-legal-state";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { getActionCost, CREDIT_ACTION, type CreditCostRow } from "@/lib/credit-costs";

interface DeleteImpact {
  companyName: string;
  projects: number;
  eligibilityReports: number;
  consortiumMemberships: number;
  documents: number;
}

export default function CompaniesPage() {
  const { toast } = useToast();
  const [cuiInput, setCuiInput] = useState("");
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);

  const { data: creditCosts } = useQuery<CreditCostRow[]>({ queryKey: ["/api/credits/costs"] });
  const addCompanyCost = getActionCost(creditCosts, CREDIT_ACTION.companyData, 3);
  const { data: balance } = useQuery<{ plan?: { name?: string; maxCompanies?: number } }>({ queryKey: ["/api/credits/balance"] });

  useEffect(() => {
    if (deletingCompany) {
      setLoadingImpact(true);
      setDeleteImpact(null);
      fetch(`/api/companies/${deletingCompany.id}/delete-impact`, { credentials: "include" })
        .then(res => res.json())
        .then(data => setDeleteImpact(data))
        .catch(() => setDeleteImpact(null))
        .finally(() => setLoadingImpact(false));
    } else {
      setDeleteImpact(null);
    }
  }, [deletingCompany]);

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const hasPendingCompanies = companies?.some((c) => c.status === "pending");

  const maxCompanies = balance?.plan?.maxCompanies ?? 0;
  const billableCount = companies?.filter((c) => c.status !== "failed").length ?? 0;
  const limitReached = maxCompanies > 0 && billableCount >= maxCompanies;

  useEffect(() => {
    if (!hasPendingCompanies) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    }, 5000);
    return () => clearInterval(interval);
  }, [hasPendingCompanies]);

  const verifyMutation = useMutation({
    mutationFn: async (cui: string) => {
      const res = await apiRequest("POST", "/api/companies/verify", { cui });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      setCuiInput("");
      toast({ title: "Companie adaugata", description: "Verificarea datelor a inceput. Vei fi notificat cand procesul este finalizat." });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Neautorizat", description: "Re-autentificare...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/auth"; }, 500);
        return;
      }
      if (error.status === 429) {
        toast({ title: "Limită atinsă", description: error.message });
        return;
      }
      toast({ title: "Verificare eșuată", description: error.message, variant: "destructive" });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/retry`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Reverificare pornită", description: "Datele companiei se verifică din nou." });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Ștergerea companiei a eșuat");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setDeletingCompany(null);
      toast({ title: "Companie ștearsă", description: "Compania a fost eliminată din cont." });
    },
    onError: (error: Error) => {
      setDeletingCompany(null);
      toast({ title: "Ștergere eșuată", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6 lg:space-y-4 max-w-5xl mx-auto">
      <div className="space-y-1 lg:space-y-0">
        <h1 className="text-2xl lg:text-xl font-serif font-bold tracking-tight" data-testid="text-companies-title">
          Companiile mele
        </h1>
        <p className="text-muted-foreground lg:text-xs">
          Gestionează companiile verificate și adaugă altele noi.
        </p>
      </div>

      <Card className="p-6 lg:p-4 space-y-4 lg:space-y-3 border-t-2 border-t-[hsl(48,100%,50%)]">
        <div className="space-y-1 lg:space-y-0">
          <h2 className="text-lg lg:text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[hsl(48,100%,45%)]" />
            Adaugă o companie nouă
          </h2>
          <p className="text-sm lg:text-xs text-muted-foreground">
            Introdu un CUI (Cod Unic de Identificare) pentru a prelua și verifica datele companiei.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={cuiInput}
              onChange={(e) => setCuiInput(e.target.value)}
              placeholder="Introdu CUI (ex: 12345678)"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter" && cuiInput.trim() && !limitReached) setShowAddConfirm(true);
              }}
              disabled={limitReached}
              data-testid="input-cui-companies"
            />
          </div>
          <Button
            onClick={() => setShowAddConfirm(true)}
            disabled={!cuiInput.trim() || verifyMutation.isPending || limitReached}
            data-testid="button-verify-cui-companies"
          >
            {verifyMutation.isPending ? "Se verifică..." : `Verifică (${addCompanyCost} cr)`}
          </Button>
        </div>
        {limitReached && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3" data-testid="alert-company-limit">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
              Ai atins limita de {maxCompanies} {maxCompanies === 1 ? "companie" : "companii"} a planului {balance?.plan?.name ? `„${balance.plan.name}"` : "tău"}. Șterge o companie existentă sau{" "}
              <Link href="/my-account" className="font-medium underline" data-testid="link-upgrade-plan">fă upgrade</Link>{" "}pentru a adăuga altele.
            </p>
          </div>
        )}
      </Card>

      <CreditConfirmDialog
        open={showAddConfirm}
        onOpenChange={setShowAddConfirm}
        onConfirm={() => { setShowAddConfirm(false); verifyMutation.mutate(cuiInput); }}
        actionLabel="Adăugarea companiei (verificare date)"
        creditCost={addCompanyCost}
        isPending={verifyMutation.isPending}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : companies && companies.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((company) => (
            <Card key={company.id} className={`p-5 space-y-4 ${company.status === "pending" ? "opacity-80 border-dashed" : company.status === "failed" ? "border-destructive/40" : ""}`} data-testid={`card-company-${company.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${company.status === "pending" ? "bg-muted" : company.status === "failed" ? "bg-destructive/10" : "bg-[hsl(228,100%,19.6%)]"}`}>
                    {company.status === "pending" ? (
                      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    ) : company.status === "failed" ? (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    ) : (
                      <Building2 className="w-5 h-5 text-[hsl(48,100%,50%)]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" data-testid={`text-company-name-${company.id}`}>
                      {company.status === "pending" ? `CUI: ${company.cui}` : company.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {company.status === "pending" ? "Se verifică datele..." : company.status === "failed" ? "Verificare eșuată" : `CUI: ${company.cui}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge
                    variant={company.status === "active" ? "default" : "secondary"}
                    className={`no-default-active-elevate ${company.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/20" : company.status === "pending" ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" : ""}`}
                  >
                    {company.status === "active" ? "Activ" : company.status === "pending" ? "Se verifică..." : company.status === "failed" ? "Eșuată" : company.status}
                  </Badge>
                  {getCompanyLegalState(company.stareFirma).isTerminal && (
                    <Badge
                      variant="secondary"
                      className="no-default-active-elevate bg-destructive/10 text-destructive border-destructive/20 gap-1"
                      data-testid={`badge-legal-terminal-${company.id}`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {getCompanyLegalState(company.stareFirma).label}
                    </Badge>
                  )}
                </div>
              </div>

              {getCompanyLegalState(company.stareFirma).isTerminal && (
                <div className="flex items-start gap-3 py-3 px-3 bg-destructive/5 rounded-lg border border-destructive/20" data-testid={`warning-legal-terminal-${company.id}`}>
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    {TERMINAL_WARNING_MESSAGE}
                  </p>
                </div>
              )}

              {company.status === "pending" ? (
                <div className="flex items-center gap-3 py-4 px-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Datele companiei se preiau de la termene.ro. Vei fi notificat când procesul este finalizat.
                  </p>
                </div>
              ) : company.status === "failed" ? (
                <div className="flex items-center gap-3 py-4 px-3 bg-destructive/5 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Verificarea a eșuat. CUI-ul poate fi invalid sau serviciul termene.ro a fost temporar indisponibil.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">CAEN</p>
                      <p className="text-sm font-medium">{company.caen || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Angajați</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        {company.employees || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Cifra de afaceri</p>
                      <p className="text-sm font-medium">{company.revenue ? `${(company.revenue / 1000).toFixed(0)}k RON` : "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">An înființare</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {company.founded || "N/A"}
                      </p>
                    </div>
                  </div>

                  {company.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {company.address}
                    </p>
                  )}
                </>
              )}

              <div className="flex items-center gap-2 pt-1 border-t">
                {company.status === "failed" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => retryMutation.mutate(company.id)}
                      disabled={retryMutation.isPending}
                      data-testid={`button-retry-company-${company.id}`}
                    >
                      {retryMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                      Reîncearcă verificarea
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => setDeletingCompany(company)}
                      data-testid={`button-delete-company-${company.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : company.status === "pending" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0 ml-auto"
                    onClick={() => setDeletingCompany(company)}
                    data-testid={`button-delete-company-${company.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <>
                    <Link href={`/companies/${company.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full" data-testid={`button-detail-company-${company.id}`}>
                        Detalii & Editare <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => setDeletingCompany(company)}
                      data-testid={`button-delete-company-${company.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center space-y-3">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold">Nicio companie încă</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Introdu un CUI mai sus pentru a verifica prima companie.
          </p>
        </Card>
      )}

      <AlertDialog open={!!deletingCompany} onOpenChange={(open) => {
        if (!open) {
          setDeletingCompany(null);
          setTimeout(() => { document.body.style.pointerEvents = ""; }, 0);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Șterge compania?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Ești sigur că vrei să ștergi compania <span className="font-semibold text-foreground">{deletingCompany?.name}</span>?
                </p>
                {loadingImpact ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Se verifică datele asociate...</span>
                  </div>
                ) : deleteImpact && (deleteImpact.projects > 0 || deleteImpact.eligibilityReports > 0 || deleteImpact.consortiumMemberships > 0 || deleteImpact.documents > 0) ? (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-destructive">Următoarele date vor fi șterse definitiv:</p>
                    <ul className="text-sm space-y-1.5 text-muted-foreground">
                      {deleteImpact.projects > 0 && (
                        <li className="flex items-center gap-2" data-testid="impact-projects">
                          <FolderOpen className="w-4 h-4 text-destructive/70" />
                          {deleteImpact.projects} {deleteImpact.projects === 1 ? "proiect" : "proiecte"}
                        </li>
                      )}
                      {deleteImpact.documents > 0 && (
                        <li className="flex items-center gap-2" data-testid="impact-documents">
                          <FileText className="w-4 h-4 text-destructive/70" />
                          {deleteImpact.documents} {deleteImpact.documents === 1 ? "document" : "documente"}
                        </li>
                      )}
                      {deleteImpact.eligibilityReports > 0 && (
                        <li className="flex items-center gap-2" data-testid="impact-reports">
                          <Shield className="w-4 h-4 text-destructive/70" />
                          {deleteImpact.eligibilityReports} {deleteImpact.eligibilityReports === 1 ? "raport de eligibilitate" : "rapoarte de eligibilitate"}
                        </li>
                      )}
                      {deleteImpact.consortiumMemberships > 0 && (
                        <li className="flex items-center gap-2" data-testid="impact-consortium">
                          <Users className="w-4 h-4 text-destructive/70" />
                          {deleteImpact.consortiumMemberships} {deleteImpact.consortiumMemberships === 1 ? "membru în consorțiu" : "participări în consorții"}
                        </li>
                      )}
                    </ul>
                  </div>
                ) : deleteImpact ? (
                  <p className="text-sm text-muted-foreground">Nu există date asociate. Compania poate fi ștearsă fără impact.</p>
                ) : null}
                <p className="text-sm text-destructive font-medium">Această acțiune nu poate fi anulată.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCompany && deleteMutation.mutate(deletingCompany.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
              disabled={loadingImpact}
            >
              {deleteMutation.isPending ? "Se șterge..." : "Șterge definitiv"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
