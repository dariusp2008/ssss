import { useState } from "react";
import { Link } from "wouter";
import {
  XCircle, AlertTriangle, CheckCircle2, Info, Building2,
  ChevronDown, ChevronUp,
} from "lucide-react";
import type { Company } from "@shared/schema";

// Shared shape used by both the dashboard Match Engine cards and the funding-calls
// catalog cards. Both surfaces map the `/api/match/scores` response into this
// structure so the rich eligibility/structural/blockers/warnings rendering stays
// identical (Task #95).
export interface MatchDetailsData {
  score: number;
  passed: boolean;
  blockers?: string[];
  warnings?: string[];
  info?: string[];
  reasons?: { label: string; points: number; met: boolean; details?: string }[];
  confidenceLevel: "high" | "medium" | "low";
  dataGaps?: string[];
  needsCompanyData?: boolean;
}

// Raw `/api/match/scores` result row (subset of fields both surfaces consume).
export interface HybridMatchResultLike {
  fundingCallId: string;
  combinedScore?: number;
  score?: number;
  passed: boolean;
  blockers?: string[];
  warnings?: string[];
  info?: string[];
  matchedCriteria?: Array<{ name: string; matched: boolean; details: string }>;
  confidenceLevel?: "high" | "medium" | "low";
  hasSemanticScore?: boolean;
  hasRagScore?: boolean;
  dataGaps?: string[];
  needsCompanyData?: boolean;
  lifecycleStage?: string | null;
  opensAt?: string | null;
}

// Map a raw match-engine result row into the shared MatchDetailsData shape so the
// dashboard and the catalog produce identical breakdowns from the same response.
export function mapHybridToMatchDetails(r: HybridMatchResultLike): MatchDetailsData {
  return {
    score: typeof r.combinedScore === "number" ? r.combinedScore : (r.score ?? 0),
    passed: r.passed,
    blockers: r.blockers || [],
    warnings: r.warnings || [],
    info: r.info || [],
    reasons: (r.matchedCriteria || []).map((mc) => ({
      label: mc.name,
      points: mc.matched ? 20 : 0,
      met: mc.matched,
      details: mc.details,
    })),
    confidenceLevel: r.confidenceLevel || "high",
    dataGaps: r.dataGaps ?? [],
    needsCompanyData: r.needsCompanyData ?? false,
  };
}

