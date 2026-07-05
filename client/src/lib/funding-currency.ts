// BUG-03 fix: single reference currency per funding call, formatted consistently
// across every view (catalog card, modal, detail page).
//
// Toate apelurile stochează moneda de referință în coloana `moneda`. Coloanele
// specifice (`monedaUe` / `monedaNational` / `monedaMaxFunding`) sunt opționale
// și aproape mereu null; când sunt populate, formularul de editare le ține
// sincronizate cu `moneda`. De aceea `moneda` este sursa de adevăr și are
// prioritate. NU fabricăm „EUR" când nu cunoaștem moneda (vezi replit.md):
// o etichetă greșită (EUR vs RON, ~5x diferență) e mai periculoasă decât lipsa ei.

export type CallCurrencyFields = {
  moneda?: string | null;
  monedaUe?: string | null;
  monedaNational?: string | null;
  monedaMaxFunding?: string | null;
};

export function getCallCurrency(
  call: CallCurrencyFields | null | undefined,
): string | null {
  if (!call) return null;
  const candidates = [
    call.moneda,
    call.monedaUe,
    call.monedaNational,
    call.monedaMaxFunding,
  ];
  for (const candidate of candidates) {
    const trimmed = candidate ? String(candidate).trim() : "";
    if (trimmed) return trimmed.toUpperCase();
  }
  return null;
}

// Lipește moneda de referință la o sumă deja formatată. Dacă moneda e
// necunoscută, returnează doar suma (fără etichetă fabricată).
export function withCallCurrency(
  formattedAmount: string,
  call: CallCurrencyFields | null | undefined,
): string {
  const currency = getCallCurrency(call);
  return currency ? `${formattedAmount} ${currency}` : formattedAmount;
}

// Semantica bugetelor (parsare + clasificare „maxim/proiect" vs anvelopă) trăiește
// în `@shared/budget` ca sursă unică de adevăr, reutilizată de server la ingestie.
// Re-exportăm aici pentru consumatorii client existenți.
export {
  parseBudgetAmount,
  isGenuineProjectMax,
  sanitizeProjectMaxFunding,
  type CallBudgetFields,
} from "@shared/budget";
