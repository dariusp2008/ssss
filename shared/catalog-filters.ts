/**
 * Static reference data shared by backend filtering and frontend UI for the
 * funding-calls catalog.
 *
 * - BENEFICIARY_TYPES: controlled vocabulary stored in `funding_calls.beneficiary_types`
 * - ELIGIBLE_REGIONS: 8 Romanian development regions + a "national" pseudo-region
 *   that matches calls with empty `eligible_regions` (national coverage)
 * - SECTORS: 12 predefined sectors mapped to curated CAEN lists + keywords used
 *   for FTS fallback over `name` / `description` / `summary`
 * - FUNDING_AMOUNT_PRESETS: suggested steps for the amount range filter
 */

export interface BeneficiaryType {
  value: string;
  label: string;
}

export const BENEFICIARY_TYPES: BeneficiaryType[] = [
  { value: "imm", label: "IMM (Întreprinderi mici și mijlocii)" },
  { value: "companii-private", label: "Companii private" },
  { value: "startup", label: "Start-up-uri" },
  { value: "ong", label: "ONG-uri" },
  { value: "autoritati-publice", label: "Autorități publice" },
  { value: "institutii-invatamant", label: "Instituții de învățământ" },
  { value: "institutii-cercetare", label: "Instituții de cercetare" },
  { value: "spitale", label: "Spitale" },
  { value: "pfa-ii", label: "PFA / Întreprinderi individuale" },
  { value: "cooperative", label: "Cooperative" },
  { value: "gal", label: "Grupuri de Acțiune Locală (GAL)" },
  { value: "altele", label: "Altele" },
];

/**
 * Canonical company-size vocabulary used end-to-end by the Match Engine.
 *
 * Both the funding-call side (`funding_calls.eligible_size_categories`) and
 * the company side (`getCompanySizeCategory` in `server/rag.ts`) MUST emit
 * values from this list. Historical (pre-2026-04-30) data used variants like
 * "Microintreprindere"/"Intreprindere mica"/"mică"; the
 * `normalizeSizeCategory` helper in `server/match-engine-helpers.ts` maps
 * those to the canonical vocabulary, and the
 * `migrations/2026-04-30_normalize_size_categories.sql` one-shot migration
 * normalises any rows still on the legacy vocab.
 */
export const SIZE_CATEGORIES = ["micro", "mica", "mijlocie", "mare"] as const;
export type SizeCategoryValue = (typeof SIZE_CATEGORIES)[number];

export const SIZE_CATEGORY_LABELS: Record<SizeCategoryValue, string> = {
  micro: "Microîntreprindere",
  mica: "Întreprindere mică",
  mijlocie: "Întreprindere mijlocie",
  mare: "Întreprindere mare",
};

export const NATIONAL_REGION_VALUE = "national";

export interface EligibleRegion {
  value: string;
  label: string;
  isNational?: boolean;
}

export const ELIGIBLE_REGIONS: EligibleRegion[] = [
  { value: NATIONAL_REGION_VALUE, label: "Național (toate regiunile)", isNational: true },
  { value: "Nord-Est", label: "Nord-Est" },
  { value: "Sud-Est", label: "Sud-Est" },
  { value: "Sud-Muntenia", label: "Sud-Muntenia" },
  { value: "Sud-Vest Oltenia", label: "Sud-Vest Oltenia" },
  { value: "Vest", label: "Vest" },
  { value: "Nord-Vest", label: "Nord-Vest" },
  { value: "Centru", label: "Centru" },
  { value: "București-Ilfov", label: "București-Ilfov" },
];

export interface Sector {
  slug: string;
  label: string;
  /** CAEN Rev.2 codes (4-digit, no separator) curated for this sector. */
  caenCodes: string[];
  /** Keywords used for FTS fallback over `name`/`description`/`summary`. */
  keywords: string[];
}

