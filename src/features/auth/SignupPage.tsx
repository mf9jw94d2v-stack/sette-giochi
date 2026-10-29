import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  PASSWORD_MIN_LENGTH,
  resendConfirmation,
  safeNextPath,
  signUp,
} from "@/services/auth/authService";
import {
  isUsernameAvailable,
  normaliseUsername,
  usernameProblem,
} from "@/services/account/profileService";
import { useAuth } from "./authContext";
import {
  AccountsDisabled,
  AuthLayout,
  Field,
  FormMessage,
  PasswordField,
  SubmitButton,
  textLink,
} from "./AuthLayout";

type Availability = "unknown" | "checking" | "free" | "taken";

export function SignupPage() {
  const { status } = useAuth();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [availability, setAvailability] = useState<Availability>("unknown");
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState<string | null>(null);

  const name = normaliseUsername(username);
  const nameProblem = usernameProblem(name);
  const emailProblem = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? null
    : "Scrivi un indirizzo email valido.";
  const passwordProblem =
    password.length >= PASSWORD_MIN_LENGTH
      ? null
      : `Almeno ${PASSWORD_MIN_LENGTH} caratteri.`;

  useEffect(() => {
    if (status === "signed-in") navigate(next, { replace: true });
  }, [status, next, navigate]);

  // Ask the server whether the name is free, once typing pauses.
  useEffect(() => {
    if (nameProblem) {
      setAvailability("unknown");
      return;
    }
    setAvailability("checking");
    let active = true;
    const timer = setTimeout(() => {
      void isUsernameAvailable(name).then((free) => {
        if (active)
          setAvailability(free === null ? "unknown" : free ? "free" : "taken");
      });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name, nameProblem]);

  if (status === "disabled") return <AccountsDisabled />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true });
    setError(null);
    if (
      nameProblem ||
      emailProblem ||
      passwordProblem ||
      availability === "taken"
    )
      return;
    setBusy(true);
    const out = await signUp({ email, password, username: name });
    setBusy(false);
    if (!out.ok) {
      setError(out.message);
      return;
    }
    if (out.value.needsConfirmation) setSentTo(email.trim());
  }

  async function resend() {
    if (!sentTo) return;
    const out = await resendConfirmation(sentTo);
    setResent(out.ok ? "Link inviato di nuovo." : out.message);
  }

  if (sentTo) {
    return (
      <AuthLayout title="Controlla la posta" aside={null}>
        <div className="max-w-md space-y-4 text-base leading-relaxed">
          <p>
            Abbiamo inviato un link di conferma a{" "}
            <strong className="font-semibold">{sentTo}</strong>. Aprilo per
            attivare l&apos;account: poi potrai accedere.
          </p>
          <p className="text-sm text-muted-foreground">
            Non lo trovi? Guarda nella posta indesiderata. Se l&apos;indirizzo
            era già registrato non riceverai un nuovo account: puoi{" "}
            <Link to="/forgot-password" className={textLink}>
              reimpostare la password
            </Link>
            .
          </p>
          {resent && <FormMessage tone="info">{resent}</FormMessage>}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={resend}
              className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-accent"
            >
              Invia di nuovo il link
            </button>
            <Link
              to="/login"
              className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              Vai all&apos;accesso
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const usernameHint =
    availability === "checking"
      ? "Controllo…"
      : availability === "free"
        ? "Disponibile."
        : "Compare nelle classifiche. 3–20 caratteri: a–z, 0–9 e _.";

  return (
    <AuthLayout
      title="Crea un account"
      intro="Gratis. Ti servono un nome utente, un'email e una password."
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field
          label="Nome utente"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, username: true }))}
          hint={usernameHint}
          error={
            availability === "taken"
              ? "Questo nome utente è già in uso."
              : touched.username || username.length > 0
                ? nameProblem
                : null
          }
        />
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          hint="Resta privata: serve per accedere e recuperare la password."
          error={touched.email ? emailProblem : null}
        />
        <PasswordField
          label="Password"
          name="new-password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          hint={`Almeno ${PASSWORD_MIN_LENGTH} caratteri.`}
          error={touched.password ? passwordProblem : null}
        />
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <p className="text-sm text-muted-foreground">
          Il nome utente è pubblico e compare nelle classifiche; puoi
          nasconderti quando vuoi dalla pagina Account. Leggi{" "}
          <Link to="/privacy" className={textLink}>
            cosa salviamo
          </Link>
          .
        </p>
        <SubmitButton busy={busy} busyLabel="Creazione…">
          Crea l&apos;account
        </SubmitButton>
      </form>
      <p className="mt-8 text-sm text-muted-foreground">
        Hai già un account?{" "}
        <Link
          to={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className={textLink}
        >
          Accedi
        </Link>
        .
      </p>
    </AuthLayout>
  );
}
