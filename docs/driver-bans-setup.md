# Driver bans — eerste setup

Korte gids om de **Driver bans**-sectie in het admin panel werkend te krijgen.
Eenmalig nodig; daarna kun je via de site bannen / unbannen en gaat de FTP
direct mee.

---

## Hoe werkt het in een notendop

```
Admin panel  ──►  Supabase Edge Function (manage-blocklist)  ──►  AC server FTP
                       │                                           (blocklist.json)
                       └──► public.bans_audit (audit log)
```

- De browser stuurt het verzoek met de ingelogde JWT.
- De edge function checkt de rol in `public.profiles` (≥ moderator).
- De function logt in op de FTP, downloadt `blocklist.json`, past hem aan en
  schrijft hem **atomic** terug (`.tmp` → rename) zodat de AC server nooit
  een halve file ziet.
- Iedere ban / unban wordt geregistreerd in `public.bans_audit` (audit log).

---

## 1. Migratie draaien

In het Supabase dashboard:

1. **SQL Editor** → **New query**
2. Plak de inhoud van
   [`supabase/migrations/20260515_bans_audit.sql`](../supabase/migrations/20260515_bans_audit.sql)
3. Klik **Run**.

Dit maakt:
- het `ban_action` enum (`ban` | `unban`)
- de tabel `public.bans_audit`
- RLS-policy zodat alleen ingelogde staff (moderator/admin/owner) de history
  kan lezen — schrijven gebeurt alleen via de edge function (service role).

---

## 2. FTP-secrets in Supabase zetten

In het dashboard: **Project Settings → Edge Functions → Secrets**.

Voeg toe (zelfde host/user/wachtwoord als de bestaande GitHub-Action sync):

| Secret naam              | Waarde                                            |
| ------------------------ | ------------------------------------------------- |
| `FTP_HOST`               | host van de AC server FTP                         |
| `FTP_USER`               | FTP-gebruikersnaam                                |
| `FTP_PASS`               | FTP-wachtwoord                                    |
| `BLOCKLIST_REMOTE_PATH`  | _optional_ — default `blocklist.json` (FTP-root)  |
| `FTP_SECURE`             | _optional_ — `true` als je FTPS wilt              |

> `SUPABASE_URL`, `SUPABASE_ANON_KEY` en `SUPABASE_SERVICE_ROLE_KEY` staan al
> standaard op iedere Supabase-functie en hoef je hier niet zelf te zetten.

---

## 3. Edge function deployen

Vanaf je werkmachine, met de Supabase CLI gelinkt aan dit project:

```bash
supabase functions deploy manage-blocklist
```

De function staat in [`supabase/functions/manage-blocklist/index.ts`](../supabase/functions/manage-blocklist/index.ts).
`supabase/config.toml` heeft `verify_jwt = true` voor deze function — dat
betekent dat Supabase elk request **automatisch** afkeurt als er geen geldige
gebruikers-JWT bij zit. De function checkt dan alleen nog of die gebruiker rol
≥ moderator heeft.

---

## 4. Smoke-test

1. `npm run dev` → log in op `/admin` als owner / admin / moderator.
2. Scroll naar **Driver bans**. Je moet de huidige `blocklist.json`-inhoud
   zien (leeg = nog niemand gebanned, of het bestand bestaat nog niet — in
   dat geval maakt de function hem zelf aan zodra je iemand bant).
3. Klik **Ban driver**, vul een test-GUID in (bv. `999999999999999999`),
   geef context "test ban", **Ban driver**.
4. Open de FTP-root in FileZilla — `blocklist.json` moet de regel met die
   GUID bevatten.
5. Klap **Ban history** open — de ban-actie staat erin met jouw username/rol.
6. Klik op de unban-knop bij de testrij → controleer dat de regel uit
   `blocklist.json` verdwenen is en dat er een `unban`-rij in de history
   bijgekomen is.

---

## 5. Wat als het niet werkt

- **403 Forbidden — staff role required**
  Je rol in `public.profiles` is niet `moderator` / `admin` / `owner`.
  Owner kan dat aanpassen (zie [`admin-auth-setup.md`](admin-auth-setup.md)).

- **502 FTP operation failed: …**
  De edge function kon de FTP niet bereiken. Check de secrets en kijk in
  **Edge Functions → Logs** in het Supabase dashboard voor het exacte adres
  waar hij op faalde. Test dezelfde credentials in FileZilla.

- **blocklist.json is not valid JSON**
  Iemand heeft het bestand met de hand kapot gemaakt. Pak een backup of
  zet `[]` in het bestand (lege array) om opnieuw te beginnen.
