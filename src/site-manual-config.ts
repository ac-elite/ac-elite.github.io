import type { TeamRoles } from 'src/lib/team-roles';

/**
 * Handmatige site-instellingen op één plek (niet via KMR/FTP-sync).
 * — Steam-GUIDs per rol (zelfde strings als in rank.json)
 * — Client-side preview-wachtwoorden (zichtbaar in bundle; geen echte security)
 */
export const SITE_TEAM_ROLES: TeamRoles = {
  creator: [
    '76561198025621442', // DIEnamic
    '76561198212710700', // Stella
  ],
  admin: [
    '76561198025621442', // DIEnamic
    '76561198273504643', // Alexander
    '76561198328304798', // CarterReza
    '76561198828350593', // Grimlord
    '76561199664649696', // olalekezion810
    '76561199067031859', // Saba
    '76561198212710700', // Stella
  ],
  moderator: [
    '76561199696427326', // archera
    '76561197986606289', // Chaloem
    '76561197995833363', // MK-Ultra Racer
    '76561198275276823', // Pedro Muela
    '76561198328746047', // Spacelab
    '76561198834200084', // sparky
  ],
};

/** Alleen vlag in storage; wachtwoord zelf wordt niet opgeslagen (zie PreviewLock). */
export const SITE_PREVIEW = {
  adminPanel: {
    password: 'acelite-mod-team',
    storageKey: 'acelite-preview-admin-panel',
  },
  setupStore: {
    password: 'acelite-setup-store',
    storageKey: 'acelite-preview-setup-store',
  },
} as const;
