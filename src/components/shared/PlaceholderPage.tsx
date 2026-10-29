import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  /** Honest note about what is and isn't built yet. */
  status?: string;
}

/**
 * A clearly-labelled placeholder for routes whose feature is not built yet.
 * We never dress up an empty feature as finished — this says so plainly.
 */
export function PlaceholderPage({
  title,
  description,
  status,
}: PlaceholderPageProps) {
  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <Construction
          className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          {status ??
            "Non ancora pronto. Questa pagina è un segnaposto: la navigazione funziona mentre la funzione viene implementata."}
        </p>
      </div>
    </section>
  );
}
