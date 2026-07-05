import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFeatureLabel, formatTransactionDescription } from "@/lib/labels";
import {
  User, Mail, Shield, Calendar, CheckCircle2, Camera, Lock, Eye, EyeOff,
  BarChart3, AlertTriangle, Trash2, Building2, FolderOpen, FileText,
  ClipboardCheck, Coins, CalendarClock, CreditCard, ChevronLeft, ChevronRight,
  Zap, Crown, Loader2, UserCheck, Download, Share2, Brain, Info, ClipboardList, Receipt,
} from "lucide-react";

type UsageData = Record<string, { used: number; max: number; period: string; resetAt: string; label: string }>;

interface CreditBalance {
  creditBalance: number;
  plan: {
    id: string; name: string; slug: string; monthlyCredits: number;
    maxCompanies: number; maxProjects: number; features: string[] | null;
  } | null;
  subscription: { status: string | null; nextCreditResetAt: string | null; currentPeriodStart: string | null };
  cuiAllowance?: { included: number; used: number; remaining: number; resetAt: string | null };
}

interface CreditCost { action: string; credit_cost: number; label: string; description: string }
interface CreditTransaction { id: string; amount: number; balance_after: number; type: string; action: string; reference_id: string | null; description: string; created_at: string }
interface TransactionsResponse { transactions: CreditTransaction[]; total: number; page: number; limit: number }
interface SubscriptionPlan { id: string; name: string; slug: string; description: string; monthly_credits: number; max_companies: number; max_projects: number; features: string[] | null; is_public: boolean }
interface BillingPlan { id: string; name: string; slug: string; description: string | null; monthlyCredits: number; maxCompanies: number; maxProjects: number; features: string[] | null; priceMonthly: number | null; priceYearly: number | null; currency: string | null; includedCuiPerMonth: number; seats: number }
interface BillingPackage { id: string; name: string; credits: number; price: number | null; currency: string | null }
interface BillingPlansResponse { plans: BillingPlan[]; creditPackages: BillingPackage[]; stripeEnabled: boolean; availableProviders: string[] }
interface BillingStatus { plan: { slug: string } | null; subscription: { status: string | null; hasStripeSubscription: boolean; cancelAtPeriodEnd: boolean | null } }

interface MyDataResponse {
  user: {
    id: string; email: string; firstName: string | null; lastName: string | null;
    role: string | null; emailVerified: boolean | null; privacyAcceptedAt: string | null;
    consentAiProcessing: boolean | null; consentEmailMarketing: boolean | null;
    consentThirdPartySharing: boolean | null; createdAt: string | null;
  };
  companies: Array<{ id: string; cui: string; name: string; caen: string; address: string; createdAt: string }>;
  projects: Array<{ id: string; name: string; status: string; createdAt: string }>;
  documents: Array<{ id: string; name: string; file_type: string; created_at: string }>;
  eligibilityReportsCount: number;
  auditLogEntriesCount: number;
}

interface ConsentsData {
  consentAiProcessing: boolean | null;
  consentEmailMarketing: boolean | null;
  consentThirdPartySharing: boolean | null;
}

