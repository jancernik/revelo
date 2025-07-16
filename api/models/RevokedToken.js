import { RevokedTokensTable } from "../drizzle/schema.js"
import BaseModel from "./BaseModel.js"

class RevokedToken extends BaseModel {
  constructor() {
    super(RevokedTokensTable)
  }
}

export default new RevokedToken()
