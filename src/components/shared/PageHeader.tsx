import type { ReactNode } from "react";

/**
 * The opening of every platform page: the title, one sentence saying what the
 * page is for, and an optional figure or control on the right.
 */
export function PageHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-border pb-7">
      <div className="max-w-2xl">
        <h1 className="font-display text-title font-bold">{title}</h1>
        {description && (
          <p className="mt-2.5 text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {aside}
    </header>
  );
}
