import { type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResponsiveFilterShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Trigger element rendered in both modes (typically the filter Button). */
  trigger: ReactNode;
  /** Sheet title shown only on mobile, also used as accessible label. */
  title: string;
  /** Width applied to the desktop popover content (Tailwind classes). */
  popoverWidthClassName?: string;
  /** Alignment for the desktop popover. */
  popoverAlign?: "start" | "center" | "end";
  /** Body shown inside both Popover and Sheet. */
  children: ReactNode;
}

/**
 * Catalog filter shell that swaps between a desktop Popover and a mobile
 * bottom Sheet at the 768px breakpoint. Children render identically in both
 * modes — wrappers handle scroll, padding, and the close affordance.
 *
 * Trigger semantics: on desktop the Button itself opens the Popover via
 * Radix's `asChild`; on mobile the same Button is wrapped by SheetTrigger so
 * tapping it opens the bottom sheet. Test IDs and labels stay identical.
 */
export function ResponsiveFilterShell({
  open,
  onOpenChange,
  trigger,
  title,
  popoverWidthClassName = "w-[calc(100vw-2rem)] sm:w-[320px]",
  popoverAlign = "start",
  children,
}: ResponsiveFilterShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        {/* Floating bottom sheet: leaves a small inset on all sides so corners
            stay rounded and the device safe-area is visible. The sheet itself
            is a flex column — header is sticky, body scrolls. */}
        <SheetContent
          side="bottom"
          className="inset-x-2 bottom-2 rounded-xl border max-h-[85dvh] flex flex-col p-0 gap-0"
        >
          <SheetHeader className="px-4 pt-4 pb-2 text-left shrink-0 border-b">
            <SheetTitle className="text-sm font-semibold pr-8">{title}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overscroll-contain pb-2">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={popoverAlign} className={`${popoverWidthClassName} p-0`}>
        {children}
      </PopoverContent>
    </Popover>
  );
}
