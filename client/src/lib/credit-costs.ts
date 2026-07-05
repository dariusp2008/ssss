export interface CreditCostRow {
  action: string;
  credit_cost: number;
  label: string;
  description: string;
}

export const CREDIT_ACTION = {
  eligibilityCheck: "eligibility_check",
  matchEngine: "match_engine",
  aiProfile: "ai_profile",
  generateIcp: "generate_icp",
  // Adăugare companie + „Actualizează date" taxează acțiunea `termene_lookup`
  // („Verificare companie"). Nu există un cost separat „add_company".
  companyData: "termene_lookup",
} as const;

export function getActionCost(
  costs: CreditCostRow[] | undefined,
  action: string,
  fallback: number,
): number {
  return costs?.find((c) => c.action === action)?.credit_cost ?? fallback;
}
