import crypto from "crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";

import { EmailVerificationTokensTable } from "../drizzle/schema.js";
import { BaseModel } from "./BaseModel.js";

export class EmailVerificationToken extends BaseModel {
  constructor() {
    super(EmailVerificationTokensTable);
  }

  async createToken(userId, email) {
    await this.db
      .delete(this.table)
      .where(and(eq(this.table.userId, userId), eq(this.table.used, false)));

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const results = await this.db
      .insert(this.table)
      .values({
        email,
        expiresAt,
        token,
        userId
      })
      .returning();

    return results[0] || null;
  }

  async deleteExpiredTokens() {
    return await this.db.delete(this.table).where(lt(this.table.expiresAt, new Date()));
  }

  async findValidToken(token) {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.token, token),
          eq(this.table.used, false),
          gt(this.table.expiresAt, new Date())
        )
      )
      .limit(1);
    return results[0] || null;
  }

  async markTokenUsed(token) {
    return await this.db
      .update(this.table)
      .set({ updatedAt: sql`now()`, used: true })
      .where(eq(this.table.token, token));
  }
}

export default new EmailVerificationToken();
