// Sursă unică de adevăr pentru semantica bugetelor, folosită ATÂT de client
// (etichete catalog/detaliu) CÂT și de server (sanitizare la import/extracție).
//
// Câmpurile de anvelopă (`bugetUe` / `bugetNational`) sunt coloane text care pot
// conține formatare („142.657.200", „21.144.119 EUR", „5 mil."). `parseBudgetAmount`
// extrage suma numerică, scalând sufixele de magnitudine RO.

export type CallBudgetFields = {
  maxFunding?: number | null;
  bugetUe?: string | number | null;
  bugetNational?: string | number | null;
};

// Extrage suma numerică, păstrând DOAR cifrele și separatorul zecimal. Tratează
// atât „.” cât și „,” ca posibili separatori: dacă apar ambele, ultimul e zecimal;
// altfel ghicim după poziție (un singur „,”/„.” cu ≤2 zecimale la final = zecimal).
// Detectează ÎNTÂI sufixul de magnitudine („mil"/„milioane"/„mii"/„miliarde") și
// scalează corespunzător. Returnează null când nu există nicio cifră.
export function parseBudgetAmount(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  // Detectează sufixul de magnitudine ÎNAINTE de a elimina literele (ex:
  // „5 mil." → ×1.000.000, „100 mii lei" → ×1.000, „1,5 miliarde" → ×1e9).
  // Ordinea contează: „miliard" conține „mil" ca prefix.
  const lower = raw.toLowerCase();
  let scale = 1;
  if (/miliard|\bmld\b/.test(lower)) scale = 1_000_000_000;
  else if (/milioane|milion|\bmil\.?\b|\bmln\b/.test(lower)) scale = 1_000_000;
  else if (/\bmii\b/.test(lower)) scale = 1_000;
  // Păstrează doar cifre, „.” și „,”.
  const cleaned = raw.replace(/[^0-9.,]/g, "");
  if (!cleaned || !/[0-9]/.test(cleaned)) return null;

  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");
  let normalized = cleaned;
  if (hasDot && hasComma) {
    // Ultimul separator întâlnit e cel zecimal; celălalt e separator de mii.
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    normalized = cleaned.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (hasComma) {
    const parts = cleaned.split(",");
    // „1,5" (un singur grup ≤2 cifre la final) = zecimal; altfel separator de mii.
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = `${parts[0]}.${parts[1]}`;
    } else {
      normalized = parts.join("");
    }
  } else if (hasDot) {
    const parts = cleaned.split(".");
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = `${parts[0]}.${parts[1]}`;
    } else {
      normalized = parts.join("");
    }
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n * scale : null;
}

// `max_funding` reprezintă (în intenție) maximul pe proiect, dar pe multe apeluri
// importate conține de fapt ANVELOPA totală a programului (egală cu bugetUe sau
// bugetNational). Afișarea ei ca „Maxim/proiect" induce consultantul în eroare cu
// 2-3 ordine de mărime. Considerăm `max_funding` un maxim/proiect GENUIN doar când
// e prezent, pozitiv ȘI diferă atât de anvelopa UE cât și de cea națională
// (toleranță relativă mică pentru rotunjiri). Vechea verificare compara DOAR cu
// bugetUe → eticheta înșelătoare rămânea pe apelurile unde anvelopa e în bugetNational.
export function isGenuineProjectMax(call: CallBudgetFields | null | undefined): boolean {
  if (!call) return false;
  const maxFunding = call.maxFunding;
  if (maxFunding == null || !(maxFunding > 0)) return false;

  const matchesEnvelope = (envelope: string | number | null | undefined): boolean => {
    const env = parseBudgetAmount(envelope);
    if (env == null || env <= 0) return false;
    // Toleranță relativă 0.5% (acoperă rotunjiri / formatare) plus o toleranță
    // absolută mică pentru sume mici.
    const tol = Math.max(env * 0.005, 1);
    return Math.abs(maxFunding - env) <= tol;
  };

  if (matchesEnvelope(call.bugetUe)) return false;
  if (matchesEnvelope(call.bugetNational)) return false;
  return true;
}

// Sanitizare la INGESTIE (Task #151, Pasul 2): nu stoca anvelopa programului în
// `max_funding`. Returnează valoarea doar dacă e un maxim/proiect genuin (diferit
// de ambele anvelope); altfel `null`. Apelată la import/extracție/regenerare
// pentru a opri la sursă eticheta „Maxim/proiect" înșelătoare — nu doar a o ascunde
// în UI.
export function sanitizeProjectMaxFunding(
  maxFunding: number | null | undefined,
  bugetUe: string | number | null | undefined,
  bugetNational: string | number | null | undefined,
): number | null {
  if (maxFunding == null || !(maxFunding > 0)) return null;
  return isGenuineProjectMax({ maxFunding, bugetUe, bugetNational }) ? maxFunding : null;
}
