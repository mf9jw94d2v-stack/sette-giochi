# Deployment

_Aggiornato: 29 ottobre 2026._ **Niente è stato pubblicato** e nessun servizio
è stato creato: servono un tuo account e la tua autorizzazione. Qui sotto c'è
tutto ciò che va fatto, nell'ordine.

## 0. Cosa è già pronto nel repository

- Migrazioni: `supabase/migrations/` (3 file).
- Configurazione Supabase per lo sviluppo locale: `supabase/config.toml`.
- Edge Functions: `supabase/functions/submit-daily`, `delete-account`, con la
  logica già compilata in `supabase/functions/_shared/backend.js`
  (`npm run functions:check` controlla che sia aggiornata).
- Hosting della SPA su Vercel: `vercel.json` (rewrite verso `index.html` per
  le route del client, intestazioni di sicurezza, cache degli asset).

## 1. Progetto Supabase (gratuito per iniziare)

1. Crea un progetto su supabase.com. Prendi nota del **Project ref**.
2. Dal terminale, nella cartella del progetto:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <PROJECT_REF>
```

3. Leggi le migrazioni, poi applicale (non sono distruttive: creano solo
   oggetti nuovi):

```bash
npx supabase db push
```

4. Pubblica le due funzioni:

```bash
npx supabase functions deploy submit-daily
```

```bash
npx supabase functions deploy delete-account
```

5. Facoltativo ma consigliato, limita chi può chiamarle:

```bash
npx supabase secrets set ALLOWED_ORIGINS=https://<il-tuo-dominio>
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` le fornisce Supabase alle
funzioni: non vanno copiate da nessuna parte.

## 2. Autenticazione (dashboard Supabase → Authentication)

- **URL Configuration**
  - Site URL: `https://<il-tuo-dominio>`
  - Redirect URLs: `https://<il-tuo-dominio>/auth/callback` e
    `https://<il-tuo-dominio>/reset-password` (più `http://localhost:5173/...`
    se vuoi provare in locale).
- **Sign In / Providers → Email**: conferma email attiva.
- **Email Templates** (consigliato: i link funzionano anche se aperti su un
  altro browser):
  - _Confirm signup_: link a
    `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`
  - _Reset password_: link a
    `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`
- **SMTP**: il servizio email integrato di Supabase ha limiti bassi ed è
  pensato per i test. Per un uso reale configura un SMTP tuo (Auth → SMTP).
- **Google** (facoltativo): crea le credenziali OAuth su Google Cloud,
  inseriscile in Auth → Providers → Google, poi imposta
  `VITE_AUTH_GOOGLE_ENABLED=true`. Finché non lo fai, il pulsante non compare.

## 3. Sito (Vercel, piano gratuito)

1. Importa il repository su Vercel (deve prima stare su GitHub: oggi non ha
   un remote).
2. Variabili d'ambiente (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = `https://<PROJECT_REF>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = la chiave **publishable** (Project
     Settings → API Keys). Mai la secret o la service_role.
   - `VITE_DAILY_TIMEZONE` = `UTC` (deve coincidere con il database).
3. Deploy. `vercel.json` gestisce build, rewrite e intestazioni.

Altri host statici vanno bene uguale: servono la build `npm run build`
(cartella `dist/`) e la regola «ogni percorso sconosciuto → `index.html`».

## 3bis. Sito su GitHub Pages (la scelta fatta)

- Repository pubblico su GitHub, ramo `main`. Le catture dei siti originali
  (`docs/rea-analysis/evidence/`) non sono pubblicate: vedi
  `docs/rea-analysis/EVIDENCE.md`.
- Ogni push su `main` esegue `.github/workflows/pages.yml`: build con
  `VITE_BASE_PATH=/<repository>/`, copia di `index.html` in `404.html` (così i
  link diretti funzionano), pubblicazione.
- URL e chiave publishable stanno nelle **variabili** del repository
  (Settings → Secrets and variables → Actions → Variables):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Non sono segreti, ma
  così il codice non dipende da un progetto preciso.
- In Supabase → Authentication → URL Configuration: Site URL
  `https://<utente>.github.io/<repository>` e Redirect URLs
  `https://<utente>.github.io/<repository>/auth/callback` e
  `https://<utente>.github.io/<repository>/reset-password`.

## 4. Verifiche dopo la pubblicazione

1. Registrati con un'email vera, apri il link di conferma: devi arrivare
   alla home già dentro.
2. Gioca una sfida di oggi: deve comparire «risultato salvato nel tuo
   account»; ricaricando, «hai già giocato».
3. In Supabase → Table Editor → `daily_results`: una riga,
   `verification = server_replay`, con le risposte.
4. `/leaderboard`: il tuo nome con «Tu».
5. Esci e prova «Password dimenticata» fino alla nuova password.
6. Con un secondo account controlla di non vedere i dati del primo (le
   classifiche sì, il resto no).
7. Account → «Elimina l'account»: deve sparire da Authentication → Users.

## 5. Rollback

- Sito: su Vercel, «Promote» del deploy precedente.
- Funzioni: ripubblica la versione precedente del repository.
- Database: le migrazioni non si annullano automaticamente. Se serve tornare
  indietro, scrivi una nuova migrazione che rimuove ciò che va rimosso, dopo
  un backup (Database → Backups).

## Checklist

- [x] RLS e privilegi scritti e testati su PostgreSQL (PGlite)
- [x] Migrazioni non distruttive
- [x] Nessun segreto nel repository né nel bundle
- [x] Test verdi (unit, database, e2e)
- [ ] Migrazioni applicate a un progetto reale
- [ ] Funzioni pubblicate e provate in Deno
- [ ] Email di conferma e recupero verificate
- [ ] Autorizzazione esplicita a pubblicare
