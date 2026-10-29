import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        solid: "bg-foreground/10 text-foreground backdrop-blur",
        success: "bg-success/15 text-success",
        muted: "bg-muted text-muted-foreground",
        onDark: "bg-black/25 text-white backdrop-blur-sm",
      },
    },
    defaultVariants: { variant: "muted" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
