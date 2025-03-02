import { BaseModel } from "./BaseModel.js";
import { RevokedTokensTable } from "../drizzle/schema.js";

export class RevokedToken extends BaseModel {
  constructor() {
    super(RevokedTokensTable);
  }
}

export default new RevokedToken();
