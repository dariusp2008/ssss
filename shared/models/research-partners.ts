import { sql } from "drizzle-orm";
import {
  customType,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
});

export const researchEntities = pgTable(
  "research_entities",
  {
    id: varchar("id").primaryKey(),
    nameRo: text("name_ro").notNull(),
    nameEn: text("name_en"),
    nameNormalized: text("name_normalized").notNull(),
    entityType: varchar("entity_type", { length: 32 }).notNull(),
    cui: varchar("cui", { length: 32 }),
    city: varchar("city", { length: 128 }),
    judet: varchar("judet", { length: 64 }),
    website: varchar("website", { length: 512 }),
    researchDomains: text("research_domains").array(),
    employeeRange: varchar("employee_range", { length: 32 }),
    caenCodes: text("caen_codes").array(),
    contactEmail: varchar("contact_email", { length: 256 }),
    contactPhone: varchar("contact_phone", { length: 64 }),
    source: text("source"),
    profileText: text("profile_text"),
    profileEmbedding: vector1536("profile_embedding"),
    profileGeneratedAt: timestamp("profile_generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_research_entities_type").on(table.entityType),
    index("idx_research_entities_cui").on(table.cui),
    index("idx_research_entities_judet").on(table.judet),
  ],
);

export const researchProjects = pgTable(
  "research_projects",
  {
    id: varchar("id").primaryKey(),
    titleRo: text("title_ro"),
    titleEn: text("title_en"),
    fundingProgram: varchar("funding_program", { length: 64 }),
    callId: varchar("call_id", { length: 128 }),
    startYear: integer("start_year"),
    endYear: integer("end_year"),
    totalBudgetRon: doublePrecision("total_budget_ron"),
    totalBudgetEur: doublePrecision("total_budget_eur"),
    status: varchar("status", { length: 32 }),
    abstract: text("abstract"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_research_projects_program").on(table.fundingProgram),
    index("idx_research_projects_start_year").on(table.startYear),
  ],
);

export const researchProjectParticipants = pgTable(
  "research_project_participants",
  {
    id: serial("id").primaryKey(),
    projectId: varchar("project_id").notNull(),
    entityId: varchar("entity_id").notNull(),
    entityName: text("entity_name"),
    role: varchar("role", { length: 32 }),
    budgetShareRon: doublePrecision("budget_share_ron"),
    budgetShareEur: doublePrecision("budget_share_eur"),
    source: text("source"),
  },
  (table) => [
    uniqueIndex("uq_research_pp_proj_entity").on(table.projectId, table.entityId),
    index("idx_research_pp_entity").on(table.entityId),
    index("idx_research_pp_project").on(table.projectId),
  ],
);

export type ResearchEntity = typeof researchEntities.$inferSelect;
export type ResearchProject = typeof researchProjects.$inferSelect;
export type ResearchProjectParticipant = typeof researchProjectParticipants.$inferSelect;

export const insertResearchEntitySchema = createInsertSchema(researchEntities).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertResearchEntity = z.infer<typeof insertResearchEntitySchema>;
