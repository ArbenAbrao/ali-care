const { ZodError } = require("zod");
const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (e) {
      if (e instanceof ZodError)
        return res
          .status(400)
          .json({
            error: "Validation failed",
            details: e.issues.map((x) => ({
              path: x.path.join("."),
              message: x.message,
            })),
          });
      next(e);
    }
  };
module.exports = { validate };
