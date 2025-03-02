import { BaseModel } from "./BaseModel.js";
import { ImagesTable } from "../drizzle/schema.js";

export class Image extends BaseModel {
  constructor() {
    super(ImagesTable);
  }
}

export default new Image();
