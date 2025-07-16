import { UserTables } from "#src/database/schema.js"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"

import BaseModel from "./BaseModel.js"

class User extends BaseModel {
  constructor() {
    super(UserTables)
  }

  async create(data) {
    const userData = { ...data }

    if (data.password) {
      userData.password = await bcrypt.hash(data.password, 10)
    }

    return await super.create(userData)
  }

  async findByEmail(email) {
    return await this.find(eq(this.table.email, email))
  }

  async findByUsername(username) {
    return await this.find(eq(this.table.username, username))
  }

  async markEmailVerified(id) {
    return await this.update(id, {
      emailVerified: true,
      emailVerifiedAt: new Date()
    })
  }

  async update(id, data) {
    const userData = { ...data }

    if (data.password) {
      userData.password = await bcrypt.hash(data.password, 10)
    }

    return await super.update(id, userData)
  }

  async verifyPassword(user, password) {
    if (!user || !user.password) {
      return false
    }

    return await bcrypt.compare(password, user.password)
  }
}

export default new User()

export const userSerializer = (user) => {
  if (!user) return null

  return {
    admin: user.admin,
    email: user.email,
    emailVerified: user.emailVerified,
    id: user.id,
    username: user.username
  }
}
