import type { PermissionRule } from './types';

/**
 * Permission rules matrix.
 *
 * Each rule defines the minimum role and optional conditions
 * required to perform an action on a resource.
 */
export const PERMISSION_RULES: PermissionRule[] = [
  // ── Landing (public) ────────────────────────────────
  { resource: 'landing', action: 'read', minRole: 'viewer' },

  // ── Dashboard ───────────────────────────────────────
  { resource: 'dashboard', action: 'read', minRole: 'player', condition: 'is_pool_member' },

  // ── Pick ────────────────────────────────────────────
  { resource: 'pick', action: 'read', minRole: 'player', condition: 'is_pool_member' },
  { resource: 'pick', action: 'lock_pick', minRole: 'player', condition: 'is_alive' },

  // ── Bracket ─────────────────────────────────────────
  { resource: 'bracket', action: 'read', minRole: 'player', condition: 'is_pool_member' },

  // ── Leaderboard ─────────────────────────────────────
  { resource: 'leaderboard', action: 'read', minRole: 'player', condition: 'is_pool_member' },

  // ── Redemption ──────────────────────────────────────
  { resource: 'redemption', action: 'read', minRole: 'player', condition: 'is_redemption' },
  { resource: 'redemption', action: 'lock_pick', minRole: 'player', condition: 'is_redemption' },

  // ── Profile ─────────────────────────────────────────
  { resource: 'profile', action: 'read', minRole: 'player' },
  { resource: 'profile', action: 'update', minRole: 'player', condition: 'owns_resource' },

  // ── Pools ───────────────────────────────────────────
  { resource: 'pools', action: 'read', minRole: 'viewer' },
  { resource: 'pools', action: 'create', minRole: 'player' },
  { resource: 'pools', action: 'join', minRole: 'player' },
  { resource: 'pools', action: 'leave', minRole: 'player', condition: 'is_pool_member' },
  { resource: 'pools', action: 'update', minRole: 'pool_admin', condition: 'is_pool_creator' },
  { resource: 'pools', action: 'delete', minRole: 'pool_admin', condition: 'is_pool_creator' },

  // ── Admin ───────────────────────────────────────────
  { resource: 'admin', action: 'read', minRole: 'admin' },
  { resource: 'admin', action: 'enter_result', minRole: 'admin' },
  { resource: 'admin', action: 'update', minRole: 'admin' },
  { resource: 'admin', action: 'delete', minRole: 'admin' },
];
