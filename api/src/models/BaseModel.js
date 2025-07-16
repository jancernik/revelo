import { count, eq, sql } from "drizzle-orm"

import { db } from "../database.js"

export default class BaseModel {
  constructor(table) {
    this.table = table
    this.db = db
  }

  async count(where) {
    const result = await this.db.select({ count: count() }).from(this.table).where(where)

    return parseInt(result[0].count, 10)
  }

  async create(data) {
    const results = await this.db.insert(this.table).values(data).returning()

    return results[0] || null
  }

  async delete(id) {
    const results = await this.db.delete(this.table).where(eq(this.table.id, id)).returning()

    return results[0] || null
  }

  async find(where) {
    const results = await this.db.select().from(this.table).where(where).limit(1)

    return results[0] || null
  }

  async findAll(options = {}) {
    const { limit, offset, orderBy, where } = options

    let query = this.db.select().from(this.table)

    if (where) {
      query = query.where(where)
    }

    if (orderBy) {
      query = query.orderBy(orderBy)
    }

    if (limit) {
      query = query.limit(limit)
    }

    if (offset) {
      query = query.offset(offset)
    }

    return await query
  }

  async findById(id) {
    const results = await this.db.select().from(this.table).where(eq(this.table.id, id)).limit(1)

    return results[0] || null
  }

  async update(id, data) {
    const results = await this.db
      .update(this.table)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(this.table.id, id))
      .returning()

    return results[0] || null
  }
}