export const SECTORS: Sector[] = [
  {
    slug: "agricultura",
    label: "Agricultură",
    caenCodes: [
      "0111","0112","0113","0114","0115","0116","0119",
      "0121","0122","0123","0124","0125","0126","0127","0128","0129","0130",
      "0141","0142","0143","0144","0145","0146","0147","0149","0150",
      "0161","0162","0163","0164",
      "0170","0210","0220","0230","0240",
      "0311","0312","0321","0322",
    ],
    keywords: ["agricultur", "ferm", "fermier", "agricol", "cultur agricol", "zootehnie", "horticultur", "viticultur"],
  },
  {
    slug: "digitalizare",
    label: "Digitalizare / IT",
    caenCodes: [
      "5821","5829",
      "6201","6202","6203","6209",
      "6311","6312","6391","6399",
      "2620","2630","2640","2670","2680",
      "9511","9512",
    ],
    keywords: ["digitaliz", "transformare digital", "IT", "software", "tehnologi", "cloud", "cibernetic", "inteligen artificial", "automatiz"],
  },
  {
    slug: "energie",
    label: "Energie",
    caenCodes: [
      "0510","0520","0610","0620",
      "1910","1920","2014",
      "3511","3512","3513","3514","3521","3522","3523","3530",
      "4221","4222",
    ],
    keywords: ["energie", "regenerabil", "fotovoltaic", "eolian", "solar", "biomas", "eficien energetic"],
  },
  {
    slug: "horeca",
    label: "HoReCa (Hoteluri / Restaurante / Catering)",
    caenCodes: [
      "5510","5520","5530","5590",
      "5610","5621","5629","5630",
    ],
    keywords: ["horeca", "hotel", "restaurant", "cazare", "pensiune", "catering", "alimentatie publica", "alimentaț"],
  },
  {
    slug: "productie",
    label: "Producție / Industrie prelucrătoare",
    caenCodes: [
      "1011","1012","1013","1020","1031","1032","1039",
      "1041","1042","1051","1052","1061","1062","1071","1072","1073","1081","1082","1083","1084","1085","1086","1089","1091","1092",
      "1101","1102","1103","1104","1105","1106","1107",
      "1310","1320","1330","1391","1392","1393","1394","1395","1396","1399",
      "1411","1412","1413","1414","1419","1420","1431","1439",
      "1511","1512","1520",
      "1610","1621","1622","1623","1624","1629",
      "1711","1712","1721","1722","1723","1724","1729",
      "1811","1812","1813","1814","1820",
      "2010","2011","2012","2013","2015","2016","2017","2020","2030","2041","2042","2051","2052","2053","2059",
      "2110","2120",
      "2211","2219","2221","2222","2223","2229",
      "2311","2312","2313","2314","2319","2320","2331","2332","2341","2342","2343","2344","2349","2351","2352","2361","2362","2363","2364","2365","2369","2370","2391","2399",
      "2410","2420","2431","2432","2433","2434","2441","2442","2443","2444","2445","2446","2451","2452","2453","2454",
      "2511","2512","2521","2529","2530","2540","2550","2561","2562","2571","2572","2573","2591","2592","2593","2594","2599",
      "2611","2612","2620","2630","2640","2651","2652","2660","2670","2680",
      "2711","2712","2720","2731","2732","2733","2740","2751","2752","2790",
      "2811","2812","2813","2814","2815","2821","2822","2823","2824","2825","2829","2830","2841","2849","2891","2892","2893","2894","2895","2896","2899",
      "2910","2920","2931","2932",
      "3011","3012","3020","3030","3040","3091","3092","3099",
      "3101","3102","3103","3109","3211","3212","3213","3220","3230","3240","3250","3291","3299",
      "3311","3312","3313","3314","3315","3316","3317","3319","3320",
    ],
    keywords: ["produc", "prelucr", "fabric", "manufactur", "industri", "uzin", "atelier"],
  },
  {
    slug: "sanatate",
    label: "Sănătate",
    caenCodes: [
      "8610","8621","8622","8623","8690",
      "8710","8720","8730","8790",
      "2110","2120",
      "3250",
      "8810","8891","8899",
    ],
    keywords: ["sanat", "sănăt", "medical", "spital", "clinica", "farmac", "ingrijir", "îngrijir"],
  },
  {
    slug: "turism",
    label: "Turism",
    caenCodes: [
      "5510","5520","5530","5590",
      "7711","7721","7722","7729","7733","7734","7735","7739","7740",
      "7911","7912","7990",
      "9001","9002","9003","9004",
      "9101","9102","9103","9104",
      "9311","9312","9313","9319","9321","9329",
    ],
    keywords: ["turism", "turist", "agroturism", "ecoturism", "agentie de turism", "agenție de turism"],
  },
  {
    slug: "transport",
    label: "Transport / Logistică",
    caenCodes: [
      "4910","4920","4931","4932","4939","4941","4942","4950",
      "5010","5020","5030","5040",
      "5110","5121","5122",
      "5210","5221","5222","5223","5224","5229",
      "5310","5320",
    ],
    keywords: ["transport", "logistic", "depozit", "expedi", "curier"],
  },
  {
    slug: "mediu",
    label: "Mediu / Economie circulară",
    caenCodes: [
      "3700","3811","3812","3821","3822","3831","3832","3900",
      "3600","3530",
      "0210","0220","0240",
    ],
    keywords: ["mediu", "ecologi", "circular", "deseuri", "deșeuri", "reciclar", "recicl", "biodiversit", "decarbon"],
  },
  {
    slug: "educatie",
    label: "Educație",
    caenCodes: [
      "8510","8520","8531","8532","8541","8542","8551","8552","8553","8559","8560",
    ],
    keywords: ["educati", "educaț", "scoala", "școală", "învățământ", "invatamant", "universita", "formare profesional"],
  },
  {
    slug: "constructii",
    label: "Construcții",
    caenCodes: [
      "4110","4120",
      "4211","4212","4213","4221","4222","4291","4299",
      "4311","4312","4313",
      "4321","4322","4329",
      "4331","4332","4333","4334","4339",
      "4391","4399",
    ],
    keywords: ["construc", "edific", "infrastructur"],
  },
  {
    slug: "servicii",
    label: "Servicii",
    caenCodes: [
      "6910","6920",
      "7010","7021","7022",
      "7111","7112","7120",
      "7211","7219","7220",
      "7311","7312","7320",
      "7410","7420","7430","7490","7500",
      "7711","7712","7721","7722","7729","7731","7732","7733","7734","7735","7739","7740",
      "7810","7820","7830",
      "8010","8020","8030",
      "8110","8121","8122","8129","8130",
      "8211","8219","8220","8230","8291","8292","8299",
      "9511","9512","9521","9522","9523","9524","9525","9529",
      "9601","9602","9603","9604","9609",
    ],
    keywords: ["servicii", "consultan", "outsourcing"],
  },
];

