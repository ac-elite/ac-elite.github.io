# Admin auth — eerste setup

Korte gids om de drie premade accounts (owner / admin / moderator) klaar
te zetten in Supabase. Alleen nodig bij de allereerste keer.

---

## 1. Migratie draaien

In het Supabase dashboard:

1. **SQL Editor** → **New query**
2. Plak de inhoud van
   [`supabase/migrations/20260509_auth_profiles.sql`](../supabase/migrations/20260509_auth_profiles.sql)
3. Klik **Run**.

Dit maakt:
- het `app_role` enum (`owner`, `admin`, `moderator`)
- de tabel `public.profiles`
- een trigger die voor elke nieuwe `auth.users` automatisch een `profiles`-rij maakt
- RLS-policies zodat alleen de owner rollen kan wijzigen

---

## 2. Drie accounts aanmaken

Het team logt in met **alleen username + wachtwoord**. Achter de schermen
plakt de site er `@ac-elite.local` achter zodat Supabase Auth blij is —
dat domein bestaat niet, er wordt nooit mail naartoe verstuurd. **Belangrijk:**
de drie usernames zijn vast: `owner`, `admin`, `moderator`. De code zoekt
exact die waarden; verzin geen andere namen.

In het Supabase dashboard:

1. **Authentication → Users → Add user → Create new user**
2. Vul e-mail (volledig, mét `@ac-elite.local`) + wachtwoord in en zet
   **Auto Confirm User** aan (anders kan het account niet inloggen).
3. Herhaal voor alle drie:

   | E-mail in Supabase          | Username (op login)| Rol       |
   | --------------------------- | ------------------ | --------- |
   | `owner@ac-elite.local`      | `owner`            | owner     |
   | `admin@ac-elite.local`      | `admin`            | admin     |
   | `moderator@ac-elite.local`  | `moderator`        | moderator |

   Wachtwoorden kies je zelf — sterk genoeg en deel ze 1Password-style.

---

## 3. Rollen toewijzen

Standaard krijgt elke nieuwe gebruiker rol `moderator`. Werk de owner en
admin bij via **SQL Editor**:

```sql
update public.profiles
   set role = 'owner'
 where id = (select id from auth.users where email = 'owner@ac-elite.local');

update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'admin@ac-elite.local');

-- moderator-account staat al goed; alleen voor de zekerheid:
update public.profiles
   set role = 'moderator'
 where id = (select id from auth.users where email = 'moderator@ac-elite.local');
```

Controleer met:

```sql
select u.email, p.role, p.display_name
  from public.profiles p
  join auth.users u on u.id = p.id
 order by p.role;
```

---

## 4. Lokaal testen

1. Zorg dat `.env` in de project-root deze regels heeft:
   ```env
   VITE_SUPABASE_URL=https://<jouw-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon of publishable key>
   ```
2. `npm install` → `npm run dev`
3. Open <http://localhost:3039/admin> → je wordt naar `/login` gestuurd.
4. Log in met één van de drie accounts.

Wat je verwacht te zien:
- **owner / admin / moderator** kunnen het admin panel allemaal openen.
- De gekleurde "role" chip bovenaan toont welke rol je hebt.
- "Sign out" gooit je weer naar de login.

---

## 5. Steam-login (iedere driver z'n eigen account)

Naast de drie backup-accounts hierboven kan **iedereen inloggen via Steam**.
Je SteamID64 ís je account; je rol komt uit de staff-mapping (anders ben je
`driver`). De drie username/wachtwoord-accounts blijven bestaan als backup.

### 5.1 Migratie draaien

Plak en **Run** in de SQL Editor:
[`supabase/migrations/20260604_steam_auth.sql`](../supabase/migrations/20260604_steam_auth.sql).

Dit voegt toe: de rol `driver`, de kolommen `steam_id` / `avatar_url` op
`profiles`, en de tabel `staff_roles` (SteamID64 → rol), geseed uit
`SITE_TEAM_ROLES`.

### 5.2 Edge function + secret

```bash
supabase functions deploy steam-auth
supabase secrets set STEAM_API_KEY=<jouw-steam-web-api-key>
```

De Steam Web API key haal je (gratis) op via
<https://steamcommunity.com/dev/apikey> — vul als domein je site-domein in
(bv. `ac-elite.github.io`). **Zet de key alleen als secret, nooit in de repo.**

> De functie gebruikt bewust `auth.admin.generateLink` (mint alleen een token,
> verstuurt géén mail) i.p.v. `signInWithOtp` — dat laatste is op de Supabase
> free plan hard gerate-limit.

### 5.3 Rollen koppelen aan SteamID's

De server-side bron is de tabel `public.staff_roles`. Die is geseed uit
`src/site-manual-config.ts` (`SITE_TEAM_ROLES`: creator→`owner`, admin→`admin`,
moderator→`moderator`). **Belangrijk:** dat zijn twee plekken die je
synchroon houdt:

- `SITE_TEAM_ROLES` (TS) → de gekleurde rol-chips op de publieke driver-pages.
- `staff_roles` (DB) → de rol die je krijgt bij het inloggen (RLS / edge-checks).

Wijzig je iemands rol, werk dan beide bij. Voor de DB:

```sql
insert into public.staff_roles (steam_id, role, note)
values ('7656119xxxxxxxxxx', 'admin', 'Naam')
on conflict (steam_id) do update set role = excluded.role, note = excluded.note;
```

Je eigen SteamID64 vind je via <https://steamid.io> of in `rank.json` — het is
dezelfde 17-cijferige GUID die ook op je driver-page in de URL staat
(`/driver/<steamid>`).

### 5.4 Wat je verwacht te zien

- **Staff** (in `staff_roles`): chip met je Steam-naam in je rolkleur; admin
  panel toegankelijk.
- **Driver** (niet in `staff_roles`): neutrale (grijze) chip met je Steam-naam;
  admin panel blokkeert.
- De chip is klikbaar → je eigen driver-page.

---

## 6. Wat staat er nog op de planning

- **Image upload voor tracks** (admin + owner). Komt in een volgende stap;
  rol-afhankelijke knoppen worden in de UI verstopt voor moderator en
  Storage-policies dwingen het server-side af.
- **User management UI** voor de owner (rollen wijzigen, accounts
  toevoegen/verwijderen) — voor nu via Supabase dashboard.
