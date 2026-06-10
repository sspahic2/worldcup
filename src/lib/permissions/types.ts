/**
 * Role-based access control types.
 *
 * Roles are hierarchical: admin > pool_admin > player > viewer
 * Each role inherits all permissions from roles below it.
 */

export type Role = 'admin' | 'pool_admin' | 'player' | 'viewer';

export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  player: 1,
  pool_admin: 2,
  admin: 3,
};

/**
 * Resources that can be accessed.
 */
export type Resource =
  | 'landing'
  | 'dashboard'
  | 'pick'
  | 'bracket'
  | 'leaderboard'
  | 'profile'
  | 'pools'
  | 'admin'
  | 'redemption';

/**
 * CRUD + custom actions.
 */
export type Action = 'read' | 'create' | 'update' | 'delete' | 'join' | 'leave' | 'lock_pick' | 'enter_result';

/**
 * A permission entry: which role can do what on which resource.
 */
export interface PermissionRule {
  resource: Resource;
  action: Action;
  minRole: Role;
  /** Optional: must also satisfy a condition (e.g. "is pool member") */
  condition?: 'is_pool_member' | 'is_pool_creator' | 'is_alive' | 'is_redemption' | 'owns_resource';
}

/**
 * The authenticated user with their role and memberships.
 */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  /** Pool IDs the user is a member of */
  poolMemberships: string[];
  /** Pool IDs the user created */
  createdPools: string[];
}