export const SECTOR_BY_SLUG: Map<string, Sector> = new Map(SECTORS.map((s) => [s.slug, s]));

export interface FundingAmountPreset {
  /** Suggested chip label, e.g. "≤ 50K" */
  label: string;
  /** EUR-equivalent threshold, in absolute units (no thousand separator). */
  min?: number;
  max?: number;
}

export const FUNDING_AMOUNT_PRESETS: FundingAmountPreset[] = [
  { label: "≤ 50K", max: 50_000 },
  { label: "50K – 200K", min: 50_000, max: 200_000 },
  { label: "200K – 1M", min: 200_000, max: 1_000_000 },
  { label: "1M – 5M", min: 1_000_000, max: 5_000_000 },
  { label: "5M – 20M", min: 5_000_000, max: 20_000_000 },
  { label: "≥ 20M", min: 20_000_000 },
];

/** Format a funding amount as a short, human-friendly string. */
export function formatFundingAmount(value: number, currency = "EUR"): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M ${currency}`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K ${currency}`;
  }
  return `${value} ${currency}`;
}

/**
 * Romanian county → development region mapping. Used by both the server-side
 * Match Engine (`getCompanyRegion` in `server/rag.ts` re-exports this) and by
 * the funding-calls catalog UI to derive a company's region from `judet`.
 *
 * Both diacritic and ASCII forms are accepted so we don't need a normalisation
 * step at every call site.
 */
