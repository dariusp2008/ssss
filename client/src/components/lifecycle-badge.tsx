import { Badge } from "@/components/ui/badge";

export type LifecycleStage = "urmeaza" | "depunere_activa" | "expirat" | null | undefined;

const RO_MONTHS_SHORT = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];

function formatDayMonth(d: Date): string {
  return `${d.getDate()} ${RO_MONTHS_SHORT[d.getMonth()]}`;
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

function daysUntil(target: Date): number {
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

// Termenul e considerat depășit abia în ziua următoare (ziua deadline-ului
// rămâne activă) — consistent cu sweep-ul server-side (`deadline < CURRENT_DATE`).
function isDeadlinePassed(target: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(target);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

interface LifecycleBadgeProps {
  stage: LifecycleStage;
  opensAt?: string | Date | null;
  // Task #68 (review fix): pentru `depunere_activa` afișăm zile rămase
  // până la deadline („În depunere — X zile") când deadline-ul e cunoscut.
  deadline?: string | Date | null;
  callId?: string;
  className?: string;
}

export function LifecycleBadge({ stage, opensAt, deadline, callId, className }: LifecycleBadgeProps) {
  if (stage === "urmeaza") {
    const opens = opensAt ? (typeof opensAt === "string" ? new Date(opensAt) : opensAt) : null;
    const opensValid = opens && !Number.isNaN(opens.getTime());
    const label = opensValid ? `Urmează — ${formatDayMonth(opens)}` : "Urmează";
    return (
      <Badge
        className={`bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-300/60 dark:border-orange-700/60 no-default-active-elevate ${className ?? ""}`}
        data-testid={callId ? `badge-lifecycle-urmeaza-${callId}` : "badge-lifecycle-urmeaza"}
      >
        {label}
      </Badge>
    );
  }
  if (stage === "expirat") {
    return (
      <Badge
        variant="destructive"
        className={`no-default-active-elevate ${className ?? ""}`}
        data-testid={callId ? `badge-lifecycle-expirat-${callId}` : "badge-lifecycle-expirat"}
      >
        Expirat
      </Badge>
    );
  }
  if (stage === "depunere_activa") {
    const dl = deadline ? (typeof deadline === "string" ? new Date(deadline) : deadline) : null;
    const dlValid = dl && !Number.isNaN(dl.getTime());
    // Apărare în profunzime: dacă stadiul stocat e încă `depunere_activa` dar
    // termenul a trecut (sweep-ul nu a rulat încă), afișăm „Expirat", NU verde —
    // stările trebuie să fie mutual exclusive.
    if (dlValid && isDeadlinePassed(dl)) {
      return (
        <Badge
          variant="destructive"
          className={`no-default-active-elevate ${className ?? ""}`}
          data-testid={callId ? `badge-lifecycle-expirat-${callId}` : "badge-lifecycle-expirat"}
        >
          Expirat
        </Badge>
      );
    }
    let label = "În depunere";
    if (dlValid) {
      const days = daysUntil(dl);
      if (days > 0) {
        label = `În depunere — ${days} ${plural(days, "zi", "zile", "de zile")}`;
      }
    }
    return (
      <Badge
        className={`bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 no-default-active-elevate ${className ?? ""}`}
        data-testid={callId ? `badge-lifecycle-activ-${callId}` : "badge-lifecycle-activ"}
      >
        {label}
      </Badge>
    );
  }
  return null;
}
