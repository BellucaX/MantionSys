const { ZodError } = require('zod');

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On failure → 422 Unprocessable Entity with field-level errors.
 *
 * @param {import('zod').ZodTypeAny} schema
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Zod v4 uses .issues; v3 uses .errors — support both
      const issues = result.error.issues ?? result.error.errors ?? [];
      const errors = issues.map((e) => ({
        field: e.path.join('.') || 'body',
        message: e.message,
      }));
      return res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Validation failed',
        errors,
      });
    }
    // Replace req.body with the parsed (and coerced) data
    req.body = result.data;
    return next();
  };
}

module.exports = { validate };
