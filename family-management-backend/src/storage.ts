import { 
  users, families, wives, members, requests, notifications, documents, logs, settings, supportVouchers, voucherRecipients,
  type User, type InsertUser, type Family, type InsertFamily, type Wife, type InsertWife,
  type Member, type InsertMember, type Request, type InsertRequest,
  type Notification, type InsertNotification, type Document, type InsertDocument,
  type Log, type InsertLog, type Settings, type InsertSettings,
  type SupportVoucher, type InsertSupportVoucher, type VoucherRecipient, type InsertVoucherRecipient
} from "./schema.js";
import { db } from "./db";
import { eq, desc, and, sql, isNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByNationalId(nationalId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  restoreUser(id: number): Promise<boolean>;
  
  // Families
  getFamily(id: number): Promise<Family | undefined>;
  getFamilyByUserId(userId: number): Promise<Family | undefined>;
  createFamily(family: InsertFamily): Promise<Family>;
  updateFamily(id: number, family: Partial<InsertFamily>): Promise<Family | undefined>;
  getAllFamilies(): Promise<Family[]>;
  deleteFamily(id: number): Promise<boolean>;
  getFamiliesByUserId(userId: number): Promise<Family[]>;

  // Wives
  getWivesByFamilyId(familyId: number): Promise<Wife[]>;
  getWife(id: number): Promise<Wife | undefined>;
  createWife(wife: InsertWife): Promise<Wife>;
  updateWife(id: number, wife: Partial<InsertWife>): Promise<Wife | undefined>;
  deleteWife(id: number): Promise<boolean>;
  
  // Members
  getMembersByFamilyId(familyId: number): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, member: Partial<InsertMember>): Promise<Member | undefined>;
  deleteMember(id: number): Promise<boolean>;
  getMember(id: number): Promise<Member | undefined>;
 
  // Requests
  getRequestsByFamilyId(familyId: number): Promise<Request[]>;
  getAllRequests(): Promise<Request[]>;
  getRequest(id: number): Promise<Request | undefined>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequest(id: number, request: Partial<InsertRequest>): Promise<Request | undefined>;
  
  // Notifications
  getAllNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  
  // Documents
  getDocumentsByFamilyId(familyId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Logs
  getLogs(filter?: { type?: string; userId?: number; search?: string; limit?: number; offset?: number }): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
  
  // Settings
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string, description?: string): Promise<void>;
  getAllSettings(): Promise<Settings[]>;
  
  // Support Vouchers
  getAllSupportVouchers(): Promise<(SupportVoucher & { creator: User; recipients: VoucherRecipient[] })[]>;
  getSupportVoucher(id: number): Promise<SupportVoucher | undefined>;
  createSupportVoucher(voucher: InsertSupportVoucher): Promise<SupportVoucher>;
  updateSupportVoucher(id: number, voucher: Partial<InsertSupportVoucher>): Promise<SupportVoucher | undefined>;
  
  // Voucher Recipients
  getVoucherRecipients(voucherId: number): Promise<(VoucherRecipient & { family: Family })[]>;
  createVoucherRecipient(recipient: InsertVoucherRecipient): Promise<VoucherRecipient>;
  updateVoucherRecipient(id: number, recipient: Partial<InsertVoucherRecipient>): Promise<VoucherRecipient | undefined>;
  
  clearLogs(): Promise<void>;
  clearNotifications(): Promise<void>;
  clearRequests(): Promise<void>;
  clearMembers(): Promise<void>;
  clearFamilies(): Promise<void>;
  clearUsers(): Promise<void>;
  clearSettings(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
  }

  // Users
  async getUser(id: number, opts?: { includeDeleted?: boolean }): Promise<User | undefined> {
    const whereClause = opts?.includeDeleted
      ? eq(users.id, id)
      : and(eq(users.id, id), isNull(users.deletedAt));
    const [user] = await db.select().from(users).where(whereClause);
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.username, username), isNull(users.deletedAt)));
    return user || undefined;
  }

  async getUserByNationalId(nationalId: string): Promise<User | undefined> {
    const [family] = await db.select({ user: users }).from(families)
      .innerJoin(users, and(eq(families.userId, users.id), isNull(users.deletedAt)))
      .where(eq(families.husbandID, nationalId));
    return family?.user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updatedUser || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result?.rowCount ?? 0) > 0;
  }

  async getAllUsers(opts?: { includeDeleted?: boolean }): Promise<User[]> {
    if (opts?.includeDeleted) {
    return await db.select().from(users);
    }
    return await db.select().from(users).where(isNull(users.deletedAt));
  }

  async softDeleteUser(id: number): Promise<boolean> {
    const [user] = await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id)).returning();
    return !!user;
  }

  async restoreUser(id: number): Promise<boolean> {
    const [user] = await db.update(users).set({ deletedAt: null }).where(eq(users.id, id)).returning();
    return !!user;
  }

  // Families
  async getFamily(id: number): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.id, id));
    return family || undefined;
  }

  async getFamilyByUserId(userId: number): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.userId, userId));
    return family || undefined;
  }

  async createFamily(family: InsertFamily): Promise<Family> {
    const [createdFamily] = await db.insert(families).values(family).returning();
    return createdFamily;
  }

  async updateFamily(id: number, family: Partial<InsertFamily>): Promise<Family | undefined> {
    const [updatedFamily] = await db.update(families).set(family).where(eq(families.id, id)).returning();
    return updatedFamily || undefined;
  }

  async getAllFamilies(): Promise<Family[]> {
    return await db.select().from(families).orderBy(desc(families.createdAt));
  }

  async getAllFamiliesWithMembers(): Promise<(Family & { members: Member[] })[]> {
    const allFamilies = await this.getAllFamilies();
    const familiesWithMembers = await Promise.all(
      allFamilies.map(async (family) => {
        const members = await this.getMembersByFamilyId(family.id);
        return { ...family, members };
      })
    );
    return familiesWithMembers;
  }

  async deleteFamily(id: number): Promise<boolean> {
    // Delete all wives of the family
    await db.delete(wives).where(eq(wives.familyId, id));
    // Delete all members of the family
    await db.delete(members).where(eq(members.familyId, id));
    // Delete all requests of the family
    await db.delete(requests).where(eq(requests.familyId, id));
    // Delete all documents of the family
    await db.delete(documents).where(eq(documents.familyId, id));
    // Delete the family itself
    const result = await db.delete(families).where(eq(families.id, id));
    return (result?.rowCount ?? 0) > 0;
  }

  async getFamiliesByUserId(userId: number): Promise<Family[]> {
    return await db.select().from(families).where(eq(families.userId, userId));
  }

  // Wives
  async getWivesByFamilyId(familyId: number): Promise<Wife[]> {
    return await db.select().from(wives).where(eq(wives.familyId, familyId));
  }

  async getWife(id: number): Promise<Wife | undefined> {
    const [wife] = await db.select().from(wives).where(eq(wives.id, id));
    return wife || undefined;
  }

  async createWife(wife: InsertWife): Promise<Wife> {
    const [createdWife] = await db.insert(wives).values(wife).returning();
    return createdWife;
  }

  async updateWife(id: number, wife: Partial<InsertWife>): Promise<Wife | undefined> {
    const [updatedWife] = await db.update(wives).set(wife).where(eq(wives.id, id)).returning();
    return updatedWife || undefined;
  }

  async deleteWife(id: number): Promise<boolean> {
    const result = await db.delete(wives).where(eq(wives.id, id));
    return (result?.rowCount ?? 0) > 0;
  }

  // Members
  async getMembersByFamilyId(familyId: number): Promise<Member[]> {
    return await db.select().from(members).where(eq(members.familyId, familyId));
  }

  async getMember(id: number): Promise<Member | undefined> {
  const [member] = await db.select().from(members).where(eq(members.id, id));
  return member || undefined;
  }

  async createMember(member: InsertMember): Promise<Member> {
    const [createdMember] = await db.insert(members).values(member).returning();
    return createdMember;
  }

  async updateMember(id: number, member: Partial<InsertMember>): Promise<Member | undefined> {
    const [updatedMember] = await db.update(members).set(member).where(eq(members.id, id)).returning();
    return updatedMember || undefined;
  }

  async deleteMember(id: number): Promise<boolean> {
    const result = await db.delete(members).where(eq(members.id, id));
    return (result?.rowCount ?? 0) > 0;
  }

  // Requests
  async getRequestsByFamilyId(familyId: number): Promise<Request[]> {
    return await db.select().from(requests).where(eq(requests.familyId, familyId)).orderBy(desc(requests.createdAt));
  }

  async getAllRequests(): Promise<Request[]> {
    return await db.select().from(requests).orderBy(desc(requests.createdAt));
  }

  async getRequest(id: number): Promise<Request | undefined> {
    const [request] = await db.select().from(requests).where(eq(requests.id, id));
    return request || undefined;
  }

  async createRequest(request: InsertRequest): Promise<Request> {
    const [createdRequest] = await db.insert(requests).values(request).returning();
    return createdRequest;
  }

  async updateRequest(id: number, request: Partial<InsertRequest>): Promise<Request | undefined> {
    const [updatedRequest] = await db.update(requests).set({
      ...request,
      updatedAt: new Date()
    }).where(eq(requests.id, id)).returning();
    return updatedRequest || undefined;
  }

  // Notifications
  async getAllNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [createdNotification] = await db.insert(notifications).values(notification).returning();
    return createdNotification;
  }

  // Documents
  async getDocumentsByFamilyId(familyId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.familyId, familyId));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [createdDocument] = await db.insert(documents).values(document).returning();
    return createdDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return (result?.rowCount ?? 0) > 0;
  }

  // Logs
  async getLogs(filter: { type?: string; userId?: number; search?: string; limit?: number; offset?: number } = {}): Promise<Log[]> {
    let query = db.select().from(logs);
    if (filter.type) query = query.where(eq(logs.type, filter.type));
    if (filter.userId) query = query.where(eq(logs.userId, filter.userId));
    if (filter.search) query = query.where(sql`${logs.message} ILIKE '%' || ${filter.search} || '%'`);
    if (filter.limit) query = query.limit(filter.limit);
    if (filter.offset) query = query.offset(filter.offset);
    return await query.orderBy(desc(logs.createdAt));
  }
  async createLog(log: InsertLog): Promise<Log> {
    const [created] = await db.insert(logs).values(log).returning();
    return created;
  }

  // Settings
  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value || undefined;
  }

  async setSetting(key: string, value: string, description?: string): Promise<void> {
    await db.insert(settings).values({ key, value, description }).onConflictDoUpdate({
      target: settings.key,
      set: { value, description }
    });
  }

  async getAllSettings(): Promise<Settings[]> {
    return await db.select().from(settings);
  }

  // Support Vouchers
  async getAllSupportVouchers(): Promise<(SupportVoucher & { creator: User; recipients: VoucherRecipient[] })[]> {
    const vouchers = await db.select().from(supportVouchers).orderBy(desc(supportVouchers.createdAt));
    
    const vouchersWithDetails = await Promise.all(
      vouchers.map(async (voucher) => {
        const creator = await this.getUser(voucher.createdBy);
        const recipients = await this.getVoucherRecipients(voucher.id);
        return {
          ...voucher,
          creator: creator!,
          recipients
        };
      })
    );
    
    return vouchersWithDetails;
  }

  async getSupportVoucher(id: number): Promise<SupportVoucher | undefined> {
    const [supportVoucher] = await db.select().from(supportVouchers).where(eq(supportVouchers.id, id));
    return supportVoucher || undefined;
  }

  async createSupportVoucher(voucher: InsertSupportVoucher): Promise<SupportVoucher> {
    const [createdVoucher] = await db.insert(supportVouchers).values(voucher).returning();
    return createdVoucher;
  }

  async updateSupportVoucher(id: number, voucher: Partial<InsertSupportVoucher>): Promise<SupportVoucher | undefined> {
    const [updatedVoucher] = await db.update(supportVouchers).set(voucher).where(eq(supportVouchers.id, id)).returning();
    return updatedVoucher || undefined;
  }

  // Voucher Recipients
  async getVoucherRecipients(voucherId: number): Promise<(VoucherRecipient & { family: Family })[]> {
    const recipients = await db.select().from(voucherRecipients).where(eq(voucherRecipients.voucherId, voucherId));
    
    const recipientsWithFamilies = await Promise.all(
      recipients.map(async (recipient) => {
        const family = await this.getFamily(recipient.familyId);
        return {
          ...recipient,
          family: family!
        };
      })
    );
    
    return recipientsWithFamilies;
  }

  async createVoucherRecipient(recipient: InsertVoucherRecipient): Promise<VoucherRecipient> {
    const [createdRecipient] = await db.insert(voucherRecipients).values(recipient).returning();
    return createdRecipient;
  }

  async updateVoucherRecipient(id: number, recipient: Partial<InsertVoucherRecipient>): Promise<VoucherRecipient | undefined> {
    const [updatedRecipient] = await db.update(voucherRecipients).set(recipient).where(eq(voucherRecipients.id, id)).returning();
    return updatedRecipient || undefined;
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
}

export const storage = new DatabaseStorage();