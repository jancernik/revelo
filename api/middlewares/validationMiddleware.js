import { ValidationError } from "../errors.js";

const validate = (targetProperty) => {
  return (schema) => {
    return (req, res, next) => {
      try {
        schema.parse(req[targetProperty]);
        next();
      } catch (error) {
        if (error.issues) {
          const issues = error.issues;
          const errorMessage = issues.map((err) => err.message).join(", ");
          const validationError = new ValidationError(errorMessage, { data: issues });
          return next(validationError);
        }
        next(error);
      }
    };
  };
};

export const validateBody = validate("body");
export const validateParams = validate("params");
export const validateQuery = validate("query");
