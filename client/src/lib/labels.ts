const FEATURE_LABELS: Record<string, string> = {
  catalog_apeluri: "Catalog apeluri",
  match_engine_basic: "Motor de potrivire",
  match_engine: "Motor de potrivire",
  match_engine_advanced: "Motor de potrivire avansat",
  eligibility_check: "Verificare eligibilitate",
  rag_chat: "Asistent AI (chat)",
  conformity_check: "Analiză conformitate",
  ai_profile: "Profil AI companie",
  generate_icp: "Prospectare ICP",
  project_workspace: "Spațiu de lucru proiecte",
  notifications_email: "Notificări email",
  add_company: "Adăugare companie",
  termene_lookup: "Verificare companie",
  ai_analysis: "Analiză AI",
  document_analysis: "Analiză documente",
  consortium_management: "Management consorțiu",
  advanced_reports: "Rapoarte avansate",
  priority_support: "Suport prioritar",
  login: "Autentificare",
  register: "Înregistrare",
  logout: "Deconectare",
  create_company: "Creare companie",
  update_company: "Actualizare companie",
  delete_company: "Ștergere companie",
  create_project: "Creare proiect",
  update_project: "Actualizare proiect",
  delete_project: "Ștergere proiect",
  upload_document: "Încărcare document",
  download_document: "Descărcare document",
  delete_document: "Ștergere document",
  refresh_profile: "Reîmprospătare profil",
  auto_ingest: "Indexare automată",
  regenerate_summary: "Regenerare rezumat",
  rag_index: "Indexare AI",
  rag_reindex: "Re-indexare AI",
  regenerate_ai: "Regenerare AI",
  revalidate_data: "Revalidare date",
  classify_all_documents: "Clasificare masiva documente",
  revalidate_all_data: "Revalidare masiva date",
  currency_inference: "Deducere valuta AI",
  index: "Indexare",
  first_company_added: "Prima companie adăugată",
  first_match_run: "Prima potrivire rulată",
  first_eligibility_check: "Prima verificare eligibilitate",
  first_project_created: "Primul proiect creat",
  first_rag_chat: "Primul chat AI",
  termene_api: "API Termene.ro",
  contact_plan: "Cerere plan",
  gdpr_export: "Export GDPR",
  consent_update: "Actualizare consimțământ",
  update_consents: "Actualizare consimțământ",
  verify_email: "Verificare email",
  forgot_password: "Recuperare parolă",
  reset_password: "Resetare parolă",
  change_password: "Schimbare parolă",
  accept_privacy: "Acceptare confidențialitate",
  document_download: "Descărcare document",
  upload_attachment: "Încărcare atașament",
  delete_attachment: "Ștergere atașament",
  reindex_all_embeddings: "Re-indexare embeddings",
  create_funding_call_manual: "Creare apel manual",
  update_funding_call: "Actualizare apel",
  delete_funding_call: "Ștergere apel",
  n8n_import: "Import n8n",
  update_user: "Actualizare utilizator",
  delete_user: "Ștergere utilizator",
  send_notification: "Trimitere notificare",
  update_settings: "Actualizare setări",
  create_consortium: "Creare consorțiu",
  update_consortium: "Actualizare consorțiu",
  delete_consortium: "Ștergere consorțiu",
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  usage: "Utilizare",
  admin_adjustment: "Ajustare admin",
  monthly_grant: "Credite lunare",
  subscription_grant: "Credite abonament",
  purchase: "Achiziție",
  refund: "Rambursare",
  bonus: "Bonus",
  credit: "Credit",
  debit: "Debit",
  grant: "Alocare",
  system: "Sistem",
};

export function getFeatureLabel(slug: string): string {
  if (FEATURE_LABELS[slug]) return FEATURE_LABELS[slug];
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getTransactionTypeLabel(type: string): string {
  if (TRANSACTION_TYPE_LABELS[type]) return TRANSACTION_TYPE_LABELS[type];
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatTransactionDescription(description: string | null | undefined): string {
  if (!description) return "—";

  const utilizareMatch = description.match(/^Utilizare:\s*(.+)$/);
  if (utilizareMatch) {
    return `Utilizare: ${getFeatureLabel(utilizareMatch[1].trim())}`;
  }

  const sorted = Object.entries(FEATURE_LABELS).sort(([a], [b]) => b.length - a.length);
  for (const [slug, label] of sorted) {
    const regex = new RegExp(`\\b${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    description = description.replace(regex, label);
  }

  return description;
}
