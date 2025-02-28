import { BaseModel } from "./BaseModel.js";
import { RevokedTokenTable } from "../drizzle/schema.js";

export class RevokedToken extends BaseModel {
  constructor() {
    super(RevokedTokenTable);
  }
}

export default new RevokedToken();