const JUDETE_REGIUNI: Record<string, string> = {
  "Bacău": "Nord-Est", "Botoșani": "Nord-Est", "Iași": "Nord-Est", "Neamț": "Nord-Est", "Suceava": "Nord-Est", "Vaslui": "Nord-Est",
  "Brăila": "Sud-Est", "Buzău": "Sud-Est", "Constanța": "Sud-Est", "Galați": "Sud-Est", "Tulcea": "Sud-Est", "Vrancea": "Sud-Est",
  "Argeș": "Sud-Muntenia", "Călărași": "Sud-Muntenia", "Dâmbovița": "Sud-Muntenia", "Giurgiu": "Sud-Muntenia", "Ialomița": "Sud-Muntenia", "Prahova": "Sud-Muntenia", "Teleorman": "Sud-Muntenia",
  "Dolj": "Sud-Vest Oltenia", "Gorj": "Sud-Vest Oltenia", "Mehedinți": "Sud-Vest Oltenia", "Olt": "Sud-Vest Oltenia", "Vâlcea": "Sud-Vest Oltenia",
  "Arad": "Vest", "Caraș-Severin": "Vest", "Hunedoara": "Vest", "Timiș": "Vest",
  "Bihor": "Nord-Vest", "Bistrița-Năsăud": "Nord-Vest", "Cluj": "Nord-Vest", "Maramureș": "Nord-Vest", "Satu Mare": "Nord-Vest", "Sălaj": "Nord-Vest",
  "Alba": "Centru", "Brașov": "Centru", "Covasna": "Centru", "Harghita": "Centru", "Mureș": "Centru", "Sibiu": "Centru",
  "București": "București-Ilfov", "Ilfov": "București-Ilfov",
  // ASCII variant for București — fix Task C (26 mai 2026): without this,
  // companies stored with the ASCII judet "Bucuresti" (e.g. ICECHIM on PROD)
  // returned NULL region and silently bypassed Fix #1 region eliminatory.
  "Bucuresti": "București-Ilfov",
  "Bacau": "Nord-Est", "Botosani": "Nord-Est", "Iasi": "Nord-Est", "Neamt": "Nord-Est",
  "Braila": "Sud-Est", "Buzau": "Sud-Est", "Constanta": "Sud-Est", "Galati": "Sud-Est",
  "Arges": "Sud-Muntenia", "Calarasi": "Sud-Muntenia", "Dambovita": "Sud-Muntenia", "Ialomita": "Sud-Muntenia",
  "Valcea": "Sud-Vest Oltenia", "Mehedinti": "Sud-Vest Oltenia",
  "Caras-Severin": "Vest", "Timis": "Vest",
  "Bistrita-Nasaud": "Nord-Vest", "Maramures": "Nord-Vest", "Salaj": "Nord-Vest", "Satu-Mare": "Nord-Vest",
  "Brasov": "Centru", "Mures": "Centru",
};

export function getCompanyRegion(judet: string | null | undefined): string | null {
  if (!judet) return null;
  const normalized = judet.trim();
  return (
    JUDETE_REGIUNI[normalized] ||
    JUDETE_REGIUNI[normalized.replace(/[ăâîșț]/g, (c) => ({ "ă": "a", "â": "a", "î": "i", "ș": "s", "ț": "t" }[c] || c))] ||
    null
  );
}

