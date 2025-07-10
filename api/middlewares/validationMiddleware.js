import { ValidationError } from "../errors.js";

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error.errors) {
        const errorMessage = error.errors.map((err) => err.message).join(", ");
        throw new ValidationError(errorMessage, { data: error.errors });
      }
      throw error;
    }
  };
};
