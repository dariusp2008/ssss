export * from "./models/auth";

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, real, doublePrecision, uuid, bigint, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  cui: varchar("cui").notNull(),
  name: varchar("name").notNull(),
  nrRegCom: varchar("nr_reg_com"),
  dataInfiintare: varchar("data_infiintare"),
  stareFirma: varchar("stare_firma"),
  formaOrganizare: varchar("forma_organizare"),
  entityType: varchar("entity_type"),
  address: text("address"),
  judet: varchar("judet"),
  localitate: varchar("localitate"),
  caen: varchar("caen"),
  caenDescription: text("caen_description"),
  caenSecundare: text("caen_secundare").array(),
  employees: integer("employees"),
  revenue: doublePrecision("revenue"),
  profit: doublePrecision("profit"),
  founded: varchar("founded"),
  status: varchar("status").default("active"),
  financiare: jsonb("financiare"),
  actionariat: jsonb("actionariat"),
  evenimente: jsonb("evenimente"),
  apiData: jsonb("api_data"),
  profileText: text("profile_text"),
  profileEmbedding: text("profile_embedding"),
  profileGeneratedAt: timestamp("profile_generated_at"),
  profileDataHash: varchar("profile_data_hash"),
  trl: integer("trl"),                                              // TRL tipic al firmei (nivel maturitate tehnologică 1-9); null = nespecificat
  typicalProjectBudget: doublePrecision("typical_project_budget"), // Buget tipic per proiect; null = nespecificat
  typicalProjectBudgetCurrency: varchar("typical_project_budget_currency"), // Moneda bugetului (EUR / RON); null când bugetul lipsește
  createdAt: timestamp("created_at").defaultNow(),
});

