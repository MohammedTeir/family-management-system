import { pgTable, text, serial, integer, boolean, timestamp, varchar, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("head"), // 'head', 'admin', 'root'
  phone: varchar("phone", { length: 20 }),
  isProtected: boolean("is_protected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockoutUntil: timestamp("lockout_until"),
  deletedAt: timestamp("deleted_at"), // <-- soft delete
}, (table) => ({
  usernameIdx: index("users_username_idx").on(table.username),
  roleIdx: index("users_role_idx").on(table.role),
  deletedAtIdx: index("users_deleted_at_idx").on(table.deletedAt),
}));

export const families = pgTable("families", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  husbandName: text("husband_name").notNull(),
  husbandID: varchar("husband_id", { length: 20 }).notNull().unique(),
  husbandBirthDate: varchar("husband_birth_date", { length: 10 }),
  husbandJob: text("husband_job"),
  primaryPhone: varchar("primary_phone", { length: 20 }),
  secondaryPhone: varchar("secondary_phone", { length: 20 }),
  originalResidence: text("original_residence"),
  currentHousing: text("current_housing"),
  isDisplaced: boolean("is_displaced").default(false),
  displacedLocation: text("displaced_location"),
  isAbroad: boolean("is_abroad").default(false),
  warDamage2024: boolean("war_damage_2024").default(false),
  warDamageDescription: text("war_damage_description"),
  branch: text("branch"),
  landmarkNear: text("landmark_near"),
  totalMembers: integer("total_members").notNull().default(0),
  numMales: integer("num_males").notNull().default(0),
  numFemales: integer("num_females").notNull().default(0),
  socialStatus: varchar("social_status", { length: 50 }),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Critical performance indexes
  userIdIdx: index("families_user_id_idx").on(table.userId),
  husbandIdIdx: index("families_husband_id_idx").on(table.husbandID),
  createdAtIdx: index("families_created_at_idx").on(table.createdAt),
}));

export const wives = pgTable("wives", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  wifeName: text("wife_name").notNull(),
  wifeID: varchar("wife_id", { length: 20 }),
  wifeBirthDate: varchar("wife_birth_date", { length: 10 }),
  wifeJob: text("wife_job"),
  wifePregnant: boolean("wife_pregnant").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  familyIdIdx: index("wives_family_id_idx").on(table.familyId),
}));

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  fullName: text("full_name").notNull(),
  memberID: varchar("member_id", { length: 20 }),
  birthDate: varchar("birth_date", { length: 10 }),
  gender: varchar("gender", { length: 10 }).notNull(),
  isDisabled: boolean("is_disabled").default(false),
  disabilityType: text("disability_type"),
  relationship: varchar("relationship", { length: 50 }).notNull(), // 'son', 'daughter', 'mother', 'other'
  isChild: boolean("is_child").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  familyIdIdx: index("members_family_id_idx").on(table.familyId),
  genderIdx: index("members_gender_idx").on(table.gender),
  relationshipIdx: index("members_relationship_idx").on(table.relationship),
}));

export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'financial', 'medical', 'damage'
  description: text("description").notNull(),
  attachments: text("attachments").array(),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'approved', 'rejected'
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  familyIdIdx: index("requests_family_id_idx").on(table.familyId),
  statusIdx: index("requests_status_idx").on(table.status),
  typeIdx: index("requests_type_idx").on(table.type),
  createdAtIdx: index("requests_created_at_idx").on(table.createdAt),
}));

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  target: varchar("target", { length: 20 }).default("all"), // 'all', 'head', 'specific'
  recipients: integer("recipients").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const sessions = pgTable("session", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: text("sess").notNull(), // JSON string
  expire: timestamp("expire", { mode: "date" }).notNull(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // e.g., 'admin', 'system', 'auth', etc.
  message: text("message").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportVouchers = pgTable("support_vouchers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  supportType: varchar("support_type", { length: 50 }).notNull(), // 'food_basket', 'cash_support', 'school_kit', 'medical', 'other'
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  location: text("location"),
  isActive: boolean("is_active").default(true),
});

export const voucherRecipients = pgTable("voucher_recipients", {
  id: serial("id").primaryKey(),
  voucherId: integer("voucher_id").references(() => supportVouchers.id).notNull(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'received', 'paid', 'not_attended'
  notified: boolean("notified").default(false),
  notifiedAt: timestamp("notified_at"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes"),
}, (table) => ({
  voucherIdIdx: index("voucher_recipients_voucher_id_idx").on(table.voucherId),
  familyIdIdx: index("voucher_recipients_family_id_idx").on(table.familyId),
  statusIdx: index("voucher_recipients_status_idx").on(table.status),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  family: one(families, {
    fields: [users.id],
    references: [families.userId],
  }),
  createdVouchers: many(supportVouchers, { relationName: "voucherCreator" }),
  updatedRecipients: many(voucherRecipients, { relationName: "recipientUpdater" }),
}));

export const familiesRelations = relations(families, ({ one, many }) => ({
  user: one(users, {
    fields: [families.userId],
    references: [users.id],
  }),
  wives: many(wives),
  members: many(members),
  requests: many(requests),
  documents: many(documents),
  voucherRecipients: many(voucherRecipients),
}));

export const membersRelations = relations(members, ({ one }) => ({
  family: one(families, {
    fields: [members.familyId],
    references: [families.id],
  }),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  family: one(families, {
    fields: [requests.familyId],
    references: [families.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  family: one(families, {
    fields: [documents.familyId],
    references: [families.id],
  }),
}));

export const supportVouchersRelations = relations(supportVouchers, ({ one, many }) => ({
  creator: one(users, {
    fields: [supportVouchers.createdBy],
    references: [users.id],
    relationName: "voucherCreator",
  }),
  recipients: many(voucherRecipients),
}));

export const wivesRelations = relations(wives, ({ one }) => ({
  family: one(families, {
    fields: [wives.familyId],
    references: [families.id],
  }),
}));

export const voucherRecipientsRelations = relations(voucherRecipients, ({ one }) => ({
  voucher: one(supportVouchers, {
    fields: [voucherRecipients.voucherId],
    references: [supportVouchers.id],
  }),
  family: one(families, {
    fields: [voucherRecipients.familyId],
    references: [families.id],
  }),
  updater: one(users, {
    fields: [voucherRecipients.updatedBy],
    references: [users.id],
    relationName: "recipientUpdater",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertFamilySchema = createInsertSchema(families).omit({
  id: true,
  createdAt: true,
});

export const insertWifeSchema = createInsertSchema(wives).omit({
  id: true,
  createdAt: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
});

export const insertRequestSchema = createInsertSchema(requests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertSupportVoucherSchema = createInsertSchema(supportVouchers).omit({
  id: true,
  createdAt: true,
});

export const insertVoucherRecipientSchema = createInsertSchema(voucherRecipients).omit({
  id: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Family = typeof families.$inferSelect;
export type InsertWife = z.infer<typeof insertWifeSchema>;
export type Wife = typeof wives.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requests.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSupportVoucher = z.infer<typeof insertSupportVoucherSchema>;
export type SupportVoucher = typeof supportVouchers.$inferSelect;
export type InsertVoucherRecipient = z.infer<typeof insertVoucherRecipientSchema>;
export type VoucherRecipient = typeof voucherRecipients.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

