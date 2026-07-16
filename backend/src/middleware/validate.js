// Wraps a zod schema as Express middleware. On failure returns 400 with
// field-level errors instead of a stack trace, on success replaces req.body
// with the parsed (and coerced/defaulted) data.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
