import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFeatureLabel, formatTransactionDescription } from "@/lib/labels";
import {
  Coins,
  CalendarClock,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Mail,
  Zap,
  Crown,
  Send,
} from "lucide-react";
import { Link } from "wouter";

interface CreditBalance {
  creditBalance: number;
  plan: {
    id: string;
    name: string;
    slug: string;
    monthlyCredits: number;
    maxCompanies: number;
    maxProjects: number;
    features: string[] | null;
  } | null;
  subscription: {
    status: string | null;
    nextCreditResetAt: string | null;
    currentPeriodStart: string | null;
  };
}

interface CreditCost {
  action: string;
  credit_cost: number;
  label: string;
  description: string;
}

interface CreditTransaction {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  action: string;
  reference_id: string | null;
  description: string;
  created_at: string;
}

interface TransactionsResponse {
  transactions: CreditTransaction[];
  total: number;
  page: number;
  limit: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthly_credits: number;
  max_companies: number;
  max_projects: number;
  features: string[] | null;
  is_public: boolean;
}

function formatDateRO(dateStr: string) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatDateTimeRO(dateStr: string) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [txPage, setTxPage] = useState(1);
  const txLimit = 10;
  const [contactPlan, setContactPlan] = useState<string | null>(null);
  const [contactCompany, setContactCompany] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const contactMutation = useMutation({
    mutationFn: async (data: { planName: string; companyName: string; phone: string; message: string }) => {
      const res = await apiRequest("POST", "/api/contact-plan", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Cerere trimisă", description: data.message || "Te vom contacta în curând!" });
      setContactPlan(null);
      setContactCompany("");
      setContactPhone("");
      setContactMessage("");
    },
    onError: () => {
      toast({ title: "Eroare", description: "Trimiterea cererii a eșuat. Încearcă din nou.", variant: "destructive" });
    },
  });

  const { data: balance, isLoading: balanceLoading } = useQuery<CreditBalance>({
    queryKey: ["/api/credits/balance"],
  });

  const { data: costs, isLoading: costsLoading } = useQuery<CreditCost[]>({
    queryKey: ["/api/credits/costs"],
  });

  const { data: txData, isLoading: txLoading } = useQuery<TransactionsResponse>({
    queryKey: ["/api/credits/transactions", txPage],
    queryFn: async () => {
      const res = await fetch(`/api/credits/transactions?page=${txPage}&limit=${txLimit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });

  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const totalTxPages = txData ? Math.ceil(txData.total / txLimit) : 1;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Abonament & Credite</h1>
          <p className="text-sm text-muted-foreground">Gestionează planul tău și monitorizează consumul de credite</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5" data-testid="card-credit-balance">
          {balanceLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Coins className="w-4 h-4 text-[hsl(48,100%,45%)]" />
                <span>Sold credite</span>
              </div>
              <p className="text-4xl font-bold" data-testid="text-balance-number">
                {balance?.creditBalance ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">credite disponibile</p>
            </>
          )}
        </Card>

        <Card className="p-5" data-testid="card-current-plan">
          {balanceLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-40" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Crown className="w-4 h-4 text-[hsl(48,100%,45%)]" />
                <span>Plan curent</span>
              </div>
              <p className="text-lg font-semibold" data-testid="text-plan-name">
                {balance?.plan?.name ?? "Fără plan"}
              </p>
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-monthly-credits">
                {balance?.plan?.monthlyCredits ?? 0} credite / lună
              </p>
            </>
          )}
        </Card>

        <Card className="p-5" data-testid="card-next-reset">
          {balanceLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-40" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <CalendarClock className="w-4 h-4 text-[hsl(48,100%,45%)]" />
                <span>Următoarea reîncărcare</span>
              </div>
              <p className="text-lg font-semibold" data-testid="text-next-reset">
                {balance?.subscription?.nextCreditResetAt
                  ? formatDateRO(balance.subscription.nextCreditResetAt)
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {balance?.subscription?.status === "active" ? "Abonament activ" : "Fără abonament activ"}
              </p>
            </>
          )}
        </Card>
      </div>

      {balance?.plan?.features && balance.plan.features.length > 0 && (
        <Card className="p-5" data-testid="card-plan-features">
          <h2 className="text-base font-semibold mb-3">Funcționalități incluse</h2>
          <div className="flex flex-wrap gap-2">
            {balance.plan.features.map((feature, i) => (
              <Badge key={i} variant="secondary" className="no-default-active-elevate" data-testid={`badge-feature-${i}`}>
                {getFeatureLabel(feature)}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5" data-testid="card-credit-costs">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[hsl(48,100%,45%)]" />
          <h2 className="text-base font-semibold">Cost acțiuni (credite)</h2>
        </div>
        {costsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : costs && costs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acțiune</TableHead>
                <TableHead>Descriere</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost) => (
                <TableRow key={cost.action} data-testid={`row-cost-${cost.action}`}>
                  <TableCell className="font-medium">{cost.label}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{cost.description}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="no-default-active-elevate" data-testid={`badge-cost-${cost.action}`}>
                      {cost.credit_cost} credite
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Nu există costuri definite.</p>
        )}
      </Card>

      <Card className="p-5" data-testid="card-transactions">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-[hsl(48,100%,45%)]" />
          <h2 className="text-base font-semibold">Istoric tranzacții</h2>
        </div>
        {txLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : txData && txData.transactions.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descriere</TableHead>
                  <TableHead className="text-right">Sumă</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txData.transactions.map((tx) => (
                  <TableRow key={tx.id} data-testid={`row-tx-${tx.id}`}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTimeRO(tx.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">{formatTransactionDescription(tx.description)}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-sm font-semibold ${tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        data-testid={`text-tx-amount-${tx.id}`}
                      >
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground" data-testid={`text-tx-balance-${tx.id}`}>
                      {tx.balance_after}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalTxPages > 1 && (
              <div className="flex items-center justify-between gap-4 mt-4">
                <p className="text-xs text-muted-foreground" data-testid="text-tx-total">
                  {txData.total} tranzacții total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={txPage <= 1}
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    data-testid="button-tx-prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground" data-testid="text-tx-page">
                    {txPage} / {totalTxPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={txPage >= totalTxPages}
                    onClick={() => setTxPage((p) => Math.min(totalTxPages, p + 1))}
                    data-testid="button-tx-next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nu există tranzacții încă.</p>
        )}
      </Card>

      {plans && plans.length > 0 && (
        <Card className="p-5" data-testid="card-plans">
          <h2 className="text-base font-semibold mb-4">Planuri disponibile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.filter(p => p.is_public).map((plan) => {
              const isCurrent = balance?.plan?.slug === plan.slug;
              return (
                <Card
                  key={plan.id}
                  className={`p-4 ${isCurrent ? "ring-2 ring-[hsl(48,100%,50%)]" : ""}`}
                  data-testid={`card-plan-${plan.slug}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold">{plan.name}</h3>
                      {isCurrent && (
                        <Badge variant="default" className="no-default-active-elevate" data-testid="badge-current-plan">
                          Planul tău
                        </Badge>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">{plan.monthly_credits}</span> credite / lună</p>
                      <p><span className="font-medium">{plan.max_companies}</span> companii</p>
                      <p><span className="font-medium">{plan.max_projects}</span> proiecte</p>
                    </div>
                    {plan.features && plan.features.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {plan.features.map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-xs no-default-active-elevate">
                            {getFeatureLabel(f)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {!isCurrent && (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => setContactPlan(plan.name)}
                        data-testid={`button-contact-plan-${plan.slug}`}
                      >
                        <Mail className="w-4 h-4" />
                        Contactează-ne
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}
      <Dialog open={!!contactPlan} onOpenChange={(open) => { if (!open) { setContactPlan(null); setContactCompany(""); setContactPhone(""); setContactMessage(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicită planul {contactPlan}</DialogTitle>
            <DialogDescription>
              Completează datele de mai jos și echipa noastră te va contacta pentru activarea planului.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-company">Numele companiei *</Label>
              <Input
                id="contact-company"
                value={contactCompany}
                onChange={(e) => setContactCompany(e.target.value)}
                placeholder="ex: SC Exemplu SRL"
                data-testid="input-contact-company"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Telefon</Label>
              <Input
                id="contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="ex: 0740 123 456"
                data-testid="input-contact-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Mesaj (opțional)</Label>
              <Textarea
                id="contact-message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Detalii suplimentare despre nevoile tale..."
                rows={3}
                data-testid="input-contact-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactPlan(null)} data-testid="button-cancel-contact">
              Anulează
            </Button>
            <Button
              onClick={() => {
                if (contactPlan && contactCompany.trim()) {
                  contactMutation.mutate({
                    planName: contactPlan,
                    companyName: contactCompany.trim(),
                    phone: contactPhone.trim(),
                    message: contactMessage.trim(),
                  });
                }
              }}
              disabled={contactMutation.isPending || !contactCompany.trim()}
              data-testid="button-send-contact"
            >
              <Send className="w-4 h-4 mr-2" />
              {contactMutation.isPending ? "Se trimite..." : "Trimite cererea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
