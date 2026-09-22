import type { ComponentProps, ReactNode } from "react";
import { Item } from "@/components/ui/item";
import { cn } from "@/lib/utils";

interface DossierItemButtonProps extends Omit<
  ComponentProps<"button">,
  "children" | "onClick" | "type" | "title"
> {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  readonly onSelect: () => void;
  readonly variant?: "muted" | "outline";
  readonly size?: "sm" | "default";
}

/** A native button styled as an Item, with a list item wrapper. */
export function DossierItemButton({
  title,
  description,
  leading,
  trailing,
  onSelect,
  variant = "muted",
  size = "sm",
  className,
  ...buttonProps
}: DossierItemButtonProps) {
  return (
    <div role="listitem" className="min-w-0">
      <Item
        asChild
        variant={variant}
        size={size}
        className={cn(
          "cursor-pointer text-left hover:bg-accent focus-visible:bg-accent",
          className,
        )}
      >
        <button type="button" onClick={onSelect} {...buttonProps}>
          {leading}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-medium">{title}</span>
            {description !== undefined && (
              <span className="line-clamp-2 text-sm leading-normal text-muted-foreground">
                {description}
              </span>
            )}
          </span>
          {trailing !== undefined && (
            <span className="flex shrink-0 items-center gap-2">{trailing}</span>
          )}
        </button>
      </Item>
    </div>
  );
}
