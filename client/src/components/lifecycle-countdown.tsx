import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const RO_MONTHS_SHORT = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];

function formatTargetDate(d: Date): string {
  const day = d.getDate();
  const month = RO_MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// Pluralizare românească pe regula CLDR (ultimele două cifre):
//  - `one`  : n === 1            → „zi" / „oră" / „minut"
//  - `few`  : n === 0 sau ultimele 2 cifre în 2..19 → „zile" (FĂRĂ „de")
//  - `many` : restul (00, 20..99) → „de zile" (CU „de")
// Ex: 1 zi, 2..19 zile, 20 de zile, 21 de zile, 100 de zile, 101 de zile.
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const mod100 = Math.abs(n) % 100;
  if (n === 0 || (mod100 >= 2 && mod100 <= 19)) return few;
  return many;
}

// Task #140 (U-01): pluralizare românească corectă pentru countdown-ul de zile.
// „1 zi rămasă" / „2 zile rămase" / „20 de zile rămase". Adjectivul „rămasă/
// rămase" se acordă în număr, substantivul „zi/zile/de zile" prin `plural()`.
export function zileRamase(n: number): string {
  const noun = plural(n, "zi", "zile", "de zile");
  const adj = n === 1 ? "rămasă" : "rămase";
  return `${n} ${noun} ${adj}`;
}

// Zile calendaristice rămase până la `target`, calculate IDENTIC peste tot:
// ambele date normalizate la miezul nopții UTC + rotunjire. Sursa unică de
// adevăr pentru numărul de zile — folosită și de Calendar — ca dashboard-ul și
// Calendarul să afișeze ACELAȘI număr pentru același apel (fără off-by-one din
// ora locală + `Math.floor` pe diferența brută în ms).
export function daysUntil(target: Date | string, now: Date | number = Date.now()): number {
  const t = typeof target === "string" ? new Date(target) : target;
  if (Number.isNaN(t.getTime())) return NaN;
  const n = typeof now === "number" ? new Date(now) : now;
  const targetMidnight = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  const nowMidnight = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  return Math.round((targetMidnight - nowMidnight) / 86_400_000);
}

interface LifecycleCountdownProps {
  /**
   * Stage of the call. Determines mode:
   *  - `urmeaza` => countdown to `openDate` ("Se deschide în...")
   *  - `depunere_activa` => countdown to `deadline` ("Se închide în...")
   *  - anything else => not rendered
   *
   * `opensAt` is kept as a backward-compatible alias of `openDate` so existing
   * call sites that only pass the opens date still work in "Se deschide" mode.
   */
  lifecycleStage?: "urmeaza" | "depunere_activa" | "expirat" | null;
  openDate?: string | Date | null;
  deadline?: string | Date | null;
  opensAt?: string | Date | null;
  callId?: string;
  className?: string;
}

/**
 * Compact live countdown for a funding call.
 *
 * Mode is driven by `lifecycleStage`:
 *  - `urmeaza` -> renders "Se deschide în <N zile/ore/minute>" until `openDate`.
 *  - `depunere_activa` -> renders "Se închide în <N zile/ore/minute>" until `deadline`.
 *  - otherwise (or when the target is missing/past) -> returns null.
 *
 * Updates once per minute.
 */
export function LifecycleCountdown({
  lifecycleStage,
  openDate,
  deadline,
  opensAt,
  callId,
  className,
}: LifecycleCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Resolve mode + target. Default to "opens" mode when stage is omitted but
  // an opens date is provided (backward compatible with the previous API).
  let mode: "opens" | "closes" | null = null;
  let target: Date | null = null;
  if (lifecycleStage === "depunere_activa") {
    if (deadline) {
      target = typeof deadline === "string" ? new Date(deadline) : deadline;
      mode = "closes";
    }
  } else if (lifecycleStage === "urmeaza" || !lifecycleStage) {
    const src = openDate ?? opensAt;
    if (src) {
      target = typeof src === "string" ? new Date(src) : src;
      mode = "opens";
    }
  }

  if (!mode || !target || Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - now;
  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60_000);
  const totalHours = Math.floor(totalMinutes / 60);
  // Numărul de zile e calculat IDENTIC cu Calendarul (`daysUntil`: normalizare
  // la miezul nopții UTC + rotunjire), eliminând off-by-one-ul față de Calendar
  // (ex: „Se deschide în 2 zile" vs „3 zile" pentru aceeași dată).
  const totalDays = daysUntil(target, now);

  let amount: string;
  if (totalDays >= 1) {
    amount = `${totalDays} ${plural(totalDays, "zi", "zile", "de zile")}`;
  } else if (totalHours >= 1) {
    amount = `${totalHours} ${plural(totalHours, "oră", "ore", "de ore")}`;
  } else {
    amount = `${totalMinutes} ${plural(totalMinutes, "minut", "minute", "de minute")}`;
  }

  const tone =
    mode === "opens"
      ? "text-orange-700 dark:text-orange-300"
      : "text-amber-700 dark:text-amber-400";
  const prefix = mode === "opens" ? "Se deschide în" : "Se închide în";
  const title =
    mode === "opens"
      ? `Se deschide pe ${formatTargetDate(target)}`
      : `Se închide pe ${formatTargetDate(target)}`;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${tone} ${className ?? ""}`}
      data-testid={callId ? `countdown-lifecycle-${callId}` : "countdown-lifecycle"}
      title={title}
    >
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>
        {prefix} <span className="font-semibold">{amount}</span>
      </span>
    </div>
  );
}