function formatDateRO(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function formatDateTimeRO(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ProfileTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: usageData } = useQuery<UsageData>({ queryKey: ["/api/usage"] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: deletePreview, isLoading: previewLoading } = useQuery<{ companies: number; projects: number; documents: number; eligibilityReports: number }>({
    queryKey: ["/api/auth/delete-preview"],
    enabled: showDeleteDialog,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/delete-account", { password: deletePassword });
      return res.json();
    },
    onSuccess: () => { window.location.href = "/auth"; },
    onError: (err: any) => { toast({ title: "Eroare", description: err.message, variant: "destructive" }); },
  });

  const initials = user ? `${(user.firstName?.[0] || "").toUpperCase()}${(user.lastName?.[0] || "").toUpperCase()}` : "?";

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profileImage", file);
      const res = await fetch("/api/profile/upload-image", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message || "Eroare la încărcare"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); toast({ title: "Imagine actualizată", description: "Imaginea de profil a fost schimbată." }); },
    onError: (err: any) => { toast({ title: "Eroare", description: err.message, variant: "destructive" }); },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword });
      return res.json();
    },
    onSuccess: (data: any) => { toast({ title: "Parola schimbata", description: data.message }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); },
    onError: (err: any) => { toast({ title: "Eroare", description: err.message, variant: "destructive" }); },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast({ title: "Eroare", description: "Imaginea trebuie să fie sub 5MB", variant: "destructive" }); return; }
      uploadMutation.mutate(file);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast({ title: "Eroare", description: "Parola nouă trebuie să aibă cel puțin 8 caractere", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Eroare", description: "Parolele noi nu coincid", variant: "destructive" }); return; }
    changePasswordMutation.mutate();
  };

  const roleLabel = user?.role === "super_admin" ? "Super Admin" : user?.role === "consultant" ? "Consultant" : "Utilizator";

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative group">
            <Avatar className="w-12 sm:w-16 h-12 sm:h-16 ring-2 ring-[hsl(48,100%,50%)]/40">
              {user?.profileImage && <AvatarImage src={user.profileImage} alt="Profil" />}
              <AvatarFallback className="text-base sm:text-lg bg-[hsl(228,100%,19.6%)] text-white">{initials}</AvatarFallback>
            </Avatar>
            <button type="button" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()} data-testid="button-upload-avatar">
              <Camera className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} data-testid="input-profile-image" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-semibold" data-testid="text-profile-name">{user?.firstName} {user?.lastName}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{roleLabel}</Badge>
              {user?.emailVerified && <Badge variant="secondary" className="text-xs gap-1"><CheckCircle2 className="w-3 h-3" />Verificat</Badge>}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        {uploadMutation.isPending && <p className="text-xs text-muted-foreground">Se încarcă imaginea...</p>}
        <Separator />
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Informații profil</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-2.5 sm:p-3">
              <User className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-foreground" />
              <div><p className="text-[10px] sm:text-xs text-muted-foreground">Nume complet</p><p className="text-xs sm:text-sm font-medium">{user?.firstName} {user?.lastName || "Nesetat"}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-2.5 sm:p-3">
              <Mail className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-foreground" />
              <div><p className="text-[10px] sm:text-xs text-muted-foreground">Email</p><p className="text-xs sm:text-sm font-medium">{user?.email || "Nesetat"}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-2.5 sm:p-3">
              <Shield className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-foreground" />
              <div><p className="text-[10px] sm:text-xs text-muted-foreground">Rol</p><p className="text-xs sm:text-sm font-medium">{roleLabel}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-2.5 sm:p-3">
              <Calendar className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-foreground" />
              <div><p className="text-[10px] sm:text-xs text-muted-foreground">Membru din</p><p className="text-xs sm:text-sm font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ro-RO") : "N/A"}</p></div>
            </div>
          </div>
        </div>
      </Card>

      {usageData && user?.role !== "super_admin" && (
        <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6 border-t-2 border-t-[hsl(228,100%,25%)]" data-testid="card-usage-quotas">
          <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-2"><BarChart3 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[hsl(228,100%,25%)]" />Utilizare cont</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground -mt-3 sm:-mt-4">Limitele se reseteaza automat conform perioadei indicate.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(usageData).map(([key, q]) => {
              const pct = q.max > 0 ? Math.round((q.used / q.max) * 100) : 0;
              const isNearLimit = pct >= 80;
              const isAtLimit = q.used >= q.max;
              return (
                <div key={key} className="rounded-lg border p-2.5 sm:p-3 space-y-1.5 sm:space-y-2" data-testid={`usage-${key}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium">{q.label}</span>
                    <Badge variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "outline"} className="text-xs">{q.period === "daily" ? "zilnic" : "lunar"}</Badge>
                  </div>
                  <Progress value={pct} className={`h-2 ${isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-yellow-500" : ""}`} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className={isAtLimit ? "text-red-600 font-medium" : ""}>{q.used} / {q.max}</span>
                    <span>Reset: {new Date(q.resetAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6 border-t-2 border-t-[hsl(228,100%,25%)]">
        <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-2"><Lock className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[hsl(228,100%,25%)]" />Schimbă parola</h3>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Parola curentă</Label>
            <div className="relative">
              <Input id="currentPassword" type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required data-testid="input-current-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Parola nouă</Label>
            <div className="relative">
              <Input id="newPassword" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} placeholder="Minim 8 caractere" data-testid="input-new-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPassword(!showNewPassword)}>
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} data-testid="input-confirm-new-password" />
          </div>
          <Button type="submit" disabled={changePasswordMutation.isPending} data-testid="button-change-password">
            {changePasswordMutation.isPending ? "Se procesează..." : "Schimbă parola"}
          </Button>
        </form>
      </Card>

      <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4 border-t-2 border-t-red-500" data-testid="card-delete-account">
        <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-2 text-red-600"><Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />Ștergere cont</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">Odată ce contul este șters, toate datele asociate vor fi eliminate permanent, inclusiv companiile, proiectele, documentele și rapoartele de eligibilitate. Această acțiune este ireversibilă.</p>
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => { setShowDeleteDialog(true); setDeletePassword(""); setDeleteConfirmText(""); }} data-testid="button-open-delete-dialog">
          <Trash2 className="w-4 h-4 mr-2" />Vreau să-mi șterg contul
        </Button>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!open) { setShowDeleteDialog(false); setDeletePassword(""); setDeleteConfirmText(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" />Ștergere definitivă cont</DialogTitle>
            <DialogDescription>Ești pe punctul de a șterge permanent contul <strong>{user?.email}</strong>. Această acțiune este ireversibilă.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 space-y-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />Următoarele date vor fi șterse permanent:</p>
              {previewLoading ? <p className="text-xs text-muted-foreground">Se încarcă...</p> : deletePreview ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-red-500" /><span><strong>{deletePreview.companies}</strong> {deletePreview.companies === 1 ? "companie" : "companii"}</span></div>
                  <div className="flex items-center gap-2 text-sm"><FolderOpen className="w-4 h-4 text-red-500" /><span><strong>{deletePreview.projects}</strong> {deletePreview.projects === 1 ? "proiect" : "proiecte"}</span></div>
                  <div className="flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-red-500" /><span><strong>{deletePreview.documents}</strong> {deletePreview.documents === 1 ? "document" : "documente"}</span></div>
                  <div className="flex items-center gap-2 text-sm"><ClipboardCheck className="w-4 h-4 text-red-500" /><span><strong>{deletePreview.eligibilityReports}</strong> {deletePreview.eligibilityReports === 1 ? "raport" : "rapoarte"} eligibilitate</span></div>
                </div>
              ) : null}
              <p className="text-xs text-red-600 dark:text-red-400">De asemenea, toate notificările, preferințele, feedback-ul și istoricul de utilizare vor fi șterse.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm" className="text-sm">Scrie <strong className="text-red-600">STERGE CONTUL</strong> pentru confirmare:</Label>
              <Input id="deleteConfirm" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="STERGE CONTUL" data-testid="input-delete-confirm-text" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deletePassword" className="text-sm">Introdu parola contului:</Label>
              <Input id="deletePassword" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Parola ta curentă" data-testid="input-delete-password" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} data-testid="button-cancel-delete-account">Anulează</Button>
            <Button variant="destructive" disabled={deleteConfirmText !== "STERGE CONTUL" || !deletePassword || deleteAccountMutation.isPending} onClick={() => deleteAccountMutation.mutate()} data-testid="button-confirm-delete-account">
              {deleteAccountMutation.isPending ? "Se șterge contul..." : "Șterge contul definitiv"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubscriptionTab() {
  const { toast } = useToast();
  const [txPage, setTxPage] = useState(1);
  const txLimit = 10;
  const [interval, setBillingIntervalState] = useState<"monthly" | "yearly">("monthly");

  const { data: balance, isLoading: balanceLoading } = useQuery<CreditBalance>({ queryKey: ["/api/credits/balance"] });
  const { data: costs, isLoading: costsLoading } = useQuery<CreditCost[]>({ queryKey: ["/api/credits/costs"] });
  const { data: txData, isLoading: txLoading } = useQuery<TransactionsResponse>({
    queryKey: ["/api/credits/transactions", txPage],
    queryFn: async () => { const res = await fetch(`/api/credits/transactions?page=${txPage}&limit=${txLimit}`, { credentials: "include" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });
  const { data: billing, isLoading: billingLoading, isError: billingError } = useQuery<BillingPlansResponse>({ queryKey: ["/api/billing/plans"] });
  const { data: billingStatus } = useQuery<BillingStatus>({ queryKey: ["/api/billing/status"] });

  // After returning from a Stripe/Netopia checkout (?checkout=success) refresh
  // billing state and clean the URL so a manual refresh doesn't re-toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/plans"] });
      toast({ title: "Plată confirmată", description: "Abonamentul/creditele au fost actualizate." });
      params.delete("checkout");
      window.history.replaceState({}, "", `/my-account?${params.toString()}`);
    }
  }, [toast]);

  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("POST", "/api/billing/checkout/subscription", { planId, interval });
      return res.json();
    },
    onSuccess: (data: any) => { if (data?.url) window.location.href = data.url; else toast({ title: "Eroare", description: "Nu s-a putut iniția plata.", variant: "destructive" }); },
    onError: (err: any) => { toast({ title: "Eroare", description: err?.message || "Nu s-a putut iniția plata abonamentului.", variant: "destructive" }); },
  });

  const creditMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const res = await apiRequest("POST", "/api/billing/checkout/credits", { packageId });
      return res.json();
    },
    onSuccess: (data: any) => { if (data?.url) window.location.href = data.url; else toast({ title: "Eroare", description: "Nu s-a putut iniția plata.", variant: "destructive" }); },
    onError: (err: any) => { toast({ title: "Eroare", description: err?.message || "Nu s-a putut iniția plata pachetului.", variant: "destructive" }); },
  });

  const portalMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/billing/portal", {}); return res.json(); },
    onSuccess: (data: any) => { if (data?.url) window.location.href = data.url; },
    onError: (err: any) => { toast({ title: "Eroare", description: err?.message || "Nu s-a putut deschide portalul de facturare.", variant: "destructive" }); },
  });

  const stripeEnabled = billing?.stripeEnabled ?? false;
  const currentSlug = balance?.plan?.slug ?? null;
  const hasActiveSub = billingStatus?.subscription?.status === "active" && !!billingStatus?.subscription?.hasStripeSubscription;
  // DB stochează NET; Stripe încasează BRUT = net × 1,21; afișăm „net + TVA (brut cu TVA)".
  const VAT_RATE = 0.21;
  const fmtRON = (v: number) =>
    new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  const totalTxPages = txData ? Math.ceil(txData.total / txLimit) : 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-3.5 sm:p-5" data-testid="card-credit-balance">
          {balanceLoading ? <div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-32" /></div> : (
            <>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2"><Coins className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[hsl(48,100%,45%)]" /><span>Sold credite</span></div>
              <p className="text-3xl sm:text-4xl font-bold" data-testid="text-balance-number">{balance?.creditBalance ?? 0}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">credite disponibile</p>
            </>
          )}
        </Card>
        <Card className="p-3.5 sm:p-5" data-testid="card-current-plan">
          {balanceLoading ? <div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-40" /></div> : (
            <>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2"><Crown className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[hsl(48,100%,45%)]" /><span>Plan curent</span></div>
              <p className="text-base sm:text-lg font-semibold" data-testid="text-plan-name">{balance?.plan?.name ?? "Fara plan"}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1" data-testid="text-monthly-credits">{balance?.plan?.monthlyCredits ?? 0} credite / luna</p>
            </>
          )}
        </Card>
        <Card className="p-3.5 sm:p-5" data-testid="card-next-reset">
          {balanceLoading ? <div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-40" /></div> : (
            <>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2"><CalendarClock className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[hsl(48,100%,45%)]" /><span>Următoarea reîncărcare</span></div>
              <p className="text-base sm:text-lg font-semibold" data-testid="text-next-reset">{balance?.subscription?.nextCreditResetAt ? formatDateRO(balance.subscription.nextCreditResetAt) : "--"}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{balance?.subscription?.status === "active" ? "Abonament activ" : "Fără abonament activ"}</p>
            </>
          )}
        </Card>
      </div>

      {balance?.cuiAllowance && balance.cuiAllowance.included > 0 && (
        <Card className="p-3.5 sm:p-5" data-testid="card-cui-allowance">
          <div className="flex items-center gap-2 mb-3"><Building2 className="w-4 sm:w-5 h-4 sm:h-5 text-[hsl(48,100%,45%)]" /><h2 className="text-sm sm:text-base font-semibold">Verificări CUI incluse luna aceasta</h2></div>
          <div className="flex items-end justify-between gap-4 mb-3">
            <div>
              <p className="text-3xl sm:text-4xl font-bold" data-testid="text-cui-remaining">{balance.cuiAllowance.remaining}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">din {balance.cuiAllowance.included} incluse rămase</p>
            </div>
            {balance.cuiAllowance.resetAt && (
              <p className="text-xs text-muted-foreground" data-testid="text-cui-reset">Reset: {formatDateRO(balance.cuiAllowance.resetAt)}</p>
            )}
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden" data-testid="progress-cui-allowance">
            <div className="h-full bg-[hsl(48,100%,45%)] transition-all" style={{ width: `${Math.min(100, Math.round((balance.cuiAllowance.used / balance.cuiAllowance.included) * 100))}%` }} />
          </div>
          {balance.cuiAllowance.remaining <= 0 && (
            <p className="text-xs text-muted-foreground mt-3" data-testid="text-cui-exhausted">Ai folosit toate verificările CUI incluse. Verificările suplimentare se taxează din creditele disponibile.</p>
          )}
        </Card>
      )}

      {balance?.plan?.features && balance.plan.features.length > 0 && (
        <Card className="p-3.5 sm:p-5" data-testid="card-plan-features">
          <h2 className="text-sm sm:text-base font-semibold mb-3">Funcționalități incluse</h2>
          <div className="flex flex-wrap gap-2">
            {balance.plan.features.map((feature, i) => <Badge key={i} variant="secondary" className="no-default-active-elevate" data-testid={`badge-feature-${i}`}>{getFeatureLabel(feature)}</Badge>)}
          </div>
        </Card>
      )}

      <Card className="p-3.5 sm:p-5" data-testid="card-credit-costs">
        <div className="flex items-center gap-2 mb-3 sm:mb-4"><Zap className="w-4 sm:w-5 h-4 sm:h-5 text-[hsl(48,100%,45%)]" /><h2 className="text-sm sm:text-base font-semibold">Cost acțiuni (credite)</h2></div>
        {costsLoading ? <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : costs && costs.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Acțiune</TableHead><TableHead>Descriere</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
            <TableBody>
              {costs.map((cost) => (
                <TableRow key={cost.action} data-testid={`row-cost-${cost.action}`}>
                  <TableCell className="font-medium">{cost.label}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{cost.description}</TableCell>
                  <TableCell className="text-right"><Badge variant="outline" className="no-default-active-elevate" data-testid={`badge-cost-${cost.action}`}>{cost.credit_cost} credite</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="text-sm text-muted-foreground">Nu există costuri definite.</p>}
      </Card>

      <Card className="p-3.5 sm:p-5" data-testid="card-transactions">
        <div className="flex items-center gap-2 mb-3 sm:mb-4"><CreditCard className="w-4 sm:w-5 h-4 sm:h-5 text-[hsl(48,100%,45%)]" /><h2 className="text-sm sm:text-base font-semibold">Istoric tranzacții</h2></div>
        {txLoading ? <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : txData && txData.transactions.length > 0 ? (
          <>
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descriere</TableHead><TableHead className="text-right">Suma</TableHead><TableHead className="text-right">Sold</TableHead></TableRow></TableHeader>
              <TableBody>
                {txData.transactions.map((tx) => (
                  <TableRow key={tx.id} data-testid={`row-tx-${tx.id}`}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTimeRO(tx.created_at)}</TableCell>
                    <TableCell className="text-sm">{formatTransactionDescription(tx.description)}</TableCell>
                    <TableCell className="text-right"><span className={`text-sm font-semibold ${tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid={`text-tx-amount-${tx.id}`}>{tx.amount > 0 ? "+" : ""}{tx.amount}</span></TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground" data-testid={`text-tx-balance-${tx.id}`}>{tx.balance_after}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalTxPages > 1 && (
              <div className="flex items-center justify-between gap-4 mt-4">
                <p className="text-xs text-muted-foreground" data-testid="text-tx-total">{txData.total} tranzacții total</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" disabled={txPage <= 1} onClick={() => setTxPage((p) => Math.max(1, p - 1))} data-testid="button-tx-prev"><ChevronLeft className="w-4 h-4" /></Button>
                  <span className="text-sm text-muted-foreground" data-testid="text-tx-page">{txPage} / {totalTxPages}</span>
                  <Button variant="outline" size="icon" disabled={txPage >= totalTxPages} onClick={() => setTxPage((p) => Math.min(totalTxPages, p + 1))} data-testid="button-tx-next"><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </>
        ) : <p className="text-sm text-muted-foreground">Nu există tranzacții încă.</p>}
      </Card>

      {/* ── Planuri & credite: stări de încărcare / eroare ── */}
      {billingLoading && (
        <Card className="p-3.5 sm:p-5" data-testid="state-billing-loading">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Se încarcă planurile și pachetele de credite...</div>
        </Card>
      )}
      {billingError && !billingLoading && (
        <Card className="p-3.5 sm:p-5" data-testid="state-billing-error">
          <p className="text-sm text-destructive">Nu am putut încărca planurile de abonament. Reîncarcă pagina sau încearcă din nou mai târziu.</p>
        </Card>
      )}

      {/* ── Cumpără credite (pachete plată unică) ── */}
      {billing?.creditPackages && billing.creditPackages.length > 0 && (
        <Card className="p-3.5 sm:p-5" data-testid="card-credit-packages">
          <div className="flex items-center gap-2 mb-1"><Coins className="w-4 sm:w-5 h-4 sm:h-5 text-[hsl(48,100%,45%)]" /><h2 className="text-sm sm:text-base font-semibold">Cumpără credite</h2></div>
          <p className="text-xs text-muted-foreground mb-4">Pachete de credite suplimentare, plată unică.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {billing.creditPackages.map((pkg) => (
              <Card key={pkg.id} className="p-3 sm:p-4 flex flex-col" data-testid={`card-package-${pkg.id}`}>
                <h3 className="font-semibold">{pkg.name}</h3>
                <p className="text-2xl font-bold mt-1" data-testid={`text-package-credits-${pkg.id}`}>{pkg.credits} <span className="text-sm font-normal text-muted-foreground">credite</span></p>
                {pkg.price != null && (
                  <div className="mt-1" data-testid={`text-package-price-${pkg.id}`}>
                    <p className="text-sm text-muted-foreground">{fmtRON(pkg.price)} {(pkg.currency || "RON").toUpperCase()} + TVA</p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-package-price-gross-${pkg.id}`}>({fmtRON(pkg.price * (1 + VAT_RATE))} {(pkg.currency || "RON").toUpperCase()} cu TVA)</p>
                  </div>
                )}
                <Button className="w-full mt-3 gap-2" disabled={!stripeEnabled || creditMutation.isPending} onClick={() => creditMutation.mutate(pkg.id)} data-testid={`button-buy-package-${pkg.id}`}>
                  <CreditCard className="w-4 h-4" />{creditMutation.isPending ? "Se redirecționează..." : "Cumpără"}
                </Button>
              </Card>
            ))}
          </div>
          {!stripeEnabled && <p className="text-xs text-muted-foreground mt-3">Plățile online nu sunt disponibile momentan.</p>}
        </Card>
      )}

      {/* ── Planuri de abonament ── */}
      {billing?.plans && billing.plans.length > 0 && (
        <Card className="p-3.5 sm:p-5" data-testid="card-plans">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-sm sm:text-base font-semibold">Planuri de abonament</h2>
            <div className="inline-flex items-center rounded-lg border p-0.5 self-start" data-testid="toggle-interval">
              <button type="button" onClick={() => setBillingIntervalState("monthly")} className={`px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${interval === "monthly" ? "bg-[hsl(228,100%,25%)] text-white" : "text-muted-foreground"}`} data-testid="button-interval-monthly">Lunar</button>
              <button type="button" onClick={() => setBillingIntervalState("yearly")} className={`px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${interval === "yearly" ? "bg-[hsl(228,100%,25%)] text-white" : "text-muted-foreground"}`} data-testid="button-interval-yearly">Anual</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {billing.plans.map((plan) => {
              const isCurrent = currentSlug === plan.slug;
              const isFree = plan.slug === "free";
              const price = interval === "yearly" ? plan.priceYearly : plan.priceMonthly;
              const cur = (plan.currency || "RON").toUpperCase();
              return (
                <Card key={plan.id} className={`p-3 sm:p-4 flex flex-col ${isCurrent ? "ring-2 ring-[hsl(48,100%,50%)]" : ""}`} data-testid={`card-plan-${plan.slug}`}>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold">{plan.name}</h3>
                      {isCurrent && <Badge variant="default" className="no-default-active-elevate" data-testid="badge-current-plan">Planul tău</Badge>}
                    </div>
                    {price != null && price > 0 ? (
                      <div>
                        <p className="text-xl font-bold" data-testid={`text-price-${plan.slug}`}>{fmtRON(price)} {cur}<span className="text-xs font-normal text-muted-foreground"> + TVA / {interval === "yearly" ? "an" : "lună"}</span></p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-price-gross-${plan.slug}`}>({fmtRON(price * (1 + VAT_RATE))} {cur} cu TVA)</p>
                      </div>
                    ) : isFree ? (
                      <p className="text-xl font-bold" data-testid={`text-price-${plan.slug}`}>Gratuit</p>
                    ) : null}
                    {plan.description && <p className="text-xs sm:text-sm text-muted-foreground">{plan.description}</p>}
                    <div className="space-y-1 text-xs sm:text-sm">
                      <p><span className="font-medium">{plan.monthlyCredits}</span> credite / lună</p>
                      <p><span className="font-medium">{plan.maxCompanies}</span> companii</p>
                      <p><span className="font-medium">{plan.maxProjects}</span> proiecte</p>
                      {plan.includedCuiPerMonth > 0 && <p><span className="font-medium">{plan.includedCuiPerMonth}</span> verificări CUI / lună</p>}
                    </div>
                    {plan.features && plan.features.length > 0 && (
                      <div className="flex flex-wrap gap-1">{plan.features.map((f, i) => <Badge key={i} variant="secondary" className="text-xs no-default-active-elevate">{getFeatureLabel(f)}</Badge>)}</div>
                    )}
                  </div>
                  <div className="mt-3">
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled data-testid={`button-plan-current-${plan.slug}`}>Plan curent</Button>
                    ) : isFree ? (
                      <Button variant="outline" className="w-full" disabled data-testid={`button-plan-free-${plan.slug}`}>Plan gratuit</Button>
                    ) : (
                      <Button className="w-full gap-2" disabled={!stripeEnabled || subscribeMutation.isPending} onClick={() => subscribeMutation.mutate(plan.id)} data-testid={`button-subscribe-${plan.slug}`}>
                        <Crown className="w-4 h-4" />{subscribeMutation.isPending ? "Se redirecționează..." : "Abonează-te"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
          {!stripeEnabled && <p className="text-xs text-muted-foreground mt-3">Plățile online nu sunt disponibile momentan. Contactează-ne pentru activare manuală.</p>}
          {hasActiveSub && (
            <div className="mt-4">
              <Button variant="outline" className="gap-2" disabled={portalMutation.isPending} onClick={() => portalMutation.mutate()} data-testid="button-billing-portal">
                <CreditCard className="w-4 h-4" />{portalMutation.isPending ? "Se deschide..." : "Gestionează abonamentul"}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function DataGdprTab() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery<MyDataResponse>({ queryKey: ["/api/auth/my-data"] });
  const { data: consents, isLoading: consentsLoading } = useQuery<ConsentsData>({ queryKey: ["/api/auth/consents"] });

  const updateConsentMutation = useMutation({
    mutationFn: async (updates: Partial<ConsentsData>) => { const res = await apiRequest("PUT", "/api/auth/consents", updates); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/auth/consents"] }); queryClient.invalidateQueries({ queryKey: ["/api/auth/my-data"] }); toast({ title: "Actualizat", description: "Consimtamantul a fost actualizat cu succes." }); },
    onError: () => { toast({ title: "Eroare", description: "Nu s-a putut actualiza consimtamantul.", variant: "destructive" }); },
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/auth/gdpr-export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `gdpr-export-${Date.now()}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      toast({ title: "Export finalizat", description: "Fișierul PDF a fost descărcat." });
    } catch { toast({ title: "Eroare", description: "Exportul datelor a eșuat.", variant: "destructive" }); } finally { setExporting(false); }
  };

  const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ro-RO", { year: "numeric", month: "long", day: "numeric" }) : "--";

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>;

  const user = data?.user;

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2"><Info className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-500" />Date personale stocate</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
          <div><span className="text-muted-foreground">Nume complet:</span><span className="ml-2 font-medium" data-testid="text-my-name">{user?.firstName} {user?.lastName}</span></div>
          <div><span className="text-muted-foreground">Email:</span><span className="ml-2 font-medium" data-testid="text-my-email">{user?.email}</span></div>
          <div><span className="text-muted-foreground">Rol:</span><Badge variant="secondary" className="ml-2" data-testid="text-my-role">{user?.role}</Badge></div>
          <div><span className="text-muted-foreground">Email verificat:</span><Badge variant={user?.emailVerified ? "default" : "destructive"} className="ml-2">{user?.emailVerified ? "Da" : "Nu"}</Badge></div>
          <div><span className="text-muted-foreground">Cont creat:</span><span className="ml-2" data-testid="text-my-created">{fmtDate(user?.createdAt)}</span></div>
          <div><span className="text-muted-foreground">GDPR acceptat:</span><span className="ml-2">{fmtDate(user?.privacyAcceptedAt)}</span></div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2"><ClipboardList className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-500" />Date stocate -- sumar</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg"><Building2 className="w-4 sm:w-5 h-4 sm:h-5 mx-auto text-muted-foreground mb-1" /><div className="text-xl sm:text-2xl font-bold" data-testid="text-count-companies">{data?.companies?.length || 0}</div><div className="text-[10px] sm:text-xs text-muted-foreground">Companii</div></div>
          <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg"><FolderOpen className="w-4 sm:w-5 h-4 sm:h-5 mx-auto text-muted-foreground mb-1" /><div className="text-xl sm:text-2xl font-bold" data-testid="text-count-projects">{data?.projects?.length || 0}</div><div className="text-[10px] sm:text-xs text-muted-foreground">Proiecte</div></div>
          <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg"><FileText className="w-4 sm:w-5 h-4 sm:h-5 mx-auto text-muted-foreground mb-1" /><div className="text-xl sm:text-2xl font-bold" data-testid="text-count-documents">{data?.documents?.length || 0}</div><div className="text-[10px] sm:text-xs text-muted-foreground">Documente</div></div>
          <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg"><Shield className="w-4 sm:w-5 h-4 sm:h-5 mx-auto text-muted-foreground mb-1" /><div className="text-xl sm:text-2xl font-bold" data-testid="text-count-reports">{data?.eligibilityReportsCount || 0}</div><div className="text-[10px] sm:text-xs text-muted-foreground">Rapoarte eligibilitate</div></div>
        </div>
        {data?.companies && data.companies.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Companii inregistrate</h3>
            <Table><TableHeader><TableRow><TableHead>Nume</TableHead><TableHead>CUI</TableHead><TableHead>CAEN</TableHead><TableHead>Data inregistrarii</TableHead></TableRow></TableHeader>
              <TableBody>{data.companies.map((c) => <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.cui}</TableCell><TableCell>{c.caen || "--"}</TableCell><TableCell>{fmtDate(c.createdAt)}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
        )}
        {data?.documents && data.documents.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Documente încărcate</h3>
            <Table><TableHeader><TableRow><TableHead>Nume</TableHead><TableHead>Tip</TableHead><TableHead>Data încărcării</TableHead></TableRow></TableHeader>
              <TableBody>{data.documents.map((d) => <TableRow key={d.id}><TableCell className="font-medium">{d.name}</TableCell><TableCell>{d.file_type || "--"}</TableCell><TableCell>{fmtDate(d.created_at)}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2"><Shield className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-500" />Consimțăminte GDPR</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Controlează modul în care datele tale sunt procesate. Poți modifica aceste setări oricând.</p>
        {consentsLoading ? <Skeleton className="h-20" /> : (
          <div className="space-y-3 sm:space-y-5">
            <div className="flex items-start justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-start gap-2 sm:gap-3"><Brain className="w-4 sm:w-5 h-4 sm:h-5 text-purple-500 mt-0.5 shrink-0" /><div><Label className="text-xs sm:text-sm font-semibold">Procesare date cu Inteligență Artificială</Label><p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Permite platformei să trimită datele tale către modele AI pentru analiză de eligibilitate, conformitate, potrivire și chat.</p></div></div>
              <Switch checked={consents?.consentAiProcessing ?? false} onCheckedChange={(checked) => updateConsentMutation.mutate({ consentAiProcessing: checked })} disabled={updateConsentMutation.isPending} data-testid="switch-consent-ai" />
            </div>
            <div className="flex items-start justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-start gap-2 sm:gap-3"><Mail className="w-4 sm:w-5 h-4 sm:h-5 text-blue-500 mt-0.5 shrink-0" /><div><Label className="text-xs sm:text-sm font-semibold">Comunicări prin email</Label><p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Permite trimiterea de emailuri informative despre noi apeluri de finanțare, actualizări ale platformei și sfaturi utile.</p></div></div>
              <Switch checked={consents?.consentEmailMarketing ?? false} onCheckedChange={(checked) => updateConsentMutation.mutate({ consentEmailMarketing: checked })} disabled={updateConsentMutation.isPending} data-testid="switch-consent-email" />
            </div>
            <div className="flex items-start justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-start gap-2 sm:gap-3"><Share2 className="w-4 sm:w-5 h-4 sm:h-5 text-orange-500 mt-0.5 shrink-0" /><div><Label className="text-xs sm:text-sm font-semibold">Partajare date cu terțe părți</Label><p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Permite partajarea datelor agregate (anonimizate) cu parteneri pentru îmbunătățirea serviciilor.</p></div></div>
              <Switch checked={consents?.consentThirdPartySharing ?? false} onCheckedChange={(checked) => updateConsentMutation.mutate({ consentThirdPartySharing: checked })} disabled={updateConsentMutation.isPending} data-testid="switch-consent-third-party" />
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2"><Download className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-500" />Export date personale (GDPR Art. 20)</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Descarcă un raport complet cu toate datele tale personale stocate pe platformă, în format PDF.</p>
        <Button onClick={handleExport} disabled={exporting} variant="outline" data-testid="button-gdpr-export"><Download className="w-4 h-4 mr-2" />{exporting ? "Se generează..." : "Descarcă raportul GDPR"}</Button>
      </Card>

      <Card className="p-4 sm:p-6 space-y-3 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300"><AlertTriangle className="w-3.5 sm:w-4 h-3.5 sm:h-4" />Politica de retenție date</h2>
        <div className="text-xs sm:text-sm text-amber-900/80 dark:text-amber-200/70 space-y-2">
          <p><strong>Documente încărcate:</strong> Păstrate pe toată durata existenței contului. La ștergerea contului, toate documentele sunt eliminate definitiv în termen de 30 de zile.</p>
          <p><strong>Date companii:</strong> Informațiile companiilor (CUI, date financiare) sunt șterse la eliminarea companiei sau a contului.</p>
          <p><strong>Rapoarte AI:</strong> Rapoartele de eligibilitate și conformitate sunt șterse odată cu ștergerea contului.</p>
          <p><strong>Jurnale de audit:</strong> Înregistrările de activitate sunt anonimizate la ștergerea contului, conform cerințelor legale de trasabilitate.</p>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground text-center pb-4">
        Ai {data?.auditLogEntriesCount || 0} inregistrari in jurnalul de activitate. ID cont: {data?.user?.id?.substring(0, 8)}...
      </div>
    </div>
  );
}

interface BillingProfileData {
  id: string;
  userId: string;
  entityType: "b2c" | "b2b";
  companyName: string | null;
  cui: string | null;
  regCom: string | null;
  address: string | null;
  county: string | null;
  country: string | null;
  email: string | null;
  isVatPayer: boolean;
}

const CUI_CLIENT_RE = /^(RO)?\d{2,10}$/i;

function BillingProfileTab() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<BillingProfileData | null>({ queryKey: ["/api/billing/profile"] });

  const [entityType, setEntityType] = useState<"b2c" | "b2b">("b2c");
  const [companyName, setCompanyName] = useState("");
  const [cui, setCui] = useState("");
  const [regCom, setRegCom] = useState("");
  const [address, setAddress] = useState("");
  const [county, setCounty] = useState("");
  const [country, setCountry] = useState("RO");
  const [email, setEmail] = useState("");
  const [isVatPayer, setIsVatPayer] = useState(true);

  useEffect(() => {
    if (data) {
      setEntityType(data.entityType === "b2b" ? "b2b" : "b2c");
      setCompanyName(data.companyName || "");
      setCui(data.cui || "");
      setRegCom(data.regCom || "");
      setAddress(data.address || "");
      setCounty(data.county || "");
      setCountry(data.country || "RO");
      setEmail(data.email || "");
      setIsVatPayer(data.isVatPayer ?? true);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/billing/profile", {
        entityType,
        companyName: entityType === "b2b" ? companyName : null,
        cui: entityType === "b2b" ? cui : null,
        regCom: entityType === "b2b" ? regCom : null,
        address,
        county,
        country,
        email,
        isVatPayer: entityType === "b2b" ? isVatPayer : false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/profile"] });
      toast({ title: "Salvat", description: "Datele de facturare au fost actualizate." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err?.message || "Nu s-au putut salva datele de facturare.", variant: "destructive" });
    },
  });

  const cuiValid = CUI_CLIENT_RE.test(cui.replace(/\s+/g, ""));
  const b2bInvalid = entityType === "b2b" && (!companyName.trim() || !cuiValid);

  const handleSave = () => {
    if (entityType === "b2b") {
      if (!companyName.trim()) {
        toast({ title: "Câmp obligatoriu", description: "Denumirea firmei este obligatorie pentru firme (B2B).", variant: "destructive" });
        return;
      }
      if (!cuiValid) {
        toast({ title: "CUI invalid", description: "Format acceptat: opțional „RO” urmat de 2–10 cifre.", variant: "destructive" });
        return;
      }
    }
    saveMutation.mutate();
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>;

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div>
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2"><Receipt className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-500" />Date de facturare</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Aceste date sunt folosite pentru emiterea facturilor fiscale. Alege persoană fizică (B2C) sau firmă (B2B).
          </p>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant={entityType === "b2c" ? "default" : "outline"} className="flex-1" onClick={() => setEntityType("b2c")} data-testid="button-entity-b2c">
            <User className="w-4 h-4 mr-2" />Persoană fizică
          </Button>
          <Button type="button" variant={entityType === "b2b" ? "default" : "outline"} className="flex-1" onClick={() => setEntityType("b2b")} data-testid="button-entity-b2b">
            <Building2 className="w-4 h-4 mr-2" />Firmă (B2B)
          </Button>
        </div>

        {entityType === "b2b" && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-3 sm:p-4">
            <div className="space-y-1.5">
              <Label htmlFor="bp-company">Denumire firmă <span className="text-red-500">*</span></Label>
              <Input id="bp-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: EXEMPLU SRL" data-testid="input-billing-company" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bp-cui">CUI / CIF <span className="text-red-500">*</span></Label>
                <Input id="bp-cui" value={cui} onChange={(e) => setCui(e.target.value)} placeholder="Ex: RO12345678" data-testid="input-billing-cui" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Opțional „RO” urmat de 2–10 cifre.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bp-regcom">Nr. Reg. Comerțului</Label>
                <Input id="bp-regcom" value={regCom} onChange={(e) => setRegCom(e.target.value)} placeholder="Ex: J40/1234/2020" data-testid="input-billing-regcom" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3">
              <div>
                <Label className="text-xs sm:text-sm font-semibold">Plătitor de TVA</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Bifează dacă firma este înregistrată în scopuri de TVA.</p>
              </div>
              <Switch checked={isVatPayer} onCheckedChange={setIsVatPayer} data-testid="switch-billing-vat" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bp-address">Adresă</Label>
            <Input id="bp-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Stradă, număr, oraș" data-testid="input-billing-address" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-county">Județ</Label>
            <Input id="bp-county" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Ex: Cluj" data-testid="input-billing-county" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-country">Țară</Label>
            <Input id="bp-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="RO" data-testid="input-billing-country" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bp-email">Email de facturare</Label>
            <Input id="bp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Opțional — implicit emailul contului" data-testid="input-billing-email" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveMutation.isPending || b2bInvalid} data-testid="button-save-billing-profile">
            {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se salvează...</> : "Salvează datele de facturare"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

const VALID_TABS = ["profil", "abonament", "date-facturare", "date-gdpr"] as const;
type TabValue = typeof VALID_TABS[number];

function getTabFromUrl(): TabValue {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab && (VALID_TABS as readonly string[]).includes(tab)) return tab as TabValue;
  return "profil";
}

export default function MyAccountPage() {
  const [activeTab, setActiveTab] = useState<TabValue>(getTabFromUrl);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight" data-testid="text-account-title">Contul meu</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Gestionează profilul, abonamentul și datele tale personale.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => {
        const tab = val as TabValue;
        setActiveTab(tab);
        const url = tab === "profil" ? "/my-account" : `/my-account?tab=${tab}`;
        window.history.replaceState(null, "", url);
      }}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profil" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-profil">
            <User className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1 sm:mr-1.5" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="abonament" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-abonament">
            <Coins className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1 sm:mr-1.5" />
            Abonament
          </TabsTrigger>
          <TabsTrigger value="date-facturare" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-date-facturare">
            <Receipt className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1 sm:mr-1.5" />
            <span className="hidden sm:inline">Date de facturare</span>
            <span className="sm:hidden">Facturare</span>
          </TabsTrigger>
          <TabsTrigger value="date-gdpr" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-date-gdpr">
            <Shield className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1 sm:mr-1.5" />
            <span className="hidden sm:inline">Date si GDPR</span>
            <span className="sm:hidden">GDPR</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profil" className="mt-6"><ProfileTab /></TabsContent>
        <TabsContent value="abonament" className="mt-6"><SubscriptionTab /></TabsContent>
        <TabsContent value="date-facturare" className="mt-6"><BillingProfileTab /></TabsContent>
        <TabsContent value="date-gdpr" className="mt-6"><DataGdprTab /></TabsContent>
      </Tabs>
    </div>
  );
}
