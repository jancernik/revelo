import { RevokedTokensTable } from "#src/database/schema.js"
import BaseModel from "#src/models/BaseModel.js"

class RevokedToken extends BaseModel {
  constructor() {
    super(RevokedTokensTable)
  }
}

export default new RevokedToken()