export const fundingCalls = pgTable("funding_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar("external_id").unique(),
  name: varchar("name").notNull(),
  description: text("description"),
  deadline: timestamp("deadline"),
  maxFunding: doublePrecision("max_funding"),
  minEmployees: integer("min_employees"),
  eligibleCaen: text("eligible_caen").array(),
  category: varchar("category"),
  minRevenue: doublePrecision("min_revenue"),
  status: varchar("status").default("active"),
  source: varchar("source"),
  sourceUrl: text("source_url"),
  program: varchar("program"),
  bugetUe: text("buget_ue"),
  bugetNational: text("buget_national"),
  moneda: text("moneda"),
  monedaUe: text("moneda_ue"),
  monedaNational: text("moneda_national"),
  monedaMaxFunding: text("moneda_max_funding"),
  dataLimita: text("data_limita"),
  detailsSections: jsonb("details_sections"),
  // DEPRECATED for reads: kept populated by imports as an audit/raw archive
  // of the n8n payload. The relational `call_source_documents` table is the
  // single source of truth for what the UI displays. Do NOT add new read
  // paths against this column.
  sourceDocuments: jsonb("source_documents"),
  isActiveOnSite: boolean("is_active_on_site").default(true),
  lastUpdated: timestamp("last_updated"),
  eligibleRegions: text("eligible_regions").array(),
  beneficiaryTypes: text("beneficiary_types").array(),
  summary: text("summary"),
  summaryEmbedding: text("summary_embedding"),
  minCompanyAge: integer("min_company_age"),
  requiresProfit: boolean("requires_profit").default(false),
  eligibleSizeCategories: text("eligible_size_categories").array(),
  currentVersion: integer("current_version").default(1),
  icpData: jsonb("icp_data"),
  importSource: varchar("import_source"),
  contentHash: varchar("content_hash"),
  n8nCombinedHash: varchar("n8n_combined_hash"),
  payloadVersion: varchar("payload_version"),
  sourcePageUrl: text("source_page_url"),
  lastSeenAt: timestamp("last_seen_at"),
  rawImportMetadata: jsonb("raw_import_metadata"),
  manualDiscoveryStatus: varchar("manual_discovery_status").default("unknown"),
  manualSourceType: varchar("manual_source_type").default("none"),
  manualSourceUrl: text("manual_source_url"),
  manualSourceUrls: jsonb("manual_source_urls"),
  manualSourceNotes: text("manual_source_notes"),
  manualCheckedAt: timestamp("manual_checked_at"),
  manualCheckedBy: varchar("manual_checked_by"),
  manualMonitoringEnabled: boolean("manual_monitoring_enabled").default(true),
  manualLastN8nSyncAt: timestamp("manual_last_n8n_sync_at"),
  manualLastN8nStatus: varchar("manual_last_n8n_status"),
  manualLastN8nMessage: text("manual_last_n8n_message"),
  manualLastN8nDocumentsFound: integer("manual_last_n8n_documents_found").default(0),
  manualLastN8nPageHash: varchar("manual_last_n8n_page_hash"),
  manualLastN8nPageCheckedAt: timestamp("manual_last_n8n_page_checked_at"),
  documentSourceMethod: varchar("document_source_method"),
  documentSourceUrl: text("document_source_url"),
  candidateManualSourceUrl: text("candidate_manual_source_url"),
  candidateSourceOrigin: varchar("candidate_source_origin"),
  candidateSourceConfidence: doublePrecision("candidate_source_confidence"),
  payloadHash: varchar("payload_hash"),
  docsHash: varchar("docs_hash"),
  detailsHash: varchar("details_hash"),
  documentSetHash: varchar("document_set_hash"),
  dataQualityIssues: jsonb("data_quality_issues"),
  importCompareStatus: varchar("import_compare_status").default("new"),
  lastImportedAt: timestamp("last_imported_at"),
  // Critical Fields Pipeline (T005, mai 2026): backup pre-normalizare + audit.
  beneficiaryTypesPreNormalization: text("beneficiary_types_pre_normalization").array(),
  eligibleRegionsPreNormalization: text("eligible_regions_pre_normalization").array(),
  eligibleSizeCategoriesPreNormalization: text("eligible_size_categories_pre_normalization").array(),
  eligibleCaenPreNormalization: text("eligible_caen_pre_normalization").array(),
  criticalFieldsNormalizedAt: timestamp("critical_fields_normalized_at", { withTimezone: true }),
  criticalFieldsNormalizationChanges: jsonb("critical_fields_normalization_changes"),
  // Lifecycle (Task #66): single source of truth pentru semantica „pot aplica acum".
  // Stadii valide: `urmeaza` | `depunere_activa` | `expirat`. NULL = neclasificat
  // (rămân până la task-ul următor care migrează importul). Coloana `status` rămâne
  // populată în paralel ca shim până la migrarea completă a filtrelor (task #3).
  lifecycleStage: varchar("lifecycle_stage"),
  openDate: timestamp("open_date", { withTimezone: true }),
  // call_type: taxonomie liberă, NULL = neclasificat (no DEFAULT, conform spec).
  callType: varchar("call_type"),
  // Structural Phase v2 (NEW-E.1, mai 2026): semnale extrase din ghiduri PDF.
  // Toate nullable, fără default — absența datelor nu se maschează ca zero.
  // Folosite de NEW-E.4 (Match Engine integration) cu tratament "necunoscut" → warning.
  minTrl: integer("min_trl"),                              // Technology Readiness Level minim cerut (1-9)
  maxTrl: integer("max_trl"),                              // TRL maxim acceptat (1-9)
  projectMinValue: doublePrecision("project_min_value"),   // Buget minim per proiect (EUR sau RON, vezi projectValueCurrency)
  projectMaxValue: doublePrecision("project_max_value"),   // Buget maxim per proiect
  projectValueCurrency: text("project_value_currency"),    // "EUR" sau "RON"
  cofinancingRate: doublePrecision("cofinancing_rate"),    // Rata maximă intensitate ajutor (procent 0-100)
  projectDurationMonths: integer("project_duration_months"), // Durată maximă implementare proiect (luni)
  createdAt: timestamp("created_at").defaultNow(),
});

