import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The frame of the account pages: the form on the left, at reading width;
 * on wide screens a short, plain note on the right about what an account is
 * for. One form per page — signing in, signing up and recovering a password
 * are different moments and get different pages, not one modal.
 */
export function AuthLayout({
  title,
  intro,
  children,
  aside = <AccountNote />,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <section aria-labelledby="auth-title">
        <h1 id="auth-title" className="font-display text-title font-bold">
          {title}
        </h1>
        {intro && (
          <p className="mt-2.5 text-base leading-relaxed text-muted-foreground">
            {intro}
          </p>
        )}
        <div className="mt-8">{children}</div>
      </section>
      {aside && (
        <aside className="lg:border-l lg:border-border lg:pl-16">{aside}</aside>
      )}
    </div>
  );
}

function AccountNote() {
  return (
    <div className="max-w-md text-sm leading-relaxed text-muted-foreground">
      <h2 className="font-display text-lg font-bold text-foreground">
        A cosa serve un account
      </h2>
      <ul className="mt-3 space-y-3">
        <li>
          <strong className="font-semibold text-foreground">
            Gli stessi risultati ovunque.
          </strong>{" "}
          Sfide, serie e cronologia ti seguono su ogni dispositivo.
        </li>
        <li>
          <strong className="font-semibold text-foreground">
            Le classifiche.
          </strong>{" "}
          Il punteggio della sfida di oggi viene ricalcolato dal server dalle
          tue risposte, poi entra in classifica col tuo nome utente.
        </li>
        <li>
          <strong className="font-semibold text-foreground">
            Niente di obbligatorio.
          </strong>{" "}
          Puoi continuare a giocare come ospite: i risultati restano in questo
          browser.
        </li>
      </ul>
      <p className="mt-4">
        Cosa salviamo e come cancellarlo:{" "}
        <Link
          to="/privacy"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          privacy e dati
        </Link>
        .
      </p>
    </div>
  );
}

/** Shown in place of any account page when the build has no backend. */
export function AccountsDisabled() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-title font-bold">Account non attivi</h1>
      <p className="mt-2.5 text-base leading-relaxed text-muted-foreground">
        Questa installazione di Sette Giochi non è collegata a un server, quindi
        non ci sono account, accessi o classifiche. Si gioca come ospite: i
        risultati restano in questo browser e puoi esportarli dalle
        impostazioni.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          Torna alla home
        </Link>
        <Link
          to="/settings"
          className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-accent"
        >
          Impostazioni
        </Link>
      </div>
    </div>
  );
}

const inputClass =
  "block h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 aria-[invalid=true]:border-destructive";

export function Field({
  label,
  hint,
  error,
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className={cn(inputClass, "mt-1.5")}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? hintId : "", error ? errorId : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        {...input}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-destructive-text">
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordField(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label: string;
    hint?: ReactNode;
    error?: string | null;
  },
) {
  const [visible, setVisible] = useState(false);
  const { label, hint, error, className, ...input } = props;
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={cn(inputClass, "pr-12")}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [hint ? hintId : "", error ? errorId : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Nascondi la password" : "Mostra la password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-destructive-text">
          {error}
        </p>
      )}
    </div>
  );
}

/** A form-level message: an error to fix, or a confirmation of what happened. */
export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-relaxed",
        tone === "error" &&
          "border-destructive/40 bg-destructive/10 text-foreground",
        tone === "success" && "border-success/40 bg-success/10 text-foreground",
        tone === "info" && "border-border bg-muted text-foreground",
      )}
    >
      {children}
    </div>
  );
}

export function SubmitButton({
  busy,
  children,
  busyLabel,
  className,
}: {
  busy: boolean;
  children: ReactNode;
  busyLabel: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      aria-busy={busy || undefined}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground shadow-sm transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 sm:w-auto",
        className,
      )}
    >
      {busy ? busyLabel : children}
    </button>
  );
}

export const textLink =
  "font-medium text-primary underline-offset-4 hover:underline";
