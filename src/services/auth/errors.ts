/**
 * Turn Supabase Auth errors into one sentence a player can act on, in
 * Italian. The raw error is never shown: it can be technical, in English, or
 * reveal more than it should (for instance whether an email is registered).
 */
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "weak_password"
  | "same_password"
  | "invalid_email"
  | "rate_limited"
  | "signup_disabled"
  | "session_missing"
  | "network"
  | "not_configured"
  | "unknown";

export const AUTH_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: "Email o password non corretti.",
  email_not_confirmed:
    "Devi prima confermare l'indirizzo email: apri il link che ti abbiamo inviato.",
  weak_password:
    "La password è troppo debole: usa almeno 8 caratteri, meglio se con lettere e numeri.",
  same_password: "La nuova password deve essere diversa da quella attuale.",
  invalid_email: "Questo indirizzo email non è valido.",
  rate_limited:
    "Troppi tentativi in poco tempo. Aspetta qualche minuto e riprova.",
  signup_disabled: "Le nuove registrazioni sono chiuse in questo momento.",
  session_missing:
    "Il link non è più valido o è scaduto. Richiedine uno nuovo.",
  network:
    "Non riesco a raggiungere il server. Controlla la connessione e riprova.",
  not_configured: "Gli account non sono attivi su questa installazione.",
  unknown: "Qualcosa non ha funzionato. Riprova tra poco.",
};

interface ErrorLike {
  name?: string;
  code?: string;
  status?: number;
  message?: string;
}

export function authErrorCode(error: unknown): AuthErrorCode {
  const e = (error ?? {}) as ErrorLike;
  switch (e.code) {
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "weak_password":
      return "weak_password";
    case "same_password":
      return "same_password";
    case "email_address_invalid":
    case "validation_failed":
      return "invalid_email";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
      return "rate_limited";
    case "signup_disabled":
    case "email_provider_disabled":
      return "signup_disabled";
    case "session_not_found":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "otp_expired":
    case "bad_code_verifier":
      return "session_missing";
  }
  if (e.name === "AuthSessionMissingError") return "session_missing";
  if (e.name === "AuthRetryableFetchError" || e.status === 0) return "network";
  if (e.status === 429) return "rate_limited";
  if (/failed to fetch|network/i.test(e.message ?? "")) return "network";
  return "unknown";
}

export function authErrorMessage(error: unknown): string {
  return AUTH_MESSAGES[authErrorCode(error)];
}
