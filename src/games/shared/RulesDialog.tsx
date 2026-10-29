import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * "Come si gioca", available at any point of a session without losing it.
 *
 * Built on the native <dialog>: showModal() gives a real modal — focus moves
 * in and is trapped, Escape closes it, the rest of the page is inert — with no
 * focus-trap code of our own to get wrong. Like everything in this folder it
 * brings no look: each game passes the classes that make it its own.
 */
export function RulesDialog({
  open,
  onClose,
  title,
  children,
  className,
  titleClassName,
  closeLabel = "Chiudi",
  closeClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
  closeLabel?: string;
  closeClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself, not its content.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
      className={className}
    >
      <h2 id={titleId} className={titleClassName}>
        {title}
      </h2>
      {children}
      <button type="button" onClick={onClose} className={closeClassName}>
        {closeLabel}
      </button>
    </dialog>
  );
}
