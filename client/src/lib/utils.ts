import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// BUG-04: rotunjește numere pentru afișare, eliminând artefactele de virgulă
// mobilă (ex: 3.23994592000000003 → "3,24") și zerourile de coadă inutile
// (3.5 → "3,5", 4 → "4"). Folosește locale ro-RO (separator zecimal „,").
// Returnează "" pentru null/undefined/NaN.
export function formatNumber(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (value == null || typeof value !== "number" || !Number.isFinite(value)) return "";
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  return rounded.toLocaleString("ro-RO", { maximumFractionDigits: decimals });
}

// Task #140 (C-01): titlu curat pentru afișarea pe card.
// `name` rămâne neatins în DB și pe pagina de detalii — această funcție produce
// doar varianta de prezentare: elimină prefixul redundant „Ghidul Solicitantului
// / Ghid …", normalizează ghilimelele tipografice („ " ‚ ' « » → " ') și
// scurtează la ~90 caractere fără a tăia un cuvânt la mijloc.
export function formatCallDisplayTitle(
  name: string | null | undefined,
  maxLength = 90,
): string {
  if (!name) return "";
  let title = String(name)
    // ghilimele tipografice → ASCII
    .replace(/[\u201E\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u201A\u2018\u2019]/g, "'")
    // colapsează spațiile multiple
    .replace(/\s{2,}/g, " ")
    .trim();

  // Elimină prefixul „Ghidul Solicitantului" / „Ghid …" (cu separatoare uzuale
  // „: – - —" sau ghilimele care urmează).
  title = title
    .replace(/^["']*\s*ghid(?:ul)?(?:\s+solicitant(?:ului)?)?\s*(?:pentru|privind|aferent)?\s*[:\-–—"'\s]+/i, "")
    .trim();

  // Curăță ghilimele orfane rămase la capete.
  title = title.replace(/^["']+/, "").replace(/["']+$/, "").trim();

  // Task #151 (titluri): extinde un set CONSERVATOR de prescurtări frecvente din
  // titlurile importate (ex: „Dezv comp esentiale … pt pers implicat"). Includem
  // DOAR abrevieri cu sens unic în contextul apelurilor de finanțare — evităm
  // intenționat ambigue („comp" → competențe/companii/compatibil) ca să nu
  // fabricăm text greșit. Match pe cuvânt întreg, păstrând majuscula inițială.
  title = expandTitleAbbreviations(title);

  if (title.length <= maxLength) return title;
  const truncated = title.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const base = lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated;
  return `${base.replace(/[\s.,;:–—-]+$/, "")}…`;
}

// Set CONSERVATOR de prescurtări → formă completă. Cheile sunt lowercase; match
// pe cuvânt întreg, case-insensitive, cu păstrarea majusculei inițiale. NU adăuga
// aici abrevieri ambigue (al căror sens depinde de context) — riscul e să afișăm
// un titlu greșit, mai rău decât unul abreviat.
const TITLE_ABBREVIATIONS: Record<string, string> = {
  dezv: "dezvoltare",
  pt: "pentru",
  pers: "persoane",
  priv: "privind",
};

function expandTitleAbbreviations(title: string): string {
  return title.replace(/[A-Za-zĂÂÎȘȚăâîșț]+/g, (word) => {
    const expansion = TITLE_ABBREVIATIONS[word.toLowerCase()];
    if (!expansion) return word;
    // Păstrează majuscula inițială dacă abrevierea era capitalizată.
    return word[0] === word[0].toUpperCase()
      ? expansion[0].toUpperCase() + expansion.slice(1)
      : expansion;
  });
}

export function stripHtml(text: string | null | undefined): string {
  if (!text) return "";
  let cleaned = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\b(id|class|style|href|src|data-\w+)\s*=\s*"[^"]*"\s*>?/gi, " ")
    .replace(/\b(id|class|style|href|src|data-\w+)\s*=\s*'[^']*'\s*>?/gi, " ")
    .replace(/<\/?[a-z][a-z0-9]*[^>]*$/gi, " ")
    .replace(/^\s*>/gm, " ");
  const doc = new DOMParser().parseFromString(cleaned, "text/html");
  return (doc.body.textContent || "").replace(/\s{2,}/g, " ").trim();
}