// Lifecycle transitions audit (Task #66). Sursele care pot scrie aici:
//   - `n8n_import`       — payload n8n declanșează tranziție
//   - `operator_manual`  — admin edit
//   - `scheduled_job`    — cron / backfill / scheduler
export const lifecycleTransitions = pgTable("lifecycle_transitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => fundingCalls.id, { onDelete: "cascade" }),
  fromStage: varchar("from_stage"),
  toStage: varchar("to_stage").notNull(),
  source: varchar("source").notNull(),
  triggeredBy: varchar("triggered_by"),
  transitionedAt: timestamp("transitioned_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
}, (t) => ({
  callIdTransitionedAtIdx: index("idx_lifecycle_transitions_call_id_ts").on(t.callId, t.transitionedAt),
}));

export type LifecycleTransition = typeof lifecycleTransitions.$inferSelect;
export const insertLifecycleTransitionSchema = createInsertSchema(lifecycleTransitions).omit({ id: true, transitionedAt: true });
export type InsertLifecycleTransition = z.infer<typeof insertLifecycleTransitionSchema>;

export const callSourceDocuments = pgTable("call_source_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => fundingCalls.id, { onDelete: "cascade" }),
  fileName: varchar("file_name").notNull(),
  normalizedFileName: varchar("normalized_file_name"),
  displayName: varchar("display_name"),
  sourceUrl: text("source_url"),
  sha256: varchar("sha256"),
  contentHash: varchar("content_hash"),
  mimeType: varchar("mime_type"),
  fileSize: bigint("file_size", { mode: "number" }),
  docGroup: varchar("doc_group"),
  origin: varchar("origin"),
  relativePath: text("relative_path"),
  archiveContainerName: varchar("archive_container_name"),
  isCurrent: boolean("is_current").notNull().default(true),
  hasText: boolean("has_text").notNull().default(false),
  content: text("content"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  supersededById: uuid("superseded_by_id"),
  storagePath: varchar("storage_path"),
  localFileAvailable: boolean("local_file_available").notNull().default(false),
});

export const importReconciliationLogs = pgTable("import_reconciliation_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => fundingCalls.id, { onDelete: "cascade" }),
  importRunId: varchar("import_run_id"),
  action: varchar("action").notNull(),
  detailsHashChanged: boolean("details_hash_changed").default(false),
  documentSetHashChanged: boolean("document_set_hash_changed").default(false),
  documentsAdded: integer("documents_added").default(0),
  documentsRemoved: integer("documents_removed").default(0),
  documentsUpdated: integer("documents_updated").default(0),
  documentsUnchanged: integer("documents_unchanged").default(0),
  ragReindexTriggered: boolean("rag_reindex_triggered").default(false),
  ragDocumentsReindexed: integer("rag_documents_reindexed").default(0),
  reconciliationDetails: jsonb("reconciliation_details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type CallSourceDocument = typeof callSourceDocuments.$inferSelect;
export type InsertCallSourceDocument = typeof callSourceDocuments.$inferInsert;
export type ImportReconciliationLog = typeof importReconciliationLogs.$inferSelect;

export const manualDiscoveryEvents = pgTable("funding_call_manual_discovery_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fundingCallId: varchar("funding_call_id").notNull().references(() => fundingCalls.id, { onDelete: "cascade" }),
  eventType: varchar("event_type").notNull(),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
});

export const fundingCallDocuments = pgTable("funding_call_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fundingCallId: varchar("funding_call_id").notNull().references(() => fundingCalls.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  required: boolean("required").default(true),
  sortOrder: integer("sort_order").default(0),
});

