import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SurveyConfig, TriggerEvent } from "@shared/micro-survey-triggers";

interface UseSurveyTriggerOptions {
  event: TriggerEvent;
  enabled: boolean;
  delayMs?: number;
}

interface UseSurveyTriggerResult {
  surveyConfig: SurveyConfig | null;
  isSubmitting: boolean;
  submit: (payload: { responseData: Record<string, unknown>; rating?: number; message?: string }) => Promise<void>;
  dismiss: () => Promise<void>;
}

export function useSurveyTrigger({ event, enabled, delayMs = 800 }: UseSurveyTriggerOptions): UseSurveyTriggerResult {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [surveyConfig, setSurveyConfig] = useState<SurveyConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isAuthenticated || checkedRef.current) return;
    checkedRef.current = true;

    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest("POST", `/api/feedback/triggers/${event}/check`, {});
        const data = await res.json();
        if (data?.show && data?.surveyConfig) {
          setSurveyConfig(data.surveyConfig);
        }
      } catch (err) {
        // Silent fail — never block the user flow because of feedback.
        console.warn(`[micro-survey] check failed for ${event}`, err);
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [enabled, isAuthenticated, event, delayMs]);

  const submit = useCallback(async (payload: { responseData: Record<string, unknown>; rating?: number; message?: string }) => {
    if (!surveyConfig) return;
    setIsSubmitting(true);
    try {
      await apiRequest("POST", `/api/feedback/triggers/${event}/respond`, payload);
      toast({ title: "Mulțumim pentru feedback", description: "Răspunsul tău ne ajută să îmbunătățim platforma." });
      setSurveyConfig(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nu s-a putut trimite răspunsul.";
      toast({ title: "Eroare", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [surveyConfig, event, toast]);

  const dismiss = useCallback(async () => {
    if (!surveyConfig) return;
    setSurveyConfig(null);
    try {
      await apiRequest("POST", `/api/feedback/triggers/${event}/dismiss`, {});
    } catch {
      // Silent.
    }
  }, [surveyConfig, event]);

  return { surveyConfig, isSubmitting, submit, dismiss };
}
