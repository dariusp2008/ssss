import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role").default("user"),
  profileImage: varchar("profile_image"),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: varchar("verification_token"),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at"),
  resetPasswordToken: varchar("reset_password_token"),
  resetPasswordExpiresAt: timestamp("reset_password_expires_at"),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  consentAiProcessing: boolean("consent_ai_processing").default(false),
  consentEmailMarketing: boolean("consent_email_marketing").default(false),
  consentThirdPartySharing: boolean("consent_third_party_sharing").default(false),
  subscriptionPlanId: varchar("subscription_plan_id"),
  creditBalance: integer("credit_balance").default(0).notNull(),
  stripeCustomerId: varchar("stripe_customer_id"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
