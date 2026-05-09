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

## 5. Wat staat er nog op de planning

- **Image upload voor tracks** (admin + owner). Komt in een volgende stap;
  rol-afhankelijke knoppen worden in de UI verstopt voor moderator en
  Storage-policies dwingen het server-side af.
- **User management UI** voor de owner (rollen wijzigen, accounts
  toevoegen/verwijderen) — voor nu via Supabase dashboard.
- **Steam-registratie** als iedere driver later z'n eigen account krijgt.
