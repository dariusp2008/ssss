/**
 * Clasificare a stării juridice reale a unei firme pe baza câmpului brut
 * `companies.stare_firma` (textul din registrul comerțului / Termene).
 *
 * IMPORTANT: badge-ul "Activ" de pe companii reflectă DOAR statusul de
 * verificare (`companies.status` = active/pending/failed), NU starea juridică
 * reală. O firmă cu `stare_firma="RADIERE din data 15 Aprilie 2005"` apare
 * "Activ" deși e radiată și nu poate primi finanțare. Acest helper este SINGURA
 * sursă de adevăr pentru lista de keyword-uri terminale — UI-ul îl consumă, nu
 * reimplementează clasificarea inline.
 */

/**
 * Keyword-uri (normalizate: lowercase + fără diacritice) care marchează o stare
 * juridică TERMINALĂ / neeligibilă. Lista este sursa unică de adevăr.
 */
const TERMINAL_KEYWORDS = [
  "radiere",
  "radiata",
  "radiat",
  "dizolvare",
  "dizolvat",
  "lichidare",
  "faliment",
  "insolventa",
  "insolvent",
  "suspendare",
  "suspendat",
  "intrerupere activitate",
  "intrerupere temporara",
] as const;

export interface CompanyLegalState {
  /** true dacă firma figurează într-o stare terminală / neeligibilă. */
  isTerminal: boolean;
  /** Etichetă scurtă în română potrivită pentru badge. */
  label: string;
}

/**
 * Normalizează textul brut: lowercase, elimină diacritice, colapsează spațiile.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clasifică starea juridică a unei firme pe baza câmpului `stare_firma`.
 *
 * - TERMINAL (isTerminal=true): RADIERE, DIZOLVARE, LICHIDARE, FALIMENT,
 *   INSOLVENȚĂ, SUSPENDARE, ÎNTRERUPERE ACTIVITATE.
 * - ACTIV (isTerminal=false): "funcțiune", "ÎNREGISTRAT din data...", precum și
 *   `stare_firma` lipsă/necunoscută (nu putem afirma că e terminală).
 */
export function getCompanyLegalState(stareFirma?: string | null): CompanyLegalState {
  if (!stareFirma || !stareFirma.trim()) {
    return { isTerminal: false, label: "" };
  }

  const norm = normalize(stareFirma);
  const isTerminal = TERMINAL_KEYWORDS.some((kw) => norm.includes(kw));

  return {
    isTerminal,
    label: isTerminal ? "Firmă radiată/inactivă juridic" : "",
  };
}

/** Mesaj de avertizare scurt afișat lângă badge-ul terminal. */
export const TERMINAL_WARNING_MESSAGE =
  "Această firmă figurează ca radiată/inactivă în registru — nu este eligibilă pentru depunere.";
