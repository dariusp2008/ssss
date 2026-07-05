import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, Check, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { SECTORS, getSectorLabel } from "@shared/catalog-filters";
import { getCaenLabel } from "@shared/caen-nomenclature";
import { ResponsiveFilterShell } from "./responsive-filter-shell";

interface SectorCaenAutocompleteProps {
  selectedSectors: string[];
  selectedCaen: string[];
  onChangeSectors: (next: string[]) => void;
  onChangeCaen: (next: string[]) => void;
  triggerClassName?: string;
}

interface SuggestResponse {
  sectors: { slug: string; label: string }[];
  caen: { code: string; label: string }[];
}

/**
 * Autocomplete picker for the catalog "Sector/CAEN" filter.
 * Shows two sections (Sectoare predefinite, Coduri CAEN) and supports
 * multi-select across both groups. Defaults to the 12 predefined sectors when
 * no query is entered.
 */
export function SectorCaenAutocomplete({
  selectedSectors,
  selectedCaen,
  onChangeSectors,
  onChangeCaen,
  triggerClassName,
}: SectorCaenAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SuggestResponse>({ sectors: [], caen: [] });
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce query (300ms).
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  // Fetch suggestions on debounced query change.
  useEffect(() => {
    if (!open) return;
    if (debounced.length < 2) {
      setResults({ sectors: [], caen: [] });
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    fetch(`/api/catalog/sector-caen-suggest?q=${encodeURIComponent(debounced)}`, {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : { sectors: [], caen: [] }))
      .then((data: SuggestResponse) => {
        if (ctrl.signal.aborted) return;
        setResults(data);
        setLoading(false);
      })
      .catch((err: any) => {
        if (err?.name === "AbortError") return;
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [debounced, open]);

  // When no query is typed, show the 12 predefined sectors as defaults.
  const showDefaultSectors = debounced.length < 2;
  const sectorList = showDefaultSectors
    ? SECTORS.map((s) => ({ slug: s.slug, label: s.label }))
    : results.sectors;
  const caenList = showDefaultSectors ? [] : results.caen;

  const selSecSet = new Set(selectedSectors);
  const selCaenSet = new Set(selectedCaen);

  const toggleSector = (slug: string) => {
    if (selSecSet.has(slug)) {
      onChangeSectors(selectedSectors.filter((s) => s !== slug));
    } else {
      onChangeSectors([...selectedSectors, slug]);
    }
  };
  const toggleCaen = (code: string) => {
    if (selCaenSet.has(code)) {
      onChangeCaen(selectedCaen.filter((c) => c !== code));
    } else {
      onChangeCaen([...selectedCaen, code]);
    }
  };

  // Allow adding a custom 4-digit CAEN code typed directly that didn't match the
  // nomenclature — useful for niche codes not in our curated list.
  const queryIsCaenCode = /^\d{4}$/.test(debounced);
  const customCaenAvailable =
    queryIsCaenCode &&
    !caenList.some((c) => c.code === debounced) &&
    !selCaenSet.has(debounced);

  const totalSelected = selectedSectors.length + selectedCaen.length;
  const summary =
    totalSelected === 0
      ? "Sector / CAEN"
      : totalSelected === 1
        ? selectedSectors[0]
          ? getSectorLabel(selectedSectors[0])
          : `CAEN ${selectedCaen[0]}`
        : `${totalSelected} selectate`;

  const trigger = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={`justify-between font-normal ${triggerClassName ?? "w-full"}`}
      data-testid="filter-sector-caen-trigger"
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
      title="Sector / CAEN"
      popoverWidthClassName="w-[calc(100vw-2rem)] sm:w-[420px]"
    >
      <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută sector sau cod CAEN (ex: HoReCa, 5610)"
              className="pl-8 h-9"
              data-testid="filter-sector-caen-search"
            />
          </div>
        </div>
        <ScrollArea className="sm:max-h-[340px]">
          <div className="p-2 space-y-3">
            {sectorList.length > 0 && (
              <div>
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Sectoare predefinite
                </div>
                <div className="space-y-0.5">
                  {sectorList.map((s) => {
                    const isChecked = selSecSet.has(s.slug);
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        aria-label={`Sector ${s.label}`}
                        onClick={() => toggleSector(s.slug)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 sm:py-1.5 text-left text-sm hover-elevate active-elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        data-testid={`filter-sector-option-${s.slug}`}
                      >
                        <Checkbox checked={isChecked} className="pointer-events-none" aria-hidden tabIndex={-1} />
                        <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="flex-1 truncate">{s.label}</span>
                        {isChecked && <Check className="h-3.5 w-3.5 text-primary" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {caenList.length > 0 && (
              <div>
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Coduri CAEN
                </div>
                <div className="space-y-0.5">
                  {caenList.map((c) => {
                    const isChecked = selCaenSet.has(c.code);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        aria-label={`CAEN ${c.code} ${c.label}`}
                        onClick={() => toggleCaen(c.code)}
                        className="flex w-full items-start gap-2 rounded-md px-3 py-2.5 sm:py-1.5 text-left text-sm hover-elevate active-elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        data-testid={`filter-caen-option-${c.code}`}
                      >
                        <Checkbox checked={isChecked} className="mt-0.5 pointer-events-none" aria-hidden tabIndex={-1} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold">{c.code}</span>
                            {isChecked && <Check className="h-3 w-3 text-primary" aria-hidden />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{c.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {customCaenAvailable && (
              <div className="border-t pt-2">
                <button
                  type="button"
                  aria-label={`Adaugă cod CAEN ${debounced}`}
                  onClick={() => toggleCaen(debounced)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 sm:py-1.5 text-left text-sm hover-elevate active-elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  data-testid={`filter-caen-add-custom-${debounced}`}
                >
                  <Checkbox className="pointer-events-none" aria-hidden tabIndex={-1} />
                  <span className="text-sm">
                    Adaugă cod CAEN <span className="font-mono font-semibold">{debounced}</span>
                  </span>
                </button>
              </div>
            )}

            {!loading && !showDefaultSectors && sectorList.length === 0 && caenList.length === 0 && !customCaenAvailable && (
              <p className="text-center text-xs text-muted-foreground py-6">
                Nicio potrivire pentru "{debounced}".
              </p>
            )}
            {loading && (
              <p className="text-center text-xs text-muted-foreground py-3">Se caută…</p>
            )}
          </div>
        </ScrollArea>

        {totalSelected > 0 && (
          <div className="border-t p-2">
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedSectors.map((slug) => (
                <button
                  key={`sec-${slug}`}
                  type="button"
                  aria-label={`Elimină sectorul ${getSectorLabel(slug)}`}
                  onClick={() => toggleSector(slug)}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  data-testid={`filter-sector-chip-${slug}`}
                >
                  {getSectorLabel(slug)}
                  <span aria-hidden>×</span>
                </button>
              ))}
              {selectedCaen.map((code) => (
                <button
                  key={`caen-${code}`}
                  type="button"
                  aria-label={`Elimină CAEN ${code} ${getCaenLabel(code)}`}
                  onClick={() => toggleCaen(code)}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  data-testid={`filter-caen-chip-${code}`}
                  title={getCaenLabel(code)}
                >
                  <span className="font-mono">{code}</span>
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                onChangeSectors([]);
                onChangeCaen([]);
              }}
              data-testid="filter-sector-caen-clear"
            >
              Șterge selecția
            </Button>
          </div>
        )}
    </ResponsiveFilterShell>
  );
}
