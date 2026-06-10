import { PERMISSION_RULES } from './rules';
import { ROLE_HIERARCHY } from './types';
import type { Role, Resource, Action, AuthUser } from './types';

interface CheckContext {
  /** The pool being accessed (if applicable) */
  poolId?: string;
  /** The resource owner ID (for "owns_resource" checks) */
  resourceOwnerId?: string;
  /** The user's status in the pool */
  memberStatus?: 'alive' | 'redemption' | 'eliminated' | 'won';
}

/**
 * Check if a user has permission to perform an action on a resource.
 */
export function hasPermission(
  user: AuthUser | null,
  resource: Resource,
  action: Action,
  context?: CheckContext
): boolean {
  // Unauthenticated users are treated as viewers
  const role: Role = user?.role ?? 'viewer';
  const roleLevel = ROLE_HIERARCHY[role];

  // Find matching rules for this resource + action
  const rules = PERMISSION_RULES.filter(
    (r) => r.resource === resource && r.action === action
  );

  if (rules.length === 0) {
    // No rule defined → deny by default
    return false;
  }

  // User must satisfy at least one matching rule
  return rules.some((rule) => {
    // Check role level
    if (roleLevel < ROLE_HIERARCHY[rule.minRole]) {
      return false;
    }

    // Check condition if present
    if (rule.condition && user) {
      switch (rule.condition) {
        case 'is_pool_member':
          return context?.poolId
            ? user.poolMemberships.includes(context.poolId)
            : user.poolMemberships.length > 0;

        case 'is_pool_creator':
          return context?.poolId
            ? user.createdPools.includes(context.poolId)
            : false;

        case 'is_alive':
          return context?.memberStatus === 'alive';

        case 'is_redemption':
          return context?.memberStatus === 'redemption';

        case 'owns_resource':
          return context?.resourceOwnerId === user.id;

        default:
          return false;
      }
    }

    return true;
  });
}

/**
 * Check if user can visit a page (read permission on the resource).
 */
export function canVisitPage(
  user: AuthUser | null,
  resource: Resource,
  context?: CheckContext
): boolean {
  return hasPermission(user, resource, 'read', context);
}

/**
 * Get all actions a user can perform on a resource.
 */
export function getAllowedActions(
  user: AuthUser | null,
  resource: Resource,
  context?: CheckContext
): Action[] {
  const actions: Action[] = ['read', 'create', 'update', 'delete', 'join', 'leave', 'lock_pick', 'enter_result'];
  return actions.filter((action) => hasPermission(user, resource, action, context));
}