// Idei de proiect descrise în limbaj natural de utilizator, salvate pentru a fi
// refolosite la căutarea de apeluri și mai târziu la inițierea unui proiect.
// companyId e opțional (căutare hibridă: cu firmă filtrăm eligibilitatea,
// fără firmă doar relevanța tematică).
export const projectIdeas = pgTable("project_ideas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").references(() => companies.id),
  ideaText: text("idea_text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ProjectIdea = typeof projectIdeas.$inferSelect;
export const insertProjectIdeaSchema = createInsertSchema(projectIdeas).omit({ id: true, createdAt: true });
export type InsertProjectIdea = z.infer<typeof insertProjectIdeaSchema>;

export const activeProjects = pgTable("active_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  fundingCallId: varchar("funding_call_id").notNull().references(() => fundingCalls.id),
  status: varchar("status").default("initiated"),
  progress: real("progress").default(0),
  notes: text("notes"),
  guideVersionAtInit: integer("guide_version_at_init"),
  // Legătură opțională către ideea sursă (când proiectul e creat dintr-un
  // rezultat de căutare după idee) — păstrează textul ideii pentru reutilizare.
  projectIdeaId: varchar("project_idea_id").references(() => projectIdeas.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectStatusHistory = pgTable("project_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => activeProjects.id),
  status: varchar("status").notNull(),
  note: text("note"),
  changedBy: varchar("changed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectCollaborators = pgTable("project_collaborators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => activeProjects.id),
  email: varchar("email").notNull(),
  role: varchar("role").default("viewer"),
  invitedBy: varchar("invited_by").references(() => users.id),
  status: varchar("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => activeProjects.id),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  status: varchar("status").default("pending"),
  filePath: text("file_path"),
  expiresAt: timestamp("expires_at"),
  uploadedAt: timestamp("uploaded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentComments = pgTable("document_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentVersions = pgTable("document_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  filePath: text("file_path").notNull(),
  versionNumber: integer("version_number").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Drafturi de documente narative generate cu AI (ex: plan de afaceri).
// Conținutul editabil trăiește aici (tabela `documents` are doar `file_path`).
// `sections` = array ordonat de { key, title, order, content }.
// `inputs` = răspunsurile din wizardul minimal { projectIdea, budget, currency, durationMonths }.
export const documentDrafts = pgTable("document_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => activeProjects.id),
  documentId: varchar("document_id").references(() => documents.id),
  fundingCallId: varchar("funding_call_id").notNull(),
  companyId: varchar("company_id").notNull(),
  type: varchar("type").notNull().default("plan_afaceri"),
  title: varchar("title").notNull(),
  sections: jsonb("sections").notNull(),
  inputs: jsonb("inputs"),
  status: varchar("status").default("draft"),
  version: integer("version").default(1),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Snapshot de versiuni pentru drafturi (la fiecare generare/regenerare/salvare majoră).
export const documentDraftVersions = pgTable("document_draft_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  draftId: varchar("draft_id").notNull().references(() => documentDrafts.id),
  versionNumber: integer("version_number").notNull(),
  sections: jsonb("sections").notNull(),
  inputs: jsonb("inputs"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").default("info"),
  read: boolean("read").default(false),
  projectId: varchar("project_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const termeneCache = pgTable("termene_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cui: varchar("cui").notNull().unique(),
  apiData: jsonb("api_data").notNull(),
  companyName: varchar("company_name"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(),
  message: text("message").notNull(),
  category: varchar("category"),
  rating: integer("rating"),
  sessionCount: integer("session_count"),
  appVersion: varchar("app_version"),
  triggerEvent: varchar("trigger_event"),
  responseData: jsonb("response_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedbackTriggerLog = pgTable("feedback_trigger_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  triggerEvent: varchar("trigger_event").notNull(),
  lastShownAt: timestamp("last_shown_at"),
  lastRespondedAt: timestamp("last_responded_at"),
  shownCount: integer("shown_count").default(0).notNull(),
  dismissCount: integer("dismiss_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniqUserTrigger: unique("feedback_trigger_log_user_trigger_unique").on(t.userId, t.triggerEvent),
}));

export const insertFeedbackTriggerLogSchema = createInsertSchema(feedbackTriggerLog).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeedbackTriggerLog = z.infer<typeof insertFeedbackTriggerLogSchema>;
export type FeedbackTriggerLog = typeof feedbackTriggerLog.$inferSelect;

export const feedbackTriggerEvent = pgTable("feedback_trigger_event", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  triggerEvent: varchar("trigger_event").notNull(),
  eventType: varchar("event_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  idxTriggerEvent: index("feedback_trigger_event_trigger_idx").on(t.triggerEvent, t.createdAt),
}));

export type FeedbackTriggerEvent = typeof feedbackTriggerEvent.$inferSelect;

export const tokenUsage = pgTable("token_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  model: varchar("model"),
  costType: varchar("cost_type").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const importLogs = pgTable("import_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: varchar("source").default("n8n"),
  itemsReceived: integer("items_received").default(0),
  itemsCreated: integer("items_created").default(0),
  itemsUpdated: integer("items_updated").default(0),
  itemsSkipped: integer("items_skipped").default(0),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const consortia = pgTable("consortia", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => activeProjects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const consortiumMembers = pgTable("consortium_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consortiumId: varchar("consortium_id").notNull().references(() => consortia.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  role: varchar("role").default("partener"),
  budgetShare: doublePrecision("budget_share"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true, apiData: true });
// Critical Fields Pipeline (T008) — Drizzle Zod firewall: orice câmp critic
// trecut prin schema.parse() e validat la nivel de vocabular. Importurile n8n
// nu folosesc parse() (write direct prin SQL), așa că acest firewall protejează
// căile API admin (manual create/update) de regresii ale vocabularului canonic.
const BENEFICIARY_TYPE_ENUM = z.enum([
  "imm", "companii-private", "startup", "ong", "autoritati-publice",
  "institutii-invatamant", "institutii-cercetare", "spitale", "pfa-ii",
  "cooperative", "gal",
] as const);
const ELIGIBLE_REGION_ENUM = z.enum([
  "Nord-Est", "Sud-Est", "Sud-Muntenia", "Sud-Vest Oltenia",
  "Vest", "Nord-Vest", "Centru", "București-Ilfov",
] as const);
const SIZE_CATEGORY_ENUM = z.enum(["micro", "mica", "mijlocie", "mare"] as const);
const CAEN_CODE_RE = /^\d{2}(\d{2})?$/;

export const insertFundingCallSchema = createInsertSchema(fundingCalls).omit({ id: true, createdAt: true }).extend({
  beneficiaryTypes: BENEFICIARY_TYPE_ENUM.array().nullish(),
  eligibleRegions: ELIGIBLE_REGION_ENUM.array().nullish(),
  eligibleSizeCategories: SIZE_CATEGORY_ENUM.array().nullish(),
  eligibleCaen: z.array(z.string().regex(CAEN_CODE_RE, "CAEN trebuie să fie 2 sau 4 cifre")).nullish(),
});
export const insertFundingCallDocSchema = createInsertSchema(fundingCallDocuments).omit({ id: true });
export const insertActiveProjectSchema = createInsertSchema(activeProjects).omit({ id: true, createdAt: true, updatedAt: true, progress: true });
export const insertStatusHistorySchema = createInsertSchema(projectStatusHistory).omit({ id: true, createdAt: true });
export const insertCollaboratorSchema = createInsertSchema(projectCollaborators).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, uploadedAt: true });
export const insertDocumentCommentSchema = createInsertSchema(documentComments).omit({ id: true, createdAt: true });
export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({ id: true, createdAt: true });
export const insertDocumentDraftSchema = createInsertSchema(documentDrafts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentDraftVersionSchema = createInsertSchema(documentDraftVersions).omit({ id: true, createdAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, read: true });

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertFundingCall = z.infer<typeof insertFundingCallSchema>;
export type FundingCall = typeof fundingCalls.$inferSelect;
export type InsertFundingCallDoc = z.infer<typeof insertFundingCallDocSchema>;
export type FundingCallDoc = typeof fundingCallDocuments.$inferSelect;
export type InsertActiveProject = z.infer<typeof insertActiveProjectSchema>;
export type ActiveProject = typeof activeProjects.$inferSelect;
export type InsertStatusHistory = z.infer<typeof insertStatusHistorySchema>;
export type StatusHistory = typeof projectStatusHistory.$inferSelect;
export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
export type Collaborator = typeof projectCollaborators.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocumentComment = z.infer<typeof insertDocumentCommentSchema>;
export type DocumentComment = typeof documentComments.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentDraft = z.infer<typeof insertDocumentDraftSchema>;
export type DocumentDraft = typeof documentDrafts.$inferSelect;
export type InsertDocumentDraftVersion = z.infer<typeof insertDocumentDraftVersionSchema>;
export type DocumentDraftVersion = typeof documentDraftVersions.$inferSelect;

export interface DocumentDraftSection {
  key: string;
  title: string;
  order: number;
  content: string;
}

export interface DocumentDraftInputs {
  projectIdea: string;
  budget?: number | null;
  currency?: string | null;
  durationMonths?: number | null;
}
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const eligibilityReports = pgTable("eligibility_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  fundingCallId: varchar("funding_call_id"),
  projectId: varchar("project_id").references(() => activeProjects.id),
  verdict: varchar("verdict").notNull(),
  verdictScore: integer("verdict_score").default(0),
  verdictSummary: text("verdict_summary"),
  optimistAnalysis: jsonb("optimist_analysis"),
  skepticAnalysis: jsonb("skeptic_analysis"),
  hasDualAnalysis: boolean("has_dual_analysis").default(false),
  ragSectionsUsed: integer("rag_sections_used").default(0),
  criteria: jsonb("criteria"),
  recommendations: jsonb("recommendations"),
  notes: text("notes"),
  inputHash: varchar("input_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEligibilityReportSchema = createInsertSchema(eligibilityReports).omit({ id: true, createdAt: true });
export type InsertEligibilityReport = z.infer<typeof insertEligibilityReportSchema>;
export type EligibilityReport = typeof eligibilityReports.$inferSelect;

export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  newCallEmail: boolean("new_call_email").default(true),
  newCallInapp: boolean("new_call_inapp").default(true),
  deadlineEmail: boolean("deadline_email").default(true),
  deadlineInapp: boolean("deadline_inapp").default(true),
  errataEmail: boolean("errata_email").default(true),
  errataInapp: boolean("errata_inapp").default(true),
  newCompanyEmail: boolean("new_company_email").default(false),
  newCompanyInapp: boolean("new_company_inapp").default(true),
  eligibilityCheckEmail: boolean("eligibility_check_email").default(true),
  eligibilityCheckInapp: boolean("eligibility_check_inapp").default(true),
  projectStatusEmail: boolean("project_status_email").default(true),
  projectStatusInapp: boolean("project_status_inapp").default(true),
  documentExpiryEmail: boolean("document_expiry_email").default(true),
  documentExpiryInapp: boolean("document_expiry_inapp").default(true),
  aiScoreEmail: boolean("ai_score_email").default(false),
  aiScoreInapp: boolean("ai_score_inapp").default(true),
  inAppSurveys: boolean("in_app_surveys").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  userEmail: varchar("user_email"),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type"),
  entityId: varchar("entity_id"),
  entityName: varchar("entity_name"),
  method: varchar("method"),
  path: varchar("path"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuditLog = typeof auditLog.$inferSelect;

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  name: varchar("name").notNull(),
  description: text("description"),
  subject: varchar("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  defaultSubject: varchar("default_subject").notNull(),
  defaultHtmlBody: text("default_html_body").notNull(),
  availableVariables: jsonb("available_variables"),
  isCustomized: boolean("is_customized").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true });
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

export const fundingCallGuides = pgTable("funding_call_guides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fundingCallId: varchar("funding_call_id").notNull().references(() => fundingCalls.id, { onDelete: "cascade" }),
  originalName: varchar("original_name").notNull(),
  storagePath: varchar("storage_path").notNull(),
  fileSize: integer("file_size"),
  fileType: varchar("file_type"),
  sectionsCreated: integer("sections_created").default(0),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  docType: varchar("doc_type").default("guide"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type FundingCallGuide = typeof fundingCallGuides.$inferSelect;

export const usageQuotas = pgTable("usage_quotas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(),
  used: integer("used").default(0).notNull(),
  maxAllowed: integer("max_allowed").notNull(),
  period: varchar("period").notNull(),
  resetAt: timestamp("reset_at").notNull(),
});

export type UsageQuota = typeof usageQuotas.$inferSelect;

export const conformityReports = pgTable("conformity_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => activeProjects.id, { onDelete: "cascade" }),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  fundingCallId: varchar("funding_call_id").notNull(),
  verdict: varchar("verdict").notNull(),
  score: integer("score"),
  summary: text("summary"),
  criteria: text("criteria"),
  missingElements: text("missing_elements"),
  recommendations: text("recommendations"),
  ragSectionsUsed: integer("rag_sections_used").default(0),
  model: varchar("model"),
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  inputHash: varchar("input_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ConformityReport = typeof conformityReports.$inferSelect;
export const insertConformityReportSchema = createInsertSchema(conformityReports).omit({ id: true, createdAt: true });
export type InsertConformityReport = z.infer<typeof insertConformityReportSchema>;

export const insertConsortiumSchema = createInsertSchema(consortia).omit({ id: true, createdAt: true });
export const insertConsortiumMemberSchema = createInsertSchema(consortiumMembers).omit({ id: true, createdAt: true });
export type InsertConsortium = z.infer<typeof insertConsortiumSchema>;
export type Consortium = typeof consortia.$inferSelect;
export type InsertConsortiumMember = z.infer<typeof insertConsortiumMemberSchema>;
export type ConsortiumMember = typeof consortiumMembers.$inferSelect;

export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  description: text("description"),
  monthlyCredits: integer("monthly_credits").default(0).notNull(),
  maxCompanies: integer("max_companies").default(1).notNull(),
  maxProjects: integer("max_projects").default(1).notNull(),
  features: jsonb("features").default(sql`'[]'::jsonb`),
  isPublic: boolean("is_public").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  priceMonthly: doublePrecision("price_monthly"),
  priceYearly: doublePrecision("price_yearly"),
  currency: varchar("currency").default("RON"),
  includedCuiPerMonth: integer("included_cui_per_month").default(0).notNull(),
  seats: integer("seats").default(1).notNull(),
  billingInterval: varchar("billing_interval"),
  stripeProductId: varchar("stripe_product_id"),
  stripePriceId: varchar("stripe_price_id"),
  stripePriceIdYearly: varchar("stripe_price_id_yearly"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export const creditCosts = pgTable("credit_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: varchar("action").unique().notNull(),
  creditCost: integer("credit_cost").default(1).notNull(),
  label: varchar("label").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CreditCost = typeof creditCosts.$inferSelect;
export const insertCreditCostSchema = createInsertSchema(creditCosts).omit({ id: true, createdAt: true });
export type InsertCreditCost = z.infer<typeof insertCreditCostSchema>;

export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  status: varchar("status").default("active").notNull(),
  currentPeriodStart: timestamp("current_period_start").defaultNow(),
  currentPeriodEnd: timestamp("current_period_end"),
  nextCreditResetAt: timestamp("next_credit_reset_at"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripeStatus: varchar("stripe_status"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  billingInterval: varchar("billing_interval"),
  seats: integer("seats").default(1).notNull(),
  // Multi-processor billing (Task #191). `payment_provider` records which
  // processor owns this subscription ('stripe' default | 'netopia').
  // `provider_subscription_id` is the generic processor-side subscription key
  // (for Stripe it mirrors `stripe_subscription_id`; for Netopia it is the
  // recurring order reference). `provider_token` stores the Netopia recurring
  // binding token used to charge subsequent periods (Stripe self-manages, so it
  // stays null there).
  paymentProvider: varchar("payment_provider").default("stripe").notNull(),
  providerSubscriptionId: varchar("provider_subscription_id"),
  providerToken: varchar("provider_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

/**
 * Pending-payment mapping (Task #191). Processors that don't carry our metadata
 * through the whole flow (Netopia identifies a payment only by its `orderID`)
 * need a server-side lookup from orderID → {user, plan/package, kind} so the IPN
 * handler can resolve who to credit without encoding PII in the orderID. Backend
 * only (RLS-locked). Stripe doesn't use this table (it round-trips metadata).
 */
export const paymentOrders = pgTable("payment_orders", {
  orderId: varchar("order_id").primaryKey(),
  provider: varchar("provider").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind").notNull(), // 'subscription' | 'credit_package'
  planId: varchar("plan_id"),
  packageId: varchar("package_id"),
  billingInterval: varchar("billing_interval"),
  amount: doublePrecision("amount"),
  currency: varchar("currency").default("RON"),
  status: varchar("status").default("pending").notNull(), // pending | paid | failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PaymentOrder = typeof paymentOrders.$inferSelect;
export const insertPaymentOrderSchema = createInsertSchema(paymentOrders).omit({ createdAt: true, updatedAt: true });
export type InsertPaymentOrder = z.infer<typeof insertPaymentOrderSchema>;

export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  type: varchar("type").notNull(),
  action: varchar("action"),
  referenceId: varchar("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({ id: true, createdAt: true });
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;

export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  credits: integer("credits").notNull(),
  price: doublePrecision("price"),
  currency: varchar("currency").default("RON"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  stripeProductId: varchar("stripe_product_id"),
  stripePriceId: varchar("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CreditPackage = typeof creditPackages.$inferSelect;
export const insertCreditPackageSchema = createInsertSchema(creditPackages).omit({ id: true, createdAt: true });
export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;

// Idempotency ledger for Stripe webhooks. `id` = Stripe event.id (dedup key).
export const processedWebhookEvents = pgTable("processed_webhook_events", {
  id: varchar("id").primaryKey(),
  type: varchar("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProcessedWebhookEvent = typeof processedWebhookEvents.$inferSelect;

// ── Billing: fiscal profile captured at checkout (RO e-Factura / Oblio) ──
// One row per user (UNIQUE user_id). `entity_type` distinguishes B2B (companii,
// needs CUI/reg_com) from B2C (persoane fizice). Backend-only, RLS-locked.
export const billingProfiles = pgTable("billing_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type").default("b2b").notNull(), // 'b2b' | 'b2c'
  companyName: varchar("company_name"),
  cui: varchar("cui"),
  regCom: varchar("reg_com"),
  address: text("address"),
  county: varchar("county"),
  country: varchar("country").default("RO").notNull(),
  email: varchar("email"),
  isVatPayer: boolean("is_vat_payer").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BillingProfile = typeof billingProfiles.$inferSelect;
export const insertBillingProfileSchema = createInsertSchema(billingProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBillingProfile = z.infer<typeof insertBillingProfileSchema>;

// ── Billing: issued invoices (Stripe/Netopia → Oblio → RO e-Factura) ──
// `stripe_invoice_id` is the idempotency key for invoice issuance (the processor
// payment/invoice reference). `efactura_status` defaults to 'not_sent' until the
// Oblio issuance worker submits it to ANAF SPV.
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  type: varchar("type").default("invoice").notNull(), // 'invoice' | 'proforma'
  stripeInvoiceId: varchar("stripe_invoice_id").unique(),
  oblioSeries: varchar("oblio_series"),
  oblioNumber: varchar("oblio_number"),
  oblioEinvoiceId: varchar("oblio_einvoice_id"),
  amount: doublePrecision("amount"),
  currency: varchar("currency").default("RON"),
  vatRate: doublePrecision("vat_rate").default(21),
  status: varchar("status").default("pending").notNull(),
  // Timestamp of the last `status` transition — the "issuing since" clock used by
  // the single-writer claim to detect genuinely stranded 'issuing' rows without
  // mistaking merely-old rows for stale ones (see server/payments/handlers.ts).
  statusUpdatedAt: timestamp("status_updated_at").defaultNow(),
  efacturaStatus: varchar("efactura_status").default("not_sent").notNull(),
  efacturaMessage: text("efactura_message"),
  pdfUrl: varchar("pdf_url"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Invoice = typeof invoices.$inferSelect;
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export * from "./models/research-partners";
