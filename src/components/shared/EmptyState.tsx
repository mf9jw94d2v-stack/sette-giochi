import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * An intentional empty state. We never fabricate metrics: when there is no
 * data we say so and point the player at something to do.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaTo,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
}) {
  return (
    <div className="border-y border-border px-6 py-14 text-center">
      <Icon
        className="mx-auto h-8 w-8 text-muted-foreground"
        aria-hidden="true"
      />
      <h2 className="mt-3 font-display text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className="mt-5 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
