/**
 * System Roles Definition
 * 
 * Supports immediate CUSTOMER and ADMIN roles, while structuring role permissions
 * cleanly so future roles (SUPER_ADMIN, VISA_OPERATOR, APPLICATION_OPERATOR, FINANCE, SUPPORT)
 * plug in seamlessly without architectural refactoring.
 */

export const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  // Future roles prepared for granular role-based access control
  SUPER_ADMIN: 'SUPER_ADMIN',
  VISA_OPERATOR: 'VISA_OPERATOR',
  APPLICATION_OPERATOR: 'APPLICATION_OPERATOR',
  FINANCE: 'FINANCE',
  SUPPORT: 'SUPPORT'
});

export const ROLE_HIERARCHY = Object.freeze({
  [ROLES.SUPER_ADMIN]: [
    ROLES.ADMIN,
    ROLES.VISA_OPERATOR,
    ROLES.APPLICATION_OPERATOR,
    ROLES.FINANCE,
    ROLES.SUPPORT,
    ROLES.CUSTOMER
  ],
  [ROLES.ADMIN]: [
    ROLES.VISA_OPERATOR,
    ROLES.APPLICATION_OPERATOR,
    ROLES.FINANCE,
    ROLES.SUPPORT,
    ROLES.CUSTOMER
  ],
  [ROLES.VISA_OPERATOR]: [ROLES.CUSTOMER],
  [ROLES.APPLICATION_OPERATOR]: [ROLES.CUSTOMER],
  [ROLES.FINANCE]: [ROLES.CUSTOMER],
  [ROLES.SUPPORT]: [ROLES.CUSTOMER],
  [ROLES.CUSTOMER]: []
});

/**
 * Check if a user's role has permission to access a required role
 */
export function hasRole(userRole, requiredRole) {
  if (userRole === requiredRole) return true;
  const inherited = ROLE_HIERARCHY[userRole] || [];
  return inherited.includes(requiredRole);
}

export default ROLES;
