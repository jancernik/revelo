import { db } from "../db.js";

export class BaseModel {
  constructor(schema) {
    this.schema = schema;
  }

  async create(data) {
    return await db.insert(this.schema).values(data).returning();
  }

  async findAll() {
    return await db.select().from(this.schema);
  }

  async findById(id) {
    return await db.select().from(this.schema).where(this.schema.id.eq(id)).limit(1);
  }

  async update(id, data) {
    return await db.update(this.schema).set(data).where(this.schema.id.eq(id)).returning();
  }

  async delete(id) {
    return await db.delete(this.schema).where(this.schema.id.eq(id)).returning();
  }
}