const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Lista normalizată (ASCII, lowercase) a denumirilor de județ → regiune, derivată
// din `JUDETE_REGIUNI`. Sortată descrescător după lungime ca formele compuse
// (ex. „satu mare", „caras-severin") să fie testate înaintea celor scurte.
const JUDET_NAME_TO_REGION: Array<{ name: string; region: string }> = Array.from(
  new Map(
    Object.entries(JUDETE_REGIUNI).map(([judet, region]) => [stripDiacritics(judet), region]),
  ).entries(),
)
  .map(([name, region]) => ({ name, region }))
  .sort((a, b) => b.name.length - a.name.length);

/**
 * Extrage regiunile menționate într-un text liber pe baza denumirilor de JUDEȚ
 * (ex. „un proiect în Cluj" → „Nord-Vest"). Complementar cu
 * `extractRegionsFromText` (care detectează numele de REGIUNE direct). Match pe
 * cuvânt întreg pe textul fără diacritice, ca să evităm false-pozitive din
 * substrings (ex. „olt" în „revolut"). Returnează regiuni canonice deduplicate.
 */
export function extractRegionsFromJudete(text: string | null | undefined): string[] {
  if (!text) return [];
  const norm = stripDiacritics(text);
  const regions = new Set<string>();
  for (const { name, region } of JUDET_NAME_TO_REGION) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(norm)) {
      regions.add(region);
    }
  }
  return Array.from(regions);
}

/**
 * Best-effort mapping from a company's organizational form / entity type to a
 * single beneficiary slug from BENEFICIARY_TYPES. Used by the catalog UI to
 * pre-fill the beneficiary filter when "Folosește profilul companiei" is on.
 *
 * Returns `null` when the company shape doesn't fit any single slug
 * confidently — the UI should leave the filter empty in that case.
 */
export function inferBeneficiaryFromCompany(company: {
  formaOrganizare?: string | null;
  entityType?: string | null;
  employees?: number | null;
  revenue?: number | null;
}): string | null {
  const haystack = [company.formaOrganizare, company.entityType]
    .filter((v): v is string => !!v)
    .join(" ")
    .toLowerCase();

  if (!haystack) {
    if ((company.employees ?? 0) < 250) return "imm";
    return "companii-private";
  }

  if (/\bpfa\b|persoan(?:a|ă) fizic(?:a|ă) autorizat|întreprinder(?:e|i) individual|intreprinder(?:e|i) individual|i\.?i\.?\b|ii\b/.test(haystack)) {
    return "pfa-ii";
  }
  if (/\bong\b|asociat|fundati|fundaț/.test(haystack)) {
    return "ong";
  }
  if (/cooperativ/.test(haystack)) {
    return "cooperative";
  }
  if (/autoritat|primari|consiliu (?:judetean|jude(?:ț|t)ean|local)|institu(?:ț|t)ie public/.test(haystack)) {
    return "autoritati-publice";
  }
  if (/(?:univers|facult|liceu|scoal|școal|inv(?:ă|a)(?:ț|t)(?:ă|a)mant|institu(?:ț|t)ie de înv|institu(?:ț|t)ie de inv)/.test(haystack)) {
    return "institutii-invatamant";
  }
  if (/spital|clinic/.test(haystack)) {
    return "spitale";
  }
  if (/(?:s\.?r\.?l|s\.?a|srl|microîntreprinder|microintreprinder|întreprinder|intreprinder)/.test(haystack)) {
    if ((company.employees ?? 0) < 250 && (company.revenue ?? 0) <= 250_000_000) return "imm";
    return "companii-private";
  }

  return null;
}

/** Lookup helper used by both backend and frontend. */
export function getBeneficiaryLabel(value: string): string {
  return BENEFICIARY_TYPES.find((b) => b.value === value)?.label ?? value;
}

export function getRegionLabel(value: string): string {
  return ELIGIBLE_REGIONS.find((r) => r.value === value)?.label ?? value;
}

export function getSectorLabel(slug: string): string {
  return SECTOR_BY_SLUG.get(slug)?.label ?? slug;
}
