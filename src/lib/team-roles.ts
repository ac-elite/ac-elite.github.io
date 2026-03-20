import type { DiscordRole } from './ac-elite-data';

export type TeamRoles = {
  creator: string[];
  admin: string[];
  moderator: string[];
};

/** Lowercase site role; null if not in team lists. */
export type TeamRole = 'creator' | 'admin' | 'moderator' | null;

export const EMPTY_TEAM_ROLES: TeamRoles = {
  creator: [],
  admin: [],
  moderator: [],
};

const PRIORITY: { list: keyof TeamRoles; discord: DiscordRole }[] = [
  { list: 'creator', discord: 'Creator' },
  { list: 'admin', discord: 'Admin' },
  { list: 'moderator', discord: 'Moderator' },
];

/** Single role for chips that show one badge (creator wins over admin over moderator). */
export function getTeamRole(guid: string, roles: TeamRoles): TeamRole {
  if (roles.creator.includes(guid)) return 'creator';
  if (roles.admin.includes(guid)) return 'admin';
  if (roles.moderator.includes(guid)) return 'moderator';
  return null;
}

export function teamRoleToDiscordRole(role: TeamRole): DiscordRole | null {
  if (!role) return null;
  return (role.charAt(0).toUpperCase() + role.slice(1)) as DiscordRole;
}

/** All Discord roles for a GUID (profile can show multiple chips). Order: Creator, Admin, Moderator. */
export function getDiscordRolesForGuid(guid: string, roles: TeamRoles): DiscordRole[] {
  const out: DiscordRole[] = [];
  for (const { list, discord } of PRIORITY) {
    if (roles[list].includes(guid)) out.push(discord);
  }
  return out;
}
