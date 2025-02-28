import { BaseModel } from "./BaseModel.js";
import { ImageTable } from "../drizzle/schema.js";

export class Image extends BaseModel {
  constructor() {
    super(ImageTable);
  }
}

export default new Image();
