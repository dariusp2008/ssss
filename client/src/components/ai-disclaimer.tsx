import { AlertTriangle } from "lucide-react";

interface AiDisclaimerProps {
  compact?: boolean;
}

export function AiDisclaimer({ compact = false }: AiDisclaimerProps) {
  if (compact) {
    return (
      <div
        className="flex items-start gap-2 px-3 py-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/50"
        data-testid="ai-disclaimer-compact"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-yellow-800 dark:text-yellow-300 leading-relaxed">
          Analiza AI are caracter informativ. Nu constituie consultanță juridică sau financiară.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/50"
      data-testid="ai-disclaimer"
    >
      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
      <p className="text-xs text-yellow-800 dark:text-yellow-300 leading-relaxed">
        <span className="font-semibold">Important:</span> Analiza de eligibilitate generată de AI are caracter informativ
        și orientativ. Nu constituie consultanță juridică sau financiară. Decizia
        finală de aplicare aparține consultantului și clientului, pe baza propriei
        due diligence. GRANTED nu răspunde pentru decizii luate exclusiv pe baza
        acestor analize.
      </p>
    </div>
  );
}
