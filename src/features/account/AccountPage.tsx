import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  changePassword,
  deleteAccount,
  PASSWORD_MIN_LENGTH,
  signOut,
} from "@/services/auth/authService";
import {
  normaliseUsername,
  updateMyProfile,
  usernameProblem,
} from "@/services/account/profileService";
import { getPersistence } from "@/services/persistence";
import { useAuth } from "@/features/auth/authContext";
import {
  Field,
  FormMessage,
  PasswordField,
  SubmitButton,
  textLink,
} from "@/features/auth/AuthLayout";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Private: reached only through <RequireAuth>. */
export function AccountPage() {
  const { user, profile, refreshProfile, expectSignOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  // Leave the private page first: once the session ends, the route guard
  // would otherwise send the player to the sign-in page instead of home.
  async function leave() {
    expectSignOut();
    navigate("/", { replace: true });
    await signOut();
  }

  return (
    <div>
      <PageHeader
        title="Account"
        description={
          <>
            Hai effettuato l&apos;accesso come{" "}
            <strong className="font-semibold text-foreground">
              {user.email}
            </strong>
            .
            {profile && <> Sei iscritto dal {formatDate(profile.createdAt)}.</>}
          </>
        }
        aside={
          <button
            type="button"
            onClick={leave}
            className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-accent"
          >
            Esci
          </button>
        }
      />
      <div className="divide-y divide-border">
        <Section
          title="Profilo pubblico"
          text="È quello che vedono gli altri giocatori nelle classifiche. L'email non compare mai."
        >
          <ProfileForm userId={user.id} onSaved={refreshProfile} />
        </Section>
        <Section
          title="Password"
          text="Per cambiarla serve quella attuale. Se l'hai dimenticata, esci e usa «Password dimenticata»."
        >
          <PasswordForm email={user.email ?? ""} />
        </Section>
        <Section
          title="I tuoi dati"
          text="Scarica tutto ciò che il server conserva su di te: profilo, risultati e preferenze, in un file JSON."
        >
          <ExportButton />
        </Section>
        <Section
          title="Elimina l'account"
          text="Cancella definitivamente account, profilo, risultati e preferenze dal server. Non si può annullare. I risultati giocati come ospite su questo dispositivo restano qui."
        >
          <DeleteForm
            onDeleted={() => navigate("/", { replace: true })}
            expectSignOut={expectSignOut}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-x-12 gap-y-4 py-8 first:pt-0 lg:grid-cols-[19rem_1fr]">
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
      <div className="max-w-lg">{children}</div>
    </section>
  );
}

function ProfileForm({
  userId,
  onSaved,
}: {
  userId: string;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [visible, setVisible] = useState(profile?.showInLeaderboards ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    setUsername(profile?.username ?? "");
    setDisplayName(profile?.displayName ?? "");
    setVisible(profile?.showInLeaderboards ?? true);
  }, [profile]);

  if (!profile)
    return (
      <p className="text-sm text-muted-foreground">Caricamento del profilo…</p>
    );

  const name = normaliseUsername(username);
  const problem = usernameProblem(name);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (problem) return;
    if (displayName.trim().length > 40) {
      setMessage({
        tone: "error",
        text: "Il nome visualizzato può avere al massimo 40 caratteri.",
      });
      return;
    }
    setBusy(true);
    const out = await updateMyProfile(userId, {
      username: name,
      displayName: displayName,
      showInLeaderboards: visible,
    });
    setBusy(false);
    if (!out.ok) {
      setMessage({ tone: "error", text: out.message });
      return;
    }
    await onSaved();
    setMessage({ tone: "success", text: "Profilo salvato." });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field
        label="Nome utente"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        hint="3–20 caratteri: a–z, 0–9 e _."
        error={username.length > 0 ? problem : "Scegli un nome utente."}
      />
      <Field
        label="Nome visualizzato (facoltativo)"
        maxLength={40}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        hint="Se c'è, compare accanto al nome utente."
      />
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-[var(--primary)]"
        />
        <span>
          <span className="font-medium">Mostrami nelle classifiche</span>
          <span className="block text-muted-foreground">
            Se lo togli, i tuoi punteggi contano ma il tuo nome non compare a
            nessuno. Tu continui a vedere la tua posizione.
          </span>
        </span>
      </label>
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
      <SubmitButton busy={busy} busyLabel="Salvataggio…">
        Salva il profilo
      </SubmitButton>
    </form>
  );
}

function PasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (next.length < PASSWORD_MIN_LENGTH) {
      setMessage({
        tone: "error",
        text: `La nuova password deve avere almeno ${PASSWORD_MIN_LENGTH} caratteri.`,
      });
      return;
    }
    setBusy(true);
    const out = await changePassword(email, current, next);
    setBusy(false);
    if (!out.ok) setMessage({ tone: "error", text: out.message });
    else {
      setCurrent("");
      setNext("");
      setMessage({ tone: "success", text: "Password aggiornata." });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {/* Lets password managers attach the change to the right account. */}
      <input
        type="email"
        name="username"
        autoComplete="username"
        value={email}
        readOnly
        hidden
      />
      <PasswordField
        label="Password attuale"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <PasswordField
        label="Nuova password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        hint={`Almeno ${PASSWORD_MIN_LENGTH} caratteri.`}
      />
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
      <SubmitButton busy={busy} busyLabel="Aggiornamento…">
        Cambia la password
      </SubmitButton>
    </form>
  );
}

function ExportButton() {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  async function run() {
    setState("busy");
    try {
      const data = await getPersistence().exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sette-giochi-account-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch {
      setState("error");
    }
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={run}
        disabled={state === "busy"}
        className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-accent disabled:opacity-60"
      >
        {state === "busy" ? "Preparazione…" : "Scarica i miei dati"}
      </button>
      {state === "error" && (
        <FormMessage tone="error">
          Non sono riuscito a preparare il file. Riprova.
        </FormMessage>
      )}
    </div>
  );
}

function DeleteForm({
  onDeleted,
  expectSignOut,
}: {
  onDeleted: () => void;
  expectSignOut: () => void;
}) {
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = word === "ELIMINA";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    const out = await deleteAccount();
    setBusy(false);
    if (!out.ok) {
      setError(out.message);
      return;
    }
    expectSignOut();
    onDeleted();
    await signOut();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field
        label="Per confermare scrivi ELIMINA"
        autoCapitalize="characters"
        autoComplete="off"
        value={word}
        onChange={(e) => setWord(e.target.value)}
      />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <button
        type="submit"
        disabled={!ready || busy}
        className="inline-flex h-11 items-center rounded-lg bg-destructive px-5 text-sm font-semibold text-destructive-foreground hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Eliminazione…" : "Elimina definitivamente l'account"}
      </button>
      <p className="text-sm text-muted-foreground">
        Prima, se vuoi,{" "}
        <span className="font-medium text-foreground">scarica i tuoi dati</span>{" "}
        qui sopra. Dubbi? Leggi{" "}
        <Link to="/privacy" className={textLink}>
          privacy e dati
        </Link>
        .
      </p>
    </form>
  );
}
