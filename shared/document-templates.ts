// Configurație extensibilă pentru template-urile de documente narative generabile cu AI.
// Indexată pe tipul documentului. MVP: doar "plan_afaceri".
// Pentru a adăuga un tip nou: adaugă o intrare în DOCUMENT_TEMPLATES cu secțiunile sale.
// Fiecare secțiune are: key (unic în template), title (RO), order, promptInstructions
// (instrucțiuni specifice secțiunii pasate motorului de generare).

export interface DocumentTemplateSection {
  key: string;
  title: string;
  order: number;
  promptInstructions: string;
}

export interface DocumentTemplate {
  type: string;
  label: string;
  description: string;
  sections: DocumentTemplateSection[];
}

const PLAN_AFACERI_SECTIONS: DocumentTemplateSection[] = [
  {
    key: "rezumat_executiv",
    title: "Rezumat executiv",
    order: 1,
    promptInstructions:
      "Sintetizează esența proiectului: ce face compania, ce problemă rezolvă proiectul propus, valoarea solicitată și impactul așteptat. 2-4 paragrafe, ton profesional, fără liste lungi. Aceasta este secțiunea de deschidere care convinge evaluatorul.",
  },
  {
    key: "descrierea_companiei",
    title: "Descrierea companiei",
    order: 2,
    promptInstructions:
      "Prezintă compania solicitantă: domeniu de activitate (CAEN), istoric, formă juridică, dimensiune (angajați, cifră de afaceri), localizare și poziționare pe piață. Folosește datele reale din profilul companiei. Nu inventa cifre care nu există.",
  },
  {
    key: "produs_serviciu",
    title: "Produsul / serviciul proiectului",
    order: 3,
    promptInstructions:
      "Descrie concret produsul sau serviciul care va rezulta din proiect, plecând de la ideea de proiect furnizată de utilizator. Explică caracteristicile, gradul de inovare și avantajele față de alternativele existente.",
  },
  {
    key: "analiza_pietei",
    title: "Analiza pieței și concurența",
    order: 4,
    promptInstructions:
      "Analizează piața țintă: segmente de clienți, dimensiune și tendințe, principalii concurenți și avantajul competitiv al companiei. Corelează cu profilul clientului ideal (ICP) al apelului dacă este disponibil.",
  },
  {
    key: "strategie_marketing",
    title: "Strategie de marketing și vânzări",
    order: 5,
    promptInstructions:
      "Descrie strategia de promovare, canalele de vânzare, politica de preț și modul de atragere și fidelizare a clienților pentru produsul/serviciul proiectului.",
  },
  {
    key: "plan_operational",
    title: "Plan operațional",
    order: 6,
    promptInstructions:
      "Detaliază cum va funcționa operațional proiectul: procese-cheie, resurse necesare (echipamente, spații, furnizori), fluxul de producție/livrare și capacitatea operațională.",
  },
  {
    key: "echipa_management",
    title: "Echipă și management",
    order: 7,
    promptInstructions:
      "Prezintă structura echipei și a managementului, rolurile-cheie și competențele relevante pentru implementarea proiectului. Dacă nu există date despre persoane, descrie rolurile necesare fără a inventa nume.",
  },
  {
    key: "plan_implementare",
    title: "Plan de implementare și calendar",
    order: 8,
    promptInstructions:
      "Construiește un plan de implementare pe etape/activități, corelat cu durata proiectului furnizată de utilizator. Indică etapele majore, ordinea logică și jaloanele (milestones). Poți folosi o listă structurată pe activități.",
  },
  {
    key: "proiectii_financiare",
    title: "Proiecții financiare și justificarea bugetului",
    order: 9,
    promptInstructions:
      "Justifică bugetul estimat furnizat de utilizator: principalele categorii de cheltuieli, corelarea cu activitățile și sustenabilitatea financiară după finalizarea proiectului. Folosește cifrele reale ale companiei când există; nu inventa proiecții detaliate fără bază.",
  },
  {
    key: "analiza_riscuri",
    title: "Analiză de riscuri",
    order: 10,
    promptInstructions:
      "Identifică principalele riscuri (de piață, operaționale, financiare, de implementare) și măsurile de prevenire și diminuare aferente.",
  },
  {
    key: "impact_sustenabilitate",
    title: "Impact și sustenabilitate",
    order: 11,
    promptInstructions:
      "Descrie impactul economic, social și, dacă e relevant, de mediu al proiectului, precum și sustenabilitatea rezultatelor după încheierea finanțării. Corelează cu obiectivele apelului de finanțare.",
  },
];

export const DOCUMENT_TEMPLATES: Record<string, DocumentTemplate> = {
  plan_afaceri: {
    type: "plan_afaceri",
    label: "Plan de afaceri",
    description: "Plan de afaceri narativ structurat pentru depunerea la un apel de finanțare.",
    sections: PLAN_AFACERI_SECTIONS,
  },
};

export function getDocumentTemplate(type: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES[type];
}

export function isSupportedDraftType(type: string): boolean {
  return type in DOCUMENT_TEMPLATES;
}

// Slug canonic pentru documentul „Plan de afaceri". Extracția AI folosește deja
// `plan_afaceri`; `business_plan` rămâne acceptat doar ca slug legacy (lista statică veche).
export const BUSINESS_PLAN_CANONICAL_TYPE = "plan_afaceri";
export const BUSINESS_PLAN_DOC_TYPES = ["plan_afaceri", "business_plan"];

export function isBusinessPlanDocType(type: string | null | undefined): boolean {
  return type != null && BUSINESS_PLAN_DOC_TYPES.includes(type);
}

// Etichete terminale pentru progresul generării de draft (SSE) — folosite de AMBELE
// părți (ruta server emite, clientul detectează succes/eșec). Detecția se bazează pe
// label-ul evenimentului final, NU pe euristici de versiune → corelată cu operațiunea.
export const DRAFT_PROGRESS_DONE_LABEL = "Draft finalizat";
export const DRAFT_PROGRESS_ERROR_LABEL = "Eroare la generarea draftului";

// Sentinel folosit în `criteria` pentru a marca persistent o nepotrivire de relevanță
// (documentul aparține altui apel/program sau altui solicitant). Detectat în UI pentru
// a afișa un avertisment proeminent, separat de „elemente lipsă". Evită o migrație de
// schemă pe `conformity_reports` (vezi gotcha „Schema drift PROD vs DEV").
export const RELEVANCE_MISMATCH_REQUIREMENT = "Relevanță document (apel + solicitant)";

export function findRelevanceMismatch(
  criteria: Array<{ requirement: string; status: string; details: string }> | null | undefined,
): { reason: string } | null {
  if (!Array.isArray(criteria)) return null;
  const hit = criteria.find(
    (c) => c?.requirement === RELEVANCE_MISMATCH_REQUIREMENT && c?.status === "neîndeplinit",
  );
  return hit ? { reason: hit.details || "" } : null;
}
