// Shared configuration for contextual micro-survey triggers.
// Trusted source for both backend (validation) and frontend (rendering).

export type SurveyQuestionKind =
  | "rating5"
  | "yesNoPartial"
  | "thumbs"
  | "multiSelect"
  | "shortText";

export interface SurveyQuestion {
  id: string;
  kind: SurveyQuestionKind;
  label: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  showWhen?: { questionId: string; equals: string };
  placeholder?: string;
  maxLength?: number;
}

export interface SurveyConfig {
  triggerEvent: string;
  title: string;
  subtitle?: string;
  questions: SurveyQuestion[];
}

export const TRIGGER_EVENTS = [
  "match_results",
  "eligibility_verdict",
  "rag_first_answer",
  "onboarding_7d",
] as const;

export type TriggerEvent = typeof TRIGGER_EVENTS[number];

export const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  match_results: "Post-matching",
  eligibility_verdict: "Post-verificare eligibilitate",
  rag_first_answer: "Post-răspuns AI chat",
  onboarding_7d: "După 7 zile de la onboarding",
};

export const SURVEY_CONFIGS: Record<TriggerEvent, SurveyConfig> = {
  match_results: {
    triggerEvent: "match_results",
    title: "Cât de relevante sunt apelurile găsite?",
    subtitle: "Feedback-ul tău ne ajută să îmbunătățim potrivirea",
    questions: [
      {
        id: "rating",
        kind: "rating5",
        label: "Cât de relevante sunt rezultatele?",
        required: true,
      },
      {
        id: "improvement",
        kind: "shortText",
        label: "Ce ar putea fi îmbunătățit? (opțional)",
        placeholder: "Ex: lipsesc apeluri pentru sectorul meu, scoruri prea mari etc.",
        maxLength: 500,
      },
    ],
  },
  eligibility_verdict: {
    triggerEvent: "eligibility_verdict",
    title: "Verdictul de eligibilitate a fost corect față de așteptările tale?",
    questions: [
      {
        id: "verdict_correct",
        kind: "yesNoPartial",
        label: "A fost corect verdictul?",
        required: true,
      },
      {
        id: "issue",
        kind: "shortText",
        label: "Ce a fost greșit?",
        placeholder: "Spune-ne ce nu s-a potrivit cu așteptările tale",
        maxLength: 500,
        showWhen: { questionId: "verdict_correct", equals: "no" },
      },
    ],
  },
  rag_first_answer: {
    triggerEvent: "rag_first_answer",
    title: "Răspunsul AI a fost util?",
    questions: [
      {
        id: "useful",
        kind: "thumbs",
        label: "A fost util răspunsul?",
        required: true,
      },
      {
        id: "issue_reason",
        kind: "multiSelect",
        label: "Care a fost problema?",
        options: [
          { value: "no_info", label: "Nu a găsit informații" },
          { value: "incorrect", label: "Informație incorectă" },
          { value: "vague", label: "Prea vag" },
          { value: "other", label: "Altele" },
        ],
        showWhen: { questionId: "useful", equals: "down" },
      },
    ],
  },
  onboarding_7d: {
    triggerEvent: "onboarding_7d",
    title: "Cum a fost prima săptămână cu Granted?",
    subtitle: "Spune-ne ce ai folosit și ce îți lipsește",
    questions: [
      {
        id: "features_used",
        kind: "multiSelect",
        label: "Ce funcționalitate ai folosit cel mai mult?",
        required: true,
        options: [
          { value: "match", label: "Match Engine" },
          { value: "eligibility", label: "Verificare eligibilitate" },
          { value: "rag", label: "Chat AI" },
          { value: "workspace", label: "Workspace proiecte" },
          { value: "documents", label: "Gestionare documente" },
        ],
      },
      {
        id: "missing",
        kind: "shortText",
        label: "Ce îți lipsește cel mai mult? (opțional)",
        placeholder: "Funcționalități, integrări, fluxuri etc.",
        maxLength: 500,
      },
    ],
  },
};

// Capping rules
export const TRIGGER_COOLDOWN_DAYS = 7;
export const RESPONDED_COOLDOWN_DAYS = 90;
