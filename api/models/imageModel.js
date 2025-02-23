import { BaseModel } from "./baseModel.js";
import { ImageTable } from "../drizzle/schema.js";

export class ImageModel extends BaseModel {
  constructor() {
    super(ImageTable);
  }
}
