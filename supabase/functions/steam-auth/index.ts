/**
 * AC Elite — steam-auth
 * ============================================================================
 * Turns a verified Steam OpenID 2.0 response into a Supabase session.
 *
 * Supabase Auth has no native Steam provider (Steam is legacy OpenID 2.0), so
 * this function is the server-side half of the login:
 *
 *   1. The SPA sends the user to Steam's OpenID login page.
 *   2. Steam redirects back to the SPA with `openid.*` params.
 *   3. The SPA POSTs those params here.
 *   4. We re-validate them with Steam (`check_authentication`) to prevent
 *      forgery, read the SteamID64, look up the player's name/avatar, find or
 *      create a Supabase user keyed to the SteamID, set their role from
 *      `staff_roles` (else `driver`), and return a one-time OTP the SPA
 *      exchanges for a real session via `auth.verifyOtp`.
 *
 * IMPORTANT (Supabase free plan): we use `auth.admin.generateLink` which only
 * *mints* a token — it never sends an email. Do NOT switch to `signInWithOtp`,
 * which would send mail and is hard rate-limited on the free plan.
 *
 * `verify_jwt = false` (see supabase/config.toml) — this is the login entry
 * point, so there is no JWT yet.
 *
 * Required env (Supabase project secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   STEAM_API_KEY            (https://steamcommunity.com/dev/apikey)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Synthetic email domain — Supabase needs an email, Steam users never have one.
 *  No mail is ever sent here. Mirrors the `ac-elite.local` convention used by
 *  the username/password admin accounts. */
const STEAM_EMAIL_DOMAIN = 'steam.ac-elite.local';

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const CLAIMED_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number, code?: string): Response {
  return jsonResponse({ error: message, ...(code ? { code } : {}) }, status);
}

// ---------------------------------------------------------------------------
// Steam OpenID verification
// ---------------------------------------------------------------------------

/**
 * Re-post the OpenID params back to Steam with `mode=check_authentication`.
 * Steam answers `is_valid:true` only if it really issued this assertion, which
 * is what stops a caller from forging someone else's SteamID.
 */
async function verifyWithSteam(params: Record<string, string>): Promise<boolean> {
  const body = new URLSearchParams(params);
  body.set('openid.mode', 'check_authentication');

  const res = await fetch(STEAM_OPENID_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) return false;
  const text = await res.text();
  return /is_valid\s*:\s*true/i.test(text);
}

function extractSteamId(claimedId: unknown): string | null {
  if (typeof claimedId !== 'string') return null;
  const match = claimedId.match(CLAIMED_ID_RE);
  return match ? match[1] : null;
}

type SteamPlayer = { personaName: string; avatarUrl: string | null };

async function fetchSteamPlayer(steamId: string, apiKey: string): Promise<SteamPlayer> {
  const url =
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/` +
    `?key=${encodeURIComponent(apiKey)}&steamids=${encodeURIComponent(steamId)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { personaName: steamId, avatarUrl: null };
    const json = (await res.json()) as {
      response?: { players?: Array<{ personaname?: string; avatarfull?: string }> };
    };
    const player = json.response?.players?.[0];
    return {
      personaName: player?.personaname?.trim() || steamId,
      avatarUrl: player?.avatarfull ?? null,
    };
  } catch {
    // Steam API hiccup shouldn't block login — fall back to the bare SteamID.
    return { personaName: steamId, avatarUrl: null };
  }
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

type AppRole = 'owner' | 'admin' | 'moderator' | 'driver';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return errorResponse('Method Not Allowed', 405, 'method');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const steamApiKey = Deno.env.get('STEAM_API_KEY');
  if (!supabaseUrl || !serviceKey) {
    return errorResponse('Supabase env missing (URL/SERVICE_ROLE_KEY)', 500, 'env');
  }
  if (!steamApiKey) {
    return errorResponse('STEAM_API_KEY secret is not set', 500, 'steam-env');
  }

  // 1. Parse the openid.* params the SPA captured from Steam's redirect. -------
  let params: Record<string, string>;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    params = {};
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith('openid.') && typeof value === 'string') params[key] = value;
    }
  } catch {
    return errorResponse('Invalid JSON body', 400, 'bad-body');
  }
  if (Object.keys(params).length === 0) {
    return errorResponse('No openid.* params supplied', 400, 'no-openid');
  }

  // 2. Make sure the SteamID is real and was actually issued by Steam. ---------
  const steamId = extractSteamId(params['openid.claimed_id']);
  if (!steamId) {
    return errorResponse('claimed_id is not a Steam identity', 400, 'bad-claimed-id');
  }
  const valid = await verifyWithSteam(params);
  if (!valid) {
    return errorResponse('Steam rejected this assertion', 401, 'steam-invalid');
  }

  // 3. Player profile (name + avatar) for the chip. ---------------------------
  const player = await fetchSteamPlayer(steamId, steamApiKey);
  const email = `${steamId}@${STEAM_EMAIL_DOMAIN}`;

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Authoritative role: staff mapping wins, everyone else is a driver. ------
  const { data: staffRow } = await service
    .from('staff_roles')
    .select('role')
    .eq('steam_id', steamId)
    .maybeSingle();
  const role: AppRole = (staffRow?.role as AppRole) ?? 'driver';

  // 5. Find-or-create the auth user keyed to this SteamID. `createUser` is a
  //    no-op (errors harmlessly) if they already exist; `generateLink` then
  //    hands us back the canonical user object either way.
  await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { steam_id: steamId, display_name: player.personaName },
  });

  const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData?.user) {
    return errorResponse(`Could not mint session: ${linkErr?.message ?? 'no user'}`, 500, 'link');
  }

  // 6. Upsert the profile with the resolved role + fresh Steam details. --------
  const { error: profileErr } = await service
    .from('profiles')
    .upsert(
      {
        id: linkData.user.id,
        role,
        steam_id: steamId,
        display_name: player.personaName,
        avatar_url: player.avatarUrl,
      },
      { onConflict: 'id' }
    );
  if (profileErr) {
    return errorResponse(`Profile upsert failed: ${profileErr.message}`, 500, 'profile');
  }

  // 7. Return the one-time OTP the SPA exchanges via `auth.verifyOtp`. The
  //    email is synthetic and never receives mail.
  return jsonResponse({
    ok: true,
    email,
    otp: linkData.properties?.email_otp ?? null,
    token_hash: linkData.properties?.hashed_token ?? null,
    steam_id: steamId,
    display_name: player.personaName,
    role,
  });
});
