var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// package.json
var require_package = __commonJS({
  "package.json"(exports, module) {
    module.exports = {
      name: "family-management-backend",
      version: "1.0.0",
      type: "module",
      license: "MIT",
      scripts: {
        dev: "NODE_ENV=development tsx src/index.ts",
        build: "esbuild netlify/functions/api.ts --platform=node --packages=external --bundle --format=esm --outdir=netlify/functions && esbuild src/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
        start: "NODE_ENV=production node dist/index.js",
        check: "tsc",
        "db:push": "drizzle-kit push",
        seed: "tsx src/seed.ts",
        "heroku-postbuild": "npm run build"
      },
      dependencies: {
        "@neondatabase/serverless": "^0.10.4",
        "@netlify/functions": "^2.8.1",
        bcryptjs: "^3.0.2",
        "connect-pg-simple": "^10.0.0",
        cors: "^2.8.5",
        dotenv: "^17.2.1",
        "drizzle-kit": "^0.30.4",
        "drizzle-orm": "^0.39.1",
        "drizzle-zod": "^0.7.0",
        esbuild: "^0.25.0",
        express: "^4.21.2",
        "express-session": "^1.18.1",
        memorystore: "^1.6.7",
        multer: "^1.4.5-lts.1",
        nanoid: "^5.1.5",
        passport: "^0.7.0",
        "passport-local": "^1.0.0",
        "serverless-http": "^3.2.0",
        ws: "^8.18.0",
        xlsx: "^0.18.5",
        zod: "^3.24.2",
        "zod-validation-error": "^3.4.0"
      },
      devDependencies: {
        "@types/connect-pg-simple": "^7.0.3",
        "@types/cors": "^2.8.17",
        "@types/express": "4.17.21",
        "@types/express-session": "^1.18.0",
        "@types/multer": "^1.4.12",
        "@types/node": "^20.16.11",
        "@types/passport": "^1.0.16",
        "@types/passport-local": "^1.0.38",
        "@types/ws": "^8.5.13",
        tsx: "^4.19.1",
        typescript: "5.6.3"
      },
      optionalDependencies: {
        bufferutil: "^4.0.8"
      }
    };
  }
});

// netlify/functions/api.ts
import express from "express";

// src/routes.ts
import { createServer } from "http";

// src/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";

// src/schema.ts
var schema_exports = {};
__export(schema_exports, {
  documents: () => documents,
  documentsRelations: () => documentsRelations,
  families: () => families,
  familiesRelations: () => familiesRelations,
  insertDocumentSchema: () => insertDocumentSchema,
  insertFamilySchema: () => insertFamilySchema,
  insertLogSchema: () => insertLogSchema,
  insertMemberSchema: () => insertMemberSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertRequestSchema: () => insertRequestSchema,
  insertSessionSchema: () => insertSessionSchema,
  insertSettingsSchema: () => insertSettingsSchema,
  insertSupportVoucherSchema: () => insertSupportVoucherSchema,
  insertUserSchema: () => insertUserSchema,
  insertVoucherRecipientSchema: () => insertVoucherRecipientSchema,
  insertWifeSchema: () => insertWifeSchema,
  logs: () => logs,
  members: () => members,
  membersRelations: () => membersRelations,
  notifications: () => notifications,
  requests: () => requests,
  requestsRelations: () => requestsRelations,
  sessions: () => sessions,
  settings: () => settings,
  supportVouchers: () => supportVouchers,
  supportVouchersRelations: () => supportVouchersRelations,
  users: () => users,
  usersRelations: () => usersRelations,
  voucherRecipients: () => voucherRecipients,
  voucherRecipientsRelations: () => voucherRecipientsRelations,
  wives: () => wives,
  wivesRelations: () => wivesRelations
});
import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("head"),
  // 'head', 'admin', 'root'
  phone: varchar("phone", { length: 20 }),
  isProtected: boolean("is_protected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockoutUntil: timestamp("lockout_until"),
  deletedAt: timestamp("deleted_at")
  // <-- soft delete
});
var families = pgTable("families", {
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
  createdAt: timestamp("created_at").defaultNow()
});
var wives = pgTable("wives", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  wifeName: text("wife_name").notNull(),
  wifeID: varchar("wife_id", { length: 20 }),
  wifeBirthDate: varchar("wife_birth_date", { length: 10 }),
  wifeJob: text("wife_job"),
  wifePregnant: boolean("wife_pregnant").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var members = pgTable("members", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  fullName: text("full_name").notNull(),
  memberID: varchar("member_id", { length: 20 }),
  birthDate: varchar("birth_date", { length: 10 }),
  gender: varchar("gender", { length: 10 }).notNull(),
  isDisabled: boolean("is_disabled").default(false),
  disabilityType: text("disability_type"),
  relationship: varchar("relationship", { length: 50 }).notNull(),
  // 'son', 'daughter', 'mother', 'other'
  isChild: boolean("is_child").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  // 'financial', 'medical', 'damage'
  description: text("description").notNull(),
  attachments: text("attachments").array(),
  status: varchar("status", { length: 20 }).default("pending"),
  // 'pending', 'approved', 'rejected'
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  target: varchar("target", { length: 20 }).default("all"),
  // 'all', 'head', 'specific'
  recipients: integer("recipients").array(),
  createdAt: timestamp("created_at").defaultNow()
});
var documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedAt: timestamp("uploaded_at").defaultNow()
});
var sessions = pgTable("session", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: text("sess").notNull(),
  // JSON string
  expire: timestamp("expire", { mode: "date" }).notNull()
});
var logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  // e.g., 'admin', 'system', 'auth', etc.
  message: text("message").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow()
});
var supportVouchers = pgTable("support_vouchers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  supportType: varchar("support_type", { length: 50 }).notNull(),
  // 'food_basket', 'cash_support', 'school_kit', 'medical', 'other'
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  location: text("location"),
  isActive: boolean("is_active").default(true)
});
var voucherRecipients = pgTable("voucher_recipients", {
  id: serial("id").primaryKey(),
  voucherId: integer("voucher_id").references(() => supportVouchers.id).notNull(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  // 'pending', 'received', 'paid', 'not_attended'
  notified: boolean("notified").default(false),
  notifiedAt: timestamp("notified_at"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes")
});
var usersRelations = relations(users, ({ one, many }) => ({
  family: one(families, {
    fields: [users.id],
    references: [families.userId]
  }),
  createdVouchers: many(supportVouchers, { relationName: "voucherCreator" }),
  updatedRecipients: many(voucherRecipients, { relationName: "recipientUpdater" })
}));
var familiesRelations = relations(families, ({ one, many }) => ({
  user: one(users, {
    fields: [families.userId],
    references: [users.id]
  }),
  wives: many(wives),
  members: many(members),
  requests: many(requests),
  documents: many(documents),
  voucherRecipients: many(voucherRecipients)
}));
var membersRelations = relations(members, ({ one }) => ({
  family: one(families, {
    fields: [members.familyId],
    references: [families.id]
  })
}));
var requestsRelations = relations(requests, ({ one }) => ({
  family: one(families, {
    fields: [requests.familyId],
    references: [families.id]
  })
}));
var documentsRelations = relations(documents, ({ one }) => ({
  family: one(families, {
    fields: [documents.familyId],
    references: [families.id]
  })
}));
var supportVouchersRelations = relations(supportVouchers, ({ one, many }) => ({
  creator: one(users, {
    fields: [supportVouchers.createdBy],
    references: [users.id],
    relationName: "voucherCreator"
  }),
  recipients: many(voucherRecipients)
}));
var wivesRelations = relations(wives, ({ one }) => ({
  family: one(families, {
    fields: [wives.familyId],
    references: [families.id]
  })
}));
var voucherRecipientsRelations = relations(voucherRecipients, ({ one }) => ({
  voucher: one(supportVouchers, {
    fields: [voucherRecipients.voucherId],
    references: [supportVouchers.id]
  }),
  family: one(families, {
    fields: [voucherRecipients.familyId],
    references: [families.id]
  }),
  updater: one(users, {
    fields: [voucherRecipients.updatedBy],
    references: [users.id],
    relationName: "recipientUpdater"
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertFamilySchema = createInsertSchema(families).omit({
  id: true,
  createdAt: true
});
var insertWifeSchema = createInsertSchema(wives).omit({
  id: true,
  createdAt: true
});
var insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true
});
var insertRequestSchema = createInsertSchema(requests).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});
var insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true
});
var insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  createdAt: true
});
var insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true
});
var insertSupportVoucherSchema = createInsertSchema(supportVouchers).omit({
  id: true,
  createdAt: true
});
var insertVoucherRecipientSchema = createInsertSchema(voucherRecipients).omit({
  id: true,
  updatedAt: true
});
var insertSessionSchema = createInsertSchema(sessions);

