import { ValidationError } from "../errors.js";

export const validate = (schemas) => {
  return (req, res, next) => {
    const errors = [];
    const validated = {};

    for (const [key, schema] of Object.entries(schemas)) {
      const target = req[key];
      const result = schema.safeParse(target);

      if (result.success) {
        validated[key] = result.data;
      } else {
        errors.push(...result.error.issues);
      }
    }

    if (errors.length > 0) {
      const message = errors.map((error) => error.message).join(", ");
      return next(new ValidationError(message, { data: { validation: errors } }));
    }

    for (const [key, data] of Object.entries(validated)) {
      if (key === "query") {
        req.parsedQuery = data;
      } else {
        req[key] = data;
      }
    }

    next();
  };
};
