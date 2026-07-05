import { useEffect, useState } from "react";
import { ChevronsUpDown, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FUNDING_AMOUNT_PRESETS, formatFundingAmount } from "@shared/catalog-filters";
import { ResponsiveFilterShell } from "./responsive-filter-shell";

interface AmountRangeFilterProps {
  min?: number;
  max?: number;
  onChange: (next: { min?: number; max?: number }) => void;
  triggerClassName?: string;
}

/**
 * Funding amount range filter. Offers preset chips for the most common bands
 * plus optional custom min / max numeric inputs.
 */
export function AmountRangeFilter({
  min,
  max,
  onChange,
  triggerClassName,
}: AmountRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftMin, setDraftMin] = useState<string>(min !== undefined ? String(min) : "");
  const [draftMax, setDraftMax] = useState<string>(max !== undefined ? String(max) : "");

  // Sync drafts when the parent value changes externally (e.g. URL nav).
  useEffect(() => {
    setDraftMin(min !== undefined ? String(min) : "");
    setDraftMax(max !== undefined ? String(max) : "");
  }, [min, max]);

  const summary = (() => {
    if (min === undefined && max === undefined) return "Buget";
    const left = min !== undefined ? formatFundingAmount(min) : "0";
    const right = max !== undefined ? formatFundingAmount(max) : "∞";
    return `${left} – ${right}`;
  })();

  const isPresetSelected = (p: { min?: number; max?: number }) =>
    p.min === min && p.max === max;

  const applyDraft = () => {
    const parsedMin = draftMin.trim() ? Number(draftMin) : undefined;
    const parsedMax = draftMax.trim() ? Number(draftMax) : undefined;
    onChange({
      min: parsedMin !== undefined && Number.isFinite(parsedMin) ? parsedMin : undefined,
      max: parsedMax !== undefined && Number.isFinite(parsedMax) ? parsedMax : undefined,
    });
    setOpen(false);
  };

  const trigger = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={`justify-between font-normal ${triggerClassName ?? "w-full"}`}
      data-testid="filter-amount-trigger"
    >
      <span className="truncate text-left flex items-center gap-1.5">
        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
        {summary}
      </span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  return (
    <ResponsiveFilterShell
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title="Buget"
      popoverWidthClassName="w-[calc(100vw-2rem)] sm:w-[340px]"
    >
      <div className="p-3 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Intervale predefinite
          </p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Intervale predefinite">
            {FUNDING_AMOUNT_PRESETS.map((p) => {
              const active = isPresetSelected(p);
              return (
                <button
                  key={p.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    onChange({ min: p.min, max: p.max });
                    setOpen(false);
                  }}
                  className={
                    "rounded-full px-3 py-1 text-xs border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 " +
                    (active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover-elevate active-elevate-2")
                  }
                  data-testid={`filter-amount-preset-${p.label.replace(/\s+/g, "-")}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Interval personalizat (EUR)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground" htmlFor="amount-min">
                Minim
              </label>
              <Input
                id="amount-min"
                type="number"
                inputMode="numeric"
                min={0}
                value={draftMin}
                onChange={(e) => setDraftMin(e.target.value)}
                placeholder="0"
                className="h-8 text-sm"
                data-testid="filter-amount-min-input"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground" htmlFor="amount-max">
                Maxim
              </label>
              <Input
                id="amount-max"
                type="number"
                inputMode="numeric"
                min={0}
                value={draftMax}
                onChange={(e) => setDraftMax(e.target.value)}
                placeholder="∞"
                className="h-8 text-sm"
                data-testid="filter-amount-max-input"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              setDraftMin("");
              setDraftMax("");
              onChange({ min: undefined, max: undefined });
              setOpen(false);
            }}
            data-testid="filter-amount-clear"
          >
            Șterge
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 text-xs"
            onClick={applyDraft}
            data-testid="filter-amount-apply"
          >
            Aplică
          </Button>
        </div>
      </div>
    </ResponsiveFilterShell>
  );
}
