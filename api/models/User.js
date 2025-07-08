import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { UserTables } from "../drizzle/schema.js";
import BaseModel from "./BaseModel.js";

class User extends BaseModel {
  constructor() {
    super(UserTables);
  }

  async create(data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return await super.create(data);
  }

  async findByEmail(email) {
    return await this.find(eq(this.table.email, email));
  }

  async findByUsername(username) {
    return await this.find(eq(this.table.username, username));
  }

  async markEmailVerified(id) {
    return await this.update(id, {
      emailVerified: true,
      emailVerifiedAt: new Date()
    });
  }

  async update(id, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return await super.update(id, data);
  }

  async verifyPassword(user, password) {
    if (!user || !user.password) {
      return false;
    }

    return await bcrypt.compare(password, user.password);
  }
}

export default new User();
