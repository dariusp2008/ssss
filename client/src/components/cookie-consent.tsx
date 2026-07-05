import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, ChevronDown, ChevronUp, ExternalLink, Shield } from "lucide-react";

const CONSENT_KEY = "granted_cookie_consent";

export interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  preferences: boolean;
  analytics: boolean;
}

export function getStoredConsent(): CookiePreferences | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.essential === "boolean" &&
      typeof parsed.functional === "boolean" &&
      typeof parsed.preferences === "boolean"
    ) {
      if (typeof parsed.analytics !== "boolean") {
        localStorage.removeItem(CONSENT_KEY);
        return null;
      }
      return parsed as CookiePreferences;
    }
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    try { localStorage.removeItem(CONSENT_KEY); } catch {}
  }
  return null;
}

function saveConsent(prefs: CookiePreferences) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
  handleAnalyticsConsent(prefs.analytics);
}

function handleAnalyticsConsent(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) {
    localStorage.setItem("granted_analytics_consent", "accepted");
    if (!(window as any).gtag) {
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=G-6ZNQX84GX2";
      document.head.appendChild(s);
      (window as any).dataLayer = (window as any).dataLayer || [];
      const gtag = (...args: any[]) => { (window as any).dataLayer.push(args); };
      (window as any).gtag = gtag;
      gtag("js", new Date());
      gtag("config", "G-6ZNQX84GX2");
    }
  } else {
    localStorage.setItem("granted_analytics_consent", "rejected");
  }
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookiePreferences | null>(() => getStoredConsent());

  const acceptAll = () => {
    const prefs: CookiePreferences = { essential: true, functional: true, preferences: true, analytics: true };
    saveConsent(prefs);
    setConsent(prefs);
  };

  const acceptEssential = () => {
    const prefs: CookiePreferences = { essential: true, functional: false, preferences: false, analytics: false };
    saveConsent(prefs);
    setConsent(prefs);
  };

  const acceptCustom = (prefs: CookiePreferences) => {
    const final = { ...prefs, essential: true };
    saveConsent(final);
    setConsent(final);
  };

  return { consent, acceptAll, acceptEssential, acceptCustom };
}

export function CookieConsentBanner() {
  const { consent, acceptAll, acceptEssential, acceptCustom } = useCookieConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [functional, setFunctional] = useState(true);
  const [preferences, setPreferences] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!getStoredConsent()) {
        setVisible(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (consent || !visible) return null;

  const handleSaveCustom = () => {
    acceptCustom({ essential: true, functional, preferences, analytics });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none" data-testid="cookie-consent-overlay">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" />

      <div
        className="relative w-full max-w-2xl mx-4 mb-4 pointer-events-auto animate-in slide-in-from-bottom-4 duration-500"
        data-testid="cookie-consent-banner"
      >
        <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
          <div className="p-5 pb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(228,100%,19.6%)] flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-[hsl(48,100%,50%)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base" data-testid="text-cookie-title">Acest site folosește cookie-uri</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Folosim cookie-uri pentru a asigura funcționarea corectă a platformei, pentru protecție anti-spam și pentru a memora preferințele tale.
                  Poți alege ce tipuri de cookie-uri accepți.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-1"
              data-testid="button-cookie-details-toggle"
            >
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showDetails ? "Ascunde detalii" : "Personalizează preferințele"}
            </button>

            {showDetails && (
              <div className="mt-4 space-y-3 border-t pt-4" data-testid="cookie-details-panel">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">Cookie-uri esențiale și de securitate</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Obligatorii</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Sesiunea de autentificare (connect.sid) și Google reCAPTCHA v3 (protecție anti-spam). Fără ele, platforma nu funcționează.</p>
                  </div>
                  <Switch checked={true} disabled className="opacity-60" data-testid="switch-essential" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium">Cookie-uri funcționale</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Memorarea preferințelor de interfață și funcționalități auxiliare.</p>
                  </div>
                  <Switch checked={functional} onCheckedChange={setFunctional} data-testid="switch-functional" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium">Cookie-uri de preferințe</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Memorarea stării sidebar-ului și alte setări de interfață.</p>
                  </div>
                  <Switch checked={preferences} onCheckedChange={setPreferences} data-testid="switch-preferences" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium">Cookie-uri de analytics</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Google Analytics - ne ajută să înțelegem cum este folosită platforma pentru a o îmbunătăți.</p>
                  </div>
                  <Switch checked={analytics} onCheckedChange={setAnalytics} data-testid="switch-analytics" />
                </div>
              </div>
            )}
          </div>

          <div className="px-5 pb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              {showDetails ? (
                <Button
                  onClick={handleSaveCustom}
                  className="flex-1 bg-[hsl(228,100%,19.6%)] hover:bg-[hsl(228,100%,25%)] text-white"
                  data-testid="button-save-preferences"
                >
                  Salvează preferințele
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={acceptEssential}
                    className="flex-1 sm:flex-none"
                    data-testid="button-accept-essential"
                  >
                    Doar esențiale
                  </Button>
                  <Button
                    onClick={acceptAll}
                    className="flex-1 bg-[hsl(228,100%,19.6%)] hover:bg-[hsl(228,100%,25%)] text-white"
                    data-testid="button-accept-all"
                  >
                    Acceptă toate
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t">
              <a
                href="/cookie-policy"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-cookie-policy-from-banner"
              >
                <Shield className="w-3 h-3" />
                Politica de cookie-uri
              </a>
              <a
                href="/privacy-policy"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Confidențialitate
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