export function ScoreCircle({
  score,
  passed,
  confidenceLevel,
}: {
  score: number;
  passed: boolean;
  confidenceLevel: "high" | "medium" | "low";
}) {
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor = !passed
    ? "stroke-red-400 dark:stroke-red-500"
    : confidenceLevel === "low"
      ? "stroke-slate-400 dark:stroke-slate-500"
      : confidenceLevel === "medium"
        ? "stroke-sky-500 dark:stroke-sky-400"
        : score >= 70
          ? "stroke-green-500 dark:stroke-green-400"
          : score >= 40
            ? "stroke-yellow-500 dark:stroke-yellow-400"
            : "stroke-red-400 dark:stroke-red-500";

  const textColor = !passed
    ? "text-red-500"
    : confidenceLevel === "low"
      ? "text-slate-600 dark:text-slate-400"
      : confidenceLevel === "medium"
        ? "text-sky-600 dark:text-sky-400"
        : score >= 70
          ? "text-green-600 dark:text-green-400"
          : score >= 40
            ? "text-yellow-600 dark:text-yellow-400"
            : "text-red-500";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
        {passed && score > 0 && (
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className={strokeColor} />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {!passed ? (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        ) : (
          <span className={`text-xs font-bold ${textColor}`}>{score}%</span>
        )}
      </div>
    </div>
  );
}

export function getConfidenceLabel(
  confidenceLevel: "high" | "medium" | "low",
): { label: string; className: string } {
  if (confidenceLevel === "high") return { label: "Estimat ridicat", className: "text-green-600 dark:text-green-400" };
  if (confidenceLevel === "medium") return { label: "Estimat mediu", className: "text-sky-600 dark:text-sky-400" };
  return { label: "Estimat scăzut", className: "text-slate-500 dark:text-slate-400" };
}

// Rich eligibility/structural/blockers/warnings/confidence breakdown shared by
// the dashboard Match Engine cards and the funding-calls catalog cards. The
// component owns its own "show more" expand state.
export function MatchDetails({
  result,
  company,
  callId,
}: {
  result: MatchDetailsData;
  company: Company | null;
  callId: string;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const blockers = result.blockers || [];
  const warnings = result.warnings || [];
  const info = result.info || [];
  const reasons = result.reasons || [];
  const visibleBlockers = blockers.slice(0, 2);
  const visibleWarnings = warnings.slice(0, 2);
  const matchedReasons = reasons.filter((r) => r.met && r.details);
  // Task #76 (NEW-E.5) — „Criterii structurale" extras explicit din matchedCriteria
  // pentru TRL și buget proiect (numele sunt împinse de match.ts) + cofinanțare /
  // durată identificate prin keyword în info[]/warnings[] (acolo unde
  // `evaluateCofinancingFeasibility` și `formatProjectDurationInfo` scriu).
  const STRUCTURAL_NAMES: Record<string, { label: string }> = {
    "TRL (nivel maturitate tehnologică)": { label: "TRL" },
    "Buget proiect": { label: "Buget proiect" },
  };
  const structuralFromReasons = reasons
    .filter((r) => STRUCTURAL_NAMES[r.label])
    .map((r) => ({
      key: r.label,
      label: STRUCTURAL_NAMES[r.label]!.label,
      status: (r.met
        ? "ok"
        : (r.details && /nedispon|lipsesc|nu există|fără|necunoscut|nu are |nu poate fi verificat|valută nespecific|conversia valutară/i.test(r.details))
          ? "missing"
          : "warn") as "ok" | "warn" | "missing",
      details: r.details ?? "",
    }));
  const cofinancingHit =
    warnings.find((w) => /cofinan[țt]/i.test(w)) ??
    info.find((i) => /cofinan[țt]/i.test(i)) ?? null;
  if (cofinancingHit) {
    structuralFromReasons.push({
      key: "cofinancing",
      label: "Cofinanțare",
      status: warnings.includes(cofinancingHit) ? "warn" : "ok",
      details: cofinancingHit,
    });
  }
  const durationHit = info.find((i) => /durat[ăa].*lun[ăi]|lun[ăi].*durat/i.test(i)) ?? null;
  if (durationHit) {
    structuralFromReasons.push({
      key: "duration",
      label: "Durată proiect",
      status: "ok",
      details: durationHit,
    });
  }
  const hasStructuralBreakdown = structuralFromReasons.length > 0;
  const visibleMatched = visibleBlockers.length === 0 && visibleWarnings.length === 0
    ? matchedReasons.slice(0, 2)
    : [];
  const showFallbackInfo = visibleBlockers.length === 0 && visibleWarnings.length === 0 && visibleMatched.length === 0 && info.length > 0;
  const visibleInfoCount = showFallbackInfo ? 1 : 0;
  const hiddenCount =
    Math.max(0, blockers.length - visibleBlockers.length) +
    Math.max(0, warnings.length - visibleWarnings.length) +
    Math.max(0, matchedReasons.length - visibleMatched.length) +
    Math.max(0, info.length - visibleInfoCount);

  if (!(visibleBlockers.length > 0 || visibleWarnings.length > 0 || visibleMatched.length > 0 || showFallbackInfo || hasStructuralBreakdown)) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1" data-testid={`status-eligibility-${callId}`}>
      {visibleBlockers.map((b, i) => (
        <div key={`b-${i}`} className="flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400">
          <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{b}</span>
        </div>
      ))}
      {visibleWarnings.map((w, i) => (
        <div key={`w-${i}`} className="flex items-start gap-1.5 text-[11px] text-yellow-600 dark:text-yellow-500">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{w}</span>
        </div>
      ))}
      {!showDetails && visibleMatched.map((m, i) => (
        <div key={`m-${i}`} className="flex items-start gap-1.5 text-[11px] text-green-600 dark:text-green-400" data-testid={`text-match-${callId}-${i}`}>
          <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{m.details}</span>
        </div>
      ))}
      {showFallbackInfo && !showDetails && (
        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{info[0]}</span>
        </div>
      )}
      {/* Task #76 (NEW-E.5) — „Criterii structurale" block:
          TRL / buget proiect / cofinanțare / durată cu statusuri
          vizuale, derivate din matchedCriteria + warnings/info. */}
      {hasStructuralBreakdown && (
        <div className="pt-1.5 border-t border-muted/50" data-testid={`structural-criteria-${callId}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Criterii structurale
          </p>
          <div className="space-y-0.5">
            {structuralFromReasons.map((sc) => {
              const color =
                sc.status === "ok"
                  ? "text-green-600 dark:text-green-400"
                  : sc.status === "missing"
                    ? "text-muted-foreground"
                    : "text-yellow-600 dark:text-yellow-500";
              const Icon =
                sc.status === "ok" ? CheckCircle2 : sc.status === "missing" ? Info : AlertTriangle;
              return (
                <div
                  key={sc.key}
                  className={`flex items-start gap-1.5 text-[11px] ${color}`}
                  data-testid={`structural-${sc.key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${callId}`}
                >
                  <Icon className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="line-clamp-1">
                    <span className="font-medium">{sc.label}:</span> {sc.details}
                  </span>
                </div>
              );
            })}
          </div>
          {structuralFromReasons.some((sc) => sc.status === "missing") && company?.id && (
            <Link
              href={`/companies/${company.id}`}
              className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1"
              data-testid={`link-complete-company-${callId}`}
            >
              Completează profilul companiei pentru evaluare mai precisă
            </Link>
          )}
        </div>
      )}
      {/* Task #86 — bloc „necesită date" + CTA către profilul firmei.
          Apare doar pe apelurile care trec eliminatoriile dar nu pot fi
          confirmate din lipsă de date pe companie (engine flag). */}
      {result.needsCompanyData && (result.dataGaps?.length ?? 0) > 0 && (
        <div className="mt-2 pt-1.5 border-t border-sky-200/60 dark:border-sky-900/60" data-testid={`data-gaps-${callId}`}>
          <div className="flex items-start gap-1.5 text-[11px] text-sky-700 dark:text-sky-400">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
              Necesită mai multe date pentru confirmare:{" "}
              <span className="font-medium">{result.dataGaps!.join(", ")}</span>
            </span>
          </div>
          {company?.id && (
            <Link
              href={`/companies/${company.id}`}
              className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1 font-medium"
              data-testid={`button-complete-data-${callId}`}
            >
              <Building2 className="w-3 h-3" />
              Completează datele companiei
            </Link>
          )}
        </div>
      )}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-[10px] text-primary hover:underline flex items-center gap-1"
          data-testid={`button-details-${callId}`}
        >
          {showDetails ? "Ascunde" : `Vezi detalii (+${hiddenCount})`}
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}
      {showDetails && (
        <div className="space-y-1 pt-1 border-t border-muted">
          {blockers.slice(visibleBlockers.length).map((b, i) => (
            <div key={`eb-${i}`} className="flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400">
              <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{b}</span>
            </div>
          ))}
          {warnings.slice(visibleWarnings.length).map((w, i) => (
            <div key={`ew-${i}`} className="flex items-start gap-1.5 text-[11px] text-yellow-600 dark:text-yellow-500">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
          {matchedReasons.slice(visibleMatched.length).map((m, i) => (
            <div key={`em-${i}`} className="flex items-start gap-1.5 text-[11px] text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{m.details}</span>
            </div>
          ))}
          {info.slice(visibleInfoCount).map((inf, i) => (
            <div key={`i-${i}`} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{inf}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
