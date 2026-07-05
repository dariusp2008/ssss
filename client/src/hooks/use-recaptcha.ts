import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export type RecaptchaResult =
  | { ok: true; token: string }
  | { ok: false; reason: "site_key" | "script_blocked" | "execute_failed" };

export type RecaptchaScriptStatus = "idle" | "loading" | "ready" | "blocked";

export function detectInAppBrowser(): { isInApp: boolean; appName: string | null } {
  if (typeof navigator === "undefined") return { isInApp: false, appName: null };
  const ua = navigator.userAgent || "";
  const checks: Array<[RegExp, string]> = [
    [/FBAN|FBAV|FB_IAB/i, "Facebook"],
    [/Instagram/i, "Instagram"],
    [/YahooMobile|YJApp|Yahoo/i, "Yahoo Mail"],
    [/GSA\//i, "Google App"],
    [/Line\//i, "LINE"],
    [/Twitter|TwitterAndroid/i, "Twitter / X"],
    [/LinkedInApp/i, "LinkedIn"],
    [/MicroMessenger/i, "WeChat"],
    [/TikTok|musical_ly|Bytedance/i, "TikTok"],
    [/Snapchat/i, "Snapchat"],
    [/WhatsApp/i, "WhatsApp"],
    [/Pinterest/i, "Pinterest"],
  ];
  for (const [re, name] of checks) {
    if (re.test(ua)) return { isInApp: true, appName: name };
  }
  return { isInApp: false, appName: null };
}

export function recaptchaErrorMessage(
  reason: "site_key" | "script_blocked" | "execute_failed",
  inAppName: string | null
): string {
  if (reason === "site_key") {
    return "Configurarea de securitate nu este disponibilă. Reîmprospătează pagina și încearcă din nou.";
  }
  if (reason === "script_blocked") {
    if (inAppName) {
      return `Browser-ul integrat din ${inAppName} blochează verificarea anti-bot Google. Te rugăm să apeși pe meniul cu trei puncte (⋮) și să alegi „Deschide în Chrome" / „Deschide în Safari", apoi încearcă din nou.`;
    }
    return "Verificarea anti-bot Google (reCAPTCHA) nu a putut fi încărcată. Posibile cauze: ad-blocker, restricții de rețea sau cookie-uri blocate. Dezactivează blocările pentru google.com și reîncarcă pagina.";
  }
  return "Verificarea anti-bot a eșuat. Reîmprospătează pagina și încearcă din nou.";
}

const E2E_BYPASS_STORAGE_KEY = "granted_e2e_token";
const E2E_BYPASS_QUERY_PARAM = "e2e";

// Activare bypass reCAPTCHA pentru agenții de test: dacă URL-ul conține
// `?e2e=<token>`, memorăm token-ul în localStorage și curățăm parametrul din URL.
// Apoi `getToken` îl folosește direct, fără a încărca scriptul Google.
function seedE2ETokenFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get(E2E_BYPASS_QUERY_PARAM);
    if (fromUrl) {
      window.localStorage.setItem(E2E_BYPASS_STORAGE_KEY, fromUrl);
      params.delete(E2E_BYPASS_QUERY_PARAM);
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }
  } catch {
    // localStorage / history indisponibile → ignorăm (bypass-ul rămâne inactiv)
  }
}

function getE2EToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(E2E_BYPASS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useRecaptcha() {
  const { data } = useQuery<{ siteKey: string }>({
    queryKey: ["/api/recaptcha-site-key"],
  });
  const siteKey = data?.siteKey || "";
  const loadedRef = useRef(false);
  const [scriptStatus, setScriptStatus] = useState<RecaptchaScriptStatus>("idle");

  useEffect(() => {
    seedE2ETokenFromUrl();
  }, []);

  useEffect(() => {
    if (getE2EToken()) return; // mod test: nu încărca scriptul Google
    if (!siteKey || loadedRef.current) return;
    if (document.querySelector(`script[src*="recaptcha"]`)) {
      loadedRef.current = true;
      setScriptStatus("loading");
      return;
    }
    setScriptStatus("loading");
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.onerror = () => setScriptStatus("blocked");
    document.head.appendChild(script);
    loadedRef.current = true;
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey || scriptStatus === "ready" || scriptStatus === "blocked") return;
    let cancelled = false;
    const start = Date.now();
    const interval = window.setInterval(() => {
      if (cancelled) return;
      if (typeof window.grecaptcha !== "undefined" && typeof window.grecaptcha.execute === "function") {
        setScriptStatus("ready");
        window.clearInterval(interval);
      } else if (Date.now() - start > 12000) {
        setScriptStatus("blocked");
        window.clearInterval(interval);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [siteKey, scriptStatus]);

  const getToken = useCallback(
    async (action: string): Promise<RecaptchaResult> => {
      const e2eToken = getE2EToken();
      if (e2eToken) {
        // Mod test: trimitem token-ul secret în loc de token-ul Google.
        // Serverul îl recunoaște și sare peste verificare (vezi server/recaptcha.ts).
        return { ok: true, token: e2eToken };
      }

      if (!siteKey) return { ok: false, reason: "site_key" };

      if (typeof window.grecaptcha === "undefined" || typeof window.grecaptcha.execute !== "function") {
        const start = Date.now();
        while (Date.now() - start < 10000) {
          await new Promise((r) => setTimeout(r, 150));
          if (typeof window.grecaptcha !== "undefined" && typeof window.grecaptcha.execute === "function") {
            break;
          }
        }
        if (typeof window.grecaptcha === "undefined" || typeof window.grecaptcha.execute !== "function") {
          return { ok: false, reason: "script_blocked" };
        }
      }

      try {
        const token = await new Promise<string>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error("execute_timeout")), 8000);
          window.grecaptcha.ready(async () => {
            try {
              const t = await window.grecaptcha.execute(siteKey, { action });
              window.clearTimeout(timeout);
              resolve(t);
            } catch (err) {
              window.clearTimeout(timeout);
              reject(err);
            }
          });
        });
        if (!token) return { ok: false, reason: "execute_failed" };
        return { ok: true, token };
      } catch (err) {
        console.error("reCAPTCHA error:", err);
        return { ok: false, reason: "execute_failed" };
      }
    },
    [siteKey]
  );

  return { getToken, scriptStatus, hasSiteKey: Boolean(siteKey) };
}
