import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Sparkles, Coins } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyCredits: number;
  maxCompanies: number;
  maxProjects: number;
  features: string[] | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string | null;
  includedCuiPerMonth: number;
  seats: number;
  stripePriceId: string | null;
  stripePriceIdYearly: string | null;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number | null;
  currency: string | null;
  stripePriceId: string | null;
}

interface BillingPlansResponse {
  plans: Plan[];
  creditPackages: CreditPackage[];
  stripeEnabled: boolean;
}

// Minimal shape needed to mark the user's active plan. `/api/credits/balance`
// returns the resolved current plan (free or the active subscription's plan).
interface CreditBalanceResponse {
  plan: { slug: string } | null;
}

// DB stochează NET; Stripe încasează BRUT = net × 1,21; afișăm „net + TVA (brut cu TVA)".
const VAT_RATE = 0.21;

function fmtRON(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function PricingPage() {
  const { toast } = useToast();
  const [yearly, setYearly] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<BillingPlansResponse>({
    queryKey: ["/api/billing/plans"],
  });

  // Current plan for the logged-in user; null for guests (returnNull on 401) so
  // the pricing page renders publicly without marking any plan as current.
  const { data: balance } = useQuery<CreditBalanceResponse | null>({
    queryKey: ["/api/credits/balance"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const currentSlug = balance?.plan?.slug ?? null;

  async function subscribe(plan: Plan) {
    if (!data?.stripeEnabled) {
      toast({ title: "Indisponibil", description: "Plățile nu sunt active momentan.", variant: "destructive" });
      return;
    }
    const interval = yearly ? "yearly" : "monthly";
    const hasPrice = yearly ? plan.stripePriceIdYearly : plan.stripePriceId;
    if (!hasPrice) {
      toast({ title: "Indisponibil", description: "Acest plan nu este disponibil pentru intervalul ales.", variant: "destructive" });
      return;
    }
    try {
      setPendingId(plan.id);
      const res = await apiRequest("POST", "/api/billing/checkout/subscription", { planId: plan.id, interval });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch (err: any) {
      toast({ title: "Eroare", description: err?.message || "Nu am putut iniția plata.", variant: "destructive" });
    } finally {
      setPendingId(null);
    }
  }

  async function buyCredits(pkg: CreditPackage) {
    if (!data?.stripeEnabled) {
      toast({ title: "Indisponibil", description: "Plățile nu sunt active momentan.", variant: "destructive" });
      return;
    }
    try {
      setPendingId(pkg.id);
      const res = await apiRequest("POST", "/api/billing/checkout/credits", { packageId: pkg.id });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch (err: any) {
      toast({ title: "Eroare", description: err?.message || "Nu am putut iniția plata.", variant: "destructive" });
    } finally {
      setPendingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" data-testid="loading-pricing">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const plans = data?.plans || [];
  const packages = data?.creditPackages || [];

  return (
    <div className="container max-w-6xl mx-auto px-4 py-10 space-y-12">
      <header className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-pricing-title">
          Planuri și prețuri
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Alege planul potrivit companiei tale. Poți schimba sau anula oricând.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Label htmlFor="billing-toggle" className={!yearly ? "font-semibold" : "text-muted-foreground"}>
            Lunar
          </Label>
          <Switch id="billing-toggle" checked={yearly} onCheckedChange={setYearly} data-testid="switch-billing-interval" />
          <Label htmlFor="billing-toggle" className={yearly ? "font-semibold" : "text-muted-foreground"}>
            Anual
          </Label>
          <Badge variant="secondary" className="ml-1">2 luni gratuite</Badge>
        </div>
      </header>

      {plans.length === 0 ? (
        <p className="text-center text-muted-foreground" data-testid="text-no-plans">
          Niciun plan disponibil momentan.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const price = yearly ? plan.priceYearly : plan.priceMonthly;
            const isFree = plan.slug === "free";
            const priceUnavailable = !isFree && (price == null || price <= 0);
            const isCurrent = currentSlug != null && currentSlug === plan.slug;
            return (
              <Card key={plan.id} className="flex flex-col" data-testid={`card-plan-${plan.slug}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {plan.name}
                  </CardTitle>
                  {plan.description && <CardDescription>{plan.description}</CardDescription>}
                  <div className="pt-2">
                    {isFree ? (
                      <span className="text-3xl font-bold" data-testid={`text-price-${plan.slug}`}>Gratuit</span>
                    ) : priceUnavailable || price == null ? (
                      <span className="text-sm text-muted-foreground" data-testid={`text-price-${plan.slug}`}>Preț indisponibil</span>
                    ) : (
                      <>
                        <div>
                          <span className="text-3xl font-bold" data-testid={`text-price-${plan.slug}`}>
                            {fmtRON(price)} {(plan.currency || "RON").toUpperCase()}
                          </span>
                          <span className="text-muted-foreground text-sm"> + TVA</span>
                          <span className="text-muted-foreground text-sm">/{yearly ? "an" : "lună"}</span>
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-price-gross-${plan.slug}`}>
                          ({fmtRON(price * (1 + VAT_RATE))} {(plan.currency || "RON").toUpperCase()} cu TVA)
                        </div>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 text-sm">
                  <Feature>{plan.monthlyCredits} credite / lună</Feature>
                  <Feature>{plan.maxCompanies} companii</Feature>
                  <Feature>{plan.maxProjects} proiecte</Feature>
                  {plan.includedCuiPerMonth > 0 && (
                    <Feature>{plan.includedCuiPerMonth} verificări CUI / lună</Feature>
                  )}
                  {plan.seats > 1 && <Feature>{plan.seats} utilizatori</Feature>}
                  {(plan.features || []).map((f, i) => (
                    <Feature key={i}>{f}</Feature>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || isFree || priceUnavailable || pendingId === plan.id || !data?.stripeEnabled}
                    onClick={() => subscribe(plan)}
                    data-testid={`button-subscribe-${plan.slug}`}
                  >
                    {pendingId === plan.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isCurrent ? "Plan curent" : isFree ? "Plan gratuit" : "Abonează-te"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {packages.length > 0 && (
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight" data-testid="text-credits-title">
              Pachete de credite
            </h2>
            <p className="text-muted-foreground">Cumpără credite suplimentare oricând, fără abonament.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="flex flex-col" data-testid={`card-package-${pkg.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    {pkg.name}
                  </CardTitle>
                  <div className="pt-2">
                    {pkg.price == null ? (
                      <span className="text-3xl font-bold" data-testid={`text-package-price-${pkg.id}`}>—</span>
                    ) : (
                      <>
                        <div>
                          <span className="text-3xl font-bold" data-testid={`text-package-price-${pkg.id}`}>
                            {fmtRON(pkg.price)} {(pkg.currency || "RON").toUpperCase()}
                          </span>
                          <span className="text-muted-foreground text-sm"> + TVA</span>
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-package-price-gross-${pkg.id}`}>
                          ({fmtRON(pkg.price * (1 + VAT_RATE))} {(pkg.currency || "RON").toUpperCase()} cu TVA)
                        </div>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 text-sm">
                  <Feature>{pkg.credits} credite</Feature>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={pendingId === pkg.id || !data?.stripeEnabled}
                    onClick={() => buyCredits(pkg)}
                    data-testid={`button-buy-package-${pkg.id}`}
                  >
                    {pendingId === pkg.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Cumpără
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}

      {!data?.stripeEnabled && (
        <p className="text-center text-sm text-muted-foreground" data-testid="text-stripe-disabled">
          Plățile online vor fi disponibile în curând.
        </p>
      )}
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