// src/db.ts
import dotenv from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
dotenv.config();
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
    // ✅ Required for Neon over TCP
  }
});
var db = drizzle(pool, { schema: schema_exports });

// src/storage.ts
import { eq, desc, and, sql, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  // Users
  async getUser(id, opts) {
    const whereClause = opts?.includeDeleted ? eq(users.id, id) : and(eq(users.id, id), isNull(users.deletedAt));
    const [user] = await db.select().from(users).where(whereClause);
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(and(eq(users.username, username), isNull(users.deletedAt)));
    return user || void 0;
  }
  async getUserByNationalId(nationalId) {
    const [family] = await db.select({ user: users }).from(families).innerJoin(users, and(eq(families.userId, users.id), isNull(users.deletedAt))).where(eq(families.husbandID, nationalId));
    return family?.user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, user) {
    const [updatedUser] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updatedUser || void 0;
  }
  async deleteUser(id) {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result?.rowCount ?? 0) > 0;
  }
  async getAllUsers(opts) {
    if (opts?.includeDeleted) {
      return await db.select().from(users);
    }
    return await db.select().from(users).where(isNull(users.deletedAt));
  }
  async softDeleteUser(id) {
    const [user] = await db.update(users).set({ deletedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return !!user;
  }
  async restoreUser(id) {
    const [user] = await db.update(users).set({ deletedAt: null }).where(eq(users.id, id)).returning();
    return !!user;
  }
  // Families
  async getFamily(id) {
    const [family] = await db.select().from(families).where(eq(families.id, id));
    return family || void 0;
  }
  async getFamilyByUserId(userId) {
    const [family] = await db.select().from(families).where(eq(families.userId, userId));
    return family || void 0;
  }
  async createFamily(family) {
    const [createdFamily] = await db.insert(families).values(family).returning();
    return createdFamily;
  }
  async updateFamily(id, family) {
    const [updatedFamily] = await db.update(families).set(family).where(eq(families.id, id)).returning();
    return updatedFamily || void 0;
  }
  async getAllFamilies() {
    return await db.select().from(families).orderBy(desc(families.createdAt));
  }
  async getAllFamiliesWithMembers() {
    const allFamilies = await this.getAllFamilies();
    const familiesWithMembers = await Promise.all(
      allFamilies.map(async (family) => {
        const members2 = await this.getMembersByFamilyId(family.id);
        return { ...family, members: members2 };
      })
    );
    return familiesWithMembers;
  }
  async deleteFamily(id) {
    await db.delete(wives).where(eq(wives.familyId, id));
    await db.delete(members).where(eq(members.familyId, id));
    await db.delete(requests).where(eq(requests.familyId, id));
    await db.delete(documents).where(eq(documents.familyId, id));
    const result = await db.delete(families).where(eq(families.id, id));
    return (result?.rowCount ?? 0) > 0;
  }
  async getFamiliesByUserId(userId) {
    return await db.select().from(families).where(eq(families.userId, userId));
  }
  // Wives
  async getWivesByFamilyId(familyId) {
    return await db.select().from(wives).where(eq(wives.familyId, familyId));
  }
  async getWife(id) {
    const [wife] = await db.select().from(wives).where(eq(wives.id, id));
    return wife || void 0;
  }
  async createWife(wife) {
    const [createdWife] = await db.insert(wives).values(wife).returning();
    return createdWife;
  }
  async updateWife(id, wife) {
    const [updatedWife] = await db.update(wives).set(wife).where(eq(wives.id, id)).returning();
    return updatedWife || void 0;
  }
  async deleteWife(id) {
    const result = await db.delete(wives).where(eq(wives.id, id));
    return (result?.rowCount ?? 0) > 0;
  }
  // Members
  async getMembersByFamilyId(familyId) {
    return await db.select().from(members).where(eq(members.familyId, familyId));
  }
  async getMember(id) {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member || void 0;
  }
  async createMember(member) {
    const [createdMember] = await db.insert(members).values(member).returning();
    return createdMember;
  }
  async updateMember(id, member) {
    const [updatedMember] = await db.update(members).set(member).where(eq(members.id, id)).returning();
    return updatedMember || void 0;
  }
  async deleteMember(id) {
    const result = await db.delete(members).where(eq(members.id, id));
    return (result?.rowCount ?? 0) > 0;
  }
  // Requests
  async getRequestsByFamilyId(familyId) {
    return await db.select().from(requests).where(eq(requests.familyId, familyId)).orderBy(desc(requests.createdAt));
  }
  async getAllRequests() {
    return await db.select().from(requests).orderBy(desc(requests.createdAt));
  }
  async getRequest(id) {
    const [request] = await db.select().from(requests).where(eq(requests.id, id));
    return request || void 0;
  }
  async createRequest(request) {
    const [createdRequest] = await db.insert(requests).values(request).returning();
    return createdRequest;
  }
  async updateRequest(id, request) {
    const [updatedRequest] = await db.update(requests).set({
      ...request,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(requests.id, id)).returning();
    return updatedRequest || void 0;
  }
  // Notifications
  async getAllNotifications() {
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }
  async createNotification(notification) {
    const [createdNotification] = await db.insert(notifications).values(notification).returning();
    return createdNotification;
  }
  // Documents
  async getDocumentsByFamilyId(familyId) {
    return await db.select().from(documents).where(eq(documents.familyId, familyId));
  }
  async createDocument(document) {
    const [createdDocument] = await db.insert(documents).values(document).returning();
    return createdDocument;
  }
  async deleteDocument(id) {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return (result?.rowCount ?? 0) > 0;
  }
  // Logs
  async getLogs(filter = {}) {
    let query = db.select().from(logs);
    if (filter.type) query = query.where(eq(logs.type, filter.type));
    if (filter.userId) query = query.where(eq(logs.userId, filter.userId));
    if (filter.search) query = query.where(sql`${logs.message} ILIKE '%' || ${filter.search} || '%'`);
    if (filter.limit) query = query.limit(filter.limit);
    if (filter.offset) query = query.offset(filter.offset);
    return await query.orderBy(desc(logs.createdAt));
  }
  async createLog(log) {
    const [created] = await db.insert(logs).values(log).returning();
    return created;
  }
  // Settings
  async getSetting(key) {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value || void 0;
  }
  async setSetting(key, value, description) {
    await db.insert(settings).values({ key, value, description }).onConflictDoUpdate({
      target: settings.key,
      set: { value, description }
    });
  }
  async getAllSettings() {
    return await db.select().from(settings);
  }
  // Support Vouchers
  async getAllSupportVouchers() {
    const vouchers = await db.select().from(supportVouchers).orderBy(desc(supportVouchers.createdAt));
    const vouchersWithDetails = await Promise.all(
      vouchers.map(async (voucher) => {
        const creator = await this.getUser(voucher.createdBy);
        const recipients = await this.getVoucherRecipients(voucher.id);
        return {
          ...voucher,
          creator,
          recipients
        };
      })
    );
    return vouchersWithDetails;
  }
  async getSupportVoucher(id) {
    const [supportVoucher] = await db.select().from(supportVouchers).where(eq(supportVouchers.id, id));
    return supportVoucher || void 0;
  }
  async createSupportVoucher(voucher) {
    const [createdVoucher] = await db.insert(supportVouchers).values(voucher).returning();
    return createdVoucher;
  }
  async updateSupportVoucher(id, voucher) {
    const [updatedVoucher] = await db.update(supportVouchers).set(voucher).where(eq(supportVouchers.id, id)).returning();
    return updatedVoucher || void 0;
  }
  // Voucher Recipients
  async getVoucherRecipients(voucherId) {
    const recipients = await db.select().from(voucherRecipients).where(eq(voucherRecipients.voucherId, voucherId));
    const recipientsWithFamilies = await Promise.all(
      recipients.map(async (recipient) => {
        const family = await this.getFamily(recipient.familyId);
        return {
          ...recipient,
          family
        };
      })
    );
    return recipientsWithFamilies;
  }
  async createVoucherRecipient(recipient) {
    const [createdRecipient] = await db.insert(voucherRecipients).values(recipient).returning();
    return createdRecipient;
  }
  async updateVoucherRecipient(id, recipient) {
    const [updatedRecipient] = await db.update(voucherRecipients).set(recipient).where(eq(voucherRecipients.id, id)).returning();
    return updatedRecipient || void 0;
  }
  async clearLogs() {
    await db.delete(logs);
  }
  async clearNotifications() {
    await db.delete(notifications);
  }
  async clearRequests() {
    await db.delete(requests);
  }
  async clearMembers() {
    await db.delete(members);
  }
  async clearFamilies() {
    await db.delete(families);
  }
  async clearUsers() {
    await db.delete(users);
  }
  async clearSettings() {
    await db.delete(settings);
  }
};
var storage = new DatabaseStorage();

// src/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  if (!stored) {
    console.log(`\u274C No stored password`);
    return false;
  }
  if (stored.startsWith("$2") && stored.length >= 60) {
    console.log(`\u{1F510} Using bcrypt comparison for: ${stored.substring(0, 10)}...`);
    try {
      const result = await bcrypt.compare(supplied, stored);
      console.log(`\u{1F512} Bcrypt comparison result: ${result}`);
      return result;
    } catch (error) {
      console.error("Bcrypt comparison error:", error);
      return false;
    }
  }
  if (stored.includes(".")) {
    console.log(`\u{1F510} Using scrypt comparison for: ${stored.substring(0, 20)}...`);
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.log(`\u274C Failed to split scrypt hash: hashed=${!!hashed}, salt=${!!salt}`);
      return false;
    }
    try {
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = await scryptAsync(supplied, salt, 64);
      console.log(`\u{1F50D} Buffer lengths - stored: ${hashedBuf.length}, computed: ${suppliedBuf.length}`);
      if (hashedBuf.length !== suppliedBuf.length) {
        console.log(`\u274C Buffer length mismatch`);
        return false;
      }
      const result = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log(`\u{1F512} Scrypt comparison result: ${result}`);
      return result;
    } catch (error) {
      console.error("Scrypt comparison error:", error);
      return false;
    }
  }
  console.log(`\u274C Unknown password format: ${stored.substring(0, 10)}...`);
  return false;
}
function setupAuth(app2) {
  const sessionSecret = process.env.SESSION_SECRET || "fallback-secret-for-development-only";
  const isProduction = process.env.NODE_ENV === "production";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const isHttps = frontendUrl.startsWith("https://") || process.env.NODE_ENV === "production";
  const frontendHost = new URL(frontendUrl).hostname;
  const isSameDomain = frontendHost === "localhost" || process.env.SAME_DOMAIN === "true";
  const sessionSettings = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: false,
      // Only secure for HTTPS
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      // 30 days
      sameSite: "lax"
      // "lax" for same domain, "none" for cross-domain HTTPS
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      console.log(`\u{1F510} Login attempt for username: ${username}`);
      const user = await storage.getUserByUsername(username);
      if (!user || user.deletedAt) {
        console.log(`\u274C User not found or deleted: ${username}`);
        return done(null, false);
      }
      console.log(`\u{1F50D} Found user: ${user.username}, role: ${user.role}`);
      console.log(`\u{1F511} Stored password hash: ${user.password.substring(0, 20)}...`);
      const passwordMatch = await comparePasswords(password, user.password);
      console.log(`\u{1F512} Password comparison result: ${passwordMatch}`);
      if (!passwordMatch) {
        return done(null, false);
      } else {
        console.log(`\u2705 Login successful for: ${username}`);
        return done(null, user);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });
  app2.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0648\u062C\u0648\u062F \u0628\u0627\u0644\u0641\u0639\u0644");
    }
    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password)
    });
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// src/routes.ts
import { z } from "zod";
import passport2 from "passport";
import multer from "multer";
import cors from "cors";
import pg2 from "pg";
import * as XLSX from "xlsx";
var upload = multer({ storage: multer.memoryStorage() });
function getRequestTypeInArabic(type) {
  switch (type) {
    case "financial":
      return "\u0645\u0633\u0627\u0639\u062F\u0629 \u0645\u0627\u0644\u064A\u0629";
    case "medical":
      return "\u0645\u0633\u0627\u0639\u062F\u0629 \u0637\u0628\u064A\u0629";
    case "damage":
      return "\u062A\u0639\u0648\u064A\u0636 \u0623\u0636\u0631\u0627\u0631";
    default:
      return type;
  }
}
function isHeadOrDualRole(user, family) {
  return user.role === "head" || user.role === "admin" && family;
}
async function getFamilyByIdOrDualRole(familyId) {
  let family = await storage.getFamily(familyId);
  if (!family) {
    const allFamilies = await storage.getAllFamilies();
    family = allFamilies.find((f) => f.id === familyId);
  }
  return family;
}
function registerRoutes(app2) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  console.log(`\u{1F527} CORS configuration for frontend: ${frontendUrl}`);
  app2.use(cors({
    origin: frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "Set-Cookie"],
    exposedHeaders: ["Set-Cookie"]
  }));
  setupAuth(app2);
  app2.post("/api/admin/import-heads", upload.single("excel"), async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "root"].includes(req.user.role)) {
      console.log(`\u274C Unauthorized import attempt by user: ${req.user?.username || "anonymous"}`);
      return res.sendStatus(403);
    }
    req.setTimeout(10 * 60 * 1e3);
    res.setTimeout(10 * 60 * 1e3);
    console.log(`\u{1F4CA} Excel import started by user: ${req.user.username}`);
    try {
      if (!req.file) {
        console.log("\u274C No file uploaded");
        return res.status(400).json({ message: "\u064A\u0631\u062C\u0649 \u0631\u0641\u0639 \u0645\u0644\u0641 Excel" });
      }
      console.log(`\u{1F4C1} File uploaded: ${req.file.originalname}, Size: ${req.file.size} bytes`);
      if (req.file.size > 10 * 1024 * 1024) {
        console.log(`\u274C File too large: ${req.file.size} bytes`);
        return res.status(400).json({ message: "\u062D\u062C\u0645 \u0627\u0644\u0645\u0644\u0641 \u0643\u0628\u064A\u0631 \u062C\u062F\u0627\u064B. \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 10 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A" });
      }
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      console.log(`\u{1F4CB} Processing sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      if (!data || data.length === 0) {
        console.log("\u274C Empty Excel file");
        return res.status(400).json({ message: "\u0645\u0644\u0641 Excel \u0641\u0627\u0631\u063A \u0623\u0648 \u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A" });
      }
      console.log(`\u{1F4CA} Found ${data.length} rows to process`);
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowIndex = i + 2;
        if (i % 50 === 0) {
          console.log(`\u{1F4CA} Processing row ${i + 1}/${data.length} (${Math.round(i / data.length * 100)}%)`);
        }
        try {
          if (!row.husbandName || !row.husbandID) {
            errors.push(`\u0627\u0644\u0635\u0641 ${rowIndex}: \u0627\u0633\u0645 \u0631\u0628 \u0627\u0644\u0623\u0633\u0631\u0629 \u0648\u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646`);
            errorCount++;
            continue;
          }
          const husbandID = String(row.husbandID);
          const existingUser = await storage.getUserByNationalId(husbandID);
          if (existingUser) {
            errors.push(`\u0627\u0644\u0635\u0641 ${rowIndex}: \u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629 ${husbandID} \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B`);
            errorCount++;
            continue;
          }
          if (!/^\d{9}$/.test(husbandID)) {
            errors.push(`\u0627\u0644\u0635\u0641 ${rowIndex}: \u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629 ${husbandID} \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 9 \u0623\u0631\u0642\u0627\u0645`);
            errorCount++;
            continue;
          }
          const user = await storage.createUser({
            username: husbandID,
            password: await hashPassword(husbandID),
            // Use ID as default password
            role: "head",
            phone: row.primaryPhone ? String(row.primaryPhone) : null
          });
          const familyData = {
            userId: user.id,
            husbandName: row.husbandName,
            husbandID,
            husbandBirthDate: row.husbandBirthDate || null,
            husbandJob: row.husbandJob || null,
            primaryPhone: row.primaryPhone ? String(row.primaryPhone) : null,
            secondaryPhone: row.secondaryPhone ? String(row.secondaryPhone) : null,
            originalResidence: row.originalResidence || null,
            currentHousing: row.currentHousing || null,
            isDisplaced: Boolean(row.isDisplaced),
            displacedLocation: row.displacedLocation || null,
            isAbroad: Boolean(row.isAbroad),
            warDamage2024: Boolean(row.warDamage2024),
            warDamageDescription: row.warDamageDescription || null,
            branch: row.branch || null,
            landmarkNear: row.landmarkNear || null,
            totalMembers: parseInt(String(row.totalMembers)) || 0,
            numMales: parseInt(String(row.numMales)) || 0,
            numFemales: parseInt(String(row.numFemales)) || 0,
            socialStatus: row.socialStatus || null,
            adminNotes: row.adminNotes || null
          };
          await storage.createFamily(familyData);
          successCount++;
        } catch (error) {
          console.error(`\u274C Error processing row ${rowIndex}:`, error.message);
          errors.push(`\u0627\u0644\u0635\u0641 ${rowIndex}: ${error.message}`);
          errorCount++;
        }
      }
      const resultMessage = `\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F ${successCount} \u0639\u0627\u0626\u0644\u0629 \u0628\u0646\u062C\u0627\u062D\u060C \u0641\u0634\u0644 \u0641\u064A ${errorCount} \u0635\u0641`;
      console.log(`\u2705 Import completed: ${resultMessage}`);
      res.json({
        message: resultMessage,
        successCount,
        errorCount,
        errors: errors.slice(0, 20)
        // Limit errors to first 20 to avoid huge responses
      });
    } catch (error) {
      console.error("\u274C Excel import error:", error);
      console.error("Stack trace:", error.stack);
      let errorMessage = "\u062E\u0637\u0623 \u0641\u064A \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0645\u0644\u0641 Excel";
      if (error.message.includes("Invalid file format")) {
        errorMessage = "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D. \u064A\u0631\u062C\u0649 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u0644\u0641 Excel (.xlsx \u0623\u0648 .xls)";
      } else if (error.message.includes("Permission denied")) {
        errorMessage = "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064A\u0629";
      } else {
        errorMessage += ": " + error.message;
      }
      res.status(500).json({ message: errorMessage });
    }
  });
  app2.post("/api/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      if (!password || password === "" || password === null || password === void 0) {
        const user2 = await storage.getUserByUsername(username);
        if (!user2) {
          return res.status(401).send("\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u062E\u0627\u0637\u0626\u0629 - \u0631\u0627\u062C\u0639 \u0644\u062C\u0646\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629");
        }
        const isPromotedHead = user2.role === "admin" && /^\d{9}$/.test(user2.username);
        if (user2.role !== "head" && !isPromotedHead) {
          return res.status(401).send("\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644: \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629");
        }
        if (user2.role === "head") {
          const family = await storage.getFamilyByUserId(user2.id);
          if (!family) {
            return res.status(401).send("\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u062E\u0627\u0637\u0626\u0629 - \u0631\u0627\u062C\u0639 \u0644\u062C\u0646\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629");
          }
        }
        if (user2.lockoutUntil && /* @__PURE__ */ new Date() < user2.lockoutUntil) {
          const remainingMinutes = Math.ceil((user2.lockoutUntil.getTime() - (/* @__PURE__ */ new Date()).getTime()) / (1e3 * 60));
          return res.status(423).send(`\u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u062D\u0638\u0648\u0631 \u0645\u0624\u0642\u062A\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F ${remainingMinutes} \u062F\u0642\u064A\u0642\u0629`);
        }
        await storage.updateUser(user2.id, {
          failedLoginAttempts: 0,
          lockoutUntil: null
        });
        req.login(user2, (err) => {
          if (err) return next(err);
          console.log(`\u2705 Login successful - Session ID: ${req.sessionID}`);
          console.log(`\u2705 Login successful - User: ${user2.username}, Role: ${user2.role}`);
          console.log(`\u2705 Login successful - Is authenticated: ${req.isAuthenticated()}`);
          res.status(200).json(user2);
        });
        return;
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).send("\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u062E\u0627\u0637\u0626\u0629 - \u0631\u0627\u062C\u0639 \u0644\u062C\u0646\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629");
      }
      if (user.lockoutUntil && /* @__PURE__ */ new Date() < user.lockoutUntil) {
        const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - (/* @__PURE__ */ new Date()).getTime()) / (1e3 * 60));
        return res.status(423).send(`\u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u062D\u0638\u0648\u0631 \u0645\u0624\u0642\u062A\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F ${remainingMinutes} \u062F\u0642\u064A\u0642\u0629`);
      }
      const settings2 = await storage.getAllSettings();
      const settingsMap = Object.fromEntries(settings2.map((s) => [s.key, s.value]));
      const maxLoginAttempts = parseInt(settingsMap.maxLoginAttempts || "5");
      const lockoutDuration = parseInt(settingsMap.lockoutDuration || "15");
      passport2.authenticate("local", async (err, authenticatedUser, info) => {
        if (err) return next(err);
        if (!authenticatedUser) {
          const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
          let lockoutUntil = null;
          if (newFailedAttempts >= maxLoginAttempts) {
            lockoutUntil = new Date(Date.now() + lockoutDuration * 60 * 1e3);
          }
          await storage.updateUser(user.id, {
            failedLoginAttempts: newFailedAttempts,
            lockoutUntil
          });
          if (lockoutUntil) {
            return res.status(423).send(`\u062A\u0645 \u062D\u0638\u0631 \u0627\u0644\u062D\u0633\u0627\u0628 \u0644\u0645\u062F\u0629 ${lockoutDuration} \u062F\u0642\u064A\u0642\u0629 \u0628\u0633\u0628\u0628 \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0627\u0644\u0641\u0627\u0634\u0644\u0629 \u0627\u0644\u0645\u062A\u0643\u0631\u0631\u0629`);
          } else {
            const remainingAttempts = maxLoginAttempts - newFailedAttempts;
            return res.status(401).send(`\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644: \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629. \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629: ${remainingAttempts}`);
          }
        }
        await storage.updateUser(user.id, {
          failedLoginAttempts: 0,
          lockoutUntil: null
        });
        req.login(authenticatedUser, (err2) => {
          if (err2) return next(err2);
          console.log(`\u2705 Login successful - Session ID: ${req.sessionID}`);
          console.log(`\u2705 Login successful - User: ${authenticatedUser.username}, Role: ${authenticatedUser.role}`);
          console.log(`\u2705 Login successful - Is authenticated: ${req.isAuthenticated()}`);
          res.status(200).json(authenticatedUser);
        });
      })(req, res, next);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).send("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645");
    }
  });
  app2.get("/api/family", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const family = await storage.getFamilyByUserId(req.user.id);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      const wives2 = await storage.getWivesByFamilyId(family.id);
      const members2 = await storage.getMembersByFamilyId(family.id);
      res.json({ ...family, wives: wives2, members: members2 });
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/family", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const familyData = insertFamilySchema.parse(req.body);
      familyData.userId = req.user.id;
      const family = await storage.createFamily(familyData);
      res.status(201).json(family);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.put("/api/family/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const familyData = insertFamilySchema.partial().parse(req.body);
      if (req.user.role === "head") {
        const family2 = await storage.getFamily(id);
        if (!family2 || family2.userId !== req.user.id) {
          return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643" });
        }
      }
      const family = await storage.updateFamily(id, familyData);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      res.json(family);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/family/:familyId/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const familyId = parseInt(req.params.familyId);
      const family = await storage.getFamily(familyId);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      if (isHeadOrDualRole(req.user, family) && family.userId !== req.user.id) {
        return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643" });
      }
      const members2 = await storage.getMembersByFamilyId(familyId);
      res.json(members2);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const family = await storage.getFamilyByUserId(req.user.id);
      if (!family) {
        return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      }
      if (isHeadOrDualRole(req.user, family)) {
        const memberDataSchema = insertMemberSchema.omit({ familyId: true });
        const parsedData = memberDataSchema.parse(req.body);
        const memberData = { ...parsedData, familyId: family.id };
        const member = await storage.createMember(memberData);
        res.status(201).json(member);
      } else {
        return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.put("/api/members/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const memberData = insertMemberSchema.partial().parse(req.body);
      const member = await storage.getMember(id);
      if (!member) return res.status(404).json({ message: "\u0627\u0644\u0641\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const family = await storage.getFamily(member.familyId);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      if (isHeadOrDualRole(req.user, family) && family.userId !== req.user.id) {
        return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643" });
      }
      const updatedMember = await storage.updateMember(id, memberData);
      if (!updatedMember) return res.status(404).json({ message: "\u0627\u0644\u0641\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      res.json(updatedMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.delete("/api/members/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      console.log("Server: Attempting to delete member with ID:", id);
      console.log("Server: ID type:", typeof id);
      if (req.user.role === "head") {
        const member = await storage.getMember(id);
        console.log("Server: Found member:", member);
        if (!member) {
          console.log("Server: Member not found for ID:", id);
          return res.status(404).json({ message: "\u0627\u0644\u0641\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        }
        const family = await storage.getFamily(member.familyId);
        console.log("Server: Found family:", family);
        if (!family || family.userId !== req.user.id) {
          console.log("Server: Forbidden - family not found or user mismatch");
          return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643" });
        }
        const success = await storage.deleteMember(id);
        console.log("Server: Delete result:", success);
        if (!success) {
          console.log("Server: Delete failed for ID:", id);
          return res.status(404).json({ message: "\u0627\u0644\u0641\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        }
        res.sendStatus(204);
      } else {
        const success = await storage.deleteMember(id);
        if (!success) {
          return res.status(404).json({ message: "\u0627\u0644\u0641\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        }
        res.sendStatus(204);
      }
    } catch (error) {
      console.error("Server: Error deleting member:", error);
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/family/:familyId/wives", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const familyId = parseInt(req.params.familyId);
      const family = await storage.getFamily(familyId);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      if (isHeadOrDualRole(req.user, family) && family.userId !== req.user.id) {
        return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643" });
      }
      const wives2 = await storage.getWivesByFamilyId(familyId);
      res.json(wives2);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/wives", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const family = await storage.getFamilyByUserId(req.user.id);
      if (!family) {
        return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      }
      if (isHeadOrDualRole(req.user, family)) {
        const wifeDataSchema = insertWifeSchema.omit({ familyId: true });
        const parsedData = wifeDataSchema.parse(req.body);
        const wifeData = { ...parsedData, familyId: family.id };
        const wife = await storage.createWife(wifeData);
        res.status(201).json(wife);
      } else {
        return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.put("/api/wives/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const wifeData = insertWifeSchema.partial().parse(req.body);
      const wife = await storage.getWife(id);
      if (!wife) return res.status(404).json({ message: "\u0627\u0644\u0632\u0648\u062C\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      const family = await storage.getFamily(wife.familyId);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      if (isHeadOrDualRole(req.user, family) && family.userId !== req.user.id) {
        return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643" });
      }
      const updatedWife = await storage.updateWife(id, wifeData);
      if (!updatedWife) return res.status(404).json({ message: "\u0627\u0644\u0632\u0648\u062C\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      res.json(updatedWife);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.delete("/api/wives/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const wife = await storage.getWife(id);
      if (!wife) return res.status(404).json({ message: "\u0627\u0644\u0632\u0648\u062C\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      const family = await storage.getFamily(wife.familyId);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      if (isHeadOrDualRole(req.user, family) && family.userId !== req.user.id) {
        return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643" });
      }
      const success = await storage.deleteWife(id);
      if (!success) return res.status(404).json({ message: "\u0627\u0644\u0632\u0648\u062C\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      res.sendStatus(204);
    } catch (error) {
      console.error("Server: Error deleting wife:", error);
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const family = await storage.getFamilyByUserId(req.user.id);
      if (isHeadOrDualRole(req.user, family)) {
        if (!family) return res.json([]);
        const requests2 = await storage.getRequestsByFamilyId(family.id);
        res.json(requests2);
      } else {
        const requests2 = await storage.getAllRequests();
        const requestsWithFamily = await Promise.all(
          requests2.map(async (request) => {
            const family2 = await getFamilyByIdOrDualRole(request.familyId);
            return { ...request, family: family2 };
          })
        );
        res.json(requestsWithFamily);
      }
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      let requestData;
      const family = await storage.getFamilyByUserId(req.user.id);
      if (isHeadOrDualRole(req.user, family)) {
        const requestDataSchema = insertRequestSchema.omit({ familyId: true });
        requestData = requestDataSchema.parse(req.body);
        if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
        requestData = { ...requestData, familyId: family.id };
      } else {
        requestData = insertRequestSchema.parse(req.body);
      }
      const request = await storage.createRequest(requestData);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.put("/api/requests/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === "head") return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const requestData = insertRequestSchema.partial().parse(req.body);
      const originalRequest = await storage.getRequest(id);
      if (!originalRequest) return res.status(404).json({ message: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const request = await storage.updateRequest(id, requestData);
      if (!request) return res.status(404).json({ message: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const statusChanged = originalRequest.status !== request.status;
      const commentAdded = !originalRequest.adminComment && request.adminComment;
      const commentChanged = originalRequest.adminComment !== request.adminComment;
      const family = await getFamilyByIdOrDualRole(request.familyId);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      console.log("[Notification Debug]", {
        requestId: request.id,
        familyId: request.familyId,
        familyUserId: family.userId,
        action: statusChanged ? "statusChanged" : commentAdded || commentChanged ? "comment" : "none",
        notificationRecipients: [family.userId]
      });
      if (statusChanged) {
        const statusText = request.status === "approved" ? "\u062A\u0645\u062A \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629" : request.status === "rejected" ? "\u062A\u0645 \u0627\u0644\u0631\u0641\u0636" : "\u062A\u0645 \u0627\u0644\u062A\u062D\u062F\u064A\u062B";
        await storage.createNotification({
          title: `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 #${request.id}`,
          message: `\u062A\u0645 ${statusText} \u0639\u0644\u0649 \u0637\u0644\u0628\u0643 \u0645\u0646 \u0646\u0648\u0639 "${getRequestTypeInArabic(request.type)}". ${request.adminComment ? `\u0627\u0644\u062A\u0639\u0644\u064A\u0642: ${request.adminComment}` : ""}`,
          target: "specific",
          recipients: [family.userId]
        });
      } else if (commentAdded || commentChanged) {
        await storage.createNotification({
          title: `\u062A\u0639\u0644\u064A\u0642 \u0625\u062F\u0627\u0631\u064A \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628 #${request.id}`,
          message: `\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u062A\u0639\u0644\u064A\u0642 \u0625\u062F\u0627\u0631\u064A \u0639\u0644\u0649 \u0637\u0644\u0628\u0643 \u0645\u0646 \u0646\u0648\u0639 "${getRequestTypeInArabic(request.type)}": ${request.adminComment}`,
          target: "specific",
          recipients: [family.userId]
        });
      }
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      let notifications2 = await storage.getAllNotifications();
      if (req.user.role === "head") {
        notifications2 = notifications2.filter(
          (n) => n.target === "all" || n.target === "head" || n.target === "urgent" || n.target === "specific" && Array.isArray(n.recipients) && n.recipients.includes(req.user.id)
        );
      }
      res.json(notifications2);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === "head") return res.sendStatus(403);
    try {
      let notificationData = insertNotificationSchema.parse(req.body);
      if (notificationData.target === "admin") {
        const admins = await storage.getAllUsers?.() || [];
        const adminIds = admins.filter((u) => u.role === "admin").map((u) => u.id);
        notificationData = {
          ...notificationData,
          recipients: adminIds
        };
      }
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/admin/families", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === "head") return res.sendStatus(403);
    try {
      const families2 = await storage.getAllFamiliesWithMembers();
      res.json(families2);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/admin/families/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === "head") return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const family = await getFamilyByIdOrDualRole(id);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      const wives2 = await storage.getWivesByFamilyId(family.id);
      const members2 = await storage.getMembersByFamilyId(family.id);
      const requests2 = await storage.getRequestsByFamilyId(family.id);
      res.json({ ...family, wives: wives2, members: members2, requests: requests2 });
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.put("/api/admin/families/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === "head") return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const familyData = insertFamilySchema.partial().parse(req.body);
      const family = await getFamilyByIdOrDualRole(id);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      const updatedFamily = await storage.updateFamily(id, familyData);
      if (!updatedFamily) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      res.json(updatedFamily);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.delete("/api/admin/families/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === "head") return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFamily(id);
      if (!success) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/admin/families/:id/members", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === "head") return res.sendStatus(403);
    try {
      const familyId = parseInt(req.params.id);
      const family = await getFamilyByIdOrDualRole(familyId);
      if (!family) return res.status(404).json({ message: "\u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      const memberData = { ...insertMemberSchema.omit({ familyId: true }).parse(req.body), familyId };
      const member = await storage.createMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/register-family", async (req, res) => {
    try {
      const { user: userData, family: familyData, members: membersData } = req.body;
      const existingUser = await storage.getUserByNationalId(familyData.husbandID);
      if (existingUser) {
        return res.status(400).json({ message: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
      }
      const user = await storage.createUser({
        username: familyData.husbandID,
        password: userData.password ? await hashPassword(userData.password) : await hashPassword(familyData.husbandID),
        role: "head",
        phone: familyData.primaryPhone
      });
      const family = await storage.createFamily({
        ...familyData,
        userId: user.id
      });
      if (membersData && membersData.length > 0) {
        for (const memberData of membersData) {
          await storage.createMember({
            ...memberData,
            familyId: family.id
          });
        }
      }
      if (userData.password) {
        req.login(user, (err) => {
          if (err) return res.status(500).json({ message: "\u062A\u0645 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0628\u0646\u062C\u0627\u062D \u0644\u0643\u0646 \u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
          res.status(201).json({ user, family });
        });
      } else {
        res.status(201).json({ user, family });
      }
    } catch (error) {
      if (error.code === "23505") {
        return res.status(400).json({ message: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0625\u062F\u062E\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u062C\u062F\u064A\u062F\u0629" });
    }
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const valid = await comparePasswords(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const hashed = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashed });
      res.json({ message: "\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" });
    }
  });
  app2.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === "head") return res.sendStatus(403);
    try {
      const users2 = await storage.getAllUsers({ includeDeleted: true });
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root") return res.sendStatus(403);
    try {
      let userData = req.body;
      if (userData.password) {
        const settings2 = await storage.getAllSettings();
        const settingsMap = Object.fromEntries(settings2.map((s) => [s.key, s.value]));
        const minLength = parseInt(settingsMap.minPasswordLength || "8");
        const requireUppercase = settingsMap.requireUppercase === "true";
        const requireLowercase = settingsMap.requireLowercase === "true";
        const requireNumbers = settingsMap.requireNumbers === "true";
        const requireSpecialChars = settingsMap.requireSpecialChars === "true";
        const errors = [];
        if (userData.password.length < minLength) {
          errors.push(`\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 ${minLength} \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644`);
        }
        if (requireUppercase && !/[A-Z]/.test(userData.password)) {
          errors.push("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0643\u0628\u064A\u0631 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
        }
        if (requireLowercase && !/[a-z]/.test(userData.password)) {
          errors.push("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0635\u063A\u064A\u0631 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
        }
        if (requireNumbers && !/\d/.test(userData.password)) {
          errors.push("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0631\u0642\u0645 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
        }
        if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(userData.password)) {
          errors.push("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0631\u0645\u0632 \u062E\u0627\u0635 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
        }
        if (errors.length > 0) {
          return res.status(400).json({ message: errors.join("\u060C ") });
        }
        userData.password = await hashPassword(userData.password);
      }
      const allowedFields = ["username", "password", "role", "phone", "isProtected", "identityId"];
      userData = Object.fromEntries(Object.entries(userData).filter(([k]) => allowedFields.includes(k)));
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.put("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root" && req.user.role !== "admin") return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      let userData = req.body;
      const targetUser = await storage.getUser(id);
      if (!targetUser) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (req.user.role === "root") {
        if (!userData.username) {
          userData.username = targetUser.username;
        }
        const updatedUser = await storage.updateUser(id, userData);
        if (!updatedUser) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.json(updatedUser);
      }
      if (req.user.role === "admin") {
        if (targetUser.role === "root") {
          return res.status(403).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0641 \u0627\u0644\u0631\u0626\u064A\u0633\u064A." });
        }
        if (targetUser.role === "admin" && targetUser.isProtected) {
          return res.status(403).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u062A\u0639\u062F\u064A\u0644 \u0645\u0634\u0631\u0641 \u0645\u062D\u0645\u064A." });
        }
        if (req.user.isProtected) {
          if (targetUser.role === "admin" && !targetUser.isProtected) {
          } else if (targetUser.role === "head") {
          } else {
            return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u062A\u0639\u062F\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645." });
          }
        } else {
          if (targetUser.role !== "head" && !(targetUser.role === "admin" && !targetUser.isProtected)) {
            return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u062A\u0639\u062F\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645." });
          }
        }
        if ("isProtected" in userData) {
          delete userData.isProtected;
        }
        userData.role = targetUser.role;
        if (!userData.username) {
          userData.username = targetUser.username;
        }
        const updatedUser = await storage.updateUser(id, userData);
        if (!updatedUser) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.json(updatedUser);
      }
      return res.sendStatus(403);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root" && req.user.role !== "admin") return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const targetUser = await storage.getUser(id);
      if (!targetUser) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const families2 = await storage.getFamiliesByUserId(id);
      const hasFamilies = families2 && families2.length > 0;
      const cascade = req.query.cascade === "true";
      const hard = req.query.hard === "true";
      if (hasFamilies && !cascade) {
        return res.status(409).json({
          message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0644\u0623\u0646\u0647 \u0645\u0631\u062A\u0628\u0637 \u0628\u0639\u0627\u0626\u0644\u0627\u062A. \u064A\u0645\u0643\u0646\u0643 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u062D\u0630\u0641 \u0627\u0644\u0645\u062A\u0633\u0644\u0633\u0644 \u0644\u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u0639\u0627\u0626\u0644\u0627\u062A \u0648\u0627\u0644\u0623\u0641\u0631\u0627\u062F \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u064A\u0646 \u0628\u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645.",
          code: "USER_REFERENCED_IN_FAMILY",
          families: families2.map((f) => ({ id: f.id, husbandName: f.husbandName, husbandID: f.husbandID }))
        });
      }
      if (req.user.role === "root") {
        if (targetUser.id === req.user.id) {
          return res.status(403).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628\u0643 \u0627\u0644\u062E\u0627\u0635" });
        }
        if (hasFamilies && cascade) {
          for (const family of families2) {
            await storage.deleteFamily(family.id);
          }
        }
        const success = hard ? await storage.deleteUser(id) : await storage.softDeleteUser(id);
        if (!success) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.sendStatus(204);
      }
      if (req.user.role === "admin") {
        if (targetUser.role === "root") {
          return res.status(403).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0641 \u0627\u0644\u0631\u0626\u064A\u0633\u064A." });
        }
        if (targetUser.role === "admin" && targetUser.isProtected) {
          return res.status(403).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u062D\u0630\u0641 \u0645\u0634\u0631\u0641 \u0645\u062D\u0645\u064A." });
        }
        if (req.user.isProtected) {
          if (targetUser.role === "admin" && !targetUser.isProtected) {
          } else if (targetUser.role === "head") {
          } else {
            return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645." });
          }
        } else {
          if (targetUser.role !== "head" && !(targetUser.role === "admin" && !targetUser.isProtected)) {
            return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645." });
          }
        }
        if (hasFamilies && cascade) {
          for (const family of families2) {
            await storage.deleteFamily(family.id);
          }
        }
        const success = hard ? await storage.deleteUser(id) : await storage.softDeleteUser(id);
        if (!success) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return res.sendStatus(204);
      }
      return res.sendStatus(403);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/admin/users/:id/reset-lockout", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root" && req.user.role !== "admin") return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const targetUser = await storage.getUser(id);
      if (!targetUser) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (req.user.role === "root") {
        await storage.updateUser(id, {
          failedLoginAttempts: 0,
          lockoutUntil: null
        });
        return res.json({ message: "\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u062D\u0638\u0631 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D" });
      }
      if (req.user.role === "admin") {
        if (targetUser.role === "root") {
          return res.status(403).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u062D\u0638\u0631 \u0627\u0644\u0645\u0634\u0631\u0641 \u0627\u0644\u0631\u0626\u064A\u0633\u064A." });
        }
        if (targetUser.role === "admin" && targetUser.isProtected) {
          return res.status(403).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u062D\u0638\u0631 \u0645\u0634\u0631\u0641 \u0645\u062D\u0645\u064A." });
        }
        if (targetUser.role !== "head" && !(targetUser.role === "admin" && !targetUser.isProtected)) {
          return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u062D\u0638\u0631 \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645." });
        }
        await storage.updateUser(id, {
          failedLoginAttempts: 0,
          lockoutUntil: null
        });
        return res.json({ message: "\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u062D\u0638\u0631 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D" });
      }
      return res.sendStatus(403);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/admin/users/:id/restore", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root") return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id, { includeDeleted: true });
      if (!user || !user.deletedAt) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0645\u062D\u0630\u0648\u0641" });
      const success = await storage.restoreUser(id);
      if (!success) return res.status(500).json({ message: "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629" });
      res.json({ message: "\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/admin/logs", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root" && req.user.role !== "admin") return res.sendStatus(403);
    try {
      const { page = 1, pageSize = 20, type, userId, search } = req.query;
      const limit = Math.max(1, Math.min(Number(pageSize) || 20, 100));
      const offset = (Number(page) - 1) * limit;
      const logs2 = await storage.getLogs({
        type,
        userId: userId ? Number(userId) : void 0,
        search,
        limit,
        offset
      });
      const usersMap = Object.fromEntries((await storage.getAllUsers()).map((u) => [u.id, u]));
      const logsWithUser = logs2.map((log) => ({ ...log, user: usersMap[log.userId] || null }));
      res.json(logsWithUser);
    } catch (error) {
      console.error("Error in GET /api/admin/logs:", error);
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/admin/logs", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root" && req.user.role !== "admin") return res.sendStatus(403);
    try {
      const logData = req.body;
      logData.userId = req.user.id;
      const log = await storage.createLog(logData);
      res.status(201).json(log);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const allSettings = await storage.getAllSettings();
      const settingsMap = Object.fromEntries(allSettings.map((s) => [s.key, s.value]));
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/public/settings", async (req, res) => {
    try {
      const allSettings = await storage.getAllSettings();
      const settingsMap = Object.fromEntries(allSettings.map((s) => [s.key, s.value]));
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root") return res.sendStatus(403);
    try {
      const { key, value, description } = req.body;
      if (!key || value === void 0) {
        return res.status(400).json({ message: "\u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0648\u0627\u0644\u0642\u064A\u0645\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      }
      await storage.setSetting(key, value, description);
      res.json({ message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0639\u062F\u0627\u062F \u0628\u0646\u062C\u0627\u062D" });
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/settings/bulk", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root") return res.sendStatus(403);
    try {
      const { settings: settings2 } = req.body;
      if (!settings2 || typeof settings2 !== "object") {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629" });
      }
      const failures = [];
      let successCount = 0;
      for (const [key, value] of Object.entries(settings2)) {
        try {
          let description = "";
          switch (key) {
            case "siteName":
              description = "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0642\u0639/\u0627\u0644\u062A\u0637\u0628\u064A\u0642";
              break;
            case "siteTitle":
              description = "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0648\u0642\u0639";
              break;
            case "authPageTitle":
              description = "\u0639\u0646\u0648\u0627\u0646 \u0635\u0641\u062D\u0629 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644";
              break;
            case "authPageSubtitle":
              description = "\u0648\u0635\u0641 \u0635\u0641\u062D\u0629 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644";
              break;
            case "siteLogo":
              description = "\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u0648\u0642\u0639";
              break;
            case "authPageIcon":
              description = "\u0623\u064A\u0642\u0648\u0646\u0629 \u0635\u0641\u062D\u0629 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644";
              break;
            case "primaryColor":
              description = "\u0627\u0644\u0644\u0648\u0646 \u0627\u0644\u0623\u0633\u0627\u0633\u064A";
              break;
            case "secondaryColor":
              description = "\u0627\u0644\u0644\u0648\u0646 \u0627\u0644\u062B\u0627\u0646\u0648\u064A";
              break;
            case "themeMode":
              description = "\u0646\u0645\u0637 \u0627\u0644\u0645\u0638\u0647\u0631";
              break;
            case "fontFamily":
              description = "\u0646\u0648\u0639 \u0627\u0644\u062E\u0637";
              break;
            case "minPasswordLength":
              description = "\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u062F\u0646\u0649 \u0644\u0637\u0648\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631";
              break;
            case "requireUppercase":
              description = "\u062A\u0637\u0644\u0628 \u0623\u062D\u0631\u0641 \u0643\u0628\u064A\u0631\u0629";
              break;
            case "requireLowercase":
              description = "\u062A\u0637\u0644\u0628 \u0623\u062D\u0631\u0641 \u0635\u063A\u064A\u0631\u0629";
              break;
            case "requireNumbers":
              description = "\u062A\u0637\u0644\u0628 \u0623\u0631\u0642\u0627\u0645";
              break;
            case "requireSpecialChars":
              description = "\u062A\u0637\u0644\u0628 \u0631\u0645\u0648\u0632 \u062E\u0627\u0635\u0629";
              break;
            case "maxLoginAttempts":
              description = "\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644";
              break;
            case "lockoutDuration":
              description = "\u0645\u062F\u0629 \u0627\u0644\u062D\u0638\u0631 \u0628\u0627\u0644\u062F\u0642\u0627\u0626\u0642";
              break;
            case "sessionTimeout":
              description = "\u0645\u062F\u0629 \u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629 \u0628\u0627\u0644\u062F\u0642\u0627\u0626\u0642";
              break;
            default:
              description = key;
          }
          await storage.setSetting(key, value, description);
          successCount++;
        } catch (settingError) {
          failures.push({ key, error: settingError.message });
        }
      }
      if (failures.length === 0) {
        res.json({ message: `\u062A\u0645 \u062D\u0641\u0638 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0628\u0646\u062C\u0627\u062D (${successCount} \u0625\u0639\u062F\u0627\u062F)` });
      } else {
        res.status(207).json({
          message: `\u062A\u0645 \u062D\u0641\u0638 ${successCount} \u0625\u0639\u062F\u0627\u062F \u0628\u0646\u062C\u0627\u062D\u060C \u0641\u0634\u0644 \u0641\u064A \u062D\u0641\u0638 ${failures.length} \u0625\u0639\u062F\u0627\u062F`,
          failures
        });
      }
    } catch (error) {
      console.error("Bulk settings save error:", error);
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/settings/:key", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const value = await storage.getSetting(req.params.key);
      if (value === void 0) {
        return res.status(404).json({ message: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      res.json({ value });
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/settings/maintenance", async (req, res) => {
    try {
      const value = await storage.getSetting("maintenance");
      res.json({ enabled: value === "true" });
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/settings/maintenance", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root") return res.sendStatus(403);
    try {
      const { enabled } = req.body;
      await storage.setSetting("maintenance", enabled ? "true" : "false", "\u0648\u0636\u0639 \u0627\u0644\u0635\u064A\u0627\u0646\u0629");
      res.json({ message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0648\u0636\u0639 \u0627\u0644\u0635\u064A\u0627\u0646\u0629" });
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/version", async (req, res) => {
    try {
      const pkg = await Promise.resolve().then(() => __toESM(require_package(), 1));
      res.json({ version: pkg.default.version });
    } catch (error) {
      res.status(500).json({ message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0625\u0635\u062F\u0627\u0631" });
    }
  });
  app2.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user || !await comparePasswords(currentPassword, user.password)) {
        return res.status(400).json({ message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const settings2 = await storage.getAllSettings();
      const settingsMap = Object.fromEntries(settings2.map((s) => [s.key, s.value]));
      const minLength = parseInt(settingsMap.minPasswordLength || "8");
      const requireUppercase = settingsMap.requireUppercase === "true";
      const requireLowercase = settingsMap.requireLowercase === "true";
      const requireNumbers = settingsMap.requireNumbers === "true";
      const requireSpecialChars = settingsMap.requireSpecialChars === "true";
      const errors = [];
      if (newPassword.length < minLength) {
        errors.push(`\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 ${minLength} \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644`);
      }
      if (requireUppercase && !/[A-Z]/.test(newPassword)) {
        errors.push("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0643\u0628\u064A\u0631 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
      }
      if (requireLowercase && !/[a-z]/.test(newPassword)) {
        errors.push("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0635\u063A\u064A\u0631 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
      }
      if (requireNumbers && !/\d/.test(newPassword)) {
        errors.push("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0631\u0642\u0645 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
      }
      if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
        errors.push("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0631\u0645\u0632 \u062E\u0627\u0635 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
      }
      if (errors.length > 0) {
        return res.status(400).json({ message: errors.join("\u060C ") });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(req.user.id, hashedPassword);
      res.json({ message: "\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D" });
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" });
    }
  });
  app2.get("/api/admin/backup", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root") return res.sendStatus(403);
    try {
      const users2 = await storage.getAllUsers();
      const families2 = await storage.getAllFamilies();
      const members2 = [];
      for (const family of families2) {
        const famMembers = await storage.getMembersByFamilyId(family.id);
        members2.push(...famMembers);
      }
      const requests2 = await storage.getAllRequests();
      const notifications2 = await storage.getAllNotifications();
      const settings2 = await storage.getAllSettings();
      const logs2 = await storage.getLogs({});
      const backup = { users: users2, families: families2, members: members2, requests: requests2, notifications: notifications2, settings: settings2, logs: logs2 };
      res.setHeader("Content-Disposition", `attachment; filename=backup-${Date.now()}.json`);
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(backup, null, 2));
    } catch (e) {
      res.status(500).json({ message: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629" });
    }
  });
  app2.post("/api/admin/restore", upload.single("backup"), async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root") return res.sendStatus(403);
    try {
      if (!req.file) return res.status(400).json({ message: "\u064A\u0631\u062C\u0649 \u0631\u0641\u0639 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629" });
      const data = JSON.parse(req.file.buffer.toString());
      await storage.clearLogs();
      await storage.clearNotifications();
      await storage.clearRequests();
      await storage.clearMembers();
      await storage.clearFamilies();
      await storage.clearUsers();
      await storage.clearSettings();
      for (const s of data.settings || []) await storage.setSetting(s.key, s.value, s.description);
      for (const u of data.users || []) await storage.createUser(u);
      for (const f of data.families || []) await storage.createFamily(f);
      for (const m of data.members || []) await storage.createMember(m);
      for (const r of data.requests || []) await storage.createRequest(r);
      for (const n of data.notifications || []) await storage.createNotification(n);
      for (const l of data.logs || []) await storage.createLog(l);
      res.json({ message: "\u062A\u0645\u062A \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D" });
    } catch (e) {
      res.status(500).json({ message: "\u0641\u0634\u0644 \u0641\u064A \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629" });
    }
  });
  app2.post("/api/admin/merge", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "root") return res.sendStatus(403);
    try {
      const { url } = req.body;
      const remoteUrl = url || process.env.DATABASE_URL;
      if (!remoteUrl) return res.status(400).json({ message: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0627\u0628\u0637 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0648 \u0636\u0628\u0637\u0647 \u0641\u064A \u0627\u0644\u0628\u064A\u0626\u0629" });
      const { Pool: Pool2 } = pg2;
      const remotePool = new Pool2({ connectionString: remoteUrl, ssl: { rejectUnauthorized: false } });
      const remoteDb = { query: (...args) => remotePool.query(...args) };
      async function fetchAll(table) {
        const { rows } = await remoteDb.query(`SELECT * FROM ${table}`);
        return rows;
      }
      const remote = {
        users: await fetchAll("users"),
        families: await fetchAll("families"),
        members: await fetchAll("members"),
        requests: await fetchAll("requests"),
        notifications: await fetchAll("notifications"),
        settings: await fetchAll("settings"),
        logs: await fetchAll("logs")
      };
      let inserted = 0, updated = 0, skipped = 0;
      for (const r of remote.users) {
        const local = await storage.getUser(r.id);
        if (!local) {
          await storage.createUser(r);
          inserted++;
        } else if (r.updatedAt && local.updatedAt && new Date(r.updatedAt) > new Date(local.updatedAt)) {
          await storage.updateUser(r.id, r);
          updated++;
        } else {
          skipped++;
        }
      }
      for (const r of remote.families) {
        const local = await storage.getFamily(r.id);
        if (!local) {
          await storage.createFamily(r);
          inserted++;
        } else if (r.updatedAt && local.updatedAt && new Date(r.updatedAt) > new Date(local.updatedAt)) {
          await storage.updateFamily(r.id, r);
          updated++;
        } else {
          skipped++;
        }
      }
      for (const r of remote.members) {
        const local = await storage.getMember(r.id);
        if (!local) {
          await storage.createMember(r);
          inserted++;
        } else if (r.updatedAt && local.updatedAt && new Date(r.updatedAt) > new Date(local.updatedAt)) {
          await storage.updateMember(r.id, r);
          updated++;
        } else {
          skipped++;
        }
      }
      for (const r of remote.requests) {
        const local = await storage.getRequest(r.id);
        if (!local) {
          await storage.createRequest(r);
          inserted++;
        } else if (r.updatedAt && local.updatedAt && new Date(r.updatedAt) > new Date(local.updatedAt)) {
          await storage.updateRequest(r.id, r);
          updated++;
        } else {
          skipped++;
        }
      }
      for (const r of remote.notifications) {
        const all = await storage.getAllNotifications();
        if (!all.find((n) => n.id === r.id)) {
          await storage.createNotification(r);
          inserted++;
        } else {
          skipped++;
        }
      }
      for (const r of remote.settings) {
        const val = await storage.getSetting(r.key);
        if (val === void 0) {
          await storage.setSetting(r.key, r.value, r.description);
          inserted++;
        } else {
          skipped++;
        }
      }
      for (const r of remote.logs) {
        const all = await storage.getLogs({});
        if (!all.find((l) => l.id === r.id)) {
          await storage.createLog(r);
          inserted++;
        } else {
          skipped++;
        }
      }
      await remotePool.end();
      res.json({ message: `\u062A\u0645 \u0627\u0644\u062F\u0645\u062C: ${inserted} \u0645\u0636\u0627\u0641\u0629\u060C ${updated} \u0645\u062D\u062F\u062B\u0629\u060C ${skipped} \u0645\u062A\u0637\u0627\u0628\u0642\u0629.` });
    } catch (e) {
      res.status(500).json({ message: "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062F\u0645\u062C \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A: " + e.message });
    }
  });
  app2.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "root"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/support-vouchers", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "root"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const vouchers = await storage.getAllSupportVouchers();
      res.json(vouchers);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/support-vouchers/:id", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "root"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const voucherId = parseInt(req.params.id);
      const voucher = await storage.getSupportVoucher(voucherId);
      if (!voucher) {
        return res.status(404).json({ message: "\u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      const creator = await storage.getUser(voucher.createdBy);
      const recipients = await storage.getVoucherRecipients(voucherId);
      const voucherWithDetails = {
        ...voucher,
        creator,
        recipients
      };
      res.json(voucherWithDetails);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/support-vouchers", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "root"].includes(req.user.role)) return res.sendStatus(403);
    try {
      console.log("Received voucher data:", req.body);
      const createVoucherSchema = insertSupportVoucherSchema.omit({ createdBy: true });
      const voucherData = createVoucherSchema.parse(req.body);
      console.log("Parsed voucher data:", voucherData);
      const voucherToCreate = {
        ...voucherData,
        createdBy: req.user.id
      };
      const voucher = await storage.createSupportVoucher(voucherToCreate);
      res.status(201).json(voucher);
    } catch (error) {
      console.error("Error creating voucher:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: error.errors });
      }
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.patch("/api/support-vouchers/:id", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "root"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const voucherId = parseInt(req.params.id);
      const { isActive } = req.body;
      const voucher = await storage.getSupportVoucher(voucherId);
      if (!voucher) {
        return res.status(404).json({ message: "\u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      const updatedVoucher = await storage.updateSupportVoucher(voucherId, { isActive });
      res.json(updatedVoucher);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/support-vouchers/:id/recipients", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "root"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const voucherId = parseInt(req.params.id);
      const { familyIds } = req.body;
      if (!Array.isArray(familyIds)) {
        return res.status(400).json({ message: "\u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0645\u0639\u0631\u0641\u0627\u062A \u0627\u0644\u0639\u0648\u0627\u0626\u0644 \u0645\u0635\u0641\u0648\u0641\u0629" });
      }
      const recipients = [];
      for (const familyId of familyIds) {
        const recipientData = {
          voucherId,
          familyId,
          status: "pending"
        };
        const recipient = await storage.createVoucherRecipient(recipientData);
        recipients.push(recipient);
      }
      res.status(201).json(recipients);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.post("/api/support-vouchers/:id/notify", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "root"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const voucherId = parseInt(req.params.id);
      const { recipientIds } = req.body;
      const voucher = await storage.getSupportVoucher(voucherId);
      if (!voucher) {
        return res.status(404).json({ message: "\u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      const recipients = await storage.getVoucherRecipients(voucherId);
      const targetRecipients = recipientIds ? recipients.filter((r) => recipientIds.includes(r.id)) : recipients;
      for (const recipient of targetRecipients) {
        let message = `\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0643\u0648\u0628\u0648\u0646\u0629 \u062F\u0639\u0645 \u0627\u0644\u0649 \u0639\u0627\u0626\u0644\u062A\u0643 "${voucher.title}". \u064A\u0631\u062C\u0649 \u0627\u0644\u0630\u0647\u0627\u0628 \u0627\u0644\u0649 \u0645\u0643\u0627\u0646 \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0643\u0648\u0628\u0648\u0646\u0629.`;
        if (voucher.location) {
          message += `

\u0645\u0648\u0642\u0639 \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645: ${voucher.location}`;
        }
        const notification = {
          title: `\u0643\u0648\u0628\u0648\u0646\u0629 \u062F\u0639\u0645 \u062C\u062F\u064A\u062F: ${voucher.title}`,
          message,
          target: "specific",
          recipients: [recipient.familyId]
        };
        await storage.createNotification(notification);
        await storage.updateVoucherRecipient(recipient.id, {
          notified: true,
          notifiedAt: /* @__PURE__ */ new Date(),
          updatedBy: req.user.id
        });
      }
      res.json({ message: `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 ${targetRecipients.length} \u0625\u0634\u0639\u0627\u0631` });
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.patch("/api/voucher-recipients/:id", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "root"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const recipientId = parseInt(req.params.id);
      const { status, notes } = req.body;
      const updateData = { updatedBy: req.user.id };
      if (status) updateData.status = status;
      if (notes !== void 0) updateData.notes = notes;
      const recipient = await storage.updateVoucherRecipient(recipientId, updateData);
      if (!recipient) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      res.json(recipient);
    } catch (error) {
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// netlify/functions/api.ts
import cors2 from "cors";
import serverless from "serverless-http";
var app = express();
app.use(cors2({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      console.log(logLine);
    }
  });
  next();
});
var serverInitialized = false;
var serverPromise;
var initializeServer = async () => {
  if (!serverInitialized) {
    serverPromise = registerRoutes(app);
    serverInitialized = true;
  }
  return serverPromise;
};
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});
var handler = async (event, context) => {
  await initializeServer();
  const serverlessHandler = serverless(app);
  return serverlessHandler(event, context);
};
export {
  handler
};
