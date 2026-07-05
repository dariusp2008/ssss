import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResponsiveFilterShell } from "./responsive-filter-shell";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectPopoverProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  testIdPrefix: string;
  triggerClassName?: string;
  /** Optional summary used in the trigger when items are selected. */
  renderSummary?: (selected: MultiSelectOption[]) => string;
}

/**
 * Reusable multi-select popover with checkboxes. Used by the catalog filters
 * for beneficiary type and region.
 */
export function MultiSelectPopover({
  options,
  value,
  onChange,
  placeholder,
  testIdPrefix,
  triggerClassName,
  renderSummary,
}: MultiSelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(value);
  const selectedOptions = options.filter((o) => selectedSet.has(o.value));

  const summary = (() => {
    if (selectedOptions.length === 0) return placeholder;
    if (renderSummary) return renderSummary(selectedOptions);
    if (selectedOptions.length === 1) return selectedOptions[0].label;
    return `${selectedOptions.length} selectate`;
  })();

  const toggle = (val: string) => {
    if (selectedSet.has(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const trigger = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={`justify-between font-normal ${triggerClassName ?? "w-full"}`}
      data-testid={`${testIdPrefix}-trigger`}
    >
      <span className="truncate text-left">{summary}</span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  return (
    <ResponsiveFilterShell
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={placeholder}
      popoverWidthClassName="w-[calc(100vw-2rem)] sm:w-[320px]"
    >
      <ScrollArea className="sm:max-h-[300px]">
        <div className="p-2 space-y-1">
          {options.map((opt) => {
            const isChecked = selectedSet.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="checkbox"
                aria-checked={isChecked}
                onClick={() => toggle(opt.value)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 sm:py-1.5 text-left text-sm hover-elevate active-elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                data-testid={`${testIdPrefix}-option-${opt.value}`}
              >
                <Checkbox
                  checked={isChecked}
                  className="pointer-events-none"
                  aria-hidden
                  tabIndex={-1}
                />
                <span className="flex-1 truncate">{opt.label}</span>
                {isChecked && <Check className="h-3.5 w-3.5 text-primary" aria-hidden />}
              </button>
            );
          })}
        </div>
      </ScrollArea>
      {value.length > 0 && (
        <div className="border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => onChange([])}
            data-testid={`${testIdPrefix}-clear`}
          >
            Șterge selecția
          </Button>
        </div>
      )}
    </ResponsiveFilterShell>
  );
}
