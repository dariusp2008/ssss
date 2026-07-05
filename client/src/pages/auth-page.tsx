import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Shield, TrendingUp, FileCheck, Building2, FolderOpen, Sparkles, ExternalLink, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GrantedLogo } from "@/components/granted-logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useRecaptcha, detectInAppBrowser, recaptchaErrorMessage } from "@/hooks/use-recaptcha";
import { isKnownAppRoute } from "@/lib/routes";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [planSlug, setPlanSlug] = useState("free");
  const [location] = useLocation();
  const { getToken, scriptStatus, hasSiteKey } = useRecaptcha();
  const inAppInfo = useMemo(() => detectInAppBrowser(), []);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  interface PlanData {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    monthly_credits: number;
    max_companies: number;
    max_projects: number;
    features: unknown;
    is_public: boolean;
  }

  const { data: plansData } = useQuery<PlanData[]>({
    queryKey: ["/api/subscription-plans"],
    enabled: mode === "register",
  });

  const publicPlans = (plansData || []).filter((p) => p.is_public);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    if (verified) {
      if (verified === "success") {
        setSuccess("Adresa de email a fost confirmata! Te poti autentifica acum.");
        setMode("login");
      } else if (verified === "expired") {
        setError("Linkul de verificare a expirat. Te rugam sa retrimitei emailul de confirmare.");
      } else if (verified === "invalid") {
        setError("Linkul de verificare este invalid.");
      } else if (verified === "error") {
        setError("A aparut o eroare la verificarea emailului.");
      }
      params.delete("verified");
      const remaining = params.toString();
      window.history.replaceState({}, "", remaining ? `/auth?${remaining}` : "/auth");
    }
  }, [location]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const captcha = await getToken("login");
      if (!captcha.ok) {
        throw new Error(recaptchaErrorMessage(captcha.reason, inAppInfo.appName));
      }
      const res = await apiRequest("POST", "/api/auth/login", { email, password, recaptchaToken: captcha.token });
      return res.json();
    },
    onSuccess: () => {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      let destination = "/";
      if (returnTo) {
        try {
          const parsed = new URL(returnTo, window.location.origin);
          if (parsed.origin === window.location.origin && isKnownAppRoute(parsed.pathname)) {
            destination = parsed.pathname + parsed.search + parsed.hash;
          }
        } catch {}
      }
      window.location.href = destination;
    },
    onError: (err: any) => {
      setError(err.message || "Eroare la autentificare");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const captcha = await getToken("register");
      if (!captcha.ok) {
        throw new Error(recaptchaErrorMessage(captcha.reason, inAppInfo.appName));
      }
      const res = await apiRequest("POST", "/api/auth/register", {
        email,
        password,
        firstName,
        lastName,
        recaptchaToken: captcha.token,
        planSlug,
        newsletterOptIn,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setSuccess(data.message || "Contul a fost creat. Verifică email-ul.");
      setMode("login");
      setPassword("");
    },
    onError: (err: any) => {
      setError(err.message || "Eroare la inregistrare");
    },
  });

  const forgotMutation = useMutation({
    mutationFn: async () => {
      const captcha = await getToken("forgot_password");
      if (!captcha.ok) {
        throw new Error(recaptchaErrorMessage(captcha.reason, inAppInfo.appName));
      }
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email, recaptchaToken: captcha.token });
      return res.json();
    },
    onSuccess: (data: any) => {
      setSuccess(data.message || "Verifică email-ul pentru instrucțiuni.");
    },
    onError: (err: any) => {
      setError(err.message || "Eroare la trimiterea emailului");
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/resend-verification", { email });
      return res.json();
    },
    onSuccess: (data: any) => {
      setSuccess(data.message || "Emailul a fost retrimis.");
    },
    onError: (err: any) => {
      setError(err.message || "Eroare la retrimiterea emailului");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (mode === "login") {
      loginMutation.mutate();
    } else if (mode === "forgot") {
      forgotMutation.mutate();
    } else {
      registerMutation.mutate();
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending || forgotMutation.isPending;

  const benefits = [
    { icon: Shield, text: "Evaluare rapida a eligibilitatii" },
    { icon: TrendingUp, text: "Potrivire inteligentă cu programe de finanțare" },
    { icon: FileCheck, text: "Gestionare completă a documentelor" },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(228, 100%, 19.6%) 0%, hsl(228, 80%, 28%) 50%, hsl(228, 60%, 35%) 100%)" }}>
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[hsl(48,100%,50%)]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[hsl(48,100%,50%)]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-white/[0.02] rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 space-y-10 max-w-xl">
          <GrantedLogo size="xl" variant="gold" />

          <div className="space-y-4">
            <h2 className="text-3xl xl:text-4xl font-serif font-bold text-white leading-tight">
              Accesează programe de finanțare
              <span className="text-[hsl(48,100%,50%)]"> cu incredere</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">
              Platforma completă pentru identificarea, evaluarea și aplicarea la programele de finanțare.
            </p>
          </div>

          <div className="space-y-4">
            {benefits.map((b) => (
              <div key={b.text} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-[hsl(48,100%,50%)]/15 flex items-center justify-center shrink-0">
                  <b.icon className="w-5 h-5 text-[hsl(48,100%,50%)]" />
                </div>
                <p className="text-white/80 text-sm font-medium">{b.text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-8 pt-4">
            <div>
              <p className="text-2xl font-bold text-[hsl(48,100%,50%)]">500+</p>
              <p className="text-xs text-white/40">Apeluri monitorizate</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-[hsl(48,100%,50%)]">AI</p>
              <p className="text-xs text-white/40">Analiza inteligenta</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-[hsl(48,100%,50%)]">100%</p>
              <p className="text-xs text-white/40">Date oficiale</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden text-center space-y-3 mb-2">
            <div className="flex items-center justify-center">
              <GrantedLogo size="lg" variant="navy" />
            </div>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h1 className="text-2xl font-serif font-bold" data-testid="text-auth-title">
              {mode === "login" ? "Autentificare" : mode === "forgot" ? "Resetare parolă" : "Creează cont"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Intra in contul tau pentru a accesa platforma"
                : mode === "forgot"
                ? "Introdu adresa de email pentru a primi un link de resetare"
                : "Înregistrează-te pentru a accesa programele de finanțare"}
            </p>
          </div>

          {inAppInfo.isInApp && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-100" data-testid="banner-inapp-browser">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <p className="leading-snug">
                  Se pare că ai deschis pagina în browser-ul integrat din <strong>{inAppInfo.appName}</strong>. Verificarea anti-bot Google poate să nu funcționeze aici.
                </p>
                <p className="text-xs leading-snug">
                  Pentru cea mai bună experiență, deschide pagina în Chrome, Safari sau Firefox: apasă pe meniul cu trei puncte (⋮) din colțul de sus și alege <em>„Deschide în browser"</em>.
                </p>
                {currentUrl && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-2"
                    onClick={() => {
                      navigator.clipboard?.writeText(currentUrl).then(
                        () => setSuccess("Link copiat. Lipește-l într-un browser obișnuit."),
                        () => {}
                      );
                    }}
                    data-testid="button-copy-auth-url"
                  >
                    <ExternalLink className="w-3 h-3" /> Copiază linkul paginii
                  </button>
                )}
              </div>
            </div>
          )}

          {hasSiteKey && scriptStatus === "blocked" && !error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-100" data-testid="banner-recaptcha-blocked">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Verificarea anti-bot Google nu s-a încărcat (posibil ad-blocker sau restricții de rețea). Dezactivează blocările pentru <code className="font-mono text-xs">google.com</code> și reîncarcă pagina.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="text-auth-error">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span>{error}</span>
                {error.includes("confirmi adresa") && (
                  <button
                    type="button"
                    className="block mt-1 underline text-xs"
                    onClick={() => resendMutation.mutate()}
                    data-testid="button-resend-verification"
                  >
                    Retrimite emailul de confirmare
                  </button>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 text-sm" data-testid="text-auth-success">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <Card className="p-6 border-border/50">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prenume</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        placeholder="Maria"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-9"
                        data-testid="input-first-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nume</Label>
                    <Input
                      id="lastName"
                      placeholder="Popescu"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="maria@exemplu.ro"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                    data-testid="input-email"
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Parola</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={mode === "register" ? "Minim 8 caractere" : "Parola ta"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={mode === "register" ? 8 : undefined}
                      className="pl-9"
                      data-testid="input-password"
                    />
                  </div>
                </div>
              )}

              {mode === "register" && publicPlans.length > 0 && (
                <div className="space-y-3">
                  <Label>Alege planul</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {publicPlans.map((plan) => {
                      const isSelected = planSlug === plan.slug;
                      return (
                        <Card
                          key={plan.slug}
                          data-testid={`card-plan-${plan.slug}`}
                          className={`p-4 cursor-pointer transition-colors ${
                            isSelected
                              ? "border-blue-500 border-2 bg-blue-50/50 dark:bg-blue-950/20"
                              : "border-border hover-elevate"
                          }`}
                          onClick={() => setPlanSlug(plan.slug)}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm">{plan.name}</h3>
                              <Badge variant="secondary">
                                <Sparkles className="w-3 h-3 mr-1" />
                                {plan.monthly_credits} credite/lună
                              </Badge>
                            </div>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground">{plan.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {plan.max_companies} {plan.max_companies === 1 ? "companie" : "companii"}
                              </span>
                              <span className="flex items-center gap-1">
                                <FolderOpen className="w-3 h-3" />
                                {plan.max_projects} {plan.max_projects === 1 ? "proiect" : "proiecte"}
                              </span>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {mode === "register" && (
                <label className="flex items-start gap-3 cursor-pointer select-none" data-testid="label-newsletter">
                  <input
                    type="checkbox"
                    checked={newsletterOptIn}
                    onChange={(e) => setNewsletterOptIn(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[hsl(228,100%,20%)] cursor-pointer"
                    data-testid="checkbox-newsletter"
                  />
                  <span className="text-sm text-muted-foreground leading-snug">
                    Doresc să primesc emailuri informative despre noi apeluri de finanțare, actualizări ale platformei și sfaturi utile.
                  </span>
                </label>
              )}

              {mode === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                    data-testid="button-forgot-password"
                  >
                    Ai uitat parola?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[hsl(48,100%,50%)] text-[hsl(228,100%,19.6%)] hover:bg-[hsl(48,100%,45%)] font-semibold h-11 shadow-sm"
                disabled={isLoading}
                data-testid="button-submit-auth"
              >
                {isLoading ? "Se procesează..." : mode === "login" ? "Autentificare" : mode === "forgot" ? "Trimite link de resetare" : "Creează cont"}
                {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <p>
                Nu ai cont?{" "}
                <button
                  type="button"
                  className="text-[hsl(228,100%,30%)] font-semibold hover:underline"
                  onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
                  data-testid="button-switch-register"
                >
                  Înregistrează-te
                </button>
              </p>
            ) : (
              <p>
                {mode === "forgot" ? "Ti-ai amintit parola?" : "Ai deja cont?"}{" "}
                <button
                  type="button"
                  className="text-[hsl(228,100%,30%)] font-semibold hover:underline"
                  onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                  data-testid="button-switch-login"
                >
                  Autentificare
                </button>
              </p>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground/60 pt-2">
            &copy; 2026 GRANTED. Toate drepturile rezervate.
          </p>
          <p className="text-center text-[10px] text-muted-foreground/40 leading-relaxed">
            Protejat de reCAPTCHA Google.{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Confidențialitate</a>{" "}
            și{" "}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">Termeni</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
