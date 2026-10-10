import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Full name cannot be empty',
    'string.min': 'Name must be at least 2 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  phone: Joi.string().trim().allow('').optional(),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'any.required': 'Password is required'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).optional().messages({
    'any.only': 'Passwords do not match'
  }),
  nationality: Joi.string().trim().default('Indian')
  // Note: 'role' is intentionally omitted to prevent role escalation on registration
}).options({ stripUnknown: true });

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const googleAuthSchema = Joi.object({
  idToken: Joi.string().trim().optional(),
  credential: Joi.string().trim().optional()
}).or('idToken', 'credential').messages({
  'object.missing': 'Google ID token (idToken or credential) is required'
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().allow('').optional()
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  firstName: Joi.string().trim().allow('').max(50).optional(),
  lastName: Joi.string().trim().allow('').max(50).optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  phone: Joi.string().trim().allow('').optional(),
  nationality: Joi.string().trim().allow('').optional(),
  countryOfResidence: Joi.string().trim().allow('').optional(),
  passportNumber: Joi.string().trim().allow('').uppercase().optional()
}).options({ stripUnknown: true });

export const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().required().messages({
    'any.required': 'Verification token is required',
    'string.empty': 'Verification token cannot be empty'
  })
});

export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().required().messages({
    'any.required': 'Reset token is required',
    'string.empty': 'Reset token cannot be empty'
  }),
  newPassword: Joi.string().min(8).max(128).required().messages({
    'string.min': 'New password must be at least 8 characters long',
    'any.required': 'New password is required'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).optional().messages({
    'any.only': 'Passwords do not match'
  })
}).options({ stripUnknown: true });

export default {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  refreshTokenSchema,
  updateProfileSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
