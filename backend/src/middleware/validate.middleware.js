import { ApiError } from '../utils/apiError.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const dataToValidate = req[source];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));
      return next(ApiError.badRequest('Validation error', errorDetails));
    }

    // Replace request with sanitized & validated data
    req[source] = value;
    next();
  };
}

export default validate;
