import { ApiError } from '../utils/ApiError.js';

/**
 * Zod validation middleware.
 * Validates body, query and params against schemas and replaces them
 * with the parsed (typed + sanitized) output.
 */
export const validate = (schemas) => (req, _res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.query = schemas.query.parse(req.query);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    next();
  } catch (err) {
    if (err.name === 'ZodError') {
      const details = err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    next(err);
  }
};
